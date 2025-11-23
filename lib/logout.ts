/**
 * Logout utility function
 *
 * Handles logout with proper redirect URL that preserves subdomain
 * Explicitly clears all cookies to ensure complete logout
 */

import { signOut } from "next-auth/react";

/**
 * Clear all cookies for the current domain and all subdomains
 * This function tries multiple domain/path combinations to ensure all cookies are cleared
 */
function clearAllCookies() {
  if (typeof document !== "undefined" && typeof window !== "undefined") {
    const hostname = window.location.hostname;
    const domainParts = hostname.split(".");

    // Determine base domain (e.g., "example.com" from "sub.example.com")
    let baseDomain: string;
    if (domainParts.length > 2) {
      // It's a subdomain, get the base domain (last 2 parts)
      baseDomain = domainParts.slice(-2).join(".");
    } else {
      // It's already the base domain
      baseDomain = hostname;
    }

    // Get all cookies that are accessible via JavaScript
    const cookies = document.cookie.split(";");
    const cookieNames = new Set<string>();

    // Extract cookie names
    cookies.forEach((cookie) => {
      const eqPos = cookie.indexOf("=");
      const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
      if (name) {
        cookieNames.add(name);
      }
    });

    // Add known Next-Auth cookie names
    const nextAuthCookies = [
      "next-auth.session-token",
      "__Secure-next-auth.session-token",
      "next-auth.csrf-token",
      "__Host-next-auth.csrf-token",
      "next-auth.callback-url",
    ];

    nextAuthCookies.forEach((name) => cookieNames.add(name));

    // Expiration date in the past
    const expireDate = "Thu, 01 Jan 1970 00:00:00 GMT";

    // Paths to try
    const paths = ["/", ""];

    // Domains to try
    const domains = [
      hostname, // Current hostname (e.g., "sub.example.com")
      `.${hostname}`, // With dot prefix (e.g., ".sub.example.com")
      baseDomain, // Base domain (e.g., "example.com")
      `.${baseDomain}`, // Base domain with dot (e.g., ".example.com")
      "", // No domain (current domain)
    ];

    // Clear each cookie with all possible domain/path combinations
    cookieNames.forEach((cookieName) => {
      paths.forEach((path) => {
        domains.forEach((domain) => {
          // Try clearing with domain
          if (domain) {
            document.cookie = `${cookieName}=;expires=${expireDate};path=${path};domain=${domain};`;
            // Also try with Secure and SameSite flags
            document.cookie = `${cookieName}=;expires=${expireDate};path=${path};domain=${domain};Secure;SameSite=None;`;
            document.cookie = `${cookieName}=;expires=${expireDate};path=${path};domain=${domain};Secure;SameSite=Lax;`;
            document.cookie = `${cookieName}=;expires=${expireDate};path=${path};domain=${domain};SameSite=Strict;`;
          } else {
            // No domain specified (current domain only)
            document.cookie = `${cookieName}=;expires=${expireDate};path=${path};`;
            document.cookie = `${cookieName}=;expires=${expireDate};path=${path};Secure;SameSite=None;`;
            document.cookie = `${cookieName}=;expires=${expireDate};path=${path};Secure;SameSite=Lax;`;
            document.cookie = `${cookieName}=;expires=${expireDate};path=${path};SameSite=Strict;`;
          }
        });
      });
    });

    // Also try to clear all cookies by iterating through document.cookie again
    // This catches any cookies that might have been set after our initial read
    const remainingCookies = document.cookie.split(";");
    remainingCookies.forEach((cookie) => {
      const eqPos = cookie.indexOf("=");
      const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
      if (name) {
        paths.forEach((path) => {
          domains.forEach((domain) => {
            if (domain) {
              document.cookie = `${name}=;expires=${expireDate};path=${path};domain=${domain};`;
            } else {
              document.cookie = `${name}=;expires=${expireDate};path=${path};`;
            }
          });
        });
      }
    });
  }
}

/**
 * Sign out the user and redirect to login page on the same domain/subdomain
 * Explicitly clears all cookies to ensure complete logout
 * This includes both client-side and server-side cookie clearing
 */
export async function handleLogout() {
  // Get current hostname and protocol to preserve subdomain
  if (typeof window !== "undefined") {
    // Use window.location.origin to get the full origin (protocol + hostname + port)
    const origin = window.location.origin;
    const loginUrl = `${origin}/auth/login`;

    try {
      // First, call server-side logout API to clear HttpOnly cookies
      try {
        await fetch(`${origin}/api/auth/logout`, {
          method: "POST",
          credentials: "include", // Important: include cookies in the request
        });
      } catch (apiError) {
        // If API call fails, continue with client-side clearing
        console.warn(
          "Server-side logout API failed, continuing with client-side clearing:",
          apiError
        );
      }

      // Sign out without redirect first
      await signOut({
        callbackUrl: loginUrl,
        redirect: false,
      });

      // Explicitly clear all cookies on client side
      clearAllCookies();

      // Clear localStorage and sessionStorage
      if (typeof localStorage !== "undefined") {
        localStorage.clear();
      }
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.clear();
      }

      // Small delay to ensure cookies are cleared before redirect
      setTimeout(() => {
        // Force a hard redirect to ensure cookies are cleared
        window.location.href = loginUrl;
      }, 100);
    } catch (error) {
      console.error("Logout error:", error);
      // Even on error, clear cookies and redirect
      clearAllCookies();

      // Try server-side logout one more time
      try {
        await fetch(`${origin}/api/auth/logout`, {
          method: "POST",
          credentials: "include",
        });
      } catch (apiError) {
        // Ignore if it fails
      }

      window.location.href = loginUrl;
    }
  } else {
    // Fallback for server-side (shouldn't happen, but just in case)
    signOut({ callbackUrl: "/auth/login" });
  }
}
