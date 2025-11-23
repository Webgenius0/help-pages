import { NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * POST /api/auth/logout
 * Server-side logout that clears all cookies including HttpOnly ones
 */
export async function POST() {
  try {
    const cookieStore = await cookies();
    
    // Get all cookie names
    const allCookies = cookieStore.getAll();
    const cookieNames = allCookies.map((cookie) => cookie.name);
    
    // Known Next-Auth cookie names
    const nextAuthCookies = [
      "next-auth.session-token",
      "__Secure-next-auth.session-token",
      "next-auth.csrf-token",
      "__Host-next-auth.csrf-token",
      "next-auth.callback-url",
    ];
    
    // Combine all cookie names
    const allCookieNames = new Set([...cookieNames, ...nextAuthCookies]);
    
    // Create response
    const response = NextResponse.json({ success: true });
    
    // Clear all cookies
    allCookieNames.forEach((cookieName) => {
      // Clear with various path and domain combinations
      response.cookies.delete(cookieName);
      
      // Also try to set expired cookies with different paths
      response.cookies.set(cookieName, "", {
        expires: new Date(0),
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      });
      
      response.cookies.set(cookieName, "", {
        expires: new Date(0),
        path: "/",
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      });
    });
    
    return response;
  } catch (error) {
    console.error("Logout API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to clear cookies" },
      { status: 500 }
    );
  }
}

