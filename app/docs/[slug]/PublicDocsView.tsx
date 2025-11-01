"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpen, FileText, ChevronRight } from "lucide-react";

interface Doc {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  pages: Array<{
    id: string;
    title: string;
    slug: string;
    summary: string | null;
    position: number;
  }>;
}

interface PublicDocsViewProps {
  doc: Doc;
  canEdit?: boolean;
  docId?: string;
}

export function PublicDocsView({
  doc,
  canEdit = false,
  docId,
}: PublicDocsViewProps) {
  // Get first page to redirect or display
  const firstPage = doc.pages[0];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Sidebar - Pages Navigation */}
      <aside className="w-64 border-r border-border bg-background shrink-0 overflow-y-auto h-screen sticky top-0">
        <div className="p-4">
          {/* Doc Title */}
          <div className="mb-6">
            <div className="flex items-center space-x-2 text-sm font-medium text-foreground/80 mb-2">
              <BookOpen className="w-4 h-4" />
              <span>{doc.title}</span>
            </div>
            {doc.description && (
              <p className="text-xs text-muted-foreground ml-6 mt-2">
                {doc.description}
              </p>
            )}
          </div>

          {/* Pages Navigation */}
          <nav className="space-y-1">
            <div className="text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-2 px-3">
              Pages
            </div>
            {doc.pages.map((page) => (
              <Link
                key={page.id}
                href={`/docs/${doc.slug}/${page.slug}`}
                className="block px-3 py-1.5 text-sm rounded-md transition-colors text-foreground/70 hover:text-foreground hover:bg-muted"
              >
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4 shrink-0" />
                  <span>{page.title}</span>
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
                <span>Manage Docs</span>
              </Link>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0">
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
                Select a page from the sidebar to start reading the documentation.
              </p>

              {/* Quick Links */}
              {firstPage && (
                <div className="mt-6">
                  <Link
                    href={`/docs/${doc.slug}/${firstPage.slug}`}
                    className="inline-flex items-center space-x-2 px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-medium"
                  >
                    <span>Get Started</span>
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              )}

              {/* Quick Links Grid */}
              {doc.pages.length > 0 && (
                <div className="mt-12">
                  <h3 className="text-lg font-semibold text-foreground mb-4">
                    All Pages
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {doc.pages.map((page) => (
                      <Link
                        key={page.id}
                        href={`/docs/${doc.slug}/${page.slug}`}
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
            </div>
          </div>
        </div>
      </main>

      {/* Right Sidebar - Empty for homepage */}
      <aside className="w-64 border-l border-border bg-background shrink-0" />
    </div>
  );
}
