/**
 * AddressAutocomplete - Google Places address autocomplete
 * Uses Google Maps JavaScript SDK with Portal-based dropdown
 * Dropdown renders at document body level to escape stacking contexts
 */

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Platform,
  ViewStyle,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AnimatedPressable } from '../common';
import { spacing, borderRadius } from '../../constants/colors';
import { useTheme } from '../../contexts/ThemeContext';
import { getWebFocusRingStyle, getWebInputResetStyle } from './locationThemeHelpers';
import {
  GOOGLE_MAPS_API_KEY,
  loadGoogleMapsPlacesLibrary,
} from './googleMapsLoader';

export interface AddressDetails {
  address: string;
  city: string;
  postalCode: string;
  country: string;
  lat: number;
  lng: number;
}

interface Prediction {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

interface AddressAutocompleteProps {
  value: string;
  onAddressSelect: (details: AddressDetails) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  style?: ViewStyle;
}

interface DropdownPosition {
  top: number;
  left: number;
  width: number;
}

type WebMeasurableElement = View & {
  getBoundingClientRect?: () => {
    top: number;
    left: number;
    width: number;
    bottom: number;
  };
};

const hasGoogleMapsApiKey = GOOGLE_MAPS_API_KEY.length > 0;

const DropdownPortal: React.FC<{
  children: React.ReactNode;
  position: DropdownPosition;
  visible: boolean;
}> = ({ children, position, visible }) => {
  const [portalContainer, setPortalContainer] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const container = document.createElement('div');
    container.id = 'address-autocomplete-portal';
    container.style.cssText = `
      position: fixed;
      top: ${position.top}px;
      left: ${position.left}px;
      width: ${position.width}px;
      z-index: 999999;
      pointer-events: ${visible ? 'auto' : 'none'};
    `;
    document.body.appendChild(container);
    setPortalContainer(container);

    return () => {
      document.body.removeChild(container);
    };
  }, []);

  useEffect(() => {
    if (!portalContainer) {
      return;
    }

    portalContainer.style.top = `${position.top}px`;
    portalContainer.style.left = `${position.left}px`;
    portalContainer.style.width = `${position.width}px`;
    portalContainer.style.pointerEvents = visible ? 'auto' : 'none';
  }, [position, visible, portalContainer]);

  if (Platform.OS !== 'web' || !portalContainer || !visible) {
    return null;
  }

  const ReactDOM = require('react-dom');
  return ReactDOM.createPortal(children, portalContainer);
};

export const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({
  value,
  onAddressSelect,
  placeholder = 'Buscar dirección...',
  label,
  error,
  style,
}) => {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);
  const [query, setQuery] = useState(value);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<DropdownPosition>({
    top: 0,
    left: 0,
    width: 300,
  });

  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputContainerRef = useRef<View>(null);

  const resetSessionToken = useCallback(() => {
    if (Platform.OS !== 'web' || !window.google?.maps?.places?.AutocompleteSessionToken) {
      sessionTokenRef.current = null;
      return;
    }

    sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
  }, []);

  const updateDropdownPosition = useCallback(() => {
    if (Platform.OS !== 'web' || !inputContainerRef.current) return;

    const element = inputContainerRef.current as WebMeasurableElement | null;
    if (element?.getBoundingClientRect) {
      const rect = element.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width,
      });
    }
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' || !hasGoogleMapsApiKey) {
      return;
    }

    void loadGoogleMapsPlacesLibrary()
      .then(() => {
        resetSessionToken();
        setIsReady(true);
      })
      .catch((err) => {
        console.error('Error loading Google Maps:', err);
      });
  }, [resetSessionToken]);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    if (Platform.OS !== 'web' || !showDropdown) return;

    const handlePositionUpdate = () => updateDropdownPosition();

    window.addEventListener('scroll', handlePositionUpdate, true);
    window.addEventListener('resize', handlePositionUpdate);

    return () => {
      window.removeEventListener('scroll', handlePositionUpdate, true);
      window.removeEventListener('resize', handlePositionUpdate);
    };
  }, [showDropdown, updateDropdownPosition]);

  useEffect(
    () => () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    },
    [],
  );

  const fetchPredictions = useCallback(
    async (input: string) => {
      if (input.length < 3 || !isReady) {
        setPredictions([]);
        setShowDropdown(false);
        return;
      }

      setIsLoading(true);

      try {
        const placesLibrary = await loadGoogleMapsPlacesLibrary();

        if (!sessionTokenRef.current) {
          sessionTokenRef.current = new placesLibrary.AutocompleteSessionToken();
        }

        const { suggestions } =
          await placesLibrary.AutocompleteSuggestion.fetchAutocompleteSuggestions({
            input,
            includedRegionCodes: ['es'],
            language: 'es',
            region: 'es',
            sessionToken: sessionTokenRef.current,
          });

        const formattedPredictions: Prediction[] = suggestions
          .map((suggestion) => suggestion.placePrediction)
          .filter(
            (prediction): prediction is google.maps.places.PlacePrediction =>
              prediction !== null,
          )
          .slice(0, 5)
          .map((prediction) => ({
            placeId: prediction.placeId,
            description: prediction.text.text,
            mainText: prediction.mainText?.text ?? prediction.text.text,
            secondaryText: prediction.secondaryText?.text ?? '',
          }));

        setPredictions(formattedPredictions);
        updateDropdownPosition();
        setShowDropdown(formattedPredictions.length > 0);
      } catch (err) {
        console.error('Error fetching predictions:', err);
        setPredictions([]);
        setShowDropdown(false);
      } finally {
        setIsLoading(false);
      }
    },
    [isReady, updateDropdownPosition],
  );

  const handleInputChange = useCallback(
    (text: string) => {
      setQuery(text);

      if (!text.trim()) {
        setPredictions([]);
        setShowDropdown(false);
        resetSessionToken();
      }

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        void fetchPredictions(text);
      }, 300);
    },
    [fetchPredictions, resetSessionToken],
  );

  const handleSelectPrediction = useCallback(
    (prediction: Prediction) => {
      void (async () => {
        setIsLoading(true);
        setShowDropdown(false);
        setQuery(prediction.mainText);

        try {
          const placesLibrary = await loadGoogleMapsPlacesLibrary();
          const place = new placesLibrary.Place({
            id: prediction.placeId,
            requestedLanguage: 'es',
          });

          await place.fetchFields({
            fields: ['addressComponents', 'formattedAddress', 'location'],
          });

          const components = place.addressComponents ?? [];

          const getComponent = (type: string): string => {
            const component = components.find((item) => item.types.includes(type));
            return component?.longText ?? '';
          };

          const streetNumber = getComponent('street_number');
          const route = getComponent('route');
          const address = [route, streetNumber].filter(Boolean).join(' ').trim();
          const location = place.location;

          onAddressSelect({
            address: address || prediction.mainText,
            city:
              getComponent('locality') ||
              getComponent('postal_town') ||
              getComponent('administrative_area_level_2') ||
              '',
            postalCode: getComponent('postal_code') || '',
            country: getComponent('country') || 'España',
            lat: location?.lat() ?? 0,
            lng: location?.lng() ?? 0,
          });
        } catch (err) {
          console.error('Error fetching place details:', err);
        } finally {
          setIsLoading(false);
          resetSessionToken();
        }
      })();
    },
    [onAddressSelect, resetSessionToken],
  );

  const handleClear = useCallback(() => {
    setQuery('');
    setPredictions([]);
    setShowDropdown(false);
    resetSessionToken();
  }, [resetSessionToken]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    updateDropdownPosition();
    if (predictions.length > 0) {
      setShowDropdown(true);
    }
  }, [predictions.length, updateDropdownPosition]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    window.setTimeout(() => setShowDropdown(false), 200);
  }, []);

  const renderDropdownContent = () => (
    <div
      style={{
        backgroundColor: theme.bgCard,
        border: `1px solid ${theme.border}`,
        borderRadius: `${borderRadius.lg}px`,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12), 0 4px 12px rgba(0, 0, 0, 0.08)',
        overflow: 'hidden',
        maxHeight: '320px',
        overflowY: 'auto',
      }}
    >
      {predictions.map((item, index) => (
        <div
          key={item.placeId}
          onClick={() => handleSelectPrediction(item)}
          onMouseEnter={() => setHoveredIndex(index)}
          onMouseLeave={() => setHoveredIndex(null)}
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '14px 16px',
            gap: '12px',
            cursor: 'pointer',
            backgroundColor: hoveredIndex === index ? theme.bgMuted : theme.bgCard,
            borderBottom:
              index < predictions.length - 1 ? `1px solid ${theme.borderLight}` : 'none',
            borderLeft:
              hoveredIndex === index ? `3px solid ${theme.primary}` : '3px solid transparent',
            transition: 'all 0.15s ease',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '20px',
              backgroundColor: hoveredIndex === index ? theme.primary : theme.primaryAlpha12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 0.15s ease',
              flexShrink: 0,
            }}
          >
            <Ionicons
              name="location"
              size={18}
              color={hoveredIndex === index ? theme.textOnPrimary : theme.primary}
            />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: '15px',
                fontWeight: 600,
                color: theme.textPrimary,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {item.mainText}
            </div>
            {item.secondaryText ? (
              <div
                style={{
                  fontSize: '13px',
                  color: theme.textSecondary,
                  marginTop: '2px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {item.secondaryText}
              </div>
            ) : null}
          </div>
          <Ionicons
            name="chevron-forward"
            size={16}
            color={hoveredIndex === index ? theme.primary : theme.textMuted}
          />
        </div>
      ))}
      <div
        style={{
          padding: '8px 16px',
          backgroundColor: isDark ? theme.surfaceMuted : theme.bgMuted,
          borderTop: `1px solid ${theme.borderLight}`,
          textAlign: 'right',
          fontSize: '10px',
          color: theme.textMuted,
        }}
      >
        Powered by Google
      </div>
    </div>
  );

  if (Platform.OS !== 'web') {
    return (
      <View style={[styles.wrapper, style]}>
        {label ? <Text style={[styles.label, { color: theme.textPrimary }]}>{label}</Text> : null}
        <View
          style={[
            styles.container,
            { backgroundColor: theme.bgCard, borderColor: theme.border },
            error ? [styles.containerError, { borderColor: theme.error }] : null,
          ]}
        >
          <View style={styles.inputContainer}>
            <Ionicons name="location-outline" size={20} color={theme.textMuted} />
            <TextInput
              style={[styles.input, { color: theme.textPrimary }]}
              value={query}
              onChangeText={setQuery}
              placeholder={placeholder}
              placeholderTextColor={theme.textMuted}
            />
          </View>
        </View>
        {error ? <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text> : null}
        <Text style={[styles.warningText, { color: theme.textMuted }]}>
          Introduce la dirección manualmente en dispositivos móviles.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.wrapper, style]}>
      {label ? <Text style={[styles.label, { color: theme.textPrimary }]}>{label}</Text> : null}

      <View
        ref={inputContainerRef}
        style={[
          styles.container,
          { backgroundColor: theme.bgCard, borderColor: theme.border },
          isFocused ? [styles.containerFocused, { borderColor: theme.primary }] : null,
          error ? [styles.containerError, { borderColor: theme.error }] : null,
        ]}
      >
        <View style={styles.inputContainer}>
          <Ionicons name="location-outline" size={20} color={theme.textMuted} />
          <TextInput
            style={[styles.input, { color: theme.textPrimary }]}
            value={query}
            onChangeText={handleInputChange}
            placeholder={placeholder}
            placeholderTextColor={theme.textMuted}
            onFocus={handleFocus}
            onBlur={handleBlur}
            autoCorrect={false}
            autoCapitalize="words"
          />
          {isLoading ? <ActivityIndicator size="small" color={theme.primary} /> : null}
          {query.length > 0 && !isLoading ? (
            <AnimatedPressable
              onPress={handleClear}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close-circle" size={18} color={theme.textMuted} />
            </AnimatedPressable>
          ) : null}
        </View>
      </View>

      <DropdownPortal position={dropdownPosition} visible={showDropdown && predictions.length > 0}>
        {renderDropdownContent()}
      </DropdownPortal>

      {error ? <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text> : null}

      {!hasGoogleMapsApiKey ? (
        <Text style={[styles.warningText, { color: theme.textMuted }]}>
          Autocompletado no disponible. Configura EXPO_PUBLIC_GOOGLE_MAPS_API_KEY.
        </Text>
      ) : null}

      {hasGoogleMapsApiKey && !isReady ? (
        <Text style={[styles.loadingText, { color: theme.textMuted }]}>
          Cargando autocompletado...
        </Text>
      ) : null}
    </View>
  );
};

const createStyles = (
  theme: ReturnType<typeof useTheme>['theme'],
  isDark: boolean,
) =>
  StyleSheet.create({
    wrapper: {
      position: 'relative',
    },
    label: {
      fontSize: 14,
      fontWeight: '500',
      marginBottom: spacing.xs,
    },
    container: {
      borderWidth: 1,
      borderRadius: borderRadius.md,
    },
    containerFocused: {
      ...getWebFocusRingStyle(theme.primary),
    },
    containerError: {},
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      height: 52,
      gap: spacing.sm,
    },
    input: {
      flex: 1,
      fontSize: 15,
      ...getWebInputResetStyle(),
    },
    errorText: {
      fontSize: 12,
      marginTop: spacing.xs,
    },
    warningText: {
      fontSize: 12,
      marginTop: spacing.xs,
      fontStyle: 'italic',
    },
    loadingText: {
      fontSize: 12,
      marginTop: spacing.xs,
      color: isDark ? theme.textMuted : theme.textSecondary,
    },
  });

export default AddressAutocomplete;
