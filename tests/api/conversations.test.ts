import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/conversations/route';
import { dynamoDB } from '@/lib/utils/dynamodb';
import { conversationSchema } from '@/lib/types/conversation.types';
import { currentUser } from '@clerk/nextjs/server';
import { ZodError } from 'zod';

// Mock DynamoDB
vi.mock('@/lib/utils/dynamodb', () => ({
  dynamoDB: {
    put: vi.fn(),
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

describe('Conversations API', () => {
  const mockRequest = (body: any) => ({
    json: () => Promise.resolve(body),
  }) as Request;

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

  describe('GET /api/conversations', () => {
    it('should return conversations for authenticated user', async () => {
      const mockConversations = [
        {
          pk: 'USER#test-user-id',
          sk: 'CHAT#conv-1',
          title: 'Test Conversation 1',
          createdAt: 1234567890,
          lastModified: 1234567890,
          GSI1PK: 'USER#test-user-id#CHAT',
          GSI1SK: 1234567890,
        },
        {
          pk: 'USER#test-user-id',
          sk: 'CHAT#conv-2',
          title: 'Test Conversation 2',
          createdAt: 1234567891,
          lastModified: 1234567891,
          GSI1PK: 'USER#test-user-id#CHAT',
          GSI1SK: 1234567891,
        },
      ];

      vi.mocked(dynamoDB.query).mockResolvedValueOnce({
        Items: mockConversations,
        $metadata: {
          httpStatusCode: 200,
          requestId: 'test-request-id',
          attempts: 1,
          totalRetryDelay: 0,
        },
      } as any);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        data: [
          {
            id: 'conv-1',
            title: 'Test Conversation 1',
            createdAt: 1234567890,
            lastModified: 1234567890,
          },
          {
            id: 'conv-2',
            title: 'Test Conversation 2',
            createdAt: 1234567891,
            lastModified: 1234567891,
          },
        ],
        error: null,
      });
    });

    it('should return 401 for unauthenticated user', async () => {
      vi.mocked(currentUser).mockResolvedValue(null);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({
        data: null,
        error: 'Unauthorized',
      });
    });

    it('should return 500 when table name is not configured', async () => {
      delete process.env.DYNAMODB_TABLE_NAME;

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({
        data: null,
        error: 'Table name not configured',
      });
    });

    it('should return 500 when DynamoDB query fails', async () => {
      vi.mocked(dynamoDB.query).mockRejectedValueOnce(new Error('DynamoDB error'));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({
        data: null,
        error: 'Failed to fetch conversations',
      });
    });
  });

  it('should create a conversation successfully', async () => {
    const mockBody = {
      title: 'Test Conversation',
    };

    // Mock successful DynamoDB put
    vi.mocked(dynamoDB.put).mockResolvedValueOnce({} as any);

    const response = await POST(mockRequest(mockBody));
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.error).toBeNull();
    expect(data.data).toHaveProperty('id');
    expect(data.data.title).toBe(mockBody.title);
    expect(dynamoDB.put).toHaveBeenCalled();
  });

  it('should return 401 when user is not authenticated', async () => {
    // Mock unauthenticated user
    vi.mocked(currentUser).mockResolvedValue(null);

    const mockBody = {
      title: 'Test Conversation',
    };

    const response = await POST(mockRequest(mockBody));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
    expect(data.data).toBeNull();
  });

  it('should return 500 when table name is not configured', async () => {
    delete process.env.DYNAMODB_TABLE_NAME;

    const mockBody = {
      title: 'Test Conversation',
    };

    const response = await POST(mockRequest(mockBody));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Table name not configured');
    expect(data.data).toBeNull();
  });

  it('should return 500 when DynamoDB put fails', async () => {
    const mockError = new Error('DynamoDB error');
    vi.mocked(dynamoDB.put).mockRejectedValueOnce(mockError);

    const mockBody = {
      title: 'Test Conversation',
    };

    const response = await POST(mockRequest(mockBody));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to create conversation');
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

    const response = await POST(mockRequest(mockBody));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid request body');
    expect(data.data).toBeNull();
  });
}); 