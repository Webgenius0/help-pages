import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { PublicDocPageView } from "./PublicDocPageView";
import { getUser, getProfile } from "@/lib/auth";

export default async function PublicDocPagePage({
  params,
}: {
  params: Promise<{ slug: string; pageSlug: string }>;
}) {
  const { slug: docSlug, pageSlug: rawPageSlug } = await params;

  // Decode the page slug (handles URL encoding like %20 for spaces)
  const decodedPageSlug = decodeURIComponent(rawPageSlug);

  const doc = await (prisma as any).doc.findUnique({
    where: { slug: docSlug },
    include: {
      user: {
        select: {
          id: true,
          username: true,
        },
      },
    },
  });

  if (!doc || !doc.isPublic) {
    notFound();
  }

  // Check if user can edit (owner, admin, or editor)
  let canEdit = false;
  let currentUserProfile = null;
  try {
    const user = await getUser();
    if (user?.email) {
      currentUserProfile = await getProfile();
      if (currentUserProfile) {
        const isOwner = doc.userId === currentUserProfile.id;
        const isAdmin = currentUserProfile.role === "admin";
        const isEditor = currentUserProfile.role === "editor";
        canEdit = isOwner || isAdmin || isEditor;
      }
    }
  } catch (error) {
    // User not logged in, that's fine
  }

  // Try multiple slug variations to find the page
  let page = await (prisma as any).page.findFirst({
    where: {
      docId: doc.id,
      slug: decodedPageSlug,
      status: "published",
    },
    include: {
      parent: true,
      children: {
        where: {
          status: "published",
        },
        orderBy: {
          position: "asc",
        },
        select: {
          id: true,
          title: true,
          slug: true,
          summary: true,
          position: true,
        },
      },
    },
  });

  // If not found with decoded slug, try original encoded version
  if (!page) {
    page = await (prisma as any).page.findFirst({
      where: {
        docId: doc.id,
        slug: rawPageSlug, // Use original raw slug
        status: "published",
      },
      include: {
        parent: true,
        children: {
          where: {
            status: "published",
          },
          orderBy: {
            position: "asc",
          },
          select: {
            id: true,
            title: true,
            slug: true,
            summary: true,
            position: true,
          },
        },
      },
    });
  }

  // If still not found, try slugified version (lowercase, replace spaces with hyphens)
  if (!page) {
    const slugified = decodedPageSlug
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");

    // Only try slugified if it's different from the other two attempts
    if (slugified !== decodedPageSlug && slugified !== rawPageSlug) {
      page = await (prisma as any).page.findFirst({
        where: {
          docId: doc.id,
          slug: slugified,
          status: "published",
        },
        include: {
          parent: true,
          children: {
            where: {
              status: "published",
            },
            orderBy: {
              position: "asc",
            },
            select: {
              id: true,
              title: true,
              slug: true,
              summary: true,
              position: true,
            },
          },
        },
      });
    }
  }

  if (!page) {
    console.error("Page not found:", {
      docSlug,
      pageSlug: rawPageSlug,
      decodedPageSlug,
      docId: doc.id,
    });
    notFound();
  }

  // Get all pages for the doc (for left sidebar navigation)
  const allPages = await (prisma as any).page.findMany({
    where: {
      docId: doc.id,
      status: "published",
      parentId: null, // Only top-level pages in sidebar
    },
    select: {
      id: true,
      title: true,
      slug: true,
      position: true,
    },
    orderBy: {
      position: "asc",
    },
  });

  return (
    <PublicDocPageView
      doc={{
        id: doc.id,
        title: doc.title,
        slug: doc.slug,
        description: doc.description,
        pages: allPages,
      }}
      page={page}
      canEdit={canEdit}
      docUserId={doc.userId}
    />
  );
}
