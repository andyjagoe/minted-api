import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { dynamoDB } from '@/lib/utils/dynamodb';
import { conversationSchema } from '@/lib/types/conversation.types';
import { v7 as uuidv7 } from 'uuid';
import { ZodError } from 'zod';

export async function POST(request: Request) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json(
        { data: null, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = conversationSchema.parse(body);
    const { title } = validatedData;

    const id = uuidv7();
    const now = Date.now();
    const tableName = process.env.DYNAMODB_TABLE_NAME;

    if (!tableName) {
      return NextResponse.json(
        { data: null, error: 'Table name not configured' },
        { status: 500 }
      );
    }

    const item = {
      pk: `CHAT#${id}`,
      sk: `USER#${user.id}`,
      type: 'CHAT',
      title,
      createdAt: now,
      lastModified: now,
      GSI1PK: 'CHAT',
      GSI1SK: now,
    };

    await dynamoDB.put({
      TableName: tableName,
      Item: item,
      ConditionExpression: 'pk <> :pkVal AND sk <> :skVal',
      ExpressionAttributeValues: {
        ':pkVal': `CHAT#${id}`,
        ':skVal': `USER#${user.id}`,
      },
    });

    return NextResponse.json(
      { 
        data: {
          id,
          ...item,
        },
        error: null 
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating conversation:', error);
    
    // Handle validation errors
    if (error instanceof ZodError) {
      return NextResponse.json(
        { data: null, error: 'Invalid request body' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { data: null, error: 'Failed to create conversation' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json(
        { data: null, error: 'Unauthorized' },
        { status: 401 }
      );
    }

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
      KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK <= :now',
      FilterExpression: 'sk = :sk',
      ExpressionAttributeValues: {
        ':pk': 'CHAT',
        ':now': Date.now(),
        ':sk': `USER#${user.id}`,
      },
      ScanIndexForward: false, // Sort by most recent first
    });

    const conversations = result.Items?.map(item => ({
      id: item.pk.split('#')[1],
      title: item.title,
      createdAt: item.createdAt,
      lastModified: item.lastModified,
    })) || [];

    return NextResponse.json(
      { data: conversations, error: null },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { data: null, error: 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
} 