/**
 * @fileoverview DynamoDB-based checkpoint saver for LangGraph applications
 * 
 * This service provides checkpoint management functionality using DynamoDB as the storage backend.
 * It allows storing and retrieving state checkpoints, which are essential for managing the state
 * of LangGraph workflows.
 * 
 * @example
 * ```typescript
 * // Initialize the checkpoint saver
 * const checkpointSaver = new DynamoDBCheckpointSaver('my-checkpoint-table');
 * 
 * // Save a checkpoint
 * await checkpointSaver.putTuple('checkpoint-1', 
 *   { counter: 42 },
 *   { source: 'input', step: 1, writes: null, parents: {} }
 * );
 * 
 * // Retrieve a checkpoint
 * const [state, metadata] = await checkpointSaver.getTuple('checkpoint-1');
 * ```
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';
import { CheckpointMetadata, CheckpointPendingWrite } from '@langchain/langgraph-checkpoint';

/**
 * Represents a checkpoint stored in DynamoDB
 */
interface Checkpoint {
  /** Unique identifier for the checkpoint */
  id: string;
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
  private client: DynamoDBDocument;
  private tableName: string;

  /**
   * Creates a new instance of DynamoDBCheckpointSaver
   * @param tableName - The name of the DynamoDB table to use for storing checkpoints
   * 
   * @note The DynamoDB table should have 'id' as the partition key
   */
  constructor(tableName: string) {
    const client = new DynamoDBClient({});
    this.client = DynamoDBDocument.from(client);
    this.tableName = tableName;
  }

  /**
   * Retrieves a checkpoint tuple by its ID
   * @param id - The unique identifier of the checkpoint
   * @returns A tuple containing the checkpoint state and metadata, or undefined if not found
   */
  async getTuple(id: string): Promise<[Record<string, unknown>, CheckpointMetadata] | undefined> {
    try {
      const result = await this.client.get({
        TableName: this.tableName,
        Key: { id },
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
   * @param id - The unique identifier for the checkpoint
   * @param state - The state data to store
   * @param metadata - The metadata associated with the checkpoint
   */
  async putTuple(id: string, state: Record<string, unknown>, metadata: CheckpointMetadata): Promise<void> {
    try {
      const checkpoint: Checkpoint = {
        id,
        state,
        metadata,
      };

      await this.client.put({
        TableName: this.tableName,
        Item: checkpoint,
      });
    } catch (error) {
      console.error('Error putting checkpoint:', error);
      throw error;
    }
  }

  /**
   * Stores multiple checkpoint writes in batches
   * @param writes - Array of checkpoint writes to store
   * 
   * @note DynamoDB has a limit of 25 items per batch write operation,
   * so this method automatically splits larger arrays into appropriate batches
   */
  async putWrites(writes: CheckpointPendingWrite[]): Promise<void> {
    try {
      const batchWrites = writes.map((write) => {
        const [taskId, channel, value] = write;
        return {
          PutRequest: {
            Item: {
              id: taskId,
              channel,
              value,
            },
          },
        };
      });

      // DynamoDB batch write has a limit of 25 items
      for (let i = 0; i < batchWrites.length; i += 25) {
        const batch = batchWrites.slice(i, i + 25);
        await this.client.batchWrite({
          RequestItems: {
            [this.tableName]: batch,
          },
        });
      }
    } catch (error) {
      console.error('Error putting writes:', error);
      throw error;
    }
  }

  /**
   * Lists checkpoints with optional pagination
   * @param options - Optional parameters for listing checkpoints
   * @param options.limit - Maximum number of checkpoints to return (default: 50)
   * @param options.startKey - Key to start listing from (for pagination)
   * @returns Object containing the list of checkpoints and the last evaluated key for pagination
   * 
   * @example
   * ```typescript
   * // Get first page of checkpoints
   * const page1 = await checkpointSaver.list({ limit: 10 });
   * 
   * // Get next page using the last key
   * const page2 = await checkpointSaver.list({ 
   *   limit: 10, 
   *   startKey: page1.lastKey 
   * });
   * ```
   */
  async list(options?: { limit?: number; startKey?: string }): Promise<{ checkpoints: Checkpoint[]; lastKey?: string }> {
    try {
      const params: {
        TableName: string;
        Limit: number;
        ExclusiveStartKey?: { id: string };
      } = {
        TableName: this.tableName,
        Limit: options?.limit || 50,
      };

      if (options?.startKey) {
        params.ExclusiveStartKey = { id: options.startKey };
      }

      const result = await this.client.scan(params);

      return {
        checkpoints: (result.Items || []) as Checkpoint[],
        lastKey: result.LastEvaluatedKey?.id,
      };
    } catch (error) {
      console.error('Error listing checkpoints:', error);
      throw error;
    }
  }
} 