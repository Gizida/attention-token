import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth-token');
  const { pathname } = request.nextUrl;

  // Protected routes
  
  if (pathname === '/' && token) {
    return NextResponse.redirect(new URL('/dashboard/offers', request.url)); // <-- Change this
  }

  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    if (!token) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    
    // Optional: Verify token on each request
    // const userId = await verifySession(token.value);
    // if (!userId) {
    //   return NextResponse.redirect(new URL('/', request.url));
    // }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*']
};