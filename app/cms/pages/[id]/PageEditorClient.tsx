"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
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
import toast from "react-hot-toast";

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
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);

  // Removed manual save ref - using only autosave now

  // Autosave callback - saves automatically when data changes
  const handleAutosave = useCallback(
    async (data: {
      title: string;
      content: string;
      summary: string;
      status: string;
      slug?: string;
    }): Promise<void> => {
      console.log("[handleAutosave] 🔵 Called with data:", {
        title: data.title?.substring(0, 50),
        content: data.content?.substring(0, 50),
        summary: data.summary?.substring(0, 50),
        status: data.status,
        pageId: page.id,
      });

      // For new pages (no ID yet), we cannot autosave
      if (!page.id) {
        console.log(
          "[handleAutosave] ⚠️ Page has no ID, cannot autosave new pages yet"
        );
        throw new Error("AUTOSAVE_SKIPPED_NO_ID");
      }

      console.log("[handleAutosave] ✅ All checks passed, making API call...");

      // Prepare autosave data - use current values from state
      // Use slug from data if provided, otherwise use current slug or generate from title
      const normalizedSlug = generateSlug(
        data.slug || slug || title || data.title || ""
      );
      const autosaveData = {
        title: data.title || title,
        slug: normalizedSlug,
        content: data.content || content,
        summary:
          data.summary !== undefined ? data.summary || null : summary || null,
        status: data.status || status || "draft",
        isAutosave: true,
      };

      console.log(
        "[handleAutosave] 📤 Making PUT request to:",
        `/api/pages/${page.id}`,
        {
          pageId: page.id,
          endpoint: `/api/pages/${page.id}`,
          method: "PUT",
          hasTitle: !!autosaveData.title,
          hasContent: !!autosaveData.content,
          data: autosaveData,
        }
      );

      // Use the exact same endpoint format as manual save
      const response = await fetch(`/api/pages/${page.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Autosave": "true", // Mark as autosave request
        },
        body: JSON.stringify(autosaveData),
      });

      console.log("[handleAutosave] 📥 Response received:", {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Failed to parse error response" }));
        const errorMessage =
          errorData.error || errorData.details || "Failed to autosave";
        console.error(
          "[handleAutosave] ❌ Autosave failed:",
          errorMessage,
          errorData
        );
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log("[handleAutosave] ✅ Autosave successful:", {
        pageId: page.id,
        updated: !!result.page,
        result,
      });

      // Update page state if response includes updated page
      if (result.page) {
        setPage(result.page);
        // Update slug if it changed
        if (result.page.slug && result.page.slug !== slug) {
          setSlug(result.page.slug);
        }
      }
    },
    [page.id, slug, title, content, summary, status, page.slug]
  );

  // Memoize autosave data to ensure stable reference
  // Only create new object when values actually change
  // Include slug so slug changes trigger autosave
  const autosaveData = useMemo(() => {
    return { title, content, summary, status, slug };
  }, [title, content, summary, status, slug]);

  // Autosave functionality with debouncing and performance optimization
  const {
    isSaving: isAutosaving,
    lastSaved,
    error: autosaveError,
  } = useAutosave(autosaveData, {
    delay: 2000, // Auto-save after 2 seconds of inactivity (optimized for better UX)
    onSave: handleAutosave,
    onError: (err) => {
      // Log autosave errors for debugging
      console.error("[useAutosave] Error:", err.message || err);
    },
  });

  // Debug: Log when autosave state changes
  useEffect(() => {
    console.log("[PageEditor] Autosave state:", {
      isAutosaving,
      lastSaved,
      hasError: !!autosaveError,
      error: autosaveError?.message,
    });
  }, [isAutosaving, lastSaved, autosaveError]);

  // Debug: Log when form values change
  useEffect(() => {
    console.log("[PageEditor] 📝 Form values changed:", {
      title: title.substring(0, 50),
      slug: slug.substring(0, 50),
      contentLength: content.length,
      summary: summary?.substring(0, 50),
      status,
      pageId: page.id,
    });
  }, [title, slug, content, summary, status, page.id]);

  // Debug: Log the autosave data object being passed to the hook
  useEffect(() => {
    const autosaveData = { title, content, summary, status, slug };
    console.log("[PageEditor] 🔄 Autosave data object:", {
      ...autosaveData,
      title: autosaveData.title.substring(0, 50),
      slug: autosaveData.slug?.substring(0, 50),
      content: `[${autosaveData.content.length} chars]`,
      summary: autosaveData.summary?.substring(0, 50),
      status: autosaveData.status,
    });
  }, [title, content, summary, status, slug]);

  // Sync local state when page prop changes (e.g., after page reload)
  useEffect(() => {
    console.log("[PageEditor] 🔄 Page changed, resetting state:", {
      pageId: initialPage.id,
      title: initialPage.title.substring(0, 50),
    });

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

  // Handle status change - autosave will handle the save
  const handleStatusChange = async (newStatus: string) => {
    setStatus(newStatus);
    setStatusDropdownOpen(false);

    // Status change will trigger autosave via the useAutosave hook
    // No manual save needed
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0 py-3 sm:py-0 sm:h-16">
            <div className="flex items-center space-x-2 sm:space-x-4 min-w-0 flex-1">
              <Link
                href="/cms"
                className="flex items-center space-x-1 sm:space-x-2 text-foreground hover:text-primary transition-colors shrink-0"
              >
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-primary rounded-lg flex items-center justify-center">
                  <svg
                    className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                  </svg>
                </div>
                <span className="font-semibold text-sm sm:text-base">
                  HelpPages
                </span>
              </Link>
              <span className="text-muted-foreground text-xs sm:text-sm hidden sm:inline">
                /
              </span>
              <Link
                href="/cms"
                className="text-xs sm:text-sm text-muted-foreground hover:text-primary transition-colors hidden sm:inline"
              >
                Dashboard
              </Link>
              <span className="text-muted-foreground text-xs sm:text-sm hidden sm:inline">
                /
              </span>
              <span className="text-xs sm:text-sm text-foreground font-medium truncate">
                {page.title}
              </span>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-3 flex-wrap sm:flex-nowrap">
              {/* Autosave status */}
              <div className="hidden md:flex items-center space-x-2 text-xs sm:text-sm text-muted-foreground">
                {isAutosaving && (
                  <>
                    <Clock className="w-3 h-3 sm:w-4 sm:h-4 animate-pulse" />
                    <span>Saving...</span>
                  </>
                )}
                {!isAutosaving && lastSaved && !autosaveError && (
                  <>
                    <Check className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
                    <span>
                      Saved {new Date(lastSaved).toLocaleTimeString()}
                    </span>
                  </>
                )}
                {autosaveError && (
                  <>
                    <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4 text-destructive" />
                    <span className="text-destructive">Autosave failed</span>
                  </>
                )}
              </div>

              {/* Custom Status Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                  className={`flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-1.5 sm:py-2 border rounded-lg bg-input text-foreground text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all ${
                    status === "published"
                      ? "border-primary/50 bg-primary/5"
                      : "border-border hover:border-primary/30"
                  }`}
                >
                  {status === "published" ? (
                    <>
                      <Globe className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
                      <span className="font-medium hidden sm:inline">
                        Published
                      </span>
                      <span className="font-medium sm:hidden">Pub</span>
                    </>
                  ) : (
                    <>
                      <FileText className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground" />
                      <span>Draft</span>
                    </>
                  )}
                  <ChevronDown
                    className={`w-3 h-3 sm:w-4 sm:h-4 transition-transform ${
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
                    <div className="absolute right-0 mt-2 w-40 sm:w-48 bg-background border border-border rounded-lg shadow-lg z-20 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => handleStatusChange("draft")}
                        className={`w-full flex items-center space-x-2 sm:space-x-3 px-3 sm:px-4 py-2 sm:py-3 text-left transition-colors ${
                          status === "draft"
                            ? "bg-primary/10 text-primary"
                            : "hover:bg-accent text-foreground"
                        }`}
                      >
                        <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
                        <div className="flex-1">
                          <div className="text-sm sm:text-base font-medium">
                            Draft
                          </div>
                          <div className="text-xs text-muted-foreground hidden sm:block">
                            Not visible to public
                          </div>
                        </div>
                        {status === "draft" && (
                          <Check className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
                        )}
                      </button>
                      <div className="border-t border-border" />
                      <button
                        type="button"
                        onClick={() => handleStatusChange("published")}
                        className={`w-full flex items-center space-x-2 sm:space-x-3 px-3 sm:px-4 py-2 sm:py-3 text-left transition-colors ${
                          status === "published"
                            ? "bg-primary/10 text-primary"
                            : "hover:bg-accent text-foreground"
                        }`}
                      >
                        <Globe className="w-3 h-3 sm:w-4 sm:h-4" />
                        <div className="flex-1">
                          <div className="text-sm sm:text-base font-medium">
                            Published
                          </div>
                          <div className="text-xs text-muted-foreground hidden sm:block">
                            Visible to everyone
                          </div>
                        </div>
                        {status === "published" && (
                          <Check className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
                        )}
                      </button>
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={() => setShowPreview(!showPreview)}
                className="btn-secondary flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2"
              >
                <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">
                  {showPreview ? "Edit" : "Preview"}
                </span>
                <span className="sm:hidden">
                  {showPreview ? "Edit" : "View"}
                </span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Error Message */}
      {error && (
        <div className="px-3 sm:px-4 md:px-6 lg:px-8 pt-3 sm:pt-4">
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-3 sm:px-4 py-2 sm:py-3 rounded-lg text-sm sm:text-base">
            {error}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
          {/* Editor */}
          <div className={showPreview ? "hidden lg:block" : ""}>
            <div className="space-y-4 sm:space-y-6">
              <div className="card">
                <div className="card-content p-4 sm:p-6">
                  <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-4 sm:mb-6">
                    Page Settings
                  </h2>
                  <div className="space-y-3 sm:space-y-4">
                    <div>
                      <label
                        htmlFor="title"
                        className="block text-xs sm:text-sm font-medium text-foreground mb-1.5 sm:mb-2"
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
                        className="w-full h-10 sm:h-12 px-3 sm:px-4 text-sm sm:text-base border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                        placeholder="Page Title"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="slug"
                        className="block text-xs sm:text-sm font-medium text-foreground mb-1.5 sm:mb-2"
                      >
                        URL Slug
                      </label>
                      <input
                        id="slug"
                        type="text"
                        value={slug}
                        onChange={(e) => setSlug(generateSlug(e.target.value))}
                        className={`w-full h-10 sm:h-12 px-3 sm:px-4 border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 transition-colors font-mono text-xs sm:text-sm ${
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
                        className="block text-xs sm:text-sm font-medium text-foreground mb-1.5 sm:mb-2"
                      >
                        Summary (optional)
                      </label>
                      <input
                        id="summary"
                        type="text"
                        value={summary}
                        onChange={(e) => setSummary(e.target.value)}
                        className="w-full h-10 sm:h-12 px-3 sm:px-4 text-sm sm:text-base border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                        placeholder="Brief summary of this page"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-content p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-4 sm:mb-6">
                    <h2 className="text-lg sm:text-xl font-semibold text-foreground">
                      Content
                    </h2>
                    <div className="text-xs text-muted-foreground bg-muted px-2 sm:px-3 py-1 rounded-md">
                      📝 Write in Markdown format
                    </div>
                  </div>
                  <div>
                    <label
                      htmlFor="content"
                      className="block text-xs sm:text-sm font-medium text-foreground mb-1.5 sm:mb-2"
                    >
                      Your page content (Markdown supported)
                    </label>
                    <textarea
                      id="content"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      rows={16}
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-mono text-xs sm:text-sm resize-none min-h-[300px] sm:min-h-[400px]"
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
            <div className="sticky top-20 sm:top-24">
              <div className="card">
                <div className="card-content p-4 sm:p-6">
                  <h3 className="text-base sm:text-lg font-semibold text-foreground mb-4 sm:mb-6">
                    Preview
                  </h3>
                  <div className="prose prose-sm sm:prose-base md:prose-lg dark:prose-invert max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-h1:text-2xl sm:prose-h1:text-3xl prose-h2:text-xl sm:prose-h2:text-2xl prose-h3:text-lg sm:prose-h3:text-xl prose-h4:text-base sm:prose-h4:text-lg prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs sm:prose-code:text-sm prose-pre:bg-muted prose-pre:border prose-pre:border-border">
                    <h1 className="text-xl sm:text-2xl md:text-3xl">{title}</h1>
                    {summary && (
                      <div className="text-sm sm:text-base md:text-lg text-muted-foreground my-4 sm:mb-6 p-3 sm:p-4 bg-muted/50 rounded-lg border border-border">
                        {summary}
                      </div>
                    )}
                    <div className="mt-3 sm:mt-4">
                      {renderMarkdownPreview(content)}
                    </div>
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
