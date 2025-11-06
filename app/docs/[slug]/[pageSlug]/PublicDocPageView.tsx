"use client";

import Link from "next/link";
import { BookOpen, Edit, FileText, Menu, X } from "lucide-react";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import MarkdownRenderer from "@/app/u/[username]/[slug]/MarkdownRenderer";
import TableOfContents from "@/app/u/[username]/[slug]/TableOfContents";
import { Breadcrumbs } from "@/app/components/Breadcrumbs";
import { FeedbackWidget } from "@/app/components/FeedbackWidget";
import { DocTopbar } from "../DocTopbar";
import { DocsSidebar } from "../DocsSidebar";
import { LoadingSpinner } from "@/app/components/LoadingSpinner";

interface SidebarPage {
  id: string;
  title: string;
  slug: string;
  position: number;
  docItemId?: string | null;
  navHeaderId?: string | null;
}

interface Subsection {
  id: string;
  label: string;
  slug: string;
  pages: SidebarPage[];
}

interface Section {
  id: string;
  label: string;
  slug: string;
  pages: SidebarPage[];
  subsections: Subsection[];
}

interface DocItem {
  id: string;
  label: string;
  slug: string;
  isDefault: boolean;
  pages?: SidebarPage[];
  sections?: Section[];
}

interface NavHeader {
  id: string;
  label: string;
  slug: string;
  items: DocItem[];
}

interface Doc {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  pages: SidebarPage[];
  navHeaders?: NavHeader[];
}

interface Page {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  content: string;
  parent: {
    id: string;
    title: string;
    slug: string;
  } | null;
  children: Array<{
    id: string;
    title: string;
    slug: string;
    summary: string | null;
    position: number;
  }>;
}

interface PublicDocPageViewProps {
  doc: Doc;
  page: Page;
  canEdit?: boolean;
  docUserId?: string;
  selectedDocItemId?: string | null;
}

function extractHeadings(markdown: string) {
  const headingRegex = /^(#{1,3})\s+(.+)$/gm;
  const headings: { level: number; text: string; id: string }[] = [];
  let match;

  while ((match = headingRegex.exec(markdown)) !== null) {
    const level = match[1].length;
    const text = match[2];
    const id = text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    headings.push({ level, text, id });
  }

  return headings;
}

function PublicDocPageViewContent({
  doc,
  page,
  canEdit = false,
  docUserId,
  selectedDocItemId: initialSelectedDocItemId,
}: PublicDocPageViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedDocItemId, setSelectedDocItemId] = useState<string | null>(
    initialSelectedDocItemId || null
  );

  // Track expanded sections and subsections
  // Use sessionStorage to persist expanded state across navigation
  const getStoredExpandedSections = (): Set<string> => {
    if (typeof window === "undefined") return new Set();
    try {
      const stored = sessionStorage.getItem(`expandedSections_${doc.slug}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        return new Set(parsed);
      }
    } catch (e) {
      console.error("Error loading expanded sections:", e);
    }
    return new Set();
  };

  const getStoredExpandedSubsections = (): Set<string> => {
    if (typeof window === "undefined") return new Set();
    try {
      const stored = sessionStorage.getItem(`expandedSubsections_${doc.slug}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        return new Set(parsed);
      }
    } catch (e) {
      console.error("Error loading expanded subsections:", e);
    }
    return new Set();
  };

  const [expandedSections, setExpandedSections] = useState<Set<string>>(() =>
    getStoredExpandedSections()
  );
  const [expandedSubsections, setExpandedSubsections] = useState<Set<string>>(
    () => getStoredExpandedSubsections()
  );

  // Save expanded sections to sessionStorage whenever they change
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem(
          `expandedSections_${doc.slug}`,
          JSON.stringify(Array.from(expandedSections))
        );
      } catch (e) {
        console.error("Error saving expanded sections:", e);
      }
    }
  }, [expandedSections, doc.slug]);

  // Save expanded subsections to sessionStorage whenever they change
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem(
          `expandedSubsections_${doc.slug}`,
          JSON.stringify(Array.from(expandedSubsections))
        );
      } catch (e) {
        console.error("Error saving expanded subsections:", e);
      }
    }
  }, [expandedSubsections, doc.slug]);

  // Mobile sidebar state
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(false);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const toggleSubsection = (subsectionId: string) => {
    setExpandedSubsections((prev) => {
      const next = new Set(prev);
      if (next.has(subsectionId)) {
        next.delete(subsectionId);
      } else {
        next.add(subsectionId);
      }
      return next;
    });
  };

  // Collect all items from all dropdowns
  const allItems: DocItem[] = [];
  doc.navHeaders?.forEach((dropdown) => {
    allItems.push(...(dropdown.items || []));
  });

  // Get selected item with its pages and sections
  const selectedItem = selectedDocItemId
    ? allItems.find((item) => item.id === selectedDocItemId)
    : null;

  // Get pages and sections for selected item
  const itemPages = selectedItem?.pages || [];
  const itemSections = selectedItem?.sections || [];

  // Collect all pages from item (direct pages + pages in sections + pages in subsections)
  const allItemPages: SidebarPage[] = [];
  if (selectedItem) {
    allItemPages.push(...itemPages);
    itemSections.forEach((section) => {
      allItemPages.push(...section.pages);
      section.subsections.forEach((subsection) => {
        allItemPages.push(...subsection.pages);
      });
    });
  }

  // Extract sections (h2) and subsections (h3) from page content
  const allHeadings = extractHeadings(page.content);
  const sections = allHeadings.filter((h) => h.level === 2 || h.level === 3); // Only show h2 and h3 in TOC

  // Fetch doc ID for edit links
  const [docId, setDocId] = useState<string | null>(null);
  useEffect(() => {
    if (canEdit && doc.id) {
      setDocId(doc.id);
    }
  }, [canEdit, doc.id]);

  // Update URL when selection changes
  const handleDocItemChange = (itemId: string | null) => {
    setSelectedDocItemId(itemId);
    const params = new URLSearchParams(searchParams?.toString() || "");
    if (itemId) {
      params.set("item", itemId);
    } else {
      params.delete("item");
    }
    router.push(`?${params.toString()}`, { scroll: false });
  };

  // Collect all items from all dropdowns for topbar
  const allItemsForTopbar: DocItem[] = [];
  doc.navHeaders?.forEach((dropdown) => {
    allItemsForTopbar.push(...(dropdown.items || []));
  });

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Topbar */}
      <DocTopbar
        docTitle={doc.title}
        docSlug={doc.slug}
        navHeaders={doc.navHeaders}
        selectedDocItemId={selectedDocItemId}
        onDocItemChange={handleDocItemChange}
        allItems={allItemsForTopbar}
      />

      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile Overlay */}
        {(isLeftSidebarOpen || isRightSidebarOpen) && (
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => {
              setIsLeftSidebarOpen(false);
              setIsRightSidebarOpen(false);
            }}
          />
        )}

        {/* Left Sidebar - Pages Navigation */}
        <DocsSidebar
          doc={doc}
          selectedItem={selectedItem || null}
          selectedDocItemId={selectedDocItemId}
          expandedSections={expandedSections}
          expandedSubsections={expandedSubsections}
          onToggleSection={toggleSection}
          onToggleSubsection={toggleSubsection}
          isLeftSidebarOpen={isLeftSidebarOpen}
          onCloseSidebar={() => setIsLeftSidebarOpen(false)}
          currentPageId={page.id}
          canEdit={canEdit}
          docId={docId}
          headerContent={
            page.title ? (
              <div className="mb-6 pb-4 border-b border-border/60">
                <div className="text-sm font-medium text-foreground">
                  {page.title}
                </div>
              </div>
            ) : undefined
          }
        />

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 h-full overflow-y-auto">
          {/* Mobile Menu Button */}
          <div className="lg:hidden sticky top-0 z-30 bg-background border-b border-border px-4 py-3 flex items-center justify-between">
            <button
              onClick={() => setIsLeftSidebarOpen(true)}
              className="p-2 hover:bg-muted rounded-md transition-colors"
              aria-label="Open navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
            <button
              onClick={() => setIsRightSidebarOpen(true)}
              className="xl:hidden p-2 hover:bg-muted rounded-md transition-colors"
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
          <div className="px-4 sm:px-6 md:px-8 lg:px-12 py-8 md:py-12 lg:py-16">
            {/* Breadcrumbs and Edit Button */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8">
              <Breadcrumbs
                items={[
                  {
                    label: doc.title,
                    href: `/docs/${doc.slug}${
                      selectedDocItemId ? `?item=${selectedDocItemId}` : ""
                    }`,
                  },
                  ...(page.parent
                    ? [
                        {
                          label: page.parent.title,
                          href: `/docs/${doc.slug}/${page.parent.slug}`,
                        },
                      ]
                    : []),
                  { label: page.title },
                ]}
              />
              {canEdit && (
                <Link
                  href={`/cms/pages/${page.id}`}
                  className="flex items-center space-x-2 px-4 py-2 text-sm border border-border rounded-md hover:bg-muted transition-colors"
                >
                  <Edit className="w-4 h-4" />
                  <span>Edit Page</span>
                </Link>
              )}
            </div>

            {/* Page Content */}
            <article className="prose prose-sm sm:prose-base md:prose-lg dark:prose-invert max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-h1:text-2xl sm:prose-h1:text-3xl md:prose-h1:text-4xl prose-h2:text-xl sm:prose-h2:text-2xl md:prose-h2:text-3xl prose-h3:text-lg sm:prose-h3:text-xl md:prose-h3:text-2xl prose-h4:text-base sm:prose-h4:text-lg md:prose-h4:text-xl prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-p:leading-relaxed prose-li:leading-relaxed">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-4 sm:mb-6 mt-0!">
                {page.title}
              </h1>
              {page.summary && (
                <div className="text-base sm:text-lg text-muted-foreground mb-6 sm:mb-8 leading-relaxed">
                  {page.summary}
                </div>
              )}
              <div className="prose-content">
                <MarkdownRenderer content={page.content} />
              </div>
            </article>

            {/* Child Pages */}
            {page.children.length > 0 && (
              <div className="mt-12 sm:mt-16 border-t border-border pt-8 sm:pt-12">
                <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-4 sm:mb-6">
                  Related Pages
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {page.children.map((child) => (
                    <Link
                      key={child.id}
                      href={`/docs/${doc.slug}/${child.slug}`}
                      className="group block p-6 bg-card rounded-lg border border-border hover:border-primary/50 hover:shadow-md transition-all duration-200"
                    >
                      <h3 className="font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                        {child.title}
                      </h3>
                      {child.summary && (
                        <p className="text-sm text-muted-foreground">
                          {child.summary}
                        </p>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Right Sidebar - Table of Contents & Feedback */}
        <aside
          className={`fixed xl:static inset-y-0 right-0 z-50 xl:z-auto w-72 sm:w-80 border-l border-border bg-background shrink-0 h-full overflow-y-auto transform transition-transform duration-300 ease-in-out ${
            isRightSidebarOpen
              ? "translate-x-0"
              : "translate-x-full xl:translate-x-0"
          }`}
        >
          {/* Mobile Close Button */}
          <div className="lg:hidden flex items-center justify-between p-4 border-b border-border">
            <span className="font-semibold text-foreground">Quick Links</span>
            <button
              onClick={() => setIsRightSidebarOpen(false)}
              className="p-2 hover:bg-muted rounded-md transition-colors"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-4 sm:p-6 space-y-6">
            {/* Table of Contents - Sections and Subsections */}
            {sections.length > 0 ? (
              <div>
                <h3 className="text-xs font-semibold text-foreground/70 uppercase tracking-wider mb-4">
                  ON THIS PAGE
                </h3>
                <TableOfContents headings={sections} />
              </div>
            ) : (
              <div>
                <h3 className="text-xs font-semibold text-foreground/70 uppercase tracking-wider mb-4">
                  ON THIS PAGE
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  This page doesn't have headings yet. Headings (H2, H3) will
                  appear here automatically.
                </p>
              </div>
            )}

            {/* Feedback Widget */}
            <div className="pt-6 border-t border-border">
              <FeedbackWidget pageId={page.id} />
            </div>

            {/* Quick Navigation */}
            <div className="pt-6 border-t border-border">
              <h3 className="text-xs font-semibold text-foreground/70 uppercase tracking-wider mb-4">
                Quick Links
              </h3>
              <div className="space-y-2">
                <Link
                  href={`/docs/${doc.slug}${
                    selectedDocItemId ? `?item=${selectedDocItemId}` : ""
                  }`}
                  className="block text-sm text-foreground/70 hover:text-foreground hover:bg-muted px-3 py-2 rounded-md transition-colors"
                >
                  ← Back to Documentation
                </Link>
                {page.parent && (
                  <Link
                    href={`/docs/${doc.slug}/${page.parent.slug}`}
                    className="block text-sm text-foreground/70 hover:text-foreground hover:bg-muted px-3 py-2 rounded-md transition-colors"
                  >
                    ← {page.parent.title}
                  </Link>
                )}
              </div>
            </div>

            {/* Related Pages */}
            {page.children.length > 0 && (
              <div className="pt-6 border-t border-border">
                <h3 className="text-xs font-semibold text-foreground/70 uppercase tracking-wider mb-4">
                  Related Pages
                </h3>
                <div className="space-y-2">
                  {page.children.map((child) => (
                    <Link
                      key={child.id}
                      href={`/docs/${doc.slug}/${child.slug}`}
                      className="block text-sm text-foreground/70 hover:text-foreground hover:bg-muted px-3 py-2 rounded-md transition-colors"
                    >
                      {child.title}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

export function PublicDocPageView(props: PublicDocPageViewProps) {
  return (
    <Suspense fallback={<LoadingSpinner fullScreen text="Loading page..." />}>
      <PublicDocPageViewContent {...props} />
    </Suspense>
  );
}
