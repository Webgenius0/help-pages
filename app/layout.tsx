import "./globals.css";

import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Providers } from "./providers";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";

const metadata: Metadata = {
  applicationName: "HelpPages",
  title: "HelpPages - Create Beautiful Documentation",
  description:
    "HelpPages is a platform for creating and managing beautiful documentation sites for your applications.",
  metadataBase: new URL("http://localhost:3001"),
  icons: {
    icon: "/favicon/favicon.ico",
    shortcut: "/favicon/favicon.ico",
    apple: "/favicon/favicon.ico",
  },
  robots: {
    index: true,
    follow: true,
  },
};

const viewport: Viewport = {
  themeColor: "#3ecf8e",
};

const RootLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="docs-layout">
        <Script
          id="theme-script"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const theme = localStorage.getItem('theme') || 'system';
                const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                const isDark = theme === 'dark' || (theme === 'system' && systemDark);
                if (isDark) {
                  document.documentElement.classList.add('dark');
                }
              })();
            `,
          }}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
};

export { metadata, viewport };
export default RootLayout;
