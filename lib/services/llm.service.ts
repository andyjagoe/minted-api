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
import { HumanMessage, AIMessage, MessageContent, BaseMessage } from '@langchain/core/messages';
import { StateGraph, START, END, CompiledStateGraph } from '@langchain/langgraph';
import { RunnableConfig } from '@langchain/core/runnables';
import { IterableReadableStream } from '@langchain/core/utils/stream';
import { LLMRequest, LLMResponse, LLMConfig, LLMStreamResponse } from '@/lib/types/llm.types';

/**
 * Represents the state of the LangGraph during execution
 */
interface GraphState {
  /** Array of messages in the conversation */
  messages: Array<HumanMessage | AIMessage>;
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
function getMessageContent(content: MessageContent | undefined): string {
  if (!content) return '';
  if (typeof content === 'string') {
    return content;
  }
  return content
    .map(item => (item && typeof item === 'object' && 'text' in item ? item.text : ''))
    .join('');
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
        messages: {
          value: (x: BaseMessage[], y: BaseMessage[]) => x.concat(y),
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
      const currentMessages = state.messages;

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
          messages: finalMessage ? [finalMessage] : [],
          responseChunk: undefined,
        };
      } else {
        const response = await this.model.invoke(currentMessages, config);
        const responseContent = getMessageContent(response.content);
        return {
          messages: [new AIMessage({ content: responseContent })],
          responseChunk: responseContent,
        };
      }
    });

    return graph;
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

    const initialState: GraphState = {
      messages: request.messages as Array<HumanMessage | AIMessage>,
      isStreaming: false,
    };

    const finalState = await graph.invoke(initialState);

    const lastMessage = finalState.messages[finalState.messages.length - 1];
    const responseContent = getMessageContent(lastMessage?.content);

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
    const threadId = Math.random().toString(36).substring(7);

    const initialState: GraphState = {
      messages: request.messages as Array<HumanMessage | AIMessage>,
      isStreaming: true,
    };

    const stream = graph.stream(initialState, { configurable: { thread_id: threadId } }) as any as AsyncIterable<Record<string, any>>;

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