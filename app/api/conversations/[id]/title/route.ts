import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { dynamoDB } from '@/lib/utils/dynamodb';
import { LLMService } from '@/lib/services/llm.service';
import { LLMRequest } from '@/lib/types/llm.types';
import { ZodError } from 'zod';

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

    const conversationId = params.id;
    if (!conversationId) {
      return NextResponse.json(
        { data: null, error: 'Conversation ID is required' },
        { status: 400 }
      );
    }

    const tableName = process.env.DYNAMODB_TABLE_NAME;
    if (!tableName) {
      return NextResponse.json(
        { data: null, error: 'Table name not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { content } = body;

    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { data: null, error: 'Content is required and must be a string' },
        { status: 400 }
      );
    }

    // Generate title using AI
    const llm = new LLMService();
    const req: LLMRequest = {
      messages: [
        LLMService.createMessage(
          `Generate a concise, descriptive title (5 words or less) for a conversation that contains this content: "${content}"`,
          'user'
        )
      ]
    };
    const res = await llm.ask(req);
    const title = res.content.trim();

    // Update conversation with new title
    const now = Date.now();
    await dynamoDB.update({
      TableName: tableName,
      Key: {
        pk: `USER#${user.id}`,
        sk: `CHAT#${conversationId}`,
      },
      UpdateExpression: 'SET title = :title, lastModified = :lastModified',
      ExpressionAttributeValues: {
        ':title': title,
        ':lastModified': now,
      },
      ConditionExpression: 'attribute_exists(pk) AND attribute_exists(sk)',
    });

    return NextResponse.json(
      { 
        data: {
          id: conversationId,
          title,
          lastModified: now,
        },
        error: null 
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error generating conversation title:', error);
    
    if (error instanceof ZodError) {
      return NextResponse.json(
        { data: null, error: 'Invalid request body' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { data: null, error: 'Failed to generate conversation title' },
      { status: 500 }
    );
  }
} 