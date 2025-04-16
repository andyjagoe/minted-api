import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// This function can be marked `async` if using `await` inside
export function middleware(request: NextRequest) {
  // Get the pathname of the request
  const path = request.nextUrl.pathname

  // Check if the request is for the API
  if (path.startsWith("/api/")) {
    // For API routes, we'll add CORS headers
    // In a real app, you might want to check for authentication here

    // Clone the request headers
    const requestHeaders = new Headers(request.headers)

    // Add a custom header to track API usage
    requestHeaders.set("x-api-version", "1.0")

    // You could also validate API keys here
    // const apiKey = request.headers.get('authorization')?.split(' ')[1]
    // if (!apiKey || !isValidApiKey(apiKey)) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    // Continue the request with modified headers
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  }

  // For non-API routes, just continue the request
  return NextResponse.next()
}

// Configure the middleware to only run on specific paths
export const config = {
  matcher: [
    // Match all API routes
    "/api/:path*",
  ],
}
