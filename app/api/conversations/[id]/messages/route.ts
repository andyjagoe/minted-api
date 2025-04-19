import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { dynamoDB } from '@/lib/utils/dynamodb';
import { messageSchema } from '@/lib/types/message.types';
import { v7 as uuidv7 } from 'uuid';
import { ZodError } from 'zod';
import { LLMService } from '@/lib/services/llm.service';
import { LLMRequest } from '@/lib/types/llm.types';

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

    const result = await dynamoDB.query({
      TableName: tableName,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :GSI1PK',
      ExpressionAttributeValues: {
        ':GSI1PK': `USER#${user.id}#CHAT#${conversationId}`,
      },
      ScanIndexForward: true,
    });

    const messages = result.Items?.map(item => ({
      id: item.sk.split('#')[1],
      content: item.content,
      isFromUser: item.isFromUser,
      conversationId: item.conversationId,
      createdAt: item.createdAt,
      lastModified: item.lastModified,
    })) || [];

    return NextResponse.json(
      { data: messages, error: null },
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
    pk: `USER#${userId}`,
    sk: `MSG#${messageId}`,
    type: 'MSG',
    content,
    isFromUser: isFromUser,
    conversationId,
    createdAt: now,
    lastModified: now,
    GSI1PK: `USER#${userId}#CHAT#${conversationId}`,
    GSI1SK: now,
  };

  await dynamoDB.put({
    TableName: tableName,
    Item: item,
    ConditionExpression: 'pk <> :pkVal AND sk <> :skVal',
    ExpressionAttributeValues: {
      ':pkVal': `USER#${userId}`,
      ':skVal': `MSG#${messageId}`,
    },
  });

  return {
    id: messageId,
    content,
    isFromUser: isFromUser,
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

    const conversationId = await params.id;
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
    const message = await createMessage(user.id, conversationId, content, true, tableName);

    const llm = new LLMService();
    const req: LLMRequest = {
      messages: [
        LLMService.createMessage(content, 'user')
      ]
    };
    const res = await llm.ask(req);

    const response = await createMessage(user.id, conversationId, res.content, false, tableName);

    return NextResponse.json(
      { data: { message, response }, 
        error: null },
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
      { data: null, error: 'Failed to create message' },
      { status: 500 }
    );
  }
} 