/**
 * Subdomain Guard Component
 *
 * This component ensures that users accessing /cms via subdomain
 * are authenticated and the subdomain matches their username.
 *
 * Usage: Wrap CMS pages with this component
 */

import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/lib/auth";
import { getSubdomain, getUserFromSubdomain } from "@/lib/subdomain";

export async function SubdomainGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const subdomain = await getSubdomain();

  // If on main domain, use normal auth check
  if (!subdomain) {
    const user = await getUser();
    if (!user) {
      redirect("/auth/login");
    }
    return <>{children}</>;
  }

  // If on subdomain, check if user is authenticated
  const user = await getUser();
  if (!user) {
    // Redirect to login but preserve subdomain
    const loginUrl = `https://${subdomain}.helppages.ai/auth/login?redirect=/cms`;
    redirect(loginUrl);
  }

  // Check if subdomain matches logged-in user's username
  const profile = await getProfile();
  if (!profile) {
    redirect("/auth/login");
  }

  // If subdomain doesn't match user's username, redirect to their own subdomain
  if (subdomain !== profile.username) {
    const correctUrl = `https://${profile.username}.helppages.ai/cms`;
    redirect(correctUrl);
  }

  // User is authenticated and on their own subdomain - allow access
  return <>{children}</>;
}
