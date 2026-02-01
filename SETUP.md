# HERA Frontend Setup

## Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)

## Installation

```bash
cd mindconnect-frontend
npm install
```

## Environment Configuration

### Google Maps Configuration

The app uses Google Maps for location features (address autocomplete and map previews).

1. **Get API Key from Google Cloud Console:**
   - Visit: https://console.cloud.google.com/
   - Create a new project or select existing
   - Enable these APIs:
     - Places API
     - Maps Static API
     - Maps JavaScript API (for web)
   - Go to "Credentials" and create an API Key
   - Restrict the key (recommended):
     - Application restrictions: HTTP referrers or app bundle ID
     - API restrictions: Only the APIs listed above

2. **Copy environment template:**
   ```bash
   cp .env.example .env
   ```

3. **Add your actual API key to `.env`:**
   ```bash
   EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSy...your_actual_key
   ```

4. **Restart Expo (required after changing .env):**
   ```bash
   npx expo start --clear
   ```

## Running the App

### Development

```bash
# Start Expo development server
npx expo start

# Run on specific platform
npx expo start --ios
npx expo start --android
npx expo start --web
```

### After Environment Changes

Always restart with cache clear after modifying `.env`:
```bash
npx expo start --clear
```

## Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps API key for location features | Yes (for maps) |

## Security Notes

- **Never commit `.env`** - it's in `.gitignore`
- Use `.env.example` as a template (this IS committed)
- API keys are visible in client bundles - always restrict them in Google Console
- For production, set environment variables in your build/deployment system

## Troubleshooting

### Maps not loading / "Mapa no disponible"

1. Check that `.env` file exists with your API key
2. Verify the API key is correct (no extra spaces)
3. Restart Expo with `npx expo start --clear`
4. Check Google Cloud Console that APIs are enabled
5. Check API key restrictions aren't blocking your domain/app

### Address autocomplete not working

1. Same steps as above
2. Additionally verify Places API is enabled
3. Check browser console for API errors

### Verify environment variable is loaded

Add this temporarily to any component:
```typescript
console.log('API Key loaded:', !!process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY);
```
