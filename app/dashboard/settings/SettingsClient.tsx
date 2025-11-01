"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Upload, User, Lock, Mail } from "lucide-react";

interface Profile {
  id: string;
  email: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  role: string;
  isPublic: boolean;
}

interface SettingsClientProps {
  profile: Profile;
}

export default function SettingsClient({
  profile: initialProfile,
}: SettingsClientProps) {
  const router = useRouter();
  const [profile, setProfile] = useState(initialProfile);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Profile form state
  const [profileData, setProfileData] = useState({
    fullName: initialProfile.fullName || "",
    bio: initialProfile.bio || "",
    avatarUrl: initialProfile.avatarUrl || "",
    isPublic: initialProfile.isPublic,
  });

  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [changingPassword, setChangingPassword] = useState(false);

  const handleSaveProfile = async () => {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/users/${profile.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update profile");
      }

      setProfile(data.user);
      alert("Profile updated successfully!");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setChangingPassword(true);
    setError(null);
    try {
      const response = await fetch(`/api/users/${profile.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: passwordData.newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to change password");
      }

      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      alert("Password changed successfully!");
    } catch (err: any) {
      setError(err.message || "Failed to change password");
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-3">Settings</h1>
          <p className="text-lg text-muted-foreground">
            Manage your profile and account settings
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {/* Profile Settings */}
          <div className="card">
            <div className="card-content">
              <div className="flex items-center space-x-3 mb-6">
                <User className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold text-foreground">
                  Profile Information
                </h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-foreground mb-2"
                  >
                    Email
                  </label>
                  <div className="flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <input
                      id="email"
                      type="email"
                      value={profile.email}
                      disabled
                      className="flex-1 px-4 py-2 border border-border rounded-lg bg-muted text-muted-foreground cursor-not-allowed"
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Email cannot be changed. Contact admin if you need to update
                    it.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="username"
                    className="block text-sm font-medium text-foreground mb-2"
                  >
                    Username
                  </label>
                  <input
                    id="username"
                    type="text"
                    value={profile.username}
                    disabled
                    className="w-full px-4 py-2 border border-border rounded-lg bg-muted text-muted-foreground cursor-not-allowed"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Username cannot be changed. Contact admin if you need to
                    update it.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="fullName"
                    className="block text-sm font-medium text-foreground mb-2"
                  >
                    Full Name
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    value={profileData.fullName}
                    onChange={(e) =>
                      setProfileData({
                        ...profileData,
                        fullName: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label
                    htmlFor="bio"
                    className="block text-sm font-medium text-foreground mb-2"
                  >
                    Bio
                  </label>
                  <textarea
                    id="bio"
                    value={profileData.bio}
                    onChange={(e) =>
                      setProfileData({ ...profileData, bio: e.target.value })
                    }
                    rows={4}
                    className="w-full px-4 py-2 border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    placeholder="Tell us about yourself..."
                  />
                </div>

                <div>
                  <label
                    htmlFor="avatarUrl"
                    className="block text-sm font-medium text-foreground mb-2"
                  >
                    Avatar URL
                  </label>
                  <div className="flex space-x-2">
                    <input
                      id="avatarUrl"
                      type="text"
                      value={profileData.avatarUrl}
                      onChange={(e) =>
                        setProfileData({
                          ...profileData,
                          avatarUrl: e.target.value,
                        })
                      }
                      className="flex-1 px-4 py-2 border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="https://example.com/avatar.png"
                    />
                    <button className="btn-secondary flex items-center space-x-2">
                      <Upload className="w-4 h-4" />
                      <span>Upload</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    id="isPublic"
                    type="checkbox"
                    checked={profileData.isPublic}
                    onChange={(e) =>
                      setProfileData({
                        ...profileData,
                        isPublic: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-primary border-border rounded focus:ring-2 focus:ring-primary"
                  />
                  <label
                    htmlFor="isPublic"
                    className="text-sm font-medium text-foreground cursor-pointer"
                  >
                    Make my profile and documentation public
                  </label>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="btn-primary flex items-center space-x-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>{saving ? "Saving..." : "Save Profile"}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Password Change */}
          <div className="card">
            <div className="card-content">
              <div className="flex items-center space-x-3 mb-6">
                <Lock className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold text-foreground">
                  Change Password
                </h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="newPassword"
                    className="block text-sm font-medium text-foreground mb-2"
                  >
                    New Password
                  </label>
                  <input
                    id="newPassword"
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) =>
                      setPasswordData({
                        ...passwordData,
                        newPassword: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Minimum 6 characters"
                    minLength={6}
                  />
                </div>

                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="block text-sm font-medium text-foreground mb-2"
                  >
                    Confirm New Password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) =>
                      setPasswordData({
                        ...passwordData,
                        confirmPassword: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Confirm your new password"
                  />
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    onClick={handleChangePassword}
                    disabled={
                      changingPassword ||
                      !passwordData.newPassword ||
                      !passwordData.confirmPassword
                    }
                    className="btn-primary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Lock className="w-4 h-4" />
                    <span>
                      {changingPassword ? "Changing..." : "Change Password"}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
