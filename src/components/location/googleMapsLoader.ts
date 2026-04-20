import { Platform } from 'react-native';

export const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

let googleMapsLoadPromise: Promise<typeof google.maps> | null = null;

const GOOGLE_MAPS_SCRIPT_ID = 'hera-google-maps-sdk';
const GOOGLE_MAPS_SCRIPT_BASE_URL = 'https://maps.googleapis.com/maps/api/js';
const GOOGLE_MAPS_CALLBACK_NAME = '__heraGoogleMapsInit';
const GOOGLE_MAPS_TIMEOUT_MS = 20000;

const waitForGoogleMaps = (timeoutMs = GOOGLE_MAPS_TIMEOUT_MS): Promise<typeof google.maps> =>
  new Promise((resolve, reject) => {
    const startedAt = Date.now();

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

const waitForPlacesLibrary = async (): Promise<google.maps.PlacesLibrary> => {
  const maps = await loadGoogleMaps();

  if (typeof maps.importLibrary === 'function') {
    const placesLibrary = await maps.importLibrary('places');
    return placesLibrary as google.maps.PlacesLibrary;
  }

  return new Promise((resolve, reject) => {
    const startedAt = Date.now();

    const checkPlacesLibrary = () => {
      const placesNamespace = window.google?.maps?.places;
      if (placesNamespace?.AutocompleteSuggestion && placesNamespace.Place) {
        resolve(placesNamespace as unknown as google.maps.PlacesLibrary);
        return;
      }

      if (Date.now() - startedAt >= GOOGLE_MAPS_TIMEOUT_MS) {
        reject(new Error('Google Maps Places library did not become ready in time'));
        return;
      }

      window.setTimeout(checkPlacesLibrary, 50);
    };

    checkPlacesLibrary();
  });
};

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
    let settled = false;

    const settleWithError = (error: Error) => {
      if (settled) {
        return;
      }

      settled = true;
      googleMapsLoadPromise = null;
      reject(error);
    };

    const settleWhenReady = () => {
      if (settled) {
        return;
      }

      void waitForGoogleMaps()
        .then((maps) => {
          if (settled) {
            return;
          }

          settled = true;
          resolve(maps);
        })
        .catch((error) => {
          settleWithError(
            error instanceof Error ? error : new Error('Google Maps SDK did not become ready in time')
          );
        });
    };

    const previousCallback = window[GOOGLE_MAPS_CALLBACK_NAME];
    window[GOOGLE_MAPS_CALLBACK_NAME] = () => {
      if (typeof previousCallback === 'function') {
        previousCallback();
      }

      settleWhenReady();
    };

    const timeoutId = window.setTimeout(() => {
      settleWithError(new Error('Google Maps SDK timed out while loading'));
    }, GOOGLE_MAPS_TIMEOUT_MS);

    const cleanupAfterResolve = () => {
      window.clearTimeout(timeoutId);
    };

    const originalResolve = resolve;
    resolve = ((maps: typeof google.maps) => {
      cleanupAfterResolve();
      originalResolve(maps);
    }) as typeof resolve;

    const originalReject = reject;
    reject = ((reason?: unknown) => {
      cleanupAfterResolve();
      originalReject(reason);
    }) as typeof reject;

    if (existingScript) {
      existingScript.addEventListener(
        'error',
        () => {
          settleWithError(new Error('Failed to load Google Maps SDK'));
        },
        { once: true },
      );

      settleWhenReady();
      return;
    }

    const params = new URLSearchParams({
      key: GOOGLE_MAPS_API_KEY,
      callback: GOOGLE_MAPS_CALLBACK_NAME,
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
    script.onerror = () => {
      settleWithError(new Error('Failed to load Google Maps SDK'));
    };

    document.head.appendChild(script);
  });

  return googleMapsLoadPromise;
};

export const loadGoogleMapsPlacesLibrary = async (): Promise<google.maps.PlacesLibrary> =>
  waitForPlacesLibrary();
