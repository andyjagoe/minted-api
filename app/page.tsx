import Link from "next/link"
import { ArrowRight, Bot, Code, Shield, Database, MessageSquare, BookOpen } from "lucide-react"

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
        <div className="container flex h-16 items-center">
          <div className="flex items-center gap-2 font-bold">
            <Bot className="h-5 w-5" />
            <span>Minted AI API</span>
          </div>
          <nav className="ml-auto flex gap-4">
            <Link
              href="https://github.com/yourusername/minted-api"
              className="text-sm font-medium hover:underline"
            >
              GitHub
            </Link>
            <Link href="/api-docs" className="text-sm font-medium hover:underline">
              API Docs
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-4xl font-bold mb-4">Minted AI API</h1>
                <p className="text-xl mb-8">A modern REST API for AI-powered conversations</p>
              </div>
              <div className="space-x-4">
                <Link
                  href="/api-docs"
                  className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
                >
                  API Documentation
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>
        <section className="w-full py-12 md:py-24 lg:py-32 bg-muted">
          <div className="container px-4 md:px-6">
            <div className="mx-auto grid max-w-5xl items-center gap-6 lg:grid-cols-2 lg:gap-12">
              <div className="space-y-4">
                <h2 className="text-2xl font-bold mb-4">Features</h2>
                <ul className="grid gap-3">
                  <li className="flex items-center gap-2">
                    <div className="rounded-full bg-primary/10 p-1">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                    <span>AI-powered responses with LangChain</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="rounded-full bg-primary/10 p-1">
                      <Code className="h-4 w-4 text-primary" />
                    </div>
                    <span>Type-safe API with TypeScript</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="rounded-full bg-primary/10 p-1">
                      <MessageSquare className="h-4 w-4 text-primary" />
                    </div>
                    <span>Nested resources for conversations</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="rounded-full bg-primary/10 p-1">
                      <Shield className="h-4 w-4 text-primary" />
                    </div>
                    <span>Authentication with Clerk</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="rounded-full bg-primary/10 p-1">
                      <Database className="h-4 w-4 text-primary" />
                    </div>
                    <span>DynamoDB for scalable storage</span>
                  </li>
                </ul>
              </div>
              <div className="space-y-4">
                <h2 className="text-2xl font-bold mb-4">API Endpoints</h2>
                <div className="space-y-6">
                  <div>
                    <h3 className="flex items-center gap-2 text-lg font-semibold">
                      <MessageSquare className="h-5 w-5" />
                      Conversations
                    </h3>
                    <ul className="mt-2 grid gap-2">
                      <li className="flex items-center gap-2 whitespace-nowrap">
                        <code className="rounded bg-muted px-2 py-1 min-w-[200px]">GET /api/conversations</code>
                        <span className="text-muted-foreground">List conversations</span>
                      </li>
                      <li className="flex items-center gap-2 whitespace-nowrap">
                        <code className="rounded bg-muted px-2 py-1 min-w-[200px]">POST /api/conversations</code>
                        <span className="text-muted-foreground">Create conversation</span>
                      </li>
                      <li className="flex items-center gap-2 whitespace-nowrap">
                        <code className="rounded bg-muted px-2 py-1 min-w-[200px]">PUT /api/conversations/:id</code>
                        <span className="text-muted-foreground">Update conversation</span>
                      </li>
                      <li className="flex items-center gap-2 whitespace-nowrap">
                        <code className="rounded bg-muted px-2 py-1 min-w-[200px]">DELETE /api/conversations/:id</code>
                        <span className="text-muted-foreground">Delete conversation</span>
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="flex items-center gap-2 text-lg font-semibold">
                      <Bot className="h-5 w-5" />
                      Messages
                    </h3>
                    <ul className="mt-2 grid gap-2">
                      <li className="flex items-center gap-2 whitespace-nowrap">
                        <code className="rounded bg-muted px-2 py-1 min-w-[200px]">GET /api/conversations/:id/messages</code>
                        <span className="text-muted-foreground">List messages</span>
                      </li>
                      <li className="flex items-center gap-2 whitespace-nowrap">
                        <code className="rounded bg-muted px-2 py-1 min-w-[200px]">POST /api/conversations/:id/messages</code>
                        <span className="text-muted-foreground">Send message and get AI response</span>
                      </li>
                      <li className="flex items-center gap-2 whitespace-nowrap">
                        <code className="rounded bg-muted px-2 py-1 min-w-[200px]">PUT /api/conversations/:id/messages/:messageId</code>
                        <span className="text-muted-foreground">Update message</span>
                      </li>
                      <li className="flex items-center gap-2 whitespace-nowrap">
                        <code className="rounded bg-muted px-2 py-1 min-w-[200px]">DELETE /api/conversations/:id/messages/:messageId</code>
                        <span className="text-muted-foreground">Delete message</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="w-full border-t py-6">
        <div className="container flex flex-col items-center justify-center gap-4 md:flex-row md:gap-8">
          <p className="text-center text-sm leading-loose text-muted-foreground">
            © 2024 Minted AI API. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
