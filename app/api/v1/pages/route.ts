import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';

// Helper to verify API key
async function verifyApiKey(apiKey: string) {
  // This will be enabled after migration
  // const key = await prisma.apiKey.findUnique({
  //   where: { key: apiKey },
  //   include: { user: true },
  // });
  
  // if (!key) {
  //   return null;
  // }

  // Check if key has expired
  // if (key.expiresAt && key.expiresAt < new Date()) {
  //   return null;
  // }

  // Update last used timestamp
  // await prisma.apiKey.update({
  //   where: { id: key.id },
  //   data: { lastUsedAt: new Date() },
  // });

  // return key.user;
  return null;
}

// GET /api/v1/pages - List all pages
export async function GET(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key');
    const session = await getServerSession(authOptions);

    let user = null;
    
    // Authenticate via API key or session
    if (apiKey) {
      user = await verifyApiKey(apiKey);
    } else if (session?.user?.email) {
      user = await prisma.user.findUnique({
        where: { email: session.user.email },
      });
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized: Valid API key or session required' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status');
    const isPublic = searchParams.get('isPublic');

    const where: any = {
      userId: user.id,
    };

    if (status) {
      where.status = status;
    }

    if (isPublic !== null) {
      where.isPublic = isPublic === 'true';
    }

    const [pages, total] = await Promise.all([
      prisma.page.findMany({
        where,
        select: {
          id: true,
          title: true,
          slug: true,
          summary: true,
          status: true,
          isPublic: true,
          viewCount: true,
          publishedAt: true,
          createdAt: true,
          updatedAt: true,
          navHeader: {
            select: {
              label: true,
              slug: true,
            },
          },
        },
        take: limit,
        skip: offset,
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.page.count({ where }),
    ]);

    return NextResponse.json({
      pages,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pages' },
      { status: 500 }
    );
  }
}

// POST /api/v1/pages - Create a new page
export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key');
    const session = await getServerSession(authOptions);

    let user = null;

    if (apiKey) {
      user = await verifyApiKey(apiKey);
    } else if (session?.user?.email) {
      user = await prisma.user.findUnique({
        where: { email: session.user.email },
      });
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized: Valid API key or session required' },
        { status: 401 }
      );
    }

    // Check permissions
    if (user.role === 'viewer') {
      return NextResponse.json(
        { error: 'Forbidden: Viewers cannot create pages' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, slug, content, summary, status, isPublic, navHeaderId } = body;

    if (!title || !slug || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: title, slug, content' },
        { status: 400 }
      );
    }

    // Check if slug already exists for this user
    const existingPage = await prisma.page.findUnique({
      where: {
        userId_slug: {
          userId: user.id,
          slug,
        },
      },
    });

    if (existingPage) {
      return NextResponse.json(
        { error: 'A page with this slug already exists' },
        { status: 409 }
      );
    }

    // Create search index
    const searchIndex = `${title} ${content} ${summary || ''}`.toLowerCase();

    const page = await prisma.page.create({
      data: {
        userId: user.id,
        title,
        slug,
        content,
        summary: summary || null,
        status: status || 'draft',
        isPublic: isPublic ?? false,
        navHeaderId: navHeaderId || null,
        searchIndex,
        publishedAt: status === 'published' ? new Date() : null,
      },
      include: {
        navHeader: {
          select: {
            label: true,
            slug: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        message: 'Page created successfully',
        page,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Failed to create page' },
      { status: 500 }
    );
  }
}

