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
    select: {
      id: true,
      username: true,
      fullName: true,
      bio: true,
      isPublic: true,
    },
  });

  // Get all public docs for this user
  const userDocs = await (prisma as any).doc.findMany({
    where: {
      userId: user?.id,
      isPublic: true,
    },
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
    },
    orderBy: {
      updatedAt: 'desc',
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

  // If user has public docs, redirect to the first one
  // Otherwise, show the docs list
  if (userDocs.length > 0) {
    // Get the first page from the first doc
    const firstDoc = userDocs[0];
    const firstPage = await (prisma as any).page.findFirst({
      where: {
        docId: firstDoc.id,
        status: 'published',
        parentId: null,
      },
      orderBy: {
        position: 'asc',
      },
      select: {
        slug: true,
      },
    });

    if (firstPage) {
      redirect(`/docs/${firstDoc.slug}/${firstPage.slug}`);
    } else {
      // No pages yet, but doc exists - redirect to doc homepage
      redirect(`/docs/${firstDoc.slug}`);
    }
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

        {userDocs.length === 0 ? (
          <div className="mt-12">
            <p className="text-foreground-lighter">
              No documentation published yet.
            </p>
          </div>
        ) : (
          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
            {userDocs.map((doc: any) => (
              <Link
                key={doc.id}
                href={`/docs/${doc.slug}`}
                className="bg-card rounded-lg border border-border p-6 hover:border-primary/50 hover:shadow-md transition-all duration-200"
              >
                <h2 className="text-xl font-bold text-foreground mb-2">
                  {doc.title}
                </h2>
                {doc.description && (
                  <p className="text-sm text-muted-foreground">
                    {doc.description}
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
