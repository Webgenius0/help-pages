import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q");
    const limit = parseInt(searchParams.get("limit") || "20");
    const includePrivate = searchParams.get("includePrivate") === "true";
    const docSlug = searchParams.get("docSlug"); // Filter by specific doc if provided

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ results: [], query: "" });
    }

    // Log the search query for analytics
    if (session?.user?.email) {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
      });

      if (user) {
        // Will be created after migration
        // await prisma.searchQuery.create({
        //   data: {
        //     userId: user.id,
        //     query: query.trim(),
        //     resultsCount: 0, // Will update after getting results
        //   },
        // });
      }
    }

    // Build the search conditions (content matching)
    const searchConditions = [
      { title: { contains: query, mode: "insensitive" } },
      { content: { contains: query, mode: "insensitive" } },
      { summary: { contains: query, mode: "insensitive" } },
      { searchIndex: { contains: query, mode: "insensitive" } },
    ];

    // Build the where clause based on permissions
    const whereClause: any = {
      AND: [
        {
          OR: searchConditions,
        },
      ],
    };

    // Filter by doc slug if provided
    if (docSlug) {
      whereClause.AND.push({
        doc: {
          slug: docSlug,
        },
      });
    }

    // Handle permissions and visibility
    if (!session?.user || !includePrivate) {
      // Public search: only published pages in public docs
      whereClause.AND.push({
        status: "published",
      });
      
      if (docSlug) {
        // If filtering by doc, ensure it's public
        const docIndex = whereClause.AND.findIndex((clause: any) => clause.doc);
        if (docIndex >= 0) {
          whereClause.AND[docIndex].doc.isPublic = true;
        }
      } else {
        whereClause.AND.push({
          doc: {
            isPublic: true,
          },
        });
      }
    } else if (session?.user?.email) {
      // Logged in user: show their own pages (any status) + published pages from docs they can access
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
      });

      if (user) {
        // User can see:
        // 1. Their own pages (drafts and published)
        // 2. Published pages from docs they own or are editors of
        // 3. Published pages from public docs
        
        const userDocIds = await prisma.doc.findMany({
          where: {
            userId: user.id,
          },
          select: { id: true },
        });
        
        const userDocIdArray = userDocIds.map((d) => d.id);
        
        // Build OR conditions for what user can see
        const visibilityConditions: any[] = [
          // User's own pages (drafts and published)
          { userId: user.id },
        ];
        
        // Add pages from docs they own (if they have any docs)
        if (userDocIdArray.length > 0) {
          visibilityConditions.push({
            AND: [
              { status: "published" },
              { docId: { in: userDocIdArray } },
            ],
          });
        }
        
        // Add published pages from public docs
        visibilityConditions.push({
          AND: [
            { status: "published" },
            {
              doc: {
                isPublic: true,
              },
            },
          ],
        });
        
        whereClause.AND.push({
          OR: visibilityConditions,
        });
      }
    }

    const pages = (await (prisma as any).page.findMany({
      where: whereClause,
      select: {
        id: true,
        title: true,
        slug: true,
        summary: true,
        content: true,
        status: true,
        updatedAt: true,
        docId: true,
        doc: {
          select: {
            id: true,
            slug: true,
            isPublic: true,
          },
        },
        user: {
          select: {
            username: true,
            fullName: true,
          },
        },
        navHeader: {
          select: {
            label: true,
            slug: true,
          },
        },
      },
      take: limit,
      orderBy: {
        updatedAt: "desc",
      },
    })) as Array<{
      id: string;
      title: string;
      slug: string;
      summary: string | null;
      content: string;
      status: string;
      updatedAt: Date;
      docId: string | null;
      doc: {
        id: string;
        slug: string;
        isPublic: boolean;
      } | null;
      user: {
        username: string;
        fullName: string | null;
      };
      navHeader: {
        label: string;
        slug: string;
      } | null;
    }>;

    // Build navHeaders where clause
    const navHeaderWhere: any = {
      OR: [
        { label: { contains: query, mode: "insensitive" } },
        { slug: { contains: query, mode: "insensitive" } },
      ],
    };

    // Filter by doc slug if provided
    if (docSlug) {
      navHeaderWhere.doc = {
        slug: docSlug,
      };
    }

    const navHeaders = await prisma.navHeader.findMany({
      where: navHeaderWhere,
      select: {
        id: true,
        label: true,
        slug: true,
        icon: true,
        parent: {
          select: {
            label: true,
            slug: true,
          },
        },
        doc: {
          select: {
            id: true,
            slug: true,
          },
        },
      },
      take: 10,
    });

    // Create highlighted excerpts
    const results = pages.map((page) => {
      const contentPreview = getHighlightedExcerpt(page.content, query, 150);
      const summaryPreview = page.summary
        ? getHighlightedExcerpt(page.summary, query, 100)
        : null;

      // Generate URL based on context
      // In CMS (includePrivate=true), link to CMS editor
      // Otherwise, link to public docs view
      const docSlugForUrl = page.doc?.slug || docSlug;
      let url: string;
      
      if (includePrivate && session?.user) {
        // CMS context: link to page editor
        url = `/cms/pages/${page.id}`;
      } else {
        // Public context: link to public docs view
        url = docSlugForUrl
          ? `/docs/${docSlugForUrl}/${page.slug}`
          : `/u/${page.user.username}/${page.slug}`;
      }

      return {
        id: page.id,
        title: highlightText(page.title, query),
        slug: page.slug,
        summary: summaryPreview || contentPreview,
        type: "page",
        isPublic: page.doc?.isPublic ?? false, // Pages inherit visibility from parent Doc
        status: page.status,
        updatedAt: page.updatedAt,
        author: page.user.fullName || page.user.username,
        category: page.navHeader?.label || "Uncategorized",
        url: url,
      };
    });

    const headerResults = navHeaders.map(
      (header: {
        id: string;
        label: string;
        slug: string;
        icon: string | null;
        parent: {
          label: string;
          slug: string;
        } | null;
        doc: {
          id: string;
          slug: string;
        } | null;
      }) => {
        // Generate URL for navHeader based on context
        const docSlugForUrl = header.doc?.slug || docSlug;
        let url: string;
        
        if (includePrivate && session?.user) {
          // CMS context: link to CMS pages list filtered by header
          url = `/cms/pages?header=${header.id}`;
        } else {
          // Public context: link to public docs view
          url = docSlugForUrl
            ? `/docs/${docSlugForUrl}`
            : `/cms/pages?header=${header.id}`;
        }

        return {
          id: header.id,
          title: highlightText(header.label, query),
          slug: header.slug,
          type: "category",
          parent: header.parent?.label,
          url: url,
        };
      }
    );

    return NextResponse.json({
      query: query.trim(),
      results: [...headerResults, ...results],
      totalCount: headerResults.length + results.length,
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Failed to perform search" },
      { status: 500 }
    );
  }
}

// Helper function to highlight matching text
function highlightText(text: string, query: string): string {
  if (!text || !query) return text;

  const regex = new RegExp(`(${escapeRegExp(query)})`, "gi");
  return text.replace(regex, "<mark>$1</mark>");
}

// Helper function to get an excerpt with highlighted query
function getHighlightedExcerpt(
  content: string,
  query: string,
  maxLength: number
): string {
  if (!content) return "";

  const lowerContent = content.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerContent.indexOf(lowerQuery);

  if (index === -1) {
    // Query not found, return beginning
    const excerpt = content.substring(0, maxLength);
    return excerpt.length < content.length ? excerpt + "..." : excerpt;
  }

  // Extract context around the match
  const start = Math.max(0, index - maxLength / 2);
  const end = Math.min(content.length, index + query.length + maxLength / 2);

  let excerpt = content.substring(start, end);

  if (start > 0) excerpt = "..." + excerpt;
  if (end < content.length) excerpt = excerpt + "...";

  return highlightText(excerpt, query);
}

// Escape special regex characters
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
