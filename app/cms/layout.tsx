"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CMSHeader } from "../components/CMSHeader";
import { Sidebar } from "../components/Sidebar";
import { Menu, X } from "lucide-react";

// Layout for CMS routes - includes sidebar and header
export default function CMSLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Redirect away from invalid CMS routes
  useEffect(() => {
    if (pathname && pathname.includes("/cms/all-courses")) {
      router.replace("/cms");
    }
  }, [pathname, router]);

  // Close sidebar when route changes on mobile
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-55 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Mobile Menu Button */}
        <div className="flex">
          <div className="lg:hidden sticky top-0 z-30 bg-background border-b border-border px-4 py-3 shrink-0">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 hover:bg-muted rounded-md transition-colors"
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1">
            <CMSHeader />
          </div>
        </div>
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
