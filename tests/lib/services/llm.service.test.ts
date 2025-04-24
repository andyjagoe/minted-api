import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LLMService } from '@/lib/services/llm.service';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import { DynamoDBCheckpointSaver } from '@/lib/services/checkpoint.service';
import { BaseMessage } from '@langchain/core/messages';
import { IterableReadableStream } from '@langchain/core/utils/stream';
import { StateGraph } from '@langchain/langgraph';
import { dynamoDB } from '@/lib/utils/dynamodb';

// Mock DynamoDB utils
vi.mock('@/lib/utils/dynamodb', () => ({
  dynamoDB: {
    get: vi.fn().mockImplementation(() => Promise.resolve({
      Item: {
        content: 'AI response',
        isFromUser: false,
        conversationId: 'test-conversation-id',
        createdAt: Date.now(),
        lastModified: Date.now()
      }
    })),
    put: vi.fn().mockImplementation(() => Promise.resolve({})),
    query: vi.fn().mockImplementation(() => Promise.resolve({
      Items: [{
        content: 'AI response',
        isFromUser: false,
        conversationId: 'test-conversation-id',
        createdAt: Date.now(),
        lastModified: Date.now()
      }]
    }))
  }
}));

// Mock external dependencies
vi.mock('@langchain/openai');
vi.mock('@langchain/langgraph');
vi.mock('@/lib/services/checkpoint.service');

let service: LLMService;
let chatOpenAIMock: any;
let stateGraphMock: any;

const mockRequest = {
  messages: [LLMService.createMessage('Hello', 'user')],
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
  process.env.DYNAMODB_TABLE_NAME = 'test-table';
  
  // Reset singleton instance
  (LLMService as any).instance = null;
  (LLMService as any).compiledGraph = null;

  // Create mock graph
  stateGraphMock = {
    addNode: vi.fn(),
    addEdge: vi.fn(),
    compile: vi.fn().mockReturnValue({
      invoke: vi.fn().mockResolvedValue({
        messageRefs: [{ messageId: 'test-id', isFromUser: false }],
        responseChunk: 'AI response'
      }),
      stream: vi.fn().mockImplementation(async function* () {
        yield {
          invokeLLM: {
            responseChunk: 'Streaming response'
          }
        };
        yield {
          invokeLLM: {
            responseChunk: null
          }
        };
      })
    })
  };

  // Mock StateGraph constructor
  vi.mocked(StateGraph).mockImplementation(() => stateGraphMock);

  // Create mock ChatOpenAI instance with proper streaming implementation
  const mockChatOpenAI = {
    invoke: vi.fn().mockResolvedValue({ content: 'AI response' }),
    stream: vi.fn().mockImplementation(async function* () {
      yield { content: 'Streaming response' };
    }),
    callKeys: [] as string[],
    lc_namespace: ['langchain', 'chat_models', 'openai'] as string[]
  };

  vi.mocked(ChatOpenAI).mockImplementation(() => mockChatOpenAI as unknown as ChatOpenAI);
  
  // Initialize service
  service = LLMService.getInstance();
  chatOpenAIMock = vi.mocked(ChatOpenAI).mock.results[0].value;
});

it('should be a singleton', () => {
  const instance1 = LLMService.getInstance();
  const instance2 = LLMService.getInstance();
  expect(instance1).toBe(instance2);
});

it('should handle non-streaming requests', async () => {
  const response = await service.ask(mockRequest);
  expect(response.content).toBe('AI response');
  expect(response.role).toBe('assistant');
});

it('should handle streaming requests', async () => {
  const chunks: string[] = [];
  for await (const chunk of service.askStream(mockRequest)) {
    if (!chunk.done) {
      chunks.push(chunk.content);
    }
  }
  expect(chunks).toContain('Streaming response');
});

it('should add nodes to the graph before compilation', () => {
  const nodeFn = async (state: any) => ({ ...state });
  service.addFeatureNode('testNode', nodeFn);
  expect(stateGraphMock.addNode).toHaveBeenCalledWith('testNode', nodeFn);
  expect(stateGraphMock.addEdge).not.toHaveBeenCalled();
});

it('should throw error when adding nodes after compilation', async () => {
  // Force graph compilation by making a request
  await service.ask(mockRequest);
  
  const nodeFn = async (state: any) => ({ ...state });
  expect(() => service.addFeatureNode('testNode', nodeFn)).toThrow();
});

it('should throw error on empty response', async () => {
  // Mock empty response from graph
  const mockEmptyGraph = {
    addNode: vi.fn(),
    addEdge: vi.fn(),
    compile: vi.fn().mockReturnValue({
      invoke: vi.fn().mockResolvedValue({
        messageRefs: [{ messageId: 'test-id', isFromUser: false }],
        responseChunk: ''
      })
    })
  };

  vi.mocked(StateGraph).mockImplementation(() => mockEmptyGraph);

  // Mock DynamoDB get to return empty content
  vi.mocked(dynamoDB.get).mockResolvedValue({
    Item: {
      content: '',
      messageId: 'test-id',
      isFromUser: false
    },
    $metadata: {
      httpStatusCode: 200,
      requestId: 'test-request-id',
      attempts: 1,
      totalRetryDelay: 0
    }
  });

  // Reset service to use new mock
  (LLMService as any).instance = null;
  (LLMService as any).compiledGraph = null;
  service = LLMService.getInstance();

  await expect(service.ask(mockRequest)).rejects.toThrow('Empty response from assistant');
});

it('should log debug messages when debug mode is enabled', async () => {
  process.env.LLM_DEBUG_MODE = 'true';
  const consoleSpy = vi.spyOn(console, 'log');
  
  // Mock DynamoDB operations
  vi.mocked(dynamoDB.get).mockResolvedValue({
    Item: {
      content: 'Test response',
      messageId: 'test-id',
      isFromUser: false
    },
    $metadata: {
      httpStatusCode: 200,
      requestId: 'test-request-id',
      attempts: 1,
      totalRetryDelay: 0
    }
  });

  vi.mocked(dynamoDB.put).mockResolvedValue({
    $metadata: {
      httpStatusCode: 200,
      requestId: 'test-request-id',
      attempts: 1,
      totalRetryDelay: 0
    }
  });

  vi.mocked(dynamoDB.query).mockResolvedValue({
    Items: [{
      content: 'Test response',
      messageId: 'test-id',
      isFromUser: false
    }],
    $metadata: {
      httpStatusCode: 200,
      requestId: 'test-request-id',
      attempts: 1,
      totalRetryDelay: 0
    }
  });

  // Mock checkpoint saver
  vi.mocked(DynamoDBCheckpointSaver).mockImplementation(() => {
    const mock = {
      getTuple: vi.fn().mockResolvedValue([{ messageRefs: [] }]),
      putTuple: vi.fn().mockResolvedValue(undefined),
      list: vi.fn().mockResolvedValue([])
    };
    return mock as unknown as DynamoDBCheckpointSaver;
  });

  // Create mock graph with debug logging
  const mockGraph = {
    addNode: vi.fn((name, fn) => {
      if (name === 'processMessages') {
        fn({ messageRefs: [] }); // This will trigger debug logging
      }
    }),
    addEdge: vi.fn(),
    compile: vi.fn().mockReturnValue({
      invoke: vi.fn().mockResolvedValue({
        messageRefs: [{ messageId: 'test-id', isFromUser: false }],
        responseChunk: 'Test response'
      })
    })
  };

  // Mock StateGraph constructor
  vi.mocked(StateGraph).mockImplementation(() => mockGraph);
  
  // Reset service to use debug mode
  (LLMService as any).instance = null;
  (LLMService as any).compiledGraph = null;
  service = LLMService.getInstance();
  
  await service.ask(mockRequest);

  // Verify debug logging
  expect(consoleSpy).toHaveBeenCalledWith(
    '[LLMService Debug] Processing messages...',
    expect.anything()
  );
});

it('should handle LLM errors', async () => {
  const mockError = new Error('LLM error');
  
  // Mock error response from graph
  const mockErrorGraph = {
    addNode: vi.fn(),
    addEdge: vi.fn(),
    compile: vi.fn().mockReturnValue({
      invoke: vi.fn().mockRejectedValue(mockError)
    })
  };

  vi.mocked(StateGraph).mockImplementation(() => mockErrorGraph);

  // Reset service to use new mock
  (LLMService as any).instance = null;
  (LLMService as any).compiledGraph = null;
  service = LLMService.getInstance();

  await expect(service.ask(mockRequest)).rejects.toThrow('LLM error');
}); 