/**
 * LocationMapPreview - Interactive Google Map preview component
 * Uses Google Maps JavaScript API for web
 * Shows location with marker and optional directions button
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Linking,
  Platform,
  ViewStyle,
  ActivityIndicator,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AnimatedPressable } from '../common';
import { spacing, borderRadius, shadows } from '../../constants/colors';
import { useTheme } from '../../contexts/ThemeContext';
import { GOOGLE_MAPS_API_KEY, loadGoogleMaps } from './googleMapsLoader';

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

const hasGoogleMapsApiKey = GOOGLE_MAPS_API_KEY.length > 0;

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
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web' || !hasGoogleMapsApiKey || !lat || !lng) {
      setIsLoading(false);
      return;
    }

    let isCancelled = false;

    void loadGoogleMaps()
      .then((maps) => {
        if (isCancelled || !mapContainerRef.current) {
          return;
        }

        const position = { lat, lng };

        mapRef.current = new maps.Map(mapContainerRef.current, {
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

        markerRef.current = new maps.Marker({
          position,
          map: mapRef.current,
          icon: {
            path: maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: theme.primary,
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 3,
          },
          title: address,
        });

        const infoWindow = new maps.InfoWindow({
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

        setError(null);
        setIsLoading(false);
      })
      .catch((err) => {
        if (isCancelled) {
          return;
        }

        console.error('Error loading Google Maps:', err);
        setError('Error al cargar el mapa');
        setIsLoading(false);
      });

    return () => {
      isCancelled = true;
      markerRef.current?.setMap(null);
      markerRef.current = null;
      mapRef.current = null;
    };
  }, [address, city, interactive, lat, lng, theme.primary]);

  useEffect(() => {
    if (!mapRef.current || !markerRef.current || !lat || !lng) {
      return;
    }

    const position = { lat, lng };
    markerRef.current.setPosition(position);
    mapRef.current.panTo(position);
  }, [lat, lng]);

  const handleOpenDirections = () => {
    const destination = encodeURIComponent(`${address}, ${city}`);
    const coords = `${lat},${lng}`;

    const url = Platform.select({
      ios: `maps://?daddr=${coords}`,
      android: `google.navigation:q=${coords}`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${coords}&destination_place_id=`,
    });

    if (!url) {
      return;
    }

    Linking.openURL(url).catch(() => {
      void Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${destination}`);
    });
  };

  const handleOpenInMaps = () => {
    const coords = `${lat},${lng}`;
    void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${coords}`);
  };

  if (Platform.OS !== 'web') {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: theme.bgCard, borderColor: theme.border, borderWidth: 1 },
          style,
        ]}
      >
        <View
          style={[
            styles.mapPlaceholder,
            { height, backgroundColor: isDark ? theme.surfaceMuted : theme.bgMuted },
          ]}
        >
          <Ionicons name="map-outline" size={48} color={theme.textMuted} />
          <Text style={[styles.placeholderText, { color: theme.textMuted }]}>
            Mapa disponible en versión web
          </Text>
        </View>
        <View
          style={[
            styles.addressOverlay,
            { backgroundColor: theme.bgCard, borderTopColor: theme.borderLight },
          ]}
        >
          <Ionicons name="location" size={18} color={theme.primary} />
          <View style={styles.addressText}>
            <Text style={[styles.address, { color: theme.textPrimary }]} numberOfLines={1}>
              {address}
            </Text>
            <Text style={[styles.city, { color: theme.textSecondary }]}>{city}</Text>
          </View>
        </View>
        {showDirectionsButton ? (
          <AnimatedPressable
            style={[styles.directionsButton, { backgroundColor: theme.primary }]}
            onPress={handleOpenDirections}
          >
            <Ionicons name="navigate" size={18} color={theme.textOnPrimary} />
            <Text style={[styles.directionsText, { color: theme.textOnPrimary }]}>
              Cómo llegar
            </Text>
          </AnimatedPressable>
        ) : null}
      </View>
    );
  }

  if (!hasGoogleMapsApiKey) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: theme.bgCard, borderColor: theme.border, borderWidth: 1 },
          style,
        ]}
      >
        <View
          style={[
            styles.mapPlaceholder,
            { height, backgroundColor: isDark ? theme.surfaceMuted : theme.bgMuted },
          ]}
        >
          <Ionicons name="warning-outline" size={48} color={theme.textMuted} />
          <Text style={[styles.placeholderText, { color: theme.textMuted }]}>
            API key de Google Maps no configurada
          </Text>
        </View>
      </View>
    );
  }

  if (!lat || !lng) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: theme.bgCard, borderColor: theme.border, borderWidth: 1 },
          style,
        ]}
      >
        <View
          style={[
            styles.mapPlaceholder,
            { height, backgroundColor: isDark ? theme.surfaceMuted : theme.bgMuted },
          ]}
        >
          <Ionicons name="location-outline" size={48} color={theme.textMuted} />
          <Text style={[styles.placeholderText, { color: theme.textMuted }]}>
            Selecciona una dirección para ver el mapa
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.bgCard, borderColor: theme.border, borderWidth: 1 },
        style,
      ]}
    >
      <View style={[styles.mapWrapper, { height }]}>
        {isLoading ? (
          <View
            style={[
              styles.loadingOverlay,
              { height, backgroundColor: isDark ? theme.surfaceMuted : theme.bgMuted },
            ]}
          >
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.loadingText, { color: theme.textMuted }]}>Cargando mapa...</Text>
          </View>
        ) : null}

        {error ? (
          <View
            style={[
              styles.mapPlaceholder,
              { height, backgroundColor: isDark ? theme.surfaceMuted : theme.bgMuted },
            ]}
          >
            <Ionicons name="alert-circle-outline" size={48} color={theme.error} />
            <Text style={[styles.placeholderText, { color: theme.textMuted }]}>{error}</Text>
          </View>
        ) : null}

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

      <AnimatedPressable
        style={[
          styles.addressOverlay,
          { backgroundColor: theme.bgCard, borderTopColor: theme.borderLight },
        ]}
        onPress={handleOpenInMaps}
      >
        <View style={[styles.addressIcon, { backgroundColor: theme.primaryAlpha12 }]}>
          <Ionicons name="location" size={20} color={theme.primary} />
        </View>
        <View style={styles.addressText}>
          <Text style={[styles.address, { color: theme.textPrimary }]} numberOfLines={1}>
            {address}
          </Text>
          <Text style={[styles.city, { color: theme.textSecondary }]}>{city}</Text>
        </View>
        <Ionicons name="open-outline" size={18} color={theme.textMuted} />
      </AnimatedPressable>

      {showDirectionsButton ? (
        <AnimatedPressable
          style={[styles.directionsButton, { backgroundColor: theme.primary }]}
          onPress={handleOpenDirections}
        >
          <Ionicons name="navigate" size={18} color={theme.textOnPrimary} />
          <Text style={[styles.directionsText, { color: theme.textOnPrimary }]}>
            Cómo llegar
          </Text>
        </AnimatedPressable>
      ) : null}
    </View>
  );
};

const createStyles = (
  theme: ReturnType<typeof useTheme>['theme'],
  isDark: boolean,
) =>
  StyleSheet.create({
    container: {
      borderRadius: borderRadius.lg,
      overflow: 'hidden',
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
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1,
    },
    loadingText: {
      marginTop: spacing.sm,
      fontSize: 13,
      color: isDark ? theme.textMuted : theme.textSecondary,
    },
    mapPlaceholder: {
      justifyContent: 'center',
      alignItems: 'center',
      gap: spacing.sm,
    },
    placeholderText: {
      fontSize: 13,
      textAlign: 'center',
      paddingHorizontal: spacing.lg,
    },
    addressOverlay: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.md,
      gap: spacing.sm,
      borderTopWidth: 1,
    },
    addressIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    addressText: {
      flex: 1,
    },
    address: {
      fontSize: 14,
      fontWeight: '600',
    },
    city: {
      fontSize: 12,
      marginTop: 2,
    },
    directionsButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.md,
      gap: spacing.sm,
    },
    directionsText: {
      fontSize: 15,
      fontWeight: '600',
    },
  });

export default LocationMapPreview;
