import { NextRequest, NextResponse, NextFetchEvent } from 'next/server';
import { clerkMiddleware } from '@clerk/nextjs/server';

export default function middleware(req: NextRequest, event: NextFetchEvent) {
  // Apply Clerk authentication middleware with both the request and event.
  const response = clerkMiddleware()(req, event);

  // Check if response is null or undefined and return a default response if so.
  if (!response) {
    return NextResponse.next();
  }

  // If the response is a promise, handle it asynchronously.
  if (response instanceof Promise) {
    return response.then((res) => {
      if (!res) return NextResponse.next();
      res.headers.set('Content-Length', '10485760'); // 10MB
      return res;
    });
  }

  // Set the header directly if response is not a promise.
  response.headers.set('Content-Length', '10485760'); // 10MB
  return response;
}

// Matcher configuration to ensure Clerk middleware protects the correct routes
export const config = {
  matcher: [
    // Exclude sign-in, sign-up, and static files from Clerk protection
    '/((?!sign-in|sign-up|_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
