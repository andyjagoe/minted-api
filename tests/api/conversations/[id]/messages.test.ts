import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/conversations/[id]/messages/route';
import { dynamoDB } from '@/lib/utils/dynamodb';
import { messageSchema } from '@/lib/types/message.types';
import { currentUser } from '@clerk/nextjs/server';
import { LLMService } from '@/lib/services/llm.service';
import { ZodError } from 'zod';

// Mock DynamoDB
vi.mock('@/lib/utils/dynamodb', () => ({
  dynamoDB: {
    query: vi.fn(),
    put: vi.fn(),
  },
}));

// Mock Clerk
vi.mock('@clerk/nextjs/server', () => ({
  currentUser: vi.fn(),
}));

// Mock message schema
vi.mock('@/lib/types/message.types', () => ({
  messageSchema: {
    parse: vi.fn(),
  },
}));

// Mock LLM service
vi.mock('@/lib/services/llm.service', () => ({
  LLMService: class {
    ask = vi.fn().mockResolvedValue({
      content: 'AI response',
      isFromUser: false,
    });
    static createMessage = vi.fn().mockReturnValue({
      content: 'User message',
      role: 'user',
    });
  },
}));

describe('Conversation Messages API', () => {
  const mockRequest = (body: any) => ({
    json: () => Promise.resolve(body),
  }) as Request;

  const mockParams = { id: 'test-conversation-id' };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DYNAMODB_TABLE_NAME = 'test-table';
    // Mock authenticated user by default
    vi.mocked(currentUser).mockResolvedValue({
      id: 'test-user-id',
      emailAddresses: [{ emailAddress: 'test@example.com' }],
      firstName: 'Test',
      lastName: 'User',
    } as any);
    // Mock successful schema validation by default
    vi.mocked(messageSchema.parse).mockImplementation((data: unknown) => ({
      content: (data as { content: string }).content,
      conversationId: mockParams.id,
    }));
  });

  describe('GET /api/conversations/[id]/messages', () => {
    it('should fetch all messages for a conversation successfully', async () => {
      const mockMessages = [
        {
          pk: 'USER#test-user-id',
          sk: 'MSG#msg1',
          content: 'First message',
          isFromUser: true,
          conversationId: 'test-conversation-id',
          createdAt: 1234567890,
          lastModified: 1234567890,
        },
        {
          pk: 'USER#test-user-id',
          sk: 'MSG#msg2',
          content: 'Second message',
          isFromUser: false,
          conversationId: 'test-conversation-id',
          createdAt: 1234567891,
          lastModified: 1234567891,
        },
      ];

      vi.mocked(dynamoDB.query).mockResolvedValueOnce({
        Items: mockMessages,
      } as any);

      const response = await GET(mockRequest({}), { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.error).toBeNull();
      expect(data.data).toHaveLength(2);
      expect(data.data[0].id).toBe('msg1');
      expect(data.data[0].content).toBe('First message');
      expect(data.data[0].isFromUser).toBe(true);
      expect(data.data[1].id).toBe('msg2');
      expect(data.data[1].content).toBe('Second message');
      expect(data.data[1].isFromUser).toBe(false);
      expect(dynamoDB.query).toHaveBeenCalledWith({
        TableName: 'test-table',
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :GSI1PK',
        ExpressionAttributeValues: {
          ':GSI1PK': `USER#test-user-id#CHAT#test-conversation-id`,
        },
        ScanIndexForward: true,
      });
    });

    it('should return 401 when user is not authenticated', async () => {
      vi.mocked(currentUser).mockResolvedValue(null);

      const response = await GET(mockRequest({}), { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
      expect(data.data).toBeNull();
    });

    it('should return 500 when table name is not configured', async () => {
      delete process.env.DYNAMODB_TABLE_NAME;

      const response = await GET(mockRequest({}), { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Table name not configured');
      expect(data.data).toBeNull();
    });

    it('should return 500 when DynamoDB operation fails', async () => {
      vi.mocked(dynamoDB.query).mockRejectedValueOnce(new Error('DynamoDB error'));

      const response = await GET(mockRequest({}), { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch messages');
      expect(data.data).toBeNull();
    });
  });

  describe('POST /api/conversations/[id]/messages', () => {
    it('should create a message successfully', async () => {
      const mockBody = {
        content: 'Test message',
      };

      // Mock successful put
      vi.mocked(dynamoDB.put).mockResolvedValueOnce({} as any);

      const response = await POST(mockRequest(mockBody), { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.error).toBeNull();
      expect(data.data.message.content).toBe(mockBody.content);
      expect(data.data.message.isFromUser).toBe(true);
      expect(data.data.message.conversationId).toBe(mockParams.id);
      expect(data.data.response.content).toBe('AI response');
      expect(data.data.response.isFromUser).toBe(false);
      expect(data.data.response.conversationId).toBe(mockParams.id);
      expect(dynamoDB.put).toHaveBeenCalledTimes(2);
    });

    it('should return 401 when user is not authenticated', async () => {
      vi.mocked(currentUser).mockResolvedValue(null);

      const mockBody = {
        content: 'Test message',
      };

      const response = await POST(mockRequest(mockBody), { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
      expect(data.data).toBeNull();
    });

    it('should return 400 when request body validation fails', async () => {
      vi.mocked(messageSchema.parse).mockImplementation(() => {
        throw new ZodError([
          {
            code: 'invalid_type',
            expected: 'string',
            received: 'undefined',
            path: ['content'],
            message: 'Required',
          },
        ]);
      });

      const mockBody = {
        // Missing required content field
      };

      const response = await POST(mockRequest(mockBody), { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request body');
      expect(data.data).toBeNull();
    });

    it('should return 500 when table name is not configured', async () => {
      delete process.env.DYNAMODB_TABLE_NAME;

      const mockBody = {
        content: 'Test message',
      };

      const response = await POST(mockRequest(mockBody), { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Table name not configured');
      expect(data.data).toBeNull();
    });

    it('should return 500 when DynamoDB operation fails', async () => {
      vi.mocked(dynamoDB.put).mockRejectedValueOnce(new Error('DynamoDB error'));

      const mockBody = {
        content: 'Test message',
      };

      const response = await POST(mockRequest(mockBody), { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to create message');
      expect(data.data).toBeNull();
    });
  });
}); 