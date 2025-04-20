'use client';

import dynamic from 'next/dynamic';
import 'swagger-ui-react/swagger-ui.css';
import { Header } from '@/components/header';

const SwaggerUIDynamic = dynamic(
  () => import('swagger-ui-react').then((mod) => mod.default),
  { ssr: false }
);

export default function APIDocs() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
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
      <footer className="w-full border-t py-4 md:py-6">
        <div className="flex flex-col items-center justify-center gap-4 md:flex-row md:gap-8 px-4 md:px-6">
          <p className="text-center text-xs md:text-sm leading-loose text-muted-foreground">
            © 2025 Minted AI API. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
