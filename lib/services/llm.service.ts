import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, AIMessage, MessageContent, MessageContentComplex } from '@langchain/core/messages';
import { LLMRequest, LLMResponse, LLMConfig, LLMStreamResponse } from '@/lib/types/llm.types';

function getMessageContent(content: MessageContent): string {
  if (typeof content === 'string') {
    return content;
  }
  // Handle complex content (like arrays of text/image content)
  return content.map(item => {
    if (typeof item === 'string') {
      return item;
    }
    if ('text' in item) {
      return item.text;
    }
    return '';
  }).join('');
}

export class LLMService {
  private model: ChatOpenAI;

  constructor(config: LLMConfig = {}) {
    this.model = new ChatOpenAI({
      modelName: config.modelName || 'gpt-3.5-turbo',
      temperature: config.temperature || 0.7,
      maxTokens: config.maxTokens || 1000,
      streaming: config.streaming || false,
    });
  }

  async ask(request: LLMRequest): Promise<LLMResponse> {
    const response = await this.model.invoke(request.messages);
    
    return {
      content: getMessageContent(response.content),
      role: 'assistant',
    };
  }

  async *askStream(request: LLMRequest): AsyncGenerator<LLMStreamResponse> {
    const stream = await this.model.stream(request.messages);
    
    let content = '';
    for await (const chunk of stream) {
      const chunkContent = getMessageContent(chunk.content);
      content += chunkContent;
      yield {
        content: chunkContent,
        done: false,
      };
    }
    
    yield {
      content: '',
      done: true,
    };
  }

  static createMessage(content: string, role: 'user' | 'assistant') {
    return role === 'user' 
      ? new HumanMessage(content)
      : new AIMessage(content);
  }
} 