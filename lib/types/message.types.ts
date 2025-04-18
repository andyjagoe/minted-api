import { z } from 'zod';

export interface Message {
  id: string;
  content: string;
  isFromUser: boolean;
  conversationId: string;
  createdAt: number;
  lastModified: number;
}

export const messageSchema = z.object({
  content: z.string().min(1),
  conversationId: z.string().optional(),
});

export const messageUpdateSchema = z.object({
  content: z.string().min(1, 'Message content is required'),
}); 