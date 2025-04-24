import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SimpleLLMService } from '@/lib/services/simple.llm.service';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, AIMessage } from '@langchain/core/messages';

// Mock ChatOpenAI
vi.mock('@langchain/openai', () => ({
  ChatOpenAI: vi.fn().mockImplementation(() => ({
    invoke: vi.fn().mockResolvedValue({ content: 'AI response' }),
    callKeys: [] as string[],
    lc_serializable: true,
    lc_secrets: {},
    lc_aliases: {},
    lc_namespace: ['langchain', 'chat_models', 'openai'] as string[],
  } as unknown as ChatOpenAI)),
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
        callKeys: [] as string[],
        lc_serializable: true,
        lc_secrets: {},
        lc_aliases: {},
        lc_namespace: ['langchain', 'chat_models', 'openai'] as string[],
      } as unknown as ChatOpenAI));

      const service = SimpleLLMService.getInstance();
      const response = await service.ask(mockRequest);
      expect(response.content).toBe('String response');
      expect(response.role).toBe('assistant');
    });

    it('should handle array content in response', async () => {
      vi.mocked(ChatOpenAI).mockImplementation(() => ({
        invoke: vi.fn().mockResolvedValue({ content: ['Part 1', 'Part 2'] }),
        callKeys: [] as string[],
        lc_serializable: true,
        lc_secrets: {},
        lc_aliases: {},
        lc_namespace: ['langchain', 'chat_models', 'openai'] as string[],
      } as unknown as ChatOpenAI));

      const service = SimpleLLMService.getInstance();
      const response = await service.ask(mockRequest);
      expect(response.content).toBe('Part 1Part 2');
      expect(response.role).toBe('assistant');
    });

    it('should throw error on empty response', async () => {
      vi.mocked(ChatOpenAI).mockImplementation(() => ({
        invoke: vi.fn().mockResolvedValue({ content: '' }),
        callKeys: [] as string[],
        lc_serializable: true,
        lc_secrets: {},
        lc_aliases: {},
        lc_namespace: ['langchain', 'chat_models', 'openai'] as string[],
      } as unknown as ChatOpenAI));

      const service = SimpleLLMService.getInstance();
      await expect(service.ask(mockRequest)).rejects.toThrow('Empty response from LLM');
    });

    it('should log debug messages when debug mode is enabled', async () => {
      process.env.LLM_DEBUG_MODE = 'true';
      const consoleSpy = vi.spyOn(console, 'log');

      vi.mocked(ChatOpenAI).mockImplementation(() => ({
        invoke: vi.fn().mockResolvedValue({ content: 'Debug response' }),
        callKeys: [] as string[],
        lc_serializable: true,
        lc_secrets: {},
        lc_aliases: {},
        lc_namespace: ['langchain', 'chat_models', 'openai'] as string[],
      } as unknown as ChatOpenAI));

      const service = SimpleLLMService.getInstance();
      await service.ask(mockRequest);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[SimpleLLMService Debug] Sending request to LLM...',
        expect.anything()
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        '[SimpleLLMService Debug] Messages:',
        expect.any(Array)
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        '[SimpleLLMService Debug] LLM response:',
        expect.objectContaining({ content: 'Debug response' })
      );
    });

    it('should handle LLM errors', async () => {
      const mockError = new Error('LLM error');
      vi.mocked(ChatOpenAI).mockImplementation(() => ({
        invoke: vi.fn().mockRejectedValue(mockError),
        callKeys: [] as string[],
        lc_serializable: true,
        lc_secrets: {},
        lc_aliases: {},
        lc_namespace: ['langchain', 'chat_models', 'openai'] as string[],
      } as unknown as ChatOpenAI));

      const service = SimpleLLMService.getInstance();
      await expect(service.ask(mockRequest)).rejects.toThrow('LLM error');
    });
  });
}); 