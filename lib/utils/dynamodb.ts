import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";
import { DynamoDBConfig, DynamoDBClient } from '../types/dynamodb.types';

/**
 * Creates a DynamoDB client with the provided configuration
 * @param config - DynamoDB configuration including credentials and region
 * @returns A configured DynamoDB client with typed methods
 */
export const createDynamoDBClient = (config: DynamoDBConfig): DynamoDBClient => {
  const client = DynamoDBDocument.from(new DynamoDB(config), {
    marshallOptions: {
      convertEmptyValues: true,
      removeUndefinedValues: true,
      convertClassInstanceToMap: true,
    },
    unmarshallOptions: {
      wrapNumbers: false,
    },
  });

  return {
    get: async (params) => {
      try {
        return await client.get(params);
      } catch (error) {
        console.error('DynamoDB get error:', error);
        throw error;
      }
    },
    put: async (params) => {
      try {
        return await client.put(params);
      } catch (error) {
        console.error('DynamoDB put error:', error);
        throw error;
      }
    },
    update: async (params) => {
      try {
        return await client.update(params);
      } catch (error) {
        console.error('DynamoDB update error:', error);
        throw error;
      }
    },
    delete: async (params) => {
      try {
        return await client.delete(params);
      } catch (error) {
        console.error('DynamoDB delete error:', error);
        throw error;
      }
    },
    query: async (params) => {
      try {
        return await client.query(params);
      } catch (error) {
        console.error('DynamoDB query error:', error);
        throw error;
      }
    },
    batchGet: async (params) => {
      try {
        return await client.batchGet(params);
      } catch (error) {
        console.error('DynamoDB batchGet error:', error);
        throw error;
      }
    },
  };
};

// Default client instance using environment variables
const config: DynamoDBConfig = {
  credentials: {
    accessKeyId: process.env.AWS_DYNAMODB_ID as string,
    secretAccessKey: process.env.AWS_DYNAMODB_SECRET as string,
  },
  region: process.env.AWS_DYNAMODB_REGION as string,
};

export const dynamoDB = createDynamoDBClient(config); 