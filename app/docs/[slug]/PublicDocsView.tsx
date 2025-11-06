"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BookOpen,
  FileText,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Menu,
  X,
} from "lucide-react";
import { DocTopbar } from "./DocTopbar";
import { LoadingSpinner } from "@/app/components/LoadingSpinner";

interface Page {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  position: number;
  docItemId?: string | null;
  navHeaderId?: string | null;
}

interface Subsection {
  id: string;
  label: string;
  slug: string;
  pages: Page[];
}

interface Section {
  id: string;
  label: string;
  slug: string;
  pages: Page[];
  subsections: Subsection[];
}

interface DocItem {
  id: string;
  label: string;
  slug: string;
  isDefault: boolean;
  description?: string | null;
  pages?: Page[];
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
  pages: Page[];
  navHeaders?: NavHeader[];
}

interface PublicDocsViewProps {
  doc: Doc;
  canEdit?: boolean;
  docId?: string;
}

function PublicDocsViewContent({
  doc,
  canEdit = false,
  docId,
}: PublicDocsViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Collect all items from all dropdowns
  const allItems: DocItem[] = [];
  doc.navHeaders?.forEach((dropdown) => {
    allItems.push(...(dropdown.items || []));
  });

  const [selectedDocItemId, setSelectedDocItemId] = useState<string | null>(
    () => {
      // Get from URL query param or default item
      const itemId = searchParams?.get("item");
      if (itemId) return itemId;
      const defaultItem = allItems.find((item) => item.isDefault);
      return defaultItem?.id || allItems[0]?.id || null;
    }
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

  // Get selected item with its pages and sections
  const selectedItem = selectedDocItemId
    ? allItems.find((item) => item.id === selectedDocItemId)
    : null;

  // Get pages and sections for selected item
  const itemPages = selectedItem?.pages || [];
  const itemSections = selectedItem?.sections || [];

  // Get first page to redirect or display (from item pages or first section)
  const firstPage = itemPages[0] || itemSections[0]?.pages?.[0];

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

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Topbar */}
      <DocTopbar
        docTitle={doc.title}
        docSlug={doc.slug}
        navHeaders={doc.navHeaders}
        selectedDocItemId={selectedDocItemId}
        onDocItemChange={handleDocItemChange}
        allItems={allItems}
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
        <aside
          className={`fixed lg:static inset-y-0 left-0 z-50 lg:z-auto w-72 sm:w-80 border-r border-border bg-background shrink-0 h-full overflow-y-auto transform transition-transform duration-300 ease-in-out ${
            isLeftSidebarOpen
              ? "translate-x-0"
              : "-translate-x-full lg:translate-x-0"
          }`}
        >
          {/* Mobile Close Button */}
          <div className="lg:hidden flex items-center justify-between p-4 border-b border-border">
            <span className="font-semibold text-foreground">Navigation</span>
            <button
              onClick={() => setIsLeftSidebarOpen(false)}
              className="p-2 hover:bg-muted rounded-md transition-colors"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-6">
            {/* Doc Description */}
            {doc.description && (
              <div className="mb-6 pb-4 border-b border-border/60">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {doc.description}
                </p>
              </div>
            )}

            {/* Pages and Sections Navigation */}
            {selectedItem ? (
              <nav className="space-y-1">
                {/* Pages directly in item */}
                {itemPages.length > 0 && (
                  <div className="mt-4 space-y-0.5">
                    {itemPages.map((page) => (
                      <Link
                        key={page.id}
                        href={`/docs/${doc.slug}/${page.slug}${
                          selectedDocItemId ? `?item=${selectedDocItemId}` : ""
                        }`}
                        onClick={() => setIsLeftSidebarOpen(false)}
                        className="group flex items-center px-3 py-1.5 text-sm text-foreground/70 hover:text-foreground hover:bg-muted/50 rounded-md transition-all duration-150"
                      >
                        <span className="line-clamp-1">{page.title}</span>
                      </Link>
                    ))}
                  </div>
                )}

                {/* Sections */}
                {itemSections.length > 0 && (
                  <div className="mt-6 space-y-1">
                    {itemSections.map((section) => {
                      const isSectionExpanded = expandedSections.has(
                        section.id
                      );
                      return (
                        <div key={section.id} className="space-y-0.5">
                          {/* Section Header - Clean Collapsible */}
                          <button
                            type="button"
                            onClick={() => toggleSection(section.id)}
                            className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-all duration-150 group"
                          >
                            <span className="flex-1 text-left">
                              {section.label}
                            </span>
                            {isSectionExpanded ? (
                              <ChevronUp className="w-4 h-4 shrink-0 ml-2 text-foreground/50 group-hover:text-foreground/70 transition-colors" />
                            ) : (
                              <ChevronDown className="w-4 h-4 shrink-0 ml-2 text-foreground/50 group-hover:text-foreground/70 transition-colors" />
                            )}
                          </button>
                          {/* Section Content - Pages and Subsections */}
                          {isSectionExpanded && (
                            <div className="mt-0.5 space-y-0.5 border-l border-border/40 pl-2.5">
                              {/* Pages in section */}
                              {section.pages.length > 0 && (
                                <>
                                  {section.pages.map((page) => (
                                    <Link
                                      key={page.id}
                                      href={`/docs/${doc.slug}/${page.slug}${
                                        selectedDocItemId
                                          ? `?item=${selectedDocItemId}`
                                          : ""
                                      }`}
                                      onClick={() =>
                                        setIsLeftSidebarOpen(false)
                                      }
                                      className="group flex items-center px-3 py-1.5 text-sm text-foreground/70 hover:text-foreground hover:bg-muted/50 rounded-md transition-all duration-150"
                                    >
                                      <span className="line-clamp-1">
                                        {page.title}
                                      </span>
                                    </Link>
                                  ))}
                                </>
                              )}
                              {/* Subsections */}
                              {section.subsections.length > 0 && (
                                <div className="mt-1 space-y-0.5">
                                  {section.subsections.map((subsection) => {
                                    const isSubsectionExpanded =
                                      expandedSubsections.has(subsection.id);
                                    return (
                                      <div
                                        key={subsection.id}
                                        className="space-y-0.5"
                                      >
                                        <button
                                          type="button"
                                          onClick={() =>
                                            toggleSubsection(subsection.id)
                                          }
                                          className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-medium text-foreground/80 hover:text-foreground hover:bg-muted/50 rounded-md transition-all duration-150 group"
                                        >
                                          <span className="flex-1 text-left">
                                            {subsection.label}
                                          </span>
                                          {isSubsectionExpanded ? (
                                            <ChevronUp className="w-3.5 h-3.5 shrink-0 ml-2 text-foreground/40 group-hover:text-foreground/60 transition-colors" />
                                          ) : (
                                            <ChevronDown className="w-3.5 h-3.5 shrink-0 ml-2 text-foreground/40 group-hover:text-foreground/60 transition-colors" />
                                          )}
                                        </button>
                                        {isSubsectionExpanded &&
                                          subsection.pages.length > 0 && (
                                            <div className="mt-0.5 space-y-0.5 border-l border-border/30 pl-2.5">
                                              {subsection.pages.map((page) => (
                                                <Link
                                                  key={page.id}
                                                  href={`/docs/${doc.slug}/${
                                                    page.slug
                                                  }${
                                                    selectedDocItemId
                                                      ? `?item=${selectedDocItemId}`
                                                      : ""
                                                  }`}
                                                  onClick={() =>
                                                    setIsLeftSidebarOpen(false)
                                                  }
                                                  className="group flex items-center px-3 py-1.5 text-sm text-foreground/65 hover:text-foreground hover:bg-muted/50 rounded-md transition-all duration-150"
                                                >
                                                  <span className="line-clamp-1">
                                                    {page.title}
                                                  </span>
                                                </Link>
                                              ))}
                                            </div>
                                          )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Empty state */}
                {itemPages.length === 0 && itemSections.length === 0 && (
                  <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                    No pages or sections found for this item.
                  </div>
                )}
              </nav>
            ) : (
              <nav className="space-y-1">
                <div className="text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-2 px-3">
                  Pages
                </div>
                <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                  Please select an item from the dropdown above.
                </div>
              </nav>
            )}

            {/* Manage Docs Button (for editors) */}
            {canEdit && docId && (
              <div className="mt-8 pt-6 border-t border-border">
                <Link
                  href={`/cms/docs/${docId}`}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 text-sm border border-border rounded-md hover:bg-muted transition-colors"
                >
                  <span>Manage Docs</span>
                </Link>
              </div>
            )}
          </div>
        </aside>

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
            <div className="prose prose-lg dark:prose-invert max-w-none">
              <h1 className="text-4xl font-bold text-foreground mb-4">
                {doc.title}
              </h1>
              {doc.description && (
                <p className="text-xl text-muted-foreground mb-8">
                  {doc.description}
                </p>
              )}

              {/* Get Started */}
              <div className="mt-8 sm:mt-10 md:mt-12">
                <h2 className="text-xl sm:text-2xl font-semibold text-foreground mb-3 sm:mb-4">
                  Getting Started
                </h2>
                <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6">
                  Select a page from the sidebar to start reading the
                  documentation.
                </p>

                {/* Quick Links */}
                {firstPage && (
                  <div className="mt-6">
                    <Link
                      href={`/docs/${doc.slug}/${firstPage.slug}${
                        selectedDocItemId ? `?item=${selectedDocItemId}` : ""
                      }`}
                      className="btn-primary inline-flex items-center space-x-2 px-6 py-3"
                    >
                      <span>Get Started</span>
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                )}

                {/* Quick Links Grid */}
                {selectedItem &&
                  (itemPages.length > 0 || itemSections.length > 0) && (
                    <div className="mt-12">
                      <h3 className="text-lg font-semibold text-foreground mb-4">
                        {selectedItem.label} Content
                      </h3>
                      {/* Pages */}
                      {itemPages.length > 0 && (
                        <div className="mb-6 sm:mb-8">
                          <h4 className="text-base sm:text-md font-medium text-foreground mb-3">
                            Pages
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            {itemPages.map((page) => (
                              <Link
                                key={page.id}
                                href={`/docs/${doc.slug}/${page.slug}${
                                  selectedDocItemId
                                    ? `?item=${selectedDocItemId}`
                                    : ""
                                }`}
                                className="group block p-6 bg-card border border-border rounded-lg hover:border-primary/50 hover:shadow-md transition-all"
                              >
                                <h4 className="font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                                  {page.title}
                                </h4>
                                {page.summary && (
                                  <p className="text-sm text-muted-foreground">
                                    {page.summary}
                                  </p>
                                )}
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}
                      {/* Sections */}
                      {itemSections.map((section) => {
                        // Collect all pages from section and subsections
                        const allSectionPages = [
                          ...section.pages,
                          ...section.subsections.flatMap(
                            (subsection) => subsection.pages
                          ),
                        ];

                        return (
                          <div key={section.id} className="mb-6 sm:mb-8">
                            <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-3 sm:mb-4 pb-2 border-b border-border/60">
                              {section.label}
                            </h3>

                            {/* All pages as links (from section and subsections) */}
                            {allSectionPages.length > 0 ? (
                              <ul className="space-y-2">
                                {allSectionPages.map((page) => (
                                  <li key={page.id}>
                                    <Link
                                      href={`/docs/${doc.slug}/${page.slug}${
                                        selectedDocItemId
                                          ? `?item=${selectedDocItemId}`
                                          : ""
                                      }`}
                                      className="group flex items-center gap-3 px-4 py-3 text-sm text-foreground/70 hover:text-foreground hover:bg-muted/50 rounded-md transition-all border border-transparent hover:border-border/50"
                                    >
                                      <FileText className="w-4 h-4 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
                                      <div className="flex-1 min-w-0">
                                        <span className="font-medium">
                                          {page.title}
                                        </span>
                                        {page.summary && (
                                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                            {page.summary}
                                          </p>
                                        )}
                                      </div>
                                      <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground group-hover:text-primary opacity-0 group-hover:opacity-100 transition-all" />
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-sm text-muted-foreground italic">
                                No pages available in this section.
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
              </div>
            </div>
          </div>
        </main>

        {/* Right Sidebar - Empty for homepage */}
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
          <div className="p-4 sm:p-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-xs font-semibold text-foreground/70 uppercase tracking-wider mb-4">
                  Quick Links
                </h3>
                <div className="space-y-2">
                  <Link
                    href={`/docs/${doc.slug}`}
                    className="block text-sm text-foreground/70 hover:text-foreground hover:bg-muted px-3 py-2 rounded-md transition-colors"
                  >
                    Documentation Home
                  </Link>
                  {firstPage && (
                    <Link
                      href={`/docs/${doc.slug}/${firstPage.slug}${
                        selectedDocItemId ? `?item=${selectedDocItemId}` : ""
                      }`}
                      className="block text-sm text-foreground/70 hover:text-foreground hover:bg-muted px-3 py-2 rounded-md transition-colors"
                    >
                      Getting Started
                    </Link>
                  )}
                </div>
              </div>

              {selectedItem && (
                <div>
                  <h3 className="text-xs font-semibold text-foreground/70 uppercase tracking-wider mb-4">
                    {selectedItem.label}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedItem.description ||
                      "Select a page from the sidebar to view its table of contents and additional information."}
                  </p>
                </div>
              )}

              {doc.description && (
                <div>
                  <h3 className="text-xs font-semibold text-foreground/70 uppercase tracking-wider mb-4">
                    About
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {doc.description}
                  </p>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export function PublicDocsView(props: PublicDocsViewProps) {
  return (
    <Suspense
      fallback={<LoadingSpinner fullScreen text="Loading documentation..." />}
    >
      <PublicDocsViewContent {...props} />
    </Suspense>
  );
}
