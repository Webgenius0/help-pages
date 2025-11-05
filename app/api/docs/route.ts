import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUser, getProfile } from "@/lib/auth";
import { generateSlug, isValidSlug, getSlugErrorMessage } from "@/lib/slug";

// GET /api/docs - List all docs for the authenticated user
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

    // Each admin only sees their own docs
    // Editors can see docs they have access to (currently all docs of their admin)
    const whereClause: any = {};

    if (profile.role === "admin") {
      // Admins see only their own docs
      whereClause.userId = profile.id;
    } else if (profile.role === "editor") {
      // Editors see docs created by the admin who created them
      // First, find who created this editor
      try {
        const profileWithCreatedBy = profile as any;
        if (profileWithCreatedBy.createdBy) {
          const editorCreator = await prisma.user.findUnique({
            where: { id: profileWithCreatedBy.createdBy },
            select: { id: true },
          });

          if (editorCreator) {
            // Show docs created by their admin
            whereClause.userId = editorCreator.id;
          } else {
            // If no creator found, show no docs
            whereClause.userId = "no-match";
          }
        } else {
          // Legacy editor without createdBy - show no docs for now
          whereClause.userId = "no-match";
        }
      } catch (error: any) {
        // If createdBy column doesn't exist yet, show no docs
        console.warn("Error checking editor creator:", error.message);
        whereClause.userId = "no-match";
      }
    } else {
      // Other users only see their own docs
      whereClause.userId = profile.id;
    }

    const docs = await (prisma as any).doc.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
          },
        },
        _count: {
          select: {
            pages: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return NextResponse.json({ docs });
  } catch (error: any) {
    console.error("Error fetching docs:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch docs",
        details: error?.message || "Unknown error",
        code: error?.code || "UNKNOWN",
      },
      { status: 500 }
    );
  }
}

// POST /api/docs - Create a new doc
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
    const { title, slug, description, isPublic } = body;

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
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

    // Check if slug already exists
    const existingDoc = await (prisma as any).doc.findUnique({
      where: { slug: normalizedSlug },
    });

    if (existingDoc) {
      return NextResponse.json(
        { error: "A documentation with this slug already exists" },
        { status: 400 }
      );
    }

    const doc = await (prisma as any).doc.create({
      data: {
        userId: profile.id,
        title,
        slug: normalizedSlug,
        description: description || null,
        isPublic: isPublic !== undefined ? isPublic : true,
      },
      include: {
        _count: {
          select: {
            pages: true,
          },
        },
      },
    });

    return NextResponse.json({ doc }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating doc:", error);

    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "A documentation with this slug already exists" },
        { status: 400 }
      );
    }

    // Check if it's a table not found error
    if (error?.message?.includes("does not exist") || error?.code === "P2021") {
      return NextResponse.json(
        {
          error: "Database migration required",
          details:
            "The Doc table does not exist. Please run: npx prisma migrate dev",
          code: error?.code || "MIGRATION_REQUIRED",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to create doc",
        details: error?.message || "Unknown error",
        code: error?.code || "UNKNOWN",
      },
      { status: 500 }
    );
  }
}
