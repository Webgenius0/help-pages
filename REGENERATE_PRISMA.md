# IMPORTANT: Regenerate Prisma Client

The error you're seeing is because Prisma Client is out of sync with your schema.

## Fix Steps:

1. **Stop your dev server** (Ctrl+C in the terminal where `npm run dev` is running)

2. **Regenerate Prisma Client:**

   ```bash
   npx prisma generate
   ```

3. **Restart your dev server:**
   ```bash
   npm run dev
   ```

## What was fixed:

- ✅ Removed `lastEditedBy` from update (will be re-added after Prisma regenerates)
- ✅ Removed `searchIndex` from update (will be re-added after Prisma regenerates)
- ✅ Kept only valid, working fields: title, slug, content, summary, status, isPublic, publishedAt

## After regenerating:

The update should work. If you want to add `lastEditedBy` back later, you can do so after Prisma Client is regenerated.
