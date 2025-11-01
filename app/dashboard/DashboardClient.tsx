"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Edit2,
  Trash2,
  Eye,
  FileText,
  BookOpen,
  ExternalLink,
  Globe,
  Lock,
  Loader2,
} from "lucide-react";
import { generateSlug, isValidSlug, getSlugErrorMessage } from "@/lib/slug";

interface Profile {
  id: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  role?: string;
}

interface Doc {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  userId?: string;
  user?: {
    id: string;
    username: string;
    fullName: string | null;
  };
  _count: {
    pages: number;
  };
}

interface DashboardClientProps {
  email: string;
  profile: Profile | null;
}

export function DashboardClient({ email, profile }: DashboardClientProps) {
  const router = useRouter();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showNewDocModal, setShowNewDocModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state for new doc
  const [docForm, setDocForm] = useState({
    title: "",
    slug: "",
    description: "",
    isPublic: true,
  });

  useEffect(() => {
    loadDocs();
  }, []);

  const loadDocs = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/docs");
      const data = await response.json();

      if (!response.ok) {
        if (
          data.code === "MIGRATION_REQUIRED" ||
          data.details?.includes("migration")
        ) {
          setError(
            "Database migration required. Please check the server console for details."
          );
        } else {
          setError(data.error || "Failed to load documentation projects");
        }
        return;
      }

      setDocs(data.docs || []);
    } catch (error: any) {
      console.error("Failed to load docs:", error);
      setError(
        "Failed to load documentation projects. Please check your connection."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleTitleChange = (title: string) => {
    const autoSlug = generateSlug(title);
    setDocForm({
      ...docForm,
      title,
      // Auto-generate slug if slug is empty or matches previous auto-generated slug
      slug:
        !docForm.slug || docForm.slug === generateSlug(docForm.title)
          ? autoSlug
          : docForm.slug,
    });
  };

  const handleCreateDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!docForm.title.trim()) {
      setError("Title is required");
      return;
    }

    // Validate and normalize slug
    const normalizedSlug = generateSlug(docForm.slug || docForm.title);
    if (!isValidSlug(normalizedSlug)) {
      const errorMsg = getSlugErrorMessage(normalizedSlug);
      setError(errorMsg || "Invalid slug format");
      return;
    }

    const createDoc = async () => {
      try {
        setCreating(true);
        // Allow React to re-render with loading state
        await new Promise((resolve) => setTimeout(resolve, 50));

        const response = await fetch("/api/docs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...docForm,
            slug: generateSlug(docForm.slug || docForm.title),
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to create documentation");
        }

        // Redirect to doc editor
        router.push(`/dashboard/docs/${data.doc.id}`);
        router.refresh();
      } catch (err: any) {
        setError(err.message || "Failed to create documentation");
        setCreating(false);
      }
    };

    // Call async function immediately
    createDoc();
  };

  const handleDeleteDoc = async (docId: string, title: string) => {
    if (
      !confirm(
        `Are you sure you want to delete "${title}"? All pages and sections will be deleted.`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/docs/${docId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await loadDocs();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to delete documentation");
      }
    } catch (error) {
      console.error("Failed to delete doc:", error);
      alert("Failed to delete documentation");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-3">
                Documentation Projects
              </h1>
              <p className="text-lg text-muted-foreground">
                Create and manage your documentation sites
              </p>
            </div>
            <button
              onClick={() => setShowNewDocModal(true)}
              className="btn-primary flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>New Documentation</span>
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* New Doc Modal */}
        {showNewDocModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-background border border-border rounded-lg max-w-2xl w-full p-6">
              <h2 className="text-2xl font-bold text-foreground mb-6">
                Create New Documentation
              </h2>
              <form onSubmit={handleCreateDoc} className="space-y-4">
                <div>
                  <label
                    htmlFor="title"
                    className="block text-sm font-medium text-foreground mb-2"
                  >
                    Documentation Title{" "}
                    <span className="text-destructive">*</span>
                  </label>
                  <input
                    id="title"
                    type="text"
                    required
                    value={docForm.title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    className="w-full h-12 px-4 border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="My Product Documentation"
                  />
                </div>

                <div>
                  <label
                    htmlFor="slug"
                    className="block text-sm font-medium text-foreground mb-2"
                  >
                    URL Slug <span className="text-destructive">*</span>
                  </label>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">
                      /docs/
                    </span>
                    <input
                      id="slug"
                      type="text"
                      required
                      value={docForm.slug}
                      onChange={(e) =>
                        setDocForm({
                          ...docForm,
                          slug: generateSlug(e.target.value),
                        })
                      }
                      className={`flex-1 h-12 px-4 border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 font-mono text-sm ${
                        docForm.slug && !isValidSlug(docForm.slug)
                          ? "border-destructive focus:ring-destructive"
                          : "border-border focus:ring-primary"
                      }`}
                      placeholder="my-product-docs"
                      pattern="[a-z0-9-]+"
                    />
                  </div>
                  {docForm.slug && !isValidSlug(docForm.slug) && (
                    <p className="mt-1 text-xs text-destructive">
                      {getSlugErrorMessage(docForm.slug)}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-muted-foreground">
                    Your documentation will be available at: /docs/
                    {docForm.slug || "..."}
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="description"
                    className="block text-sm font-medium text-foreground mb-2"
                  >
                    Description (optional)
                  </label>
                  <textarea
                    id="description"
                    value={docForm.description}
                    onChange={(e) =>
                      setDocForm({ ...docForm, description: e.target.value })
                    }
                    rows={3}
                    className="w-full px-4 py-2 border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    placeholder="Brief description of your documentation..."
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    id="isPublic"
                    type="checkbox"
                    checked={docForm.isPublic}
                    onChange={(e) =>
                      setDocForm({ ...docForm, isPublic: e.target.checked })
                    }
                    className="w-4 h-4 text-primary border-border rounded focus:ring-2 focus:ring-primary"
                  />
                  <label
                    htmlFor="isPublic"
                    className="text-sm font-medium text-foreground cursor-pointer"
                  >
                    Make this documentation public
                  </label>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewDocModal(false);
                      setDocForm({
                        title: "",
                        slug: "",
                        description: "",
                        isPublic: true,
                      });
                      setError(null);
                    }}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary flex items-center justify-center"
                    disabled={creating}
                  >
                    {creating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Documentation"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Docs Grid */}
        {docs.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              No documentation yet
            </h3>
            <p className="text-muted-foreground mb-6">
              Create your first documentation project to get started
            </p>
            <button
              onClick={() => setShowNewDocModal(true)}
              className="btn-primary inline-flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create Documentation</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {docs.map((doc) => (
              <div
                key={doc.id}
                className="card hover:shadow-lg transition-shadow"
              >
                <div className="card-content">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                        <BookOpen className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground text-lg">
                          {doc.title}
                        </h3>
                        <div className="flex items-center space-x-2 mt-1">
                          {doc.isPublic ? (
                            <Globe className="w-3 h-3 text-primary" />
                          ) : (
                            <Lock className="w-3 h-3 text-muted-foreground" />
                          )}
                          <span className="text-xs text-muted-foreground">
                            /docs/{doc.slug}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {doc.description && (
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {doc.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                    <span>{doc._count.pages} pages</span>
                    <span>
                      Updated {new Date(doc.updatedAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 pt-4 border-t border-border">
                    <Link
                      href={`/dashboard/docs/${doc.id}`}
                      className="btn-primary flex-1 flex items-center justify-center space-x-2 text-sm"
                    >
                      <Edit2 className="w-4 h-4" />
                      <span>Manage</span>
                    </Link>
                    {doc.isPublic && (
                      <Link
                        href={`/docs/${doc.slug}`}
                        target="_blank"
                        className="btn-secondary flex items-center space-x-2 text-sm"
                      >
                        <Eye className="w-4 h-4" />
                        <span>View</span>
                      </Link>
                    )}
                    {/* Only show delete button to owner or admin (not editors) */}
                    {(profile?.role === "admin" ||
                      doc.userId === profile?.id) && (
                      <button
                        onClick={() => handleDeleteDoc(doc.id, doc.title)}
                        className="p-2 text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
