// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
  matcher: [
    // Exclude sign‑in (and sign‑up) routes from Clerk protection
    '/((?!sign-in|sign-up|_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};

export function middleware(req: NextRequest) {
  const headers = new Headers(req.headers);
  headers.set('Content-Length', '10485760'); // 10MB
  return NextResponse.next({ headers });
}
