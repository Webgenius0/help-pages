"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { BookOpen, FileText, ChevronRight } from "lucide-react";
import { DocTopbar } from "./DocTopbar";

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

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Pages Navigation */}
        <aside className="w-64 border-r border-border bg-background shrink-0 h-full overflow-y-auto">
          <div className="p-4">
            {/* Doc Description */}
            {doc.description && (
              <div className="mb-6">
                <p className="text-sm text-muted-foreground">
                  {doc.description}
                </p>
              </div>
            )}

            {/* Pages and Sections Navigation */}
            {selectedItem ? (
              <nav className="space-y-1">
                {/* Pages directly in item */}
                {itemPages.length > 0 && (
                  <>
                    <div className="text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-2 px-3 mt-4">
                      Pages
                    </div>
                    {itemPages.map((page) => (
                      <Link
                        key={page.id}
                        href={`/docs/${doc.slug}/${page.slug}${
                          selectedDocItemId ? `?item=${selectedDocItemId}` : ""
                        }`}
                        className="block px-3 py-1.5 text-sm rounded-md transition-colors text-foreground/70 hover:text-foreground hover:bg-muted"
                      >
                        <div className="flex items-center space-x-2">
                          <FileText className="w-4 h-4 shrink-0" />
                          <span>{page.title}</span>
                        </div>
                      </Link>
                    ))}
                  </>
                )}

                {/* Sections */}
                {itemSections.length > 0 && (
                  <>
                    <div className="text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-2 px-3 mt-4">
                      Sections
                    </div>
                    {itemSections.map((section) => (
                      <div key={section.id} className="mb-2">
                        {/* Section Header */}
                        <div className="px-3 py-1.5 text-xs font-medium text-foreground/80">
                          {section.label}
                        </div>
                        {/* Pages in section */}
                        {section.pages.length > 0 && (
                          <div className="ml-3 space-y-1">
                            {section.pages.map((page) => (
                              <Link
                                key={page.id}
                                href={`/docs/${doc.slug}/${page.slug}${
                                  selectedDocItemId
                                    ? `?item=${selectedDocItemId}`
                                    : ""
                                }`}
                                className="block px-3 py-1.5 text-sm rounded-md transition-colors text-foreground/70 hover:text-foreground hover:bg-muted"
                              >
                                <div className="flex items-center space-x-2">
                                  <FileText className="w-4 h-4 shrink-0" />
                                  <span>{page.title}</span>
                                </div>
                              </Link>
                            ))}
                          </div>
                        )}
                        {/* Subsections */}
                        {section.subsections.length > 0 && (
                          <div className="ml-3 space-y-2">
                            {section.subsections.map((subsection) => (
                              <div key={subsection.id}>
                                <div className="px-3 py-1 text-xs font-medium text-foreground/70">
                                  {subsection.label}
                                </div>
                                {subsection.pages.length > 0 && (
                                  <div className="ml-3 space-y-1">
                                    {subsection.pages.map((page) => (
                                      <Link
                                        key={page.id}
                                        href={`/docs/${doc.slug}/${page.slug}${
                                          selectedDocItemId
                                            ? `?item=${selectedDocItemId}`
                                            : ""
                                        }`}
                                        className="block px-3 py-1.5 text-sm rounded-md transition-colors text-foreground/70 hover:text-foreground hover:bg-muted"
                                      >
                                        <div className="flex items-center space-x-2">
                                          <FileText className="w-4 h-4 shrink-0" />
                                          <span>{page.title}</span>
                                        </div>
                                      </Link>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </>
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
                  href={`/dashboard/docs/${docId}`}
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
          <div className="max-w-4xl mx-auto px-8 py-12">
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
              <div className="mt-12">
                <h2 className="text-2xl font-semibold text-foreground mb-4">
                  Getting Started
                </h2>
                <p className="text-muted-foreground mb-6">
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
                      className="inline-flex items-center space-x-2 px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-medium"
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
                        <div className="mb-6">
                          <h4 className="text-md font-medium text-foreground mb-3">
                            Pages
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      {itemSections.map((section) => (
                        <div key={section.id} className="mb-6">
                          <h4 className="text-md font-medium text-foreground mb-3">
                            {section.label}
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {section.pages.map((page) => (
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
                          {/* Subsections */}
                          {section.subsections.map((subsection) => (
                            <div key={subsection.id} className="mt-4 ml-4">
                              <h5 className="text-sm font-medium text-foreground mb-2">
                                {subsection.label}
                              </h5>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {subsection.pages.map((page) => (
                                  <Link
                                    key={page.id}
                                    href={`/docs/${doc.slug}/${page.slug}${
                                      selectedDocItemId
                                        ? `?item=${selectedDocItemId}`
                                        : ""
                                    }`}
                                    className="group block p-4 bg-card border border-border rounded-lg hover:border-primary/50 hover:shadow-md transition-all"
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
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
              </div>
            </div>
          </div>
        </main>

        {/* Right Sidebar - Empty for homepage */}
        <aside className="w-64 border-l border-border bg-background shrink-0 h-full" />
      </div>
    </div>
  );
}

export function PublicDocsView(props: PublicDocsViewProps) {
  return (
    <Suspense
      fallback={
        <div className="h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading documentation...</p>
          </div>
        </div>
      }
    >
      <PublicDocsViewContent {...props} />
    </Suspense>
  );
}
