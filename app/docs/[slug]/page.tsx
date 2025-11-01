import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { PublicDocsView } from "./PublicDocsView";
import { getUser, getProfile } from "@/lib/auth";

export default async function PublicDocPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const doc = await (prisma as any).doc.findUnique({
    where: { slug },
    include: {
      user: {
        select: {
          username: true,
          fullName: true,
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
      summary: true,
      position: true,
    },
    orderBy: {
      position: "asc",
    },
  });

  return (
    <PublicDocsView
      doc={{
        id: doc.id,
        title: doc.title,
        slug: doc.slug,
        description: doc.description,
        pages: allPages,
      }}
      canEdit={canEdit}
      docId={doc.id}
    />
  );
}
