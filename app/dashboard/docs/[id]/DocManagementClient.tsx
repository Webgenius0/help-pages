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
  Settings,
} from "lucide-react";
import { generateSlug, isValidSlug, getSlugErrorMessage } from "@/lib/slug";

interface Profile {
  id: string;
  username: string;
  fullName: string | null;
  role: string;
}

interface Page {
  id: string;
  title: string;
  slug: string;
  status: string;
  position: number;
}

interface NavHeader {
  id: string;
  label: string;
  slug: string;
  position: number;
  docItems?: DocItem[]; // Items within this dropdown (if it's a top-level dropdown)
  pages?: Array<{
    id: string;
    title: string;
    slug: string;
    status: string;
    position: number;
  }>;
  children?: NavHeader[]; // Subsections (if this is a section within a DocItem)
}

interface DocItem {
  id: string;
  label: string;
  slug: string;
  description: string | null;
  position: number;
  isDefault: boolean;
  _count: {
    pages: number;
    sections: number;
  };
  pages?: Array<{
    id: string;
    title: string;
    slug: string;
    status: string;
    position: number;
  }>;
  sections?: NavHeader[]; // Sections within this DocItem
}

interface Doc {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  isPublic: boolean;
  userId?: string;
  navHeaders: NavHeader[]; // Top-level header dropdowns
  pages: Page[]; // Standalone pages (not in any dropdown/item)
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
  const [loading, setLoading] = useState(true);
  const [expandedDropdowns, setExpandedDropdowns] = useState<string[]>([]);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const [showNewDropdownModal, setShowNewDropdownModal] = useState(false);
  const [showNewDocItemModal, setShowNewDocItemModal] = useState(false);
  const [showNewSectionModal, setShowNewSectionModal] = useState(false);
  const [showNewPageModal, setShowNewPageModal] = useState(false);
  const [creatingDropdown, setCreatingDropdown] = useState(false);
  const [creatingDocItem, setCreatingDocItem] = useState(false);
  const [creatingSection, setCreatingSection] = useState(false);
  const [creatingPage, setCreatingPage] = useState(false);
  const [selectedNavHeaderId, setSelectedNavHeaderId] = useState<string | null>(
    null
  ); // For creating DocItems
  const [selectedDocItemId, setSelectedDocItemId] = useState<string | null>(
    null
  ); // For creating pages/sections
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [dropdownForm, setDropdownForm] = useState({
    label: "",
    slug: "",
  });
  const [docItemForm, setDocItemForm] = useState({
    label: "",
    slug: "",
    description: "",
  });
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
    loadDoc();
  }, [doc.id]);

  useEffect(() => {
    // Auto-expand first dropdown
    if (doc.navHeaders.length > 0 && expandedDropdowns.length === 0) {
      setExpandedDropdowns([doc.navHeaders[0].id]);
    }
  }, [doc.navHeaders, expandedDropdowns.length]);

  const loadDoc = async () => {
    try {
      setLoading(true);
      // Fetch top-level header dropdowns with their docItems
      const headersResponse = await fetch(
        `/api/nav-headers?docId=${encodeURIComponent(doc.id)}`
      );
      const headersData = await headersResponse.json();

      // For each header dropdown, fetch its docItems
      const navHeadersWithItems = await Promise.all(
        (headersData.headers || []).map(async (header: NavHeader) => {
          const itemsResponse = await fetch(
            `/api/doc-items?navHeaderId=${encodeURIComponent(header.id)}`
          );
          const itemsData = await itemsResponse.json();

          // For each docItem, fetch its pages and sections
          const itemsWithContent = await Promise.all(
            (itemsData.docItems || []).map(async (item: DocItem) => {
              // Fetch pages for this item
              const pagesResponse = await fetch(
                `/api/pages?docId=${encodeURIComponent(
                  doc.id
                )}&docItemId=${encodeURIComponent(item.id)}`
              );
              const pagesData = await pagesResponse.json();

              // Fetch sections for this item (NavHeaders with docItemId set)
              const sectionsResponse = await fetch(
                `/api/nav-headers?docId=${encodeURIComponent(
                  doc.id
                )}&docItemId=${encodeURIComponent(item.id)}`
              );
              const sectionsData = await sectionsResponse.json();

              return {
                ...item,
                pages: pagesData.pages || [],
                sections: sectionsData.headers || [],
              };
            })
          );

          return {
            ...header,
            docItems: itemsWithContent,
          };
        })
      );

      const updatedDoc = {
        ...doc,
        navHeaders: navHeadersWithItems,
      };
      setDoc(updatedDoc);
      setError(null);
    } catch (error) {
      console.error("Failed to load doc:", error);
      setError("Failed to load documentation");
    } finally {
      setLoading(false);
    }
  };

  const handleAddDropdown = () => {
    setDropdownForm({ label: "", slug: "" });
    setShowNewDropdownModal(true);
  };

  const handleCreateDropdown = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!dropdownForm.label.trim()) {
      setError("Label is required");
      return;
    }

    const normalizedSlug = generateSlug(
      dropdownForm.slug || dropdownForm.label
    );
    if (!isValidSlug(normalizedSlug)) {
      const errorMsg = getSlugErrorMessage(normalizedSlug);
      setError(errorMsg || "Invalid slug format");
      return;
    }

    try {
      setCreatingDropdown(true);
      await new Promise((resolve) => setTimeout(resolve, 50));

      const response = await fetch(
        `/api/nav-headers?docId=${encodeURIComponent(doc.id)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            label: dropdownForm.label,
            slug: normalizedSlug,
            docId: doc.id,
            parentId: null, // Top-level dropdown
            docItemId: null, // Not a section within a DocItem
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create dropdown");
      }

      await loadDoc();
      setShowNewDropdownModal(false);
      setDropdownForm({ label: "", slug: "" });
    } catch (err: any) {
      setError(err.message || "Failed to create dropdown");
    } finally {
      setCreatingDropdown(false);
    }
  };

  const handleAddDocItem = (navHeaderId: string) => {
    setDocItemForm({ label: "", slug: "", description: "" });
    setSelectedNavHeaderId(navHeaderId);
    setShowNewDocItemModal(true);
  };

  const handleCreateDocItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!docItemForm.label.trim() || !selectedNavHeaderId) {
      setError("Label and dropdown are required");
      return;
    }

    const normalizedSlug = generateSlug(docItemForm.slug || docItemForm.label);
    if (!isValidSlug(normalizedSlug)) {
      const errorMsg = getSlugErrorMessage(normalizedSlug);
      setError(errorMsg || "Invalid slug format");
      return;
    }

    try {
      setCreatingDocItem(true);
      await new Promise((resolve) => setTimeout(resolve, 50));

      const response = await fetch("/api/doc-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          navHeaderId: selectedNavHeaderId,
          label: docItemForm.label,
          slug: normalizedSlug,
          description: docItemForm.description || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create item");
      }

      await loadDoc();
      setShowNewDocItemModal(false);
      setDocItemForm({ label: "", slug: "", description: "" });
      setSelectedNavHeaderId(null);
    } catch (err: any) {
      setError(err.message || "Failed to create item");
    } finally {
      setCreatingDocItem(false);
    }
  };

  const handleAddSection = (docItemId: string, parentId?: string) => {
    setSectionForm({ label: "", slug: "", parentId: parentId || null });
    setSelectedDocItemId(docItemId);
    setSelectedSectionId(parentId || null);
    setShowNewSectionModal(true);
  };

  const handleCreateSection = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!sectionForm.label.trim() || !selectedDocItemId) {
      setError("Label and item are required");
      return;
    }

    const normalizedSlug = generateSlug(sectionForm.slug || sectionForm.label);
    if (!isValidSlug(normalizedSlug)) {
      const errorMsg = getSlugErrorMessage(normalizedSlug);
      setError(errorMsg || "Invalid slug format");
      return;
    }

    try {
      setCreatingSection(true);
      await new Promise((resolve) => setTimeout(resolve, 50));

      const response = await fetch(
        `/api/nav-headers?docId=${encodeURIComponent(doc.id)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            label: sectionForm.label,
            slug: normalizedSlug,
            docId: doc.id,
            docItemId: selectedDocItemId,
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
      setSelectedDocItemId(null);
    } catch (err: any) {
      setError(err.message || "Failed to create section");
    } finally {
      setCreatingSection(false);
    }
  };

  const handleAddPage = (docItemId: string, sectionId?: string) => {
    setPageForm({ title: "", slug: "", navHeaderId: sectionId || null });
    setSelectedDocItemId(docItemId);
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
      await new Promise((resolve) => setTimeout(resolve, 50));

      const response = await fetch("/api/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: pageForm.title,
          slug: generateSlug(pageForm.slug || pageForm.title),
          docId: doc.id,
          docItemId: selectedDocItemId, // Required - page must belong to a DocItem
          navHeaderId: pageForm.navHeaderId, // Optional - section within the DocItem
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

  const handleDeleteDocItem = async (itemId: string, label: string) => {
    if (
      !confirm(
        `Are you sure you want to delete "${label}"? All pages and sections in this item will be deleted.`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/doc-items/${itemId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await loadDoc();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to delete item");
      }
    } catch (error) {
      console.error("Failed to delete item:", error);
      alert("Failed to delete item");
    }
  };

  const handleDeleteDropdown = async (dropdownId: string, label: string) => {
    if (
      !confirm(
        `Are you sure you want to delete "${label}"? All items, pages and sections in this dropdown will be deleted.`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(
        `/api/nav-headers?id=${encodeURIComponent(dropdownId)}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        await loadDoc();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to delete dropdown");
      }
    } catch (error) {
      console.error("Failed to delete dropdown:", error);
      alert("Failed to delete dropdown");
    }
  };

  const toggleDropdown = (dropdownId: string) => {
    setExpandedDropdowns((prev) =>
      prev.includes(dropdownId)
        ? prev.filter((id) => id !== dropdownId)
        : [...prev, dropdownId]
    );
  };

  const toggleItem = (itemId: string) => {
    setExpandedItems((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId]
    );
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) =>
      prev.includes(sectionId)
        ? prev.filter((id) => id !== sectionId)
        : [...prev, sectionId]
    );
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

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div className="flex-1">
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
                onClick={handleAddDropdown}
                className="btn-primary flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add Dropdown</span>
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

        {/* New Dropdown Modal */}
        {showNewDropdownModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-background border border-border rounded-lg max-w-md w-full p-6">
              <h2 className="text-2xl font-bold text-foreground mb-6">
                Add New Dropdown
              </h2>
              <form onSubmit={handleCreateDropdown} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Label <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={dropdownForm.label}
                    onChange={(e) => {
                      const label = e.target.value;
                      const autoSlug = generateSlug(label);
                      setDropdownForm({
                        ...dropdownForm,
                        label,
                        slug:
                          !dropdownForm.slug ||
                          dropdownForm.slug === generateSlug(dropdownForm.label)
                            ? autoSlug
                            : dropdownForm.slug,
                      });
                    }}
                    className="w-full h-12 px-4 border border-border rounded-lg bg-input text-foreground"
                    placeholder="Products, Build, Manage"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Slug <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={dropdownForm.slug}
                    onChange={(e) =>
                      setDropdownForm({
                        ...dropdownForm,
                        slug: generateSlug(e.target.value),
                      })
                    }
                    className={`w-full h-12 px-4 border rounded-lg bg-input text-foreground font-mono text-sm ${
                      dropdownForm.slug && !isValidSlug(dropdownForm.slug)
                        ? "border-destructive focus:ring-destructive"
                        : "border-border focus:ring-primary"
                    } focus:outline-none focus:ring-2`}
                    placeholder="products"
                    pattern="[a-z0-9-]+"
                  />
                  {dropdownForm.slug && !isValidSlug(dropdownForm.slug) && (
                    <p className="mt-1 text-xs text-destructive">
                      {getSlugErrorMessage(dropdownForm.slug)}
                    </p>
                  )}
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewDropdownModal(false);
                      setError(null);
                    }}
                    className="btn-secondary"
                    disabled={creatingDropdown}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary flex items-center justify-center"
                    disabled={creatingDropdown}
                  >
                    {creatingDropdown ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Dropdown"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* New Doc Item Modal */}
        {showNewDocItemModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-background border border-border rounded-lg max-w-md w-full p-6">
              <h2 className="text-2xl font-bold text-foreground mb-6">
                Add New Item
              </h2>
              <form onSubmit={handleCreateDocItem} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Label <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={docItemForm.label}
                    onChange={(e) => {
                      const label = e.target.value;
                      const autoSlug = generateSlug(label);
                      setDocItemForm({
                        ...docItemForm,
                        label,
                        // Auto-generate slug if slug is empty or matches previous auto-generated slug
                        slug:
                          !docItemForm.slug ||
                          docItemForm.slug === generateSlug(docItemForm.label)
                            ? autoSlug
                            : docItemForm.slug,
                      });
                    }}
                    className="w-full h-12 px-4 border border-border rounded-lg bg-input text-foreground"
                    placeholder="v1.0, Stable, Beta"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Slug <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={docItemForm.slug}
                    onChange={(e) =>
                      setDocItemForm({
                        ...docItemForm,
                        slug: generateSlug(e.target.value),
                      })
                    }
                    className={`w-full h-12 px-4 border rounded-lg bg-input text-foreground font-mono text-sm ${
                      docItemForm.slug && !isValidSlug(docItemForm.slug)
                        ? "border-destructive focus:ring-destructive"
                        : "border-border focus:ring-primary"
                    } focus:outline-none focus:ring-2`}
                    placeholder="v1-0"
                    pattern="[a-z0-9-]+"
                  />
                  {docItemForm.slug && !isValidSlug(docItemForm.slug) && (
                    <p className="mt-1 text-xs text-destructive">
                      {getSlugErrorMessage(docItemForm.slug)}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Description (optional)
                  </label>
                  <textarea
                    value={docItemForm.description}
                    onChange={(e) =>
                      setDocItemForm({
                        ...docItemForm,
                        description: e.target.value,
                      })
                    }
                    rows={3}
                    className="w-full px-4 py-2 border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    placeholder="Brief description of this version/item..."
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewDocItemModal(false);
                      setError(null);
                    }}
                    className="btn-secondary"
                    disabled={creatingDocItem}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary flex items-center justify-center"
                    disabled={creatingDocItem}
                  >
                    {creatingDocItem ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Item"
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

        {/* Header Dropdowns */}
        {loading ? (
          <div className="text-center py-16">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              <p className="text-muted-foreground">
                Loading documentation structure...
              </p>
            </div>
          </div>
        ) : !doc.navHeaders || doc.navHeaders.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              No dropdowns yet
            </h3>
            <p className="text-muted-foreground mb-6">
              Start by adding a header dropdown (like "Products", "Build",
              "Manage") to organize your documentation
            </p>
            <button
              onClick={handleAddDropdown}
              className="btn-primary inline-flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Dropdown</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {doc.navHeaders.map((dropdown) => {
              const isExpanded = expandedDropdowns.includes(dropdown.id);
              const hasItems =
                dropdown.docItems && dropdown.docItems.length > 0;

              return (
                <div key={dropdown.id} className="mb-6">
                  {/* Dropdown Header */}
                  <div className="flex items-center justify-between p-4 bg-card border border-border rounded-lg">
                    <div className="flex items-center space-x-3 flex-1">
                      {hasItems && (
                        <button
                          onClick={() => toggleDropdown(dropdown.id)}
                          className="p-1 hover:bg-accent rounded"
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </button>
                      )}
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <BookOpen className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-foreground">
                          {dropdown.label}
                        </h2>
                        <p className="text-xs text-muted-foreground">
                          /{dropdown.slug}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleAddDocItem(dropdown.id)}
                        className="btn-secondary text-sm flex items-center space-x-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Item</span>
                      </button>
                      {(profile.role === "admin" ||
                        doc.userId === profile.id) && (
                        <button
                          onClick={() =>
                            handleDeleteDropdown(dropdown.id, dropdown.label)
                          }
                          className="p-2 text-destructive hover:bg-destructive/10 rounded"
                          title="Delete Dropdown"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Dropdown Items */}
                  {isExpanded && hasItems && (
                    <div className="mt-4 ml-6 space-y-4">
                      {dropdown.docItems!.map((item) => {
                        const isItemExpanded = expandedItems.includes(item.id);
                        const hasContent =
                          (item.pages && item.pages.length > 0) ||
                          (item.sections && item.sections.length > 0);

                        return (
                          <div
                            key={item.id}
                            className="border-l-2 border-border pl-4"
                          >
                            {/* Item Header */}
                            <div className="flex items-center justify-between p-3 bg-muted/30 border border-border rounded-md">
                              <div className="flex items-center space-x-3 flex-1">
                                {hasContent && (
                                  <button
                                    onClick={() => toggleItem(item.id)}
                                    className="p-1 hover:bg-accent rounded"
                                  >
                                    {isItemExpanded ? (
                                      <ChevronDown className="w-4 h-4" />
                                    ) : (
                                      <ChevronRight className="w-4 h-4" />
                                    )}
                                  </button>
                                )}
                                <div className="w-8 h-8 bg-primary/10 rounded flex items-center justify-center">
                                  <FileText className="w-4 h-4 text-primary" />
                                </div>
                                <div>
                                  <h3 className="font-medium text-foreground">
                                    {item.label}
                                  </h3>
                                  <p className="text-xs text-muted-foreground">
                                    {item._count.pages} pages,{" "}
                                    {item._count.sections} sections
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => handleAddPage(item.id)}
                                  className="btn-secondary text-xs flex items-center space-x-1"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>Page</span>
                                </button>
                                <button
                                  onClick={() => handleAddSection(item.id)}
                                  className="btn-secondary text-xs flex items-center space-x-1"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>Section</span>
                                </button>
                                {(profile.role === "admin" ||
                                  doc.userId === profile.id) && (
                                  <button
                                    onClick={() =>
                                      handleDeleteDocItem(item.id, item.label)
                                    }
                                    className="p-2 text-destructive hover:bg-destructive/10 rounded"
                                    title="Delete Item"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Item Content: Pages and Sections */}
                            {isItemExpanded && (
                              <div className="mt-2 ml-4 space-y-2">
                                {/* Pages in Item */}
                                {item.pages && item.pages.length > 0 && (
                                  <div className="space-y-2">
                                    {item.pages.map((page) => (
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
                                              /{page.slug} • {page.status}
                                            </p>
                                          </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                          <Link
                                            href={`/dashboard/pages/${page.id}`}
                                            className="btn-primary text-xs px-3 py-1.5 flex items-center space-x-1"
                                          >
                                            <Edit2 className="w-3 h-3" />
                                            <span>Edit</span>
                                          </Link>
                                          {doc.isPublic &&
                                            page.status === "published" && (
                                              <Link
                                                href={`/docs/${doc.slug}/${page.slug}`}
                                                target="_blank"
                                                className="p-2 text-muted-foreground hover:text-primary"
                                                title="View Public"
                                              >
                                                <Eye className="w-4 h-4" />
                                              </Link>
                                            )}
                                          {(profile.role === "admin" ||
                                            doc.userId === profile.id) && (
                                            <button
                                              onClick={() =>
                                                handleDeletePage(
                                                  page.id,
                                                  page.title
                                                )
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
                                )}

                                {/* Sections in Item */}
                                {item.sections && item.sections.length > 0 && (
                                  <div className="space-y-2">
                                    {item.sections.map((section) => {
                                      const isSectionExpanded =
                                        expandedSections.includes(section.id);
                                      const sectionHasPages =
                                        section.pages &&
                                        section.pages.length > 0;

                                      return (
                                        <div
                                          key={section.id}
                                          className="border-l-2 border-primary/20 pl-3"
                                        >
                                          <div className="flex items-center justify-between p-2 bg-card border border-border rounded">
                                            <div className="flex items-center space-x-2 flex-1">
                                              {sectionHasPages && (
                                                <button
                                                  onClick={() =>
                                                    toggleSection(section.id)
                                                  }
                                                  className="p-1 hover:bg-accent rounded"
                                                >
                                                  {isSectionExpanded ? (
                                                    <ChevronDown className="w-3 h-3" />
                                                  ) : (
                                                    <ChevronRight className="w-3 h-3" />
                                                  )}
                                                </button>
                                              )}
                                              <span className="text-sm font-medium text-foreground">
                                                {section.label}
                                              </span>
                                            </div>
                                            <button
                                              onClick={() =>
                                                handleAddPage(
                                                  item.id,
                                                  section.id
                                                )
                                              }
                                              className="btn-secondary text-xs px-2 py-1"
                                            >
                                              <Plus className="w-3 h-3" />
                                            </button>
                                          </div>
                                          {isSectionExpanded &&
                                            sectionHasPages && (
                                              <div className="mt-2 ml-4 space-y-2">
                                                {section.pages!.map((page) => (
                                                  <div
                                                    key={page.id}
                                                    className="flex items-center justify-between p-2 bg-muted/50 border border-border rounded hover:border-primary/50 transition-colors"
                                                  >
                                                    <Link
                                                      href={`/dashboard/pages/${page.id}`}
                                                      className="text-sm font-medium text-foreground hover:text-primary flex-1"
                                                    >
                                                      {page.title}
                                                    </Link>
                                                    <Link
                                                      href={`/dashboard/pages/${page.id}`}
                                                      className="btn-primary text-xs px-2 py-1"
                                                    >
                                                      Edit
                                                    </Link>
                                                  </div>
                                                ))}
                                              </div>
                                            )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}

                                {/* Empty State for Item */}
                                {(!item.pages || item.pages.length === 0) &&
                                  (!item.sections ||
                                    item.sections.length === 0) && (
                                    <p className="text-xs text-muted-foreground italic pl-3">
                                      No pages or sections yet. Add a page or
                                      section to get started.
                                    </p>
                                  )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Empty State for Dropdown */}
                  {isExpanded &&
                    (!hasItems || dropdown.docItems!.length === 0) && (
                      <div className="mt-4 ml-6 text-sm text-muted-foreground italic">
                        No items yet. Click "Add Item" to create an item in this
                        dropdown.
                      </div>
                    )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
