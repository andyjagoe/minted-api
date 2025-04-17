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
      sk: `CHAT#${user.id}`,
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
        ':skVal': `CHAT#${user.id}`,
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