import Link from "next/link"
import { ArrowRight, Server } from "lucide-react"

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
        <div className="container flex h-16 items-center">
          <div className="flex items-center gap-2 font-bold">
            <Server className="h-5 w-5" />
            <span>Minted Mobile API</span>
          </div>
          <nav className="ml-auto flex gap-4">
            <Link
              href="https://github.com/yourusername/nextjs-rest-api"
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
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                  Minted Mobile API
                </h1>
                <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl">
                  A type-safe REST API built with Next.js and TypeScript, ready for your iOS and web clients.
                </p>
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
                <h2 className="text-2xl font-bold tracking-tighter sm:text-3xl">Features</h2>
                <ul className="grid gap-3">
                  <li className="flex items-center gap-2">
                    <div className="rounded-full bg-primary/10 p-1">
                      <div className="h-2 w-2 rounded-full bg-primary"></div>
                    </div>
                    <span>Type-safe API endpoints with TypeScript</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="rounded-full bg-primary/10 p-1">
                      <div className="h-2 w-2 rounded-full bg-primary"></div>
                    </div>
                    <span>CORS configured for iOS and web clients</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="rounded-full bg-primary/10 p-1">
                      <div className="h-2 w-2 rounded-full bg-primary"></div>
                    </div>
                    <span>Request validation with Zod</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="rounded-full bg-primary/10 p-1">
                      <div className="h-2 w-2 rounded-full bg-primary"></div>
                    </div>
                    <span>Comprehensive error handling</span>
                  </li>
                </ul>
              </div>
              <div className="space-y-4">
                <h2 className="text-2xl font-bold tracking-tighter sm:text-3xl">API Endpoints</h2>
                <ul className="grid gap-3">
                  <li className="flex items-center gap-2">
                    <code className="rounded bg-muted px-2 py-1">GET /api/users</code>
                    <span>Get all users</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <code className="rounded bg-muted px-2 py-1">GET /api/users/:id</code>
                    <span>Get user by ID</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <code className="rounded bg-muted px-2 py-1">POST /api/users</code>
                    <span>Create a new user</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <code className="rounded bg-muted px-2 py-1">PUT /api/users/:id</code>
                    <span>Update a user</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>
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
