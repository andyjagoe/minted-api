'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileJson } from "lucide-react"
import Link from "next/link"

export default function ApiDocs() {
  const [title, setTitle] = useState('');
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createConversation = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title }),
      });

      const data = await res.json();
      setResponse(data);

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create conversation');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

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
                  <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium mr-2">POST</div>
                  <h3 className="font-mono text-sm">/api/conversations</h3>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">Create a new conversation</p>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <h4 className="text-sm font-semibold mb-1">Request Body</h4>
                  <pre className="bg-muted p-3 rounded-md text-xs overflow-auto">
                    {`{
  "title": "Optional conversation title"
}`}
                  </pre>
                </div>
                <div>
                  <h4 className="text-sm font-semibold mb-1">Response</h4>
                  <pre className="bg-muted p-3 rounded-md text-xs overflow-auto">
                    {`{
  "data": {
    "id": "uuid-v7",
    "pk": "CHAT#uuid-v7",
    "sk": "CHAT#user-id",
    "type": "CHAT",
    "title": "Conversation title",
    "createdAt": 1234567890,
    "lastModified": 1234567890,
    "GSI1PK": "CHAT",
    "GSI1SK": 1234567890
  },
  "error": null
}`}
                  </pre>
                </div>
              </div>
            </div>
          </div>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Create Conversation</CardTitle>
              <CardDescription>Test the conversation creation endpoint</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Title (optional)</label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter conversation title"
                  />
                </div>
                <Button 
                  onClick={createConversation} 
                  disabled={loading}
                >
                  {loading ? 'Creating...' : 'Create Conversation'}
                </Button>
              </div>

              {error && (
                <div className="mt-4 p-4 bg-red-50 text-red-600 rounded">
                  Error: {error}
                </div>
              )}

              {response && (
                <div className="mt-4">
                  <h3 className="font-medium mb-2">Response:</h3>
                  <pre className="bg-gray-50 p-4 rounded overflow-auto">
                    {JSON.stringify(response, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
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
