import React, { useState } from 'react';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

interface NavigationControlProps {
  children: React.ReactNode;
  onPress: () => void;
  accessibilityLabel: string;
  expanded?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Quiet toolbar controls, with explicit pointer, keyboard and touch feedback. */
export function NavigationControl({ children, onPress, accessibilityLabel, expanded, style }: NavigationControlProps) {
  const { theme } = useTheme();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);

  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={expanded === undefined ? undefined : { expanded }}
      aria-expanded={expanded}
      style={({ pressed }) => [
        styles.control,
        style,
        {
          backgroundColor: pressed || hovered || expanded ? theme.navigationActive : 'transparent',
          borderColor: focused ? theme.focus : 'transparent',
        },
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  control: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
