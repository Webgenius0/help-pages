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

    // Get all top-level headers with their children and pages
    const headers = await prisma.navHeader.findMany({
      where: {
        docId: docId as any,
        parentId: null, // Only top-level headers
      } as any,
      include: {
        children: {
          include: {
            pages: {
              where: { parentId: null },
              select: { id: true, title: true, slug: true, status: true },
              orderBy: { position: "asc" },
            },
          },
          orderBy: { position: "asc" },
        },
        pages: {
          where: { parentId: null },
          select: { id: true, title: true, slug: true, status: true },
          orderBy: { position: "asc" },
        },
      },
      orderBy: { position: "asc" },
    });

    return NextResponse.json({ headers });
  } catch (error) {
    console.error("Error fetching headers:", error);
    return NextResponse.json(
      { error: "Failed to fetch headers" },
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
    const { label, slug, parentId, icon, position, docId } = body;

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
        label,
        slug: normalizedSlug,
        parentId: parentId || null,
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
