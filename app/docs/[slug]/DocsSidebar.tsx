"use client";

import Link from "next/link";
import { X, ChevronDown, ChevronUp, Edit } from "lucide-react";

interface Page {
  id: string;
  title: string;
  slug: string;
  position: number;
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

interface Doc {
  id: string;
  title: string;
  slug: string;
  description: string | null;
}

interface DocsSidebarProps {
  doc: Doc;
  selectedItem: DocItem | null;
  selectedDocItemId: string | null;
  expandedSections: Set<string>;
  expandedSubsections: Set<string>;
  onToggleSection: (sectionId: string) => void;
  onToggleSubsection: (subsectionId: string) => void;
  isLeftSidebarOpen: boolean;
  onCloseSidebar: () => void;
  currentPageId?: string | null;
  canEdit?: boolean;
  docId?: string | null;
  headerContent?: React.ReactNode;
}

export function DocsSidebar({
  doc,
  selectedItem,
  selectedDocItemId,
  expandedSections,
  expandedSubsections,
  onToggleSection,
  onToggleSubsection,
  isLeftSidebarOpen,
  onCloseSidebar,
  currentPageId,
  canEdit,
  docId,
  headerContent,
}: DocsSidebarProps) {
  const itemPages = selectedItem?.pages || [];
  const itemSections = selectedItem?.sections || [];

  const getPageLinkClass = (pageId: string) => {
    const isActive = currentPageId === pageId;
    return `group relative flex items-center px-3 py-1.5 text-sm rounded-md transition-all duration-150 ${
      isActive
        ? "bg-primary/10 text-primary font-medium before:absolute before:left-0 before:top-0 before:bottom-0 before:w-0.5 before:bg-primary before:rounded-r"
        : "text-foreground/70 hover:text-foreground hover:bg-muted/50"
    }`;
  };

  return (
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
          onClick={onCloseSidebar}
          className="p-2 hover:bg-muted rounded-md transition-colors"
          aria-label="Close sidebar"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="p-4 sm:p-6">
        {/* Header Content (doc description or page title) */}
        {headerContent}

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
                    onClick={onCloseSidebar}
                    className={getPageLinkClass(page.id)}
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
                  const isSectionExpanded = expandedSections.has(section.id);
                  return (
                    <div key={section.id} className="space-y-0.5">
                      {/* Section Header - Clean Collapsible */}
                      <button
                        type="button"
                        onClick={() => onToggleSection(section.id)}
                        className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-all duration-150 group"
                      >
                        <span className="flex-1 text-left">{section.label}</span>
                        {isSectionExpanded ? (
                          <ChevronUp className="w-4 h-4 shrink-0 ml-2 text-foreground/50 group-hover:text-foreground/70 transition-colors" />
                        ) : (
                          <ChevronDown className="w-4 h-4 shrink-0 ml-2 text-foreground/50 group-hover:text-foreground/70 transition-colors" />
                        )}
                      </button>
                      {/* Section Content - Pages and Subsections */}
                      {isSectionExpanded && (
                        <div className="ml-4 mt-0.5 space-y-0.5 border-l border-border/40 pl-4">
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
                                  onClick={onCloseSidebar}
                                  className={getPageLinkClass(page.id)}
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
                                        onToggleSubsection(subsection.id)
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
                                        <div className="ml-3 mt-0.5 space-y-0.5 border-l border-border/30 pl-3">
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
                                              onClick={onCloseSidebar}
                                              className={getPageLinkClass(page.id)}
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
              {currentPageId ? (
                <>
                  <Edit className="w-4 h-4" />
                  <span>Manage Docs</span>
                </>
              ) : (
                <span>Manage Docs</span>
              )}
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
}

