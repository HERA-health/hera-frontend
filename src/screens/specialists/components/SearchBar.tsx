import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../../contexts/ThemeContext';
import { AnimatedPressable } from '../../../components/common/AnimatedPressable';
import { spacing } from '../../../constants/colors';
import type { Theme } from '../../../constants/theme';

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
  debounceMs = 250,
}) => {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);
  const [localValue, setLocalValue] = useState(value);
  const [isFocused, setIsFocused] = useState(false);
  const ringAnim = useRef(new Animated.Value(0)).current;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    Animated.timing(ringAnim, {
      toValue: isFocused ? 1 : 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
  }, [isFocused, ringAnim]);

  useEffect(() => () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
  }, []);

  const handleChangeText = useCallback((text: string) => {
    setLocalValue(text);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      onChangeText(text);
    }, debounceMs);
  }, [debounceMs, onChangeText]);

  const handleClear = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    setLocalValue('');
    onChangeText('');
  }, [onChangeText]);

  const borderColor = ringAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.border, theme.primary],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          borderColor,
          shadowOpacity: isFocused ? 1 : 0.7,
        },
      ]}
    >
      <Ionicons
        name="search"
        size={18}
        color={isFocused ? theme.primary : theme.textMuted}
        style={styles.leadingIcon}
      />

      <TextInput
        value={localValue}
        onChangeText={handleChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textMuted}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        style={styles.input}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        accessibilityLabel="Buscar especialistas"
      />

      {localValue.length > 0 ? (
        <AnimatedPressable
          onPress={handleClear}
          hoverLift={false}
          pressScale={0.9}
          style={styles.clearButton}
          accessibilityLabel="Limpiar búsqueda"
        >
          <View style={styles.clearButtonInner}>
            <Ionicons name="close" size={15} color={theme.textSecondary} />
          </View>
        </AnimatedPressable>
      ) : null}
    </Animated.View>
  );
};

function createStyles(theme: Theme, isDark: boolean) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 52,
      borderRadius: 18,
      paddingHorizontal: spacing.md,
      backgroundColor: theme.bgCard,
      borderWidth: 1.5,
      shadowColor: theme.shadowCard,
      shadowOffset: { width: 0, height: 8 },
      shadowRadius: 20,
      elevation: 3,
    },
    leadingIcon: {
      marginRight: spacing.sm,
    },
    input: {
      flex: 1,
      paddingVertical: 0,
      color: theme.textPrimary,
      fontSize: 15,
      fontFamily: theme.fontSans,
    },
    clearButton: {
      marginLeft: spacing.sm,
      borderRadius: 999,
    },
    clearButtonInner: {
      width: 28,
      height: 28,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 999,
      backgroundColor: isDark ? theme.surfaceMuted : theme.bgAlt,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
  });
}

export default SearchBar;
