import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";

export default async function UserDocsHomePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username: usernameParam } = await params;
  const username = usernameParam.replace("@", "");

  const user = await prisma.user.findUnique({
    where: { username },
    include: {
      navHeaders: {
        where: { parentId: null },
        include: {
          children: {
            include: {
              pages: {
                where: { status: "published", parentId: null, isPublic: true },
                orderBy: { position: "asc" },
              },
            },
            orderBy: { position: "asc" },
          },
          pages: {
            where: { status: "published", parentId: null, isPublic: true },
            orderBy: { position: "asc" },
          },
        },
        orderBy: { position: "asc" },
      },
    },
  });

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <h1 className="text-4xl font-bold text-foreground mb-4">
          User Not Found
        </h1>
        <p className="text-foreground-light mb-8">
          The user @{username} does not exist.
        </p>
        <Link href="/">
          <button>Go Home</button>
        </Link>
      </div>
    );
  }

  if (!user.isPublic) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <h1 className="text-4xl font-bold text-foreground mb-4">
          Private Documentation
        </h1>
        <p className="text-foreground-light mb-8">
          This user's documentation is private.
        </p>
        <Link href="/">
          <button>Go Home</button>
        </Link>
      </div>
    );
  }

  // Get the first published page as a landing page
  // Check top-level pages first, then nested pages
  let firstPage = user.navHeaders[0]?.pages[0];
  
  // If no page in first header, check children
  if (!firstPage && user.navHeaders[0]?.children?.[0]) {
    firstPage = user.navHeaders[0].children[0].pages[0];
  }
  
  // If still no page, check all headers
  if (!firstPage) {
    for (const header of user.navHeaders) {
      if (header.pages && header.pages.length > 0) {
        firstPage = header.pages[0];
        break;
      }
      if (header.children) {
        for (const child of header.children) {
          if (child.pages && child.pages.length > 0) {
            firstPage = child.pages[0];
            break;
          }
        }
        if (firstPage) break;
      }
    }
  }

  if (firstPage) {
    redirect(`/u/${username}/${firstPage.slug}`);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-foreground mb-4">
          {user.fullName || `@${user.username}`}'s Documentation
        </h1>
        {user.bio && (
          <p className="text-lg text-foreground-light mb-8">{user.bio}</p>
        )}

        {user.navHeaders.length === 0 ? (
          <div className="mt-12">
            <p className="text-foreground-lighter">
              No documentation published yet.
            </p>
          </div>
        ) : (
          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
            {user.navHeaders.map((header) => (
              <div
                key={header.id}
                className="bg-surface-100 rounded-lg border border-default p-6"
              >
                <h2 className="text-xl font-bold text-foreground mb-4">
                  {header.label}
                </h2>
                {header.pages.length > 0 && (
                  <ul className="space-y-2 mb-4">
                    {header.pages.map((page) => (
                      <li key={page.id}>
                        <Link
                          href={`/u/${username}/${page.slug}`}
                          className="text-brand hover:underline"
                        >
                          {page.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                {header.children && header.children.length > 0 && (
                  <div className="space-y-3">
                    {header.children.map((subheader) => (
                      <div key={subheader.id}>
                        <h3 className="text-sm font-semibold text-foreground-light mb-2">
                          {subheader.label}
                        </h3>
                        {subheader.pages.length > 0 && (
                          <ul className="space-y-1 pl-4">
                            {subheader.pages.map((page) => (
                              <li key={page.id}>
                                <Link
                                  href={`/u/${username}/${page.slug}`}
                                  className="text-sm text-brand hover:underline"
                                >
                                  {page.title}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
