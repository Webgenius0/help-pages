# Complete CloudPanel Deployment Guide for Next.js

This guide walks you through deploying your Next.js SaaS application to CloudPanel.

## 📋 Prerequisites

- CloudPanel installed on your server
- SSH access to your server
- Domain `helppages.ai` pointing to your server
- PostgreSQL database (can be on same server or remote)
- Git repository (or ability to upload files)

## 🚀 Step-by-Step Deployment

### Step 1: Create Node.js Site in CloudPanel

1. **Login to CloudPanel**

   - Access your CloudPanel dashboard (usually `https://your-server-ip:8443`)

2. **Create New Site**

   - Click **"Sites"** → **"Add Site"**
   - Select **"Node.js"** as the site type
   - Enter domain: `helppages.ai`
   - Choose PHP version: **Not applicable** (Node.js site)
   - Click **"Create"**

3. **Note the App Port**
   - CloudPanel will assign a port (e.g., `3000`, `3001`, etc.)
   - **Important**: Note this port number - you'll need it for the Nginx config
   - You can find it in: **Sites** → Your Site → **Settings** → **Port**

### Step 2: Upload Your Project Files

You have several options:

#### Option A: Git Clone (Recommended)

```bash
# SSH into your server
ssh root@your-server-ip

# Navigate to your site directory
# CloudPanel typically stores sites in: /home/cloudpanel/htdocs/helppages.ai/
cd /home/cloudpanel/htdocs/helppages.ai/

# Clone your repository
git clone https://github.com/your-username/your-repo.git .

# Or if you have a specific branch
git clone -b main https://github.com/your-username/your-repo.git .
```

#### Option B: Upload via SFTP

1. Use an SFTP client (FileZilla, WinSCP, etc.)
2. Connect to your server
3. Navigate to: `/home/cloudpanel/htdocs/helppages.ai/`
4. Upload all project files (except `node_modules`, `.next`, `.env.local`)

#### Option C: Use CloudPanel File Manager

1. In CloudPanel, go to **Sites** → Your Site → **File Manager**
2. Upload your project files
3. Extract if needed

### Step 3: Install Dependencies

```bash
# SSH into server
ssh root@your-server-ip

# Navigate to site directory
cd /home/cloudpanel/htdocs/helppages.ai/

# Install Node.js dependencies
npm install

# Or if using yarn
yarn install
```

### Step 4: Set Up Environment Variables

1. **In CloudPanel UI:**
   - Go to **Sites** → Your Site → **Environment Variables**
   - Add the following variables:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/helppages
NEXTAUTH_SECRET=your-secret-key-here-generate-a-random-string
NEXTAUTH_URL=https://helppages.ai
NODE_ENV=production
```

**Important Notes:**

- `NEXTAUTH_SECRET`: Generate a random string (32+ characters)
  ```bash
  openssl rand -base64 32
  ```
- `NEXTAUTH_URL`: Use `https://helppages.ai` (not `http://`)
- `DATABASE_URL`: Update with your actual PostgreSQL credentials

2. **Or create `.env.local` file manually:**

```bash
# SSH into server
cd /home/cloudpanel/htdocs/helppages.ai/

# Create .env.local file
nano .env.local
```

Paste:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/helppages
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=https://helppages.ai
NODE_ENV=production
```

Save and exit (Ctrl+X, then Y, then Enter)

### Step 5: Set Up PostgreSQL Database

#### Option A: Local PostgreSQL (on same server)

```bash
# Install PostgreSQL (if not installed)
sudo apt update
sudo apt install postgresql postgresql-contrib -y

# Create database and user
sudo -u postgres psql

# In PostgreSQL prompt:
CREATE DATABASE helppages;
CREATE USER helppages_user WITH PASSWORD 'your-secure-password';
GRANT ALL PRIVILEGES ON DATABASE helppages TO helppages_user;
\q
```

Update `DATABASE_URL` in environment variables:

```
postgresql://helppages_user:your-secure-password@localhost:5432/helppages
```

#### Option B: Remote PostgreSQL (Supabase, Neon, etc.)

Use your existing database connection string in `DATABASE_URL`.

### Step 6: Run Database Migrations

```bash
# Navigate to project directory
cd /home/cloudpanel/htdocs/helppages.ai/

# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Or if using dev migrations
npx prisma migrate dev
```

### Step 7: Build the Next.js Application

```bash
# Build for production
npm run build

# This creates the .next directory with optimized production build
```

### Step 8: Set Up Process Manager (PM2)

CloudPanel may handle this, but for reliability, use PM2:

```bash
# Install PM2 globally
npm install -g pm2

# Create PM2 ecosystem file
nano ecosystem.config.js
```

Paste:

```javascript
module.exports = {
  apps: [
    {
      name: "helppages",
      script: "npm",
      args: "start",
      cwd: "/home/cloudpanel/htdocs/helppages.ai",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3000, // Replace with your CloudPanel app port
      },
      error_file: "/var/log/pm2/helppages-error.log",
      out_file: "/var/log/pm2/helppages-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      autorestart: true,
      max_memory_restart: "1G",
    },
  ],
};
```

Save and start:

```bash
# Start the application
pm2 start ecosystem.config.js

# Save PM2 configuration to start on boot
pm2 save
pm2 startup
```

### Step 9: Configure Nginx (Wildcard Subdomain)

1. **In CloudPanel:**

   - Go to **Sites** → Your Site → **Vhost Editor**
   - Copy the contents of `nginx-cloudpanel-wildcard.conf`
   - Paste into Vhost Editor
   - **Important**: The `{{app_port}}` placeholder will be automatically replaced by CloudPanel with your app's port

2. **Test Nginx configuration:**

   ```bash
   sudo nginx -t
   ```

3. **Reload Nginx:**
   ```bash
   sudo systemctl reload nginx
   ```

### Step 10: Update Next.js Middleware for Subdomains

1. **Update `middleware.ts`:**

   - Copy the subdomain detection logic from `middleware.example.ts`
   - Update your `middleware.ts` file

2. **Create subdomain utility:**

   ```bash
   # Copy the example file
   cp lib/subdomain.example.ts lib/subdomain.ts
   ```

3. **Rebuild the application:**
   ```bash
   npm run build
   pm2 restart helppages
   ```

### Step 11: Set Up SSL Certificate

1. **In CloudPanel:**
   - Go to **Sites** → Your Site → **SSL/TLS**
   - Click **"Let's Encrypt"**
   - Enter domains: `*.helppages.ai,helppages.ai`
   - Select **"DNS Challenge"** (required for wildcard)
   - Complete DNS verification
   - Apply certificate

### Step 12: Verify Deployment

1. **Check if app is running:**

   ```bash
   pm2 status
   pm2 logs helppages
   ```

2. **Test main domain:**

   - Visit: `https://helppages.ai`
   - Should load your Next.js app

3. **Test subdomain:**

   - Visit: `https://user1.helppages.ai`
   - Should load user-specific content

4. **Check logs:**

   ```bash
   # PM2 logs
   pm2 logs helppages

   # Nginx logs
   sudo tail -f /var/log/nginx/helppages-access.log
   sudo tail -f /var/log/nginx/helppages-error.log
   ```

## 🔧 CloudPanel-Specific Configuration

### Finding Your App Port

1. In CloudPanel: **Sites** → Your Site → **Settings**
2. Look for **"Port"** or **"Application Port"**
3. This is the port Nginx will proxy to (e.g., `3000`, `3001`)

### Using CloudPanel's Node.js Manager

Some CloudPanel versions have a built-in Node.js process manager:

1. Go to **Sites** → Your Site → **Node.js**
2. Set:
   - **Start Command**: `npm start`
   - **Working Directory**: `/home/cloudpanel/htdocs/helppages.ai`
   - **Port**: (auto-detected or set manually)
3. Click **"Start"**

### Environment Variables in CloudPanel

CloudPanel may have a dedicated section:

- **Sites** → Your Site → **Environment Variables**
- Add all required variables here
- They'll be available to your Node.js process

## 🔄 Deployment Workflow (Updates)

When you need to update your application:

```bash
# SSH into server
ssh root@your-server-ip

# Navigate to project
cd /home/cloudpanel/htdocs/helppages.ai/

# Pull latest changes (if using Git)
git pull origin main

# Install new dependencies
npm install

# Run migrations (if any)
npx prisma migrate deploy
npx prisma generate

# Rebuild
npm run build

# Restart application
pm2 restart helppages

# Or if using CloudPanel's manager, restart from UI
```

## 🐛 Troubleshooting

### App Not Starting

```bash
# Check PM2 status
pm2 status
pm2 logs helppages

# Check if port is in use
sudo netstat -tlnp | grep 3000

# Test the app directly
cd /home/cloudpanel/htdocs/helppages.ai/
npm start
```

### 502 Bad Gateway

- Check if Next.js app is running: `pm2 status`
- Verify port in Nginx config matches app port
- Check Nginx error logs: `sudo tail -f /var/log/nginx/helppages-error.log`

### Database Connection Errors

- Verify `DATABASE_URL` is correct
- Test connection: `psql $DATABASE_URL`
- Check PostgreSQL is running: `sudo systemctl status postgresql`

### Build Errors

```bash
# Clear Next.js cache
rm -rf .next
npm run build
```

### Port Conflicts

If CloudPanel's port conflicts:

- Change port in `ecosystem.config.js`
- Update Nginx config with new port
- Restart PM2 and Nginx

## 📊 Monitoring

### PM2 Monitoring

```bash
# View real-time logs
pm2 logs helppages

# Monitor resources
pm2 monit

# View process info
pm2 show helppages
```

### Nginx Monitoring

```bash
# Access logs
sudo tail -f /var/log/nginx/helppages-access.log

# Error logs
sudo tail -f /var/log/nginx/helppages-error.log
```

## ✅ Deployment Checklist

- [ ] Site created in CloudPanel
- [ ] Project files uploaded
- [ ] Dependencies installed (`npm install`)
- [ ] Environment variables configured
- [ ] Database set up and migrations run
- [ ] Application built (`npm run build`)
- [ ] PM2 configured and running
- [ ] Nginx configuration updated (wildcard subdomain)
- [ ] SSL certificate installed
- [ ] Middleware updated for subdomain detection
- [ ] Main domain accessible
- [ ] Subdomain accessible
- [ ] Logs monitored

## 🚀 Next Steps

1. Set up automated deployments (GitHub Actions, GitLab CI, etc.)
2. Configure monitoring and alerts
3. Set up backups for database
4. Configure CDN if needed
5. Set up staging environment

Your Next.js SaaS application is now deployed and ready to serve users via wildcard subdomains! 🎉
