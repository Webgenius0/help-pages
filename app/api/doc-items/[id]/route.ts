import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUser, getProfile } from "@/lib/auth";
import { generateSlug, isValidSlug, getSlugErrorMessage } from "@/lib/slug";

// GET /api/doc-items/[id] - Get a specific doc item
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();

    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await getProfile();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const { id } = await params;

    const docItem = await (prisma as any).docItem.findUnique({
      where: { id },
      include: {
        navHeader: {
          include: {
            doc: {
              select: {
                id: true,
                userId: true,
                title: true,
              },
            },
          },
        },
        _count: {
          select: {
            pages: true,
            sections: true,
          },
        },
      },
    });

    if (!docItem) {
      return NextResponse.json({ error: "Doc item not found" }, { status: 404 });
    }

    // Verify permissions
    const isOwner = docItem.navHeader.doc.userId === profile.id;
    const isAdmin = profile.role === "admin";
    const isEditor = profile.role === "editor";

    if (!isOwner && !isAdmin && !isEditor) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ docItem });
  } catch (error: any) {
    console.error("Error fetching doc item:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch doc item",
        details: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}

// PUT /api/doc-items/[id] - Update a doc item
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();

    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await getProfile();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const { id } = await params;
    const body = await request.json();
    const { label, slug, description, position, isDefault } = body;

    // Get existing doc item
    const existingItem = await (prisma as any).docItem.findUnique({
      where: { id },
      include: {
        navHeader: {
          include: {
            doc: {
              select: {
                id: true,
                userId: true,
              },
            },
          },
        },
      },
    });

    if (!existingItem) {
      return NextResponse.json({ error: "Doc item not found" }, { status: 404 });
    }

    // Verify permissions
    const isOwner = existingItem.navHeader.doc.userId === profile.id;
    const isAdmin = profile.role === "admin";
    const isEditor = profile.role === "editor";

    if (!isOwner && !isAdmin && !isEditor) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updateData: any = {};

    if (label !== undefined) updateData.label = label;

    if (slug !== undefined) {
      const normalizedSlug = generateSlug(slug || label || existingItem.label);
      if (!isValidSlug(normalizedSlug)) {
        const errorMsg = getSlugErrorMessage(normalizedSlug);
        return NextResponse.json(
          { error: errorMsg || "Invalid slug format" },
          { status: 400 }
        );
      }

      // Check for duplicate slug (excluding current item)
      const duplicateItem = await (prisma as any).docItem.findFirst({
        where: {
          navHeaderId: existingItem.navHeaderId,
          slug: normalizedSlug,
          id: { not: id },
        },
      });

      if (duplicateItem) {
        return NextResponse.json(
          { error: "A doc item with this slug already exists" },
          { status: 400 }
        );
      }

      updateData.slug = normalizedSlug;
    }

    if (description !== undefined) updateData.description = description || null;
    if (position !== undefined) updateData.position = position;

    // If isDefault is being set to true, unset other defaults within the same navHeader
    if (isDefault === true) {
      await (prisma as any).docItem.updateMany({
        where: {
          navHeaderId: existingItem.navHeaderId,
          isDefault: true,
          id: { not: id },
        },
        data: { isDefault: false },
      });
      updateData.isDefault = true;
    } else if (isDefault === false) {
      updateData.isDefault = false;
    }

    const docItem = await (prisma as any).docItem.update({
      where: { id },
      data: updateData,
      include: {
        _count: {
          select: {
            pages: true,
            sections: true,
          },
        },
      },
    });

    return NextResponse.json({ docItem });
  } catch (error: any) {
    console.error("Error updating doc item:", error);
    return NextResponse.json(
      {
        error: "Failed to update doc item",
        details: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}

// DELETE /api/doc-items/[id] - Delete a doc item
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();

    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await getProfile();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const { id } = await params;

    // Get existing doc item
    const existingItem = await (prisma as any).docItem.findUnique({
      where: { id },
      include: {
        navHeader: {
          include: {
            doc: {
              select: {
                id: true,
                userId: true,
              },
            },
          },
        },
      },
    });

    if (!existingItem) {
      return NextResponse.json({ error: "Doc item not found" }, { status: 404 });
    }

    // Verify permissions (only owner or admin can delete)
    const isOwner = existingItem.navHeader.doc.userId === profile.id;
    const isAdmin = profile.role === "admin";

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await (prisma as any).docItem.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting doc item:", error);
    return NextResponse.json(
      {
        error: "Failed to delete doc item",
        details: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}

