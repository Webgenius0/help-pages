"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  BookOpen,
  Loader2,
  FileText,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";

interface DocItem {
  id: string;
  label: string;
  slug: string;
  isDefault: boolean;
  description?: string | null;
}

interface NavHeader {
  id: string;
  label: string;
  slug: string;
  items: DocItem[];
}

interface SearchResult {
  id: string;
  title: string;
  slug: string;
  summary?: string;
  type: "page" | "category";
  url: string;
  category?: string;
}

interface DocTopbarProps {
  docTitle: string;
  docSlug: string;
  navHeaders?: NavHeader[];
  selectedDocItemId: string | null;
  onDocItemChange: (itemId: string | null) => void;
  allItems: DocItem[];
}

export function DocTopbar({
  docTitle,
  docSlug,
  navHeaders,
  selectedDocItemId,
  onDocItemChange,
  allItems,
}: DocTopbarProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [selectedResultIndex, setSelectedResultIndex] = useState(0);
  const [hoveredDropdownId, setHoveredDropdownId] = useState<string | null>(
    null
  );
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const debouncedQuery = useDebounce(searchQuery, 300);

  // Perform search
  useEffect(() => {
    const performSearch = async () => {
      if (debouncedQuery.trim().length === 0) {
        setSearchResults([]);
        setIsSearchLoading(false);
        return;
      }

      setIsSearchLoading(true);
      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(
            debouncedQuery
          )}&limit=5&docSlug=${docSlug}`
        );
        const data = await response.json();
        // Filter results to only show pages from this doc
        const filteredResults = (data.results || []).filter(
          (result: SearchResult) => result.url.includes(`/docs/${docSlug}`)
        );
        setSearchResults(filteredResults);
      } catch (error) {
        console.error("Search failed:", error);
        setSearchResults([]);
      } finally {
        setIsSearchLoading(false);
      }
    };

    performSearch();
  }, [debouncedQuery, docSlug]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setIsSearchFocused(false);
      }

      // Check if click is outside any dropdown
      let clickedOutside = true;
      Object.values(dropdownRefs.current).forEach((ref) => {
        if (ref && ref.contains(event.target as Node)) {
          clickedOutside = false;
        }
      });

      if (clickedOutside) {
        setHoveredDropdownId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (searchResults.length === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedResultIndex((prev) =>
            prev < searchResults.length - 1 ? prev + 1 : prev
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedResultIndex((prev) => (prev > 0 ? prev - 1 : 0));
          break;
        case "Enter":
          e.preventDefault();
          if (searchResults[selectedResultIndex]) {
            router.push(searchResults[selectedResultIndex].url);
            setIsSearchFocused(false);
            setSearchQuery("");
          }
          break;
        case "Escape":
          setIsSearchFocused(false);
          setSearchQuery("");
          break;
      }
    },
    [searchResults, selectedResultIndex, router]
  );

  const handleResultClick = (result: SearchResult) => {
    router.push(result.url);
    setIsSearchFocused(false);
    setSearchQuery("");
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim() && searchResults.length > 0) {
      router.push(
        searchResults[selectedResultIndex]?.url || searchResults[0].url
      );
      setIsSearchFocused(false);
      setSearchQuery("");
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Left Side: Logo/Doc Name and Dropdowns */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {/* Logo/Doc Name */}
          <Link
            href={`/docs/${docSlug}`}
            className="flex items-center space-x-2 text-lg font-semibold text-foreground hover:text-primary transition-colors shrink-0"
          >
            <BookOpen className="w-5 h-5" />
            <span className="hidden md:inline">{docTitle}</span>
          </Link>

          {/* Dropdowns Navigation */}
          {navHeaders && navHeaders.length > 0 && (
            <nav className="hidden lg:flex items-center gap-1 flex-1 min-w-0">
              {navHeaders.map((dropdown) => {
                const isHovered = hoveredDropdownId === dropdown.id;
                const hasActiveItem = dropdown.items.some(
                  (item) => item.id === selectedDocItemId
                );
                const activeItem = dropdown.items.find(
                  (item) => item.id === selectedDocItemId
                );

                return (
                  <div
                    key={dropdown.id}
                    ref={(el) => {
                      dropdownRefs.current[dropdown.id] = el;
                    }}
                    className="relative"
                    onMouseEnter={() => setHoveredDropdownId(dropdown.id)}
                    onMouseLeave={() => setHoveredDropdownId(null)}
                  >
                    {/* Nav Button */}
                    <button
                      type="button"
                      className={`
                        flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors relative
                        ${
                          isHovered || hasActiveItem
                            ? "text-foreground"
                            : "text-foreground/70 hover:text-foreground"
                        }
                      `}
                    >
                      <span>{dropdown.label}</span>
                      {isHovered ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                      {/* Border bottom for active/hovered */}
                      {(isHovered || hasActiveItem) && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground" />
                      )}
                    </button>

                    {/* Dropdown Menu */}
                    {isHovered && dropdown.items.length > 0 && (
                      <div className="absolute top-full left-0 pt-1 min-w-[240px] bg-popover border border-border rounded-lg shadow-lg z-50 py-2">
                        {dropdown.items.map((item) => {
                          const isSelected = item.id === selectedDocItemId;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => {
                                onDocItemChange(item.id);
                                setHoveredDropdownId(null);
                              }}
                              className={`
                                w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors
                                ${
                                  isSelected
                                    ? "bg-muted text-foreground"
                                    : "text-foreground/80 hover:bg-muted hover:text-foreground"
                                }
                              `}
                            >
                              {/* Icon placeholder - you can customize per item */}
                              <div className="w-5 h-5 flex items-center justify-center shrink-0">
                                <FileText className="w-4 h-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">
                                  {item.label}
                                </div>
                                {item.description && (
                                  <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                    {item.description}
                                  </div>
                                )}
                              </div>
                              {item.isDefault && (
                                <span className="text-xs text-muted-foreground shrink-0">
                                  Default
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          )}
        </div>

        {/* Right Side: Search */}
        <div className="flex items-center space-x-4 shrink-0">
          <form onSubmit={handleSearch} className="relative">
            <div ref={searchRef} className="relative">
              <div
                className={`flex items-center space-x-2 h-9 px-3 border rounded-md bg-input transition-all ${
                  isSearchFocused
                    ? "border-primary ring-2 ring-primary/20"
                    : "border-border"
                }`}
              >
                <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Search documentation..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSelectedResultIndex(0);
                  }}
                  onFocus={() => {
                    setIsSearchFocused(true);
                    if (searchQuery.trim().length > 0) {
                      // Results will show via useEffect
                    }
                  }}
                  onKeyDown={handleKeyDown}
                  className="bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground w-48 md:w-64 focus:w-56 md:focus:w-80 transition-all"
                />
                {isSearchLoading && (
                  <Loader2 className="w-4 h-4 text-muted-foreground animate-spin shrink-0" />
                )}
              </div>

              {/* Search Results Dropdown */}
              {isSearchFocused && searchQuery.trim().length > 0 && (
                <div className="absolute top-full mt-2 w-full bg-popover border border-border rounded-md shadow-lg max-h-96 overflow-y-auto z-50 min-w-[320px] right-0">
                  {isSearchLoading ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      Searching...
                    </div>
                  ) : searchResults.length > 0 ? (
                    <div className="py-2">
                      {searchResults.map((result, index) => (
                        <button
                          key={result.id}
                          type="button"
                          onClick={() => handleResultClick(result)}
                          className={`w-full text-left px-4 py-2 hover:bg-muted transition-colors ${
                            index === selectedResultIndex ? "bg-muted" : ""
                          }`}
                        >
                          <div className="flex items-start space-x-3">
                            <FileText className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-foreground truncate">
                                {result.title}
                              </div>
                              {result.summary && (
                                <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                  {result.summary}
                                </div>
                              )}
                              {result.category && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  {result.category}
                                </div>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      No results found
                    </div>
                  )}
                </div>
              )}
            </div>
          </form>
        </div>
      </div>
    </header>
  );
}
