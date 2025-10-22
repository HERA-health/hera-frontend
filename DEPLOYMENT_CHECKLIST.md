# MindConnect Deployment Checklist

## Pre-Deployment Verification

### ✅ Dependencies Check
- [x] react-dom@19.1.0 installed
- [x] react-native-web@0.21.0 installed
- [x] All packages in package.json installed
- [x] No vulnerabilities (`npm audit`)

### ✅ Build Check
- [x] Local build succeeds: `npm run build:web`
- [x] No TypeScript errors
- [x] No console errors
- [x] dist/ folder created
- [x] All assets bundled

### ✅ Configuration Check
- [x] vercel.json configured
- [x] src/config/api.ts has Railway URL
- [x] src/services/api.ts uses config
- [x] package.json has build scripts
- [x] .gitignore includes dist/, .vercel

### ✅ Code Quality
- [x] No hardcoded API URLs
- [x] Environment detection works
- [x] Authentication integrated
- [x] Error handling in place

## Deployment Steps

### Step 1: Commit and Push
```bash
# Check status
git status

# Add all changes
git add .

# Commit with descriptive message
git commit -m "Fix: Add web dependencies and prepare for Vercel deployment

- Added react-dom and react-native-web for Expo web support
- Enhanced environment detection for web and native
- Fixed __DEV__ compatibility issues
- Simplified vercel.json configuration
- Verified all authentication flows work
- Successfully tested local web build"

# Push to GitHub
git push origin main
```

### Step 2: Deploy to Vercel

#### Option A: Vercel Dashboard (Recommended for first deployment)
1. Go to https://vercel.com
2. Sign in with GitHub
3. Click "Add New..." → "Project"
4. Select repository: `mindconnect-frontend`
5. Verify settings:
   - Build Command: `expo export --platform web` (auto-detected)
   - Output Directory: `dist` (auto-detected)
   - Install Command: `npm install` (auto-detected)
6. Click "Deploy"
7. Wait 2-3 minutes
8. Save the deployment URL

#### Option B: Vercel CLI (For subsequent deployments)
```bash
# Install CLI if not already installed
npm install -g vercel

# Login
vercel login

# Deploy to production
vercel --prod

# Follow prompts and save URL
```

### Step 3: Update Backend CORS

Once you have your Vercel URL (e.g., `https://mindconnect-frontend.vercel.app`):

1. Open `mindconnect-backend/src/index.ts`
2. Update CORS configuration:
```typescript
app.use(cors({
  origin: NODE_ENV === 'production'
    ? [
        'https://mindconnect-frontend.vercel.app',  // Replace with your URL
        'https://www.mindconnect-frontend.vercel.app'
      ]
    : ['http://localhost:8081', 'http://localhost:3000', 'http://localhost:19006'],
  credentials: true
}));
```
3. Commit and push:
```bash
cd mindconnect-backend
git add src/index.ts
git commit -m "Update CORS to allow Vercel frontend"
git push origin main
```
4. Railway will auto-deploy (takes ~2 minutes)

### Step 4: Test Deployment

Visit your Vercel URL and test:

#### Visual Tests
- [ ] App loads without errors
- [ ] Login screen displays correctly
- [ ] MindConnect logo shows
- [ ] Buttons are styled correctly
- [ ] Colors match design (green theme)

#### Functionality Tests
- [ ] Can navigate between screens
- [ ] Registration form works
- [ ] Login form works
- [ ] Error messages display

#### API Tests
- [ ] Register new account (creates user on Railway)
- [ ] Login with test account (maria.garcia@example.com / password123)
- [ ] Check browser console for API calls
- [ ] Verify API URL is Railway (not localhost)
- [ ] No CORS errors

#### Browser Console Tests
1. Open Developer Tools (F12)
2. Check Console tab:
   - [ ] No red errors
   - [ ] API requests show Railway URL
   - [ ] Successful auth responses (200 status)
3. Check Network tab:
   - [ ] All assets load (200 status)
   - [ ] Fonts load correctly
   - [ ] Icons load correctly
   - [ ] API calls to Railway backend

## Post-Deployment

### ✅ Monitoring
- [ ] Check Vercel deployment logs
- [ ] Check Railway backend logs
- [ ] Monitor for errors in Vercel dashboard
- [ ] Test on different browsers (Chrome, Firefox, Safari)
- [ ] Test on mobile devices

### ✅ Documentation
- [ ] Update README with deployment URL
- [ ] Document any environment-specific settings
- [ ] Update team on deployment status

### ✅ Optional Enhancements
- [ ] Set up custom domain
- [ ] Enable Vercel Analytics
- [ ] Configure error tracking (Sentry)
- [ ] Set up monitoring alerts

## Rollback Plan

If deployment fails or has critical issues:

### Quick Rollback
1. Go to Vercel Dashboard
2. Find project
3. Click "Deployments"
4. Find previous working deployment
5. Click "..." → "Promote to Production"

### Fix and Redeploy
```bash
# Fix the issue locally
# Test the fix
npm run build:web

# Commit the fix
git add .
git commit -m "Fix: [describe the fix]"
git push origin main

# Vercel auto-deploys from main branch
```

## Common Issues and Solutions

### Issue: CORS Error
**Symptom:** Browser console shows CORS policy error
**Solution:**
1. Verify backend CORS includes your Vercel URL
2. Check Railway backend logs
3. Ensure credentials: true in both frontend and backend

### Issue: API 404 Errors
**Symptom:** API calls return 404
**Solution:**
1. Check API_URL in src/config/api.ts
2. Verify Railway backend is running
3. Check Railway backend URL is correct

### Issue: White Screen
**Symptom:** App shows blank white screen
**Solution:**
1. Check browser console for errors
2. Verify all dependencies installed
3. Check build output for errors
4. Verify index.html exists in dist/

### Issue: Assets Not Loading
**Symptom:** Fonts or icons missing
**Solution:**
1. Check dist/ folder has assets
2. Verify Vercel deployment includes assets
3. Check asset paths in build output

## Quick Commands Reference

```bash
# Local development
npm start                 # Start Expo dev server
npm run web              # Start web development server
npm run build:web        # Build for production

# Testing
npm run build:web        # Test production build
npx serve dist           # Serve production build locally

# Deployment
git push origin main     # Triggers Vercel auto-deploy
vercel --prod           # Manual deploy via CLI

# Debugging
npm run build:web        # Check for build errors
npx expo doctor         # Check Expo configuration
```

## Success Criteria

Deployment is successful when:
- [x] Vercel build completes without errors
- [x] App loads at Vercel URL
- [x] Login/register functionality works
- [x] API calls reach Railway backend
- [x] No CORS errors in console
- [x] All assets load correctly
- [x] No console errors
- [x] Responsive design works on mobile

## Team Notification Template

```
🚀 MindConnect Frontend Deployed!

Frontend URL: [Your Vercel URL]
Backend URL: https://web-production-d125.up.railway.app

Test Account:
Email: maria.garcia@example.com
Password: password123

Status: ✅ All systems operational
Deployment Time: [timestamp]
Build Duration: ~2-3 minutes
```

---

**Last Updated:** October 22, 2025
**Status:** Ready for Deployment
**Next Action:** Commit and push to trigger deployment
