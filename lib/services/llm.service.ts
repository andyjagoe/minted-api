import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, AIMessage, MessageContent, BaseMessage } from '@langchain/core/messages';
import { StateGraph, START, END, CompiledStateGraph } from '@langchain/langgraph';
import { RunnableConfig } from '@langchain/core/runnables';
import { IterableReadableStream } from '@langchain/core/utils/stream';
import { LLMRequest, LLMResponse, LLMConfig, LLMStreamResponse } from '@/lib/types/llm.types';

// Define the state interface for the graph
interface GraphState {
  messages: Array<HumanMessage | AIMessage>;
  responseChunk?: string;
  isStreaming: boolean;
}

// Utility to extract message content
function getMessageContent(content: MessageContent | undefined): string {
  if (!content) return '';
  if (typeof content === 'string') {
    return content;
  }
  return content
    .map(item => (item && typeof item === 'object' && 'text' in item ? item.text : ''))
    .join('');
}

export class LLMService {
  private model: ChatOpenAI;
  private graphDefinition: StateGraph<GraphState>;
  private compiledGraph: CompiledStateGraph<GraphState, GraphState> | null = null;
  private config: LLMConfig;

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

  // Method to explicitly compile the graph (or call implicitly)
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

  // Build the LangGraph *definition* (nodes only)
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

  // Non-streaming ask method
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

  // Streaming ask method
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

  // Static method to create messages
  static createMessage(content: string, role: 'user' | 'assistant'): HumanMessage | AIMessage {
    return role === 'user'
      ? new HumanMessage({ content })
      : new AIMessage({ content });
  }

  // Method to extend the graph *definition* before compilation
  addFeatureNode(nodeName: string, nodeFn: (state: GraphState) => Promise<Partial<GraphState>>) {
    if (this.compiledGraph) {
      throw new Error("Cannot add nodes after the graph has been compiled. Define all nodes before calling 'ask' or 'askStream'.");
    }
    this.graphDefinition.addNode(nodeName, nodeFn);

    console.warn(`Node '${nodeName}' added. Edges must be manually configured before compiling.`);
  }
}