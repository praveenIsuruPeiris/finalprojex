import { NextRequest, NextResponse } from 'next/server';

export const config = {
  matcher: '/api/:path*',
};

export function middleware(req: NextRequest) {
  const headers = new Headers(req.headers);

  // Set a higher body size limit
  headers.set('Content-Length', '10485760'); // Example: 10MB (10 * 1024 * 1024)

  return NextResponse.next({
    headers,
  });
}
