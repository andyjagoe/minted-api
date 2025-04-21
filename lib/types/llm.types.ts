import { BaseMessage } from '@langchain/core/messages';

export interface LLMResponse {
  content: string;
  role: 'assistant' | 'user';
}

export interface LLMConfig {
  modelName?: string;
  temperature?: number;
  maxTokens?: number;
  streaming?: boolean;
}

export interface LLMRequest {
  messages: BaseMessage[];
  config?: LLMConfig;
  userId: string;
  conversationId: string;
}

export interface LLMStreamResponse {
  content: string;
  done: boolean;
} 