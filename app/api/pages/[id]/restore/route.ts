import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: pageId } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { revisionId } = await request.json();

    if (!revisionId) {
      return NextResponse.json(
        { error: "Missing revisionId" },
        { status: 400 }
      );
    }

    const page = await prisma.page.findUnique({
      where: { id: pageId },
    });

    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    // Check permissions
    if (
      user.id !== page.userId &&
      user.role !== "admin" &&
      user.role !== "editor"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const revision = await prisma.pageRevision.findUnique({
      where: { id: revisionId },
    });

    if (!revision || revision.pageId !== pageId) {
      return NextResponse.json(
        { error: "Revision not found" },
        { status: 404 }
      );
    }

    // Create a new revision with current content before restoring
    await prisma.pageRevision.create({
      data: {
        pageId: page.id,
        userId: user.id,
        snapshot: {
          title: page.title,
          content: page.content,
          summary: page.summary,
          status: page.status,
          // Note: isPublic removed - pages inherit visibility from parent Doc
        },
        changeLog: "Backup before restore",
      } as any,
    });

    // Restore the page from the revision
    const snapshot = revision.snapshot as any;
    const updatedPage = await prisma.page.update({
      where: { id: pageId },
      data: {
        title: snapshot.title,
        content: snapshot.content,
        summary: snapshot.summary || null,
        status: snapshot.status,
        // Note: isPublic removed - pages inherit visibility from parent Doc
        lastEditedBy: user.username || user.email,
        searchIndex: `${snapshot.title} ${snapshot.content} ${
          snapshot.summary || ""
        }`.toLowerCase(),
      } as any,
    });

    // Create a new revision for the restore action
    await prisma.pageRevision.create({
      data: {
        pageId: page.id,
        userId: user.id,
        snapshot: {
          title: updatedPage.title,
          content: updatedPage.content,
          summary: updatedPage.summary,
          status: updatedPage.status,
          // Note: isPublic removed - pages inherit visibility from parent Doc
        },
        changeLog: `Restored from version ${new Date(
          revision.createdAt
        ).toLocaleString()}`,
      } as any,
    });

    return NextResponse.json({
      message: "Page restored successfully",
      page: updatedPage,
    });
  } catch (error) {
    console.error("Failed to restore page:", error);
    return NextResponse.json(
      { error: "Failed to restore page" },
      { status: 500 }
    );
  }
}
