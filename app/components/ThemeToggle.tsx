"use client";

import { useTheme } from "./ThemeProvider";
import { Sun, Moon, Monitor } from "lucide-react";
import { useState, useEffect } from "react";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const themes: { value: "light" | "dark" | "system"; label: string; icon: React.ReactNode }[] = [
    { value: "light", label: "Light", icon: <Sun className="w-4 h-4" /> },
    { value: "dark", label: "Dark", icon: <Moon className="w-4 h-4" /> },
    { value: "system", label: "Auto", icon: <Monitor className="w-4 h-4" /> },
  ];

  const currentTheme = themes.find((t) => t.value === theme) || themes[2];

  // Show placeholder during SSR to prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="p-2 rounded-lg">
        <Sun className="w-5 h-5 text-foreground opacity-0" />
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg hover:bg-accent transition-colors flex items-center justify-center"
        aria-label="Toggle theme"
      >
        {resolvedTheme === "dark" ? (
          <Moon className="w-5 h-5 text-foreground" />
        ) : (
          <Sun className="w-5 h-5 text-foreground" />
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-40 sm:w-36 bg-popover border border-border rounded-lg shadow-lg z-50">
            <div className="py-1">
              {themes.map((themeOption) => (
                <button
                  key={themeOption.value}
                  onClick={() => {
                    setTheme(themeOption.value);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 text-sm flex items-center space-x-3 hover:bg-accent transition-colors ${
                    theme === themeOption.value
                      ? "bg-accent text-primary font-medium"
                      : "text-foreground"
                  }`}
                >
                  <span className="shrink-0">{themeOption.icon}</span>
                  <span className="flex-1">{themeOption.label}</span>
                  {theme === themeOption.value && (
                    <span className="ml-auto text-primary text-base">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

