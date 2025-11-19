import { NextResponse } from "next/server";
import { signIn } from "next-auth/react";
import { prisma } from "@/lib/prisma";
import { compare } from "bcryptjs";

// In-memory store for auto-login tokens (in production, use Redis or database)
const autoLoginTokens = new Map<
  string,
  { email: string; password: string; expires: number }
>();

// Clean up expired tokens every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [token, data] of autoLoginTokens.entries()) {
    if (data.expires < now) {
      autoLoginTokens.delete(token);
    }
  }
}, 5 * 60 * 1000);

/**
 * POST /api/auth/auto-login
 * Creates a one-time auto-login token for signup flow
 */
export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Verify credentials
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.password) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const isCorrectPassword = await compare(password, user.password);

    if (!isCorrectPassword) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Generate one-time token (expires in 5 minutes)
    const token =
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);
    const expires = Date.now() + 5 * 60 * 1000; // 5 minutes

    autoLoginTokens.set(token, { email, password, expires });

    return NextResponse.json({ token });
  } catch (error: any) {
    console.error("Auto-login token creation error:", error);
    return NextResponse.json(
      { error: "Failed to create auto-login token" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/auth/auto-login?token=xxx
 * Validates token and returns credentials (for server-side login)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    const tokenData = autoLoginTokens.get(token);

    if (!tokenData) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    if (tokenData.expires < Date.now()) {
      autoLoginTokens.delete(token);
      return NextResponse.json({ error: "Token expired" }, { status: 401 });
    }

    // Delete token after use (one-time use)
    autoLoginTokens.delete(token);

    return NextResponse.json({
      email: tokenData.email,
      password: tokenData.password,
    });
  } catch (error: any) {
    console.error("Auto-login token validation error:", error);
    return NextResponse.json(
      { error: "Failed to validate token" },
      { status: 500 }
    );
  }
}
