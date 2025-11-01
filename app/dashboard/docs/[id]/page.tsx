import { redirect, notFound } from "next/navigation";
import { getUser, getProfile } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { DocManagementClient } from "./DocManagementClient";

export const dynamic = "force-dynamic";

export default async function DocManagementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const profile = await getProfile();

  if (!profile) {
    redirect("/auth/login");
  }

  // Fetch the doc (include userId for permission checks)
  const doc = await (prisma as any).doc.findUnique({
    where: { id },
    include: {
      navHeaders: {
        where: {
          parentId: null, // Top-level sections only
        },
        include: {
          children: {
            include: {
              pages: {
                orderBy: {
                  position: "asc",
                },
                select: {
                  id: true,
                  title: true,
                  slug: true,
                  status: true,
                  position: true,
                },
              },
            },
            orderBy: {
              position: "asc",
            },
          },
          pages: {
            where: {
              parentId: null,
            },
            orderBy: {
              position: "asc",
            },
            select: {
              id: true,
              title: true,
              slug: true,
              status: true,
              position: true,
            },
          },
        },
        orderBy: {
          position: "asc",
        },
      },
      pages: {
        where: {
          parentId: null,
          navHeaderId: null, // Pages not in any section
        },
        orderBy: {
          position: "asc",
        },
        select: {
          id: true,
          title: true,
          slug: true,
          status: true,
          position: true,
        },
      },
      _count: {
        select: {
          pages: true,
        },
      },
    },
  });

  if (!doc) {
    notFound();
  }

  // Check permissions: owner, admin, or editor can access
  const isOwner = doc.userId === profile.id;
  const isAdmin = profile.role === "admin";
  const isEditor = profile.role === "editor";

  if (!isOwner && !isAdmin && !isEditor) {
    redirect("/dashboard");
  }

  return <DocManagementClient doc={doc} profile={profile} />;
}
