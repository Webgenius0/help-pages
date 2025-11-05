"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Menu, X, User, LogOut, Settings, BookOpen } from "lucide-react";
import { SearchBar } from "./SearchBar";
import { ThemeToggle } from "./ThemeToggle";

export function Header() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Don't show header on public docs routes (/u/*) or CMS routes
  if (pathname?.startsWith("/u/") || pathname?.startsWith("/cms")) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-md supports-backdrop-filter:bg-background/80 shrink-0">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16 gap-3 sm:gap-4">
          {/* Logo */}
          <div className="flex items-center shrink-0">
            <Link
              href="/"
              className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-[#1A7A4A] rounded-lg flex items-center justify-center shrink-0">
                <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <span className="text-base sm:text-lg md:text-xl font-bold text-foreground whitespace-nowrap">
                HelpPages
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6 lg:gap-8 flex-1 justify-center">
            <Link
              href="/docs"
              className="text-sm lg:text-base text-foreground hover:text-primary transition-colors font-medium"
            >
              Documentation
            </Link>
            <Link
              href="/#features"
              className="text-sm lg:text-base text-foreground hover:text-primary transition-colors font-medium"
            >
              Features
            </Link>
            <Link
              href="/#about"
              className="text-sm lg:text-base text-foreground hover:text-primary transition-colors font-medium"
            >
              About
            </Link>
          </nav>

          {/* Right Side Actions */}
          <div className="flex items-center gap-2 sm:gap-3 md:gap-4 shrink-0">
            {/* Search Bar - Hidden on mobile */}
            <div className="hidden lg:block">
              <SearchBar />
            </div>

            {/* Theme Toggle */}
            <div className="hidden sm:block">
              <ThemeToggle />
            </div>

            {session ? (
              <div className="hidden sm:flex items-center gap-3">
                <Link
                  href="/cms"
                  className="btn-primary inline-flex items-center justify-center px-4 sm:px-5 py-2 sm:py-2.5 text-sm sm:text-base whitespace-nowrap"
                >
                  Dashboard
                </Link>
                <div className="relative group">
                  <button className="flex items-center gap-2 text-foreground hover:text-primary transition-colors px-2 py-1 rounded-md hover:bg-accent">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 bg-[#1A7A4A] rounded-full flex items-center justify-center shrink-0">
                      <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                    </div>
                  </button>

                  {/* Dropdown Menu */}
                  <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 overflow-hidden">
                    <div className="py-1">
                      <Link
                        href="/cms"
                        className="flex items-center px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors"
                      >
                        <Settings className="w-4 h-4 mr-3 shrink-0" />
                        <span>CMS Dashboard</span>
                      </Link>
                      <Link
                        href="/cms/users"
                        className="flex items-center px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors"
                      >
                        <User className="w-4 h-4 mr-3 shrink-0" />
                        <span>User Management</span>
                      </Link>
                      <button
                        onClick={() => signOut()}
                        className="flex items-center w-full px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors text-left"
                      >
                        <LogOut className="w-4 h-4 mr-3 shrink-0" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-3 md:gap-4">
                <Link
                  href="/auth/login"
                  className="btn-secondary inline-flex items-center justify-center px-4 sm:px-5 py-2 sm:py-2.5 text-sm sm:text-base whitespace-nowrap"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/signup"
                  className="btn-primary inline-flex items-center justify-center px-4 sm:px-5 py-2 sm:py-2.5 text-sm sm:text-base whitespace-nowrap"
                >
                  Get Started
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="sm:hidden p-2 text-foreground hover:text-primary transition-colors"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="sm:hidden border-t border-border py-4 space-y-4">
            {/* Mobile Search Bar */}
            <div>
              <SearchBar />
            </div>

            {/* Theme Toggle for Mobile */}
            <div className="border-b border-border pb-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">
                  Appearance
                </span>
                <ThemeToggle />
              </div>
            </div>

            <nav className="flex flex-col space-y-2">
              <Link
                href="/docs"
                className="px-3 py-2 text-base text-foreground hover:text-primary hover:bg-accent rounded-md transition-colors font-medium"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Documentation
              </Link>
              <Link
                href="/#features"
                className="px-3 py-2 text-base text-foreground hover:text-primary hover:bg-accent rounded-md transition-colors font-medium"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Features
              </Link>
              <Link
                href="/#about"
                className="px-3 py-2 text-base text-foreground hover:text-primary hover:bg-accent rounded-md transition-colors font-medium"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                About
              </Link>

              {session ? (
                <>
                  <Link
                    href="/cms"
                    className="btn-primary inline-flex items-center justify-center px-3 py-2 text-base"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={() => {
                      signOut();
                      setIsMobileMenuOpen(false);
                    }}
                    className="flex items-center w-full px-3 py-2 text-base text-foreground hover:text-primary hover:bg-accent rounded-md transition-colors font-medium text-left"
                  >
                    <LogOut className="w-4 h-4 mr-3" />
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/auth/login"
                    className="btn-secondary inline-flex items-center justify-center px-3 py-2 text-base"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/auth/signup"
                    className="btn-primary inline-flex items-center justify-center w-full px-4 py-2.5 text-sm"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Get Started
                  </Link>
                </>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
