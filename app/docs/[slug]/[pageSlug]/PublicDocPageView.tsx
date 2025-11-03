"use client";

import Link from "next/link";
import { BookOpen, Edit, FileText } from "lucide-react";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import MarkdownRenderer from "@/app/u/[username]/[slug]/MarkdownRenderer";
import TableOfContents from "@/app/u/[username]/[slug]/TableOfContents";
import { Breadcrumbs } from "@/app/components/Breadcrumbs";
import { FeedbackWidget } from "@/app/components/FeedbackWidget";
import { DocTopbar } from "../DocTopbar";

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

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Pages Navigation */}
        <aside className="w-64 border-r border-border bg-background shrink-0 h-full overflow-y-auto">
          <div className="p-4">
            {/* Current Page Title */}
            {page.title && (
              <div className="mb-6">
                <div className="text-sm font-medium text-primary">
                  {page.title}
                </div>
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
                    {itemPages.map((p) => (
                      <Link
                        key={p.id}
                        href={`/docs/${doc.slug}/${p.slug}${
                          selectedDocItemId ? `?item=${selectedDocItemId}` : ""
                        }`}
                        className={`block px-3 py-1.5 text-sm rounded-md transition-colors ${
                          p.id === page.id
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-foreground/70 hover:text-foreground hover:bg-muted"
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <FileText className="w-4 h-4 shrink-0" />
                          <span>{p.title}</span>
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
                            {section.pages.map((p) => (
                              <Link
                                key={p.id}
                                href={`/docs/${doc.slug}/${p.slug}${
                                  selectedDocItemId
                                    ? `?item=${selectedDocItemId}`
                                    : ""
                                }`}
                                className={`block px-3 py-1.5 text-sm rounded-md transition-colors ${
                                  p.id === page.id
                                    ? "bg-primary/10 text-primary font-medium"
                                    : "text-foreground/70 hover:text-foreground hover:bg-muted"
                                }`}
                              >
                                <div className="flex items-center space-x-2">
                                  <FileText className="w-4 h-4 shrink-0" />
                                  <span>{p.title}</span>
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
                                    {subsection.pages.map((p) => (
                                      <Link
                                        key={p.id}
                                        href={`/docs/${doc.slug}/${p.slug}${
                                          selectedDocItemId
                                            ? `?item=${selectedDocItemId}`
                                            : ""
                                        }`}
                                        className={`block px-3 py-1.5 text-sm rounded-md transition-colors ${
                                          p.id === page.id
                                            ? "bg-primary/10 text-primary font-medium"
                                            : "text-foreground/70 hover:text-foreground hover:bg-muted"
                                        }`}
                                      >
                                        <div className="flex items-center space-x-2">
                                          <FileText className="w-4 h-4 shrink-0" />
                                          <span>{p.title}</span>
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
                  <Edit className="w-4 h-4" />
                  <span>Manage Docs</span>
                </Link>
              </div>
            )}
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 h-full overflow-y-auto">
          <div className="max-w-4xl mx-auto px-8 py-12">
            {/* Breadcrumbs and Edit Button */}
            <div className="flex items-center justify-between mb-8">
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
                  href={`/dashboard/pages/${page.id}`}
                  className="flex items-center space-x-2 px-4 py-2 text-sm border border-border rounded-md hover:bg-muted transition-colors"
                >
                  <Edit className="w-4 h-4" />
                  <span>Edit Page</span>
                </Link>
              )}
            </div>

            {/* Page Content */}
            <article className="prose prose-lg dark:prose-invert max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-h1:text-4xl prose-h2:text-3xl prose-h3:text-2xl prose-h4:text-xl prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-pre:bg-muted prose-pre:border prose-pre:border-border">
              <h1 className="text-4xl font-bold text-foreground mb-6">
                {page.title}
              </h1>
              {page.summary && (
                <div className="text-lg text-muted-foreground mb-8">
                  {page.summary}
                </div>
              )}
              <MarkdownRenderer content={page.content} />
            </article>

            {/* Child Pages */}
            {page.children.length > 0 && (
              <div className="mt-16 border-t border-border pt-12">
                <h2 className="text-2xl font-bold text-foreground mb-6">
                  Related Pages
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        <aside className="w-64 border-l border-border bg-background shrink-0 h-full overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Feedback Widget */}
            <div>
              <FeedbackWidget pageId={page.id} />
            </div>

            {/* Table of Contents - Sections and Subsections */}
            {sections.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-foreground/70 uppercase tracking-wider mb-4">
                  ON THIS PAGE
                </h3>
                <TableOfContents headings={sections} />
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
    <Suspense
      fallback={
        <div className="h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading page...</p>
          </div>
        </div>
      }
    >
      <PublicDocPageViewContent {...props} />
    </Suspense>
  );
}
