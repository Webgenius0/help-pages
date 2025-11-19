# CloudPanel Nginx Configuration Guide for Wildcard Subdomains

This guide will help you configure Nginx in CloudPanel to support wildcard subdomains (`*.helppages.ai`) for your Next.js SaaS application.

## 📋 Prerequisites

- CloudPanel installed and running
- Domain `helppages.ai` pointing to your server
- DNS wildcard record `*.helppages.ai` pointing to your server IP
- Next.js application running on `127.0.0.1:{{app_port}}`

## 🔧 Step 1: Configure DNS Wildcard Record

Before setting up SSL, ensure your DNS has a wildcard A record:

```
Type: A
Name: *
Value: YOUR_SERVER_IP
TTL: 3600 (or your preference)
```

This allows any subdomain (e.g., `user1.helppages.ai`, `user2.helppages.ai`) to resolve to your server.

## 🔐 Step 2: Set Up Wildcard SSL Certificate via Let's Encrypt

### Option A: Using CloudPanel UI (Recommended)

1. **Log into CloudPanel**
   - Navigate to your site's SSL settings

2. **Request Wildcard Certificate**
   - Go to: **Sites** → Select your site → **SSL/TLS**
   - Click **"Let's Encrypt"**
   - Enter domain: `*.helppages.ai,helppages.ai`
   - Select **"DNS Challenge"** (required for wildcard certificates)
   - Follow the DNS challenge instructions to add TXT records to your DNS
   - Complete the verification

3. **Verify Certificate**
   - The certificate should cover both `helppages.ai` and `*.helppages.ai`

### Option B: Using Certbot via SSH (Alternative)

If CloudPanel doesn't support wildcard certificates directly, use Certbot:

```bash
# Install certbot if not already installed
sudo apt update
sudo apt install certbot python3-certbot-nginx -y

# Request wildcard certificate (DNS challenge required)
sudo certbot certonly --manual --preferred-challenges dns \
  -d "*.helppages.ai" -d "helppages.ai" \
  --email your-email@example.com \
  --agree-tos \
  --manual-public-ip-logging-ok

# Follow the prompts to add DNS TXT records
# After verification, certificates will be saved to:
# /etc/letsencrypt/live/helppages.ai/fullchain.pem
# /etc/letsencrypt/live/helppages.ai/privkey.pem
```

## 📝 Step 3: Update Nginx Configuration in CloudPanel

1. **Access Vhost Editor**
   - Log into CloudPanel
   - Navigate to: **Sites** → Select your site → **Vhost Editor**

2. **Replace Configuration**
   - Copy the entire contents of `nginx-cloudpanel-wildcard.conf`
   - Paste into the Vhost Editor
   - **Important**: Keep CloudPanel placeholders (`{{ssl_certificate}}`, `{{ssl_certificate_key}}`, `{{app_port}}`, `{{root}}`) as they are

3. **Verify Placeholders**
   - CloudPanel will automatically replace:
     - `{{ssl_certificate}}` → Path to SSL certificate
     - `{{ssl_certificate_key}}` → Path to SSL private key
     - `{{app_port}}` → Your Next.js application port
     - `{{root}}` → Document root directory

## ✅ Step 4: Test and Apply Configuration

### Test Nginx Configuration

```bash
# Test Nginx configuration syntax
sudo nginx -t

# If successful, you should see:
# nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### If Test Fails

```bash
# Check Nginx error logs for details
sudo tail -f /var/log/nginx/error.log

# Common issues:
# - Missing SSL certificate files
# - Incorrect placeholder values
# - Syntax errors
```

### Reload Nginx (Safe - No Downtime)

```bash
# Reload Nginx configuration (graceful reload)
sudo systemctl reload nginx

# OR use CloudPanel's reload button in the UI
```

### Restart Nginx (If Reload Doesn't Work)

```bash
# Full restart (brief downtime)
sudo systemctl restart nginx

# Check status
sudo systemctl status nginx
```

## 🧪 Step 5: Verify Configuration

### Test HTTP to HTTPS Redirect

```bash
# Test redirect (should return 301)
curl -I http://helppages.ai
curl -I http://user1.helppages.ai
```

### Test HTTPS Access

```bash
# Test main domain
curl -I https://helppages.ai

# Test subdomain
curl -I https://user1.helppages.ai

# Test SSL certificate
openssl s_client -connect helppages.ai:443 -servername helppages.ai
```

### Test from Browser

1. Visit `http://helppages.ai` → Should redirect to `https://helppages.ai`
2. Visit `http://user1.helppages.ai` → Should redirect to `https://user1.helppages.ai`
3. Check SSL certificate in browser (should show valid wildcard cert)

## 🔄 Step 6: Configure Next.js to Detect Subdomains

Your Next.js application needs to detect which subdomain is being accessed. Here's how to implement it:

### Update `middleware.ts`

```typescript
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get("host") || "";
  
  // Extract subdomain from hostname
  // e.g., "user1.helppages.ai" → "user1"
  const subdomain = hostname.split(".")[0];
  
  // Skip subdomain extraction for main domain
  const isMainDomain = hostname === "helppages.ai" || hostname === "www.helppages.ai";
  
  // If accessing a subdomain, you can:
  // 1. Redirect to /u/[username] route
  // 2. Add custom header for subdomain detection
  // 3. Rewrite to internal route
  
  if (!isMainDomain && subdomain && subdomain !== "www") {
    // Option 1: Add subdomain to headers for server components
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-subdomain", subdomain);
    
    // Option 2: Rewrite to /u/[subdomain] route
    // const url = request.nextUrl.clone();
    // url.pathname = `/u/${subdomain}${pathname}`;
    // return NextResponse.rewrite(url);
    
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }
  
  // Existing redirects
  if (pathname.startsWith("/dashboard")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace("/dashboard", "/cms");
    return NextResponse.redirect(url);
  }
  
  if (pathname.includes("/cms/all-courses")) {
    const url = request.nextUrl.clone();
    url.pathname = "/cms";
    return NextResponse.redirect(url);
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
```

### Create Subdomain Detection Utility

Create `lib/subdomain.ts`:

```typescript
import { headers } from "next/headers";

export async function getSubdomain(): Promise<string | null> {
  const headersList = await headers();
  const hostname = headersList.get("host") || "";
  const subdomain = hostname.split(".")[0];
  
  // Check if it's the main domain
  if (hostname === "helppages.ai" || hostname === "www.helppages.ai") {
    return null;
  }
  
  return subdomain || null;
}

export async function getSubdomainFromRequest(request: Request): Promise<string | null> {
  const hostname = request.headers.get("host") || "";
  const subdomain = hostname.split(".")[0];
  
  if (hostname === "helppages.ai" || hostname === "www.helppages.ai") {
    return null;
  }
  
  return subdomain || null;
}
```

### Use Subdomain in Server Components

```typescript
// Example: app/page.tsx or app/docs/page.tsx
import { getSubdomain } from "@/lib/subdomain";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const subdomain = await getSubdomain();
  
  if (subdomain) {
    // Find user by username matching subdomain
    const user = await prisma.user.findUnique({
      where: { username: subdomain },
    });
    
    if (user && user.isPublic) {
      // Redirect to user's docs or show user-specific content
      redirect(`/u/${subdomain}`);
    } else {
      // User not found or not public
      return <div>Subdomain not found</div>;
    }
  }
  
  // Main domain - show default homepage
  return <div>Welcome to HelpPages</div>;
}
```

### Use Subdomain in API Routes

```typescript
// Example: app/api/docs/route.ts
import { NextRequest } from "next/server";
import { getSubdomainFromRequest } from "@/lib/subdomain";

export async function GET(request: NextRequest) {
  const subdomain = await getSubdomainFromRequest(request);
  
  if (!subdomain) {
    return Response.json({ error: "Subdomain required" }, { status: 400 });
  }
  
  // Fetch docs for this subdomain/user
  // ...
}
```

## 🔍 Troubleshooting

### Issue: SSL Certificate Not Working for Subdomains

**Solution:**
- Verify wildcard certificate includes `*.helppages.ai`
- Check certificate: `openssl x509 -in /path/to/cert.pem -text -noout | grep DNS`
- Ensure DNS wildcard record is properly configured

### Issue: Subdomains Not Resolving

**Solution:**
```bash
# Test DNS resolution
dig user1.helppages.ai
nslookup user1.helppages.ai

# Verify wildcard DNS record exists
dig *.helppages.ai
```

### Issue: 502 Bad Gateway

**Solution:**
- Check if Next.js app is running: `sudo netstat -tlnp | grep {{app_port}}`
- Check Next.js logs
- Verify `{{app_port}}` placeholder is correct in CloudPanel

### Issue: WebSocket Not Working

**Solution:**
- Verify `proxy_set_header Upgrade` and `proxy_set_header Connection` are present
- Check Next.js HMR configuration
- Test WebSocket connection manually

## 📊 Monitoring

### Check Nginx Access Logs

```bash
# Real-time access logs
sudo tail -f /var/log/nginx/helppages-access.log

# Filter by subdomain
sudo grep "user1.helppages.ai" /var/log/nginx/helppages-access.log
```

### Check Nginx Error Logs

```bash
# Real-time error logs
sudo tail -f /var/log/nginx/helppages-error.log
```

### Monitor SSL Certificate Expiry

```bash
# Check certificate expiry date
sudo openssl x509 -in {{ssl_certificate}} -noout -dates

# Set up auto-renewal (usually handled by CloudPanel/Certbot)
sudo certbot renew --dry-run
```

## 🔄 Auto-Renewal Setup

CloudPanel typically handles SSL renewal automatically. If not:

```bash
# Test renewal
sudo certbot renew --dry-run

# Add to crontab for auto-renewal (if not already configured)
sudo crontab -e
# Add: 0 0 * * * certbot renew --quiet --nginx
```

## 📝 Configuration Summary

The Nginx configuration includes:

✅ **Wildcard subdomain support** (`*.helppages.ai`)  
✅ **HTTP to HTTPS redirect**  
✅ **SSL/TLS security headers**  
✅ **WebSocket support** for Next.js HMR  
✅ **Static file optimization**  
✅ **Proper proxy headers** for Next.js  
✅ **Let's Encrypt ACME challenge** support  
✅ **CloudPanel placeholder compatibility**

## 🚀 Next Steps

1. ✅ DNS wildcard record configured
2. ✅ SSL certificate obtained
3. ✅ Nginx configuration updated
4. ✅ Next.js middleware updated for subdomain detection
5. ✅ Test subdomain access
6. ✅ Monitor logs for issues

Your SaaS application is now ready to serve multiple users via their custom subdomains!

