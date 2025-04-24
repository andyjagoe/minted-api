import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DynamoDBCheckpointSaver } from '@/lib/services/checkpoint.service';
import { dynamoDB } from '@/lib/utils/dynamodb';
import { CheckpointMetadata } from '@langchain/langgraph-checkpoint';

// Mock DynamoDB
vi.mock('@/lib/utils/dynamodb', () => ({
  dynamoDB: {
    get: vi.fn(),
    put: vi.fn(),
    query: vi.fn(),
  },
}));

describe('DynamoDBCheckpointSaver', () => {
  const tableName = 'test-table';
  const userId = 'test-user-id';
  const chatId = 'test-chat-id';
  const checkpointId = 'test-checkpoint-id';
  const mockState = { counter: 42 };
  const mockMetadata: CheckpointMetadata = {
    source: 'input',
    step: 1,
    writes: null,
    parents: {},
  };
  let checkpointSaver: DynamoDBCheckpointSaver;

  beforeEach(() => {
    vi.clearAllMocks();
    checkpointSaver = new DynamoDBCheckpointSaver(tableName);
  });

  describe('getTuple', () => {
    it('should return checkpoint data when found', async () => {
      const mockCheckpoint = {
        pk: `USER#${userId}#CHAT#${chatId}`,
        sk: `CHECKPOINT#${checkpointId}`,
        GSI1PK: `USER#${userId}`,
        GSI1SK: Date.now(),
        state: mockState,
        metadata: mockMetadata,
      };

      vi.mocked(dynamoDB.get).mockResolvedValueOnce({
        Item: mockCheckpoint,
      } as any);

      const result = await checkpointSaver.getTuple(userId, chatId, checkpointId);

      expect(result).toEqual([mockState, mockMetadata]);
      expect(dynamoDB.get).toHaveBeenCalledWith({
        TableName: tableName,
        Key: {
          pk: `USER#${userId}#CHAT#${chatId}`,
          sk: `CHECKPOINT#${checkpointId}`,
        },
      });
    });

    it('should return undefined when checkpoint not found', async () => {
      vi.mocked(dynamoDB.get).mockResolvedValueOnce({} as any);

      const result = await checkpointSaver.getTuple(userId, chatId, checkpointId);

      expect(result).toBeUndefined();
    });

    it('should throw error when DynamoDB operation fails', async () => {
      const mockError = new Error('DynamoDB error');
      vi.mocked(dynamoDB.get).mockRejectedValueOnce(mockError);

      await expect(checkpointSaver.getTuple(userId, chatId, checkpointId))
        .rejects
        .toThrow('DynamoDB error');
    });
  });

  describe('putTuple', () => {
    it('should store checkpoint data successfully', async () => {
      vi.mocked(dynamoDB.put).mockResolvedValueOnce({} as any);

      await checkpointSaver.putTuple(userId, chatId, checkpointId, mockState, mockMetadata);

      expect(dynamoDB.put).toHaveBeenCalledWith({
        TableName: tableName,
        Item: {
          pk: `USER#${userId}#CHAT#${chatId}`,
          sk: `CHECKPOINT#${checkpointId}`,
          GSI1PK: `USER#${userId}`,
          GSI1SK: expect.any(Number),
          state: mockState,
          metadata: mockMetadata,
        },
      });
    });

    it('should throw error when DynamoDB operation fails', async () => {
      const mockError = new Error('DynamoDB error');
      vi.mocked(dynamoDB.put).mockRejectedValueOnce(mockError);

      await expect(checkpointSaver.putTuple(userId, chatId, checkpointId, mockState, mockMetadata))
        .rejects
        .toThrow('DynamoDB error');
    });
  });

  describe('list', () => {
    it('should return checkpoints with default limit', async () => {
      const mockCheckpoints = [
        {
          pk: `USER#${userId}#CHAT#${chatId}`,
          sk: `CHECKPOINT#${checkpointId}-1`,
          GSI1PK: `USER#${userId}`,
          GSI1SK: Date.now(),
          state: mockState,
          metadata: mockMetadata,
        },
        {
          pk: `USER#${userId}#CHAT#${chatId}`,
          sk: `CHECKPOINT#${checkpointId}-2`,
          GSI1PK: `USER#${userId}`,
          GSI1SK: Date.now() + 1000,
          state: mockState,
          metadata: mockMetadata,
        },
      ];

      vi.mocked(dynamoDB.query).mockResolvedValueOnce({
        Items: mockCheckpoints,
      } as any);

      const result = await checkpointSaver.list(userId, chatId);

      expect(result.checkpoints).toEqual(mockCheckpoints);
      expect(result.lastKey).toBeUndefined();
      expect(dynamoDB.query).toHaveBeenCalledWith({
        TableName: tableName,
        IndexName: 'GSI1',
        KeyConditionExpression: '#pk = :pk AND begins_with(#sk, :sk)',
        ExpressionAttributeValues: {
          ':pk': `USER#${userId}`,
          ':sk': `USER#${userId}#CHAT#${chatId}`,
        },
        ExpressionAttributeNames: {
          '#pk': 'GSI1PK',
          '#sk': 'pk',
        },
        Limit: 50,
        ScanIndexForward: false,
      });
    });

    it('should return checkpoints with custom limit and start key', async () => {
      const mockCheckpoints = [
        {
          pk: `USER#${userId}#CHAT#${chatId}`,
          sk: `CHECKPOINT#${checkpointId}-1`,
          GSI1PK: `USER#${userId}`,
          GSI1SK: Date.now(),
          state: mockState,
          metadata: mockMetadata,
        },
      ];

      const mockLastKey = { pk: 'last-key' };

      vi.mocked(dynamoDB.query).mockResolvedValueOnce({
        Items: mockCheckpoints,
        LastEvaluatedKey: mockLastKey,
      } as any);

      const result = await checkpointSaver.list(userId, chatId, {
        limit: 10,
        startKey: JSON.stringify(mockLastKey),
      });

      expect(result.checkpoints).toEqual(mockCheckpoints);
      expect(result.lastKey).toBe(JSON.stringify(mockLastKey));
      expect(dynamoDB.query).toHaveBeenCalledWith({
        TableName: tableName,
        IndexName: 'GSI1',
        KeyConditionExpression: '#pk = :pk AND begins_with(#sk, :sk)',
        ExpressionAttributeValues: {
          ':pk': `USER#${userId}`,
          ':sk': `USER#${userId}#CHAT#${chatId}`,
        },
        ExpressionAttributeNames: {
          '#pk': 'GSI1PK',
          '#sk': 'pk',
        },
        Limit: 10,
        ExclusiveStartKey: mockLastKey,
        ScanIndexForward: false,
      });
    });

    it('should throw error when DynamoDB operation fails', async () => {
      const mockError = new Error('DynamoDB error');
      vi.mocked(dynamoDB.query).mockRejectedValueOnce(mockError);

      await expect(checkpointSaver.list(userId, chatId))
        .rejects
        .toThrow('DynamoDB error');
    });
  });
}); 