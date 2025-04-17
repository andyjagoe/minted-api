import { 
  GetCommandInput,
  PutCommandInput,
  UpdateCommandInput,
  DeleteCommandInput,
  QueryCommandInput,
  BatchGetCommandInput,
  GetCommandOutput,
  PutCommandOutput,
  UpdateCommandOutput,
  DeleteCommandOutput,
  QueryCommandOutput,
  BatchGetCommandOutput
} from '@aws-sdk/lib-dynamodb';

export interface DynamoDBConfig {
  credentials: {
    accessKeyId: string;
    secretAccessKey: string;
  };
  region: string;
}

export interface DynamoDBClient {
  get: (params: GetCommandInput) => Promise<GetCommandOutput>;
  put: (params: PutCommandInput) => Promise<PutCommandOutput>;
  update: (params: UpdateCommandInput) => Promise<UpdateCommandOutput>;
  delete: (params: DeleteCommandInput) => Promise<DeleteCommandOutput>;
  query: (params: QueryCommandInput) => Promise<QueryCommandOutput>;
  batchGet: (params: BatchGetCommandInput) => Promise<BatchGetCommandOutput>;
} 