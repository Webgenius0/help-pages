import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import PageEditorClient from "./PageEditorClient";
import prisma from "@/lib/prisma";

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

  const page = await prisma.page.findUnique({
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

  // Check permissions: owner, admin, or editor can access
  const isOwner = page.doc.userId === profile.id;
  const isAdmin = profile.role === "admin";
  const isEditor = profile.role === "editor";

  if (!page || (!isOwner && !isAdmin && !isEditor)) {
    redirect("/dashboard");
  }

  return <PageEditorClient page={page} />;
}
