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
        title: 'Updated Conversation Title',
      };

      // Mock successful DynamoDB update
      vi.mocked(dynamoDB.update).mockResolvedValueOnce({
        Attributes: {
          pk: `CHAT#${mockParams.id}`,
          sk: 'CHAT#test-user-id',
          type: 'CHAT',
          title: mockBody.title,
          lastModified: Date.now(),
        },
      } as any);

      const response = await PUT(mockRequest(mockBody), { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.error).toBeNull();
      expect(data.data.title).toBe(mockBody.title);
      expect(dynamoDB.update).toHaveBeenCalled();
    });

    it('should return 401 when user is not authenticated', async () => {
      // Mock unauthenticated user
      vi.mocked(currentUser).mockResolvedValue(null);

      const mockBody = {
        title: 'Updated Conversation Title',
      };

      const response = await PUT(mockRequest(mockBody), { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
      expect(data.data).toBeNull();
    });

    it('should return 500 when table name is not configured', async () => {
      delete process.env.DYNAMODB_TABLE_NAME;

      const mockBody = {
        title: 'Updated Conversation Title',
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
        title: 'Updated Conversation Title',
      };

      const response = await PUT(mockRequest(mockBody), { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to update conversation');
      expect(data.data).toBeNull();
    });

    it('should return 400 when request body validation fails', async () => {
      // Mock schema validation to throw a ZodError
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
  });

  describe('DELETE /api/conversations/[id]', () => {
    it('should delete a conversation successfully', async () => {
      // Mock successful DynamoDB delete
      vi.mocked(dynamoDB.delete).mockResolvedValueOnce({} as any);

      const response = await DELETE(mockRequest({}), { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.error).toBeNull();
      expect(data.data.id).toBe(mockParams.id);
      expect(dynamoDB.delete).toHaveBeenCalled();
    });

    it('should return 401 when user is not authenticated', async () => {
      // Mock unauthenticated user
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

    it('should return 500 when DynamoDB delete fails', async () => {
      const mockError = new Error('DynamoDB error');
      vi.mocked(dynamoDB.delete).mockRejectedValueOnce(mockError);

      const response = await DELETE(mockRequest({}), { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to delete conversation');
      expect(data.data).toBeNull();
    });
  });
}); 