# Subdomain-Based CMS System Guide

This guide explains how the subdomain system works for your SaaS CMS application.

## 🎯 Overview

When users sign up, they automatically get their own subdomain where they can access their CMS. For example:
- User signs up with username `johndoe`
- They can access their CMS at: `https://johndoe.helppages.ai`
- The subdomain automatically routes to their personal CMS dashboard

## 🔄 How It Works

### 1. User Signup Flow

1. **User signs up** with username, email, and password
2. **Username validation** ensures it's subdomain-compatible (letters, numbers, hyphens, underscores)
3. **Account created** in database
4. **Auto-redirect** to `https://{username}.helppages.ai/cms`

### 2. Subdomain Detection (Middleware)

The `middleware.ts` file:
- Extracts subdomain from `Host` header (e.g., `johndoe.helppages.ai` → `johndoe`)
- Adds `x-subdomain` header to all requests
- Routes root path (`/`) on subdomain to `/cms`
- Preserves subdomain context throughout the app

### 3. CMS Access Control

The `SubdomainGuard` component:
- Checks if user is authenticated
- Verifies subdomain matches logged-in user's username
- Redirects to correct subdomain if mismatch
- Redirects to login if not authenticated (preserving subdomain)

### 4. Authentication Flow

**On Main Domain (`helppages.ai`):**
- Users can sign up at `/auth/signup`
- Users can log in at `/auth/login`
- After login, redirects to their subdomain CMS

**On Subdomain (`username.helppages.ai`):**
- Users can log in at `/auth/login`
- After login, stays on their subdomain
- CMS is accessible at `/cms` or root `/`

## 📁 Key Files

### `middleware.ts`
- Detects subdomain from hostname
- Adds subdomain to request headers
- Routes subdomain root to `/cms`

### `lib/subdomain.ts`
Utility functions:
- `getSubdomain()` - Get subdomain in server components
- `getSubdomainFromRequest()` - Get subdomain in API routes
- `getUserFromSubdomain()` - Find user by subdomain
- `getSubdomainUrl()` - Generate subdomain URL for a username

### `app/cms/subdomain-guard.tsx`
- Protects CMS routes
- Ensures user is authenticated
- Verifies subdomain matches username

### `app/api/auth/signup/route.ts`
- Creates user account
- Returns subdomain URL in response
- Username becomes the subdomain

### `app/auth/signup/page.tsx`
- Handles signup form
- Redirects to user's subdomain after signup

## 🔐 Security Features

1. **Subdomain Validation**
   - Only authenticated users can access their subdomain CMS
   - Subdomain must match logged-in user's username
   - Automatic redirect to correct subdomain if mismatch

2. **Username Restrictions**
   - Only alphanumeric, hyphens, and underscores allowed
   - Prevents invalid subdomain characters
   - 3-30 character length limit

3. **Authentication Required**
   - CMS routes require authentication
   - Unauthenticated users redirected to login
   - Login preserves subdomain context

## 🚀 User Experience Flow

### New User Signup

```
1. User visits: helppages.ai/auth/signup
2. User enters: username="johndoe", email, password
3. Account created
4. Auto-login
5. Redirected to: johndoe.helppages.ai/cms
6. User sees their personal CMS dashboard
```

### Existing User Login

**Option A: Login on main domain**
```
1. User visits: helppages.ai/auth/login
2. User logs in
3. Redirected to: {username}.helppages.ai/cms
```

**Option B: Login on subdomain**
```
1. User visits: johndoe.helppages.ai/auth/login
2. User logs in
3. Stays on: johndoe.helppages.ai/cms
```

### Direct Subdomain Access

```
1. User visits: johndoe.helppages.ai
2. If not authenticated → Redirected to login
3. If authenticated but wrong subdomain → Redirected to correct subdomain
4. If authenticated and correct subdomain → CMS loads
```

## 🛠️ Implementation Details

### Subdomain Extraction

```typescript
// From hostname: "johndoe.helppages.ai"
const parts = hostname.split(".");
const subdomain = parts[0]; // "johndoe"
```

### Header Injection

```typescript
// Middleware adds to all requests
requestHeaders.set("x-subdomain", subdomain);
requestHeaders.set("x-hostname", hostname);
```

### Server Component Usage

```typescript
import { getSubdomain } from "@/lib/subdomain";

export default async function Page() {
  const subdomain = await getSubdomain();
  // subdomain = "johndoe" or null for main domain
}
```

### API Route Usage

```typescript
import { getSubdomainFromRequest } from "@/lib/subdomain";

export async function GET(request: Request) {
  const subdomain = await getSubdomainFromRequest(request);
  // Use subdomain to fetch user-specific data
}
```

## 🔧 Configuration

### Environment Variables

```env
# Main domain (used in subdomain URL generation)
NEXT_PUBLIC_DOMAIN=helppages.ai

# Or use default in code
```

### Nginx Configuration

The Nginx config (`nginx-cloudpanel-wildcard.conf`) handles:
- Wildcard subdomain routing (`*.helppages.ai`)
- SSL certificate for all subdomains
- Proxy to Next.js application

## 📝 Usage Examples

### Get Current Subdomain

```typescript
// In server component
import { getSubdomain } from "@/lib/subdomain";

export default async function Page() {
  const subdomain = await getSubdomain();
  
  if (subdomain) {
    // User is on their subdomain
    console.log(`Current subdomain: ${subdomain}`);
  } else {
    // User is on main domain
    console.log("On main domain");
  }
}
```

### Generate Subdomain URL

```typescript
import { getSubdomainUrl } from "@/lib/subdomain";

// Generate URL for a user
const url = getSubdomainUrl("johndoe", "/cms");
// Returns: "https://johndoe.helppages.ai/cms"
```

### Check if User Matches Subdomain

```typescript
import { getSubdomain } from "@/lib/subdomain";
import { getProfile } from "@/lib/auth";

export default async function Page() {
  const subdomain = await getSubdomain();
  const profile = await getProfile();
  
  if (subdomain && profile && subdomain === profile.username) {
    // User is on their own subdomain
    return <div>Welcome to your CMS!</div>;
  }
}
```

## 🐛 Troubleshooting

### Subdomain Not Detected

- Check Nginx configuration includes wildcard subdomain
- Verify DNS wildcard record is set (`*.helppages.ai`)
- Check middleware is running (check logs)

### Wrong Subdomain Redirect

- Verify user's username matches subdomain
- Check authentication is working
- Ensure `SubdomainGuard` is wrapping CMS pages

### Login Not Preserving Subdomain

- Check login redirect logic
- Verify `x-subdomain` header is being passed
- Ensure middleware is adding headers correctly

## ✅ Testing Checklist

- [ ] Sign up creates account with username
- [ ] After signup, redirects to `{username}.helppages.ai/cms`
- [ ] Subdomain root (`username.helppages.ai/`) routes to `/cms`
- [ ] Login on main domain redirects to user's subdomain
- [ ] Login on subdomain stays on subdomain
- [ ] Unauthenticated subdomain access redirects to login
- [ ] Wrong subdomain redirects to correct subdomain
- [ ] CMS only accessible on user's own subdomain

## 🚀 Next Steps

1. **Custom Domain Support** (Future)
   - Allow users to connect custom domains
   - Map custom domain to user's subdomain

2. **Subdomain Validation** (Future)
   - Check if subdomain is available before signup
   - Prevent reserved subdomains (www, api, admin, etc.)

3. **Public Documentation** (Current)
   - Users can publish docs at `username.helppages.ai/docs`
   - Public pages accessible without authentication

---

**Your subdomain-based CMS system is now fully functional!** 🎉

Users can sign up and immediately access their CMS at their personalized subdomain.

