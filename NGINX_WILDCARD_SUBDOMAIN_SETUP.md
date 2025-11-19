# Complete Nginx Wildcard Subdomain Setup for CloudPanel

## 📁 Files Created

This setup includes the following files:

1. **`nginx-cloudpanel-wildcard.conf`** - Complete Nginx configuration ready for CloudPanel Vhost Editor
2. **`CLOUDPANEL_SETUP_GUIDE.md`** - Detailed step-by-step setup guide
3. **`QUICK_COMMANDS.md`** - Quick reference for all commands
4. **`middleware.example.ts`** - Example Next.js middleware for subdomain detection
5. **`lib/subdomain.example.ts`** - Utility functions for subdomain detection

## 🚀 Quick Start

### Step 1: DNS Configuration
Ensure your DNS has a wildcard A record:
```
Type: A
Name: *
Value: YOUR_SERVER_IP
```

### Step 2: SSL Certificate
In CloudPanel:
- Go to **Sites** → Your Site → **SSL/TLS**
- Request Let's Encrypt certificate for: `*.helppages.ai,helppages.ai`
- Use **DNS Challenge** (required for wildcard)

### Step 3: Nginx Configuration
1. Open CloudPanel **Vhost Editor**
2. Copy entire contents of `nginx-cloudpanel-wildcard.conf`
3. Paste into Vhost Editor
4. **DO NOT modify** placeholders: `{{ssl_certificate}}`, `{{ssl_certificate_key}}`, `{{app_port}}`, `{{root}}`
5. Save

### Step 4: Test & Reload
```bash
sudo nginx -t          # Test configuration
sudo systemctl reload nginx  # Apply changes
```

### Step 5: Update Next.js
1. Update `middleware.ts` using `middleware.example.ts` as reference
2. Create `lib/subdomain.ts` from `lib/subdomain.example.ts`
3. Use subdomain detection in your pages and API routes

## 📋 Configuration Features

The Nginx configuration includes:

✅ **Wildcard subdomain support** - `*.helppages.ai`  
✅ **HTTP → HTTPS redirect** - Automatic SSL enforcement  
✅ **WebSocket support** - For Next.js HMR and real-time features  
✅ **Static file optimization** - Direct serving of `/_next/static/`  
✅ **Security headers** - HSTS, X-Frame-Options, etc.  
✅ **Let's Encrypt support** - `.well-known/acme-challenge/`  
✅ **CloudPanel compatibility** - Uses placeholders correctly  
✅ **Proper proxy headers** - X-Forwarded-For, X-Real-IP, etc.

## 🔍 How Subdomain Detection Works

### In Nginx
- Nginx receives request for `user1.helppages.ai`
- Proxies to Next.js on `127.0.0.1:{{app_port}}`
- Passes `Host` header: `user1.helppages.ai`

### In Next.js Middleware
- Reads `Host` header from request
- Extracts subdomain: `user1`
- Adds `x-subdomain` header for server components
- Optionally rewrites to `/u/user1` route

### In Server Components
```typescript
import { getSubdomain } from "@/lib/subdomain";

export default async function Page() {
  const subdomain = await getSubdomain();
  // subdomain = "user1" or null for main domain
}
```

### In API Routes
```typescript
import { getSubdomainFromRequest } from "@/lib/subdomain";

export async function GET(request: Request) {
  const subdomain = await getSubdomainFromRequest(request);
  // Use subdomain to fetch user-specific data
}
```

## 📖 Documentation

- **Full Setup Guide**: See `CLOUDPANEL_SETUP_GUIDE.md`
- **Command Reference**: See `QUICK_COMMANDS.md`
- **Nginx Config**: See `nginx-cloudpanel-wildcard.conf` (with comments)

## ⚠️ Important Notes

1. **Placeholders**: Never modify `{{ssl_certificate}}`, `{{ssl_certificate_key}}`, `{{app_port}}`, `{{root}}` - CloudPanel replaces these automatically

2. **DNS First**: Set up wildcard DNS record before requesting SSL certificate

3. **DNS Challenge**: Wildcard SSL certificates require DNS challenge, not HTTP challenge

4. **Testing**: Always run `sudo nginx -t` before applying changes

5. **Port**: Replace `{{app_port}}` with your actual Next.js port (typically 3000) when testing locally

## 🔧 Troubleshooting

### SSL Not Working
- Verify wildcard DNS record exists
- Check certificate includes `*.helppages.ai`
- Ensure DNS challenge was completed

### 502 Bad Gateway
- Verify Next.js app is running: `sudo netstat -tlnp | grep {{app_port}}`
- Check `{{app_port}}` is correct in CloudPanel
- Review Next.js application logs

### Subdomains Not Resolving
- Test DNS: `dig user1.helppages.ai`
- Verify wildcard A record is configured
- Check DNS propagation: `nslookup *.helppages.ai`

### WebSocket Issues
- Verify `proxy_set_header Upgrade` and `Connection` are in config
- Check Next.js HMR configuration
- Test WebSocket connection manually

## 📞 Support

For issues:
1. Check Nginx error logs: `sudo tail -f /var/log/nginx/helppages-error.log`
2. Check Next.js application logs
3. Verify DNS resolution
4. Test SSL certificate validity

## ✅ Verification Checklist

- [ ] DNS wildcard A record configured
- [ ] SSL certificate obtained (wildcard)
- [ ] Nginx configuration pasted into CloudPanel
- [ ] Configuration tested: `sudo nginx -t`
- [ ] Nginx reloaded successfully
- [ ] HTTP redirects to HTTPS
- [ ] Main domain accessible: `https://helppages.ai`
- [ ] Subdomain accessible: `https://user1.helppages.ai`
- [ ] Next.js middleware updated
- [ ] Subdomain detection working in app

---

**Ready to deploy!** Follow the steps above and your SaaS application will be serving users via their custom subdomains. 🚀

