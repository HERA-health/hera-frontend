/**
 * AddressAutocomplete - Google Places address autocomplete
 * Uses Google Maps JavaScript SDK with Portal-based dropdown
 * Dropdown renders at document body level to escape stacking contexts
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { heraLanding, spacing, borderRadius } from '../../constants/colors';

// Types
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

  if (googleMapsLoaded && window.google?.maps?.places) {
    return Promise.resolve();
  }

  if (googleMapsLoadPromise) {
    return googleMapsLoadPromise;
  }

  googleMapsLoadPromise = new Promise((resolve, reject) => {
    if (window.google?.maps?.places) {
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
      const checkLoaded = setInterval(() => {
        if (window.google?.maps?.places) {
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

// Portal component for web - renders dropdown at body level
const DropdownPortal: React.FC<{
  children: React.ReactNode;
  position: DropdownPosition;
  visible: boolean;
}> = ({ children, position, visible }) => {
  const [portalContainer, setPortalContainer] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    // Create portal container
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

  // Update position when it changes
  useEffect(() => {
    if (portalContainer) {
      portalContainer.style.top = `${position.top}px`;
      portalContainer.style.left = `${position.left}px`;
      portalContainer.style.width = `${position.width}px`;
      portalContainer.style.pointerEvents = visible ? 'auto' : 'none';
    }
  }, [position, visible, portalContainer]);

  if (Platform.OS !== 'web' || !portalContainer || !visible) {
    return null;
  }

  // Use React's createPortal
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
  const [query, setQuery] = useState(value);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<DropdownPosition>({ top: 0, left: 0, width: 300 });

  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dummyDivRef = useRef<HTMLDivElement | null>(null);
  const inputContainerRef = useRef<View>(null);

  // Update dropdown position when showing
  const updateDropdownPosition = useCallback(() => {
    if (Platform.OS !== 'web' || !inputContainerRef.current) return;

    // Get the native element
    const element = inputContainerRef.current as any;
    if (element && element.getBoundingClientRect) {
      const rect = element.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width,
      });
    }
  }, []);

  // Initialize Google Maps services
  useEffect(() => {
    if (Platform.OS !== 'web' || !GOOGLE_MAPS_API_KEY) {
      return;
    }

    loadGoogleMapsScript()
      .then(() => {
        if (window.google?.maps?.places) {
          autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService();

          if (!dummyDivRef.current) {
            dummyDivRef.current = document.createElement('div');
          }
          placesServiceRef.current = new window.google.maps.places.PlacesService(dummyDivRef.current);
          setIsReady(true);
        }
      })
      .catch((err) => {
        console.error('Error loading Google Maps:', err);
      });
  }, []);

  // Sync with external value changes
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Update position on scroll/resize
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

  // Fetch predictions using Google Places Autocomplete Service
  const fetchPredictions = useCallback(async (input: string) => {
    if (input.length < 3 || !autocompleteServiceRef.current) {
      setPredictions([]);
      setShowDropdown(false);
      return;
    }

    setIsLoading(true);

    try {
      autocompleteServiceRef.current.getPlacePredictions(
        {
          input,
          types: ['address'],
          componentRestrictions: { country: 'es' },
        },
        (results, status) => {
          setIsLoading(false);

          if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
            const formattedPredictions: Prediction[] = results.slice(0, 5).map((result) => ({
              placeId: result.place_id,
              description: result.description,
              mainText: result.structured_formatting?.main_text || result.description,
              secondaryText: result.structured_formatting?.secondary_text || '',
            }));
            setPredictions(formattedPredictions);
            updateDropdownPosition();
            setShowDropdown(true);
          } else {
            setPredictions([]);
            setShowDropdown(false);
          }
        }
      );
    } catch (err) {
      console.error('Error fetching predictions:', err);
      setIsLoading(false);
      setPredictions([]);
    }
  }, [updateDropdownPosition]);

  // Handle input change with debounce
  const handleInputChange = useCallback(
    (text: string) => {
      setQuery(text);

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        fetchPredictions(text);
      }, 300);
    },
    [fetchPredictions]
  );

  // Handle prediction selection
  const handleSelectPrediction = useCallback(
    (prediction: Prediction) => {
      if (!placesServiceRef.current) {
        return;
      }

      setIsLoading(true);
      setShowDropdown(false);
      setQuery(prediction.mainText);

      placesServiceRef.current.getDetails(
        {
          placeId: prediction.placeId,
          fields: ['address_components', 'geometry', 'formatted_address'],
        },
        (place, status) => {
          setIsLoading(false);

          if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
            const components = place.address_components || [];

            const getComponent = (type: string): string => {
              const component = components.find((c) => c.types.includes(type));
              return component?.long_name || '';
            };

            const streetNumber = getComponent('street_number');
            const route = getComponent('route');
            const address = [route, streetNumber].filter(Boolean).join(' ').trim();

            const details: AddressDetails = {
              address: address || prediction.mainText,
              city: getComponent('locality') || getComponent('administrative_area_level_2') || '',
              postalCode: getComponent('postal_code') || '',
              country: getComponent('country') || 'España',
              lat: place.geometry?.location?.lat() || 0,
              lng: place.geometry?.location?.lng() || 0,
            };

            onAddressSelect(details);
          }
        }
      );
    },
    [onAddressSelect]
  );

  // Clear input
  const handleClear = () => {
    setQuery('');
    setPredictions([]);
    setShowDropdown(false);
  };

  // Handle focus
  const handleFocus = () => {
    setIsFocused(true);
    updateDropdownPosition();
    if (predictions.length > 0) {
      setShowDropdown(true);
    }
  };

  // Handle blur with delay to allow click
  const handleBlur = () => {
    setIsFocused(false);
    setTimeout(() => setShowDropdown(false), 200);
  };

  // Render dropdown content
  const renderDropdownContent = () => (
    <div
      style={{
        backgroundColor: heraLanding.cardBg,
        border: `1px solid ${heraLanding.border}`,
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
            backgroundColor: hoveredIndex === index ? heraLanding.background : heraLanding.cardBg,
            borderBottom: index < predictions.length - 1 ? `1px solid ${heraLanding.borderLight}` : 'none',
            borderLeft: hoveredIndex === index ? `3px solid ${heraLanding.primary}` : '3px solid transparent',
            transition: 'all 0.15s ease',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '20px',
              backgroundColor: hoveredIndex === index ? heraLanding.primary : heraLanding.primaryAlpha12,
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
              color={hoveredIndex === index ? heraLanding.textOnPrimary : heraLanding.primary}
            />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: '15px',
                fontWeight: 600,
                color: heraLanding.textPrimary,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {item.mainText}
            </div>
            {item.secondaryText && (
              <div
                style={{
                  fontSize: '13px',
                  color: heraLanding.textSecondary,
                  marginTop: '2px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {item.secondaryText}
              </div>
            )}
          </div>
          <Ionicons
            name="chevron-forward"
            size={16}
            color={hoveredIndex === index ? heraLanding.primary : heraLanding.textMuted}
          />
        </div>
      ))}
      <div
        style={{
          padding: '8px 16px',
          backgroundColor: heraLanding.surfaceMuted,
          borderTop: `1px solid ${heraLanding.borderLight}`,
          textAlign: 'right',
          fontSize: '10px',
          color: heraLanding.textMuted,
        }}
      >
        Powered by Google
      </div>
    </div>
  );

  // Render for non-web platforms (basic input)
  if (Platform.OS !== 'web') {
    return (
      <View style={[styles.wrapper, style]}>
        {label && <Text style={styles.label}>{label}</Text>}
        <View style={[styles.container, error && styles.containerError]}>
          <View style={styles.inputContainer}>
            <Ionicons name="location-outline" size={20} color={heraLanding.textMuted} />
            <TextInput
              style={styles.input}
              value={query}
              onChangeText={setQuery}
              placeholder={placeholder}
              placeholderTextColor={heraLanding.textMuted}
            />
          </View>
        </View>
        {error && <Text style={styles.errorText}>{error}</Text>}
        <Text style={styles.warningText}>
          Introduce la dirección manualmente en dispositivos móviles.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.wrapper, style]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View
        ref={inputContainerRef}
        style={[styles.container, isFocused && styles.containerFocused, error && styles.containerError]}
      >
        <View style={styles.inputContainer}>
          <Ionicons name="location-outline" size={20} color={heraLanding.textMuted} />
          <TextInput
            style={styles.input}
            value={query}
            onChangeText={handleInputChange}
            placeholder={placeholder}
            placeholderTextColor={heraLanding.textMuted}
            onFocus={handleFocus}
            onBlur={handleBlur}
            autoCorrect={false}
            autoCapitalize="words"
          />
          {isLoading && <ActivityIndicator size="small" color={heraLanding.primary} />}
          {query.length > 0 && !isLoading && (
            <TouchableOpacity onPress={handleClear} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close-circle" size={18} color={heraLanding.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Portal-based dropdown for proper z-index */}
      <DropdownPortal
        position={dropdownPosition}
        visible={showDropdown && predictions.length > 0}
      >
        {renderDropdownContent()}
      </DropdownPortal>

      {error && <Text style={styles.errorText}>{error}</Text>}

      {!GOOGLE_MAPS_API_KEY && (
        <Text style={styles.warningText}>
          Autocompletado no disponible. Configura EXPO_PUBLIC_GOOGLE_MAPS_API_KEY.
        </Text>
      )}

      {GOOGLE_MAPS_API_KEY && !isReady && (
        <Text style={styles.loadingText}>
          Cargando autocompletado...
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: heraLanding.textPrimary,
    marginBottom: spacing.xs,
  },
  container: {
    backgroundColor: heraLanding.cardBg,
    borderWidth: 1,
    borderColor: heraLanding.border,
    borderRadius: borderRadius.md,
  },
  containerFocused: {
    borderColor: heraLanding.primary,
    ...Platform.select({
      web: {
        boxShadow: `0 0 0 3px ${heraLanding.primary}20`,
      } as any,
    }),
  },
  containerError: {
    borderColor: heraLanding.warning,
  },
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
    color: heraLanding.textPrimary,
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      } as any,
    }),
  },
  errorText: {
    fontSize: 12,
    color: heraLanding.warning,
    marginTop: spacing.xs,
  },
  warningText: {
    fontSize: 12,
    color: heraLanding.textMuted,
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  loadingText: {
    fontSize: 12,
    color: heraLanding.textMuted,
    marginTop: spacing.xs,
  },
});

export default AddressAutocomplete;
