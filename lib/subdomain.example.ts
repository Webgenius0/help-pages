/**
 * Subdomain Detection Utility
 * 
 * This file shows how to create a utility for detecting subdomains in your Next.js app.
 * Create this file as lib/subdomain.ts and use it in your server components and API routes.
 */

import { headers } from "next/headers";

/**
 * Get subdomain from request headers (for Server Components)
 * Returns the subdomain (e.g., "user1" from "user1.helppages.ai")
 * Returns null if accessing main domain
 */
export async function getSubdomain(): Promise<string | null> {
  try {
    const headersList = await headers();
    const hostname = headersList.get("host") || "";
    const subdomainHeader = headersList.get("x-subdomain");
    
    // If middleware already set the header, use it
    if (subdomainHeader) {
      return subdomainHeader;
    }
    
    // Otherwise, extract from hostname
    const parts = hostname.split(".");
    const isMainDomain = hostname === "helppages.ai" || 
                         hostname === "www.helppages.ai" ||
                         parts.length <= 2;
    
    if (isMainDomain) {
      return null;
    }
    
    return parts[0] || null;
  } catch (error) {
    console.error("Error getting subdomain:", error);
    return null;
  }
}

/**
 * Get subdomain from Request object (for API Routes and Route Handlers)
 */
export async function getSubdomainFromRequest(request: Request): Promise<string | null> {
  try {
    const hostname = request.headers.get("host") || "";
    const subdomainHeader = request.headers.get("x-subdomain");
    
    if (subdomainHeader) {
      return subdomainHeader;
    }
    
    const parts = hostname.split(".");
    const isMainDomain = hostname === "helppages.ai" || 
                         hostname === "www.helppages.ai" ||
                         parts.length <= 2;
    
    if (isMainDomain) {
      return null;
    }
    
    return parts[0] || null;
  } catch (error) {
    console.error("Error getting subdomain from request:", error);
    return null;
  }
}

/**
 * Get full hostname from headers
 */
export async function getHostname(): Promise<string> {
  const headersList = await headers();
  return headersList.get("host") || headersList.get("x-hostname") || "";
}

/**
 * Check if current request is on main domain
 */
export async function isMainDomain(): Promise<boolean> {
  const subdomain = await getSubdomain();
  return subdomain === null;
}

