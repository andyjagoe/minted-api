# Minted AI API

A modern REST API for managing conversations and messages, built with Next.js 14 and TypeScript.

## Features

- 🔐 Authentication with Clerk
- 💬 Conversation and message management
- 📝 Type-safe API with TypeScript
- 🗄️ DynamoDB for scalable storage
- 📚 OpenAPI documentation
- 🧪 Comprehensive test coverage

## Tech Stack

- **Framework**: Next.js 14
- **Language**: TypeScript
- **Authentication**: Clerk
- **Database**: DynamoDB
- **Validation**: Zod
- **Testing**: Jest
- **Documentation**: OpenAPI/Swagger

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm
- AWS account with DynamoDB access
- Clerk account

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
- `DELETE /api/conversations/:id` - Delete a conversation

#### Messages

- `GET /api/conversations/:id/messages` - List all messages in a conversation
- `POST /api/conversations/:id/messages` - Create a new message
- `PUT /api/conversations/:id/messages/:messageId` - Update a message
- `DELETE /api/conversations/:id/messages/:messageId` - Delete a message

## Testing

Run the test suite:
```bash
pnpm test
```
