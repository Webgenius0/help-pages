import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BookOpen,
  Zap,
  Shield,
  Users,
  ArrowRight,
  FileText,
  Code,
  Search,
  Globe,
  CheckCircle2,
  Sparkles,
  Lock,
  GitBranch,
  Layout,
  BarChart3,
  Clock,
  Star,
  TrendingUp,
  Rocket,
  Palette,
  Workflow,
  Server,
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

  // Determine the correct domain based on authentication and subdomain
  const baseDomain = process.env.NEXT_PUBLIC_DOMAIN || "helppages.ai";
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";

  // Case 1: On a subdomain
  if (subdomain) {
    // User must be logged in to access subdomain root
    if (!user || !profile) {
      // Not logged in - redirect to login page on the SAME subdomain (not main domain)
      // This prevents redirect loops when users logout
      redirect(`${protocol}://${subdomain}.${baseDomain}/auth/login`);
    }

    // User is logged in - check if subdomain matches their username
    if (subdomain !== profile.username) {
      // Subdomain doesn't match - redirect to their own subdomain
      redirect(`${protocol}://${profile.username}.${baseDomain}/`);
    }

    // User is logged in and on their own subdomain - show subdomain home page
    // Load docs and render (early return to prevent further checks)
    const recentDocs = await getPublicDocs();
    return renderHomePage(recentDocs, subdomain, profile);
  }

  // Case 2: On main domain
  // If user is logged in, redirect to their subdomain
  if (user && profile?.username) {
    redirect(`${protocol}://${profile.username}.${baseDomain}/`);
  }

  // Case 3: On main domain and not logged in - show public home page
  const recentDocs = await getPublicDocs();
  return renderHomePage(recentDocs, null, null);
}

function renderHomePage(
  recentDocs: any[],
  subdomain: string | null,
  profile: any
) {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-linear-to-b from-background via-background to-muted/30">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-20 md:pt-28 lg:pt-32 pb-16 sm:pb-20 md:pb-24 lg:pb-32 relative">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium mb-6 sm:mb-8">
              <Sparkles className="w-4 h-4" />
              <span>Trusted by developers worldwide</span>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6 sm:mb-8 leading-tight">
              Beautiful Documentation
              <span className="block mt-2 sm:mt-3 bg-linear-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                Made Simple
              </span>
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-8 sm:mb-10 px-4 sm:px-0 leading-relaxed">
              Create, manage, and share stunning documentation sites for your
              applications. Built for developers, by developers. Everything you
              need to document your project beautifully.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 justify-center px-4 sm:px-0 mb-12 sm:mb-16">
              <Link
                href="/auth/signup"
                className="btn-primary inline-flex items-center justify-center px-8 sm:px-10 py-3.5 sm:py-4 text-base sm:text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Get Started Free
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
              <Link
                href="/docs"
                className="btn-secondary inline-flex items-center justify-center px-8 sm:px-10 py-3.5 sm:py-4 text-base sm:text-lg font-semibold border-2 hover:border-primary/50 transition-all duration-300"
              >
                Browse Documentation
                <BookOpen className="ml-2 w-5 h-5" />
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8 max-w-3xl mx-auto mt-12 sm:mt-16">
              <div className="text-center">
                <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary mb-1 sm:mb-2">
                  10K+
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground">
                  Active Users
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary mb-1 sm:mb-2">
                  50K+
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground">
                  Docs Created
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary mb-1 sm:mb-2">
                  99.9%
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground">
                  Uptime
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary mb-1 sm:mb-2">
                  24/7
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground">
                  Support
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 sm:py-20 md:py-24 lg:py-28 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16 md:mb-20">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4 sm:mb-6">
              Everything You Need
            </h2>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto px-4 sm:px-0">
              Powerful features designed to help you create, manage, and share
              beautiful documentation effortlessly
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            <div className="group p-6 sm:p-8 bg-card border border-border rounded-xl hover:border-primary/50 hover:shadow-lg transition-all duration-300">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-4 sm:mb-6 group-hover:bg-primary/20 transition-colors">
                <Zap className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-3">
                Lightning Fast
              </h3>
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
                Built with Next.js 16 for exceptional performance. Experience
                instant page loads and excellent SEO out of the box.
              </p>
            </div>

            <div className="group p-6 sm:p-8 bg-card border border-border rounded-xl hover:border-primary/50 hover:shadow-lg transition-all duration-300">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-4 sm:mb-6 group-hover:bg-primary/20 transition-colors">
                <Shield className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-3">
                Enterprise Security
              </h3>
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
                Bank-level encryption and granular access controls. Keep your
                documentation public or private with role-based permissions.
              </p>
            </div>

            <div className="group p-6 sm:p-8 bg-card border border-border rounded-xl hover:border-primary/50 hover:shadow-lg transition-all duration-300">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-4 sm:mb-6 group-hover:bg-primary/20 transition-colors">
                <Users className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-3">
                Team Collaboration
              </h3>
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
                Work seamlessly with your team. Real-time editing, comments,
                version history, and advanced collaboration tools.
              </p>
            </div>

            <div className="group p-6 sm:p-8 bg-card border border-border rounded-xl hover:border-primary/50 hover:shadow-lg transition-all duration-300">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-4 sm:mb-6 group-hover:bg-primary/20 transition-colors">
                <Code className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-3">
                Markdown First
              </h3>
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
                Write in Markdown with a beautiful WYSIWYG editor. Full syntax
                highlighting and code block support for all languages.
              </p>
            </div>

            <div className="group p-6 sm:p-8 bg-card border border-border rounded-xl hover:border-primary/50 hover:shadow-lg transition-all duration-300">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-4 sm:mb-6 group-hover:bg-primary/20 transition-colors">
                <Search className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-3">
                Powerful Search
              </h3>
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
                Full-text search across all your documentation. Find what you
                need instantly with intelligent search algorithms.
              </p>
            </div>

            <div className="group p-6 sm:p-8 bg-card border border-border rounded-xl hover:border-primary/50 hover:shadow-lg transition-all duration-300">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-4 sm:mb-6 group-hover:bg-primary/20 transition-colors">
                <Globe className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-3">
                Custom Domains
              </h3>
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
                Use your own domain or get a free subdomain. Full control over
                branding and customization options.
              </p>
            </div>

            <div className="group p-6 sm:p-8 bg-card border border-border rounded-xl hover:border-primary/50 hover:shadow-lg transition-all duration-300">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-4 sm:mb-6 group-hover:bg-primary/20 transition-colors">
                <GitBranch className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-3">
                Version Control
              </h3>
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
                Complete version history for every page. Track changes, restore
                previous versions, and see who edited what and when.
              </p>
            </div>

            <div className="group p-6 sm:p-8 bg-card border border-border rounded-xl hover:border-primary/50 hover:shadow-lg transition-all duration-300">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-4 sm:mb-6 group-hover:bg-primary/20 transition-colors">
                <Layout className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-3">
                Beautiful Themes
              </h3>
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
                Choose from multiple professional themes or create your own.
                Dark mode support included for better reading experience.
              </p>
            </div>

            <div className="group p-6 sm:p-8 bg-card border border-border rounded-xl hover:border-primary/50 hover:shadow-lg transition-all duration-300">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-4 sm:mb-6 group-hover:bg-primary/20 transition-colors">
                <BarChart3 className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-3">
                Analytics & Insights
              </h3>
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
                Track page views, popular content, and user engagement. Make
                data-driven decisions to improve your documentation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 sm:py-20 md:py-24 lg:py-28 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16 md:mb-20">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4 sm:mb-6">
              How It Works
            </h2>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto px-4 sm:px-0">
              Get started in minutes. No complex setup, no technical knowledge
              required.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-10 md:gap-12">
            <div className="text-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-primary rounded-full flex items-center justify-center mx-auto mb-6 text-white text-2xl sm:text-3xl font-bold shadow-lg">
                1
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-4">
                Sign Up Free
              </h3>
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
                Create your account in seconds. No credit card required. Start
                documenting immediately.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-primary rounded-full flex items-center justify-center mx-auto mb-6 text-white text-2xl sm:text-3xl font-bold shadow-lg">
                2
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-4">
                Create Your Docs
              </h3>
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
                Use our intuitive editor to write beautiful documentation.
                Markdown support with live preview.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-primary rounded-full flex items-center justify-center mx-auto mb-6 text-white text-2xl sm:text-3xl font-bold shadow-lg">
                3
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-4">
                Publish & Share
              </h3>
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
                Publish instantly and share with your team or the world. Custom
                domain support available.
              </p>
            </div>
          </div>

          <div className="text-center mt-12 sm:mt-16">
            <Link
              href="/auth/signup"
              className="btn-primary inline-flex items-center justify-center px-8 sm:px-10 py-3.5 sm:py-4 text-base sm:text-lg font-semibold"
            >
              Get Started Now
              <Rocket className="ml-2 w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Recent Docs Section */}
      <section className="py-16 sm:py-20 md:py-24 lg:py-28 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-10 sm:mb-14 md:mb-16 gap-4 sm:gap-0">
            <div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-3 sm:mb-4">
                Recent Documentation
              </h2>
              <p className="text-base sm:text-lg md:text-xl text-muted-foreground">
                Explore beautiful documentation created by our growing community
              </p>
            </div>
            <Link
              href="/docs"
              className="hidden sm:flex items-center text-primary hover:text-primary/80 font-semibold text-base sm:text-lg transition-colors"
            >
              View All Documentation
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
          </div>

          {recentDocs.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {recentDocs.map((doc: any) => (
                <Link
                  key={doc.id}
                  href={`/docs/${doc.slug}`}
                  className="group p-6 sm:p-8 bg-card border border-border rounded-xl hover:border-primary/50 hover:shadow-xl transition-all duration-300"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 bg-primary/10 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                      <FileText className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
                    </div>
                    <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors line-clamp-2">
                    {doc.title}
                  </h3>
                  {doc.description && (
                    <p className="text-base sm:text-lg text-muted-foreground mb-4 sm:mb-5 line-clamp-3 leading-relaxed">
                      {doc.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <span className="text-sm sm:text-base text-muted-foreground">
                      By {doc.user?.fullName || doc.user?.username}
                    </span>
                    {doc.updatedAt && (
                      <span className="text-xs sm:text-sm text-muted-foreground">
                        {new Date(doc.updatedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 sm:py-16 md:py-20">
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <BookOpen className="w-10 h-10 sm:w-12 sm:h-12 text-primary" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-3">
                No public documentation yet
              </h3>
              <p className="text-base sm:text-lg text-muted-foreground px-4 mb-6">
                Be the first to create beautiful documentation and share it with
                the community!
              </p>
              <Link
                href="/auth/signup"
                className="btn-primary inline-flex items-center justify-center px-8 py-3.5 text-base font-semibold"
              >
                Get Started
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </div>
          )}

          {recentDocs.length > 0 && (
            <div className="text-center mt-10 sm:mt-12 md:mt-16">
              <Link
                href="/docs"
                className="btn-secondary inline-flex items-center justify-center px-8 sm:px-10 py-3.5 sm:py-4 text-base sm:text-lg font-semibold"
              >
                View All Documentation
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 sm:py-20 md:py-24 lg:py-28 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16 md:mb-20">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4 sm:mb-6">
              Why Choose HelpPages?
            </h2>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto px-4 sm:px-0">
              Everything you need to create professional documentation that your
              users will love
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-10 md:gap-12">
            <div className="flex gap-4 sm:gap-6">
              <div className="shrink-0">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-primary/10 rounded-xl flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
                </div>
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-3">
                  Zero Configuration
                </h3>
                <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
                  Get started instantly. No complex setup, no server management.
                  We handle all the infrastructure so you can focus on writing.
                </p>
              </div>
            </div>

            <div className="flex gap-4 sm:gap-6">
              <div className="shrink-0">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Server className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
                </div>
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-3">
                  Enterprise Infrastructure
                </h3>
                <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
                  Built on scalable cloud infrastructure. 99.9% uptime guarantee
                  with automatic backups and disaster recovery.
                </p>
              </div>
            </div>

            <div className="flex gap-4 sm:gap-6">
              <div className="shrink-0">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Palette className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
                </div>
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-3">
                  Fully Customizable
                </h3>
                <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
                  Customize every aspect of your documentation. Themes, colors,
                  fonts, layouts - make it truly yours.
                </p>
              </div>
            </div>

            <div className="flex gap-4 sm:gap-6">
              <div className="shrink-0">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Workflow className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
                </div>
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-3">
                  API & Integrations
                </h3>
                <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
                  Powerful REST API and webhooks. Integrate with your existing
                  tools and workflows seamlessly.
                </p>
              </div>
            </div>

            <div className="flex gap-4 sm:gap-6">
              <div className="shrink-0">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Lock className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
                </div>
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-3">
                  Privacy First
                </h3>
                <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
                  Your data is yours. GDPR compliant, SOC 2 certified. We never
                  sell your data or use it for advertising.
                </p>
              </div>
            </div>

            <div className="flex gap-4 sm:gap-6">
              <div className="shrink-0">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
                </div>
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-3">
                  24/7 Support
                </h3>
                <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
                  Get help when you need it. Our support team is available
                  around the clock to assist you.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section
        id="about"
        className="py-16 sm:py-20 md:py-24 lg:py-28 bg-background"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12 sm:mb-16">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4 sm:mb-6">
                About HelpPages
              </h2>
              <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto px-4 sm:px-0">
                The modern documentation platform built for developers, by
                developers
              </p>
            </div>

            <div className="prose prose-lg max-w-none">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-10 mb-10 sm:mb-12">
                <div className="space-y-4">
                  <h3 className="text-xl sm:text-2xl font-bold text-foreground">
                    Built for Modern Teams
                  </h3>
                  <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
                    HelpPages is a modern documentation platform designed for
                    developers and teams who want to create beautiful,
                    maintainable documentation sites. Whether you're documenting
                    an API, a library, or a product, we've got you covered.
                  </p>
                </div>
                <div className="space-y-4">
                  <h3 className="text-xl sm:text-2xl font-bold text-foreground">
                    Powerful Yet Simple
                  </h3>
                  <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
                    Our platform combines the power of markdown editing with a
                    flexible CMS, giving you full control over your content
                    while keeping the editing experience simple and intuitive.
                  </p>
                </div>
              </div>

              <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 md:p-10 mb-8 sm:mb-10">
                <div className="flex items-start gap-4 sm:gap-6">
                  <div className="shrink-0">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-primary/10 rounded-xl flex items-center justify-center">
                      <Star className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-3">
                      Trusted by Leading Companies
                    </h3>
                    <p className="text-base sm:text-lg text-muted-foreground leading-relaxed mb-4">
                      Join thousands of teams who trust HelpPages to power their
                      documentation. From startups to Fortune 500 companies, we
                      help teams create documentation that their users actually
                      want to read.
                    </p>
                    <div className="flex flex-wrap gap-4 sm:gap-6">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-primary" />
                        <span className="text-sm sm:text-base text-muted-foreground">
                          Growing fast
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-primary" />
                        <span className="text-sm sm:text-base text-muted-foreground">
                          Active community
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Zap className="w-5 h-5 text-primary" />
                        <span className="text-sm sm:text-base text-muted-foreground">
                          Always improving
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center">
              <Link
                href="/auth/signup"
                className="btn-primary inline-flex items-center justify-center px-8 sm:px-10 py-3.5 sm:py-4 text-base sm:text-lg font-semibold"
              >
                Start Creating Today
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-16 sm:py-20 md:py-24 lg:py-28 bg-linear-to-br from-primary/10 via-primary/5 to-background border-t border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/20 text-primary rounded-full text-sm font-medium mb-6 sm:mb-8">
            <Rocket className="w-4 h-4" />
            <span>Ready to get started?</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4 sm:mb-6">
            Start Documenting Today
          </h2>
          <p className="text-lg sm:text-xl text-muted-foreground mb-8 sm:mb-10 max-w-2xl mx-auto">
            Join thousands of developers and teams creating beautiful
            documentation with HelpPages. Free forever, no credit card required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 justify-center">
            <Link
              href="/auth/signup"
              className="btn-primary inline-flex items-center justify-center px-8 sm:px-10 py-3.5 sm:py-4 text-base sm:text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
            >
              Get Started Free
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
            <Link
              href="/docs"
              className="btn-secondary inline-flex items-center justify-center px-8 sm:px-10 py-3.5 sm:py-4 text-base sm:text-lg font-semibold"
            >
              Browse Examples
              <BookOpen className="ml-2 w-5 h-5" />
            </Link>
          </div>
          <p className="text-sm sm:text-base text-muted-foreground mt-6 sm:mt-8">
            No credit card required • Free forever • Cancel anytime
          </p>
        </div>
      </section>
    </div>
  );
}
