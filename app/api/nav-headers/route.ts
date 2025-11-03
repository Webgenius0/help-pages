import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUser } from "@/lib/auth";
import { generateSlug, isValidSlug, getSlugErrorMessage } from "@/lib/slug";

export async function GET(request: NextRequest) {
  const user = await getUser();

  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const profile = await prisma.user.findUnique({
      where: { email: user.email },
    });

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const searchParams = request.nextUrl.searchParams;
    const docId = searchParams.get("docId");
    const docItemId = searchParams.get("docItemId");

    if (!docId) {
      return NextResponse.json({ error: "docId is required" }, { status: 400 });
    }

    // Verify doc belongs to user
    const doc = await (prisma as any).doc.findUnique({
      where: { id: docId },
    });

    // Allow owner, admin, or editor
    const isOwner = doc?.userId === profile.id;
    const isAdmin = profile.role === "admin";
    const isEditor = profile.role === "editor";

    if (!doc || (!isOwner && !isAdmin && !isEditor)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // If docItemId is provided, fetch sections within that DocItem
    if (docItemId) {
      const headers = await (prisma as any).navHeader.findMany({
        where: {
          docId: docId as any,
          docItemId: docItemId as any,
          parentId: null, // Top-level sections within the DocItem
        } as any,
        include: {
          pages: {
            where: { parentId: null },
            select: { id: true, title: true, slug: true, status: true, position: true },
            orderBy: { position: "asc" },
          },
          children: {
            include: {
              pages: {
                where: { parentId: null },
                select: { id: true, title: true, slug: true, status: true, position: true },
                orderBy: { position: "asc" },
              },
            },
            orderBy: { position: "asc" },
          },
        },
        orderBy: { position: "asc" },
      });
      return NextResponse.json({ headers });
    }

    // Get all top-level header dropdowns (parentId is null, docItemId is null)
    // These are the main dropdowns like "Products", "Build", "Manage"
    const headers = await (prisma as any).navHeader.findMany({
      where: {
        docId: docId as any,
        parentId: null, // Only top-level dropdowns
        docItemId: null, // Not sections within DocItems
      } as any,
      orderBy: { position: "asc" },
    });

    // Manually fetch docItems for each header and add counts
    // Using $queryRaw to work around Prisma Client not being regenerated yet
    const headersWithItems = await Promise.all(
      headers.map(async (header: any) => {
        try {
          // Use raw SQL query since Prisma Client hasn't been regenerated
          const docItems = await (prisma as any).$queryRaw`
            SELECT 
              id,
              nav_header_id as "navHeaderId",
              label,
              slug,
              description,
              position,
              is_default as "isDefault",
              created_at as "createdAt",
              updated_at as "updatedAt"
            FROM doc_items
            WHERE nav_header_id = ${header.id}
            ORDER BY position ASC
          `;

          // For each docItem, get page count and section count
          const itemsWithCounts = await Promise.all(
            docItems.map(async (item: any) => {
              const pagesCount = await (prisma as any).page.count({
                where: {
                  docItemId: item.id,
                } as any,
              });
              const sectionsCount = await (prisma as any).navHeader.count({
                where: {
                  docItemId: item.id,
                } as any,
              });
              return {
                ...item,
                _count: {
                  pages: pagesCount,
                  sections: sectionsCount,
                },
              };
            })
          );

          return {
            ...header,
            docItems: itemsWithCounts,
          };
        } catch (error: any) {
          console.error(`Error fetching docItems for header ${header.id}:`, error);
          // Return header with empty docItems on error
          return {
            ...header,
            docItems: [],
          };
        }
      })
    );

    return NextResponse.json({ headers: headersWithItems });
  } catch (error: any) {
    console.error("Error fetching headers:", error);
    console.error("Error details:", error?.message, error?.stack);
    return NextResponse.json(
      { 
        error: "Failed to fetch headers",
        details: error?.message || "Unknown error"
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const user = await getUser();

  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const profile = await prisma.user.findUnique({
      where: { email: user.email },
    });

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const body = await request.json();
    const { label, slug, parentId, icon, position, docId, docItemId } = body;

    if (!label || !docId) {
      return NextResponse.json(
        { error: "Label and docId are required" },
        { status: 400 }
      );
    }

    // Normalize and validate slug
    const normalizedSlug = generateSlug(slug || label);
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
    });

    // Allow owner, admin, or editor
    const isOwner = doc?.userId === profile.id;
    const isAdmin = profile.role === "admin";
    const isEditor = profile.role === "editor";

    if (!doc || (!isOwner && !isAdmin && !isEditor)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const header = await prisma.navHeader.create({
      data: {
        docId: docId as any,
        docItemId: docItemId || null, // Set if creating a section within a DocItem
        label,
        slug: normalizedSlug,
        parentId: parentId || null, // Set if creating a subsection
        icon: icon || null,
        position: position || 0,
      } as any,
    });

    return NextResponse.json({ header });
  } catch (error) {
    console.error("Error creating header:", error);
    return NextResponse.json(
      { error: "Failed to create header" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const user = await getUser();

  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, label, slug, icon, position } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Header ID is required" },
        { status: 400 }
      );
    }

    const header = await prisma.navHeader.update({
      where: { id },
      data: {
        ...(label && { label }),
        ...(slug && { slug }),
        ...(icon !== undefined && { icon }),
        ...(position !== undefined && { position }),
      },
    });

    return NextResponse.json({ header });
  } catch (error) {
    console.error("Error updating header:", error);
    return NextResponse.json(
      { error: "Failed to update header" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const user = await getUser();

  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "Header ID is required" },
      { status: 400 }
    );
  }

  try {
    await prisma.navHeader.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting header:", error);
    return NextResponse.json(
      { error: "Failed to delete header" },
      { status: 500 }
    );
  }
}
