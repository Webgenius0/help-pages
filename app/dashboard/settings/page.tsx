import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/lib/auth";
import SettingsClient from "./SettingsClient";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const profile = await getProfile();

  if (!profile) {
    redirect("/auth/login");
  }

  // Allow all authenticated users to access settings page
  // Settings page allows users to edit their own profile info
  // This is safe because:
  // 1. Users can only edit their own profile (API enforces this)
  // 2. Only admins can change roles via User Management
  // 3. Only admins can change email/username

  // No need to restrict access - let all logged-in users manage their profiles
  // If role is missing or invalid, default to allowing access
  const role = profile.role || "admin"; // Default to admin if role is missing

  // If role is explicitly 'viewer', still allow them to edit their profile
  // They just can't do admin-specific actions

  return <SettingsClient profile={profile} />;
}
