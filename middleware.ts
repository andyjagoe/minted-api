import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// Match only API routes
const isProtectedApiRoute = createRouteMatcher(['/api/(.*)']);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedApiRoute(req)) {
    try {
      await auth.protect();
    } catch (error: unknown) {
      throw error;
    }
  }
})

// Configure the middleware to only run on specific paths
export const config = {
  matcher: [
    // Apply middleware to API routes and exclude Next.js internals
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
