import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { PublicDocPageView } from "./PublicDocPageView";
import { getUser, getProfile } from "@/lib/auth";

// Static generation with ISR - revalidate every 60 seconds
// Pages are statically generated at build time and revalidated every 60 seconds
export const revalidate = 60;

// Generate static params for all public doc pages at build time
export async function generateStaticParams() {
  // Get all public docs with their published pages
  const docs = await (prisma as any).doc.findMany({
    where: {
      isPublic: true,
    },
    select: {
      slug: true,
      id: true,
    },
  });

  const params: { slug: string; pageSlug: string }[] = [];

  // For each doc, get ALL published pages (including nested ones)
  for (const doc of docs) {
    const pages = await (prisma as any).page.findMany({
      where: {
        docId: doc.id,
        status: "published",
        // Include all pages, not just top-level, so nested pages are also pre-generated
      },
      select: {
        slug: true,
      },
    });

    // Add params for each page
    for (const page of pages) {
      params.push({
        slug: doc.slug,
        pageSlug: page.slug,
      });
    }
  }

  return params;
}

export default async function PublicDocPagePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; pageSlug: string }>;
  searchParams: Promise<{ item?: string }>;
}) {
  const { slug: docSlug, pageSlug: rawPageSlug } = await params;
  const { item: selectedItemId } = await searchParams;

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

  if (!doc) {
    notFound();
  }

  // Check if doc is public or if user is the owner
  const isPublic = doc.isPublic;
  let isOwner = false;

  if (!isPublic) {
    // Check if current user is the owner
    const user = await getUser();
    if (user?.email) {
      const profile = await getProfile();
      if (profile && doc.userId === profile.id) {
        isOwner = true;
      }
    }
  }

  // Only allow access if doc is public or user is the owner
  if (!isPublic && !isOwner) {
    notFound();
  }

  // Check if user can edit (owner, admin, or editor)
  // Skip auth check during static generation to avoid dynamic server usage
  let canEdit = false;
  // Note: Auth check happens client-side in the component if needed

  // Try multiple slug variations to find the page (consider docItem if provided)
  let page = await (prisma as any).page.findFirst({
    where: {
      docId: doc.id,
      slug: decodedPageSlug,
      status: "published",
      ...(selectedItemId ? { docItemId: selectedItemId } : {}), // If no item selected, don't filter by docItemId
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
        ...(selectedItemId ? { docItemId: selectedItemId } : { docItemId: null }),
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
          ...(selectedItemId ? { docItemId: selectedItemId } : { docItemId: null }),
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

  // Get all pages for the doc (for left sidebar navigation), filter by docItem if provided
  const allPages = await (prisma as any).page.findMany({
    where: {
      docId: doc.id,
      status: "published",
      parentId: null, // Only top-level pages in sidebar
      ...(selectedItemId ? { docItemId: selectedItemId } : {}), // If no item selected, show all pages
    },
    select: {
      id: true,
      title: true,
      slug: true,
      position: true,
      docItemId: true,
    },
    orderBy: {
      position: "asc",
    },
  });

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

  return (
    <PublicDocPageView
      doc={{
        id: doc.id,
        title: doc.title,
        slug: doc.slug,
        description: doc.description,
        pages: allPages,
        navHeaders: dropdownsWithItems,
      }}
      page={page}
      canEdit={canEdit}
      docUserId={doc.userId}
      selectedDocItemId={selectedItemId || null}
    />
  );
}
