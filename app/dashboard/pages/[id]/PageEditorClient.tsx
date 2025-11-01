"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Save,
  Eye,
  Check,
  Clock,
  AlertCircle,
  ChevronDown,
  FileText,
  Globe,
  Loader2,
} from "lucide-react";
import { useAutosave } from "@/hooks/useAutosave";
import { generateSlug, isValidSlug, getSlugErrorMessage } from "@/lib/slug";

interface NavHeader {
  id: string;
  label: string;
  slug: string;
}

interface Page {
  id: string;
  title: string;
  slug: string;
  content: string;
  summary: string | null;
  status: string;
  navHeader: NavHeader | null;
}

interface PageEditorClientProps {
  page: Page;
}

export default function PageEditorClient({
  page: initialPage,
}: PageEditorClientProps) {
  const router = useRouter();
  const [page, setPage] = useState(initialPage);
  const [title, setTitle] = useState(page.title);
  const [slug, setSlug] = useState(page.slug);
  const [content, setContent] = useState(page.content);
  const [summary, setSummary] = useState(page.summary || "");
  const [status, setStatus] = useState(page.status);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);

  // Memoize autosave callback to prevent infinite loops
  // Only autosave drafts, not published pages
  const handleAutosave = useCallback(
    async (data: {
      title: string;
      content: string;
      summary: string;
      status: string;
    }) => {
      // Skip autosave if page is published (user should manually save changes to published pages)
      if (data.status === "published") {
        return;
      }

      // Ensure we have at least some data to save
      if (!data.title && !data.content && !data.summary) {
        console.log("Autosave skipped: no data to save");
        return;
      }

      try {
        const response = await fetch(`/api/pages/${page.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: data.title || title,
            content: data.content || content,
            summary: data.summary !== undefined ? data.summary : summary,
            slug: slug || page.slug,
            // Keep current status, don't change it during autosave
            status: data.status || status || "draft",
          }),
        });

        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ error: "Failed to parse error response" }));
          const errorMessage =
            errorData.error || errorData.details || "Failed to autosave";
          console.error("Autosave failed:", errorMessage, errorData);
          throw new Error(errorMessage);
        }

        const result = await response.json();
        // Update page state if response includes updated page
        if (result.page) {
          setPage(result.page);
        }
        return result;
      } catch (error: any) {
        console.error("Autosave error details:", error);
        throw error;
      }
    },
    [page.id, slug, title, content, summary, status, page.slug]
  );

  // Autosave functionality - DISABLED for now
  // const {
  //   isSaving: isAutosaving,
  //   lastSaved,
  //   error: autosaveError,
  // } = useAutosave(
  //   { title, content, summary, status },
  //   {
  //     delay: 3000, // Auto-save after 3 seconds of inactivity
  //     onSave: handleAutosave,
  //     onError: (err) => {
  //       console.error("Autosave error:", err.message || err);
  //       // Silently fail autosave errors to avoid UI disruption
  //       // User can manually save if needed
  //     },
  //   }
  // );

  // Disabled autosave - manually set these values
  const isAutosaving = false;
  const lastSaved = null;
  const autosaveError = null;

  // Sync local state when page prop changes (e.g., after manual save)
  useEffect(() => {
    setPage(initialPage);
    setTitle(initialPage.title);
    setSlug(initialPage.slug);
    setContent(initialPage.content);
    setSummary(initialPage.summary || "");
    setStatus(initialPage.status);
  }, [initialPage.id]); // Only reset when page ID changes

  // Close dropdown on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && statusDropdownOpen) {
        setStatusDropdownOpen(false);
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [statusDropdownOpen]);

  const handleSave = async (publishStatus?: string) => {
    setSaving(true);
    setError(null);

    // Validate slug before saving
    const normalizedSlug = generateSlug(slug || title);
    if (!isValidSlug(normalizedSlug)) {
      const errorMsg = getSlugErrorMessage(normalizedSlug);
      setError(errorMsg || "Invalid slug format");
      setSaving(false);
      return;
    }

    try {
      const statusToSave = publishStatus || status;

      // If publishing, use current content as the published content
      // Note: isPublic is removed - pages inherit visibility from their parent Doc
      const saveData: any = {
        title,
        slug: normalizedSlug,
        content,
        summary: summary || null,
        status: statusToSave,
      };

      // Removed draftContent - not needed for now

      console.log("Saving page with data:", {
        id: page.id,
        saveData,
        statusToSave,
      });

      const response = await fetch(`/api/pages/${page.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(saveData),
      });

      const data = await response.json();

      console.log("Save response:", {
        ok: response.ok,
        status: response.status,
        data,
      });

      if (!response.ok) {
        const errorMsg =
          data.error ||
          data.details ||
          `Failed to save page (${response.status})`;
        console.error("Save error details:", {
          status: response.status,
          error: data.error,
          details: data.details,
          code: data.code,
          fullResponse: data,
        });
        throw new Error(errorMsg);
      }

      // Update all local state from response
      if (data.page) {
        setPage(data.page);
        setStatus(data.page.status);
      }

      if (statusToSave === "published") {
        alert("Page published successfully!");
        // Refresh to show published state
        router.refresh();
      } else {
        alert("Page saved successfully!");
      }
    } catch (err: any) {
      const errorMessage = err.message || "Failed to save page";
      setError(errorMessage);
      console.error("Save error:", err);
      alert(`Error: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    await handleSave("published");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard"
                className="flex items-center space-x-2 text-foreground hover:text-primary transition-colors"
              >
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-primary-foreground"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                  </svg>
                </div>
                <span className="font-semibold">HelpPages</span>
              </Link>
              <span className="text-muted-foreground">/</span>
              <Link
                href="/dashboard"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                Dashboard
              </Link>
              <span className="text-muted-foreground">/</span>
              <span className="text-foreground font-medium">{page.title}</span>
            </div>

            <div className="flex items-center space-x-3">
              {/* Autosave status */}
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                {isAutosaving && (
                  <>
                    <Clock className="w-4 h-4 animate-pulse" />
                    <span>Saving...</span>
                  </>
                )}
                {!isAutosaving && lastSaved && !autosaveError && (
                  <>
                    <Check className="w-4 h-4 text-primary" />
                    <span>
                      Saved {new Date(lastSaved).toLocaleTimeString()}
                    </span>
                  </>
                )}
                {autosaveError && (
                  <>
                    <AlertCircle className="w-4 h-4 text-destructive" />
                    <span className="text-destructive">Autosave failed</span>
                  </>
                )}
              </div>

              {/* Custom Status Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                  className={`flex items-center space-x-2 px-3 py-2 border rounded-lg bg-input text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all ${
                    status === "published"
                      ? "border-primary/50 bg-primary/5"
                      : "border-border hover:border-primary/30"
                  }`}
                >
                  {status === "published" ? (
                    <>
                      <Globe className="w-4 h-4 text-primary" />
                      <span className="font-medium">Published</span>
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <span>Draft</span>
                    </>
                  )}
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${
                      statusDropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {statusDropdownOpen && (
                  <>
                    {/* Backdrop */}
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setStatusDropdownOpen(false)}
                    />
                    {/* Dropdown Menu */}
                    <div className="absolute right-0 mt-2 w-48 bg-background border border-border rounded-lg shadow-lg z-20 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => {
                          setStatus("draft");
                          setStatusDropdownOpen(false);
                        }}
                        className={`w-full flex items-center space-x-3 px-4 py-3 text-left transition-colors ${
                          status === "draft"
                            ? "bg-primary/10 text-primary"
                            : "hover:bg-accent text-foreground"
                        }`}
                      >
                        <FileText className="w-4 h-4" />
                        <div className="flex-1">
                          <div className="font-medium">Draft</div>
                          <div className="text-xs text-muted-foreground">
                            Not visible to public
                          </div>
                        </div>
                        {status === "draft" && (
                          <Check className="w-4 h-4 text-primary" />
                        )}
                      </button>
                      <div className="border-t border-border" />
                      <button
                        type="button"
                        onClick={() => {
                          setStatus("published");
                          setStatusDropdownOpen(false);
                        }}
                        className={`w-full flex items-center space-x-3 px-4 py-3 text-left transition-colors ${
                          status === "published"
                            ? "bg-primary/10 text-primary"
                            : "hover:bg-accent text-foreground"
                        }`}
                      >
                        <Globe className="w-4 h-4" />
                        <div className="flex-1">
                          <div className="font-medium">Published</div>
                          <div className="text-xs text-muted-foreground">
                            Visible to everyone
                          </div>
                        </div>
                        {status === "published" && (
                          <Check className="w-4 h-4 text-primary" />
                        )}
                      </button>
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={() => setShowPreview(!showPreview)}
                className="btn-secondary flex items-center space-x-2"
              >
                <Eye size={16} />
                <span>{showPreview ? "Edit" : "Preview"}</span>
              </button>
              {status === "published" ? (
                <button
                  onClick={() => handleSave()}
                  disabled={saving}
                  className="btn-primary flex items-center space-x-2"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save size={16} />
                  )}
                  <span>{saving ? "Saving..." : "Save Changes"}</span>
                </button>
              ) : (
                <button
                  onClick={handlePublish}
                  disabled={saving}
                  className="btn-primary flex items-center space-x-2"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save size={16} />
                  )}
                  <span>{saving ? "Publishing..." : "Publish"}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Error Message */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg">
            {error}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Editor */}
          <div className={showPreview ? "hidden lg:block" : ""}>
            <div className="space-y-6">
              <div className="card">
                <div className="card-content">
                  <h2 className="text-xl font-semibold text-foreground mb-6">
                    Page Settings
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <label
                        htmlFor="title"
                        className="block text-sm font-medium text-foreground mb-2"
                      >
                        Page Title
                      </label>
                      <input
                        id="title"
                        type="text"
                        value={title}
                        onChange={(e) => {
                          const newTitle = e.target.value;
                          const autoSlug = generateSlug(newTitle);
                          setTitle(newTitle);
                          // Auto-generate slug if slug is empty or matches previous auto-generated slug
                          if (!slug || slug === generateSlug(title)) {
                            setSlug(autoSlug);
                          }
                        }}
                        className="w-full h-12 px-4 text-base border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                        placeholder="Page Title"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="slug"
                        className="block text-sm font-medium text-foreground mb-2"
                      >
                        URL Slug
                      </label>
                      <input
                        id="slug"
                        type="text"
                        value={slug}
                        onChange={(e) => setSlug(generateSlug(e.target.value))}
                        className={`w-full h-12 px-4 border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 transition-colors font-mono text-sm ${
                          slug && !isValidSlug(slug)
                            ? "border-destructive focus:ring-destructive"
                            : "border-border focus:ring-primary"
                        }`}
                        placeholder="page-slug"
                      />
                      {slug && !isValidSlug(slug) && (
                        <p className="mt-1 text-xs text-destructive">
                          {getSlugErrorMessage(slug)}
                        </p>
                      )}
                      <p className="mt-2 text-xs text-muted-foreground">
                        Used in the URL: /u/username/{slug}
                      </p>
                    </div>

                    <div>
                      <label
                        htmlFor="summary"
                        className="block text-sm font-medium text-foreground mb-2"
                      >
                        Summary (optional)
                      </label>
                      <input
                        id="summary"
                        type="text"
                        value={summary}
                        onChange={(e) => setSummary(e.target.value)}
                        className="w-full h-12 px-4 text-base border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                        placeholder="Brief summary of this page"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-content">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-foreground">
                      Content
                    </h2>
                    <div className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-md">
                      📝 Write in Markdown format
                    </div>
                  </div>
                  <div>
                    <label
                      htmlFor="content"
                      className="block text-sm font-medium text-foreground mb-2"
                    >
                      Your page content (Markdown supported)
                    </label>
                    <textarea
                      id="content"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      rows={24}
                      className="w-full px-4 py-3 border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-mono text-sm resize-none"
                      placeholder="# Start writing your documentation here...

Use markdown to format your content:

## Headings
### Subheadings

**Bold text**
*Italic text*

- Bullet points
- Another point

1. Numbered lists
2. Second item

[Links](https://example.com)

\`inline code\`

\`\`\`
code blocks
\`\`\`"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className={showPreview ? "block" : "hidden lg:block"}>
            <div className="sticky top-24">
              <div className="card">
                <div className="card-content">
                  <h3 className="text-lg font-semibold text-foreground mb-6">
                    Preview
                  </h3>
                  <div className="prose prose-lg dark:prose-invert max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-h4:text-lg prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-pre:bg-muted prose-pre:border prose-pre:border-border">
                    <h1>{title}</h1>
                    {summary && (
                      <div className="text-lg text-muted-foreground mb-6 p-4 bg-muted/50 rounded-lg border border-border">
                        {summary}
                      </div>
                    )}
                    <div className="mt-4">{renderMarkdownPreview(content)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Simple markdown preview renderer
function renderMarkdownPreview(markdown: string) {
  const lines = markdown.split("\n");
  const elements: React.ReactElement[] = [];

  lines.forEach((line, idx) => {
    if (line.startsWith("### ")) {
      elements.push(
        <h3 key={idx} className="text-lg font-bold mt-4 mb-2">
          {line.slice(4)}
        </h3>
      );
    } else if (line.startsWith("## ")) {
      elements.push(
        <h2 key={idx} className="text-xl font-bold mt-6 mb-3">
          {line.slice(3)}
        </h2>
      );
    } else if (line.startsWith("# ")) {
      elements.push(
        <h1 key={idx} className="text-2xl font-bold mt-8 mb-4">
          {line.slice(2)}
        </h1>
      );
    } else if (line.startsWith("- ")) {
      elements.push(<li key={idx}>{line.slice(2)}</li>);
    } else if (line.trim()) {
      elements.push(
        <p key={idx} className="mb-2">
          {line}
        </p>
      );
    }
  });

  return <div>{elements}</div>;
}
