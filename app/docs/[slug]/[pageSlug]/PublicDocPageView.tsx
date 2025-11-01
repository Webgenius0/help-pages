"use client";

import Link from "next/link";
import { BookOpen, Edit, FileText } from "lucide-react";
import { useState, useEffect } from "react";
import MarkdownRenderer from "@/app/u/[username]/[slug]/MarkdownRenderer";
import TableOfContents from "@/app/u/[username]/[slug]/TableOfContents";
import { Breadcrumbs } from "@/app/components/Breadcrumbs";
import { FeedbackWidget } from "@/app/components/FeedbackWidget";

interface Doc {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  pages: Array<{
    id: string;
    title: string;
    slug: string;
    position: number;
  }>;
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

export function PublicDocPageView({
  doc,
  page,
  canEdit = false,
  docUserId,
}: PublicDocPageViewProps) {
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

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Sidebar - Pages Navigation */}
      <aside className="w-64 border-r border-border bg-background shrink-0 overflow-y-auto h-screen sticky top-0">
        <div className="p-4">
          {/* Doc Title */}
          <div className="mb-6">
            <Link
              href={`/docs/${doc.slug}`}
              className="flex items-center space-x-2 text-sm font-medium text-foreground/80 hover:text-foreground transition-colors mb-2"
            >
              <BookOpen className="w-4 h-4" />
              <span>{doc.title}</span>
            </Link>
            {page.title && (
              <div className="ml-6 mt-2">
                <div className="text-sm font-medium text-primary">
                  {page.title}
                </div>
              </div>
            )}
          </div>

          {/* Pages Navigation */}
          <nav className="space-y-1">
            <div className="text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-2 px-3">
              Pages
            </div>
            {doc.pages.map((p) => (
              <Link
                key={p.id}
                href={`/docs/${doc.slug}/${p.slug}`}
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
          </nav>

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
      <main className="flex-1 min-w-0">
        <div className="max-w-4xl mx-auto px-8 py-12">
          {/* Breadcrumbs and Edit Button */}
          <div className="flex items-center justify-between mb-8">
            <Breadcrumbs
              items={[
                { label: doc.title, href: `/docs/${doc.slug}` },
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
      <aside className="w-64 border-l border-border bg-background shrink-0 overflow-y-auto h-screen sticky top-0">
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
  );
}
