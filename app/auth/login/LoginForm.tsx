"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/app/components/LoadingSpinner";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Check for auto-login from signup
  const autoLogin = searchParams?.get("autoLogin") === "true";
  const autoLoginToken = searchParams?.get("token") || "";

  // Validate callbackUrl to prevent redirecting to non-existent routes
  // Handle both 'redirect' and 'callbackUrl' parameters (Next-Auth uses both)
  const rawCallbackUrl =
    searchParams?.get("callbackUrl") || searchParams?.get("redirect") || "/cms";
  // Only allow cms routes as callback URLs for security
  const callbackUrl =
    rawCallbackUrl.startsWith("/cms") &&
    !rawCallbackUrl.includes("/cms/all-courses")
      ? rawCallbackUrl
      : "/cms";

  // Check if user is already authenticated when there's a redirect parameter
  useEffect(() => {
    const hasRedirect =
      searchParams?.get("redirect") || searchParams?.get("callbackUrl");

    // If there's no redirect parameter, don't check auth (show login form immediately)
    if (!hasRedirect) {
      setCheckingAuth(false);
      return;
    }

    // If still loading session, show loading state
    if (status === "loading") {
      setCheckingAuth(true);
      return;
    }

    // If authenticated and there's a redirect, redirect them
    if (status === "authenticated" && session) {
      setCheckingAuth(true);

      // Small delay to ensure smooth transition
      setTimeout(() => {
        // Check if we're on a subdomain
        const hostname = window.location.hostname;
        const parts = hostname.split(".");
        const isSubdomain =
          parts.length > 2 && parts[0] !== "www" && parts[0] !== "api";

        if (isSubdomain) {
          // Stay on subdomain
          window.location.href = callbackUrl;
        } else {
          // On main domain - fetch profile to get username
          fetch("/api/auth/profile", {
            credentials: "include",
          })
            .then((res) => res.json())
            .then((data) => {
              const profile = data?.profile;
              if (profile?.username) {
                window.location.href = `https://${profile.username}.helppages.ai${callbackUrl}`;
              } else {
                window.location.href = callbackUrl;
              }
            })
            .catch(() => {
              window.location.href = callbackUrl;
            });
        }
      }, 100);
      return;
    }

    // Not authenticated - show login form
    if (status === "unauthenticated") {
      setCheckingAuth(false);
    }
  }, [status, session, searchParams, callbackUrl]);

  // Auto-login if redirected from signup
  useEffect(() => {
    if (autoLogin && autoLoginToken) {
      handleAutoLogin();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLogin, autoLoginToken]);

  const handleAutoLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get credentials from token
      const tokenResponse = await fetch(
        `/api/auth/auto-login?token=${autoLoginToken}`
      );

      if (!tokenResponse.ok) {
        throw new Error("Invalid or expired token");
      }

      const credentials = await tokenResponse.json();

      // Clear URL parameters for security
      router.replace("/auth/login");

      // Login with credentials
      const result = await signIn("credentials", {
        email: credentials.email,
        password: credentials.password,
        redirect: false,
      });

      if (result?.error) {
        setError("Auto-login failed. Please try logging in manually.");
        setLoading(false);
      } else {
        // Redirect to CMS
        router.push(callbackUrl);
        router.refresh();
      }
    } catch (err: any) {
      setError("Auto-login failed. Please try logging in manually.");
      setLoading(false);
      router.replace("/auth/login");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password");
        setLoading(false);
      } else {
        // Wait a moment for cookies to be set and session to be established
        await new Promise((resolve) => setTimeout(resolve, 300));

        // Verify session is available before redirecting
        try {
          const sessionCheck = await fetch("/api/auth/profile", {
            credentials: "include",
          });

          if (!sessionCheck.ok) {
            // Session not ready yet, wait a bit more and try again
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        } catch (err) {
          console.warn("Session check failed, proceeding with redirect:", err);
        }

        // Check if we're on a subdomain
        const hostname = window.location.hostname;
        const parts = hostname.split(".");
        const isSubdomain =
          parts.length > 2 && parts[0] !== "www" && parts[0] !== "api";

        if (isSubdomain) {
          // Stay on subdomain, use hard redirect to ensure cookies are picked up
          window.location.href = callbackUrl;
        } else {
          // On main domain - fetch user profile to get username and redirect to subdomain
          try {
            const profileResponse = await fetch("/api/auth/profile", {
              credentials: "include",
            });
            if (profileResponse.ok) {
              const data = await profileResponse.json();
              const profile = data?.profile;
              if (profile?.username) {
                // Redirect to user's subdomain
                window.location.href = `https://${profile.username}.helppages.ai${callbackUrl}`;
                return;
              }
            }
          } catch (err) {
            console.error("Error fetching profile:", err);
          }

          // Fallback to regular redirect with hard navigation
          window.location.href = callbackUrl;
        }
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong");
      setLoading(false);
    }
  };

  // Show loading spinner if checking authentication or if there's a redirect parameter
  if (
    checkingAuth ||
    (status === "loading" &&
      (searchParams?.get("redirect") || searchParams?.get("callbackUrl")))
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="lg" text="Redirecting..." fullScreen={false} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#1A7A4A] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Welcome back
          </h1>
          <p className="text-muted-foreground">
            Sign in to your HelpPages account
          </p>
        </div>

        <Card className="w-full">
          <CardContent className="p-8">
            {error && (
              <div className="mb-6 p-4 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-sm font-medium text-foreground"
                >
                  Email address
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="h-12 px-4 text-base"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="password"
                  className="text-sm font-medium text-foreground"
                >
                  Password
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="h-12 px-4 text-base"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-base font-medium"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
                    <span>Signing in...</span>
                  </div>
                ) : (
                  "Sign in"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Link
                  href="/auth/signup"
                  className="text-primary hover:text-primary/80 font-medium transition-colors"
                >
                  Sign up for free
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-muted-foreground">
            By signing in, you agree to our{" "}
            <Link href="/terms" className="text-primary hover:text-primary/80">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              href="/privacy"
              className="text-primary hover:text-primary/80"
            >
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
