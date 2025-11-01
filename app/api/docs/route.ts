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

    // Admins and editors can see all docs (for collaboration)
    // Viewers (non-logged-in) only see public docs
    const whereClause =
      profile.role === "admin" || profile.role === "editor"
        ? {} // No filter - see all docs
        : { userId: profile.id }; // Regular users only see their own

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
