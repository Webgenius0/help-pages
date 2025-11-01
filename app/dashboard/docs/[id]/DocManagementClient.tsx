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
  ChevronDown,
  ChevronRight,
  GripVertical,
  Loader2,
} from "lucide-react";
import { generateSlug, isValidSlug, getSlugErrorMessage } from "@/lib/slug";

interface Profile {
  id: string;
  username: string;
  fullName: string | null;
  role: string;
}

interface NavHeader {
  id: string;
  label: string;
  slug: string;
  position: number;
  pages: Array<{
    id: string;
    title: string;
    slug: string;
    status: string;
    position: number;
  }>;
  children?: NavHeader[];
}

interface Page {
  id: string;
  title: string;
  slug: string;
  status: string;
  position: number;
}

interface Doc {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  isPublic: boolean;
  userId?: string;
  navHeaders: NavHeader[];
  pages: Page[];
  _count: {
    pages: number;
  };
}

interface DocManagementClientProps {
  doc: Doc;
  profile: Profile;
}

export function DocManagementClient({
  doc: initialDoc,
  profile,
}: DocManagementClientProps) {
  const router = useRouter();
  const [doc, setDoc] = useState<Doc>(initialDoc);
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const [showNewSectionModal, setShowNewSectionModal] = useState(false);
  const [showNewPageModal, setShowNewPageModal] = useState(false);
  const [creatingSection, setCreatingSection] = useState(false);
  const [creatingPage, setCreatingPage] = useState(false);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [sectionForm, setSectionForm] = useState({
    label: "",
    slug: "",
    parentId: null as string | null,
  });
  const [pageForm, setPageForm] = useState({
    title: "",
    slug: "",
    navHeaderId: null as string | null,
  });

  useEffect(() => {
    // Auto-expand first section
    if (doc.navHeaders.length > 0 && expandedSections.length === 0) {
      setExpandedSections([doc.navHeaders[0].id]);
    }
  }, [doc.navHeaders, expandedSections.length]);

  const loadDoc = async () => {
    try {
      const response = await fetch(`/api/docs/${doc.id}?by=id`);
      if (response.ok) {
        const data = await response.json();
        // Ensure arrays exist even if empty
        const updatedDoc = {
          ...data.doc,
          navHeaders: (data.doc.navHeaders || []).map((header: NavHeader) => ({
            ...header,
            pages: header.pages || [],
            children: (header.children || []).map((child: NavHeader) => ({
              ...child,
              pages: child.pages || [],
            })),
          })),
          pages: data.doc.pages || [],
        };
        setDoc(updatedDoc);
        setError(null); // Clear any previous errors
      } else {
        const errorData = await response.json();
        console.error("Failed to load doc:", errorData);
        setError(errorData.error || "Failed to load documentation");
      }
    } catch (error) {
      console.error("Failed to load doc:", error);
      setError("Failed to load documentation");
    }
  };

  const handleAddSection = () => {
    setSectionForm({ label: "", slug: "", parentId: null });
    setSelectedSectionId(null);
    setShowNewSectionModal(true);
  };

  const handleAddSubsection = (parentId: string) => {
    setSectionForm({ label: "", slug: "", parentId });
    setSelectedSectionId(null);
    setShowNewSectionModal(true);
  };

  const handleCreateSection = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!sectionForm.label.trim()) {
      setError("Label is required");
      return;
    }

    // Validate and normalize slug
    const normalizedSlug = generateSlug(sectionForm.slug || sectionForm.label);
    if (!isValidSlug(normalizedSlug)) {
      const errorMsg = getSlugErrorMessage(normalizedSlug);
      setError(errorMsg || "Invalid slug format");
      return;
    }

    try {
      setCreatingSection(true);
      // Allow React to re-render with loading state
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const response = await fetch(
        `/api/nav-headers?docId=${encodeURIComponent(doc.id)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            label: sectionForm.label,
            slug: generateSlug(sectionForm.slug || sectionForm.label),
            docId: doc.id,
            parentId: sectionForm.parentId,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create section");
      }

      await loadDoc();
      setShowNewSectionModal(false);
      setSectionForm({ label: "", slug: "", parentId: null });
    } catch (err: any) {
      setError(err.message || "Failed to create section");
    } finally {
      setCreatingSection(false);
    }
  };

  const handleAddPage = (sectionId?: string) => {
    setPageForm({ title: "", slug: "", navHeaderId: sectionId || null });
    setSelectedSectionId(sectionId || null);
    setShowNewPageModal(true);
  };

  const handleCreatePage = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!pageForm.title.trim()) {
      setError("Title is required");
      return;
    }

    // Validate and normalize slug
    const normalizedSlug = generateSlug(pageForm.slug || pageForm.title);
    if (!isValidSlug(normalizedSlug)) {
      const errorMsg = getSlugErrorMessage(normalizedSlug);
      setError(errorMsg || "Invalid slug format");
      return;
    }

    try {
      setCreatingPage(true);
      // Allow React to re-render with loading state
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const response = await fetch("/api/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: pageForm.title,
          slug: generateSlug(pageForm.slug || pageForm.title),
          docId: doc.id,
          navHeaderId: pageForm.navHeaderId,
          content: `# ${pageForm.title}\n\nStart writing your content here...`,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create page");
      }

      await loadDoc();
      setShowNewPageModal(false);
      setPageForm({ title: "", slug: "", navHeaderId: null });
      // Navigate to the new page editor
      router.push(`/dashboard/pages/${data.page.id}`);
    } catch (err: any) {
      setError(err.message || "Failed to create page");
    } finally {
      setCreatingPage(false);
    }
  };

  const handleDeletePage = async (pageId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/pages/${pageId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await loadDoc();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to delete page");
      }
    } catch (error) {
      console.error("Failed to delete page:", error);
      alert("Failed to delete page");
    }
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) =>
      prev.includes(sectionId)
        ? prev.filter((id) => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const renderSection = (section: NavHeader, level = 0) => {
    const isExpanded = expandedSections.includes(section.id);
    const hasPages = section.pages && section.pages.length > 0;
    const hasSubsections = section.children && section.children.length > 0;

    return (
      <div key={section.id} className="mb-4">
        <div
          className={`flex items-center justify-between p-4 bg-card border border-border rounded-lg ${
            level > 0 ? "ml-6" : ""
          }`}
        >
          <div className="flex items-center space-x-3 flex-1">
            {(hasPages || hasSubsections) && (
              <button
                onClick={() => toggleSection(section.id)}
                className="p-1 hover:bg-accent rounded"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
            )}
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{section.label}</h3>
              <p className="text-xs text-muted-foreground">/{section.slug}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleAddPage(section.id)}
              className="btn-secondary text-sm flex items-center space-x-1"
            >
              <Plus className="w-3 h-3" />
              <span>Page</span>
            </button>
            {level === 0 && (
              <button
                onClick={() => handleAddSubsection(section.id)}
                className="btn-secondary text-sm flex items-center space-x-1"
              >
                <Plus className="w-3 h-3" />
                <span>Subsection</span>
              </button>
            )}
          </div>
        </div>

        {isExpanded && (
          <div className="mt-2 space-y-2">
            {/* Pages in this section */}
            {section.pages &&
              section.pages.length > 0 &&
              section.pages.map((page) => (
                <div
                  key={page.id}
                  className={`flex items-center justify-between p-3 bg-muted/50 border border-border rounded-md hover:border-primary/50 transition-colors ${
                    level > 0 ? "ml-12" : "ml-6"
                  }`}
                >
                  <div className="flex items-center space-x-3 flex-1">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <div className="flex-1">
                      <Link
                        href={`/dashboard/pages/${page.id}`}
                        className="font-medium text-foreground hover:text-primary flex items-center space-x-2 group"
                      >
                        <span>{page.title}</span>
                        <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                      <p className="text-xs text-muted-foreground mt-1">
                        /{page.slug} • {page.status} • Click to edit content
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Link
                      href={`/dashboard/pages/${page.id}`}
                      className="btn-primary text-xs px-3 py-1.5 flex items-center space-x-1"
                      title="Edit Content"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Edit</span>
                    </Link>
                    {doc.isPublic && page.status === "published" && (
                      <Link
                        href={`/docs/${doc.slug}/${page.slug}`}
                        target="_blank"
                        className="p-2 text-muted-foreground hover:text-primary"
                        title="View Public"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                    )}
                    {/* Only show delete button to owner or admin (not editors) */}
                    {(profile.role === "admin" ||
                      doc.userId === profile.id) && (
                      <button
                        onClick={() => handleDeletePage(page.id, page.title)}
                        className="p-2 text-destructive hover:bg-destructive/10 rounded"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}

            {/* Subsections */}
            {section.children &&
              section.children.map((subsection) =>
                renderSection(subsection, level + 1)
              )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <Link
                href="/dashboard"
                className="text-sm text-muted-foreground hover:text-primary mb-2 inline-block"
              >
                ← Back to Documentation Projects
              </Link>
              <h1 className="text-4xl font-bold text-foreground mb-2">
                {doc.title}
              </h1>
              <p className="text-lg text-muted-foreground mb-4">
                {doc.description || "Manage pages and sections"}
              </p>
              <div className="flex items-center space-x-4 text-sm">
                <span className="text-muted-foreground">
                  {doc._count.pages} pages
                </span>
                {doc.isPublic && (
                  <Link
                    href={`/docs/${doc.slug}`}
                    target="_blank"
                    className="text-primary hover:underline flex items-center space-x-1"
                  >
                    <Eye className="w-4 h-4" />
                    <span>View Public Site</span>
                  </Link>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleAddSection}
                className="btn-primary flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add Section</span>
              </button>
              <button
                onClick={() => handleAddPage()}
                className="btn-primary flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add Page</span>
              </button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* New Section Modal */}
        {showNewSectionModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-background border border-border rounded-lg max-w-md w-full p-6">
              <h2 className="text-2xl font-bold text-foreground mb-6">
                {sectionForm.parentId ? "Add Subsection" : "Add Section"}
              </h2>
              <form onSubmit={handleCreateSection} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Label <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={sectionForm.label}
                    onChange={(e) => {
                      const label = e.target.value;
                      const autoSlug = generateSlug(label);
                      setSectionForm({
                        ...sectionForm,
                        label,
                        // Auto-generate slug if slug is empty or matches previous auto-generated slug
                        slug:
                          !sectionForm.slug ||
                          sectionForm.slug === generateSlug(sectionForm.label)
                            ? autoSlug
                            : sectionForm.slug,
                      });
                    }}
                    className="w-full h-12 px-4 border border-border rounded-lg bg-input text-foreground"
                    placeholder="Getting Started"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Slug <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={sectionForm.slug}
                    onChange={(e) =>
                      setSectionForm({
                        ...sectionForm,
                        slug: generateSlug(e.target.value),
                      })
                    }
                    className={`w-full h-12 px-4 border rounded-lg bg-input text-foreground font-mono text-sm ${
                      sectionForm.slug && !isValidSlug(sectionForm.slug)
                        ? "border-destructive focus:ring-destructive"
                        : "border-border focus:ring-primary"
                    } focus:outline-none focus:ring-2`}
                    placeholder="getting-started"
                    pattern="[a-z0-9-]+"
                  />
                  {sectionForm.slug && !isValidSlug(sectionForm.slug) && (
                    <p className="mt-1 text-xs text-destructive">
                      {getSlugErrorMessage(sectionForm.slug)}
                    </p>
                  )}
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewSectionModal(false);
                      setError(null);
                    }}
                    className="btn-secondary"
                    disabled={creatingSection}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary flex items-center justify-center"
                    disabled={creatingSection}
                  >
                    {creatingSection ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Section"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* New Page Modal */}
        {showNewPageModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-background border border-border rounded-lg max-w-md w-full p-6">
              <h2 className="text-2xl font-bold text-foreground mb-6">
                Add New Page
              </h2>
              <form onSubmit={handleCreatePage} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Title <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={pageForm.title}
                    onChange={(e) => {
                      const title = e.target.value;
                      const autoSlug = generateSlug(title);
                      setPageForm({
                        ...pageForm,
                        title,
                        // Auto-generate slug if slug is empty or matches previous auto-generated slug
                        slug:
                          !pageForm.slug ||
                          pageForm.slug === generateSlug(pageForm.title)
                            ? autoSlug
                            : pageForm.slug,
                      });
                    }}
                    className="w-full h-12 px-4 border border-border rounded-lg bg-input text-foreground"
                    placeholder="Introduction"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Slug <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={pageForm.slug}
                    onChange={(e) =>
                      setPageForm({
                        ...pageForm,
                        slug: generateSlug(e.target.value),
                      })
                    }
                    className={`w-full h-12 px-4 border rounded-lg bg-input text-foreground font-mono text-sm ${
                      pageForm.slug && !isValidSlug(pageForm.slug)
                        ? "border-destructive focus:ring-destructive"
                        : "border-border focus:ring-primary"
                    } focus:outline-none focus:ring-2`}
                    placeholder="introduction"
                    pattern="[a-z0-9-]+"
                  />
                  {pageForm.slug && !isValidSlug(pageForm.slug) && (
                    <p className="mt-1 text-xs text-destructive">
                      {getSlugErrorMessage(pageForm.slug)}
                    </p>
                  )}
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewPageModal(false);
                      setError(null);
                    }}
                    className="btn-secondary"
                    disabled={creatingPage}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary flex items-center justify-center"
                    disabled={creatingPage}
                  >
                    {creatingPage ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Page"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Sections */}
        {(!doc.navHeaders || doc.navHeaders.length === 0) &&
        (!doc.pages || doc.pages.length === 0) ? (
          <div className="text-center py-16">
            <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              No content yet
            </h3>
            <p className="text-muted-foreground mb-6">
              Start by adding a section or page to organize your documentation
            </p>
            <div className="flex justify-center space-x-3">
              <button
                onClick={handleAddSection}
                className="btn-primary inline-flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add Section</span>
              </button>
              <button
                onClick={() => handleAddPage()}
                className="btn-primary inline-flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add Page</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Pages without sections */}
            {doc.pages && doc.pages.length > 0 && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-foreground mb-4">
                  Pages
                </h2>
                <div className="space-y-2">
                  {doc.pages.map((page) => (
                    <div
                      key={page.id}
                      className="flex items-center justify-between p-3 bg-muted/50 border border-border rounded-md hover:border-primary/50 transition-colors"
                    >
                      <div className="flex items-center space-x-3 flex-1">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <div className="flex-1">
                          <Link
                            href={`/dashboard/pages/${page.id}`}
                            className="font-medium text-foreground hover:text-primary flex items-center space-x-2 group"
                          >
                            <span>{page.title}</span>
                            <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </Link>
                          <p className="text-xs text-muted-foreground mt-1">
                            /{page.slug} • {page.status} • Click to edit content
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Link
                          href={`/dashboard/pages/${page.id}`}
                          className="btn-primary text-xs px-3 py-1.5 flex items-center space-x-1"
                          title="Edit Content"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Edit</span>
                        </Link>
                        {doc.isPublic && page.status === "published" && (
                          <Link
                            href={`/docs/${doc.slug}/${page.slug}`}
                            target="_blank"
                            className="p-2 text-muted-foreground hover:text-primary"
                            title="View Public"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                        )}
                        {/* Only show delete button to owner or admin (not editors) */}
                        {(profile.role === "admin" ||
                          doc.userId === profile.id) && (
                          <button
                            onClick={() =>
                              handleDeletePage(page.id, page.title)
                            }
                            className="p-2 text-destructive hover:bg-destructive/10 rounded"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sections */}
            {doc.navHeaders.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-4">
                  Sections
                </h2>
                <div className="space-y-4">
                  {doc.navHeaders.map((section) => renderSection(section))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
