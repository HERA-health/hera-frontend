/**
 * ViewToggle Component
 * Toggle between grid and list view
 * Features: Animated selection indicator, accessible
 */

import React, { useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { heraLanding, spacing, shadows } from '../../../constants/colors';

export type ViewMode = 'grid' | 'list';

interface ViewToggleProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export const ViewToggle: React.FC<ViewToggleProps> = ({
  viewMode,
  onViewModeChange,
}) => {
  const slideAnim = useRef(new Animated.Value(viewMode === 'grid' ? 0 : 1)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: viewMode === 'grid' ? 0 : 1,
      friction: 8,
      tension: 100,
      useNativeDriver: true,
    }).start();
  }, [viewMode]);

  const translateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 36], // Width of one button
  });

  return (
    <View style={styles.container}>
      {/* Animated indicator */}
      <Animated.View
        style={[
          styles.indicator,
          {
            transform: [{ translateX }],
          },
        ]}
      />

      {/* Grid button */}
      <TouchableOpacity
        style={styles.button}
        onPress={() => onViewModeChange('grid')}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityState={{ selected: viewMode === 'grid' }}
        accessibilityLabel="Vista de cuadrícula"
      >
        <Ionicons
          name="grid-outline"
          size={18}
          color={viewMode === 'grid' ? '#FFFFFF' : heraLanding.textSecondary}
        />
      </TouchableOpacity>

      {/* List button */}
      <TouchableOpacity
        style={styles.button}
        onPress={() => onViewModeChange('list')}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityState={{ selected: viewMode === 'list' }}
        accessibilityLabel="Vista de lista"
      >
        <Ionicons
          name="list-outline"
          size={18}
          color={viewMode === 'list' ? '#FFFFFF' : heraLanding.textSecondary}
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: heraLanding.background,
    borderRadius: 10,
    padding: 4,
    position: 'relative',
    ...(Platform.OS === 'web' && {
      // @ts-ignore
      cursor: 'pointer',
    }),
  },
  indicator: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 36,
    height: 32,
    backgroundColor: heraLanding.primary,
    borderRadius: 8,
    ...shadows.sm,
  },
  button: {
    width: 36,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
});

export default ViewToggle;
