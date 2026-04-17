import { Platform } from 'react-native';

export const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

let googleMapsLoadPromise: Promise<typeof google.maps> | null = null;

const GOOGLE_MAPS_SCRIPT_ID = 'hera-google-maps-sdk';
const GOOGLE_MAPS_SCRIPT_BASE_URL = 'https://maps.googleapis.com/maps/api/js';

const waitForGoogleMaps = (): Promise<typeof google.maps> =>
  new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const timeoutMs = 10000;

    const checkGoogleMaps = () => {
      if (window.google?.maps) {
        resolve(window.google.maps);
        return;
      }

      if (Date.now() - startedAt >= timeoutMs) {
        reject(new Error('Google Maps SDK did not become ready in time'));
        return;
      }

      window.setTimeout(checkGoogleMaps, 50);
    };

    checkGoogleMaps();
  });

const waitForPlacesLibrary = (): Promise<google.maps.PlacesLibrary> =>
  new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const timeoutMs = 10000;

    const checkPlacesLibrary = () => {
      const placesNamespace = window.google?.maps?.places;
      if (placesNamespace?.AutocompleteSuggestion && placesNamespace.Place) {
        resolve(placesNamespace as unknown as google.maps.PlacesLibrary);
        return;
      }

      if (Date.now() - startedAt >= timeoutMs) {
        reject(new Error('Google Maps Places library did not become ready in time'));
        return;
      }

      window.setTimeout(checkPlacesLibrary, 50);
    };

    checkPlacesLibrary();
  });

export const loadGoogleMaps = async (): Promise<typeof google.maps> => {
  if (Platform.OS !== 'web') {
    throw new Error('Google Maps SDK is only available on web');
  }

  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error('Missing Google Maps API key');
  }

  if (window.google?.maps) {
    return window.google.maps;
  }

  if (googleMapsLoadPromise) {
    return googleMapsLoadPromise;
  }

  googleMapsLoadPromise = new Promise((resolve, reject) => {
    const existingScript = document.getElementById(GOOGLE_MAPS_SCRIPT_ID) as HTMLScriptElement | null;

    const resolveWhenReady = () => {
      void waitForGoogleMaps().then(resolve).catch(reject);
    };

    if (existingScript) {
      resolveWhenReady();
      existingScript.addEventListener('error', () => {
        reject(new Error('Failed to load Google Maps SDK'));
      }, { once: true });
      return;
    }

    const params = new URLSearchParams({
      key: GOOGLE_MAPS_API_KEY,
      language: 'es',
      libraries: 'places',
      loading: 'async',
      v: 'weekly',
    });

    const script = document.createElement('script');
    script.id = GOOGLE_MAPS_SCRIPT_ID;
    script.src = `${GOOGLE_MAPS_SCRIPT_BASE_URL}?${params.toString()}`;
    script.async = true;
    script.defer = true;
    script.onload = resolveWhenReady;
    script.onerror = () => {
      googleMapsLoadPromise = null;
      reject(new Error('Failed to load Google Maps SDK'));
    };

    document.head.appendChild(script);
  });

  return googleMapsLoadPromise;
};

export const loadGoogleMapsPlacesLibrary = async (): Promise<google.maps.PlacesLibrary> => {
  await loadGoogleMaps();
  return waitForPlacesLibrary();
};
