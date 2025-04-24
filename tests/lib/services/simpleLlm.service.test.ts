import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SimpleLLMService } from '@/lib/services/simpleLlm.service';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import { Runnable, RunnableConfig } from '@langchain/core/runnables';
import { BaseLanguageModelInput } from '@langchain/core/language_models/base';
import { AIMessageChunk } from '@langchain/core/messages';
import { ChatOpenAICallOptions } from '@langchain/openai';
import { IterableReadableStream } from '@langchain/core/utils/stream';
import { Tool } from '@langchain/core/tools';

// Mock ChatOpenAI
vi.mock('@langchain/openai', () => ({
  ChatOpenAI: vi.fn().mockImplementation(() => ({
    invoke: vi.fn().mockResolvedValue({ content: 'AI response' }),
    callKeys: {},
    lc_serializable: true,
    lc_secrets: {},
    lc_aliases: {},
    lc_namespace: ['langchain', 'chat_models', 'openai'],
  })),
}));

describe('SimpleLLMService', () => {
  const mockRequest = {
    messages: [SimpleLLMService.createMessage('Hello', 'user')],
    userId: 'test-user-id',
    conversationId: 'test-conversation-id',
    userProfile: {
      name: 'Test User',
      email: 'test@example.com'
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.LLM_DEBUG_MODE = 'false';
    // Reset singleton instance
    (SimpleLLMService as any).instance = null;
  });

  describe('getInstance', () => {
    it('should create a new instance with default config', () => {
      const service = SimpleLLMService.getInstance();
      expect(service).toBeInstanceOf(SimpleLLMService);
      expect(ChatOpenAI).toHaveBeenCalledWith({
        modelName: 'gpt-3.5-turbo',
        temperature: 0.7,
        maxTokens: 1000,
      });
    });

    it('should create a new instance with custom config', () => {
      const config = {
        modelName: 'gpt-4',
        temperature: 0.5,
        maxTokens: 2000,
      };
      const service = SimpleLLMService.getInstance(config);
      expect(service).toBeInstanceOf(SimpleLLMService);
      expect(ChatOpenAI).toHaveBeenCalledWith(config);
    });

    it('should return the same instance on subsequent calls', () => {
      const service1 = SimpleLLMService.getInstance();
      const service2 = SimpleLLMService.getInstance();
      expect(service1).toBe(service2);
    });
  });

  describe('createMessage', () => {
    it('should create a HumanMessage for user role', () => {
      const content = 'Hello';
      const message = SimpleLLMService.createMessage(content, 'user');
      expect(message).toBeInstanceOf(HumanMessage);
      expect(message.content).toBe(content);
    });

    it('should create an AIMessage for assistant role', () => {
      const content = 'Hello, how can I help?';
      const message = SimpleLLMService.createMessage(content, 'assistant');
      expect(message).toBeInstanceOf(AIMessage);
      expect(message.content).toBe(content);
    });
  });

  describe('ask', () => {
    it('should send request to LLM and return response', async () => {
      const service = SimpleLLMService.getInstance();
      const response = await service.ask(mockRequest);
      expect(response.content).toBe('AI response');
      expect(response.role).toBe('assistant');
    });

    it('should handle string content in response', async () => {
      vi.mocked(ChatOpenAI).mockImplementation(() => ({
        invoke: vi.fn().mockResolvedValue({ content: 'String response' }),
        callKeys: {},
        lc_serializable: true,
        lc_secrets: {},
        lc_aliases: {},
        lc_namespace: ['langchain', 'chat_models', 'openai'],
      }));

      const service = SimpleLLMService.getInstance();
      const response = await service.ask(mockRequest);
      expect(response.content).toBe('String response');
      expect(response.role).toBe('assistant');
    });

    it('should handle array content in response', async () => {
      vi.mocked(ChatOpenAI).mockImplementation(() => ({
        invoke: vi.fn().mockResolvedValue({ content: ['Part 1', 'Part 2'] }),
        callKeys: {},
        lc_serializable: true,
        lc_secrets: {},
        lc_aliases: {},
        lc_namespace: ['langchain', 'chat_models', 'openai'],
      }));

      const service = SimpleLLMService.getInstance();
      const response = await service.ask(mockRequest);
      expect(response.content).toBe('Part 1Part 2');
      expect(response.role).toBe('assistant');
    });

    it('should throw error on empty response', async () => {
      vi.mocked(ChatOpenAI).mockImplementation(() => ({
        invoke: vi.fn().mockResolvedValue({ content: '' }),
        callKeys: {},
        lc_serializable: true,
        lc_secrets: {},
        lc_aliases: {},
        lc_namespace: ['langchain', 'chat_models', 'openai'],
      }));

      const service = SimpleLLMService.getInstance();
      await expect(service.ask(mockRequest)).rejects.toThrow('Empty response from LLM');
    });

    it('should log debug messages when debug mode is enabled', async () => {
      process.env.LLM_DEBUG_MODE = 'true';
      const consoleSpy = vi.spyOn(console, 'log');

      // Set up mock with non-empty response
      vi.mocked(ChatOpenAI).mockImplementation(() => ({
        invoke: vi.fn().mockResolvedValue({ content: 'Debug test response' }),
        callKeys: ['model', 'temperature', 'maxTokens'],
        lc_serializable: true,
        lc_secrets: {} as Record<string, string>,
        lc_aliases: {} as Record<string, string>,
        lc_namespace: ['langchain', 'chat_models', 'openai'] as string[],
        lc_serializable_keys: ['model', 'temperature', 'maxTokens'] as string[],
        modelName: 'gpt-3.5-turbo',
        model: 'gpt-3.5-turbo',
        streaming: false,
        temperature: 0.7,
        maxTokens: 1000,
        maxRetries: 3,
        maxConcurrency: 1,
        verbose: false,
        timeout: 60000,
        cache: undefined,
        tags: ['chat', 'gpt'] as string[],
        metadata: {} as Record<string, unknown>,
        callbacks: [] as any[],
        client: {} as any,
        clientConfig: {} as any,
        streamUsage: false,
        useResponsesApi: false,
        completionParams: {} as any,
        baseUrl: undefined,
        apiKey: undefined,
        organization: undefined,
        prefixMessages: [] as any[],
        frequencyPenalty: 0,
        presencePenalty: 0,
        n: 1,
        logitBias: undefined,
        stop: undefined,
        user: undefined,
        defaultHeaders: {} as Record<string, string>,
        defaultQuery: {} as Record<string, string>,
        streaming_options: {} as any,
        getLlmString: () => 'gpt-3.5-turbo',
        invocationParams: () => ({
          model: 'gpt-3.5-turbo',
          temperature: 0.7,
          max_tokens: 1000,
          stream: false,
        }),
        bindTools: (tools: Tool[], kwargs?: Partial<ChatOpenAICallOptions>) => {
          return {
            lc_runnable: true,
            lc_namespace: ['langchain', 'chat_models', 'openai'] as string[],
            invoke: async () => new AIMessageChunk({ content: 'Debug test response' }),
            batch: async (inputs: BaseLanguageModelInput[], options?: RunnableConfig) => {
              return inputs.map(() => new AIMessageChunk({ content: 'Debug test response' }));
            },
            stream: async () => {
              const stream = new TransformStream<AIMessageChunk>();
              const writer = stream.writable.getWriter();
              writer.write(new AIMessageChunk({ content: 'Debug test response' }));
              writer.close();
              return stream.readable as IterableReadableStream<AIMessageChunk>;
            },
            getName: () => 'ChatOpenAI',
            bind: function() { return this; },
            withConfig: function() { return this; },
            withRetry: function() { return this; },
            map: function() { return this; },
            pipe: function() { return this; },
            _getOptionsList: function() { return []; },
            _separateRunnableConfigFromCallOptions: function() { return [{}, {}]; },
            _callWithConfig: async function() { return new AIMessageChunk({ content: 'Debug test response' }); }
          } as unknown as Runnable<BaseLanguageModelInput, AIMessageChunk, ChatOpenAICallOptions>;
        },
        createResponseFormat: () => ({
          type: 'text',
          response_format: { type: 'text' }
        }),
        getLsParams: () => ({
          ls_model_type: 'chat',
          ls_run_type: 'llm',
        }),
      } as unknown as ChatOpenAI));

      const service = SimpleLLMService.getInstance();
      await service.ask(mockRequest);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[SimpleLLMService Debug] Sending request to LLM...',
        expect.any(String)
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        '[SimpleLLMService Debug] Messages:',
        expect.any(Array)
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        '[SimpleLLMService Debug] LLM response:',
        expect.any(Object)
      );
    });

    it('should handle LLM errors', async () => {
      vi.mocked(ChatOpenAI).mockImplementation(() => ({
        invoke: vi.fn().mockRejectedValue(new Error('LLM error')),
        callKeys: {},
        lc_serializable: true,
        lc_secrets: {},
        lc_aliases: {},
        lc_namespace: ['langchain', 'chat_models', 'openai'],
      }));

      const service = SimpleLLMService.getInstance();
      await expect(service.ask(mockRequest)).rejects.toThrow('LLM error');
    });
  });
}); 