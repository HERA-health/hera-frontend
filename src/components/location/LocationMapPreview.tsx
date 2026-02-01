/**
 * LocationMapPreview - Interactive Google Map preview component
 * Uses Google Maps JavaScript API for web
 * Shows location with marker and optional directions button
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform,
  ViewStyle,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { heraLanding, spacing, borderRadius, shadows } from '../../constants/colors';

interface LocationMapPreviewProps {
  lat: number;
  lng: number;
  address: string;
  city: string;
  width?: number | string;
  height?: number;
  showDirectionsButton?: boolean;
  style?: ViewStyle;
  interactive?: boolean;
}

// Get API key from environment
const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

// Track if Google Maps script is loaded
let googleMapsLoaded = false;
let googleMapsLoadPromise: Promise<void> | null = null;

// Load Google Maps script dynamically (web only)
const loadGoogleMapsScript = (): Promise<void> => {
  if (Platform.OS !== 'web') {
    return Promise.resolve();
  }

  if (googleMapsLoaded && window.google?.maps) {
    return Promise.resolve();
  }

  if (googleMapsLoadPromise) {
    return googleMapsLoadPromise;
  }

  googleMapsLoadPromise = new Promise((resolve, reject) => {
    if (window.google?.maps) {
      googleMapsLoaded = true;
      resolve();
      return;
    }

    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => {
        googleMapsLoaded = true;
        resolve();
      });
      // If script exists but not loaded yet, wait a bit
      const checkLoaded = setInterval(() => {
        if (window.google?.maps) {
          clearInterval(checkLoaded);
          googleMapsLoaded = true;
          resolve();
        }
      }, 100);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&language=es`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      googleMapsLoaded = true;
      resolve();
    };

    script.onerror = () => {
      reject(new Error('Failed to load Google Maps script'));
    };

    document.head.appendChild(script);
  });

  return googleMapsLoadPromise;
};

export const LocationMapPreview: React.FC<LocationMapPreviewProps> = ({
  lat,
  lng,
  address,
  city,
  width = '100%',
  height = 250,
  showDirectionsButton = false,
  style,
  interactive = true,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize map
  useEffect(() => {
    if (Platform.OS !== 'web' || !GOOGLE_MAPS_API_KEY) {
      setIsLoading(false);
      return;
    }

    if (!lat || !lng) {
      setIsLoading(false);
      return;
    }

    loadGoogleMapsScript()
      .then(() => {
        if (!mapContainerRef.current || !window.google?.maps) {
          return;
        }

        const position = { lat, lng };

        // Create map
        mapRef.current = new window.google.maps.Map(mapContainerRef.current, {
          center: position,
          zoom: 15,
          disableDefaultUI: !interactive,
          zoomControl: interactive,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: interactive,
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }],
            },
          ],
        });

        // Create custom marker
        markerRef.current = new window.google.maps.Marker({
          position,
          map: mapRef.current,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: heraLanding.primary,
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 3,
          },
          title: address,
        });

        // Add info window on marker click
        const infoWindow = new window.google.maps.InfoWindow({
          content: `
            <div style="padding: 8px; font-family: system-ui, -apple-system, sans-serif;">
              <strong style="color: #2d3748; font-size: 14px;">${address}</strong>
              <p style="color: #718096; margin: 4px 0 0 0; font-size: 12px;">${city}</p>
            </div>
          `,
        });

        markerRef.current.addListener('click', () => {
          infoWindow.open(mapRef.current, markerRef.current);
        });

        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Error loading Google Maps:', err);
        setError('Error al cargar el mapa');
        setIsLoading(false);
      });

    return () => {
      if (markerRef.current) {
        markerRef.current.setMap(null);
      }
    };
  }, [lat, lng, address, city, interactive]);

  // Update marker position when coordinates change
  useEffect(() => {
    if (mapRef.current && markerRef.current && lat && lng) {
      const position = { lat, lng };
      markerRef.current.setPosition(position);
      mapRef.current.panTo(position);
    }
  }, [lat, lng]);

  const handleOpenDirections = () => {
    const destination = encodeURIComponent(`${address}, ${city}`);
    const coords = `${lat},${lng}`;

    const url = Platform.select({
      ios: `maps://?daddr=${coords}`,
      android: `google.navigation:q=${coords}`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${coords}&destination_place_id=`,
    });

    if (url) {
      Linking.openURL(url).catch(() => {
        Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${destination}`);
      });
    }
  };

  const handleOpenInMaps = () => {
    const coords = `${lat},${lng}`;
    const url = `https://www.google.com/maps/search/?api=1&query=${coords}`;
    Linking.openURL(url);
  };

  // Non-web fallback
  if (Platform.OS !== 'web') {
    return (
      <View style={[styles.container, style]}>
        <View style={[styles.mapPlaceholder, { height }]}>
          <Ionicons name="map-outline" size={48} color={heraLanding.textMuted} />
          <Text style={styles.placeholderText}>Mapa disponible en versión web</Text>
        </View>
        <View style={styles.addressOverlay}>
          <Ionicons name="location" size={18} color={heraLanding.primary} />
          <View style={styles.addressText}>
            <Text style={styles.address} numberOfLines={1}>{address}</Text>
            <Text style={styles.city}>{city}</Text>
          </View>
        </View>
        {showDirectionsButton && (
          <TouchableOpacity style={styles.directionsButton} onPress={handleOpenDirections} activeOpacity={0.8}>
            <Ionicons name="navigate" size={18} color={heraLanding.textOnPrimary} />
            <Text style={styles.directionsText}>Cómo llegar</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // No API key
  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <View style={[styles.container, style]}>
        <View style={[styles.mapPlaceholder, { height }]}>
          <Ionicons name="warning-outline" size={48} color={heraLanding.textMuted} />
          <Text style={styles.placeholderText}>API key de Google Maps no configurada</Text>
        </View>
      </View>
    );
  }

  // No coordinates
  if (!lat || !lng) {
    return (
      <View style={[styles.container, style]}>
        <View style={[styles.mapPlaceholder, { height }]}>
          <Ionicons name="location-outline" size={48} color={heraLanding.textMuted} />
          <Text style={styles.placeholderText}>Selecciona una dirección para ver el mapa</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {/* Map Container */}
      <View style={[styles.mapWrapper, { height }]}>
        {isLoading && (
          <View style={[styles.loadingOverlay, { height }]}>
            <ActivityIndicator size="large" color={heraLanding.primary} />
            <Text style={styles.loadingText}>Cargando mapa...</Text>
          </View>
        )}
        {error && (
          <View style={[styles.mapPlaceholder, { height }]}>
            <Ionicons name="alert-circle-outline" size={48} color={heraLanding.warning} />
            <Text style={styles.placeholderText}>{error}</Text>
          </View>
        )}
        <div
          ref={mapContainerRef}
          style={{
            width: typeof width === 'number' ? `${width}px` : width,
            height: `${height}px`,
            borderRadius: `${borderRadius.lg}px ${borderRadius.lg}px 0 0`,
            opacity: isLoading ? 0 : 1,
            transition: 'opacity 0.3s ease',
          }}
        />
      </View>

      {/* Address Overlay */}
      <TouchableOpacity
        style={styles.addressOverlay}
        onPress={handleOpenInMaps}
        activeOpacity={0.8}
      >
        <View style={styles.addressIcon}>
          <Ionicons name="location" size={20} color={heraLanding.primary} />
        </View>
        <View style={styles.addressText}>
          <Text style={styles.address} numberOfLines={1}>{address}</Text>
          <Text style={styles.city}>{city}</Text>
        </View>
        <Ionicons name="open-outline" size={18} color={heraLanding.textMuted} />
      </TouchableOpacity>

      {/* Directions Button */}
      {showDirectionsButton && (
        <TouchableOpacity
          style={styles.directionsButton}
          onPress={handleOpenDirections}
          activeOpacity={0.8}
        >
          <Ionicons name="navigate" size={18} color={heraLanding.textOnPrimary} />
          <Text style={styles.directionsText}>Cómo llegar</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: heraLanding.cardBg,
    ...shadows.md,
  },
  mapWrapper: {
    position: 'relative',
    overflow: 'hidden',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: heraLanding.background,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  loadingText: {
    marginTop: spacing.sm,
    fontSize: 13,
    color: heraLanding.textMuted,
  },
  mapPlaceholder: {
    backgroundColor: heraLanding.background,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  placeholderText: {
    fontSize: 13,
    color: heraLanding.textMuted,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  addressOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: heraLanding.cardBg,
    borderTopWidth: 1,
    borderTopColor: heraLanding.borderLight,
  },
  addressIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${heraLanding.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addressText: {
    flex: 1,
  },
  address: {
    fontSize: 14,
    fontWeight: '600',
    color: heraLanding.textPrimary,
  },
  city: {
    fontSize: 12,
    color: heraLanding.textSecondary,
    marginTop: 2,
  },
  directionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: heraLanding.primary,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  directionsText: {
    color: heraLanding.textOnPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
});

export default LocationMapPreview;
