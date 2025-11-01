import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/pages/public - Get all published pages for public navigation
export async function GET() {
  try {
    // Pages inherit visibility from their parent Doc
    // Only show published pages from public docs
    const pages = (await (prisma as any).page.findMany({
      where: {
        status: "published",
        doc: {
          isPublic: true,
        },
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
      orderBy: [{ navHeaderId: "asc" }, { position: "asc" }, { title: "asc" }],
    })) as Array<{
      id: string;
      title: string;
      slug: string;
      summary: string | null;
      parentId: string | null;
      navHeaderId: string | null;
      position: number;
      user: {
        username: string;
      };
      navHeader: {
        id: string;
        label: string;
        slug: string;
        position: number;
      } | null;
    }>;

    // Organize pages by nav header and parent-child relationships
    const organized = pages.reduce(
      (
        acc: Record<string, { header: any; pages: any[] }>,
        page: {
          id: string;
          title: string;
          slug: string;
          summary: string | null;
          parentId: string | null;
          navHeaderId: string | null;
          position: number;
          user: {
            username: string;
          };
          navHeader: {
            id: string;
            label: string;
            slug: string;
            position: number;
          } | null;
        }
      ) => {
        const headerKey = page.navHeaderId || "none";
        if (!acc[headerKey]) {
          acc[headerKey] = {
            header: page.navHeader,
            pages: [],
          };
        }
        acc[headerKey].pages.push(page);
        return acc;
      },
      {} as Record<string, { header: any; pages: any[] }>
    );

    return NextResponse.json({ pages: organized });
  } catch (error) {
    console.error("Error fetching public pages:", error);
    return NextResponse.json(
      { error: "Failed to fetch pages" },
      { status: 500 }
    );
  }
}
