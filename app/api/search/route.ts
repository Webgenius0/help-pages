import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '20');
    const includePrivate = searchParams.get('includePrivate') === 'true';

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ results: [], query: '' });
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

    // Build the where clause based on permissions
    const whereClause: any = {
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { content: { contains: query, mode: 'insensitive' } },
        { summary: { contains: query, mode: 'insensitive' } },
        { searchIndex: { contains: query, mode: 'insensitive' } },
      ],
    };

    // If user is not logged in or doesn't want private pages, only show public pages
    if (!session?.user || !includePrivate) {
      whereClause.isPublic = true;
      whereClause.status = 'published';
    } else if (session?.user?.email) {
      // Show published pages or user's own drafts
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
      });

      if (user) {
        whereClause.OR.push(
          { status: 'published' },
          { AND: [{ userId: user.id }, { status: 'draft' }] }
        );
      }
    }

    const pages = await prisma.page.findMany({
      where: whereClause,
      select: {
        id: true,
        title: true,
        slug: true,
        summary: true,
        content: true,
        isPublic: true,
        status: true,
        updatedAt: true,
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
        updatedAt: 'desc',
      },
    });

    const navHeaders = await prisma.navHeader.findMany({
      where: {
        OR: [
          { label: { contains: query, mode: 'insensitive' } },
          { slug: { contains: query, mode: 'insensitive' } },
        ],
      },
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
      },
      take: 10,
    });

    // Create highlighted excerpts
    const results = pages.map((page) => {
      const contentPreview = getHighlightedExcerpt(
        page.content,
        query,
        150
      );
      const summaryPreview = page.summary
        ? getHighlightedExcerpt(page.summary, query, 100)
        : null;

      return {
        id: page.id,
        title: highlightText(page.title, query),
        slug: page.slug,
        summary: summaryPreview || contentPreview,
        type: 'page',
        isPublic: page.isPublic,
        status: page.status,
        updatedAt: page.updatedAt,
        author: page.user.fullName || page.user.username,
        category: page.navHeader?.label || 'Uncategorized',
        url: `/u/${page.user.username}/${page.slug}`,
      };
    });

    const headerResults = navHeaders.map((header) => ({
      id: header.id,
      title: highlightText(header.label, query),
      slug: header.slug,
      type: 'category',
      parent: header.parent?.label,
      url: `/dashboard/pages?header=${header.id}`,
    }));

    return NextResponse.json({
      query: query.trim(),
      results: [...headerResults, ...results],
      totalCount: headerResults.length + results.length,
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Failed to perform search' },
      { status: 500 }
    );
  }
}

// Helper function to highlight matching text
function highlightText(text: string, query: string): string {
  if (!text || !query) return text;

  const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}

// Helper function to get an excerpt with highlighted query
function getHighlightedExcerpt(
  content: string,
  query: string,
  maxLength: number
): string {
  if (!content) return '';

  const lowerContent = content.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerContent.indexOf(lowerQuery);

  if (index === -1) {
    // Query not found, return beginning
    const excerpt = content.substring(0, maxLength);
    return excerpt.length < content.length ? excerpt + '...' : excerpt;
  }

  // Extract context around the match
  const start = Math.max(0, index - maxLength / 2);
  const end = Math.min(content.length, index + query.length + maxLength / 2);

  let excerpt = content.substring(start, end);

  if (start > 0) excerpt = '...' + excerpt;
  if (end < content.length) excerpt = excerpt + '...';

  return highlightText(excerpt, query);
}

// Escape special regex characters
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

