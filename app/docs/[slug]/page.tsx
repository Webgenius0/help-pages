import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { PublicDocsView } from "./PublicDocsView";

// Static generation with ISR - revalidate every 60 seconds
// Pages are statically generated at build time and revalidated every 60 seconds
export const revalidate = 60;

// Generate static params for all public docs at build time
export async function generateStaticParams() {
  const docs = await (prisma as any).doc.findMany({
    where: {
      isPublic: true,
    },
    select: {
      slug: true,
    },
  });

  return docs.map((doc: { slug: string }) => ({
    slug: doc.slug,
  }));
}

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
  // Skip auth check during static generation to avoid dynamic server usage
  let canEdit = false;
  // Note: Auth check happens client-side in the component if needed

  // Get header dropdowns (NavHeaders) for this doc
  const navHeaders = await (prisma as any).navHeader.findMany({
    where: {
      docId: doc.id,
      parentId: null,
      docItemId: null, // Top-level dropdowns only
    },
    orderBy: { position: "asc" },
  });

  // For each dropdown, fetch its items (DocItems) with their sections
  const dropdownsWithItems = await Promise.all(
    navHeaders.map(async (header: any) => {
      // Fetch docItems for this dropdown using raw SQL
      const docItems = await (prisma as any).$queryRaw`
        SELECT 
          id,
          nav_header_id as "navHeaderId",
          label,
          slug,
          description,
          position,
          is_default as "isDefault"
        FROM doc_items
        WHERE nav_header_id = ${header.id}
        ORDER BY position ASC, created_at ASC
      `;

      // For each item, fetch its sections (NavHeaders within the item)
      const itemsWithSections = await Promise.all(
        docItems.map(async (item: any) => {
          // Fetch top-level sections (sections within this item, parentId is null)
          const sections = await (prisma as any).navHeader.findMany({
            where: {
              docId: doc.id,
              docItemId: item.id,
              parentId: null, // Top-level sections
            },
            orderBy: { position: "asc" },
          });

          // For each section, fetch its subsections and pages
          const sectionsWithContent = await Promise.all(
            sections.map(async (section: any) => {
              // Fetch subsections (NavHeaders with parentId = section.id)
              const subsections = await (prisma as any).navHeader.findMany({
                where: {
                  docId: doc.id,
                  docItemId: item.id,
                  parentId: section.id,
                },
                orderBy: { position: "asc" },
              });

              // Fetch pages in this section
              const sectionPages = await (prisma as any).page.findMany({
                where: {
                  docId: doc.id,
                  docItemId: item.id,
                  navHeaderId: section.id,
                  status: "published",
                  parentId: null,
                },
                select: {
                  id: true,
                  title: true,
                  slug: true,
                  summary: true,
                  position: true,
                  docItemId: true,
                  navHeaderId: true,
                },
                orderBy: { position: "asc" },
              });

              // Fetch pages in subsections
              const subsectionPages = await Promise.all(
                subsections.map(async (subsection: any) => {
                  const pages = await (prisma as any).page.findMany({
                    where: {
                      docId: doc.id,
                      docItemId: item.id,
                      navHeaderId: subsection.id,
                      status: "published",
                      parentId: null,
                    },
                    select: {
                      id: true,
                      title: true,
                      slug: true,
                      summary: true,
                      position: true,
                      docItemId: true,
                      navHeaderId: true,
                    },
                    orderBy: { position: "asc" },
                  });
                  return { ...subsection, pages };
                })
              );

              return {
                ...section,
                pages: sectionPages,
                subsections: subsectionPages,
              };
            })
          );

          // Fetch pages directly in the item (not in any section)
          const itemPages = await (prisma as any).page.findMany({
            where: {
              docId: doc.id,
              docItemId: item.id,
              navHeaderId: null, // Pages directly in item
              status: "published",
              parentId: null,
            },
            select: {
              id: true,
              title: true,
              slug: true,
              summary: true,
              position: true,
              docItemId: true,
              navHeaderId: true,
            },
            orderBy: { position: "asc" },
          });

          return {
            ...item,
            pages: itemPages,
            sections: sectionsWithContent,
          };
        })
      );

      return {
        ...header,
        items: itemsWithSections,
      };
    })
  );

  // Flatten all pages for compatibility (used when no item selected)
  const allPages: any[] = [];
  for (const dropdown of dropdownsWithItems) {
    for (const item of dropdown.items || []) {
      allPages.push(...(item.pages || []));
      item.sections?.forEach((section: any) => {
        allPages.push(...(section.pages || []));
        section.subsections?.forEach((subsection: any) => {
          allPages.push(...(subsection.pages || []));
        });
      });
    }
  }

  return (
    <PublicDocsView
      doc={{
        id: doc.id,
        title: doc.title,
        slug: doc.slug,
        description: doc.description,
        pages: allPages,
        navHeaders: dropdownsWithItems,
      }}
      canEdit={canEdit}
      docId={doc.id}
    />
  );
}
