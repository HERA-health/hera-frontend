/**
 * Global type declarations
 */

// Extend Window interface for Google Maps
declare global {
  interface Window {
    google?: typeof google;
  }
}

export {};
