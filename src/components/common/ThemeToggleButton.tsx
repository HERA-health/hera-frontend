import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { themeIconPaths } from '../../constants/themeIconPaths';
import { useTheme } from '../../contexts/ThemeContext';

type ToggleSize = 'sm' | 'md';

interface ThemeToggleButtonProps {
  size?: ToggleSize;
  showLabel?: boolean;
  style?: ViewStyle | ViewStyle[];
}

const SIZE_MAP = {
  sm: {
    height: 38,
    minWidth: 38,
    icon: 17,
    paddingHorizontal: 10,
    radius: 12,
    fontSize: 13,
  },
  md: {
    height: 44,
    minWidth: 44,
    icon: 18,
    paddingHorizontal: 12,
    radius: 14,
    fontSize: 14,
  },
} as const;

export function ThemeToggleButton({
  size = 'md',
  showLabel = false,
  style,
}: ThemeToggleButtonProps) {
  const { theme, isDark, setMode } = useTheme();
  const tokens = SIZE_MAP[size];
  const normalizedStyle = Array.isArray(style) ? style : style ? [style] : [];

  const handleToggle = useCallback(() => {
    setMode(isDark ? 'light' : 'dark');
  }, [isDark, setMode]);

  const label = isDark ? 'Modo día' : 'Modo noche';

  return (
    <Pressable
      onPress={handleToggle}
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ selected: isDark }}
      style={[
        styles.button,
        {
          minWidth: tokens.minWidth,
          height: tokens.height,
          borderRadius: tokens.radius,
          paddingHorizontal: showLabel ? tokens.paddingHorizontal : 0,
          backgroundColor: theme.bgCard,
          borderColor: theme.border,
          shadowColor: theme.shadowCard,
        },
        ...normalizedStyle,
      ]}
    >
      <View
        style={[
          styles.iconWrap,
          {
            width: showLabel ? 26 : tokens.minWidth,
            height: tokens.height,
          },
        ]}
      >
        <Svg width={tokens.icon} height={tokens.icon} viewBox="0 0 512 512" aria-hidden focusable={false}>
          <Path d={themeIconPaths[isDark ? 'sunny-outline' : 'moon-outline']} fill="none"
            stroke={theme.link} strokeWidth={32} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </View>
      {showLabel && (
        <Text
          style={[
            styles.label,
            {
              color: theme.textSecondary,
              fontFamily: theme.fontSansMedium,
              fontSize: tokens.fontSize,
            },
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 2,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    marginLeft: 2,
  },
});
