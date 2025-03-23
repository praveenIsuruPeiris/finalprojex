import { NextRequest, NextResponse } from 'next/server';
import { clerkMiddleware } from '@clerk/nextjs/server';

export default async function middleware(req: NextRequest) {
  // Use clerkMiddleware without options
  const response = await clerkMiddleware(req);

  // Set additional headers if needed
  if (response) {
    response.headers.set('Content-Length', '10485760'); // 10MB
  }

  return response || NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};