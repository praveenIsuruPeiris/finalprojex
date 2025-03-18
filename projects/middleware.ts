import { NextRequest, NextResponse, NextFetchEvent } from 'next/server';
import { clerkMiddleware } from '@clerk/nextjs/server';

export default async function middleware(req: NextRequest, event: NextFetchEvent) {
  let response = await clerkMiddleware()(req, event);
  if (!response) {
    response = NextResponse.next();
  }
  response.headers.set('Content-Length', '10485760'); // 10MB
  return response;
}

export const config = {
  matcher: [
    '/((?!sign-in|sign-up|_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
