import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';
import { AnimatedPressable } from '../../../components/common/AnimatedPressable';
import { spacing } from '../../../constants/colors';
import type { Theme } from '../../../constants/theme';

export type ViewMode = 'grid' | 'list';

interface ViewToggleProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export const ViewToggle: React.FC<ViewToggleProps> = ({
  viewMode,
  onViewModeChange,
}) => {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);
  const indicatorX = useRef(new Animated.Value(viewMode === 'grid' ? 0 : 1)).current;

  useEffect(() => {
    Animated.spring(indicatorX, {
      toValue: viewMode === 'grid' ? 0 : 1,
      friction: 8,
      tension: 120,
      useNativeDriver: true,
    }).start();
  }, [indicatorX, viewMode]);

  const translateX = indicatorX.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 48],
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.indicator, { transform: [{ translateX }] }]} />

      <AnimatedPressable
        onPress={() => onViewModeChange('grid')}
        hoverLift={false}
        pressScale={0.96}
        style={styles.button}
        accessibilityLabel="Vista de cuadrícula"
      >
        <Ionicons
          name="grid-outline"
          size={18}
          color={viewMode === 'grid' ? theme.textOnPrimary : theme.textSecondary}
        />
      </AnimatedPressable>

      <AnimatedPressable
        onPress={() => onViewModeChange('list')}
        hoverLift={false}
        pressScale={0.96}
        style={styles.button}
        accessibilityLabel="Vista de lista"
      >
        <Ionicons
          name="list-outline"
          size={18}
          color={viewMode === 'list' ? theme.textOnPrimary : theme.textSecondary}
        />
      </AnimatedPressable>
    </View>
  );
};

function createStyles(theme: Theme, isDark: boolean) {
  return StyleSheet.create({
    container: {
      width: 104,
      flexDirection: 'row',
      position: 'relative',
      padding: 4,
      borderRadius: 16,
      backgroundColor: isDark ? theme.bgElevated : theme.bgCard,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    indicator: {
      position: 'absolute',
      top: 4,
      left: 4,
      width: 48,
      height: 40,
      borderRadius: 12,
      backgroundColor: theme.primary,
      shadowColor: theme.shadowPrimary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.8,
      shadowRadius: 10,
      elevation: 2,
    },
    button: {
      width: 48,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1,
    },
  });
}

export default ViewToggle;
