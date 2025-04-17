import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { dynamoDB } from '@/lib/utils/dynamodb';
import { conversationSchema } from '@/lib/types/conversation.types';
import { ZodError } from 'zod';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params
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

    const tableName = process.env.DYNAMODB_TABLE_NAME;
    if (!tableName) {
      return NextResponse.json(
        { data: null, error: 'Table name not configured' },
        { status: 500 }
      );
    }

    const now = Date.now();
    const item = {
      pk: `CHAT#${id}`,
      sk: `CHAT#${user.id}`,
      type: 'CHAT',
      title,
      lastModified: now,
    };

    await dynamoDB.update({
      TableName: tableName,
      Key: {
        pk: `CHAT#${id}`,
        sk: `CHAT#${user.id}`
      },
      UpdateExpression: 'SET #title = :title, lastModified = :lastModified',
      ExpressionAttributeNames: {
        '#title': 'title',
      },
      ExpressionAttributeValues: {
        ':title': title,
        ':lastModified': now,
        ':pk': `CHAT#${id}`,
        ':sk': `CHAT#${user.id}`
      },
      ConditionExpression: 'pk = :pk AND sk = :sk',
      ReturnValues: 'ALL_NEW',
    });

    return NextResponse.json(
      { 
        data: {
          id: id,
          ...item,
        },
        error: null 
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating conversation:', error);
    
    if (error instanceof ZodError) {
      return NextResponse.json(
        { data: null, error: 'Invalid request body' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { data: null, error: 'Failed to update conversation' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params
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

    await dynamoDB.delete({
      TableName: tableName,
      Key: {
        pk: `CHAT#${id}`,
        sk: `CHAT#${user.id}`,
      },
      ConditionExpression: 'pk = :pk AND sk = :sk',
      ExpressionAttributeValues: {
        ':pk': `CHAT#${id}`,
        ':sk': `CHAT#${user.id}`,
      },
    });

    return NextResponse.json(
      { data: { id: id }, error: null },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting conversation:', error);
    return NextResponse.json(
      { data: null, error: 'Failed to delete conversation' },
      { status: 500 }
    );
  }
} 