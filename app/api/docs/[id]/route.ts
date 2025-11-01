import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUser, getProfile } from '@/lib/auth'
import { generateSlug, isValidSlug, getSlugErrorMessage } from '@/lib/slug'

// GET /api/docs/[id] - Get a specific doc by ID or slug
// Can be called with /api/docs/[id] or /api/docs/[slug]?by=slug
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const searchParams = request.nextUrl.searchParams
    const bySlug = searchParams.get('by') === 'slug'
    const byId = searchParams.get('by') === 'id'

    // Auto-detect: if it looks like a CUID (starts with 'c' and has specific length), treat as ID
    // Otherwise, try slug first (common case for public access)
    const isLikelyId = /^[a-z][a-z0-9]{24,}$/.test(id) // CUID format (25 chars)
    const useSlug = bySlug || (!byId && !isLikelyId)

    // Determine if this is a management request (check query param)
    const isManagement = byId || searchParams.get('by') === 'id'
    
    // For management view, get all pages (including drafts). For public view, only published.
    const pagesWhere = isManagement 
      ? { parentId: null } 
      : { status: 'published', parentId: null }
    
    // Try to find by ID or slug
    const doc = await (prisma as any).doc.findUnique({
      where: useSlug ? { slug: id } : { id },
      include: {
        user: {
          select: {
            username: true,
            fullName: true,
          },
        },
        pages: {
          where: {
            ...pagesWhere,
            navHeaderId: null, // Pages not in any section
          },
          orderBy: {
            position: 'asc',
          },
          select: {
            id: true,
            title: true,
            slug: true,
            status: true,
            summary: true,
            navHeaderId: true,
            parentId: true,
            position: true,
          },
        },
        navHeaders: {
          where: {
            parentId: null, // Top-level sections only
          },
          include: {
            children: {
              include: {
                pages: {
                  where: isManagement ? {} : { status: 'published' },
                  select: {
                    id: true,
                    title: true,
                    slug: true,
                    status: true,
                    position: true,
                  },
                  orderBy: {
                    position: 'asc',
                  },
                },
              },
              orderBy: {
                position: 'asc',
              },
            },
            pages: {
              where: isManagement ? { parentId: null } : { status: 'published', parentId: null },
              orderBy: {
                position: 'asc',
              },
              select: {
                id: true,
                title: true,
                slug: true,
                status: true,
                position: true,
              },
            },
          },
          orderBy: {
            position: 'asc',
          },
        },
        _count: {
          select: {
            pages: true,
          },
        },
      },
    })

    if (!doc) {
      return NextResponse.json({ error: 'Doc not found' }, { status: 404 })
    }

    // Check if doc is public or user has access (owner, admin, or editor)
    const user = await getUser()
    const profile = await getProfile()
    
    if (!doc.isPublic) {
      if (!profile) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }
      const isOwner = doc.userId === profile.id
      const isAdmin = profile.role === 'admin'
      const isEditor = profile.role === 'editor'
      
      if (!isOwner && !isAdmin && !isEditor) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }
    }

    return NextResponse.json({ doc })
  } catch (error) {
    console.error('Error fetching doc:', error)
    return NextResponse.json({ error: 'Failed to fetch doc' }, { status: 500 })
  }
}

// PUT /api/docs/[id] - Update a doc
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getUser()
    
    if (!user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const profile = await getProfile()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const doc = await (prisma as any).doc.findUnique({
      where: { id },
    })

    if (!doc) {
      return NextResponse.json({ error: 'Doc not found' }, { status: 404 })
    }

    // Check permissions: owner, admin, or editor can access
    const isOwner = doc.userId === profile.id
    const isAdmin = profile.role === 'admin'
    const isEditor = profile.role === 'editor'
    
    if (!isOwner && !isAdmin && !isEditor) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { title, slug, description, isPublic, theme } = body

    const updateData: any = {}
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (isPublic !== undefined) updateData.isPublic = isPublic
    if (theme !== undefined) updateData.theme = theme

    if (slug !== undefined) {
      // Normalize and validate slug
      const normalizedSlug = generateSlug(slug || title || doc.title || '');
      if (!isValidSlug(normalizedSlug)) {
        const errorMsg = getSlugErrorMessage(normalizedSlug);
        return NextResponse.json(
          { error: errorMsg || "Invalid slug format" },
          { status: 400 }
        );
      }

      // Only update if slug changed
      if (normalizedSlug !== doc.slug) {
        // Check if new slug already exists
        const existingDoc = await (prisma as any).doc.findUnique({
          where: { slug: normalizedSlug },
        })

        if (existingDoc && existingDoc.id !== id) {
          return NextResponse.json(
            { error: 'A documentation with this slug already exists' },
            { status: 400 }
          )
        }

        updateData.slug = normalizedSlug;
      }
    }

    const updatedDoc = await (prisma as any).doc.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ doc: updatedDoc })
  } catch (error: any) {
    console.error('Error updating doc:', error)
    
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { error: 'A documentation with this slug already exists' },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: 'Failed to update doc' }, { status: 500 })
  }
}

// DELETE /api/docs/[id] - Delete a doc
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getUser()
    
    if (!user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const profile = await getProfile()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const doc = await (prisma as any).doc.findUnique({
      where: { id },
    })

    if (!doc) {
      return NextResponse.json({ error: 'Doc not found' }, { status: 404 })
    }

    // Check permissions: only owner or admin can delete (editors cannot delete)
    const isOwner = doc.userId === profile.id
    const isAdmin = profile.role === 'admin'
    
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden: Only doc owner or admin can delete' }, { status: 403 })
    }

    await (prisma as any).doc.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting doc:', error)
    return NextResponse.json({ error: 'Failed to delete doc' }, { status: 500 })
  }
}

