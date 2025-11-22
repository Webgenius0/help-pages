"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  Search,
  BookOpen,
  Loader2,
  FileText,
  ChevronDown,
  ChevronUp,
  Command,
  ArrowRight,
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
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [selectedResultIndex, setSelectedResultIndex] = useState(0);
  const [hoveredDropdownId, setHoveredDropdownId] = useState<string | null>(
    null
  );
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const debouncedQuery = useDebounce(searchQuery, 300);

  // Clear navigation state when pathname changes (navigation completed)
  useEffect(() => {
    setNavigatingTo(null);
    setIsSearchFocused(false);
    setSearchQuery("");
  }, [pathname]);

  // Clear results immediately when search query changes (before debounce)
  useEffect(() => {
    if (searchQuery.trim().length === 0) {
      setSearchResults([]);
      setIsSearchLoading(false);
    } else {
      // Clear results immediately when user starts typing new query
      setSearchResults([]);
      setIsSearchLoading(true);
    }
  }, [searchQuery]);

  // Keyboard shortcut to focus search (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setIsSearchFocused(true);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Perform search
  useEffect(() => {
    let isCancelled = false;

    const performSearch = async () => {
      if (debouncedQuery.trim().length === 0) {
        setSearchResults([]);
        setIsSearchLoading(false);
        return;
      }

      // Clear previous results immediately when starting new search
      setSearchResults([]);
      setIsSearchLoading(true);

      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(
            debouncedQuery
          )}&limit=8&docSlug=${docSlug}`
        );

        // Check if request was cancelled
        if (isCancelled) return;

        if (!response.ok) {
          throw new Error(`Search failed: ${response.statusText}`);
        }

        const data = await response.json();

        // Check again if request was cancelled
        if (isCancelled) return;

        // Validate that we got actual results
        if (!data || !Array.isArray(data.results)) {
          console.error("Invalid search response:", data);
          setSearchResults([]);
          return;
        }

        // Results are already filtered by docSlug in the API, but we can do a safety check
        // Also ensure we only show page results (not category results) in the search
        // Filter out any results that look like example/dummy data
        const filteredResults = (data.results || []).filter(
          (result: SearchResult) => {
            // Basic validation
            if (
              !result ||
              !result.type ||
              !result.url ||
              !result.id ||
              !result.title
            ) {
              return false;
            }

            // Must be a page type
            if (result.type !== "page") {
              return false;
            }

            // Must belong to current doc
            if (!result.url.includes(`/docs/${docSlug}`)) {
              return false;
            }

            // Filter out example/dummy data by checking for common example patterns
            const titleLower = result.title.toLowerCase();
            const urlLower = result.url.toLowerCase();

            // Check for example patterns
            const isExample =
              titleLower.includes("example") ||
              titleLower.includes("demo") ||
              titleLower.includes("sample") ||
              titleLower.includes("test page") ||
              urlLower.includes("/example") ||
              urlLower.includes("/demo") ||
              urlLower.includes("/sample") ||
              urlLower.includes("/test");

            // Only include if it's not an example (unless it's a real search result)
            return (
              !isExample || debouncedQuery.toLowerCase().includes("example")
            );
          }
        );

        // Only set results if not cancelled
        if (!isCancelled) {
          setSearchResults(filteredResults);
          setSelectedResultIndex(0);
        }
      } catch (error) {
        console.error("Search failed:", error);
        if (!isCancelled) {
          setSearchResults([]);
        }
      } finally {
        if (!isCancelled) {
          setIsSearchLoading(false);
        }
      }
    };

    performSearch();

    // Cleanup function to cancel in-flight requests
    return () => {
      isCancelled = true;
    };
  }, [debouncedQuery, docSlug]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      // Check if click is inside search area (input or results dropdown)
      if (searchRef.current && searchRef.current.contains(target)) {
        return; // Don't close if clicking inside search
      }

      // Close search if clicking outside
      if (isSearchFocused) {
        setIsSearchFocused(false);
      }

      // Don't close dropdown if clicking on a link (navigation)
      // This allows the dropdown to stay open when navigating
      const clickedLink = (target as Element).closest("a");
      if (clickedLink) {
        return; // Don't close dropdown when clicking links
      }

      // Check if click is outside any navigation dropdown
      let clickedOutside = true;
      Object.values(dropdownRefs.current).forEach((ref) => {
        if (ref && ref.contains(target)) {
          clickedOutside = false;
        }
      });

      if (clickedOutside) {
        setHoveredDropdownId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isSearchFocused]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Handle Cmd+K / Ctrl+K to focus (already handled by useEffect)
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        return;
      }

      if (searchResults.length === 0 && e.key !== "Escape") return;

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
            const result = searchResults[selectedResultIndex];
            setNavigatingTo(result.id);
            setIsSearchFocused(false);
            setSearchQuery("");
            inputRef.current?.blur();
            router.push(result.url);
          }
          break;
        case "Escape":
          e.preventDefault();
          setIsSearchFocused(false);
          setSearchQuery("");
          inputRef.current?.blur();
          break;
      }
    },
    [searchResults, selectedResultIndex, router]
  );

  const handleResultClick = (e: React.MouseEvent, result: SearchResult) => {
    e.preventDefault();
    e.stopPropagation();

    // Immediate visual feedback
    setNavigatingTo(result.id);
    setIsSearchFocused(false);
    setSearchQuery("");
    inputRef.current?.blur();

    // Navigate to the page
    router.push(result.url);
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

  // Get platform-specific command key
  const isMac =
    typeof window !== "undefined" &&
    navigator.platform.toUpperCase().indexOf("MAC") >= 0;
  const cmdKey = isMac ? "⌘" : "Ctrl";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-md supports-backdrop-filter:bg-background/80">
      <div className="px-3 sm:px-4 md:px-6 lg:px-8 h-12 sm:h-14 flex items-center justify-between gap-2 sm:gap-3 md:gap-4 lg:gap-5">
        {/* Left Side: Logo/Doc Name */}
        <div className="flex items-center shrink-0 min-w-0">
          <Link
            href={`/docs/${docSlug}`}
            className="flex items-center space-x-2 text-sm sm:text-base font-semibold text-foreground hover:text-primary transition-colors"
          >
            <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
            <span className="hidden sm:inline truncate max-w-[200px] md:max-w-none">
              {docTitle}
            </span>
          </Link>
        </div>

        {/* Center: Dropdowns Navigation */}
        {navHeaders && navHeaders.length > 0 && (
          <nav className="hidden md:flex items-center gap-1.5 md:gap-2 lg:gap-3 xl:gap-5 flex-1 justify-center min-w-0">
            {navHeaders.map((dropdown) => {
              // Ensure items is always an array
              const items = dropdown.items || [];
              const isHovered = hoveredDropdownId === dropdown.id;
              const hasActiveItem = items.some(
                (item) => item.id === selectedDocItemId
              );
              const activeItem = items.find(
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
                        flex items-center gap-1 px-2 md:gap-1.5 md:px-3 py-2 text-xs md:text-sm font-medium transition-all duration-150 relative
                        ${
                          isHovered || hasActiveItem
                            ? "text-foreground"
                            : "text-foreground/70 hover:text-foreground"
                        }
                      `}
                  >
                    <span className="whitespace-nowrap">{dropdown.label}</span>
                    <ChevronDown
                      className={`w-3 h-3 md:w-3.5 md:h-3.5 transition-transform duration-150 shrink-0 ${
                        isHovered ? "rotate-180" : ""
                      }`}
                    />
                    {/* Border bottom for active/hovered */}
                    {(isHovered || hasActiveItem) && (
                      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary w-[90%] mx-auto" />
                    )}
                  </button>

                  {/* Dropdown Menu */}
                  {isHovered && items.length > 0 && (
                    <div
                      className="dropdown-menu absolute top-full left-0 mt-0.5 min-w-[280px] bg-background border border-border rounded-lg shadow-xl z-50 py-1.5"
                      onMouseEnter={() => setHoveredDropdownId(dropdown.id)}
                      onMouseLeave={() => setHoveredDropdownId(null)}
                    >
                      {items.map((item) => {
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
                                w-full flex items-start gap-3 px-4 py-2.5 text-sm text-left transition-colors group
                                ${
                                  isSelected
                                    ? "bg-primary/10 text-foreground"
                                    : "text-foreground/80 hover:bg-muted/50 hover:text-foreground"
                                }
                              `}
                          >
                            <div className="w-4 h-4 flex items-center justify-center shrink-0 mt-0.5">
                              <FileText
                                className={`w-3.5 h-3.5 ${
                                  isSelected
                                    ? "text-primary"
                                    : "text-muted-foreground group-hover:text-foreground/70"
                                }`}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div
                                className={`font-medium truncate ${
                                  isSelected ? "text-primary" : ""
                                }`}
                              >
                                {item.label}
                              </div>
                              {item.description && (
                                <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                  {item.description}
                                </div>
                              )}
                            </div>
                            {item.isDefault && (
                              <span className="text-xs text-muted-foreground/60 shrink-0 px-1.5 py-0.5 bg-muted/50 rounded text-[10px]">
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

        {/* Right Side: Search */}
        <div className="flex items-center shrink-0">
          <form onSubmit={handleSearch} className="relative">
            <div
              ref={searchRef}
              className="relative w-[200px] xs:w-[220px] sm:w-[260px] md:w-[280px] lg:w-[300px] xl:w-[360px]"
            >
              {/* Search Input */}
              <div
                className={`flex items-center gap-1.5 md:gap-2 h-9 md:h-10 lg:h-11 px-3 md:px-4 border rounded-lg bg-background w-full transition-colors duration-200 ${
                  isSearchFocused
                    ? "border-border/80"
                    : "border-border/60 hover:border-border"
                } outline-none`}
                onClick={(e) => {
                  // Focus input when clicking anywhere in the search container (except input itself)
                  if (e.target !== inputRef.current) {
                    e.preventDefault();
                    inputRef.current?.focus();
                    setIsSearchFocused(true);
                  }
                }}
              >
                <Search
                  className={`w-3.5 h-3.5 md:w-4 md:h-4 shrink-0 transition-colors ${
                    isSearchFocused ? "text-primary" : "text-muted-foreground"
                  }`}
                />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Search docs..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSelectedResultIndex(0);
                  }}
                  onFocus={(e) => {
                    e.preventDefault();
                    setIsSearchFocused(true);
                  }}
                  onKeyDown={handleKeyDown}
                  className="bg-transparent border-none outline-none focus:outline-none focus:ring-0 focus:border-none text-xs md:text-sm text-foreground placeholder:text-muted-foreground/60 flex-1 min-w-0 transition-colors"
                  autoComplete="off"
                  spellCheck="false"
                />
                {!isSearchFocused && !searchQuery && (
                  <div className="hidden md:flex items-center gap-1 px-1.5 md:px-2 py-0.5 md:py-1 bg-muted/50 rounded text-[10px] text-muted-foreground border border-border/40 pointer-events-none shrink-0">
                    <Command className="w-2.5 h-2.5 md:w-3 md:h-3" />
                    <span className="font-medium">K</span>
                  </div>
                )}
              </div>

              {/* Search Results Dropdown */}
              {isSearchFocused && (
                <div className="absolute top-full mt-2 left-0 sm:left-auto sm:right-0 w-[calc(100vw-1.5rem)] sm:w-full max-w-[400px] bg-popover border border-border/60 rounded-lg shadow-xl max-h-[480px] overflow-hidden z-50 min-w-[280px] sm:min-w-[320px] animate-in fade-in-0 zoom-in-95">
                  {searchQuery.trim().length === 0 ? (
                    <div className="p-6 text-center">
                      <div className="flex items-center justify-center mb-2">
                        <Search className="w-8 h-8 text-muted-foreground/40" />
                      </div>
                      <p className="text-sm font-medium text-foreground mb-1">
                        Search documentation
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Type to search or use{" "}
                        <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-medium border border-border/40">
                          {cmdKey}K
                        </kbd>{" "}
                        to focus
                      </p>
                    </div>
                  ) : isSearchLoading ? (
                    <div className="p-8 text-center">
                      <Loader2 className="w-5 h-5 text-muted-foreground animate-spin mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Searching...
                      </p>
                    </div>
                  ) : searchResults.length > 0 && !isSearchLoading ? (
                    <div className="py-2 max-h-[440px] overflow-y-auto">
                      <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/40 mb-1">
                        Results ({searchResults.length})
                      </div>
                      {searchResults.map((result, index) => {
                        const isNavigating = navigatingTo === result.id;
                        return (
                          <button
                            key={result.id}
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleResultClick(e, result);
                            }}
                            onMouseEnter={() => setSelectedResultIndex(index)}
                            onMouseDown={(e) => {
                              // Prevent input blur when clicking results
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                            disabled={isNavigating}
                            className={`w-full text-left px-4 py-3 transition-all group relative ${
                              isNavigating
                                ? "bg-primary/20 border-l-2 border-primary cursor-wait opacity-75"
                                : index === selectedResultIndex
                                ? "bg-primary/10 border-l-2 border-primary"
                                : "hover:bg-muted/50 border-l-2 border-transparent"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className={`w-4 h-4 flex items-center justify-center shrink-0 mt-0.5 ${
                                  isNavigating
                                    ? "text-primary"
                                    : index === selectedResultIndex
                                    ? "text-primary"
                                    : "text-muted-foreground group-hover:text-foreground/70"
                                }`}
                              >
                                {isNavigating ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <FileText className="w-3.5 h-3.5" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div
                                  className={`text-sm font-medium text-foreground mb-1 line-clamp-1 ${
                                    index === selectedResultIndex
                                      ? "text-primary"
                                      : ""
                                  }`}
                                  dangerouslySetInnerHTML={{
                                    __html: result.title,
                                  }}
                                />
                                {result.summary && (
                                  <div
                                    className="text-xs text-muted-foreground line-clamp-2 leading-relaxed"
                                    dangerouslySetInnerHTML={{
                                      __html: result.summary,
                                    }}
                                  />
                                )}
                                {result.category && (
                                  <div className="mt-1.5">
                                    <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium bg-muted/50 text-muted-foreground rounded">
                                      {result.category}
                                    </span>
                                  </div>
                                )}
                              </div>
                              {(index === selectedResultIndex ||
                                isNavigating) && (
                                <ArrowRight
                                  className={`w-4 h-4 text-primary shrink-0 mt-0.5 transition-opacity ${
                                    isNavigating ? "opacity-50" : ""
                                  }`}
                                />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-8 text-center">
                      <div className="flex items-center justify-center mb-2">
                        <Search className="w-8 h-8 text-muted-foreground/40" />
                      </div>
                      <p className="text-sm font-medium text-foreground mb-1">
                        No results found
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Try different keywords or check your spelling
                      </p>
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
