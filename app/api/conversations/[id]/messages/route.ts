import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { dynamoDB } from '@/lib/utils/dynamodb';
import { messageSchema } from '@/lib/types/message.types';
import { v7 as uuidv7 } from 'uuid';
import { ZodError } from 'zod';

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
      ScanIndexForward: false,
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
    const body = await request.json();
    const validatedData = messageSchema.parse({ ...body, conversationId });
    const { content } = validatedData;

    const tableName = process.env.DYNAMODB_TABLE_NAME;
    if (!tableName) {
      return NextResponse.json(
        { data: null, error: 'Table name not configured' },
        { status: 500 }
      );
    }

    const messageId = uuidv7();
    const now = Date.now();

    const item = {
      pk: `USER#${user.id}`,
      sk: `MSG#${messageId}`,
      type: 'MSG',
      content,
      isFromUser: true,
      conversationId,
      createdAt: now,
      lastModified: now,
      GSI1PK: `USER#${user.id}#CHAT#${conversationId}`,
      GSI1SK: now,
    };

    await dynamoDB.put({
      TableName: tableName,
      Item: item,
      ConditionExpression: 'pk <> :pkVal AND sk <> :skVal',
      ExpressionAttributeValues: {
        ':pkVal': `USER#${user.id}`,
        ':skVal': `MSG#${messageId}`,
      },
    });

    return NextResponse.json(
      { 
        data: {
          id: messageId,
          ...item,
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
      { data: null, error: 'Failed to create message' },
      { status: 500 }
    );
  }
} 