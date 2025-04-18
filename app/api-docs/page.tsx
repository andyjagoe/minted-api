'use client';

import dynamic from 'next/dynamic';
import 'swagger-ui-react/swagger-ui.css';
import Link from 'next/link';
import { Server } from 'lucide-react';

const SwaggerUIDynamic = dynamic(
  () => import('swagger-ui-react').then((mod) => mod.default),
  { ssr: false }
);

export default function APIDocs() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
        <div className="container flex h-16 items-center">
          <div className="flex items-center gap-2 font-bold">
            <Link href="/" className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              <span>Minted AI API</span>
            </Link>
          </div>
          <nav className="ml-auto flex gap-4">
            <Link
              href="https://github.com/yourusername/nextjs-rest-api"
              className="text-sm font-medium hover:underline"
            >
              GitHub
            </Link>
            <Link href="/" className="text-sm font-medium hover:underline">
              Home
            </Link>
          </nav>
        </div>
      </header>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <SwaggerUIDynamic
            url="/openapi.json"
            docExpansion="list"
            defaultModelsExpandDepth={-1}
            displayOperationId={false}
            persistAuthorization={true}
          />
        </div>
      </main>
      <footer className="w-full border-t py-6">
        <div className="container flex flex-col items-center justify-center gap-4 md:flex-row md:gap-8">
          <p className="text-center text-sm leading-loose text-muted-foreground">
            © 2025 Minted AI API. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
