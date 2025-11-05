import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import PageEditorClient from "./PageEditorClient";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function PageEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const profile = await prisma.user.findUnique({
    where: { email: user.email! },
  });

  if (!profile) {
    redirect("/auth/login");
  }

  const page = await (prisma as any).page.findUnique({
    where: { id },
    include: {
      navHeader: true,
      doc: {
        select: {
          id: true,
          userId: true,
        },
      },
    },
  });

  if (!page) {
    redirect("/cms");
  }

  // Check permissions: owner, admin, or editor can access
  const pageDoc = page.doc as { id: string; userId: string } | null;
  const isOwner = pageDoc?.userId === profile.id;
  const isAdmin = profile.role === "admin";
  const isEditor = profile.role === "editor";

  if (!isOwner && !isAdmin && !isEditor) {
    redirect("/cms");
  }

  return <PageEditorClient page={page} />;
}
