/**
 * @fileoverview LLM Service for handling language model interactions using LangGraph
 * 
 * This service provides a high-level interface for interacting with OpenAI's language models
 * using LangGraph for state management and streaming support. It supports both streaming
 * and non-streaming responses, and allows for custom graph node additions.
 * 
 * @example
 * ```typescript
 * // Initialize the LLM service
 * const llmService = new LLMService({
 *   modelName: 'gpt-3.5-turbo',
 *   temperature: 0.7,
 *   maxTokens: 1000
 * });
 * 
 * // Create messages
 * const messages = [
 *   LLMService.createMessage('Hello, how are you?', 'user')
 * ];
 * 
 * // Get a non-streaming response
 * const response = await llmService.ask({ messages });
 * console.log(response.content);
 * 
 * // Get a streaming response
 * for await (const chunk of llmService.askStream({ messages })) {
 *   if (!chunk.done) {
 *     process.stdout.write(chunk.content);
 *   }
 * }
 * ```
 */

import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, AIMessage, BaseMessage } from '@langchain/core/messages';
import { StateGraph, START, END, CompiledStateGraph } from '@langchain/langgraph';
import { RunnableConfig } from '@langchain/core/runnables';
import { IterableReadableStream } from '@langchain/core/utils/stream';
import { LLMRequest, LLMResponse, LLMConfig, LLMStreamResponse } from '@/lib/types/llm.types';
import { DynamoDBCheckpointSaver } from './checkpoint.service';
import { v7 as uuidv7 } from 'uuid';
import { dynamoDB } from '@/lib/utils/dynamodb';

/**
 * Represents a message reference in the checkpoint state
 */
interface MessageReference {
  messageId: string;
  isFromUser: boolean;
}

/**
 * Represents the state of the LangGraph during execution
 */
interface GraphState {
  /** Array of message references */
  messageRefs: MessageReference[];
  /** Current chunk of the response being streamed */
  responseChunk?: string;
  /** Whether the current request is streaming */
  isStreaming: boolean;
}

/**
 * Utility function to extract text content from a message
 * @param content - The message content to extract text from
 * @returns The extracted text content
 */
function getMessageContent(content: any): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return content.map(c => getMessageContent(c)).join('');
  return '';
}

/**
 * Service for interacting with language models using LangGraph
 * 
 * This service provides methods for both streaming and non-streaming interactions
 * with language models, using LangGraph for state management and workflow control.
 */
export class LLMService {
  private model: ChatOpenAI;
  private graphDefinition: StateGraph<GraphState>;
  private compiledGraph: CompiledStateGraph<GraphState, GraphState> | null = null;
  private config: LLMConfig;
  private checkpointSaver: DynamoDBCheckpointSaver;

  /**
   * Creates a new instance of LLMService
   * @param config - Configuration options for the LLM service
   * @param config.modelName - The name of the model to use (default: 'gpt-3.5-turbo')
   * @param config.temperature - The temperature setting for the model (default: 0.7)
   * @param config.maxTokens - Maximum number of tokens to generate (default: 1000)
   * @param config.streaming - Whether to enable streaming by default (default: true)
   */
  constructor(config: LLMConfig = {}) {
    this.config = {
      modelName: config.modelName || 'gpt-3.5-turbo',
      temperature: config.temperature || 0.7,
      maxTokens: config.maxTokens || 1000,
      streaming: config.streaming ?? true,
    };
    this.model = new ChatOpenAI({
      modelName: this.config.modelName,
      temperature: this.config.temperature,
      maxTokens: this.config.maxTokens,
      streaming: true,
    });
    this.checkpointSaver = new DynamoDBCheckpointSaver(process.env.DYNAMODB_TABLE_NAME as string);

    // Initialize the LangGraph *definition*
    this.graphDefinition = this.buildGraphDefinition();
  }

  /**
   * Compiles the LangGraph if not already compiled
   * @returns The compiled graph
   * @throws Error if graph compilation fails
   */
  private compileGraph(): CompiledStateGraph<GraphState, GraphState> {
    if (!this.compiledGraph) {
      // Define edges just before compilation
      this.graphDefinition.addEdge(START, 'processMessages' as any);
      this.graphDefinition.addEdge('processMessages' as any, 'invokeLLM' as any);
      this.graphDefinition.addEdge('invokeLLM' as any, END);

      this.compiledGraph = this.graphDefinition.compile() as CompiledStateGraph<GraphState, GraphState>;

      if (!this.compiledGraph) {
        throw new Error("Graph compilation failed unexpectedly.");
      }
    }
    return this.compiledGraph;
  }

  /**
   * Builds the LangGraph definition with nodes and channels
   * @returns The configured StateGraph instance
   */
  private buildGraphDefinition(): StateGraph<GraphState> {
    const graph = new StateGraph<GraphState>({
      channels: {
        messageRefs: {
          value: (x: MessageReference[], y: MessageReference[]) => {
            // Only add new message references that don't already exist
            const existingIds = new Set(x.map(ref => ref.messageId));
            const newRefs = y.filter(ref => !existingIds.has(ref.messageId));
            return [...x, ...newRefs];
          },
          default: () => [],
        },
        responseChunk: {
          value: (x?: string, y?: string) => y ?? x,
          default: () => undefined,
        },
        isStreaming: {
          value: (x: boolean, y: boolean) => y,
          default: () => false,
        }
      },
    });

    // Node to prepare state for LLM call
    graph.addNode('processMessages', async (state: GraphState): Promise<Partial<GraphState>> => {
      console.log('Processing messages...');
      return {
        responseChunk: undefined,
      };
    });

    // Node to invoke the LLM
    graph.addNode('invokeLLM', async (state: GraphState, config?: RunnableConfig): Promise<Partial<GraphState>> => {
      console.log(`Invoking LLM (Streaming: ${state.isStreaming})...`);
      const currentMessages = await this.loadMessagesFromRefs(state.messageRefs, config);

      if (state.isStreaming) {
        const stream = await this.model.stream(currentMessages, config);
        let finalMessage: AIMessage | null = null;
        let accumulatedContent = "";
        for await (const chunk of stream) {
          const chunkContent = getMessageContent(chunk.content);
          accumulatedContent += chunkContent;
        }
        if (accumulatedContent) {
          finalMessage = new AIMessage({ content: accumulatedContent });
        }
        return {
          messageRefs: finalMessage ? [...state.messageRefs, { messageId: uuidv7(), isFromUser: false }] : state.messageRefs,
          responseChunk: undefined,
        };
      } else {
        console.log('Current messages:', currentMessages);
        const response = await this.model.invoke(currentMessages, config);
        console.log('LLM raw response:', response);
        
        const responseContent = getMessageContent(response.content);
        console.log('Processed response content:', responseContent);
        
        if (!responseContent) {
          throw new Error('Empty response from LLM');
        }

        // Create a new message reference for the assistant's response
        const assistantMessageId = uuidv7();
        
        // Get userId and conversationId from the request
        const userId = config?.configurable?.userId;
        const conversationId = config?.configurable?.conversationId;

        if (!userId || !conversationId) {
          throw new Error('Missing userId or conversationId in request');
        }
        
        // Store the assistant's message in DynamoDB
        await dynamoDB.put({
          TableName: process.env.DYNAMODB_TABLE_NAME as string,
          Item: {
            pk: `MSG#${assistantMessageId}`,
            sk: `MSG#${assistantMessageId}`,
            content: responseContent,
            isFromUser: false,
            conversationId,
            createdAt: Date.now(),
            lastModified: Date.now(),
            GSI1PK: `USER#${userId}#CHAT#${conversationId}`,
            GSI1SK: Date.now(),
            type: 'MSG'
          }
        });

        // Only add the new message reference if it doesn't already exist
        const existingIds = new Set(state.messageRefs.map(ref => ref.messageId));
        const newMessageRefs = existingIds.has(assistantMessageId) 
          ? state.messageRefs 
          : [...state.messageRefs, { messageId: assistantMessageId, isFromUser: false }];

        return {
          messageRefs: newMessageRefs,
          responseChunk: responseContent,
        };
      }
    });

    return graph;
  }

  private async loadMessagesFromRefs(refs: MessageReference[], config?: RunnableConfig): Promise<BaseMessage[]> {
    if (refs.length === 0) return [];

    // Get userId and conversationId from the configurable options
    const userId = config?.configurable?.userId;
    const conversationId = config?.configurable?.conversationId;

    if (!userId || !conversationId) {
      console.error('Missing userId or conversationId in configurable options');
      return [];
    }

    // Query all messages in a single operation
    const result = await dynamoDB.query({
      TableName: process.env.DYNAMODB_TABLE_NAME as string,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}#CHAT#${conversationId}`
      },
      ScanIndexForward: true
    });

    // Create a map of message IDs to their content
    const messageMap = new Map(
      (result.Items || []).map(item => [
        item.pk.replace('MSG#', ''),
        {
          content: item.content,
          isFromUser: item.isFromUser
        }
      ])
    );

    // Return messages in the order of the refs array
    return refs
      .map(ref => {
        const message = messageMap.get(ref.messageId);
        if (!message) return null;
        return ref.isFromUser
          ? new HumanMessage(message.content)
          : new AIMessage(message.content);
      })
      .filter((msg): msg is BaseMessage => msg !== null);
  }

  /**
   * Sends a non-streaming request to the LLM
   * @param request - The request containing messages and optional config
   * @returns A promise that resolves to the LLM response
   * 
   * @example
   * ```typescript
   * const response = await llmService.ask({
   *   messages: [LLMService.createMessage('Hello', 'user')]
   * });
   * console.log(response.content);
   * ```
   */
  async ask(request: LLMRequest): Promise<LLMResponse> {
    const graph = this.compileGraph();
    
    // Create a new message reference for the user's message
    const userMessageId = uuidv7();
    
    // Store the user's message and get checkpoint in parallel
    const [checkpoint] = await Promise.all([
      // Get checkpoint
      this.checkpointSaver.getTuple(request.userId, request.conversationId, 'latest'),
      // Store user's message
      dynamoDB.put({
        TableName: process.env.DYNAMODB_TABLE_NAME as string,
        Item: {
          pk: `MSG#${userMessageId}`,
          sk: `MSG#${userMessageId}`,
          content: request.messages[0].content,
          isFromUser: true,
          conversationId: request.conversationId,
          createdAt: Date.now(),
          lastModified: Date.now(),
          GSI1PK: `USER#${request.userId}#CHAT#${request.conversationId}`,
          GSI1SK: Date.now(),
          type: 'MSG'
        }
      })
    ]);

    // Initialize state with existing messages and the new user message
    const initialState: GraphState = {
      messageRefs: [
        ...((checkpoint?.[0]?.messageRefs || []) as MessageReference[]),
        { messageId: userMessageId, isFromUser: true }
      ],
      isStreaming: false,
    };

    const finalState = await graph.invoke(initialState, {
      configurable: {
        userId: request.userId,
        conversationId: request.conversationId
      }
    });

    // Store the assistant's message and update checkpoint in parallel
    const [lastMessage] = await Promise.all([
      // Get the last message
      (async () => {
        const lastMessageRef = finalState.messageRefs[finalState.messageRefs.length - 1];
        const result = await dynamoDB.get({
          TableName: process.env.DYNAMODB_TABLE_NAME as string,
          Key: {
            pk: `MSG#${lastMessageRef.messageId}`,
            sk: `MSG#${lastMessageRef.messageId}`
          }
        });
        return result.Item;
      })(),
      // Update checkpoint
      this.checkpointSaver.putTuple(
        request.userId,
        request.conversationId,
        'latest',
        { messageRefs: finalState.messageRefs },
        { source: 'input', step: 1, writes: null, parents: {} }
      )
    ]);

    if (!lastMessage) {
      throw new Error('Failed to load assistant response');
    }

    const responseContent = getMessageContent(lastMessage.content);
    if (!responseContent) {
      throw new Error('Empty response from assistant');
    }

    return {
      content: responseContent,
      role: 'assistant',
    };
  }

  /**
   * Sends a streaming request to the LLM
   * @param request - The request containing messages and optional config
   * @returns An async generator that yields response chunks
   * 
   * @example
   * ```typescript
   * for await (const chunk of llmService.askStream({
   *   messages: [LLMService.createMessage('Hello', 'user')]
   * })) {
   *   if (!chunk.done) {
   *     process.stdout.write(chunk.content);
   *   }
   * }
   * ```
   */
  async *askStream(request: LLMRequest): AsyncGenerator<LLMStreamResponse> {
    const graph = this.compileGraph();
    const checkpoint = await this.checkpointSaver.getTuple(request.userId, request.conversationId, 'latest');
    const initialState: GraphState = {
      messageRefs: (checkpoint?.[0]?.messageRefs || []) as MessageReference[],
      isStreaming: true,
    };

    const stream = graph.stream(initialState, { configurable: { thread_id: request.userId } }) as any as AsyncIterable<Record<string, any>>;

    let yieldedContent = false;
    for await (const step of stream) {
      const invokeLLMOutput = step['invokeLLM'];

      if (invokeLLMOutput) {
        if (invokeLLMOutput.responseChunk) {
          yield {
            content: invokeLLMOutput.responseChunk,
            done: false,
          };
          yieldedContent = true;
        }
      }
    }

    if (yieldedContent) {
      yield { content: '', done: true };
    } else {
      console.warn("LLM stream finished, but no content chunks were yielded through 'responseChunk'. Sending final 'done'.");
      yield { content: '', done: true };
    }
  }

  /**
   * Creates a new message instance
   * @param content - The content of the message
   * @param role - The role of the message sender ('user' or 'assistant')
   * @returns A new message instance
   * 
   * @example
   * ```typescript
   * const userMessage = LLMService.createMessage('Hello', 'user');
   * const assistantMessage = LLMService.createMessage('Hi there!', 'assistant');
   * ```
   */
  static createMessage(content: string, role: 'user' | 'assistant'): HumanMessage | AIMessage {
    return role === 'user'
      ? new HumanMessage({ content })
      : new AIMessage({ content });
  }

  /**
   * Adds a custom node to the graph definition
   * @param nodeName - The name of the node to add
   * @param nodeFn - The function to execute when the node is reached
   * @throws Error if the graph has already been compiled
   * 
   * @note This method must be called before any ask or askStream calls
   * @example
   * ```typescript
   * llmService.addFeatureNode('customNode', async (state) => {
   *   // Custom processing logic
   *   return { ...state, customField: 'value' };
   * });
   * ```
   */
  addFeatureNode(nodeName: string, nodeFn: (state: GraphState) => Promise<Partial<GraphState>>) {
    if (this.compiledGraph) {
      throw new Error("Cannot add nodes after the graph has been compiled. Define all nodes before calling 'ask' or 'askStream'.");
    }
    this.graphDefinition.addNode(nodeName, nodeFn);

    console.warn(`Node '${nodeName}' added. Edges must be manually configured before compiling.`);
  }
}