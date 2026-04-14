import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, DimensionValue, StyleSheet, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../../contexts/ThemeContext';
import { spacing } from '../../../constants/colors';
import type { Theme } from '../../../constants/theme';
import type { ViewMode } from './ViewToggle';

const useShimmer = () => {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 1100,
        useNativeDriver: true,
      })
    );

    animation.start();
    return () => animation.stop();
  }, [shimmer]);

  return shimmer;
};

interface BlockProps {
  width: DimensionValue;
  height: number;
  radius?: number;
}

const Block: React.FC<BlockProps> = ({ width, height, radius = 8 }) => {
  const { theme, isDark } = useTheme();
  const shimmer = useShimmer();
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);

  const translateX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-220, 260],
  });

  return (
    <View style={[styles.block, { width, height, borderRadius: radius }]}>
      <Animated.View style={[styles.shimmerWrap, { transform: [{ translateX }] }]}>
        <LinearGradient
          colors={[
            'rgba(255,255,255,0)',
            isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.44)',
            'rgba(255,255,255,0)',
          ]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
};

export const SpecialistCardGridSkeleton: React.FC = () => {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);

  return (
    <View style={styles.gridCard}>
      <Block width={72} height={72} radius={36} />
      <Block width="62%" height={24} radius={12} />
      <Block width="38%" height={16} radius={8} />
      <View style={styles.row}>
        <Block width={82} height={18} radius={9} />
        <Block width={64} height={18} radius={9} />
      </View>
      <View style={styles.row}>
        <Block width={72} height={28} radius={14} />
        <Block width={84} height={28} radius={14} />
        <Block width={56} height={28} radius={14} />
      </View>
      <Block width="48%" height={16} radius={8} />
      <Block width="100%" height={46} radius={16} />
    </View>
  );
};

export const SpecialistListItemSkeleton: React.FC = () => {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);

  return (
    <View style={styles.listCard}>
      <Block width={72} height={72} radius={36} />
      <View style={styles.listContent}>
        <Block width="44%" height={22} radius={11} />
        <Block width="28%" height={14} radius={7} />
        <View style={styles.row}>
          <Block width={80} height={16} radius={8} />
          <Block width={92} height={16} radius={8} />
          <Block width={68} height={16} radius={8} />
        </View>
        <View style={styles.row}>
          <Block width={70} height={26} radius={13} />
          <Block width={86} height={26} radius={13} />
        </View>
      </View>
      <Block width={128} height={42} radius={16} />
    </View>
  );
};

interface SpecialistsLoadingStateProps {
  count?: number;
  viewMode?: ViewMode;
}

export const SpecialistsLoadingState: React.FC<SpecialistsLoadingStateProps> = ({
  count = 6,
  viewMode = 'grid',
}) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const isTablet = width >= 768 && width < 1024;
  const columns = isDesktop ? 3 : isTablet ? 2 : 1;

  if (viewMode === 'list') {
    return (
      <View style={{ gap: spacing.md }}>
        {Array.from({ length: count }).map((_, index) => (
          <SpecialistListItemSkeleton key={index} />
        ))}
      </View>
    );
  }

  const rows = [];
  for (let i = 0; i < count; i += columns) {
    rows.push(
      <View key={i} style={{ flexDirection: 'row', gap: spacing.md }}>
        {Array.from({ length: columns }).map((_, colIndex) => (
          <View key={colIndex} style={{ flex: 1, minWidth: 280 }}>
            {i + colIndex < count ? <SpecialistCardGridSkeleton /> : null}
          </View>
        ))}
      </View>
    );
  }

  return <View style={{ gap: spacing.md }}>{rows}</View>;
};

function createStyles(theme: Theme, isDark: boolean) {
  return StyleSheet.create({
    block: {
      overflow: 'hidden',
      backgroundColor: isDark ? theme.surfaceMuted : theme.bgAlt,
    },
    shimmerWrap: {
      ...StyleSheet.absoluteFillObject,
      width: 140,
    },
    gridCard: {
      minHeight: 360,
      padding: spacing.lg,
      borderRadius: 20,
      backgroundColor: theme.bgCard,
      borderWidth: 1,
      borderColor: theme.borderLight,
      shadowColor: theme.shadowCard,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.8,
      shadowRadius: 24,
      elevation: 2,
      gap: spacing.md,
      alignItems: 'center',
    },
    listCard: {
      padding: spacing.lg,
      borderRadius: 20,
      backgroundColor: theme.bgCard,
      borderWidth: 1,
      borderColor: theme.borderLight,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    listContent: {
      flex: 1,
      gap: spacing.sm,
    },
    row: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
  });
}
