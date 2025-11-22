/**
 * Subdomain Detection Utility
 * 
 * This utility helps detect and work with subdomains in your Next.js app.
 * When a user accesses "johndoe.helppages.ai", this will extract "johndoe" as the subdomain.
 */

import { headers } from "next/headers";
import { prisma } from "./prisma";

/**
 * Get subdomain from request headers (for Server Components)
 * Returns the subdomain (e.g., "johndoe" from "johndoe.helppages.ai")
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
    const isMainDomain = 
      hostname === "helppages.ai" || 
      hostname === "www.helppages.ai" ||
      parts.length <= 2;
    
    if (isMainDomain) {
      return null;
    }
    
    const subdomain = parts[0];
    
    // Ignore common prefixes
    if (subdomain === "www" || subdomain === "api") {
      return null;
    }
    
    return subdomain || null;
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
    const isMainDomain = 
      hostname === "helppages.ai" || 
      hostname === "www.helppages.ai" ||
      parts.length <= 2;
    
    if (isMainDomain) {
      return null;
    }
    
    const subdomain = parts[0];
    
    if (subdomain === "www" || subdomain === "api") {
      return null;
    }
    
    return subdomain || null;
  } catch (error) {
    console.error("Error getting subdomain from request:", error);
    return null;
  }
}

/**
 * Get user from subdomain
 * Returns the user object if subdomain matches a username, null otherwise
 */
export async function getUserFromSubdomain(): Promise<any | null> {
  try {
    const subdomain = await getSubdomain();
    
    if (!subdomain) {
      return null;
    }
    
    // Find user by username matching subdomain
    const user = await prisma.user.findUnique({
      where: { username: subdomain },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        isPublic: true,
      },
    });
    
    return user;
  } catch (error) {
    console.error("Error getting user from subdomain:", error);
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

/**
 * Get subdomain URL for a username
 * Returns the full URL with subdomain (e.g., "https://johndoe.helppages.ai")
 */
export function getSubdomainUrl(username: string, path: string = ""): string {
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  const baseDomain = process.env.NEXT_PUBLIC_DOMAIN || "helppages.ai";
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${protocol}://${username}.${baseDomain}${cleanPath}`;
}

