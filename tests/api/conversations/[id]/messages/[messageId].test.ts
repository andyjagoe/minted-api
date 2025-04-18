import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PUT, DELETE } from '@/app/api/conversations/[id]/messages/[messageId]/route';
import { dynamoDB } from '@/lib/utils/dynamodb';
import { messageUpdateSchema } from '@/lib/types/message.types';
import { currentUser } from '@clerk/nextjs/server';
import { ZodError } from 'zod';

// Mock DynamoDB
vi.mock('@/lib/utils/dynamodb', () => ({
  dynamoDB: {
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock Clerk
vi.mock('@clerk/nextjs/server', () => ({
  currentUser: vi.fn(),
}));

// Mock message schema
vi.mock('@/lib/types/message.types', () => ({
  messageUpdateSchema: {
    parse: vi.fn(),
  },
}));

describe('Conversation Message API - [messageId]', () => {
  const mockRequest = (body: any) => ({
    json: () => Promise.resolve(body),
  }) as Request;

  const mockParams = { 
    id: 'test-conversation-id',
    messageId: 'test-message-id'
  };

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
    vi.mocked(messageUpdateSchema.parse).mockImplementation((data: unknown) => ({
      content: (data as { content: string }).content,
    }));
  });

  describe('PUT /api/conversations/[id]/messages/[messageId]', () => {
    it('should update a message successfully', async () => {
      const mockBody = {
        content: 'Updated message content',
      };

      // Mock successful update
      vi.mocked(dynamoDB.update).mockResolvedValueOnce({
        Attributes: {
          pk: 'USER#test-user-id',
          sk: 'MSG#test-message-id',
          content: mockBody.content,
          role: 'user',
          conversationId: 'test-conversation-id',
          lastModified: Date.now(),
        },
      } as any);

      const response = await PUT(mockRequest(mockBody), { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.error).toBeNull();
      expect(data.data.content).toBe(mockBody.content);
      expect(data.data.role).toBe('user');
      expect(data.data.conversationId).toBe('test-conversation-id');
      expect(dynamoDB.update).toHaveBeenCalled();
    });

    it('should return 401 when user is not authenticated', async () => {
      vi.mocked(currentUser).mockResolvedValue(null);

      const mockBody = {
        content: 'Updated message content',
      };

      const response = await PUT(mockRequest(mockBody), { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
      expect(data.data).toBeNull();
    });

    it('should return 400 when request body validation fails', async () => {
      vi.mocked(messageUpdateSchema.parse).mockImplementation(() => {
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

      const response = await PUT(mockRequest(mockBody), { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request body');
      expect(data.data).toBeNull();
    });

    it('should return 500 when table name is not configured', async () => {
      delete process.env.DYNAMODB_TABLE_NAME;

      const mockBody = {
        content: 'Updated message content',
      };

      const response = await PUT(mockRequest(mockBody), { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Table name not configured');
      expect(data.data).toBeNull();
    });

    it('should return 500 when DynamoDB operation fails', async () => {
      vi.mocked(dynamoDB.update).mockRejectedValueOnce(new Error('DynamoDB error'));

      const mockBody = {
        content: 'Updated message content',
      };

      const response = await PUT(mockRequest(mockBody), { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to update message');
      expect(data.data).toBeNull();
    });
  });

  describe('DELETE /api/conversations/[id]/messages/[messageId]', () => {
    it('should delete a message successfully', async () => {
      // Mock successful delete
      vi.mocked(dynamoDB.delete).mockResolvedValueOnce({} as any);

      const response = await DELETE(mockRequest({}), { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.error).toBeNull();
      expect(data.data.id).toBe(mockParams.messageId);
      expect(dynamoDB.delete).toHaveBeenCalled();
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

    it('should return 500 when DynamoDB operation fails', async () => {
      vi.mocked(dynamoDB.delete).mockRejectedValueOnce(new Error('DynamoDB error'));

      const response = await DELETE(mockRequest({}), { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to delete message');
      expect(data.data).toBeNull();
    });
  });
}); 