export const maxDuration = 60

import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { dynamoDB } from '@/lib/utils/dynamodb';
import { messageUpdateSchema } from '@/lib/types/message.types';
import { ZodError } from 'zod';

export async function PUT(
  request: Request,
  { params }: { params: { id: string; messageId: string } }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json(
        { data: null, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { messageId } = await params;
    const body = await request.json();
    const validatedData = messageUpdateSchema.parse(body);
    const { content } = validatedData;

    const tableName = process.env.DYNAMODB_TABLE_NAME;
    if (!tableName) {
      return NextResponse.json(
        { data: null, error: 'Table name not configured' },
        { status: 500 }
      );
    }

    const now = Date.now();
    const updateResult = await dynamoDB.update({
      TableName: tableName,
      Key: {
        pk: `USER#${user.id}`,
        sk: `MSG#${messageId}`,
      },
      UpdateExpression: 'SET content = :content, lastModified = :lastModified',
      ExpressionAttributeValues: {
        ':content': content,
        ':lastModified': now,
      },
      ReturnValues: 'ALL_NEW'
    });

    return NextResponse.json(
      { 
        data: {
          id: messageId,
          ...updateResult.Attributes,
        },
        error: null 
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating message:', error);
    
    if (error instanceof ZodError) {
      return NextResponse.json(
        { data: null, error: 'Invalid request body' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { data: null, error: 'Failed to update message' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string; messageId: string } }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json(
        { data: null, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { messageId } = await params;
    const tableName = process.env.DYNAMODB_TABLE_NAME;
    if (!tableName) {
      return NextResponse.json(
        { data: null, error: 'Table name not configured' },
        { status: 500 }
      );
    }

    await dynamoDB.delete({
      TableName: tableName,
      Key: {
        pk: `USER#${user.id}`,
        sk: `MSG#${messageId}`,
      },
    });

    return NextResponse.json(
      { 
        data: { id: messageId },
        error: null 
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting message:', error);
    return NextResponse.json(
      { data: null, error: 'Failed to delete message' },
      { status: 500 }
    );
  }
} 