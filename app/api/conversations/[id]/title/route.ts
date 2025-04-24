export const maxDuration = 60

import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { dynamoDB } from '@/lib/utils/dynamodb';
import { SimpleLLMService } from '@/lib/services/simpleLLM.service';
import { LLMRequest } from '@/lib/types/llm.types';

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
    const llm = SimpleLLMService.getInstance();
    const req: LLMRequest = {
      messages: [
        SimpleLLMService.createMessage(
          `Generate a concise, descriptive title (4 words or less) for a conversation that contains this content: "${content}"`,
          'user'
        )
      ],
      userId: user.id,
      conversationId
    };
    const res = await llm.ask(req);
    const title = res.content.trim();

    // Update conversation title
    await dynamoDB.update({
      TableName: tableName,
      Key: {
        pk: `USER#${user.id}`,
        sk: `CHAT#${conversationId}`
      },
      UpdateExpression: 'SET title = :title, lastModified = :now',
      ExpressionAttributeValues: {
        ':title': title,        
        ':now': Date.now()
      }
    });

    return NextResponse.json(
      { data: { title }, error: null },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error generating conversation title:', error);
    return NextResponse.json(
      { data: null, error: 'Failed to generate title' },
      { status: 500 }
    );
  }
} 