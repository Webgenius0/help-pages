# Neon Quick Setup for Your Project

## ✅ Good News: You're Using Neon!

Neon is **perfect** for Vercel serverless functions because:
- ✅ Automatic connection pooling (no configuration needed!)
- ✅ Built-in serverless optimization
- ✅ Fully integrated with Vercel
- ✅ No connection exhaustion issues

## 🚀 Setup Steps

### 1. Verify Environment Variables in Vercel

Your Neon database in Vercel automatically provides these variables:

1. Go to **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**
2. Look for:
   - `DATABASE_URL` ✅ **Use this one** (pooled, recommended)
   - `POSTGRES_PRISMA_URL` (alternative, also works)
   - `DATABASE_URL_UNPOOLED` ❌ (don't use - direct connection)

### 2. Make Sure Prisma Uses DATABASE_URL

Your `prisma/schema.prisma` should already be configured correctly:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")  // ✅ This is correct!
}
```

### 3. Pull Environment Variables for Local Development

Run this command to get your Neon connection string locally:

```bash
vercel env pull .env.local
```

This will create/update `.env.local` with your Neon `DATABASE_URL`.

### 4. Generate Prisma Client

```bash
npx prisma generate
```

### 5. Run Migrations

```bash
# For local development
npx prisma migrate dev

# Or push schema directly
npx prisma db push
```

## ✅ Your Code is Already Ready!

Your `lib/prisma.ts` is **already optimized** for Neon serverless:
- ✅ Reuses PrismaClient instances
- ✅ Proper connection lifecycle management
- ✅ No changes needed!

## 🎯 That's It!

Neon handles everything automatically. Your autosave should work perfectly once:
1. `DATABASE_URL` is set in Vercel (should be automatic)
2. You've run migrations
3. Your code is deployed

## 🔍 Verify It's Working

1. **Check Vercel Logs:**
   - Go to Vercel Dashboard → Your Project → Functions
   - Test autosave
   - Should see no connection errors

2. **Check Neon Dashboard:**
   - Go to Vercel → Storage → Neon → Open in Neon Console
   - Check "Queries" tab - should see your queries executing

## 🐛 If You Still See Errors

### Error: "DATABASE_URL not found"
**Fix:** Make sure `DATABASE_URL` is set in Vercel environment variables

### Error: "Connection refused"
**Fix:** 
1. Verify Neon database is active in Vercel
2. Check if migrations have been run
3. Try reconnecting Neon: Vercel → Storage → Neon → Settings → Reconnect

### Error: "Migration required"
**Fix:**
```bash
# Push your schema
npx prisma db push

# Or create a migration
npx prisma migrate dev --name init
```

## 📝 Quick Reference

**For Prisma + Neon + Vercel:**
- ✅ Use `DATABASE_URL` from Vercel (pooled connection)
- ✅ Your `prisma/schema.prisma` is correct
- ✅ Your `lib/prisma.ts` is optimized
- ✅ No additional configuration needed!

**Pull env vars locally:**
```bash
vercel env pull .env.local
```

**Run migrations:**
```bash
npx prisma generate
npx prisma migrate dev
```

**Deploy:**
Just push to your Git repo - Vercel handles the rest!

