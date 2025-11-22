"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Edit2,
  Trash2,
  Eye,
  BookOpen,
  Globe,
  Lock,
  Loader2,
  Copy,
  Check,
} from "lucide-react";
import { generateSlug, isValidSlug, getSlugErrorMessage } from "@/lib/slug";
import toast from "react-hot-toast";
import { ConfirmModal } from "@/app/components/ConfirmModal";
import { LoadingSpinner } from "@/app/components/LoadingSpinner";

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
  const [copiedDocId, setCopiedDocId] = useState<string | null>(null);

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

  // Form state for new doc
  const [docForm, setDocForm] = useState({
    title: "",
    slug: "",
    description: "",
    isPublic: true,
  });

  // Prevent redirects to invalid routes
  useEffect(() => {
    if (typeof window !== "undefined") {
      const pathname = window.location.pathname;
      if (pathname.includes("/cms/all-courses")) {
        router.replace("/cms");
      }
    }
  }, [router]);

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
        router.push(`/cms/docs/${data.doc.id}`);
        router.refresh();
      } catch (err: any) {
        setError(err.message || "Failed to create documentation");
        setCreating(false);
      }
    };

    // Call async function immediately
    createDoc();
  };

  const handleCopyLink = async (doc: Doc) => {
    if (typeof window === "undefined") return;

    const docUrl = `${window.location.origin}/docs/${doc.slug}`;

    try {
      await navigator.clipboard.writeText(docUrl);
      setCopiedDocId(doc.id);
      toast.success("Link copied to clipboard!");

      // Reset the copied state after 2 seconds
      setTimeout(() => {
        setCopiedDocId(null);
      }, 2000);
    } catch (error) {
      console.error("Failed to copy link:", error);
      toast.error("Failed to copy link");
    }
  };

  const handleDeleteDoc = async (docId: string, title: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Documentation",
      message: `Are you sure you want to delete "${title}"? All pages and sections will be deleted.`,
      variant: "danger",
      isLoading: false,
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isLoading: true }));
        try {
          const response = await fetch(`/api/docs/${docId}`, {
            method: "DELETE",
          });

          if (response.ok) {
            await loadDocs();
            toast.success("Documentation deleted successfully!");
            setConfirmModal({
              isOpen: false,
              title: "",
              message: "",
              onConfirm: () => {},
            });
          } else {
            const data = await response.json();
            toast.error(data.error || "Failed to delete documentation");
            setConfirmModal((prev) => ({ ...prev, isLoading: false }));
          }
        } catch (error) {
          console.error("Failed to delete doc:", error);
          toast.error("Failed to delete documentation");
          setConfirmModal((prev) => ({ ...prev, isLoading: false }));
        }
      },
    });
  };

  if (loading) {
    return <LoadingSpinner fullScreen text="Loading documentation..." />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="px-3 sm:px-4 md:px-6 lg:px-12 py-4 sm:py-6 md:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-2 sm:mb-3">
                Documentation Projects
              </h1>
              <p className="text-sm sm:text-base md:text-lg text-muted-foreground">
                Create and manage your documentation sites
              </p>
            </div>
            <button
              onClick={() => setShowNewDocModal(true)}
              className="btn-primary flex items-center justify-center space-x-2 px-4 py-2 sm:px-6 sm:py-2.5 text-sm sm:text-base w-full sm:w-auto"
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
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
            <div className="bg-background border border-border rounded-lg max-w-2xl w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-4 sm:mb-6">
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
                    className="w-full h-10 sm:h-12 px-3 sm:px-4 border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm sm:text-base"
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
                      className={`flex-1 h-10 sm:h-12 px-3 sm:px-4 border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 font-mono text-xs sm:text-sm ${
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
                    className="w-full px-3 sm:px-4 py-2 border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none text-sm sm:text-base"
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

                <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 sm:space-x-3 pt-4">
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
                    className="btn-secondary w-full sm:w-auto px-4 py-2 text-sm sm:text-base"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary flex items-center justify-center w-full sm:w-auto px-4 py-2 text-sm sm:text-base"
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
          <div className="text-center py-12 sm:py-16">
            <BookOpen className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2">
              No documentation yet
            </h3>
            <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6 px-4">
              Create your first documentation project to get started
            </p>
            <button
              onClick={() => setShowNewDocModal(true)}
              className="btn-primary inline-flex items-center space-x-2 px-4 sm:px-6 py-2 sm:py-2.5 text-sm sm:text-base"
            >
              <Plus className="w-4 h-4" />
              <span>Create Documentation</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {docs.map((doc) => (
              <div
                key={doc.id}
                className="card hover:shadow-lg transition-shadow"
              >
                <div className="card-content">
                  <div className="flex items-start justify-between mb-3 sm:mb-4">
                    <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                        <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-foreground text-base sm:text-lg line-clamp-2">
                          {doc.title}
                        </h3>
                        <div className="flex items-center space-x-2 mt-1">
                          {doc.isPublic ? (
                            <Globe className="w-3 h-3 text-primary shrink-0" />
                          ) : (
                            <Lock className="w-3 h-3 text-muted-foreground shrink-0" />
                          )}
                          <span className="text-xs text-muted-foreground truncate">
                            /docs/{doc.slug}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {doc.description && (
                    <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4 line-clamp-2">
                      {doc.description}
                    </p>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
                    <span>{doc._count.pages} pages</span>
                    <span className="text-xs">
                      Updated {new Date(doc.updatedAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 pt-3 sm:pt-4 border-t border-border">
                    <Link
                      href={`/cms/docs/${doc.id}`}
                      className="btn-primary flex-1 flex items-center justify-center space-x-1.5 sm:space-x-2 text-xs sm:text-sm py-2 sm:py-2.5"
                    >
                      <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span>Manage</span>
                    </Link>
                    {/* Allow owners to view their own docs even if private */}
                    {doc.isPublic || doc.userId === profile?.id ? (
                      <Link
                        href={`/docs/${doc.slug}`}
                        target="_blank"
                        className="btn-secondary flex items-center justify-center space-x-1.5 sm:space-x-2 text-xs sm:text-sm py-2 sm:py-2.5 px-3 sm:px-4"
                        title={
                          doc.isPublic
                            ? "View public documentation"
                            : "Preview your private documentation"
                        }
                      >
                        <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <span className="hidden sm:inline">View</span>
                      </Link>
                    ) : (
                      <button
                        disabled
                        className="btn-secondary flex items-center justify-center space-x-1.5 sm:space-x-2 text-xs sm:text-sm py-2 sm:py-2.5 px-3 sm:px-4 opacity-50 cursor-not-allowed"
                        title="Make documentation public to view"
                      >
                        <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <span className="hidden sm:inline">View</span>
                      </button>
                    )}
                    <button
                      onClick={() => handleCopyLink(doc)}
                      className="btn-secondary flex items-center justify-center space-x-1.5 sm:space-x-2 text-xs sm:text-sm py-2 sm:py-2.5 px-3 sm:px-4"
                      title="Copy public view link"
                    >
                      {copiedDocId === doc.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          <span className="hidden sm:inline">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          <span className="hidden sm:inline">Copy</span>
                        </>
                      )}
                    </button>
                    {/* Only show delete button to owner or admin (not editors) */}
                    {(profile?.role === "admin" ||
                      doc.userId === profile?.id) && (
                      <button
                        onClick={() => handleDeleteDoc(doc.id, doc.title)}
                        className="p-2 text-destructive hover:bg-destructive/10 rounded-md transition-colors shrink-0"
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
