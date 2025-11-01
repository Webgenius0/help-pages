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

    // Note: Pages inherit visibility from parent Doc
    // Filter by doc.isPublic if isPublic parameter is provided
    if (isPublic !== null) {
      where.doc = {
        isPublic: isPublic === 'true',
      };
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
          viewCount: true,
          publishedAt: true,
          createdAt: true,
          updatedAt: true,
          docId: true,
          doc: {
            select: {
              isPublic: true,
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
    const { title, slug, content, summary, status, isPublic: _isPublic, navHeaderId, docId } = body;

    // Remove isPublic from body if present (Pages don't have isPublic - it's inherited from Doc)
    if (_isPublic !== undefined) {
      console.warn('Ignoring isPublic field in request - Pages inherit visibility from their parent Doc');
    }

    if (!title || !slug || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: title, slug, content' },
        { status: 400 }
      );
    }

    if (!docId) {
      return NextResponse.json(
        { error: 'Missing required field: docId' },
        { status: 400 }
      );
    }

    // Verify doc exists and user has access
    const doc = await (prisma as any).doc.findUnique({
      where: { id: docId },
    });

    if (!doc) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Check permissions
    const isOwner = doc.userId === user.id;
    const isAdmin = user.role === 'admin';
    const isEditor = user.role === 'editor';

    if (!isOwner && !isAdmin && !isEditor) {
      return NextResponse.json(
        { error: 'Forbidden: Cannot create pages in this document' },
        { status: 403 }
      );
    }

    // Check if slug already exists for this doc
    const existingPage = await prisma.page.findFirst({
      where: {
        docId: docId,
        slug,
      },
    });

    if (existingPage) {
      return NextResponse.json(
        { error: 'A page with this slug already exists in this document' },
        { status: 409 }
      );
    }

    // Create search index
    const searchIndex = `${title} ${content} ${summary || ''}`.toLowerCase();

    const page = await prisma.page.create({
      data: {
        userId: user.id,
        docId: docId,
        title,
        slug,
        content,
        summary: summary || null,
        status: status || 'draft',
        // Note: isPublic removed - pages inherit visibility from parent Doc
        navHeaderId: navHeaderId || null,
        searchIndex,
        publishedAt: status === 'published' ? new Date() : null,
      } as any,
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

