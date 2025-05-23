export const maxDuration = 60

import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { dynamoDB } from '@/lib/utils/dynamodb';
import { messageSchema } from '@/lib/types/message.types';
import { v7 as uuidv7 } from 'uuid';
import { ZodError } from 'zod';
import { LLMService } from '@/lib/services/llm.service';
import { LLMRequest } from '@/lib/types/llm.types';
import { DynamoDBCheckpointSaver } from '@/lib/services/checkpoint.service';

interface MessageReference {
  messageId: string;
  isFromUser: boolean;
}

interface DynamoDBMessage {
  pk: string;
  sk: string;
  content: string;
  isFromUser: boolean;
  conversationId: string;
  createdAt: number;
  lastModified: number;
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json(
        { data: null, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: conversationId } = await params;
    const tableName = process.env.DYNAMODB_TABLE_NAME;
    if (!tableName) {
      return NextResponse.json(
        { data: null, error: 'Table name not configured' },
        { status: 500 }
      );
    }

    // Get pagination parameters from query
    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '100'), 100);
    const lastEvaluatedKey = url.searchParams.get('lastEvaluatedKey');

    // Get the latest checkpoint to get message IDs
    const checkpointSaver = new DynamoDBCheckpointSaver(tableName);
    const checkpoint = await checkpointSaver.getTuple(user.id, conversationId, 'latest');
    const messageRefs = (checkpoint?.[0]?.messageRefs || []) as MessageReference[];

    if (messageRefs.length === 0) {
      return NextResponse.json(
        { data: [], error: null },
        { status: 200 }
      );
    }

    // Query messages using GSI1
    const result = await dynamoDB.query({
      TableName: tableName,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: {
        ':pk': `USER#${user.id}#CHAT#${conversationId}`
      },
      ScanIndexForward: true, // Sort by GSI1SK in descending order (newest first)
      Limit: limit,
      ExclusiveStartKey: lastEvaluatedKey ? JSON.parse(decodeURIComponent(lastEvaluatedKey)) : undefined
    });

    // Transform messages to match the desired format
    const messages = (result.Items || [])
      .map(msg => ({
        id: msg.pk.replace('MSG#', ''),
        content: msg.content,
        isFromUser: msg.isFromUser,
        conversationId: msg.conversationId,
        createdAt: msg.createdAt,
        lastModified: msg.lastModified
      }));

    return NextResponse.json(
      { 
        data: messages, 
        error: null,
        pagination: {
          hasMore: !!result.LastEvaluatedKey,
          lastEvaluatedKey: result.LastEvaluatedKey 
            ? encodeURIComponent(JSON.stringify(result.LastEvaluatedKey))
            : null,
          limit
        }
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { data: null, error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

async function createMessage(
  userId: string,
  conversationId: string,
  content: string,
  isFromUser: boolean,
  tableName: string
) {
  const messageId = uuidv7();
  const now = Date.now();

  const item = {
    pk: `MSG#${messageId}`,
    sk: `MSG#${messageId}`,
    type: 'MSG',
    content,
    isFromUser,
    conversationId,
    createdAt: now,
    lastModified: now,
    GSI1PK: `USER#${userId}#CHAT#${conversationId}`,
    GSI1SK: now,
  };

  await dynamoDB.put({
    TableName: tableName,
    Item: item,
  });

  return {
    id: messageId,
    content,
    isFromUser,
    conversationId,
    createdAt: now,
    lastModified: now,
  };
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json(
        { data: null, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: conversationId } = await params;
    if (!conversationId) {
      return NextResponse.json(
        { data: null, error: 'Conversation ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = messageSchema.parse(body);
    const { content } = validatedData;

    const tableName = process.env.DYNAMODB_TABLE_NAME;
    if (!tableName) {
      return NextResponse.json(
        { data: null, error: 'Table name not configured' },
        { status: 500 }
      );
    }

    // Get LLM response
    const llm = LLMService.getInstance();
    const req: LLMRequest = {
      messages: [LLMService.createMessage(content, 'user')],
      userId: user.id,
      conversationId,
      userProfile: {
        name: user.firstName && user.lastName 
          ? `${user.firstName} ${user.lastName}` 
          : user.firstName || user.username || undefined,
        email: user.emailAddresses[0]?.emailAddress
      }
    };
    
    if (process.env.LLM_DEBUG_MODE === 'true') {
      console.log('[Messages API Debug] Getting LLM response...');
    }
    const res = await llm.ask(req);
    if (process.env.LLM_DEBUG_MODE === 'true') {
      console.log('[Messages API Debug] LLM response:', res);
    }

    if (!res) {
      throw new Error('No response received from LLM');
    }

    if (!res.content || res.content.trim() === '') {
      if (process.env.LLM_DEBUG_MODE === 'true') {
        console.error('[Messages API Debug] Empty LLM response:', res);
      }
      throw new Error('Empty response received from LLM');
    }

    // Get the latest checkpoint and load messages in parallel
    const [checkpoint, messages] = await Promise.all([
      // Get checkpoint
      (async () => {
        const checkpointSaver = new DynamoDBCheckpointSaver(tableName);
        const checkpoint = await checkpointSaver.getTuple(user.id, conversationId, 'latest');
        return (checkpoint?.[0]?.messageRefs || []) as MessageReference[];
      })(),
      // Load messages
      (async () => {
        const messageRefs = await (async () => {
          const checkpointSaver = new DynamoDBCheckpointSaver(tableName);
          const checkpoint = await checkpointSaver.getTuple(user.id, conversationId, 'latest');
          return (checkpoint?.[0]?.messageRefs || []) as MessageReference[];
        })();
        const lastTwoRefs = messageRefs.slice(-2);
        return Promise.all(
          lastTwoRefs.map(async (ref: MessageReference) => {
            const result = await dynamoDB.get({
              TableName: tableName,
              Key: {
                pk: `MSG#${ref.messageId}`,
                sk: `MSG#${ref.messageId}`
              },
            });
            return result.Item as DynamoDBMessage | undefined;
          })
        );
      })()
    ]);

    // Transform messages to match the desired format
    const transformedMessages = messages
      .filter((msg): msg is DynamoDBMessage => msg !== undefined)
      .map(msg => ({
        id: msg.pk.replace('MSG#', ''),
        content: msg.content,
        isFromUser: msg.isFromUser,
        conversationId: msg.conversationId,
        createdAt: msg.createdAt,
        lastModified: msg.lastModified
      }));

    // Get the last two messages (user message and assistant response)
    const [message, response] = transformedMessages;

    return NextResponse.json(
      { 
        data: { 
          message,
          response
        }, 
        error: null 
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating message:', error);
    
    if (error instanceof ZodError) {
      return NextResponse.json(
        { data: null, error: 'Invalid request body' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { data: null, error: error instanceof Error ? error.message : 'Failed to create message' },
      { status: 500 }
    );
  }
} 