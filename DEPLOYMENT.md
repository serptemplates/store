# Deployment Guide for apps.serp.co

## Build Output
The store app has been successfully built and is ready for deployment. The build generated:
- 102 static pages (all product pages)
- 3 API routes for checkout functionality
- Optimized JavaScript bundles (~143 KB per page)

## Deployment to apps.serp.co

### Option 1: Vercel Deployment (Recommended)
1. Push your changes to GitHub:
```bash
git add .
git commit -m "Ready for deployment to apps.serp.co"
git push origin main
```

2. In Vercel Dashboard:
   - Import the repository
   - Set root directory to: `apps/store`
   - Configure environment variables:
     ```
     NEXT_PUBLIC_CHECKOUT_URL=https://apps.serp.co/api/checkout/session
     STRIPE_SECRET_KEY=your_stripe_secret_key
     STRIPE_WEBHOOK_SECRET=your_webhook_secret
     ```
   - Set custom domain: apps.serp.co

### Option 2: Self-hosted Deployment
1. Copy the built app to your server:
```bash
# From local machine
cd apps/store
npm run build
rsync -avz .next package.json node_modules your-server:/path/to/apps
```

2. On the server:
```bash
# Install PM2 if not already installed
npm install -g pm2

# Start the Next.js app
pm2 start npm --name "apps-serp-co" -- start
pm2 save
pm2 startup
```

3. Configure Nginx:
```nginx
server {
    listen 80;
    server_name apps.serp.co;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Cloudflare Proxy Configuration for serp.co/apps

### Step 1: DNS Configuration
1. In Cloudflare Dashboard for serp.co:
   - Add a CNAME record:
     - Name: apps
     - Target: apps.serp.co
     - Proxy status: Proxied (orange cloud ON)

### Step 2: Page Rules (if needed)
Create a page rule for serp.co/apps/* :
- Forwarding URL (301): https://apps.serp.co/$1

### Step 3: Alternative - Worker Route
If you want the URL to remain serp.co/apps:

1. Create a Cloudflare Worker:
```javascript
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)

  // If path starts with /apps, proxy to apps.serp.co
  if (url.pathname.startsWith('/apps')) {
    const newUrl = url.pathname.replace('/apps', '')
    return fetch(`https://apps.serp.co${newUrl}`, request)
  }

  // Otherwise, pass through
  return fetch(request)
}
```

2. Add Worker Route:
   - Route: serp.co/apps/*
   - Worker: your-worker-name

### Step 4: SSL/TLS Configuration
Ensure SSL/TLS encryption mode is set to "Full (strict)" in Cloudflare.

## Post-Deployment Checklist

- [ ] Verify all product pages load correctly
- [ ] Test checkout flow with Stripe
- [ ] Confirm webhook endpoints are accessible
- [ ] Check that featured images display in carousel
- [ ] Verify responsive design on mobile
- [ ] Test page load speeds
- [ ] Set up monitoring (e.g., Uptime Robot, Pingdom)
- [ ] Configure error tracking (e.g., Sentry)
- [ ] Set up analytics (e.g., Google Analytics, Plausible)

## Environment Variables Required

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_CHECKOUT_URL=https://apps.serp.co/api/checkout/session

# Optional
PRODUCTS_ROOT=data/products
```

## Monitoring URLs

After deployment, verify these endpoints:
- https://apps.serp.co (homepage)
- https://apps.serp.co/api/product (API health check)
- https://apps.serp.co/adobe-stock-downloader (example product page)

## Rollback Plan

If issues occur after deployment:
1. Revert to previous deployment in Vercel
2. Or restore previous PM2 saved configuration
3. Check error logs: `pm2 logs apps-serp-co`