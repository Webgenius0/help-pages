# HelpPages - Implementation Guide

## Overview

HelpPages is a comprehensive documentation platform built with Next.js, featuring Supabase-style design, role-based access control, version history, search, analytics, and much more.

## Features Implemented

### ✅ 1. Database Schema

**Location:** `prisma/schema.prisma`

Enhanced the Prisma schema with:

- **Users** with roles (admin, editor, viewer)
- **NavHeaders** for category management with hierarchy support
- **Pages** with full hierarchy, draft/published status, and public/private visibility
- **PageRevisions** for version control with change logs
- **Organization** table for branding customization
- **PageView** for analytics tracking
- **PageFeedback** for user feedback collection
- **SearchQuery** for search analytics
- **ApiKey** for programmatic API access

**Migration Command:**

```bash
npx prisma migrate dev --name add_enhanced_features
```

### ✅ 2. Search Functionality

**Location:** `app/api/search/route.ts`, `app/components/SearchBar.tsx`

Features:

- Global search across pages, categories, and content
- Fuzzy search with keyword highlighting
- Real-time search with debouncing
- Keyboard shortcuts (⌘K / Ctrl+K)
- Search result categorization
- Analytics tracking for search queries

**Usage:**

```tsx
import { SearchBar } from "@/app/components/SearchBar";

// In your component
<SearchBar />;
```

### ✅ 3. User Management & Permissions

**Location:** `lib/permissions.ts`

Role-based access control:

- **Admin**: Full access (create, edit, delete, manage users, settings)
- **Editor**: Can create and edit all pages, but cannot delete or manage users
- **Viewer**: Read-only access

**Usage:**

```typescript
import { canPerformAction, requireRole } from "@/lib/permissions";

// Check if user can perform an action
const canEdit = canPerformAction(user, "canEdit");

// Require specific role (throws error if unauthorized)
requireRole(user, "admin");
requireRole(user, ["admin", "editor"]); // Multiple roles
```

### ✅ 4. Autosave & Drafts

**Location:** `hooks/useAutosave.ts`, `app/dashboard/pages/[id]/PageEditorClient.tsx`

Features:

- Auto-save after 3 seconds of inactivity
- Visual save status indicator
- Draft content separate from published content
- Error handling and retry logic

**Usage:**

```tsx
import { useAutosave } from "@/hooks/useAutosave";

const { isSaving, lastSaved, error } = useAutosave(data, {
  delay: 3000,
  onSave: async (data) => {
    // Your save logic
  },
  onError: (error) => {
    console.error("Save failed:", error);
  },
});
```

### ✅ 5. Version Control & History

**Location:** `app/components/VersionHistory.tsx`, `app/api/pages/[id]/revisions/route.ts`

Features:

- Automatic revision creation on every save
- View complete version history
- Compare versions side-by-side
- Restore previous versions
- Change log support

**Usage:**

```tsx
import { VersionHistory } from "@/app/components/VersionHistory";

<VersionHistory
  pageId={pageId}
  onRestore={async (revisionId) => {
    await fetch(`/api/pages/${pageId}/restore`, {
      method: "POST",
      body: JSON.stringify({ revisionId }),
    });
  }}
/>;
```

### ✅ 6. Export Functionality

**Location:** `app/api/export/route.ts`, `app/components/ExportButton.tsx`

Export formats:

- **Markdown (.md)**: With frontmatter and metadata
- **HTML (.html)**: Styled standalone page
- **PDF**: Coming soon (use HTML + print-to-PDF for now)

**Usage:**

```tsx
import { ExportButton } from "@/app/components/ExportButton";

<ExportButton pageId={page.id} pageName={page.slug} />;
```

### ✅ 7. Analytics Tracking

**Location:** `app/api/analytics/track/route.ts`

Track:

- Page views with IP, user agent, and referrer
- Search queries
- View counts per page

**Usage:**

```typescript
// Track page view
await fetch("/api/analytics/track", {
  method: "POST",
  body: JSON.stringify({
    pageId: "page-id",
    eventType: "pageview",
  }),
});
```

### ✅ 8. REST API for Programmatic Access

**Location:** `app/api/v1/pages/route.ts`, `app/api/v1/pages/[id]/route.ts`

Full CRUD API with API key authentication:

- `GET /api/v1/pages` - List all pages
- `POST /api/v1/pages` - Create a page
- `GET /api/v1/pages/[id]` - Get a specific page
- `PATCH /api/v1/pages/[id]` - Update a page
- `DELETE /api/v1/pages/[id]` - Delete a page

**Usage:**

```bash
# List pages
curl -H "x-api-key: your-api-key" \
  http://localhost:3000/api/v1/pages

# Create page
curl -X POST \
  -H "x-api-key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"title":"New Page","slug":"new-page","content":"# Hello"}' \
  http://localhost:3000/api/v1/pages
```

### ✅ 9. Breadcrumb Navigation

**Location:** `app/components/Breadcrumb.tsx`

**Usage:**

```tsx
import { Breadcrumb } from "@/app/components/Breadcrumb";

<Breadcrumb
  items={[
    { label: "Dashboard", href: "/dashboard" },
    { label: "Pages", href: "/dashboard/pages" },
    { label: "Edit Page" },
  ]}
  showHome={true}
/>;
```

### ✅ 10. Custom Branding & Settings

**Location:** `app/dashboard/settings/page.tsx`, `app/dashboard/settings/SettingsClient.tsx`

Customize:

- Organization name and logo
- Favicon
- Brand colors
- Font family
- Custom domain

### ✅ 11. Public/Private Pages

**Location:** Enhanced `Page` model with `isPublic` field

Features:

- Public pages accessible without authentication
- Private pages require login
- Draft pages only visible to authors and admins
- Permission checks in all API routes

## Remaining Features to Implement

### 🚧 Header Navigation Management

Create UI for:

- Adding/editing/deleting categories
- Nested subcategories
- Drag-and-drop reordering

### 🚧 Rich Text Editor with Slash Commands

Integrate:

- TipTap or Lexical editor
- Slash commands (/header, /table, /code, etc.)
- Media upload
- Keyboard shortcuts

### 🚧 Drag-and-Drop Sidebar

Install and implement:

```bash
npm install @dnd-kit/core @dnd-kit/sortable
```

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create `.env.local`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/helppages"
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"
```

### 3. Run Database Migration

```bash
npx prisma migrate dev
npx prisma generate
```

### 4. Seed Initial Data (Optional)

```bash
npx prisma db seed
```

### 5. Start Development Server

```bash
npm run dev
```

## API Documentation

### Authentication

All API routes support two authentication methods:

1. **Session-based** (automatic with Next-Auth)
2. **API Key** (pass `x-api-key` header)

### Endpoints

#### Search

- `GET /api/search?q=query&limit=20&includePrivate=true`

#### Pages

- `GET /api/v1/pages?limit=50&offset=0&status=published`
- `POST /api/v1/pages`
- `GET /api/v1/pages/[id]`
- `PATCH /api/v1/pages/[id]`
- `DELETE /api/v1/pages/[id]`

#### Revisions

- `GET /api/pages/[id]/revisions`
- `POST /api/pages/[id]/restore`

#### Export

- `GET /api/export?format=markdown&pageId=...`

#### Analytics

- `POST /api/analytics/track`

## Best Practices

### 1. Permission Checks

Always check permissions before allowing actions:

```typescript
import { canEditPage } from "@/lib/permissions";

if (!canEditPage(user, page.userId)) {
  throw new Error("Forbidden");
}
```

### 2. Error Handling

Use try-catch blocks and return appropriate error messages:

```typescript
try {
  // Your code
} catch (error) {
  console.error("Error:", error);
  return NextResponse.json(
    { error: "Failed to perform action" },
    { status: 500 }
  );
}
```

### 3. Autosave

Implement autosave for better UX:

```typescript
const { isSaving, lastSaved } = useAutosave(formData, {
  delay: 3000,
  onSave: saveFunction,
});
```

### 4. Search Indexing

Update search index when content changes:

```typescript
const searchIndex = `${title} ${content} ${summary || ""}`.toLowerCase();
```

## Testing

### Run Tests

```bash
npm run test
```

### Test API Endpoints

Use the provided Postman collection or cURL examples above.

## Deployment

### Vercel (Recommended)

```bash
vercel
```

### Docker

```bash
docker build -t helppages .
docker run -p 3000:3000 helppages
```

## Support

For issues or questions, please refer to:

- GitHub Issues
- Documentation: [docs.helppages.com](https://docs.helppages.com)
- Discord Community

## License

MIT
