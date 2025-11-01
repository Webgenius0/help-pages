# Quick Fix for 500 Error

The 500 error is happening because the database doesn't have the `Doc` table yet. Follow these steps:

## Steps to Fix:

1. **Stop your dev server** (Ctrl+C in the terminal running `npm run dev`)

2. **Regenerate Prisma Client:**
   ```bash
   npx prisma generate
   ```

3. **Create and run the migration:**
   ```bash
   npx prisma migrate dev --name add_doc_model
   ```

   This will:
   - Create a migration file
   - Apply it to your database
   - Create the `Doc` table
   - Update the `Page` and `NavHeader` tables to include `docId`

4. **Restart your dev server:**
   ```bash
   npm run dev
   ```

## If Migration Fails:

If you're in development and don't mind losing existing data, you can reset the database:

```bash
npx prisma migrate reset
```

This will:
- Drop all tables
- Create them fresh with the new schema
- Apply all migrations

## Check Migration Status:

To see what migrations have been applied:
```bash
npx prisma migrate status
```

## After Migration:

Once the migration is complete:
1. Go to your dashboard
2. You should see "No documentation yet"
3. Click "New Documentation" to create your first Doc
4. Your docs will be available at `/docs/[slug]`

