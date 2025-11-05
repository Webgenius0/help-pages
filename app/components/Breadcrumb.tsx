"use client";

import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  showHome?: boolean;
}

export function Breadcrumb({ items, showHome = true }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center space-x-2 text-sm">
      {showHome && (
        <>
          <Link
            href="/cms"
            className="text-muted-foreground hover:text-foreground transition-colors flex items-center"
          >
            <Home className="w-4 h-4" />
          </Link>
          {items.length > 0 && (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          )}
        </>
      )}

      {items.map((item, index) => (
        <div key={index} className="flex items-center space-x-2">
          {item.href ? (
            <Link
              href={item.href}
              className="text-muted-foreground hover:text-foreground transition-colors truncate max-w-xs"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground font-medium truncate max-w-xs">
              {item.label}
            </span>
          )}

          {index < items.length - 1 && (
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          )}
        </div>
      ))}
    </nav>
  );
}

