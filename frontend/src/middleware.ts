import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const response = NextResponse.next();
  const route = req.nextUrl.pathname;

  if (route.startsWith('/api/metrics') || route.startsWith('/api/report-metrics') ||
      route.startsWith('/_next') || route.includes('.')) {
    return response;
  }

  // Track SSR request timing via header — picked up by report-metrics
  response.headers.set('x-ssr-route', route);
  response.headers.set('x-ssr-start', Date.now().toString());

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|images/).*)'],
};
