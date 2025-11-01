import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';

// Helper to verify API key
async function verifyApiKey(apiKey: string) {
  // Will be enabled after migration
  return null;
}

// GET /api/v1/pages/[id] - Get a specific page
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const page = await prisma.page.findUnique({
      where: { id },
      include: {
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
        revisions: {
          select: {
            id: true,
            createdAt: true,
            user: {
              select: {
                username: true,
                fullName: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 10,
        },
      },
    });

    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    // Check permissions
    if (!page.isPublic && page.status === 'draft') {
      if (!user || (user.id !== page.userId && user.role !== 'admin' && user.role !== 'editor')) {
        return NextResponse.json(
          { error: 'Unauthorized: Cannot access this page' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({ page });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch page' },
      { status: 500 }
    );
  }
}

// PATCH /api/v1/pages/[id] - Update a page
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const page = await prisma.page.findUnique({
      where: { id },
    });

    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    // Check permissions
    if (user.role === 'viewer' || (user.id !== page.userId && user.role !== 'admin' && user.role !== 'editor')) {
      return NextResponse.json(
        { error: 'Forbidden: Cannot edit this page' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, content, summary, status, isPublic } = body;

    const updateData: any = {
      lastEditedBy: user.username || user.email,
    };

    if (title) updateData.title = title;
    if (content) updateData.content = content;
    if (summary !== undefined) updateData.summary = summary;
    if (status) {
      updateData.status = status;
      if (status === 'published' && !page.publishedAt) {
        updateData.publishedAt = new Date();
      }
    }
    if (isPublic !== undefined) updateData.isPublic = isPublic;

    // Update search index if content changed
    if (title || content || summary) {
      const searchTitle = title || page.title;
      const searchContent = content || page.content;
      const searchSummary = summary !== undefined ? summary : page.summary;
      updateData.searchIndex = `${searchTitle} ${searchContent} ${searchSummary || ''}`.toLowerCase();
    }

    // Create a revision before updating
    await prisma.pageRevision.create({
      data: {
        pageId: page.id,
        userId: user.id,
        snapshot: {
          title: page.title,
          content: page.content,
          summary: page.summary,
          status: page.status,
          isPublic: page.isPublic,
        },
      },
    });

    const updatedPage = await prisma.page.update({
      where: { id },
      data: updateData,
      include: {
        navHeader: {
          select: {
            label: true,
            slug: true,
          },
        },
      },
    });

    return NextResponse.json({
      message: 'Page updated successfully',
      page: updatedPage,
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Failed to update page' },
      { status: 500 }
    );
  }
}

// DELETE /api/v1/pages/[id] - Delete a page
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const page = await prisma.page.findUnique({
      where: { id },
    });

    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    // Only admins can delete pages
    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Only admins can delete pages' },
        { status: 403 }
      );
    }

    await prisma.page.delete({
      where: { id },
    });

    return NextResponse.json({
      message: 'Page deleted successfully',
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Failed to delete page' },
      { status: 500 }
    );
  }
}

