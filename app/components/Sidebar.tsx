"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  BookOpen,
  Home,
  FileText,
  Settings,
  Users,
  ChevronRight,
  ChevronDown,
  Plus,
  Edit3,
} from "lucide-react";

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: NavItem[];
}

interface PublicPage {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  parentId: string | null;
  navHeaderId: string | null;
  position: number;
  user?: {
    username: string;
  };
  navHeader?: {
    id: string;
    label: string;
    slug: string;
  };
}

export function Sidebar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [publicPages, setPublicPages] = useState<
    Record<string, { header: any; pages: PublicPage[] }>
  >({});
  const [userRole, setUserRole] = useState<string | null>(null);

  // Don't show sidebar on public docs routes (/u/*) - they have their own layout
  if (pathname?.startsWith("/u/")) {
    return null;
  }

  // Determine if we're in CMS mode (dashboard routes) or public docs mode
  const isCMSMode = pathname?.startsWith("/dashboard");

  // Load user role
  useEffect(() => {
    const loadUserRole = async () => {
      if (session?.user?.email) {
        try {
          const response = await fetch("/api/auth/profile");
          if (response.ok) {
            const data = await response.json();
            setUserRole(data.profile?.role || null);
          }
        } catch (error) {
          console.error("Failed to load user role:", error);
        }
      }
    };

    if (status === "authenticated") {
      loadUserRole();
    }
  }, [session, status]);

  // Note: Nav headers are now doc-specific, so they're loaded per doc in doc management pages
  // The sidebar in CMS mode no longer loads all nav headers
  // This was removed because nav-headers now belong to specific docs and require docId

  // Load public pages for documentation view (viewers/public)
  useEffect(() => {
    if (isCMSMode) return; // Don't load public pages in CMS mode

    const loadPublicPages = async () => {
      try {
        const response = await fetch("/api/pages/public");
        if (response.ok) {
          const data = await response.json();
          setPublicPages(data.pages || {});
        }
      } catch (error) {
        console.error("Failed to load public pages:", error);
      }
    };

    loadPublicPages();
  }, [isCMSMode]);

  const toggleExpanded = (itemId: string) => {
    setExpandedItems((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId]
    );
  };

  // Build CMS navigation items (for admin/editors)
  const cmsNavItems: NavItem[] = [
    {
      id: "dashboard",
      label: "Dashboard",
      href: "/dashboard",
      icon: Home,
    },
    // Removed "Pages" item - dashboard already shows all pages and categories
    // No need to duplicate navigation
    ...(userRole === "admin"
      ? [
          {
            id: "users",
            label: "User Management",
            href: "/dashboard/users",
            icon: Users,
          },
        ]
      : []),
    {
      id: "settings",
      label: "Settings",
      href: "/dashboard/settings",
      icon: Settings,
    },
  ];

  // Build public documentation navigation (like Supabase docs)
  const buildPublicDocsNav = (): NavItem[] => {
    const items: NavItem[] = [];

    // Organize pages by header
    Object.entries(publicPages).forEach(([headerKey, group]) => {
      if (group.pages.length === 0) return;

      // Group pages by parent
      const topLevelPages = group.pages.filter((p) => !p.parentId);
      const childPagesMap = group.pages.reduce((acc, page) => {
        if (page.parentId) {
          if (!acc[page.parentId]) acc[page.parentId] = [];
          acc[page.parentId].push(page);
        }
        return acc;
      }, {} as Record<string, PublicPage[]>);

      // Build children for each top-level page
      const buildPageItem = (page: PublicPage): NavItem => {
        const children = childPagesMap[page.id] || [];
        const username = page.user?.username || "unknown";
        return {
          id: page.id,
          label: page.title,
          href: `/u/${username}/${page.slug}`, // Public docs URL format: /u/username/slug
          icon: FileText,
          children:
            children.length > 0
              ? children
                  .sort((a, b) => a.position - b.position)
                  .map(buildPageItem)
              : undefined,
        };
      };

      // Create header item with pages as children
      if (group.header) {
        // Get username from first page in group
        const username = topLevelPages[0]?.user?.username || "unknown";
        items.push({
          id: group.header.id,
          label: group.header.label,
          href: `/u/${username}`, // Link to user's docs home
          icon: BookOpen,
          children: topLevelPages
            .sort((a, b) => a.position - b.position)
            .map(buildPageItem),
        });
      } else {
        // Pages without header
        topLevelPages
          .sort((a, b) => a.position - b.position)
          .forEach((page) => {
            items.push(buildPageItem(page));
          });
      }
    });

    return items;
  };

  const publicDocsNavItems = buildPublicDocsNav();
  const navItems = isCMSMode ? cmsNavItems : publicDocsNavItems;

  const isActive = (href: string, item: NavItem) => {
    const pathnameWithoutQuery = pathname.split("?")[0];
    const hrefWithoutQuery = href.split("?")[0];

    // Special case: If we're on /dashboard, only mark "Dashboard" as active
    // Don't mark "Pages" or any of its children as active
    if (pathnameWithoutQuery === "/dashboard") {
      return item.id === "dashboard";
    }

    // For exact matches, check if it's actually this item
    if (pathnameWithoutQuery === hrefWithoutQuery || pathname === href) {
      // Don't mark "Pages" as active if we're on /dashboard
      if (pathnameWithoutQuery === "/dashboard" && item.id !== "dashboard") {
        return false;
      }
      return true;
    }

    // If this item has children, check if any child is active
    if (item.children && item.children.length > 0) {
      // Special case: Don't check children if we're on /dashboard
      if (pathnameWithoutQuery === "/dashboard") {
        return false;
      }

      const anyChildActive = item.children.some((child) => {
        const childHrefWithoutQuery = child.href.split("?")[0];
        // Check if child matches current pathname
        return (
          pathnameWithoutQuery === childHrefWithoutQuery ||
          pathname.startsWith(childHrefWithoutQuery + "/")
        );
      });

      // If a child is active, parent should be active too (for visual hierarchy)
      // But only if we're not on /dashboard
      if (anyChildActive) {
        return true;
      }
    }

    // For items without children, don't match subpaths
    // This prevents /dashboard from being active when on /dashboard/settings
    return false;
  };

  // Removed auto-expand for Pages since it no longer has children

  const renderNavItem = (item: NavItem, level = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.id);
    const active = isActive(item.href, item);

    return (
      <div key={item.id}>
        <div className="flex items-center">
          <Link
            href={item.href}
            prefetch={true}
            className={`flex items-center flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              active
                ? "bg-primary text-primary-foreground"
                : "text-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
            style={{ paddingLeft: `${12 + level * 16}px` }}
          >
            <item.icon className="w-4 h-4 mr-3 shrink-0" />
            <span className="truncate">{item.label}</span>
          </Link>

          {hasChildren && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleExpanded(item.id);
              }}
              className="p-1 hover:bg-accent rounded-md transition-colors ml-1"
              aria-label={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          )}
        </div>

        {hasChildren && isExpanded && item.children && (
          <div className="mt-1 space-y-1">
            {item.children.map((child) => renderNavItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className="docs-sidebar">
      <div className="flex flex-col h-full">
        {/* Sidebar Header */}
        <div className="p-6 border-b border-sidebar-border">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-sidebar-foreground">
                HelpPages
              </h2>
              <p className="text-xs text-sidebar-foreground/70">
                {isCMSMode ? "CMS Dashboard" : "Documentation"}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Actions - Only in CMS mode for admin/editors */}
        {isCMSMode && (userRole === "admin" || userRole === "editor") && (
          <div className="p-4 border-b border-sidebar-border">
            <Link
              href="/dashboard/pages/new"
              prefetch={true}
              className="btn-primary w-full flex items-center justify-center space-x-2 text-sm"
            >
              <Plus className="w-4 h-4" />
              <span>New Page</span>
            </Link>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.length > 0 ? (
            navItems.map((item) => renderNavItem(item))
          ) : (
            <div className="text-sm text-sidebar-foreground/70 text-center py-8">
              {isCMSMode ? (
                <p>No navigation items</p>
              ) : (
                <p>No documentation available</p>
              )}
            </div>
          )}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-sidebar-border">
          <div className="text-xs text-sidebar-foreground/70">
            <p>HelpPages v1.0</p>
            <p>Built with Next.js</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
