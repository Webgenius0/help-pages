# Quick Deployment Checklist for CloudPanel

## ✅ Pre-Deployment

- [ ] CloudPanel installed and accessible
- [ ] Domain `helppages.ai` DNS pointing to server
- [ ] Wildcard DNS `*.helppages.ai` pointing to server
- [ ] SSH access to server
- [ ] Git repository ready (or files ready to upload)

## 🚀 Deployment Steps

### 1. Create Site in CloudPanel
- [ ] Login to CloudPanel
- [ ] Create new **Node.js** site: `helppages.ai`
- [ ] **Note the app port** (e.g., 3000, 3001)

### 2. Upload Project
- [ ] SSH into server
- [ ] Navigate to `/home/cloudpanel/htdocs/helppages.ai/`
- [ ] Clone repo or upload files
- [ ] Run `npm install`

### 3. Environment Variables
- [ ] Set `DATABASE_URL` (PostgreSQL connection)
- [ ] Set `NEXTAUTH_SECRET` (generate: `openssl rand -base64 32`)
- [ ] Set `NEXTAUTH_URL=https://helppages.ai`
- [ ] Set `NODE_ENV=production`

### 4. Database Setup
- [ ] PostgreSQL installed/running
- [ ] Database created: `helppages`
- [ ] Run migrations: `npx prisma migrate deploy`
- [ ] Generate Prisma client: `npx prisma generate`

### 5. Build Application
- [ ] Run `npm run build`
- [ ] Verify `.next` directory created

### 6. Process Manager (PM2)
- [ ] Install PM2: `npm install -g pm2`
- [ ] Update `ecosystem.config.js` with correct paths/port
- [ ] Start: `pm2 start ecosystem.config.js`
- [ ] Save: `pm2 save && pm2 startup`

### 7. Nginx Configuration
- [ ] Open CloudPanel **Vhost Editor**
- [ ] Paste `nginx-cloudpanel-wildcard.conf`
- [ ] Test: `sudo nginx -t`
- [ ] Reload: `sudo systemctl reload nginx`

### 8. SSL Certificate
- [ ] Go to **SSL/TLS** in CloudPanel
- [ ] Request Let's Encrypt for: `*.helppages.ai,helppages.ai`
- [ ] Use **DNS Challenge**
- [ ] Complete verification

### 9. Update Next.js Code
- [ ] Update `middleware.ts` with subdomain detection
- [ ] Create `lib/subdomain.ts` from example
- [ ] Rebuild: `npm run build`
- [ ] Restart: `pm2 restart helppages`

### 10. Verification
- [ ] Test: `https://helppages.ai` (main domain)
- [ ] Test: `https://user1.helppages.ai` (subdomain)
- [ ] Check PM2: `pm2 status`
- [ ] Check logs: `pm2 logs helppages`
- [ ] Check Nginx logs: `sudo tail -f /var/log/nginx/helppages-error.log`

## 🔄 Update Workflow

When updating the application:

```bash
cd /home/cloudpanel/htdocs/helppages.ai/
git pull                    # If using Git
npm install                 # Install new dependencies
npx prisma migrate deploy   # Run migrations if any
npx prisma generate        # Regenerate Prisma client
npm run build              # Rebuild
pm2 restart helppages      # Restart app
```

## 🐛 Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| 502 Bad Gateway | Check PM2: `pm2 status`, verify port in Nginx |
| App not starting | Check logs: `pm2 logs helppages` |
| Database errors | Verify `DATABASE_URL`, test connection |
| SSL not working | Check DNS wildcard, verify certificate |
| Subdomains not working | Check DNS, verify Nginx config |

## 📝 Important Files

- `nginx-cloudpanel-wildcard.conf` - Nginx configuration
- `ecosystem.config.js` - PM2 configuration
- `middleware.example.ts` - Subdomain detection example
- `lib/subdomain.example.ts` - Subdomain utility example

## 📚 Full Documentation

- **Complete Deployment Guide**: `CLOUDPANEL_DEPLOYMENT_GUIDE.md`
- **Nginx Setup**: `CLOUDPANEL_SETUP_GUIDE.md`
- **Quick Commands**: `QUICK_COMMANDS.md`

---

**Ready to deploy?** Follow the checklist above step by step! 🚀

