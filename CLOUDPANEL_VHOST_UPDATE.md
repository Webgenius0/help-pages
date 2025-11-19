# CloudPanel Vhost Editor Update Guide

## 🔄 Updating Your Existing Configuration

Your current CloudPanel Nginx configuration needs to be updated to support wildcard subdomains. Here's what changed and why.

## 📋 What Needs to Change

### Issues with Current Config

1. **First server block** redirects everything to `helppages.ai` - this breaks subdomains
2. **Second server block** doesn't include `*.helppages.ai` in server_name
3. **Missing Next.js optimizations** for static files
4. **Subdomain context lost** in redirects

### What the Updated Config Does

1. ✅ **HTTP to HTTPS redirect** preserves subdomain (`$host` instead of hardcoded domain)
2. ✅ **Wildcard subdomain support** (`*.helppages.ai` in server_name)
3. ✅ **Next.js static file optimization** (direct serving of `/_next/static/`)
4. ✅ **Proper WebSocket support** for Next.js HMR
5. ✅ **All CloudPanel placeholders preserved**

## 📝 Step-by-Step Update

### Step 1: Open Vhost Editor

1. Login to CloudPanel
2. Go to **Sites** → Your Site (`helppages.ai`)
3. Click **Vhost Editor**

### Step 2: Replace Configuration

1. **Select all** existing configuration (Ctrl+A / Cmd+A)
2. **Delete** the old configuration
3. **Copy** the entire contents of `nginx-cloudpanel-updated.conf`
4. **Paste** into Vhost Editor

### Step 3: Verify Placeholders

Make sure these CloudPanel placeholders are present (they should be):

- `{{ssl_certificate_key}}`
- `{{ssl_certificate}}`
- `{{root}}`
- `{{nginx_access_log}}`
- `{{nginx_error_log}}`
- `{{settings}}`
- `{{app_port}}`

**DO NOT modify these placeholders** - CloudPanel replaces them automatically.

### Step 4: Test Configuration

```bash
# SSH into your server
ssh root@your-server-ip

# Test Nginx configuration
sudo nginx -t
```

Expected output:

```
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### Step 5: Apply Changes

If test passes, CloudPanel will automatically reload Nginx. If not:

```bash
# Reload Nginx manually
sudo systemctl reload nginx
```

## 🔍 Key Changes Explained

### 1. HTTP Redirect (First Server Block)

**Before:**

```nginx
return 301 https://helppages.ai$request_uri;
```

**After:**

```nginx
return 301 https://$host$request_uri;
```

**Why:** `$host` preserves the subdomain, so `johndoe.helppages.ai` redirects to `https://johndoe.helppages.ai` instead of `https://helppages.ai`.

### 2. Server Name (Second Server Block)

**Before:**

```nginx
server_name helppages.ai www1.helppages.ai;
```

**After:**

```nginx
server_name helppages.ai www.helppages.ai www1.helppages.ai *.helppages.ai;
```

**Why:** Added `*.helppages.ai` to match all subdomains, and `www.helppages.ai` for consistency.

### 3. Next.js Static Files

**Added:**

```nginx
location /_next/static/ {
  alias {{root}}/.next/static/;
  expires 365d;
  add_header Cache-Control "public, immutable";
  access_log off;
}
```

**Why:** Serves Next.js static assets directly from disk, improving performance.

### 4. WebSocket Support

**Already present, but verified:**

```nginx
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "Upgrade";
```

**Why:** Required for Next.js Hot Module Replacement (HMR) and real-time features.

## ✅ Verification Checklist

After updating, test:

- [ ] Main domain works: `https://helppages.ai`
- [ ] Subdomain works: `https://johndoe.helppages.ai`
- [ ] HTTP redirects to HTTPS (preserving subdomain)
- [ ] Static files load correctly (`/_next/static/`)
- [ ] CMS accessible on subdomain
- [ ] No 502 errors
- [ ] WebSocket connections work (if using HMR)

## 🐛 Troubleshooting

### Issue: 502 Bad Gateway

**Check:**

```bash
# Verify Next.js app is running
sudo netstat -tlnp | grep {{app_port}}

# Check app logs
pm2 logs helppages
```

### Issue: Subdomains Not Working

**Check:**

```bash
# Verify DNS wildcard record
dig *.helppages.ai

# Check Nginx error logs
sudo tail -f /var/log/nginx/helppages-error.log
```

### Issue: Static Files 404

**Check:**

```bash
# Verify .next directory exists
ls -la /home/cloudpanel/htdocs/helppages.ai/.next/static/

# Check file permissions
sudo chown -R cloudpanel:cloudpanel /home/cloudpanel/htdocs/helppages.ai/.next/
```

### Issue: SSL Certificate Errors

**Check:**

```bash
# Verify certificate includes wildcard
sudo openssl x509 -in {{ssl_certificate}} -text -noout | grep DNS

# Should show: *.helppages.ai and helppages.ai
```

## 📊 Configuration Comparison

| Feature                 | Old Config  | New Config     |
| ----------------------- | ----------- | -------------- |
| Wildcard subdomains     | ❌          | ✅             |
| Subdomain redirects     | ❌ (breaks) | ✅ (preserves) |
| Next.js static files    | ❌          | ✅             |
| WebSocket support       | ✅          | ✅             |
| CloudPanel placeholders | ✅          | ✅             |

## 🔐 Security Notes

The updated configuration:

- ✅ Maintains HTTPS enforcement
- ✅ Preserves CloudPanel security settings
- ✅ Includes proper proxy headers
- ✅ Supports Let's Encrypt verification

## 🚀 After Update

Once the configuration is updated:

1. **Test subdomain access:**

   ```bash
   curl -I https://test.helppages.ai
   ```

2. **Monitor logs:**

   ```bash
   sudo tail -f /var/log/nginx/helppages-access.log
   sudo tail -f /var/log/nginx/helppages-error.log
   ```

3. **Verify Next.js app:**
   ```bash
   pm2 status
   pm2 logs helppages
   ```

---

**Your Nginx configuration is now ready for wildcard subdomains!** 🎉

Users can now access their CMS at `{username}.helppages.ai` and everything will work correctly.
