"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Save, Upload, User, Lock, Mail, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

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
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Reset password fields when component mounts or profile changes
  useEffect(() => {
    setPasswordData({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
  }, [initialProfile.id]);

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
      toast.success("Profile updated successfully!");
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
      toast.success("Password changed successfully!");
    } catch (err: any) {
      setError(err.message || "Failed to change password");
    } finally {
      setChangingPassword(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must be less than 5MB");
      return;
    }

    setUploadingAvatar(true);
    setError(null);

    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;

        try {
          // Update profile with base64 image
          const response = await fetch(`/api/users/${profile.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              avatarUrl: base64String,
            }),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || "Failed to upload avatar");
          }

          setProfileData({
            ...profileData,
            avatarUrl: base64String,
          });
          setProfile(data.user);
          toast.success("Avatar uploaded successfully!");
        } catch (err: any) {
          setError(err.message || "Failed to upload avatar");
        } finally {
          setUploadingAvatar(false);
        }
      };

      reader.onerror = () => {
        setError("Failed to read image file");
        setUploadingAvatar(false);
      };

      reader.readAsDataURL(file);
    } catch (err: any) {
      setError(err.message || "Failed to process image");
      setUploadingAvatar(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="px-3 sm:px-4 md:px-6 lg:px-12 py-4 sm:py-6 md:py-8">
        {/* Header Section */}
        <div className="mb-6 sm:mb-8 pb-4 sm:pb-6 border-b border-border/60">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-2 sm:mb-3">
            Settings
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-muted-foreground">
            Manage your profile and account settings
          </p>
        </div>

        {error && (
          <div className="mb-4 sm:mb-6 bg-destructive/10 border-l-4 border-destructive text-destructive px-4 py-3 rounded-r-lg shadow-sm">
            <p className="text-sm sm:text-base font-medium">{error}</p>
          </div>
        )}

        <div className="space-y-6 sm:space-y-8">
          {/* Profile Settings */}
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="bg-muted/30 border-b border-border px-4 sm:px-6 py-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold text-foreground">
                    Profile Information
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                    Update your personal information
                  </p>
                </div>
              </div>
            </div>
            <div className="p-4 sm:p-6">
              <div className="space-y-6">
                {/* Account Information */}
                <div className="space-y-4">
                  <div className="pb-3 border-b border-border/50">
                    <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                      Account Information
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="email"
                        className="block text-xs sm:text-sm font-medium text-foreground mb-2"
                      >
                        Email Address
                      </label>
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <input
                          id="email"
                          type="email"
                          value={profile.email}
                          disabled
                          className="w-full h-11 sm:h-12 pl-10 pr-4 text-sm sm:text-base border border-border rounded-lg bg-muted/50 text-muted-foreground cursor-not-allowed"
                        />
                      </div>
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        Email cannot be changed. Contact admin if you need to
                        update it.
                      </p>
                    </div>

                    <div>
                      <label
                        htmlFor="username"
                        className="block text-xs sm:text-sm font-medium text-foreground mb-2"
                      >
                        Username
                      </label>
                      <input
                        id="username"
                        type="text"
                        value={profile.username}
                        disabled
                        className="w-full h-11 sm:h-12 px-4 text-sm sm:text-base border border-border rounded-lg bg-muted/50 text-muted-foreground cursor-not-allowed"
                      />
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        Username cannot be changed. Contact admin if you need to
                        update it.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Personal Information */}
                <div className="space-y-4">
                  <div className="pb-3 border-b border-border/50">
                    <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                      Personal Information
                    </h3>
                  </div>

                  <div>
                    <label
                      htmlFor="fullName"
                      className="block text-xs sm:text-sm font-medium text-foreground mb-2"
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
                      className="w-full h-11 sm:h-12 px-4 text-sm sm:text-base border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="bio"
                      className="block text-xs sm:text-sm font-medium text-foreground mb-2"
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
                      className="w-full px-4 py-3 text-sm sm:text-base border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors resize-none"
                      placeholder="Tell us about yourself..."
                    />
                  </div>
                </div>

                {/* Avatar Section */}
                <div className="space-y-4">
                  <div className="pb-3 border-b border-border/50">
                    <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                      Profile Picture
                    </h3>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                    <div className="relative w-20 h-20 shrink-0">
                      {profileData.avatarUrl ? (
                        <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-border bg-muted flex items-center justify-center">
                          <img
                            src={profileData.avatarUrl}
                            alt="Avatar"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                              const parent = e.currentTarget.parentElement;
                              if (parent) {
                                parent.innerHTML =
                                  '<div class="w-full h-full flex items-center justify-center"><svg class="w-10 h-10 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg></div>';
                              }
                            }}
                          />
                        </div>
                      ) : (
                        <div className="w-20 h-20 rounded-full bg-muted border-2 border-border flex items-center justify-center">
                          <User className="w-10 h-10 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 w-full sm:w-auto space-y-2">
                      <div className="flex flex-col sm:flex-row gap-2">
                        <label
                          htmlFor="avatarUpload"
                          className="btn-primary inline-flex items-center justify-center space-x-2 px-4 py-2.5 text-sm sm:text-base h-11 sm:h-12 cursor-pointer w-full sm:w-auto whitespace-nowrap"
                        >
                          {uploadingAvatar ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Uploading...</span>
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4" />
                              <span>Upload Image</span>
                            </>
                          )}
                          <input
                            id="avatarUpload"
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarUpload}
                            className="hidden"
                            disabled={uploadingAvatar}
                          />
                        </label>
                        {profileData.avatarUrl && (
                          <button
                            type="button"
                            onClick={() => {
                              setProfileData({
                                ...profileData,
                                avatarUrl: "",
                              });
                            }}
                            className="btn-secondary inline-flex items-center justify-center px-4 py-2.5 text-sm sm:text-base h-11 sm:h-12 w-full sm:w-auto whitespace-nowrap"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Upload a JPG, PNG or GIF image (max 5MB)
                      </p>
                    </div>
                  </div>
                </div>

                {/* Privacy Settings */}
                <div className="space-y-4">
                  <div className="pb-3 border-b border-border/50">
                    <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                      Privacy Settings
                    </h3>
                  </div>

                  <div className="flex items-start space-x-3 p-4 rounded-lg border border-border bg-muted/30">
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
                      className="w-5 h-5 mt-0.5 text-primary border-border rounded focus:ring-2 focus:ring-primary shrink-0 cursor-pointer"
                    />
                    <div className="flex-1">
                      <label
                        htmlFor="isPublic"
                        className="text-sm font-medium text-foreground cursor-pointer block"
                      >
                        Make my profile and documentation public
                      </label>
                      <p className="text-xs text-muted-foreground mt-1">
                        When enabled, your profile and documentation will be
                        visible to all users
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Button */}
                <div className="flex justify-end pt-4 border-t border-border">
                  <button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="btn-primary inline-flex items-center justify-center space-x-2 px-6 py-2.5 text-sm sm:text-base font-medium shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Save Changes</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Password Change */}
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="bg-muted/30 border-b border-border px-4 sm:px-6 py-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Lock className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold text-foreground">
                    Security
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                    Change your password to keep your account secure
                  </p>
                </div>
              </div>
            </div>
            <div className="p-4 sm:p-6">
              <div className="space-y-5">
                <div>
                  <label
                    htmlFor="newPassword"
                    className="block text-xs sm:text-sm font-medium text-foreground mb-2"
                  >
                    New Password
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
                      <Lock className="w-4 h-4 text-muted-foreground" />
                    </div>
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
                      autoComplete="new-password"
                      className="w-full h-11 sm:h-12 pl-10 pr-4 text-sm sm:text-base border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                      placeholder="Enter new password (min. 6 characters)"
                      minLength={6}
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Password must be at least 6 characters long
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="block text-xs sm:text-sm font-medium text-foreground mb-2"
                  >
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
                      <Lock className="w-4 h-4 text-muted-foreground" />
                    </div>
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
                      autoComplete="new-password"
                      className="w-full h-11 sm:h-12 pl-10 pr-4 text-sm sm:text-base border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                      placeholder="Confirm your new password"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-border">
                  <button
                    onClick={handleChangePassword}
                    disabled={
                      changingPassword ||
                      !passwordData.newPassword ||
                      !passwordData.confirmPassword
                    }
                    className="btn-primary inline-flex items-center justify-center space-x-2 px-6 py-2.5 text-sm sm:text-base font-medium shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {changingPassword ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Changing...</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        <span>Update Password</span>
                      </>
                    )}
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
