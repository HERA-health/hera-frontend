/**
 * SearchBar Component
 * Modern pill-shaped search input with clear functionality
 * Features: Focus states, debounced input, accessibility
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { heraLanding, spacing, shadows } from '../../../constants/colors';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  debounceMs?: number;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  placeholder = 'Buscar por nombre o especialidad...',
  debounceMs = 300,
}) => {
  const [localValue, setLocalValue] = useState(value);
  const [isFocused, setIsFocused] = useState(false);
  const borderAnim = useRef(new Animated.Value(0)).current;
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Sync local value with prop
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Animate border on focus
  useEffect(() => {
    Animated.timing(borderAnim, {
      toValue: isFocused ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isFocused]);

  const handleChangeText = useCallback(
    (text: string) => {
      setLocalValue(text);

      // Debounce the onChangeText callback
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        onChangeText(text);
      }, debounceMs);
    },
    [onChangeText, debounceMs]
  );

  const handleClear = () => {
    setLocalValue('');
    onChangeText('');
  };

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [heraLanding.border, heraLanding.primary],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          borderColor,
          shadowOpacity: isFocused ? 0.08 : 0.04,
        },
      ]}
    >
      <Ionicons
        name="search"
        size={20}
        color={isFocused ? heraLanding.primary : heraLanding.textMuted}
        style={styles.searchIcon}
      />

      <TextInput
        style={styles.input}
        value={localValue}
        onChangeText={handleChangeText}
        placeholder={placeholder}
        placeholderTextColor={heraLanding.textMuted}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel="Buscar especialistas"
        accessibilityHint="Escribe para buscar por nombre o especialidad"
      />

      {localValue.length > 0 && (
        <TouchableOpacity
          onPress={handleClear}
          style={styles.clearButton}
          accessibilityRole="button"
          accessibilityLabel="Limpiar búsqueda"
        >
          <Ionicons
            name="close-circle"
            size={20}
            color={heraLanding.textMuted}
          />
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: spacing.md,
    height: 48,
    borderWidth: 2,
    ...shadows.sm,
    ...(Platform.OS === 'web' && {
      // @ts-ignore
      transition: 'all 0.2s ease',
    }),
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: heraLanding.textPrimary,
    paddingVertical: 0,
  },
  clearButton: {
    padding: spacing.xs,
    marginLeft: spacing.xs,
  },
});

export default SearchBar;
