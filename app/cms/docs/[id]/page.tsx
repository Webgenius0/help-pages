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

  // Fetch the doc (just basic info - DocManagementClient will load the full structure)
  const doc = await (prisma as any).doc.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      isPublic: true,
      userId: true,
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
    redirect("/cms");
  }

  // Prepare doc with empty arrays for navHeaders and pages
  // DocManagementClient will load them via API calls
  const docWithEmptyArrays = {
    ...doc,
    navHeaders: [],
    pages: [],
  };

  return <DocManagementClient doc={docWithEmptyArrays} profile={profile} />;
}
