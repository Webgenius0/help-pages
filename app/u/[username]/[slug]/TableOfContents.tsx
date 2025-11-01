"use client";

import { useEffect, useState } from "react";

interface Heading {
  level: number;
  text: string;
  id: string;
}

interface TableOfContentsProps {
  headings: Heading[];
}

export default function TableOfContents({ headings }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    if (headings.length === 0) return;

    const observerOptions = {
      root: null,
      rootMargin: "-100px 0px -66% 0px", // Trigger when heading is near top of viewport
      threshold: [0, 0.25, 0.5, 0.75, 1],
    };

    const observer = new IntersectionObserver(
      (entries) => {
        // Get all currently intersecting entries
        const intersectingEntries = entries.filter((entry) => entry.isIntersecting);

        if (intersectingEntries.length > 0) {
          // Find the entry closest to the top
          const sortedByTop = intersectingEntries.sort(
            (a, b) => a.boundingClientRect.top - b.boundingClientRect.top
          );
          setActiveId(sortedByTop[0].target.id);
        } else {
          // If no entries are intersecting, find the one that just passed
          // We need to check all headings to find which one should be active
          const headingElements = headings
            .map((h) => {
              const el = document.getElementById(h.id);
              if (!el) return null;
              const rect = el.getBoundingClientRect();
              return {
                id: h.id,
                top: rect.top,
                bottom: rect.bottom,
              };
            })
            .filter((h): h is { id: string; top: number; bottom: number } => h !== null)
            .sort((a, b) => a.top - b.top);

          // Find the heading that's closest to but above the viewport
          const viewportTop = 100; // Offset for header
          let activeHeading = headingElements[0]?.id || "";

          for (const heading of headingElements) {
            if (heading.top <= viewportTop) {
              activeHeading = heading.id;
            } else {
              break;
            }
          }

          if (activeHeading) {
            setActiveId(activeHeading);
          }
        }
      },
      observerOptions
    );

    // Observe all headings
    headings.forEach(({ id }) => {
      const element = document.getElementById(id);
      if (element) {
        observer.observe(element);
      }
    });

    // Also set initial active heading on mount
    const handleScroll = () => {
      const viewportTop = 100;
      const headingElements = headings
        .map((h) => {
          const el = document.getElementById(h.id);
          if (!el) return null;
          const rect = el.getBoundingClientRect();
          return {
            id: h.id,
            top: rect.top + window.scrollY,
          };
        })
        .filter((h): h is { id: string; top: number } => h !== null)
        .sort((a, b) => a.top - b.top);

      const scrollPosition = window.scrollY + viewportTop;
      let activeHeading = headingElements[0]?.id || "";

      for (let i = headingElements.length - 1; i >= 0; i--) {
        if (headingElements[i].top <= scrollPosition) {
          activeHeading = headingElements[i].id;
          break;
        }
      }

      setActiveId(activeHeading);
    };

    // Set initial active heading
    handleScroll();

    // Add scroll listener for better tracking
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", handleScroll);
    };
  }, [headings]);

  if (headings.length === 0) return null;

  return (
    <nav className="text-sm">
      <ul className="space-y-1.5">
        {headings.map((heading) => (
          <li
            key={heading.id}
            style={{
              paddingLeft: `${(heading.level - 2) * 12}px`,
            }}
            className={heading.level === 1 || heading.level === 2 ? "pl-0" : ""}
          >
            <a
              href={`#${heading.id}`}
              className={`block py-1.5 px-2 rounded-md transition-colors text-sm ${
                activeId === heading.id
                  ? "text-primary bg-primary/10 font-medium"
                  : "text-foreground/70 hover:text-foreground hover:bg-muted"
              }`}
              onClick={(e) => {
                e.preventDefault();
                const element = document.getElementById(heading.id);
                if (element) {
                  // Set active immediately for better UX
                  setActiveId(heading.id);
                  
                  const offset = 100; // Account for sticky header
                  const elementPosition =
                    element.getBoundingClientRect().top + window.pageYOffset;
                  const offsetPosition = elementPosition - offset;

                  window.scrollTo({
                    top: offsetPosition,
                    behavior: "smooth",
                  });
                }
              }}
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
