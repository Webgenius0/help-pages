import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUser } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    const body = await request.json();
    const { pageId, helpful, comment, pageTitle } = body;

    if (!pageId || typeof helpful !== "boolean") {
      return NextResponse.json(
        { error: "pageId and helpful are required" },
        { status: 400 }
      );
    }

    // Verify page exists
    const page = await prisma.page.findUnique({
      where: { id: pageId },
    });

    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    // Create feedback entry
    // Note: You may want to create a Feedback model in Prisma schema
    // For now, we'll just log it or store in a simple table
    // This is a placeholder - implement based on your schema

    // Log feedback (you can store this in a database table later)
    console.log("Feedback received:", {
      pageId,
      pageTitle: pageTitle || page.title,
      helpful,
      comment,
      userId: user?.email || "anonymous",
      timestamp: new Date().toISOString(),
    });

    // Increment view count or update page stats if helpful
    if (helpful) {
      await prisma.page.update({
        where: { id: pageId },
        data: {
          viewCount: {
            increment: 0, // Could track helpful/not-helpful separately
          },
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Feedback error:", error);
    return NextResponse.json(
      { error: "Failed to submit feedback" },
      { status: 500 }
    );
  }
}

