import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/lib/auth";
import { CategoryManagement } from "./CategoryManagement";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const user = await getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const profile = await getProfile();

  if (!profile) {
    redirect("/auth/login");
  }

  // Only admins and editors can manage categories
  if (profile.role === "viewer") {
    redirect("/dashboard");
  }

  // Note: Categories (navHeaders) now belong to Docs, not Users
  // Get all navHeaders from docs owned by this user
  const userDocs = await (prisma as any).doc.findMany({
    where: { userId: profile.id },
    select: { id: true },
  });

  const docIds = userDocs.map((doc: any) => doc.id);

  // If user has no docs, return empty array
  const navHeaders =
    docIds.length > 0
      ? await prisma.navHeader.findMany({
          where: { docId: { in: docIds } } as any,
          include: {
            parent: true,
            children: true,
          },
          orderBy: { position: "asc" },
        })
      : [];

  return <CategoryManagement user={profile} initialHeaders={navHeaders} />;
}
