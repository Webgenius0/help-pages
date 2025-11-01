# Database Setup Guide

## PostgreSQL Connection Error Troubleshooting

If you're seeing `Error: Connection closed` or connection errors, follow these steps:

### 1. Check Environment Variables

Create a `.env.local` file in the root directory:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/helppages"
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"
```

**Important:** Replace:
- `username` - Your PostgreSQL username (usually `postgres`)
- `password` - Your PostgreSQL password
- `localhost:5432` - Your database host and port
- `helppages` - Your database name

### 2. Check if PostgreSQL is Running

#### Windows
```powershell
# Check if PostgreSQL service is running
Get-Service postgresql*

# Start PostgreSQL service
Start-Service postgresql-x64-XX  # Replace XX with your version number
```

#### macOS (Homebrew)
```bash
# Check status
brew services list | grep postgresql

# Start PostgreSQL
brew services start postgresql
```

#### Linux
```bash
# Check status
sudo systemctl status postgresql

# Start PostgreSQL
sudo systemctl start postgresql
```

### 3. Create the Database

If the database doesn't exist, create it:

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE helppages;

# Exit
\q
```

Or using a connection string:
```bash
createdb -U postgres helppages
```

### 4. Test Database Connection

Run the test script:
```bash
npx tsx scripts/test-db-connection.ts
```

Or test manually:
```bash
psql -U postgres -d helppages -c "SELECT 1;"
```

### 5. Run Prisma Migrations

Once connected, run migrations:

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Or if migrations already exist
npx prisma migrate deploy
```

### 6. Common Issues & Solutions

#### Issue: "Connection refused"
**Solution:** PostgreSQL is not running or wrong host/port in DATABASE_URL

#### Issue: "Authentication failed"
**Solution:** Wrong username/password in DATABASE_URL

#### Issue: "Database does not exist"
**Solution:** Create the database (see step 3)

#### Issue: "Password authentication failed"
**Solution:** 
- Check if password is correct
- For local development, you might need to set `trust` authentication in `pg_hba.conf`

#### Issue: Connection works but migrations fail
**Solution:**
- Make sure you have migration permissions
- Check if tables already exist: `npx prisma db pull` to sync schema

### 7. Using Supabase (Cloud PostgreSQL)

If using Supabase, your DATABASE_URL will look like:
```
DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres"
```

Get this from: Supabase Dashboard → Project Settings → Database → Connection String

### 8. Connection Pool Settings

For production, add connection pool parameters:
```
DATABASE_URL="postgresql://user:pass@host:5432/db?connection_limit=10&pool_timeout=10"
```

### Quick Setup Script

Create a `.env.local` file and run:
```bash
# Install dependencies
npm install

# Generate Prisma Client
npx prisma generate

# Run migrations (creates all tables)
npx prisma migrate dev --name init

# Seed data (optional)
npx prisma db seed
```

## Still Having Issues?

1. **Check Prisma logs:** Add `log: ['query', 'error', 'warn']` to PrismaClient
2. **Test connection:** Use `scripts/test-db-connection.ts`
3. **Check PostgreSQL logs:** Usually in `/var/log/postgresql/` or Windows Event Viewer
4. **Verify DATABASE_URL:** Make sure there are no extra spaces or quotes

