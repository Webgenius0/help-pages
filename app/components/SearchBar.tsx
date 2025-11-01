"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, FileText, Folder, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useDebounce } from "@/hooks/useDebounce";

interface SearchResult {
  id: string;
  title: string;
  slug: string;
  summary?: string;
  type: "page" | "category";
  url: string;
  category?: string;
  author?: string;
}

export function SearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const debouncedQuery = useDebounce(query, 300);

  // Perform search
  useEffect(() => {
    const performSearch = async () => {
      if (debouncedQuery.trim().length === 0) {
        setResults([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(debouncedQuery)}&limit=10`
        );
        const data = await response.json();
        setResults(data.results || []);
      } catch (error) {
        console.error("Search failed:", error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    performSearch();
  }, [debouncedQuery]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < results.length - 1 ? prev + 1 : prev
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
          break;
        case "Enter":
          e.preventDefault();
          if (results[selectedIndex]) {
            router.push(results[selectedIndex].url);
            setIsOpen(false);
            setQuery("");
          }
          break;
        case "Escape":
          e.preventDefault();
          setIsOpen(false);
          inputRef.current?.blur();
          break;
      }
    },
    [isOpen, results, selectedIndex, router]
  );

  // Keyboard shortcut to focus search (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    };

    document.addEventListener("keydown", handleKeyPress);
    return () => document.removeEventListener("keydown", handleKeyPress);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setIsOpen(value.trim().length > 0);
    setSelectedIndex(0);
    if (value.trim().length > 0) {
      setIsLoading(true);
    }
  };

  const handleResultClick = (result: SearchResult) => {
    router.push(result.url);
    setIsOpen(false);
    setQuery("");
  };

  return (
    <div ref={searchRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search documentation... (⌘K)"
          value={query}
          onChange={handleInputChange}
          onFocus={() => query.trim().length > 0 && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="w-full pl-10 pr-4 py-2 rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
        )}
      </div>

      {/* Search Results Dropdown */}
      {isOpen && (
        <div className="absolute top-full mt-2 w-full bg-popover border border-border rounded-md shadow-lg max-h-96 overflow-y-auto z-50">
          {results.length === 0 && !isLoading && query.trim().length > 0 && (
            <div className="p-4 text-center text-muted-foreground">
              No results found for &quot;{query}&quot;
            </div>
          )}

          {results.map((result, index) => (
            <button
              key={result.id}
              onClick={() => handleResultClick(result)}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-accent transition-colors ${
                index === selectedIndex ? "bg-accent" : ""
              }`}
            >
              {result.type === "category" ? (
                <Folder className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              ) : (
                <FileText className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
              )}

              <div className="flex-1 min-w-0">
                <div
                  className="font-medium text-foreground mb-1"
                  dangerouslySetInnerHTML={{ __html: result.title }}
                />
                {result.summary && (
                  <div
                    className="text-sm text-muted-foreground line-clamp-2"
                    dangerouslySetInnerHTML={{ __html: result.summary }}
                  />
                )}
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  {result.category && <span>{result.category}</span>}
                  {result.author && (
                    <>
                      <span>•</span>
                      <span>{result.author}</span>
                    </>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

