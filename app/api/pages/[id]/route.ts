import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUser } from "@/lib/auth";
import { generateSlug, isValidSlug, getSlugErrorMessage } from "@/lib/slug";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getUser();

  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const page = await prisma.page.findUnique({
      where: { id },
      include: {
        children: true,
        navHeader: true,
      },
    });

    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    return NextResponse.json({ page });
  } catch (error) {
    console.error("Error fetching page:", error);
    return NextResponse.json(
      { error: "Failed to fetch page" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error("Failed to parse request body:", parseError);
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    // Explicitly remove isPublic from body if present (Pages don't have isPublic - it's inherited from Doc)
    const {
      isPublic: _isPublic,
      isAutosave: _isAutosave,
      ...cleanBody
    } = body as any;
    if (_isPublic !== undefined) {
      console.warn(
        "Ignoring isPublic field in request - Pages inherit visibility from their parent Doc"
      );
    }

    let { title, slug, content, summary, description, position, status } =
      cleanBody;

    // Check if this is an autosave request
    const isAutosave =
      request.headers.get("X-Autosave") === "true" || _isAutosave === true;

    // Create a revision before updating (only if content or title changed)
    const currentPage = await prisma.page.findUnique({
      where: { id },
    });

    // Log autosave requests for debugging
    if (isAutosave) {
      console.log("🔵 AUTOSAVE REQUEST RECEIVED:", {
        pageId: id,
        userId: profile.id,
        hasTitle: !!title,
        hasContent: !!content,
        hasSummary: !!summary,
        status: status || currentPage?.status,
        timestamp: new Date().toISOString(),
      });
    }

    // Normalize and validate slug if provided
    if (slug !== undefined) {
      const normalizedSlug = generateSlug(slug || title || "");
      if (!isValidSlug(normalizedSlug)) {
        const errorMsg = getSlugErrorMessage(normalizedSlug);
        return NextResponse.json(
          { error: errorMsg || "Invalid slug format" },
          { status: 400 }
        );
      }
      slug = normalizedSlug;
    }

    if (!currentPage) {
      console.error("Page not found:", id);
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    // If page has a docId, check if user owns the doc
    let ownsDoc = false;
    // Access docId using the mapped field name if Prisma uses it
    const pageDocId = (currentPage as any).docId || (currentPage as any).doc_id;
    if (pageDocId) {
      try {
        const doc = await (prisma as any).doc.findUnique({
          where: { id: pageDocId },
          select: { userId: true },
        });
        ownsDoc = doc?.userId === profile.id;
      } catch (docError) {
        console.warn("Failed to check doc ownership:", docError);
        // Continue without doc ownership check
      }
    }

    // Check permissions: user must own the page OR own the doc that contains the page
    const ownsPage = currentPage.userId === profile.id;
    const isAdmin = profile.role === "admin";
    const isEditor = profile.role === "editor";

    if (!ownsPage && !ownsDoc && !isAdmin && !isEditor) {
      console.error("Unauthorized: User does not own this page or doc", {
        userId: profile.id,
        pageUserId: currentPage.userId,
        docId: pageDocId,
        userRole: profile.role,
        ownsPage,
        ownsDoc,
      });
      return NextResponse.json(
        { error: "Unauthorized: You don't have permission to edit this page" },
        { status: 403 }
      );
    }

    // Only create revision if content or title actually changed
    // Skip revision creation for autosave unless there are significant changes
    // This reduces database writes and improves autosave performance
    const contentChanged =
      content !== undefined && content !== currentPage.content;
    const titleChanged = title !== undefined && title !== currentPage.title;

    // Skip revision creation for autosave unless there are significant changes
    if (!isAutosave && (contentChanged || titleChanged)) {
      try {
        await prisma.pageRevision.create({
          data: {
            pageId: id,
            userId: profile.id,
            snapshot: {
              title: currentPage.title,
              slug: currentPage.slug,
              content: currentPage.content,
              summary: currentPage.summary,
              status: currentPage.status,
            },
          },
        });
      } catch (revisionError: any) {
        // Log but don't fail the update if revision creation fails
        console.warn("Failed to create revision:", revisionError?.message);
      }
    } else if (isAutosave && (contentChanged || titleChanged)) {
      // For autosave, only create revision for significant content/title changes
      // This balances data safety with performance
      const contentLength = currentPage.content?.length || 0;
      const newContentLength = content?.length || 0;
      const contentChangePercent =
        contentLength > 0
          ? (Math.abs(newContentLength - contentLength) / contentLength) * 100
          : newContentLength > 0
          ? 100
          : 0;

      // Only create revision if change is significant (>10% of content length or title changed)
      if (titleChanged || contentChangePercent > 10) {
        try {
          await prisma.pageRevision.create({
            data: {
              pageId: id,
              userId: profile.id,
              snapshot: {
                title: currentPage.title,
                slug: currentPage.slug,
                content: currentPage.content,
                summary: currentPage.summary,
                status: currentPage.status,
              },
            },
          });
        } catch (revisionError: any) {
          console.warn(
            "Failed to create revision during autosave:",
            revisionError?.message
          );
        }
      }
    }

    // Build update data - only include valid Prisma fields
    // Note: Pages don't have isPublic field - visibility is controlled by the parent Doc
    const updateData: {
      title?: string;
      slug?: string;
      content?: string;
      summary?: string | null;
      position?: number;
      status?: string;
      publishedAt?: Date;
    } = {};

    if (title !== undefined && title !== null) updateData.title = title;
    if (slug !== undefined && slug !== null) updateData.slug = slug;
    if (content !== undefined) updateData.content = content;
    if (summary !== undefined) {
      updateData.summary = summary === null || summary === "" ? null : summary;
    }
    // Map description to summary only if summary is not provided
    if (description !== undefined && summary === undefined) {
      updateData.summary =
        description === null || description === "" ? null : description;
    }
    if (position !== undefined && position !== null) {
      updateData.position =
        typeof position === "number" ? position : parseInt(position);
    }
    // Note: isPublic removed - Pages inherit visibility from their parent Doc
    // Visibility is controlled at the Doc level, not the Page level

    if (status !== undefined && status !== null) {
      // Validate status value
      const validStatuses = ["draft", "published"];
      const statusValue = String(status).toLowerCase().trim();

      if (validStatuses.includes(statusValue)) {
        updateData.status = statusValue;
        if (statusValue === "published" && !currentPage.publishedAt) {
          updateData.publishedAt = new Date();
        }
      } else {
        console.warn(
          `Invalid status value: "${status}", using 'draft' instead`
        );
        updateData.status = "draft";
      }
    }

    // Note: searchIndex removed - update it separately if needed via raw query
    // Keeping this commented out as searchIndex field might not be updateable via Prisma
    // if (title !== undefined || content !== undefined || summary !== undefined) {
    //   const searchTitle =
    //     title !== undefined ? title || "" : currentPage.title || "";
    //   const searchContent =
    //     content !== undefined ? content || "" : currentPage.content || "";
    //   const searchSummary =
    //     summary !== undefined ? summary || "" : currentPage.summary || "";
    //   updateData.searchIndex =
    //     `${searchTitle} ${searchContent} ${searchSummary}`.toLowerCase().trim();
    // }

    // Ensure we have at least one field to update
    // For autosave, always allow empty updates to ensure timestamp is updated
    if (Object.keys(updateData).length === 0 && !isAutosave) {
      console.warn("No fields to update");
      return NextResponse.json({
        error: "No fields provided for update",
        page: currentPage,
      });
    }

    // For autosave, ensure at least updatedAt is touched even if no fields changed
    // This ensures the database knows the page was recently saved
    if (isAutosave && Object.keys(updateData).length === 0) {
      // Force update by touching a field that always exists
      updateData.summary = currentPage.summary; // This will trigger an update
    }

    // Validate data types before sending to Prisma
    if (updateData.title && typeof updateData.title !== "string") {
      return NextResponse.json(
        { error: "Invalid title type" },
        { status: 400 }
      );
    }
    if (updateData.slug && typeof updateData.slug !== "string") {
      return NextResponse.json({ error: "Invalid slug type" }, { status: 400 });
    }
    if (
      updateData.content !== undefined &&
      typeof updateData.content !== "string"
    ) {
      return NextResponse.json(
        { error: "Invalid content type" },
        { status: 400 }
      );
    }
    if (
      updateData.position !== undefined &&
      typeof updateData.position !== "number"
    ) {
      return NextResponse.json(
        { error: "Invalid position type" },
        { status: 400 }
      );
    }
    if (updateData.status && typeof updateData.status !== "string") {
      return NextResponse.json(
        { error: "Invalid status type" },
        { status: 400 }
      );
    }

    console.log("Updating page with data:", {
      id,
      updateDataKeys: Object.keys(updateData),
      updateDataTypes: Object.keys(updateData).reduce((acc, key) => {
        acc[key] = typeof updateData[key as keyof typeof updateData];
        return acc;
      }, {} as Record<string, string>),
    });

    try {
      console.log("🔵 Attempting database update:", {
        pageId: id,
        isAutosave,
        updateDataKeys: Object.keys(updateData),
        updateData: Object.keys(updateData).reduce((acc, key) => {
          const value = updateData[key as keyof typeof updateData];
          if (key === "content") {
            acc[key] = value ? `[${(value as string).length} chars]` : null;
          } else {
            acc[key] = value;
          }
          return acc;
        }, {} as Record<string, any>),
      });

      const page = await prisma.page.update({
        where: { id },
        data: updateData,
        include: {
          user: {
            select: {
              username: true,
            },
          },
          navHeader: {
            select: {
              label: true,
              slug: true,
            },
          },
        },
      });

      if (isAutosave) {
        console.log("✅ Page autosaved successfully:", {
          id,
          status: page.status,
          updatedAt: page.updatedAt,
          title: page.title?.substring(0, 50),
        });
      } else {
        console.log("✅ Page updated successfully:", {
          id,
          status: page.status,
        });
      }

      return NextResponse.json({ page });
    } catch (updateError: any) {
      console.error("Prisma update error:", updateError);
      console.error("Update error details:", {
        code: updateError?.code,
        message: updateError?.message,
        meta: updateError?.meta,
      });

      // Return a more specific error response
      if (updateError?.code === "P2002") {
        const field = updateError?.meta?.target?.[0] || "field";
        return NextResponse.json(
          {
            error: `A page with this ${field} already exists`,
            code: "DUPLICATE",
            details: updateError?.meta,
          },
          { status: 400 }
        );
      }

      // For other Prisma errors, return the error
      return NextResponse.json(
        {
          error: "Failed to update page",
          details: updateError?.message || "Unknown database error",
          code: updateError?.code || "DATABASE_ERROR",
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    // Strip ANSI color codes from error message for cleaner logging
    const cleanMessage =
      error?.message?.replace(/\x1B\[[0-9;]*m/g, "") || "Unknown error";

    console.error("========== ERROR UPDATING PAGE ==========");
    console.error("Error message:", cleanMessage);
    console.error("Error code:", error?.code);
    console.error("Error name:", error?.name);
    console.error("Error stack:", error?.stack);
    console.error("Error meta:", JSON.stringify(error?.meta, null, 2));
    console.error("Full error object:", error);
    console.error("=========================================");

    // Provide more specific error messages
    if (error?.code === "P2002") {
      const field = error?.meta?.target?.[0] || "field";
      return NextResponse.json(
        {
          error: `A page with this ${field} already exists`,
          field,
        },
        { status: 400 }
      );
    }

    if (error?.code === "P2025") {
      return NextResponse.json(
        {
          error: "Page not found",
        },
        { status: 404 }
      );
    }

    // P2003: Foreign key constraint failed
    if (error?.code === "P2003") {
      return NextResponse.json(
        {
          error: "Invalid reference: Related record not found",
        },
        { status: 400 }
      );
    }

    // P2011: Null constraint violation
    if (error?.code === "P2011") {
      return NextResponse.json(
        {
          error: "Required field is missing",
        },
        { status: 400 }
      );
    }

    // Return clean error message without ANSI codes
    return NextResponse.json(
      {
        error: "Failed to update page",
        details:
          process.env.NODE_ENV === "development" ? cleanMessage : undefined,
        code: error?.code,
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getUser();

  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await prisma.page.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting page:", error);
    return NextResponse.json(
      { error: "Failed to delete page" },
      { status: 500 }
    );
  }
}
