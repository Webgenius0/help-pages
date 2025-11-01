import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUser } from '@/lib/auth'
import { generateSlug, isValidSlug, getSlugErrorMessage } from '@/lib/slug'

export async function POST(request: NextRequest) {
  const user = await getUser()
  
  if (!user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const profile = await prisma.user.findUnique({
      where: { email: user.email },
    })

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const body = await request.json()
    const { navHeaderId, parentId, title, slug, content, summary, position, docId } = body

    if (!title || !docId) {
      return NextResponse.json({ error: 'Title and docId are required' }, { status: 400 })
    }

    // Normalize and validate slug
    const normalizedSlug = generateSlug(slug || title);
    if (!isValidSlug(normalizedSlug)) {
      const errorMsg = getSlugErrorMessage(normalizedSlug);
      return NextResponse.json(
        { error: errorMsg || "Invalid slug format" },
        { status: 400 }
      );
    }

    // Verify doc belongs to user
    const doc = await (prisma as any).doc.findUnique({
      where: { id: docId },
    })

    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Allow owner, admin, or editor to create pages
    const isOwner = doc.userId === profile.id
    const isAdmin = profile.role === 'admin'
    const isEditor = profile.role === 'editor'
    
    if (!isOwner && !isAdmin && !isEditor) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check for duplicate slug within the doc
    const existingPage = await prisma.page.findFirst({
      where: {
        docId: docId,
        slug: normalizedSlug,
      },
    })

    if (existingPage) {
      return NextResponse.json({ error: 'A page with this slug already exists in this documentation' }, { status: 400 })
    }

    const page = await prisma.page.create({
      data: {
        docId: docId,
        userId: profile.id,
        navHeaderId: navHeaderId || null,
        parentId: parentId || null,
        title,
        slug: normalizedSlug,
        content: content || '',
        summary: summary || null,
        position: position || 0,
        status: 'draft',
      },
    })

    return NextResponse.json({ page })
  } catch (error) {
    console.error('Error creating page:', error)
    return NextResponse.json({ error: 'Failed to create page' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const user = await getUser()
  
  if (!user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const profile = await prisma.user.findUnique({
      where: { email: user.email },
    })

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const searchParams = request.nextUrl.searchParams
    const docId = searchParams.get('docId')
    const navHeaderId = searchParams.get('navHeaderId')
    const status = searchParams.get('status')

    if (!docId) {
      return NextResponse.json({ error: 'docId is required' }, { status: 400 })
    }

    // Verify doc belongs to user
    const doc = await (prisma as any).doc.findUnique({
      where: { id: docId },
    })

    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Allow owner, admin, or editor to create pages
    const isOwner = doc.userId === profile.id
    const isAdmin = profile.role === 'admin'
    const isEditor = profile.role === 'editor'
    
    if (!isOwner && !isAdmin && !isEditor) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const pages = await prisma.page.findMany({
      where: {
        docId: docId,
        ...(navHeaderId && { navHeaderId }),
        ...(status && { status }),
      },
      orderBy: [
        { position: 'asc' },
        { createdAt: 'asc' },
      ],
    })

    return NextResponse.json({ pages })
  } catch (error) {
    console.error('Error fetching pages:', error)
    return NextResponse.json({ error: 'Failed to fetch pages' }, { status: 500 })
  }
}
