/**
 * @fileoverview DynamoDB-based checkpoint saver for LangGraph applications
 * 
 * This service provides checkpoint management functionality using DynamoDB as the storage backend.
 * It allows storing and retrieving state checkpoints, which are essential for managing the state
 * of LangGraph workflows.
 * 
 * @note The DynamoDB table uses the following structure:
 * - Partition key: 'pk' (String)
 * - Sort key: 'sk' (String)
 * - GSI1: 'GSI1PK' (String) as partition key and 'GSI1SK' (Number) as sort key
 * 
 * Checkpoints are scoped by user and chat:
 * - pk: USER#${userId}#CHAT#${chatId}
 * - sk: CHECKPOINT#${checkpointId}
 * - GSI1PK: USER#${userId}
 * - GSI1SK: timestamp
 * 
 * @example
 * ```typescript
 * // Initialize the checkpoint saver
 * const checkpointSaver = new DynamoDBCheckpointSaver('minted-main-dev');
 * 
 * // Save a checkpoint
 * await checkpointSaver.putTuple('user123', 'chat456', 'checkpoint-1', 
 *   { counter: 42 },
 *   { source: 'input', step: 1, writes: null, parents: {} }
 * );
 * 
 * // Retrieve a checkpoint
 * const [state, metadata] = await checkpointSaver.getTuple('user123', 'chat456', 'checkpoint-1');
 * ```
 */

import { CheckpointMetadata } from '@langchain/langgraph-checkpoint';
import { dynamoDB } from '../utils/dynamodb';

/**
 * Represents a checkpoint stored in DynamoDB
 */
interface Checkpoint {
  /** Partition key (USER#${userId}#CHAT#${chatId}) */
  pk: string;
  /** Sort key (CHECKPOINT#${checkpointId}) */
  sk: string;
  /** GSI1 partition key (USER#${userId}) */
  GSI1PK: string;
  /** GSI1 sort key (timestamp) */
  GSI1SK: number;
  /** Metadata containing information about the checkpoint's source, step, writes, and parents */
  metadata: CheckpointMetadata;
  /** The actual state data stored in the checkpoint */
  state: Record<string, unknown>;
}

/**
 * A DynamoDB-based implementation of checkpoint storage for LangGraph applications.
 * This class provides methods to store and retrieve checkpoints, which are essential
 * for maintaining state in LangGraph workflows.
 */
export class DynamoDBCheckpointSaver {
  private tableName: string;

  /**
   * Creates a new instance of DynamoDBCheckpointSaver
   * @param tableName - The name of the DynamoDB table to use for storing checkpoints
   * 
   * @note The DynamoDB table uses:
   * - Partition key: 'pk' (String)
   * - Sort key: 'sk' (String)
   * - GSI1: 'GSI1PK' (String) as partition key and 'GSI1SK' (Number) as sort key
   */
  constructor(tableName: string) {
    this.tableName = tableName;
  }

  /**
   * Retrieves a checkpoint tuple by its ID
   * @param userId - The ID of the user who owns the checkpoint
   * @param chatId - The ID of the chat the checkpoint belongs to
   * @param checkpointId - The unique identifier of the checkpoint
   * @returns A tuple containing the checkpoint state and metadata, or undefined if not found
   */
  async getTuple(userId: string, chatId: string, checkpointId: string): Promise<[Record<string, unknown>, CheckpointMetadata] | undefined> {
    try {
      const result = await dynamoDB.get({
        TableName: this.tableName,
        Key: {
          pk: `USER#${userId}#CHAT#${chatId}`,
          sk: `CHECKPOINT#${checkpointId}`,
        },
      });

      if (!result.Item) {
        return undefined;
      }

      const checkpoint = result.Item as Checkpoint;
      return [checkpoint.state, checkpoint.metadata];
    } catch (error) {
      console.error('Error getting checkpoint:', error);
      throw error;
    }
  }

  /**
   * Stores a new checkpoint tuple
   * @param userId - The ID of the user who owns the checkpoint
   * @param chatId - The ID of the chat the checkpoint belongs to
   * @param checkpointId - The unique identifier for the checkpoint
   * @param state - The state data to store
   * @param metadata - The metadata associated with the checkpoint
   */
  async putTuple(
    userId: string,
    chatId: string,
    checkpointId: string,
    state: Record<string, unknown>,
    metadata: CheckpointMetadata
  ): Promise<void> {
    try {
      const now = Date.now();
      const checkpoint: Checkpoint = {
        pk: `USER#${userId}#CHAT#${chatId}`,
        sk: `CHECKPOINT#${checkpointId}`,
        GSI1PK: `USER#${userId}`,
        GSI1SK: now,
        state,
        metadata,
      };

      await dynamoDB.put({
        TableName: this.tableName,
        Item: checkpoint,
      });
    } catch (error) {
      console.error('Error putting checkpoint:', error);
      throw error;
    }
  }

  /**
   * Lists checkpoints for a specific user and chat
   * @param userId - The ID of the user whose checkpoints to list
   * @param chatId - The ID of the chat whose checkpoints to list
   * @param options - Optional parameters for listing checkpoints
   * @param options.limit - Maximum number of checkpoints to return (default: 50)
   * @param options.startKey - Key to start listing from (for pagination)
   * @returns Object containing the list of checkpoints and the last evaluated key for pagination
   * 
   * @example
   * ```typescript
   * // Get first page of checkpoints
   * const page1 = await checkpointSaver.list('user123', 'chat456', { limit: 10 });
   * 
   * // Get next page using the last key
   * const page2 = await checkpointSaver.list('user123', 'chat456', { 
   *   limit: 10, 
   *   startKey: page1.lastKey 
   * });
   * ```
   */
  async list(
    userId: string,
    chatId: string,
    options?: { 
      limit?: number; 
      startKey?: string;
    }
  ): Promise<{ checkpoints: Checkpoint[]; lastKey?: string }> {
    try {
      const params: {
        TableName: string;
        IndexName: string;
        KeyConditionExpression: string;
        ExpressionAttributeValues: Record<string, any>;
        ExpressionAttributeNames: Record<string, string>;
        Limit: number;
        ExclusiveStartKey?: Record<string, any>;
        ScanIndexForward: boolean;
      } = {
        TableName: this.tableName,
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
        Limit: options?.limit || 50,
        ScanIndexForward: false, // Most recent first
      };

      if (options?.startKey) {
        params.ExclusiveStartKey = JSON.parse(options.startKey);
      }

      const result = await dynamoDB.query(params);

      return {
        checkpoints: (result.Items || []) as Checkpoint[],
        lastKey: result.LastEvaluatedKey ? JSON.stringify(result.LastEvaluatedKey) : undefined,
      };
    } catch (error) {
      console.error('Error listing checkpoints:', error);
      throw error;
    }
  }
} 