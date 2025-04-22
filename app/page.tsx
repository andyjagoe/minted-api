import Link from "next/link"
import { ArrowRight, Bot, Code, Shield, Database, MessageSquare, List, RefreshCw, Brain } from "lucide-react"
import { Header } from "@/components/header"

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <section className="w-full py-8 md:py-12 lg:py-24">
          <div className="flex flex-col items-center justify-center space-y-4 text-center px-4 md:px-6">
            <div className="space-y-2">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">Minted AI API</h1>
              <p className="text-lg md:text-xl mb-6 md:mb-8">A modern REST API for AI-powered conversations</p>
            </div>
            <div className="space-x-4">
              <Link
                href="/api-docs"
                className="inline-flex h-9 md:h-10 items-center justify-center rounded-md bg-primary px-6 md:px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
              >
                API Documentation
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
        <section className="w-full py-8 md:py-12 lg:py-24 bg-muted">
          <div className="px-4 md:px-6">
            <div className="mx-auto grid max-w-5xl items-center gap-6 lg:grid-cols-2 lg:gap-12">
              <div className="space-y-4">
                <h2 className="text-xl md:text-2xl font-bold mb-4">Features</h2>
                <ul className="grid gap-3">
                  <li className="flex items-center gap-2">
                    <div className="rounded-full bg-primary/10 p-1">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm md:text-base">AI-powered responses with LangChain</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="rounded-full bg-primary/10 p-1">
                      <Brain className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm md:text-base">Conversation memory and message history</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="rounded-full bg-primary/10 p-1">
                      <Shield className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm md:text-base">Authentication with Clerk</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="rounded-full bg-primary/10 p-1">
                      <Database className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm md:text-base">DynamoDB for scalable storage</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="rounded-full bg-primary/10 p-1">
                      <RefreshCw className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm md:text-base">Pagination support for messages</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="rounded-full bg-primary/10 p-1">
                      <Code className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm md:text-base">Type-safe API with TypeScript</span>
                  </li>
                </ul>
              </div>
              <div className="space-y-4">
                <h2 className="text-xl md:text-2xl font-bold mb-4">API Endpoints</h2>
                <div className="space-y-6">
                  <div>
                    <h3 className="flex items-center gap-2 text-base md:text-lg font-semibold">
                      <MessageSquare className="h-4 w-4 md:h-5 md:w-5" />
                      Conversations
                    </h3>
                    <ul className="mt-2 grid gap-2">
                      <li className="flex items-center gap-2 whitespace-nowrap">
                        <code className="rounded bg-muted px-2 py-1 text-xs md:text-sm min-w-[150px] md:min-w-[200px]">GET /api/conversations</code>
                        <span className="text-xs md:text-sm text-muted-foreground">List conversations</span>
                      </li>
                      <li className="flex items-center gap-2 whitespace-nowrap">
                        <code className="rounded bg-muted px-2 py-1 text-xs md:text-sm min-w-[150px] md:min-w-[200px]">POST /api/conversations</code>
                        <span className="text-xs md:text-sm text-muted-foreground">Create conversation</span>
                      </li>
                      <li className="flex items-center gap-2 whitespace-nowrap">
                        <code className="rounded bg-muted px-2 py-1 text-xs md:text-sm min-w-[150px] md:min-w-[200px]">PUT /api/conversations/:id</code>
                        <span className="text-xs md:text-sm text-muted-foreground">Update conversation</span>
                      </li>
                      <li className="flex items-center gap-2 whitespace-nowrap">
                        <code className="rounded bg-muted px-2 py-1 text-xs md:text-sm min-w-[150px] md:min-w-[200px]">DELETE /api/conversations/:id</code>
                        <span className="text-xs md:text-sm text-muted-foreground">Delete conversation</span>
                      </li>
                      <li className="flex items-center gap-2 whitespace-nowrap">
                        <code className="rounded bg-muted px-2 py-1 text-xs md:text-sm min-w-[150px] md:min-w-[200px]">POST /api/conversations/:id/title</code>
                        <span className="text-xs md:text-sm text-muted-foreground">Update title</span>
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="flex items-center gap-2 text-base md:text-lg font-semibold">
                      <Bot className="h-4 w-4 md:h-5 md:w-5" />
                      Messages
                    </h3>
                    <ul className="mt-2 grid gap-2">
                      <li className="flex flex-col gap-1">
                        <code className="rounded bg-muted px-2 py-1 text-xs md:text-sm">GET /api/conversations/:id/messages</code>
                        <span className="text-xs md:text-sm text-muted-foreground">List messages (with pagination)</span>
                      </li>
                      <li className="flex flex-col gap-1">
                        <code className="rounded bg-muted px-2 py-1 text-xs md:text-sm">POST /api/conversations/:id/messages</code>
                        <span className="text-xs md:text-sm text-muted-foreground">Send message and get AI response (with conversation history)</span>
                      </li>
                      <li className="flex flex-col gap-1">
                        <code className="rounded bg-muted px-2 py-1 text-xs md:text-sm">PUT /api/conversations/:id/messages/:messageId</code>
                        <span className="text-xs md:text-sm text-muted-foreground">Update message</span>
                      </li>
                      <li className="flex flex-col gap-1">
                        <code className="rounded bg-muted px-2 py-1 text-xs md:text-sm">DELETE /api/conversations/:id/messages/:messageId</code>
                        <span className="text-xs md:text-sm text-muted-foreground">Delete message</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="w-full border-t py-4 md:py-6">
        <div className="flex flex-col items-center justify-center gap-4 md:flex-row md:gap-8 px-4 md:px-6">
          <p className="text-center text-xs md:text-sm leading-loose text-muted-foreground">
            © 2025 Minted AI API. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
