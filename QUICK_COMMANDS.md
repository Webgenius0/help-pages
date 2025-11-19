# Quick Command Reference for CloudPanel Nginx Setup

## 🔧 Essential Commands

### 1. Test Nginx Configuration
```bash
sudo nginx -t
```

### 2. Reload Nginx (No Downtime)
```bash
sudo systemctl reload nginx
```

### 3. Restart Nginx (If Reload Fails)
```bash
sudo systemctl restart nginx
```

### 4. Check Nginx Status
```bash
sudo systemctl status nginx
```

### 5. View Nginx Error Logs
```bash
# Real-time error logs
sudo tail -f /var/log/nginx/helppages-error.log

# Last 50 lines
sudo tail -n 50 /var/log/nginx/helppages-error.log
```

### 6. View Nginx Access Logs
```bash
# Real-time access logs
sudo tail -f /var/log/nginx/helppages-access.log

# Filter by subdomain
sudo grep "user1.helppages.ai" /var/log/nginx/helppages-access.log
```

## 🔐 SSL Certificate Commands

### Check Certificate Expiry
```bash
sudo openssl x509 -in /etc/letsencrypt/live/helppages.ai/fullchain.pem -noout -dates
```

### Test Certificate Renewal
```bash
sudo certbot renew --dry-run
```

### Manual Certificate Renewal
```bash
sudo certbot renew
```

## 🧪 Testing Commands

### Test HTTP Redirect
```bash
curl -I http://helppages.ai
curl -I http://user1.helppages.ai
```

### Test HTTPS Access
```bash
curl -I https://helppages.ai
curl -I https://user1.helppages.ai
```

### Test SSL Certificate
```bash
openssl s_client -connect helppages.ai:443 -servername helppages.ai
```

### Test DNS Resolution
```bash
dig user1.helppages.ai
nslookup user1.helppages.ai
dig *.helppages.ai
```

## 🔍 Troubleshooting Commands

### Check if Next.js App is Running
```bash
# Replace {{app_port}} with your actual port (e.g., 3000)
sudo netstat -tlnp | grep 3000

# Or using ss
sudo ss -tlnp | grep 3000
```

### Check Port Usage
```bash
sudo lsof -i :3000
```

### Test Proxy Connection
```bash
curl -v http://127.0.0.1:3000
```

### Check Firewall Rules
```bash
sudo ufw status
sudo iptables -L -n
```

## 📋 CloudPanel-Specific Steps

### 1. Access Vhost Editor
- Login to CloudPanel
- Navigate: **Sites** → Your Site → **Vhost Editor**

### 2. Paste Configuration
- Copy contents from `nginx-cloudpanel-wildcard.conf`
- Paste into Vhost Editor
- **DO NOT** modify placeholders: `{{ssl_certificate}}`, `{{ssl_certificate_key}}`, `{{app_port}}`, `{{root}}`

### 3. Save Configuration
- Click **Save** in CloudPanel UI
- CloudPanel will automatically test and reload Nginx

### 4. Set Up SSL in CloudPanel
- Navigate: **Sites** → Your Site → **SSL/TLS**
- Click **Let's Encrypt**
- Enter: `*.helppages.ai,helppages.ai`
- Select **DNS Challenge**
- Complete DNS verification

## 🔄 After Making Changes

1. **Save in CloudPanel Vhost Editor**
2. **Test Configuration**: `sudo nginx -t`
3. **If test passes**: Configuration auto-reloads in CloudPanel
4. **If test fails**: Check error logs and fix issues
5. **Verify**: Test a subdomain in browser

## ⚠️ Important Notes

- Always test configuration before applying: `sudo nginx -t`
- Keep CloudPanel placeholders unchanged
- DNS wildcard record must be set up before SSL
- Wildcard SSL requires DNS challenge (not HTTP challenge)
- Monitor logs after changes to catch issues early

