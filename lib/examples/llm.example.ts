import { LLMService } from '@/lib/services/llm.service';
import { LLMRequest } from '@/lib/types/llm.types';

async function main() {
  // Initialize the LLM service with default config
  const llm = new LLMService();

  // Example 1: Simple question
  const request: LLMRequest = {
    messages: [
      LLMService.createMessage('What is the capital of France?', 'user')
    ]
  };

  const response = await llm.ask(request);
  console.log('Response:', response.content);

  // Example 2: Streaming response
  console.log('Streaming response:');
  for await (const chunk of llm.askStream(request)) {
    process.stdout.write(chunk.content);
    if (chunk.done) {
      console.log('\nStream complete');
    }
  }
}

// Run the example
main().catch(console.error); 