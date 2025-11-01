/**
 * Utility functions for slug generation and validation
 */

/**
 * Generate a URL-safe slug from a text string
 * Converts to lowercase, replaces spaces/special chars with hyphens, removes leading/trailing hyphens
 */
export function generateSlug(text: string): string {
  if (!text) return "";

  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special characters except word chars, spaces, and hyphens
    .replace(/[\s_]+/g, "-") // Replace spaces and underscores with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, ""); // Remove leading and trailing hyphens
}

/**
 * Validate if a slug is valid (URL-safe format)
 * Valid slugs: lowercase letters, numbers, and hyphens only
 * Cannot start or end with hyphen
 * Must be at least 1 character
 */
export function isValidSlug(slug: string): boolean {
  if (!slug || slug.trim().length === 0) {
    return false;
  }

  // Must match pattern: lowercase letters, numbers, hyphens (but not starting/ending with hyphen)
  const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

  return slugPattern.test(slug);
}

/**
 * Get validation error message for invalid slug
 */
export function getSlugErrorMessage(slug: string): string | null {
  if (!slug || slug.trim().length === 0) {
    return "Slug is required";
  }

  if (!isValidSlug(slug)) {
    if (slug.includes(" ")) {
      return "Slug cannot contain spaces. Use hyphens instead (e.g., 'my-page')";
    }
    if (slug !== slug.toLowerCase()) {
      return "Slug must be lowercase";
    }
    if (slug.startsWith("-") || slug.endsWith("-")) {
      return "Slug cannot start or end with a hyphen";
    }
    if (/[^a-z0-9-]/.test(slug)) {
      return "Slug can only contain lowercase letters, numbers, and hyphens";
    }
    return "Invalid slug format. Use lowercase letters, numbers, and hyphens only";
  }

  return null;
}
