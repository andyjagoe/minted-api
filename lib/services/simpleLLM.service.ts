import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, AIMessage, BaseMessage, SystemMessage } from '@langchain/core/messages';
import { LLMRequest, LLMResponse, LLMConfig } from '@/lib/types/llm.types';

/**
 * Simple LLM service that uses LangChain's functional API
 * This is a minimal implementation without message history, storage, or streaming
 */
export class SimpleLLMService {
  private static instance: SimpleLLMService | null = null;
  private model: ChatOpenAI;
  private config: LLMConfig;
  private readonly isDebugMode: boolean;

  /**
   * Creates a new instance of SimpleLLMService
   * @param config - Configuration options for the LLM service
   * @returns The singleton instance of SimpleLLMService
   */
  static getInstance(config: LLMConfig = {}): SimpleLLMService {
    if (!SimpleLLMService.instance) {
      SimpleLLMService.instance = new SimpleLLMService(config);
    }
    return SimpleLLMService.instance;
  }

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor(config: LLMConfig = {}) {
    this.config = {
      modelName: config.modelName || 'gpt-3.5-turbo',
      temperature: config.temperature || 0.7,
      maxTokens: config.maxTokens || 1000,
    };
    this.isDebugMode = process.env.LLM_DEBUG_MODE === 'true';
    this.model = new ChatOpenAI({
      modelName: this.config.modelName,
      temperature: this.config.temperature,
      maxTokens: this.config.maxTokens,
    });
  }

  /**
   * Logs a message if debug mode is enabled
   */
  private debugLog(message: string, data?: any): void {
    if (this.isDebugMode) {
      console.log(`[SimpleLLMService Debug] ${message}`, data ? data : '');
    }
  }

  /**
   * Creates a new message instance
   */
  static createMessage(content: string, role: 'user' | 'assistant'): HumanMessage | AIMessage {
    return role === 'user'
      ? new HumanMessage({ content })
      : new AIMessage({ content });
  }

  /**
   * Sends a request to the LLM
   */
  async ask(request: LLMRequest): Promise<LLMResponse> {
    this.debugLog('Sending request to LLM...');

    // Combine system message with user messages
    const messages: BaseMessage[] = [
      new SystemMessage('You are a helpful assistant.'),
      ...request.messages
    ];

    this.debugLog('Messages:', messages);

    const response = await this.model.invoke(messages);
    this.debugLog('LLM response:', response);

    const content = typeof response.content === 'string' 
      ? response.content 
      : Array.isArray(response.content)
        ? response.content.map(c => typeof c === 'string' ? c : '').join('')
        : '';

    if (!content) {
      throw new Error('Empty response from LLM');
    }

    return {
      content,
      role: 'assistant',
    };
  }
} 