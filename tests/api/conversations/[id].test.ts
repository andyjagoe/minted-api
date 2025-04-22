import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PUT, DELETE } from '@/app/api/conversations/[id]/route';
import { dynamoDB } from '@/lib/utils/dynamodb';
import { conversationSchema } from '@/lib/types/conversation.types';
import { currentUser } from '@clerk/nextjs/server';
import { ZodError } from 'zod';

// Mock DynamoDB
vi.mock('@/lib/utils/dynamodb', () => ({
  dynamoDB: {
    update: vi.fn(),
    delete: vi.fn(),
    query: vi.fn(),
  },
}));

// Mock Clerk
vi.mock('@clerk/nextjs/server', () => ({
  currentUser: vi.fn(),
}));

// Mock conversation schema
vi.mock('@/lib/types/conversation.types', () => ({
  conversationSchema: {
    parse: vi.fn(),
  },
}));

describe('Conversation API - [id]', () => {
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
    vi.mocked(conversationSchema.parse).mockImplementation((data: unknown) => ({
      title: (data as { title: string }).title,
    }));
  });

  describe('PUT /api/conversations/[id]', () => {
    it('should update a conversation successfully', async () => {
      const mockBody = {
        title: 'Updated conversation title',
      };

      // Mock successful update
      vi.mocked(dynamoDB.update).mockResolvedValueOnce({
        Attributes: {
          pk: 'USER#test-user-id',
          sk: 'CHAT#test-conversation-id',
          title: mockBody.title,
          type: 'CHAT',
          lastModified: Date.now(),
        },
      } as any);

      const response = await PUT(mockRequest(mockBody), { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.error).toBeNull();
      expect(data.data.title).toBe(mockBody.title);
      expect(data.data.type).toBe('CHAT');
      expect(dynamoDB.update).toHaveBeenCalled();
    });

    it('should return 401 when user is not authenticated', async () => {
      vi.mocked(currentUser).mockResolvedValue(null);

      const mockBody = {
        title: 'Updated conversation title',
      };

      const response = await PUT(mockRequest(mockBody), { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
      expect(data.data).toBeNull();
    });

    it('should return 400 when request body validation fails', async () => {
      vi.mocked(conversationSchema.parse).mockImplementation(() => {
        throw new ZodError([
          {
            code: 'invalid_type',
            expected: 'string',
            received: 'undefined',
            path: ['title'],
            message: 'Required',
          },
        ]);
      });

      const mockBody = {
        // Missing required title field
      };

      const response = await PUT(mockRequest(mockBody), { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request body');
      expect(data.data).toBeNull();
    });

    it('should return 500 when table name is not configured', async () => {
      delete process.env.DYNAMODB_TABLE_NAME;

      const mockBody = {
        title: 'Updated conversation title',
      };

      const response = await PUT(mockRequest(mockBody), { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Table name not configured');
      expect(data.data).toBeNull();
    });

    it('should return 500 when DynamoDB update fails', async () => {
      const mockError = new Error('DynamoDB error');
      vi.mocked(dynamoDB.update).mockRejectedValueOnce(mockError);

      const mockBody = {
        title: 'Updated conversation title',
      };

      const response = await PUT(mockRequest(mockBody), { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to update conversation');
      expect(data.data).toBeNull();
    });
  });

  describe('DELETE /api/conversations/[id]', () => {
    it('should delete a conversation and its messages successfully', async () => {
      // Mock messages query result
      const mockMessages = [
        {
          pk: 'USER#test-user-id',
          sk: 'MSG#msg1',
          type: 'MSG',
          content: 'Message 1',
          isFromUser: true,
          conversationId: 'test-conversation-id',
          createdAt: Date.now(),
          lastModified: Date.now(),
        },
        {
          pk: 'USER#test-user-id',
          sk: 'MSG#msg2',
          type: 'MSG',
          content: 'Message 2',
          isFromUser: true,
          conversationId: 'test-conversation-id',
          createdAt: Date.now(),
          lastModified: Date.now(),
        },
      ];

      vi.mocked(dynamoDB.query).mockResolvedValueOnce({
        Items: mockMessages,
      } as any);

      // Mock successful deletes
      vi.mocked(dynamoDB.delete).mockResolvedValue({} as any);

      const response = await DELETE(mockRequest({}), { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.error).toBeNull();
      expect(data.data.id).toBe(mockParams.id);
      
      // Verify that messages were queried
      expect(dynamoDB.query).toHaveBeenCalledWith({
        TableName: 'test-table',
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :GSI1PK',
        ExpressionAttributeValues: {
          ':GSI1PK': `USER#test-user-id#CHAT#${mockParams.id}`,
        },
      });

      // Verify that all messages were deleted
      expect(dynamoDB.delete).toHaveBeenCalledTimes(4); // 2 messages + 1 conversation + 1 checkpoint
      expect(dynamoDB.delete).toHaveBeenCalledWith({
        TableName: 'test-table',
        Key: {
          pk: 'USER#test-user-id',
          sk: 'CHAT#test-conversation-id',
        },
      });
      expect(dynamoDB.delete).toHaveBeenCalledWith({
        TableName: 'test-table',
        Key: {
          pk: 'USER#test-user-id#CHAT#test-conversation-id',
          sk: 'CHECKPOINT#latest',
        },
      });
    });

    it('should delete a conversation with no messages successfully', async () => {
      // Mock empty messages query result
      vi.mocked(dynamoDB.query).mockResolvedValueOnce({
        Items: [],
      } as any);

      // Mock successful delete
      vi.mocked(dynamoDB.delete).mockResolvedValue({} as any);

      const response = await DELETE(mockRequest({}), { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.error).toBeNull();
      expect(data.data.id).toBe(mockParams.id);
      
      // Verify that messages were queried
      expect(dynamoDB.query).toHaveBeenCalled();
      
      // Verify that only the conversation and checkpoint were deleted
      expect(dynamoDB.delete).toHaveBeenCalledTimes(2); // 1 conversation + 1 checkpoint
      expect(dynamoDB.delete).toHaveBeenCalledWith({
        TableName: 'test-table',
        Key: {
          pk: 'USER#test-user-id',
          sk: 'CHAT#test-conversation-id',
        },
      });
      expect(dynamoDB.delete).toHaveBeenCalledWith({
        TableName: 'test-table',
        Key: {
          pk: 'USER#test-user-id#CHAT#test-conversation-id',
          sk: 'CHECKPOINT#latest',
        },
      });
    });

    it('should return 401 when user is not authenticated', async () => {
      vi.mocked(currentUser).mockResolvedValue(null);

      const response = await DELETE(mockRequest({}), { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
      expect(data.data).toBeNull();
    });

    it('should return 500 when table name is not configured', async () => {
      delete process.env.DYNAMODB_TABLE_NAME;

      const response = await DELETE(mockRequest({}), { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Table name not configured');
      expect(data.data).toBeNull();
    });

    it('should return 500 when DynamoDB query fails', async () => {
      vi.mocked(dynamoDB.query).mockRejectedValueOnce(new Error('DynamoDB error'));

      const response = await DELETE(mockRequest({}), { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to delete conversation');
      expect(data.data).toBeNull();
    });

    it('should return 500 when DynamoDB delete fails', async () => {
      // Mock successful query
      vi.mocked(dynamoDB.query).mockResolvedValueOnce({
        Items: [{
          pk: 'USER#test-user-id',
          sk: 'MSG#msg1',
        }],
      } as any);

      // Mock failed delete
      vi.mocked(dynamoDB.delete).mockRejectedValueOnce(new Error('DynamoDB error'));

      const response = await DELETE(mockRequest({}), { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to delete conversation');
      expect(data.data).toBeNull();
    });
  });
}); 