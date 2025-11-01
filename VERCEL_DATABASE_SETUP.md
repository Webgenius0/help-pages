# Vercel + PostgreSQL Setup Guide

## Serverless Database Connection Issues

When using PostgreSQL with Vercel serverless functions, you can encounter connection issues because:
- Each function invocation can create new database connections
- PostgreSQL has connection limits (typically 100 connections)
- Connections can timeout or be exhausted

## Solutions

### Option 1: Use Neon (Recommended for Vercel)

**Neon is fully integrated with Vercel and handles connection pooling automatically!**

1. **Use the Prisma-specific connection string:**
   - In your Vercel Dashboard → Storage → Neon → Environment Variables
   - Use `POSTGRES_PRISMA_URL` for Prisma
   - Or use `DATABASE_URL` (pooled connection - recommended)

2. **Update your `.env.local` for local development:**
   ```env
   DATABASE_URL="your-neon-postgres_prisma-url-here"
   ```
   Or pull from Vercel:
   ```bash
   vercel env pull .env.local
   ```

3. **Prisma automatically works with Neon's connection pooling!**
   - No additional configuration needed
   - Neon handles connection pooling at the infrastructure level

#### For Supabase:
1. Use the **Connection Pooling** URL from Supabase dashboard
2. Go to: Supabase Dashboard → Project Settings → Database → Connection Pooling
3. Use port **6543** (not 5432) for pooled connections
4. Your `DATABASE_URL` should look like:
   ```
   DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
   ```
   Note: `connection_limit=1` is important for serverless!

#### For Other PostgreSQL Providers:
1. Use PgBouncer or a connection pooler
2. Add connection parameters to your `DATABASE_URL`:
   ```
   DATABASE_URL="postgresql://user:pass@host:5432/db?connection_limit=1&pool_timeout=20&connect_timeout=10"
   ```
   - `connection_limit=1` - One connection per serverless function
   - `pool_timeout=20` - Max time to wait for a connection
   - `connect_timeout=10` - Max time to establish connection

### Option 2: Use Prisma Data Proxy (Alternative)

1. Sign up at [Prisma Data Platform](https://cloud.prisma.io)
2. Create a Data Proxy
3. Use the Data Proxy URL instead of direct database URL
4. This handles connection pooling automatically

### Option 3: Use Vercel Postgres

If using Vercel's managed Postgres:
1. Install: `npm install @vercel/postgres`
2. Use Vercel's connection pooling automatically

## Configuration for Your Project

### Update `.env.local` or Vercel Environment Variables:

#### For Supabase with Connection Pooling:
```env
DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
```

#### For Direct PostgreSQL (not recommended for serverless):
```env
DATABASE_URL="postgresql://user:password@host:5432/dbname?connection_limit=1&pool_timeout=20"
```

### Important Notes:

1. **Always use connection pooling in production** - Direct connections will exhaust quickly
2. **Set `connection_limit=1`** - Each serverless function should use only 1 connection
3. **Use transaction mode in PgBouncer** - Not session mode (Supabase uses transaction mode by default)
4. **Connection reuse** - Prisma Client is already configured to reuse connections in the same container

## Testing Your Setup

### Test Connection Pooling:
```bash
# Install dependencies
npm install

# Generate Prisma Client
npx prisma generate

# Test connection
npx tsx scripts/test-db-connection.ts
```

### Deploy to Vercel:

1. Set `DATABASE_URL` in Vercel Dashboard → Project Settings → Environment Variables
2. Make sure to use the **pooled connection URL** (port 6543 for Supabase)
3. Redeploy your application

## Common Issues

### Issue: "Connection pool timeout"
**Solution:** 
- Check if you're using connection pooling URL
- Verify `pool_timeout` is set high enough (20+ seconds)
- Make sure `connection_limit=1` is set

### Issue: "Too many connections"
**Solution:**
- You're not using connection pooling - switch to pooled URL
- Check for connection leaks (shouldn't happen with our Prisma setup)

### Issue: "Connection closed"
**Solution:**
- Prisma Client is already configured to handle this
- If persists, check your database provider's connection limits
- Consider upgrading your database plan

### Issue: Slow queries
**Solution:**
- Check if you're using transaction mode (should be default with Supabase)
- Verify connection pooling is working
- Check database performance metrics

## Verifying Connection Pooling Works

1. Deploy to Vercel
2. Make multiple requests quickly
3. Check your database's connection count - should stay low (not one per request)
4. Check Vercel function logs - should not show connection errors

## Quick Fix for Your Current Setup

If you're using Supabase:
1. Go to Supabase Dashboard → Settings → Database
2. Find "Connection Pooling" section
3. Copy the **Connection String** (uses port 6543)
4. Add `?pgbouncer=true&connection_limit=1` to the end
5. Update `DATABASE_URL` in Vercel environment variables
6. Redeploy

Your connection string should look like:
```
postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
```

