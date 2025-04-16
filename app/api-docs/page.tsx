import { FileJson } from "lucide-react"
import Link from "next/link"

export default function ApiDocs() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
        <div className="container flex h-16 items-center">
          <Link href="/" className="flex items-center gap-2 font-bold">
            <FileJson className="h-5 w-5" />
            <span>Minted Mobile API Docs</span>
          </Link>
          <nav className="ml-auto flex gap-4">
            <Link href="/" className="text-sm font-medium hover:underline">
              Home
            </Link>
            <Link
              href="https://github.com/yourusername/nextjs-rest-api"
              className="text-sm font-medium hover:underline"
            >
              GitHub
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1 container py-12">
        <div className="flex flex-col gap-8 max-w-3xl mx-auto">
          <div>
            <h1 className="text-3xl font-bold mb-4">Minted Mobile API Documentation</h1>
            <p className="text-muted-foreground">
              This documentation provides information about the available REST API endpoints, request/response formats,
              and examples for the Minted Mobile API.
            </p>
          </div>

          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">Base URL</h2>
              <code className="block bg-muted p-3 rounded-md">https://your-api-domain.com/api</code>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-2">Authentication</h2>
              <p className="mb-2">All API requests require an API key to be included in the request headers:</p>
              <code className="block bg-muted p-3 rounded-md">{`Authorization: Bearer YOUR_API_KEY`}</code>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted p-4 border-b">
                <div className="flex items-center">
                  <div className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium mr-2">GET</div>
                  <h3 className="font-mono text-sm">/api/users</h3>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">Get all users</p>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <h4 className="text-sm font-semibold mb-1">Query Parameters</h4>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="font-medium">limit</div>
                    <div>number</div>
                    <div className="text-muted-foreground">Maximum number of users to return (default: 10)</div>
                    <div className="font-medium">page</div>
                    <div>number</div>
                    <div className="text-muted-foreground">Page number for pagination (default: 1)</div>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold mb-1">Response</h4>
                  <pre className="bg-muted p-3 rounded-md text-xs overflow-auto">
                    {`{
  "users": [
    {
      "id": "1",
      "name": "John Doe",
      "email": "john@example.com",
      "createdAt": "2023-01-01T00:00:00Z"
    },
    {
      "id": "2",
      "name": "Jane Smith",
      "email": "jane@example.com",
      "createdAt": "2023-01-02T00:00:00Z"
    }
  ],
  "pagination": {
    "total": 50,
    "page": 1,
    "limit": 10,
    "pages": 5
  }
}`}
                  </pre>
                </div>
              </div>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted p-4 border-b">
                <div className="flex items-center">
                  <div className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium mr-2">GET</div>
                  <h3 className="font-mono text-sm">/api/users/:id</h3>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">Get a user by ID</p>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <h4 className="text-sm font-semibold mb-1">Path Parameters</h4>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="font-medium">id</div>
                    <div>string</div>
                    <div className="text-muted-foreground">User ID</div>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold mb-1">Response</h4>
                  <pre className="bg-muted p-3 rounded-md text-xs overflow-auto">
                    {`{
  "id": "1",
  "name": "John Doe",
  "email": "john@example.com",
  "createdAt": "2023-01-01T00:00:00Z",
  "updatedAt": "2023-01-01T00:00:00Z",
  "profile": {
    "bio": "Software developer",
    "location": "New York",
    "avatar": "https://example.com/avatar.jpg"
  }
}`}
                  </pre>
                </div>
              </div>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted p-4 border-b">
                <div className="flex items-center">
                  <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium mr-2">POST</div>
                  <h3 className="font-mono text-sm">/api/users</h3>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">Create a new user</p>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <h4 className="text-sm font-semibold mb-1">Request Body</h4>
                  <pre className="bg-muted p-3 rounded-md text-xs overflow-auto">
                    {`{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword123"
}`}
                  </pre>
                </div>
                <div>
                  <h4 className="text-sm font-semibold mb-1">Response</h4>
                  <pre className="bg-muted p-3 rounded-md text-xs overflow-auto">
                    {`{
  "id": "1",
  "name": "John Doe",
  "email": "john@example.com",
  "createdAt": "2023-01-01T00:00:00Z"
}`}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <footer className="w-full border-t py-6">
        <div className="container flex flex-col items-center justify-center gap-4 md:flex-row md:gap-8">
          <p className="text-center text-sm leading-loose text-muted-foreground">
            © 2025 Minted Mobile API. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
