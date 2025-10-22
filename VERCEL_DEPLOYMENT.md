# Vercel Deployment Guide - MindConnect Frontend

**Last Updated:** October 22, 2025
**Backend URL:** https://web-production-d125.up.railway.app/api

## Overview

This guide covers deploying the MindConnect React Native/Expo web application to Vercel. The frontend will connect to the backend deployed on Railway.

## Prerequisites

- Backend deployed to Railway: https://web-production-d125.up.railway.app
- Git repository pushed to GitHub
- Vercel account (free tier works fine)

## What Was Configured

### 1. API Configuration (`src/config/api.ts`)

Environment-based API URL switching:
```typescript
const ENV = {
  dev: {
    apiUrl: 'http://localhost:3000/api',  // Development
  },
  prod: {
    apiUrl: 'https://web-production-d125.up.railway.app/api',  // Production
  },
};
```

### 2. Updated Files

**src/services/api.ts**
- Uses environment-based config instead of hardcoded localhost
- Automatically switches between dev and production APIs

**app.json**
- Added web configuration with Metro bundler
```json
"web": {
  "favicon": "./assets/favicon.png",
  "bundler": "metro"
}
```

**package.json**
- Added build scripts:
```json
"scripts": {
  "build:web": "expo export --platform web",
  "vercel-build": "expo export --platform web"
}
```

**vercel.json**
- Vercel deployment configuration
```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": { "distDir": "dist" }
    }
  ]
}
```

**.gitignore**
- Added `.vercel` to ignore Vercel CLI files
- Already ignores `dist/` and `web-build/`

## Deployment Options

### Option 1: Deploy via Vercel Dashboard (Recommended)

1. **Go to Vercel**
   - Visit https://vercel.com
   - Sign in with your GitHub account

2. **Import Project**
   - Click "Add New..." → "Project"
   - Select your GitHub repository: `mindconnect-frontend`
   - Click "Import"

3. **Configure Project**
   - **Framework Preset**: Other
   - **Root Directory**: `./` (leave as default)
   - **Build Command**: `npm run vercel-build` (or leave default, vercel-build script will be detected)
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

4. **Environment Variables**
   - You don't need to set any environment variables
   - The NODE_ENV will be set to "production" automatically by Vercel

5. **Deploy**
   - Click "Deploy"
   - Wait 2-3 minutes for build to complete
   - You'll get a URL like: `https://mindconnect-frontend.vercel.app`

### Option 2: Deploy via Vercel CLI

```bash
# Install Vercel CLI globally
npm install -g vercel

# Navigate to frontend directory
cd mindconnect-frontend

# Login to Vercel
vercel login

# Deploy to production
vercel --prod

# Follow the prompts:
# ? Set up and deploy "mindconnect-frontend"? [Y/n] Y
# ? Which scope do you want to deploy to? [Your Account]
# ? Link to existing project? [y/N] N
# ? What's your project's name? mindconnect-frontend
# ? In which directory is your code located? ./
```

## Verify Deployment

After deployment, test these endpoints:

### 1. Check App Loads
```
https://your-app.vercel.app
```
Should show the MindConnect login screen.

### 2. Test API Connection
Open browser console (F12) and look for:
```
API Request: POST /auth/login
```

This confirms the app is connecting to Railway backend.

### 3. Test Authentication
Try logging in with test account:
- **Email**: maria.garcia@example.com
- **Password**: password123

Should successfully authenticate via Railway backend.

## Environment-Based Behavior

### Development (localhost)
```bash
npm start
# or
npm run web
```
- Uses `http://localhost:3000/api`
- Requires backend running locally on port 3000

### Production (Vercel)
```
NODE_ENV=production (set automatically by Vercel)
```
- Uses `https://web-production-d125.up.railway.app/api`
- Connects to Railway backend

## Troubleshooting

### Issue 1: Build Fails with "expo-router" Error

**Symptom:**
```
Error: Unable to resolve module expo-router/node/render.js
```

**Solution:**
Ensure `app.json` does NOT have `"output": "static"`:
```json
"web": {
  "favicon": "./assets/favicon.png",
  "bundler": "metro"
  // No "output": "static"
}
```

### Issue 2: API Requests Failing (CORS)

**Symptom:**
```
Access to fetch at 'https://web-production-d125.up.railway.app/api/auth/login'
from origin 'https://mindconnect.vercel.app' has been blocked by CORS policy
```

**Solution:**
Update backend CORS configuration in `src/index.ts`:
```typescript
app.use(cors({
  origin: [
    'https://your-app.vercel.app',
    'https://www.your-app.vercel.app'
  ],
  credentials: true
}));
```

### Issue 3: Assets Not Loading

**Symptom:**
Icons or images don't load.

**Solution:**
Check that assets are in correct paths:
- `./assets/favicon.png`
- `./assets/icon.png`
- `./assets/splash-icon.png`

### Issue 4: Environment Not Detected Correctly

**Symptom:**
Production app still using localhost API.

**Solution:**
Verify `src/config/api.ts`:
```typescript
const __DEV__ = process.env.NODE_ENV !== 'production';
```

Vercel sets `NODE_ENV=production` automatically.

## Continuous Deployment

Vercel automatically redeploys when you push to GitHub:

```bash
# Make changes to code
git add .
git commit -m "Update frontend"
git push origin main

# Vercel automatically:
# 1. Detects push
# 2. Builds the app
# 3. Deploys to production
# 4. Updates live site (2-3 minutes)
```

## Custom Domain (Optional)

### Add Custom Domain in Vercel Dashboard

1. Go to Project Settings → Domains
2. Add your domain: `mindconnect.com`
3. Follow DNS configuration instructions
4. Update backend CORS to include your domain

## Performance Optimization

### 1. Enable Compression
Vercel automatically compresses responses.

### 2. Asset Optimization
All fonts and images are optimized during build.

### 3. Code Splitting
Metro bundler automatically splits code for optimal loading.

## Monitoring

### View Deployment Logs

**Via Dashboard:**
1. Go to Vercel Dashboard
2. Select your project
3. Click "Deployments"
4. Click on a deployment to view logs

**Via CLI:**
```bash
vercel logs
```

### Analytics (Optional)

Enable Vercel Analytics:
1. Go to Project Settings → Analytics
2. Enable Analytics
3. View real-time user metrics

## Security Considerations

### 1. Environment Variables
No sensitive data in frontend code - all secrets are backend-only.

### 2. CORS Configuration
Ensure backend only accepts requests from your Vercel domain:
```typescript
origin: [
  'https://mindconnect.vercel.app',
  'https://www.mindconnect.vercel.app'
]
```

### 3. HTTPS
Vercel provides automatic HTTPS for all deployments.

## Build Output

After successful build, you'll see:

```
✅ Web Bundled (995 modules)
✅ 42 Assets (fonts, icons)
✅ 1 Web bundle (1.88 MB)
✅ Exported to: dist/
```

**Files in dist/:**
- `index.html` - Main HTML file
- `_expo/static/js/web/` - JavaScript bundles
- `favicon.ico` - Favicon
- `metadata.json` - App metadata
- All font and icon assets

## Testing Production Build Locally

Before deploying, test the production build:

```bash
# Build for production
npm run build:web

# Serve the dist folder (requires serve package)
npx serve dist

# Open in browser
# http://localhost:3000
```

This allows you to verify:
- App loads correctly
- Assets load properly
- API connects to Railway backend
- Authentication works

## Deployment Checklist

Before deploying:

- [ ] Backend deployed to Railway and accessible
- [ ] Railway backend URL correct in `src/config/api.ts`
- [ ] Web build succeeds locally (`npm run build:web`)
- [ ] Test production build locally (`npx serve dist`)
- [ ] Git repository pushed to GitHub
- [ ] Vercel account created and linked to GitHub

During deployment:

- [ ] Framework preset: Other
- [ ] Output directory: `dist`
- [ ] Build command: `npm run vercel-build`
- [ ] No environment variables needed

After deployment:

- [ ] App loads at Vercel URL
- [ ] Login screen appears
- [ ] Can authenticate with test account
- [ ] Backend API calls work
- [ ] No CORS errors in console

## Update Backend CORS for Production

Once you have your Vercel URL, update backend CORS:

**mindconnect-backend/src/index.ts:**
```typescript
app.use(cors({
  origin: NODE_ENV === 'production'
    ? [
        'https://mindconnect-frontend.vercel.app',  // Replace with your Vercel URL
        'https://www.mindconnect-frontend.vercel.app'
      ]
    : ['http://localhost:8081', 'http://localhost:3000', 'http://localhost:19006'],
  credentials: true
}));
```

Then redeploy backend:
```bash
cd mindconnect-backend
git add .
git commit -m "Update CORS for Vercel frontend"
git push origin main

# Railway auto-deploys
```

## API Endpoints Available

Your deployed app will call these Railway endpoints:

**Authentication:**
- POST `/api/auth/register` - Register new user
- POST `/api/auth/login` - Login user
- GET `/api/auth/me` - Get current user

**Specialists:**
- GET `/api/specialists` - List all specialists
- GET `/api/specialists/:id` - Get specialist details

**Matching:**
- POST `/api/matching/find-matches` - Find specialist matches

**Sessions:**
- GET `/api/sessions` - Get user sessions
- POST `/api/sessions` - Create new session

**Health Check:**
- GET `/health` - Backend health status

## Next Steps

After successful deployment:

1. **Test All Features**
   - User registration
   - User login
   - Specialist matching
   - Session booking

2. **Monitor Performance**
   - Check Vercel Analytics
   - Review backend Railway logs

3. **Configure Custom Domain** (optional)
   - Add domain in Vercel
   - Update DNS records
   - Update backend CORS

4. **Enable Error Tracking** (optional)
   - Add Sentry for error monitoring
   - Configure in both frontend and backend

## Support & Resources

- **Vercel Docs**: https://vercel.com/docs
- **Expo Web Docs**: https://docs.expo.dev/workflow/web/
- **Railway Docs**: https://docs.railway.app
- **Project README**: See main README.md

## Summary

Your MindConnect frontend is now:
- ✅ Built for web deployment
- ✅ Configured for environment-based API switching
- ✅ Connected to Railway backend
- ✅ Ready for Vercel deployment
- ✅ Set up for continuous deployment via Git

**Deployment URL:** Get from Vercel after deployment
**Backend API:** https://web-production-d125.up.railway.app/api

---

**Status:** ✅ Ready for Deployment
**Estimated Deployment Time:** 2-3 minutes
