# Minted AI API

A modern REST API for AI-powered conversations, built with Next.js 14 and TypeScript.

## Features

- 🤖 AI-powered responses using LangChain
- 🧠 Message history and conversation memory
- 💬 Conversation and message management
- 🔐 Authentication with Clerk
- 📝 Type-safe API with TypeScript
- 🗄️ DynamoDB for scalable storage
- 📚 OpenAPI documentation
- 🧪 Comprehensive test coverage

## Tech Stack

- **Framework**: Next.js 14
- **Language**: TypeScript
- **AI Integration**: LangChain
- **Authentication**: Clerk
- **Database**: DynamoDB
- **Validation**: Zod
- **Testing**: Vitest
- **Documentation**: OpenAPI/Swagger
- **Package Manager**: pnpm

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm
- AWS account with DynamoDB access
- Clerk account
- OpenAI API key

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/minted-api.git
   cd minted-api
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   ```
   Update the following variables in `.env.local`:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
   - `DYNAMODB_TABLE_NAME`
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `AWS_REGION`
   - `OPENAI_API_KEY`
   - `LLM_DEBUG_MODE` (optional, set to 'true' to enable debug logging)

4. Start the development server:
   ```bash
   pnpm dev
   ```

## API Documentation

The API documentation is available at `/api-docs` when running the application locally. It provides detailed information about all available endpoints, request/response formats, and authentication requirements.

### Available Endpoints

#### Conversations

- `GET /api/conversations` - List all conversations
- `POST /api/conversations` - Create a new conversation
- `PUT /api/conversations/:id` - Update a conversation
- `DELETE /api/conversations/:id` - Delete a conversation and its messages
- `POST /api/conversations/:id/title` - Update conversation title

#### Messages

- `GET /api/conversations/:id/messages` - List messages in a conversation (with pagination)
- `POST /api/conversations/:id/messages` - Create a new message and get AI response (with conversation history)
- `PUT /api/conversations/:id/messages/:messageId` - Update a message's content
- `DELETE /api/conversations/:id/messages/:messageId` - Delete a message

### Response Format

All API responses follow this format:
```typescript
{
  data: T | null;    // The response data or null if there's an error
  error: string | null;  // Error message or null if successful
}
```

#### Pagination Response
For paginated endpoints (e.g., messages):
```typescript
{
  data: T[];
  error: null;
  pagination: {
    hasMore: boolean;
    lastEvaluatedKey: string | null;
    limit: number;
  }
}
```

#### Message Creation Response
For message creation, the response includes both the user message and AI response:
```typescript
{
  data: {
    message: {
      id: string;
      content: string;
      isFromUser: true;
      conversationId: string;
      createdAt: number;
      lastModified: number;
    },
    response: {
      id: string;
      content: string;
      isFromUser: false;
      conversationId: string;
      createdAt: number;
      lastModified: number;
    }
  },
  error: null
}
```

## Testing

Run the test suite:
```bash
pnpm test
```

## Error Handling

The API uses standard HTTP status codes:
- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 404: Not Found
- 500: Internal Server Error

