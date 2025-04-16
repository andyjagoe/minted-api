import { NextResponse } from "next/server"

// CORS headers for API responses
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

// Helper function to add CORS headers to a response
export function addCorsHeaders(response: NextResponse): NextResponse {
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value)
  })

  return response
}

// Helper function to handle OPTIONS requests for CORS preflight
export function handleCorsOptions() {
  return NextResponse.json({}, { headers: corsHeaders })
}

// Helper function to create a JSON response with CORS headers
export function corsJsonResponse(data: any, options: { status?: number } = {}) {
  return NextResponse.json(data, {
    status: options.status || 200,
    headers: corsHeaders,
  })
}
