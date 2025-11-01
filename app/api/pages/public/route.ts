import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// GET /api/pages/public - Get all published pages for public navigation
export async function GET() {
  try {
    const pages = await prisma.page.findMany({
      where: {
        status: 'published',
        isPublic: true,
      },
      select: {
        id: true,
        title: true,
        slug: true,
        summary: true,
        parentId: true,
        navHeaderId: true,
        position: true,
        user: {
          select: {
            username: true,
          },
        },
        navHeader: {
          select: {
            id: true,
            label: true,
            slug: true,
            position: true,
          },
        },
      },
      orderBy: [
        { navHeaderId: 'asc' },
        { position: 'asc' },
        { title: 'asc' },
      ],
    })

    // Organize pages by nav header and parent-child relationships
    const organized = pages.reduce((acc, page) => {
      const headerKey = page.navHeaderId || 'none'
      if (!acc[headerKey]) {
        acc[headerKey] = {
          header: page.navHeader,
          pages: [],
        }
      }
      acc[headerKey].pages.push(page)
      return acc
    }, {} as Record<string, { header: any; pages: any[] }>)

    return NextResponse.json({ pages: organized })
  } catch (error) {
    console.error('Error fetching public pages:', error)
    return NextResponse.json({ error: 'Failed to fetch pages' }, { status: 500 })
  }
}

