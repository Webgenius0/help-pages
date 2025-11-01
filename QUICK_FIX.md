# Quick Fix: PostgreSQL Connection Error

## Immediate Steps

### 1. Check if DATABASE_URL is set
```bash
# Windows PowerShell
$env:DATABASE_URL

# Should show something like:
# postgresql://username:password@localhost:5432/helppages
```

### 2. If not set, create `.env.local` file:
```env
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/helppages"
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"
```

### 3. Check if PostgreSQL is running (Windows)
```powershell
# Check service status
Get-Service postgresql*

# Start PostgreSQL (replace XX with your version)
Start-Service postgresql-x64-XX

# Or use Services app:
# Win+R → services.msc → Find "postgresql" → Start
```

### 4. Create database (if it doesn't exist)
```bash
# Using psql
psql -U postgres
CREATE DATABASE helppages;
\q

# Or using createdb
createdb -U postgres helppages
```

### 5. Test connection
Visit: http://localhost:3000/api/health/db

Or run:
```bash
npx tsx scripts/test-db-connection.ts
```

### 6. Run migrations
```bash
npx prisma generate
npx prisma migrate dev
```

## Common Windows PostgreSQL Issues

### PostgreSQL not installed?
Download from: https://www.postgresql.org/download/windows/

### Can't find service?
Check installation path:
```powershell
Get-Service | Where-Object {$_.DisplayName -like "*postgresql*"}
```

### Wrong port?
Default is 5432. Check if different in:
- PostgreSQL config: `postgresql.conf` → `port = 5432`
- Or try: `postgresql://postgres:password@localhost:5433/helppages`

### Password issues?
Reset PostgreSQL password:
```sql
ALTER USER postgres WITH PASSWORD 'newpassword';
```

## Using Supabase (Easier Alternative)

1. Go to https://supabase.com
2. Create a new project
3. Go to Project Settings → Database
4. Copy "Connection string" (URI format)
5. Paste into `.env.local` as `DATABASE_URL`

## Still Not Working?

1. **Restart your dev server** after changing `.env.local`
2. **Check PostgreSQL logs** for detailed errors
3. **Verify DATABASE_URL format** - no extra quotes or spaces
4. **Try connecting manually**: `psql -U postgres -d helppages`

