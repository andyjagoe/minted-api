'use client';

import dynamic from 'next/dynamic';
import 'swagger-ui-react/swagger-ui.css';

const SwaggerUIDynamic = dynamic(
  () => import('swagger-ui-react').then((mod) => mod.default),
  { ssr: false }
);

export default function APIDocs() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">API Documentation</h1>
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
      <footer className="bg-white">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-gray-500 text-sm">
            © {new Date().getFullYear()} Minted API. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
