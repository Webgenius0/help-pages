# Neon + Prisma Setup for Vercel

## Quick Setup

Neon is fully integrated with Vercel and handles connection pooling automatically. Here's how to set it up:

## 1. Connect Neon to Your Vercel Project

1. Go to Vercel Dashboard → Your Project → Storage
2. Click "Connect Database" → Select "Neon"
3. Follow the prompts to create/connect a Neon database

## 2. Environment Variables

Neon automatically provides these environment variables in Vercel:

- `DATABASE_URL` - **Use this for Prisma** (pooled connection, recommended)
- `POSTGRES_PRISMA_URL` - Alternative Prisma connection string
- `DATABASE_URL_UNPOOLED` - Direct connection (don't use for serverless)
- `POSTGRES_URL` - Vercel Postgres template format

## 3. Configure Prisma

Your `prisma/schema.prisma` should use the standard PostgreSQL provider:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

## 4. Local Development Setup

Pull environment variables from Vercel:

```bash
vercel env pull .env.local
```

Or manually set in `.env.local`:

```env
DATABASE_URL="your-neon-connection-string-from-vercel"
```

## 5. Generate Prisma Client & Run Migrations

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Or push schema (for prototyping)
npx prisma db push
```

## 6. Deploy

That's it! No special configuration needed. Neon handles:
- ✅ Connection pooling automatically
- ✅ Serverless-optimized connections
- ✅ Automatic scaling
- ✅ Zero connection exhaustion issues

## Current Code Status

Your `lib/prisma.ts` is already configured correctly for Neon! The code:
- Reuses PrismaClient instances (prevents connection leaks)
- Works perfectly with Neon's connection pooling
- No additional changes needed

## Troubleshooting

### Issue: Connection errors in production

**Solution:** 
1. Verify `DATABASE_URL` is set in Vercel environment variables
2. Make sure you're using the pooled `DATABASE_URL` (not `DATABASE_URL_UNPOOLED`)
3. Check that your Neon project is active

### Issue: Migrations fail

**Solution:**
- Use `DATABASE_URL_UNPOOLED` temporarily for migrations (only in CI/CD)
- Or use Neon's SQL Editor for schema changes
- For production, migrations should use pooled connection

### Issue: Slow queries

**Solution:**
- Check Neon dashboard for query performance
- Verify you're using indexes appropriately
- Check if your Neon plan has resource limits

## Verify It's Working

1. Deploy to Vercel
2. Test your autosave functionality
3. Check Vercel function logs - should see no connection errors
4. Monitor Neon dashboard - connection count should be low and stable

## Benefits of Neon

- ✅ **Automatic Connection Pooling** - No PgBouncer setup needed
- ✅ **Serverless-Optimized** - Built for serverless functions
- ✅ **Branching** - Test database branches (like Git branches)
- ✅ **Auto-scaling** - Handles traffic spikes automatically
- ✅ **Free Tier** - Generous free tier for development

Your setup is already optimized for Neon! Just make sure your `DATABASE_URL` environment variable in Vercel is set correctly.

