import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, DimensionValue, StyleSheet, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ProfileSkeletonProps } from '../types';
import { spacing } from '../../../constants/colors';
import { useTheme } from '../../../contexts/ThemeContext';
import type { Theme } from '../../../constants/theme';

const DESKTOP_BREAKPOINT = 768;

const useShimmer = () => {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 1100,
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [shimmer]);

  return shimmer;
};

interface BlockProps {
  width?: DimensionValue;
  height: number;
  radius?: number;
}

const Block: React.FC<BlockProps> = ({ width = '100%', height, radius = 10 }) => {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);
  const shimmer = useShimmer();

  const translateX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-220, 260],
  });

  return (
    <View style={[styles.block, { width, height, borderRadius: radius }]}>
      <Animated.View style={[styles.shimmer, { transform: [{ translateX }] }]}>
        <LinearGradient
          colors={[
            'rgba(255,255,255,0)',
            isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.42)',
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

export const ProfileSkeleton: React.FC<ProfileSkeletonProps> = ({ isDesktop }) => {
  const { width } = useWindowDimensions();
  const desktop = isDesktop ?? width >= DESKTOP_BREAKPOINT;
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);

  return (
    <View style={styles.container}>
      <Block height={desktop ? 320 : 280} radius={28} />

      <View style={styles.cards}>
        <View style={styles.card}>
          <Block width="54%" height={24} radius={12} />
          <Block height={16} />
          <Block width="88%" height={16} />
          <Block width="72%" height={16} />
        </View>

        <View style={styles.card}>
          <Block width="44%" height={24} radius={12} />
          <View style={styles.tagRow}>
            <Block width={88} height={30} radius={15} />
            <Block width={112} height={30} radius={15} />
            <Block width={76} height={30} radius={15} />
          </View>
        </View>

        <View style={styles.card}>
          <Block width="50%" height={24} radius={12} />
          <Block width="90%" height={16} />
          <Block width="68%" height={16} />
          <Block width="76%" height={16} />
        </View>
      </View>
    </View>
  );
};

function createStyles(theme: Theme, isDark: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
      padding: spacing.lg,
      backgroundColor: theme.bg,
    },
    cards: {
      marginTop: spacing.xl,
      gap: spacing.lg,
    },
    card: {
      gap: spacing.md,
      padding: spacing.xl,
      borderRadius: 24,
      backgroundColor: theme.bgCard,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    tagRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    block: {
      overflow: 'hidden',
      backgroundColor: isDark ? theme.surfaceMuted : theme.bgAlt,
    },
    shimmer: {
      ...StyleSheet.absoluteFillObject,
      width: 140,
    },
  });
}

export default ProfileSkeleton;
