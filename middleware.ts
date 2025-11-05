import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Redirect old /dashboard routes to /cms
  if (pathname.startsWith("/dashboard")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace("/dashboard", "/cms");
    return NextResponse.redirect(url);
  }

  // Block and redirect from /cms/all-courses to /cms
  if (pathname.includes("/cms/all-courses")) {
    const url = request.nextUrl.clone();
    url.pathname = "/cms";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};

