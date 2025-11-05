"use client";

import { useState, useEffect } from "react";
import {
  Users,
  Plus,
  Edit,
  Trash2,
  Mail,
  User as UserIcon,
  Shield,
  Eye,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";
import { ConfirmModal } from "@/app/components/ConfirmModal";
import { LoadingSpinner } from "@/app/components/LoadingSpinner";

interface User {
  id: string;
  email: string;
  username: string;
  fullName: string | null;
  role: string;
  isPublic: boolean;
  createdAt: string;
  _count: {
    pages: number;
    docs: number;
  };
}

export default function UsersManagementClient() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Confirm modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: "default" | "danger";
    isLoading?: boolean;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
    variant: "default",
    isLoading: false,
  });

  // Form state
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    username: "",
    fullName: "",
    role: "editor",
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/users");

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Failed to load users (${response.status})`
        );
      }

      const data = await response.json();
      setUsers(data.users || []);
    } catch (err: any) {
      console.error("Error loading users:", err);
      setError(err.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      setCreating(true);
      // Allow React to re-render with loading state
      await new Promise((resolve) => setTimeout(resolve, 50));

      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create user");
      }

      // Reset form and reload
      setFormData({
        email: "",
        password: "",
        username: "",
        fullName: "",
        role: "editor",
      });
      setShowAddForm(false);
      await loadUsers();
      toast.success("User created successfully!");
    } catch (err: any) {
      setError(err.message || "Failed to create user");
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Change User Role",
      message: `Are you sure you want to change this user's role to ${newRole}?`,
      variant: "default",
      isLoading: false,
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isLoading: true }));
        try {
          const response = await fetch(`/api/users/${userId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ role: newRole }),
          });

          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || "Failed to update role");
          }

          await loadUsers();
          toast.success("User role updated successfully!");
          setConfirmModal({
            isOpen: false,
            title: "",
            message: "",
            onConfirm: () => {},
          });
        } catch (err: any) {
          toast.error(err.message || "Failed to update role");
          setConfirmModal((prev) => ({ ...prev, isLoading: false }));
        }
      },
    });
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete User",
      message: `Are you sure you want to delete user ${username}? This action cannot be undone.`,
      variant: "danger",
      isLoading: false,
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isLoading: true }));
        try {
          const response = await fetch(`/api/users/${userId}`, {
            method: "DELETE",
          });

          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || "Failed to delete user");
          }

          await loadUsers();
          toast.success("User deleted successfully!");
          setConfirmModal({
            isOpen: false,
            title: "",
            message: "",
            onConfirm: () => {},
          });
        } catch (err: any) {
          toast.error(err.message || "Failed to delete user");
          setConfirmModal((prev) => ({ ...prev, isLoading: false }));
        }
      },
    });
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Shield className="w-4 h-4 text-red-500" />;
      case "editor":
        return <Edit className="w-4 h-4 text-blue-500" />;
      default:
        return <Eye className="w-4 h-4 text-gray-500" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      case "editor":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      default:
        return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  if (loading) {
    return <LoadingSpinner fullScreen text="Loading users..." />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="px-3 sm:px-4 md:px-6 lg:px-12 py-4 sm:py-6 md:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-2 sm:mb-3">
                User Management
              </h1>
              <p className="text-sm sm:text-base md:text-lg text-muted-foreground">
                Manage users and assign editor roles
              </p>
            </div>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="btn-primary inline-flex items-center justify-center space-x-2 px-4 py-2 sm:px-6 sm:py-2.5 text-sm sm:text-base w-full sm:w-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Add Editor</span>
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 sm:mb-6 bg-destructive/10 border border-destructive/20 text-destructive px-3 sm:px-4 py-2 sm:py-3 rounded-lg text-sm sm:text-base">
            {error}
          </div>
        )}

        {/* Add User Form */}
        {showAddForm && (
          <div className="mb-6 sm:mb-8 card">
            <div className="card-content p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-4 sm:mb-6">
                Add New Editor
              </h2>
              <form onSubmit={handleAddUser} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="email"
                      className="block text-xs sm:text-sm font-medium text-foreground mb-2"
                    >
                      Email <span className="text-destructive">*</span>
                    </label>
                    <input
                      id="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      className="w-full h-10 sm:h-12 px-3 sm:px-4 text-sm sm:text-base border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="editor@example.com"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="username"
                      className="block text-xs sm:text-sm font-medium text-foreground mb-2"
                    >
                      Username <span className="text-destructive">*</span>
                    </label>
                    <input
                      id="username"
                      type="text"
                      required
                      value={formData.username}
                      onChange={(e) =>
                        setFormData({ ...formData, username: e.target.value })
                      }
                      className="w-full h-10 sm:h-12 px-3 sm:px-4 text-sm sm:text-base border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="editor_username"
                      pattern="[a-zA-Z0-9_-]+"
                      minLength={3}
                      maxLength={30}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="password"
                      className="block text-xs sm:text-sm font-medium text-foreground mb-2"
                    >
                      Password <span className="text-destructive">*</span>
                    </label>
                    <input
                      id="password"
                      type="password"
                      required
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      className="w-full h-10 sm:h-12 px-3 sm:px-4 text-sm sm:text-base border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Minimum 6 characters"
                      minLength={6}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="role"
                      className="block text-xs sm:text-sm font-medium text-foreground mb-2"
                    >
                      Role
                    </label>
                    <select
                      id="role"
                      value={formData.role}
                      onChange={(e) =>
                        setFormData({ ...formData, role: e.target.value })
                      }
                      className="w-full h-10 sm:h-12 px-3 sm:px-4 text-sm sm:text-base border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="editor">Editor</option>
                      <option value="admin">Admin</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label
                      htmlFor="fullName"
                      className="block text-xs sm:text-sm font-medium text-foreground mb-2"
                    >
                      Full Name (Optional)
                    </label>
                    <input
                      id="fullName"
                      type="text"
                      value={formData.fullName}
                      onChange={(e) =>
                        setFormData({ ...formData, fullName: e.target.value })
                      }
                      className="w-full h-10 sm:h-12 px-3 sm:px-4 text-sm sm:text-base border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="John Doe"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 sm:space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false);
                      setFormData({
                        email: "",
                        password: "",
                        username: "",
                        fullName: "",
                        role: "editor",
                      });
                    }}
                    className="btn-secondary w-full sm:w-auto px-4 py-2 text-sm sm:text-base"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary inline-flex items-center justify-center w-full sm:w-auto px-4 py-2 text-sm sm:text-base"
                    disabled={creating}
                  >
                    {creating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create User"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Users List */}
        <div className="card">
          <div className="card-content p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-4 sm:mb-6">
              All Users
            </h2>

            {users.length === 0 ? (
              <div className="text-center py-8 sm:py-12 text-muted-foreground">
                <Users className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 opacity-50" />
                <p className="text-sm sm:text-base">No users found</p>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 text-sm font-medium text-foreground">
                          User
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-foreground">
                          Role
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-foreground">
                          Stats
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-foreground">
                          Created
                        </th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-foreground">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr
                          key={user.id}
                          className="border-b border-border hover:bg-muted/50"
                        >
                          <td className="py-4 px-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                                <UserIcon className="w-5 h-5 text-primary" />
                              </div>
                              <div className="min-w-0">
                                <div className="font-medium text-foreground truncate">
                                  {user.fullName || user.username}
                                </div>
                                <div className="text-sm text-muted-foreground flex items-center space-x-1 truncate">
                                  <Mail className="w-3 h-3 shrink-0" />
                                  <span className="truncate">{user.email}</span>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  @{user.username}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center space-x-2">
                              {getRoleIcon(user.role)}
                              <select
                                value={user.role}
                                onChange={(e) =>
                                  handleUpdateRole(user.id, e.target.value)
                                }
                                className={`px-3 py-1 text-xs font-medium rounded-md border ${getRoleBadgeColor(
                                  user.role
                                )} bg-transparent focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer`}
                              >
                                <option value="admin">Admin</option>
                                <option value="editor">Editor</option>
                                <option value="viewer">Viewer</option>
                              </select>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="text-sm text-muted-foreground">
                              <div>{user._count.pages} pages</div>
                              <div>{user._count.docs} docs</div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="text-sm text-muted-foreground">
                              {new Date(user.createdAt).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex justify-end space-x-2">
                              <button
                                onClick={() =>
                                  handleDeleteUser(user.id, user.username)
                                }
                                className="p-2 text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                                title="Delete user"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-4">
                  {users.map((user) => (
                    <div
                      key={user.id}
                      className="border border-border rounded-lg p-4 bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                            <UserIcon className="w-5 h-5 text-primary" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-foreground truncate text-sm sm:text-base">
                              {user.fullName || user.username}
                            </div>
                            <div className="text-xs sm:text-sm text-muted-foreground flex items-center space-x-1 truncate mt-1">
                              <Mail className="w-3 h-3 shrink-0" />
                              <span className="truncate">{user.email}</span>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              @{user.username}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() =>
                            handleDeleteUser(user.id, user.username)
                          }
                          className="p-2 text-destructive hover:bg-destructive/10 rounded-md transition-colors shrink-0"
                          title="Delete user"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            Role:
                          </span>
                          <div className="flex items-center space-x-2">
                            {getRoleIcon(user.role)}
                            <select
                              value={user.role}
                              onChange={(e) =>
                                handleUpdateRole(user.id, e.target.value)
                              }
                              className={`px-2 py-1 text-xs font-medium rounded-md border ${getRoleBadgeColor(
                                user.role
                              )} bg-transparent focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer`}
                            >
                              <option value="admin">Admin</option>
                              <option value="editor">Editor</option>
                              <option value="viewer">Viewer</option>
                            </select>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            Stats:
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {user._count.pages} pages, {user._count.docs} docs
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            Created:
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() =>
          setConfirmModal({
            isOpen: false,
            title: "",
            message: "",
            onConfirm: () => {},
          })
        }
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
        isLoading={confirmModal.isLoading}
      />
    </div>
  );
}
