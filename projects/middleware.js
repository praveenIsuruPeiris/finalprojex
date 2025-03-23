import { NextResponse } from 'next/server';
import { clerkMiddleware } from '@clerk/nextjs/edge-middleware'; // Note the edge-specific import

export default clerkMiddleware((auth, req) => {
  if (req.nextUrl.pathname === '/create-project') {
    auth().protect();
  }
  
  const response = NextResponse.next();
  response.headers.set('Content-Length', '10485760');
  return response;
}, {
  debug: process.env.NODE_ENV === 'development'
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};