/**
 * Logout utility function
 *
 * Handles logout with proper redirect URL that preserves subdomain
 */

import { signOut } from "next-auth/react";

/**
 * Sign out the user and redirect to login page on the same domain/subdomain
 */
export function handleLogout() {
  // Get current hostname and protocol to preserve subdomain
  if (typeof window !== "undefined") {
    // Use window.location.origin to get the full origin (protocol + hostname + port)
    const origin = window.location.origin;
    const loginUrl = `${origin}/auth/login`;

    // Sign out without redirect first, then manually redirect to preserve domain
    signOut({
      callbackUrl: loginUrl,
      redirect: false,
    })
      .then(() => {
        // Manually redirect to ensure we stay on the same domain/subdomain
        window.location.href = loginUrl;
      })
      .catch((error) => {
        console.error("Logout error:", error);
        // Fallback: redirect anyway
        window.location.href = loginUrl;
      });
  } else {
    // Fallback for server-side (shouldn't happen, but just in case)
    signOut({ callbackUrl: "/auth/login" });
  }
}
