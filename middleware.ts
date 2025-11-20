import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get("host") || "";
  
  // Extract subdomain from hostname
  // Examples:
  // - "johndoe.helppages.ai" → subdomain = "johndoe"
  // - "helppages.ai" → subdomain = null (main domain)
  // - "www.helppages.ai" → subdomain = null (www is ignored)
  const parts = hostname.split(".");
  const isMainDomain = 
    hostname === "helppages.ai" || 
    hostname === "www.helppages.ai" ||
    parts.length <= 2; // helppages.ai has 2 parts
  
  let subdomain: string | null = null;
  
  if (!isMainDomain && parts.length > 2) {
    // Extract subdomain (first part before the domain)
    subdomain = parts[0];
    
    // Ignore common prefixes
    if (subdomain === "www" || subdomain === "api") {
      subdomain = null;
    }
  }
  
  // Handle subdomain requests
  if (subdomain) {
    // Add subdomain to headers for server components and API routes
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-subdomain", subdomain);
    requestHeaders.set("x-hostname", hostname);
    
    // Root path on subdomain should show home page, not CMS
    // Users can access CMS via: username.helppages.ai/cms
    // For all paths on subdomain, pass through with subdomain header
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }
  
  // Main domain behavior - redirect authenticated users to their subdomain
  // Check if user is authenticated by checking for session cookie
  const sessionToken = request.cookies.get("next-auth.session-token") || 
                       request.cookies.get("__Secure-next-auth.session-token");
  
  if (isMainDomain && sessionToken && (pathname === "/" || pathname === "")) {
    // User is logged in on main domain root - redirect will be handled by page component
    // which has access to user profile data
  }
  
  if (isMainDomain && pathname.startsWith("/cms")) {
    if (sessionToken) {
      // User is logged in, but we need to get their username to redirect
      // We'll let the CMS page handle this redirect since it has access to user data
      // For now, just pass through and let the page component redirect
    }
  }

  // Main domain behavior - existing redirects
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

