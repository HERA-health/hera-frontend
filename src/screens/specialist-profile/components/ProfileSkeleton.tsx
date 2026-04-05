/**
 * ProfileSkeleton - Shimmer skeleton loader for profile screens
 * Replaces ActivityIndicator during data loading
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Animated,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { ProfileSkeletonProps } from '../types';
import { heraLanding, spacing, borderRadius } from '../../../constants/colors';

const DESKTOP_BREAKPOINT = 768;

const useShimmer = () => {
  const shimmerAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 0.9,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0.4,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim]);

  return shimmerAnim;
};

interface ShimmerBlockProps {
  width?: number | string;
  height: number;
  borderRadius?: number;
  style?: object;
  shimmerAnim: Animated.Value;
}

const ShimmerBlock: React.FC<ShimmerBlockProps> = ({
  width = '100%',
  height,
  borderRadius: br = borderRadius.md,
  style,
  shimmerAnim,
}) => (
  <Animated.View
    style={[
      {
        width: width as number | string,
        height,
        borderRadius: br,
        backgroundColor: heraLanding.disabled,
        opacity: shimmerAnim,
      },
      style,
    ]}
  />
);

export const ProfileSkeleton: React.FC<ProfileSkeletonProps> = ({ isDesktop }) => {
  const shimmerAnim = useShimmer();
  const { width } = useWindowDimensions();
  const desktop = isDesktop ?? width >= DESKTOP_BREAKPOINT;

  return (
    <View style={styles.container}>
      {/* Hero area */}
      <ShimmerBlock
        height={desktop ? 300 : 260}
        borderRadius={borderRadius.lg}
        shimmerAnim={shimmerAnim}
      />

      {/* Content cards */}
      <View style={styles.cardsContainer}>
        {/* Card 1 - About */}
        <View style={styles.card}>
          <ShimmerBlock width="60%" height={20} shimmerAnim={shimmerAnim} />
          <View style={styles.cardSpacer} />
          <ShimmerBlock width="100%" height={14} shimmerAnim={shimmerAnim} />
          <View style={styles.lineSpace} />
          <ShimmerBlock width="90%" height={14} shimmerAnim={shimmerAnim} />
          <View style={styles.lineSpace} />
          <ShimmerBlock width="75%" height={14} shimmerAnim={shimmerAnim} />
        </View>

        {/* Card 2 - Specializations */}
        <View style={styles.card}>
          <ShimmerBlock width="50%" height={20} shimmerAnim={shimmerAnim} />
          <View style={styles.cardSpacer} />
          <View style={styles.tagsRow}>
            <ShimmerBlock width={80} height={28} borderRadius={14} shimmerAnim={shimmerAnim} />
            <ShimmerBlock width={100} height={28} borderRadius={14} shimmerAnim={shimmerAnim} />
            <ShimmerBlock width={70} height={28} borderRadius={14} shimmerAnim={shimmerAnim} />
          </View>
        </View>

        {/* Card 3 - Experience */}
        <View style={styles.card}>
          <ShimmerBlock width="55%" height={20} shimmerAnim={shimmerAnim} />
          <View style={styles.cardSpacer} />
          <ShimmerBlock width="80%" height={14} shimmerAnim={shimmerAnim} />
          <View style={styles.lineSpace} />
          <ShimmerBlock width="65%" height={14} shimmerAnim={shimmerAnim} />
          <View style={styles.lineSpace} />
          <ShimmerBlock width="70%" height={14} shimmerAnim={shimmerAnim} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: heraLanding.background,
    padding: spacing.lg,
  },
  cardsContainer: {
    marginTop: spacing.xl,
    gap: spacing.lg,
  },
  card: {
    backgroundColor: heraLanding.cardBg,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
  },
  cardSpacer: {
    height: spacing.md,
  },
  lineSpace: {
    height: spacing.sm,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});

export default ProfileSkeleton;
