import Link from "next/link";
import prisma from "@/lib/prisma";
import { FileText, ArrowRight, Calendar } from "lucide-react";
import { Header } from "../components/Header";

export const dynamic = "force-dynamic";
export const revalidate = 60; // Revalidate every 60 seconds

async function getAllPublicDocs() {
  try {
    const docs = await (prisma as any).doc.findMany({
      where: {
        isPublic: true,
      },
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        updatedAt: true,
        createdAt: true,
        user: {
          select: {
            username: true,
            fullName: true,
          },
        },
        _count: {
          select: {
            pages: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });
    return docs || [];
  } catch (error) {
    console.error("Error fetching docs:", error);
    return [];
  }
}

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function DocsListingPage() {
  const docs = await getAllPublicDocs();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-4">
            Documentation
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Browse all public documentation created by our community. Find
            guides, tutorials, API references, and more.
          </p>
        </div>

        {docs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {docs.map((doc: any) => (
              <Link
                key={doc.id}
                href={`/docs/${doc.slug}`}
                className="group p-6 bg-card border border-border rounded-lg hover:border-primary transition-all hover:shadow-lg"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <FileText className="w-6 h-6 text-primary" />
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
                <h2 className="text-xl font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                  {doc.title}
                </h2>
                {doc.description && (
                  <p className="text-muted-foreground mb-4 line-clamp-3">
                    {doc.description}
                  </p>
                )}
                <div className="flex items-center justify-between text-sm text-muted-foreground pt-4 border-t border-border">
                  <span>
                    By {doc.user?.fullName || doc.user?.username || "Unknown"}
                  </span>
                  <div className="flex items-center gap-4">
                    {doc._count?.pages > 0 && (
                      <span>{doc._count.pages} pages</span>
                    )}
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(doc.updatedAt)}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <FileText className="w-20 h-20 text-muted-foreground mx-auto mb-6" />
            <h2 className="text-2xl font-semibold text-foreground mb-2">
              No Documentation Yet
            </h2>
            <p className="text-muted-foreground mb-8">
              Be the first to create and share documentation!
            </p>
            <Link
              href="/auth/signup"
              className="btn-primary inline-flex items-center justify-center px-6 py-3 text-base"
            >
              Get Started
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

