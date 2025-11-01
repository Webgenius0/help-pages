# Migration Guide: Doc-Based Documentation System

This update restructures the documentation system to use a **Doc** model instead of user-based pages. This allows admins to create multiple documentation projects/products, each with its own public URL.

## Breaking Changes

1. **New `Doc` model** - Documentation projects are now separate entities
2. **Page model updated** - Pages now belong to a `Doc` instead of directly to a `User`
3. **NavHeader model updated** - Sections now belong to a `Doc` instead of a `User`
4. **Public routes changed** - From `/u/username/page-slug` to `/docs/doc-slug/page-slug`

## Database Migration

You need to run a Prisma migration to apply these schema changes:

```bash
npx prisma migrate dev --name add_doc_model
```

**⚠️ IMPORTANT**: This migration will break existing data. You'll need to:
1. Backup your database first
2. Migrate existing pages to new Docs (you may need to create a migration script)
3. Or start fresh if you're in development

## What's New

### 1. Documentation Projects (Docs)
- Admins can now create multiple documentation projects
- Each Doc has its own slug and public URL (`/docs/[slug]`)
- Docs can be public or private

### 2. Structure
```
Doc
  ├── Pages (can be in sections or standalone)
  └── NavHeaders (Sections)
      ├── Pages
      └── Children (Subsections)
          └── Pages
```

### 3. Dashboard Changes
- Main dashboard now shows "Documentation Projects"
- Click "New Documentation" to create a Doc
- Manage each Doc separately

### 4. Public URLs
- Old: `/u/username/page-slug`
- New: `/docs/doc-slug/page-slug`

## Next Steps

After running the migration:
1. Create your first Doc from the dashboard
2. Add Sections (NavHeaders) to organize pages
3. Add Pages to sections or as standalone pages
4. Share your public URL: `/docs/your-doc-slug`

## API Changes

### New Endpoints
- `GET /api/docs` - List all docs for authenticated user
- `POST /api/docs` - Create a new doc
- `GET /api/docs/[id]` - Get a doc by ID
- `PUT /api/docs/[id]` - Update a doc
- `DELETE /api/docs/[id]` - Delete a doc
- `GET /api/docs/[slug]` - Get a doc by slug (public)

### Updated Endpoints (to be updated)
- Pages API now requires `docId` instead of just `userId`
- NavHeaders API now requires `docId` instead of `userId`

