"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { User, LogOut, Settings } from "lucide-react";
import { SearchBar } from "./SearchBar";
import { ThemeToggle } from "./ThemeToggle";
import { handleLogout } from "@/lib/logout";

export function CMSHeader() {
  const { data: session } = useSession();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 lg:z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-md supports-backdrop-filter:bg-background/80 shrink-0">
      <div className="px-3 sm:px-4 md:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16 gap-3 sm:gap-4">
          {/* Search Bar - Prominent in CMS */}
          <div className="flex-1 max-w-2xl">
            <SearchBar />
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-2 sm:gap-3 md:gap-4 shrink-0">
            {/* Theme Toggle */}
            <div className="hidden sm:block">
              <ThemeToggle />
            </div>

            {session ? (
              <div className="relative group">
                <button className="flex items-center gap-1.5 sm:gap-2 text-foreground hover:text-primary transition-colors px-2 py-1 rounded-md hover:bg-accent">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 bg-[#1A7A4A] rounded-full flex items-center justify-center shrink-0">
                    <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                  </div>
                  <span className="hidden lg:block text-sm font-medium truncate max-w-[120px] xl:max-w-none">
                    {session.user?.name || session.user?.email}
                  </span>
                </button>

                {/* Dropdown Menu */}
                <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-60! lg:z-50 overflow-hidden">
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
                      onClick={handleLogout}
                      className="flex items-center w-full px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors text-left"
                    >
                      <LogOut className="w-4 h-4 mr-3 shrink-0" />
                      <span>Sign Out</span>
                    </button>
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
          </div>
        </div>
      </div>
    </header>
  );
}
