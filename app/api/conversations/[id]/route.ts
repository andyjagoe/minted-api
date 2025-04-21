import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { dynamoDB } from '@/lib/utils/dynamodb';
import { conversationSchema } from '@/lib/types/conversation.types';
import { ZodError } from 'zod';
import { DynamoDBCheckpointSaver } from '@/lib/services/checkpoint.service';

export async function PUT(
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

    const { id } = await params;
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
    const updateResult = await dynamoDB.update({
      TableName: tableName,
      Key: {
        pk: `USER#${user.id}`,
        sk: `CHAT#${id}`,
      },
      UpdateExpression: 'SET title = :title, lastModified = :lastModified',
      ExpressionAttributeValues: {
        ':title': title,
        ':lastModified': now,
      },
      ReturnValues: 'ALL_NEW'
    });

    return NextResponse.json(
      { 
        data: {
          id,
          ...updateResult.Attributes,
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
    const user = await currentUser();
    if (!user) {
      return NextResponse.json(
        { data: null, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const tableName = process.env.DYNAMODB_TABLE_NAME;
    if (!tableName) {
      return NextResponse.json(
        { data: null, error: 'Table name not configured' },
        { status: 500 }
      );
    }

    // First, get all messages for this conversation
    const messagesResult = await dynamoDB.query({
      TableName: tableName,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :GSI1PK',
      ExpressionAttributeValues: {
        ':GSI1PK': `USER#${user.id}#CHAT#${id}`,
      },
    });

    // Delete all messages
    if (messagesResult.Items && messagesResult.Items.length > 0) {
      await Promise.all(
        messagesResult.Items.map((message) =>
          dynamoDB.delete({
            TableName: tableName,
            Key: {
              pk: message.pk,
              sk: message.sk,
            },
          })
        )
      );
    }

    // Delete the conversation
    await dynamoDB.delete({
      TableName: tableName,
      Key: {
        pk: `USER#${user.id}`,
        sk: `CHAT#${id}`,
      },
    });

    // Delete the checkpoint
    const checkpointSaver = new DynamoDBCheckpointSaver(tableName);
    await dynamoDB.delete({
      TableName: tableName,
      Key: {
        pk: `USER#${user.id}#CHAT#${id}`,
        sk: 'CHECKPOINT#latest',
      },
    });

    return NextResponse.json(
      { 
        data: { id },
        error: null 
      },
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