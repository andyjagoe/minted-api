import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { dynamoDB } from '@/lib/utils/dynamodb';
import { LLMService } from '@/lib/services/llm.service';
import { DynamoDBCheckpointSaver } from '@/lib/services/checkpoint.service';

interface MessageReference {
  messageId: string;
  isFromUser: boolean;
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

    const tableName = process.env.DYNAMODB_TABLE_NAME;
    if (!tableName) {
      return NextResponse.json(
        { data: null, error: 'Table name not configured' },
        { status: 500 }
      );
    }

    // Get latest checkpoint to load messages
    const checkpointSaver = new DynamoDBCheckpointSaver(tableName);
    const checkpoint = await checkpointSaver.getTuple(user.id, conversationId, 'latest');
    const messageRefs = (checkpoint?.[0]?.messageRefs || []) as MessageReference[];

    if (messageRefs.length === 0) {
      return NextResponse.json(
        { data: null, error: 'No messages found in conversation' },
        { status: 400 }
      );
    }

    // Load the first message to generate title
    const firstMessageRef = messageRefs[0];
    const result = await dynamoDB.get({
      TableName: tableName,
      Key: {
        pk: `MSG#${firstMessageRef.messageId}`,
        sk: `MSG#${firstMessageRef.messageId}`
      },
    });

    if (!result.Item) {
      return NextResponse.json(
        { data: null, error: 'Failed to load first message' },
        { status: 500 }
      );
    }

    /*
    const llm = new LLMService();
    const req = {
      messages: [LLMService.createMessage(result.Item.content, 'user')],
      userId: user.id,
      conversationId
    };
    const res = await llm.ask(req);
    */

    // Update conversation title
    await dynamoDB.update({
      TableName: tableName,
      Key: {
        pk: `USER#${user.id}`,
        sk: `CHAT#${conversationId}`
      },
      UpdateExpression: 'SET title = :title, lastModified = :now',
      ExpressionAttributeValues: {
        //':title': res.content,
        ':title': result.Item.content,
        ':now': Date.now()
      }
    });

    return NextResponse.json(
      //{ data: { title: res.content }, error: null },
      { data: { title: result.Item.content }, error: null },
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