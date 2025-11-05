"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "./components/ThemeProvider";
import { Toaster } from "react-hot-toast";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: "hsl(var(--card))",
              color: "hsl(var(--foreground))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "0.5rem",
              padding: "12px 16px",
              fontSize: "14px",
              boxShadow:
                "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
            },
            success: {
              iconTheme: {
                primary: "#1A7A4A",
                secondary: "#fff",
              },
              style: {
                borderLeft: "4px solid #1A7A4A",
              },
            },
            error: {
              iconTheme: {
                primary: "#ef4444",
                secondary: "#fff",
              },
              style: {
                borderLeft: "4px solid #ef4444",
              },
            },
          }}
        />
      </ThemeProvider>
    </SessionProvider>
  );
}
