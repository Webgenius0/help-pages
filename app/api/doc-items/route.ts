import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUser, getProfile } from "@/lib/auth";
import { generateSlug, isValidSlug, getSlugErrorMessage } from "@/lib/slug";

// GET /api/doc-items?docId=xxx - List all doc items for a doc
export async function GET(request: NextRequest) {
  try {
    const user = await getUser();

    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await getProfile();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const searchParams = request.nextUrl.searchParams;
    const navHeaderId = searchParams.get("navHeaderId");

    if (!navHeaderId) {
      return NextResponse.json({ error: "navHeaderId is required" }, { status: 400 });
    }

    // Verify navHeader belongs to a doc that user can access
    const navHeader = await (prisma as any).navHeader.findUnique({
      where: { id: navHeaderId },
      include: {
        doc: {
          select: {
            id: true,
            userId: true,
          },
        },
      },
    });

    if (!navHeader) {
      return NextResponse.json({ error: "NavHeader not found" }, { status: 404 });
    }

    const isOwner = navHeader.doc.userId === profile.id;
    const isAdmin = profile.role === "admin";
    const isEditor = profile.role === "editor";

    if (!isOwner && !isAdmin && !isEditor) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

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
      WHERE nav_header_id = ${navHeaderId}
      ORDER BY position ASC, created_at ASC
    `;

    // Get counts for each docItem
    const docItemsWithCounts = await Promise.all(
      docItems.map(async (item: any) => {
        const pagesCount = await (prisma as any).$queryRaw`
          SELECT COUNT(*)::int as count FROM pages WHERE doc_item_id = ${item.id}
        `;
        const sectionsCount = await (prisma as any).$queryRaw`
          SELECT COUNT(*)::int as count FROM nav_headers WHERE doc_item_id = ${item.id}
        `;
        return {
          ...item,
          _count: {
            pages: pagesCount[0]?.count || 0,
            sections: sectionsCount[0]?.count || 0,
          },
        };
      })
    );

    return NextResponse.json({ docItems: docItemsWithCounts });
  } catch (error: any) {
    console.error("Error fetching doc items:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch doc items",
        details: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}

// POST /api/doc-items - Create a new doc item
export async function POST(request: NextRequest) {
  try {
    const user = await getUser();

    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await getProfile();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const body = await request.json();
    const { navHeaderId, label, slug, description, position, isDefault } = body;

    if (!navHeaderId || !label) {
      return NextResponse.json(
        { error: "navHeaderId and label are required" },
        { status: 400 }
      );
    }

    // Verify navHeader belongs to a doc that user can access
    const navHeader = await (prisma as any).navHeader.findUnique({
      where: { id: navHeaderId },
      include: {
        doc: {
          select: {
            id: true,
            userId: true,
          },
        },
      },
    });

    if (!navHeader) {
      return NextResponse.json({ error: "NavHeader not found" }, { status: 404 });
    }

    const isOwner = navHeader.doc.userId === profile.id;
    const isAdmin = profile.role === "admin";
    const isEditor = profile.role === "editor";

    if (!isOwner && !isAdmin && !isEditor) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

    // Check for duplicate slug within the navHeader using raw SQL
    const existingItems = await (prisma as any).$queryRaw`
      SELECT id FROM doc_items 
      WHERE nav_header_id = ${navHeaderId} AND slug = ${normalizedSlug}
      LIMIT 1
    `;

    if (existingItems && existingItems.length > 0) {
      return NextResponse.json(
        { error: "A doc item with this slug already exists" },
        { status: 400 }
      );
    }

    // If isDefault is true, unset other defaults within the same navHeader
    if (isDefault) {
      await (prisma as any).$executeRaw`
        UPDATE doc_items 
        SET is_default = false 
        WHERE nav_header_id = ${navHeaderId} AND is_default = true
      `;
    }

    // Get max position if position not provided
    let finalPosition = position;
    if (finalPosition === undefined || finalPosition === null) {
      const maxPositionResult = await (prisma as any).$queryRaw`
        SELECT MAX(position) as max_position FROM doc_items 
        WHERE nav_header_id = ${navHeaderId}
      `;
      finalPosition = (maxPositionResult[0]?.max_position ?? -1) + 1;
    }

    // Generate a CUID-like ID (Prisma uses cuid by default)
    // Using a simple approach - in production you'd want to use the cuid library
    const generateId = () => {
      const timestamp = Date.now().toString(36);
      const random = Math.random().toString(36).substring(2, 15);
      return `c${timestamp}${random}`;
    };
    const newId = generateId();

    // Create the doc item using raw SQL
    const docItemResult = await (prisma as any).$queryRaw`
      INSERT INTO doc_items (
        id, nav_header_id, label, slug, description, position, is_default, created_at, updated_at
      ) VALUES (
        ${newId},
        ${navHeaderId},
        ${label},
        ${normalizedSlug},
        ${description || null},
        ${finalPosition},
        ${isDefault || false},
        NOW(),
        NOW()
      )
      RETURNING 
        id,
        nav_header_id as "navHeaderId",
        label,
        slug,
        description,
        position,
        is_default as "isDefault",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;

    const docItem = docItemResult[0];

    // Get counts manually using raw SQL
    const pagesCount = await (prisma as any).$queryRaw`
      SELECT COUNT(*)::int as count FROM pages WHERE doc_item_id = ${docItem.id}
    `;
    const sectionsCount = await (prisma as any).$queryRaw`
      SELECT COUNT(*)::int as count FROM nav_headers WHERE doc_item_id = ${docItem.id}
    `;

    return NextResponse.json({
      docItem: {
        ...docItem,
        _count: {
          pages: pagesCount[0]?.count || 0,
          sections: sectionsCount[0]?.count || 0,
        },
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating doc item:", error);
    return NextResponse.json(
      {
        error: "Failed to create doc item",
        details: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}

