import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BookOpen,
  Zap,
  Shield,
  Users,
  ArrowRight,
  FileText,
} from "lucide-react";
import prisma from "@/lib/prisma";
import { Header } from "./components/Header";
import { getUser, getProfile } from "@/lib/auth";
import { getSubdomain } from "@/lib/subdomain";

export const dynamic = "force-dynamic";
export const revalidate = 60; // Revalidate every 60 seconds

async function getPublicDocs() {
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
        user: {
          select: {
            username: true,
            fullName: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 6, // Show 6 latest docs on landing page
    });
    return docs || [];
  } catch (error) {
    console.error("Error fetching docs:", error);
    return [];
  }
}

export default async function HomePage() {
  const subdomain = await getSubdomain();
  const user = await getUser();
  const profile = await getProfile();

  // If user is logged in and on main domain, redirect to their subdomain
  if (!subdomain && user && profile?.username) {
    redirect(`https://${profile.username}.helppages.ai/`);
  } else {
    redirect("https://helppages.ai/");
  }

  const recentDocs = await getPublicDocs();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-linear-to-b from-background via-background to-muted/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16 md:pt-20 lg:pt-24 pb-12 sm:pb-16 md:pb-20">
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4 sm:mb-6 leading-tight">
              Beautiful Documentation
              <span className="block text-primary mt-1 sm:mt-2">
                Made Simple
              </span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-6 sm:mb-8 px-4 sm:px-0">
              Create, manage, and share beautiful documentation sites for your
              applications. Built for developers, by developers.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4 sm:px-0">
              <Link
                href="/docs"
                className="btn-primary inline-flex items-center justify-center px-6 sm:px-8 py-2.5 sm:py-3 text-sm sm:text-base"
              >
                Browse Docs
                <ArrowRight className="ml-2 w-4 h-4 sm:w-5 sm:h-5" />
              </Link>
              <Link
                href="/auth/signup"
                className="btn-secondary inline-flex items-center justify-center px-6 sm:px-8 py-2.5 sm:py-3 text-sm sm:text-base"
              >
                Get Started Free
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 sm:py-16 md:py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-12 md:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3 sm:mb-4">
              Everything You Need
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto px-4 sm:px-0">
              Powerful features to create and manage your documentation
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
            <div className="p-5 sm:p-6 bg-card border border-border rounded-lg">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-3 sm:mb-4">
                <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2">
                Fast & Reliable
              </h3>
              <p className="text-sm sm:text-base text-muted-foreground">
                Built with Next.js for lightning-fast performance and excellent
                SEO.
              </p>
            </div>

            <div className="p-5 sm:p-6 bg-card border border-border rounded-lg">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-3 sm:mb-4">
                <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2">
                Secure & Private
              </h3>
              <p className="text-sm sm:text-base text-muted-foreground">
                Control access to your docs. Keep them public or private with
                granular permissions.
              </p>
            </div>

            <div className="p-5 sm:p-6 bg-card border border-border rounded-lg sm:col-span-2 lg:col-span-1">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-3 sm:mb-4">
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2">
                Collaborative
              </h3>
              <p className="text-sm sm:text-base text-muted-foreground">
                Work together with your team. Roles, permissions, and real-time
                editing.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Recent Docs Section */}
      <section className="py-12 sm:py-16 md:py-20 bg-muted/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 sm:mb-12 gap-4 sm:gap-0">
            <div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-2 sm:mb-4">
                Recent Documentation
              </h2>
              <p className="text-sm sm:text-base md:text-lg text-muted-foreground">
                Explore documentation created by our community
              </p>
            </div>
            <Link
              href="/docs"
              className="hidden sm:flex items-center text-primary hover:text-primary/80 font-medium text-sm sm:text-base"
            >
              View All
              <ArrowRight className="ml-2 w-4 h-4 sm:w-5 sm:h-5" />
            </Link>
          </div>

          {recentDocs.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {recentDocs.map((doc: any) => (
                <Link
                  key={doc.id}
                  href={`/docs/${doc.slug}`}
                  className="group p-4 sm:p-6 bg-card border border-border rounded-lg hover:border-primary transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                    </div>
                    <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-2">
                    {doc.title}
                  </h3>
                  {doc.description && (
                    <p className="text-sm sm:text-base text-muted-foreground mb-3 sm:mb-4 line-clamp-2">
                      {doc.description}
                    </p>
                  )}
                  <div className="flex items-center text-xs sm:text-sm text-muted-foreground">
                    <span>By {doc.user?.fullName || doc.user?.username}</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 sm:py-12">
              <BookOpen className="w-12 h-12 sm:w-16 sm:h-16 text-muted-foreground mx-auto mb-3 sm:mb-4" />
              <p className="text-base sm:text-lg text-muted-foreground px-4">
                No public documentation yet. Be the first to create one!
              </p>
            </div>
          )}

          <div className="text-center mt-6 sm:mt-8 sm:hidden">
            <Link
              href="/docs"
              className="inline-flex items-center text-primary hover:text-primary/80 font-medium text-sm sm:text-base"
            >
              View All Documentation
              <ArrowRight className="ml-2 w-4 h-4 sm:w-5 sm:h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-12 sm:py-16 md:py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-4 sm:mb-6">
              About HelpPages
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground mb-4 sm:mb-6 px-4 sm:px-0">
              HelpPages is a modern documentation platform designed for
              developers and teams who want to create beautiful, maintainable
              documentation sites. Whether you're documenting an API, a library,
              or a product, we've got you covered.
            </p>
            <p className="text-base sm:text-lg text-muted-foreground mb-6 sm:mb-8 px-4 sm:px-0">
              Our platform combines the power of markdown editing with a
              flexible CMS, giving you full control over your content while
              keeping the editing experience simple and intuitive.
            </p>
            <Link
              href="/auth/signup"
              className="btn-primary inline-flex items-center justify-center px-6 sm:px-8 py-2.5 sm:py-3 text-sm sm:text-base"
            >
              Start Creating
              <ArrowRight className="ml-2 w-4 h-4 sm:w-5 sm:h-5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
