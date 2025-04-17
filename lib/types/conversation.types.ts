import { z } from 'zod';

export interface Conversation {
  pk: string;
  sk: string;
  type: string;
  title: string;
  createdAt: Date;
  lastModified: Date;
  GSI1PK: string;
  GSI1SK: Date;
}

export const conversationSchema = z.object({
  title: z.string().default('New Chat'),
});

export type CreateConversationInput = z.infer<typeof conversationSchema>; 