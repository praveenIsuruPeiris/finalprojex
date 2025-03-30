// middleware.js

import { clerkMiddleware } from '@clerk/nextjs/server';

export default function middleware(req) {
  // Apply Clerk authentication middleware
  const response = clerkMiddleware()(req);

  // Check if the response is a promise and handle accordingly
  if (response instanceof Promise) {
    return response.then((res) => {
      res.headers.set('Content-Length', '10485760'); // 10MB
      return res;
    });
  }

  // Set custom headers (e.g., Content-Length limit)
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