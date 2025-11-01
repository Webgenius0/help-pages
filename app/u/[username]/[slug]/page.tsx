import { redirect, notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";
import TableOfContents from "./TableOfContents";
import MarkdownRenderer from "./MarkdownRenderer";

export default async function UserPageView({
  params,
}: {
  params: Promise<{ username: string; slug: string }>;
}) {
  const { username: usernameParam, slug } = await params;
  const username = usernameParam.replace("@", "");

  const user = await prisma.user.findUnique({
    where: { username },
  });

  if (!user) {
    console.log(`User not found: ${username}`);
    notFound();
  }

  if (!user.isPublic) {
    console.log(`User ${username} is not public`);
    notFound();
  }

  console.log(`Looking for page with slug: ${slug}, userId: ${user.id}`);
  
  const page = await prisma.page.findFirst({
    where: {
      userId: user.id,
      slug,
      status: "published",
      isPublic: true,
    },
    include: {
      navHeader: true,
      parent: true,
      children: {
        where: { status: "published", isPublic: true },
        orderBy: { position: "asc" },
      },
    },
  });

  if (!page) {
    console.log(`Page not found - slug: ${slug}, userId: ${user.id}`);
    // Log available pages for debugging
    const availablePages = await prisma.page.findMany({
      where: {
        userId: user.id,
      },
      select: {
        slug: true,
        title: true,
        status: true,
        isPublic: true,
      },
    });
    console.log(`All pages for user ${username}:`, availablePages);
    notFound();
  }

  // Extract headings for ToC
  const headings = extractHeadings(page.content);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link
                href={`/u/${username}`}
                className="flex items-center space-x-2 text-foreground hover:text-primary transition-colors"
              >
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-primary-foreground"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                  </svg>
                </div>
                <span className="font-semibold">@{username}</span>
              </Link>
              <span className="text-muted-foreground">/</span>
              <span className="text-sm text-muted-foreground">
                Docuemntation
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-12">
          {/* Main Content */}
          <div className="min-w-0">
            {/* Breadcrumbs */}
            <nav className="mb-8 text-sm text-muted-foreground">
              <Link
                href={`/u/${username}`}
                className="hover:text-primary transition-colors"
              >
                @{username}
              </Link>
              {page.navHeader && (
                <>
                  <span className="mx-2">/</span>
                  <span className="text-foreground">
                    {page.navHeader.label}
                  </span>
                </>
              )}
              <span className="mx-2">/</span>
              <span className="text-foreground font-medium">{page.title}</span>
            </nav>

            {/* Page Content */}
            <article className="prose prose-lg dark:prose-invert max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-h1:text-4xl prose-h2:text-3xl prose-h3:text-2xl prose-h4:text-xl prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-pre:bg-muted prose-pre:border prose-pre:border-border">
              <h1 className="text-4xl font-bold text-foreground mb-6">
                {page.title}
              </h1>
              {page.summary && (
                <div className="text-xl text-muted-foreground mb-8 p-6 bg-muted/50 rounded-lg border border-border">
                  {page.summary}
                </div>
              )}
              <MarkdownRenderer content={page.content} />
            </article>

            {/* Child Pages */}
            {page.children.length > 0 && (
              <div className="mt-16 border-t border-border pt-12">
                <h2 className="text-2xl font-bold text-foreground mb-6">
                  Related Pages
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {page.children.map((child) => (
                    <Link
                      key={child.id}
                      href={`/u/${username}/${child.slug}`}
                      className="group block p-6 bg-card rounded-lg border border-border hover:border-primary/50 hover:shadow-md transition-all duration-200"
                    >
                      <h3 className="font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                        {child.title}
                      </h3>
                      {child.summary && (
                        <p className="text-sm text-muted-foreground">
                          {child.summary}
                        </p>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Table of Contents */}
          {headings.length > 0 && (
            <aside className="hidden lg:block">
              <div className="sticky top-24">
                <div className="bg-card border border-border rounded-lg p-6">
                  <h3 className="text-sm font-semibold text-foreground mb-4">
                    On this page
                  </h3>
                  <TableOfContents headings={headings} />
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}

function extractHeadings(markdown: string) {
  const headingRegex = /^(#{1,3})\s+(.+)$/gm;
  const headings: { level: number; text: string; id: string }[] = [];
  let match;

  while ((match = headingRegex.exec(markdown)) !== null) {
    const level = match[1].length;
    const text = match[2];
    const id = text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    headings.push({ level, text, id });
  }

  return headings;
}
