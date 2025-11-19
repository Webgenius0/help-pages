/**
 * Example Middleware for Subdomain Detection
 * 
 * This file shows how to update your middleware.ts to detect and handle subdomains.
 * Copy the relevant parts to your actual middleware.ts file.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get("host") || "";
  
  // Extract subdomain from hostname
  // Examples:
  // - "user1.helppages.ai" → "user1"
  // - "helppages.ai" → "helppages" (main domain, we'll handle this)
  const parts = hostname.split(".");
  const isMainDomain = hostname === "helppages.ai" || 
                       hostname === "www.helppages.ai" ||
                       parts.length <= 2; // helppages.ai has 2 parts
  
  let subdomain: string | null = null;
  
  if (!isMainDomain && parts.length > 2) {
    // Extract subdomain (first part before the domain)
    subdomain = parts[0];
  }
  
  // Handle subdomain requests
  if (subdomain && subdomain !== "www") {
    // Option 1: Add subdomain to request headers for server components
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-subdomain", subdomain);
    requestHeaders.set("x-hostname", hostname);
    
    // Option 2: Rewrite to /u/[subdomain] route for subdomain access
    // Uncomment this if you want subdomains to automatically route to /u/[username]
    /*
    if (pathname === "/" || pathname.startsWith("/docs")) {
      const url = request.nextUrl.clone();
      url.pathname = `/u/${subdomain}${pathname === "/" ? "" : pathname}`;
      return NextResponse.rewrite(url, {
        request: {
          headers: requestHeaders,
        },
      });
    }
    */
    
    // Return with subdomain headers
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }
  
  // Existing redirects (keep your current logic)
  if (pathname.startsWith("/dashboard")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace("/dashboard", "/cms");
    return NextResponse.redirect(url);
  }
  
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

