/**
 * SkeletonLoader Components
 * Shimmer effect loading placeholders for specialist cards
 * Provides visual feedback during data fetching
 */

import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Animated, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { heraLanding, spacing, shadows } from '../../../constants/colors';

// Shimmer animation hook
const useShimmer = () => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();

    return () => animation.stop();
  }, []);

  return shimmerAnim;
};

// Shimmer overlay component
const ShimmerOverlay: React.FC<{ shimmerAnim: Animated.Value }> = ({
  shimmerAnim,
}) => {
  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 400],
  });

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        {
          transform: [{ translateX }],
        },
      ]}
    >
      <LinearGradient
        colors={[
          'rgba(255,255,255,0)',
          'rgba(255,255,255,0.5)',
          'rgba(255,255,255,0)',
        ]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
};

// Skeleton block component
interface SkeletonBlockProps {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: any;
}

const SkeletonBlock: React.FC<SkeletonBlockProps & { shimmerAnim: Animated.Value }> = ({
  width,
  height,
  borderRadius = 4,
  style,
  shimmerAnim,
}) => (
  <View
    style={[
      {
        width,
        height,
        borderRadius,
        backgroundColor: heraLanding.border,
        overflow: 'hidden',
      },
      style,
    ]}
  >
    <ShimmerOverlay shimmerAnim={shimmerAnim} />
  </View>
);

// Grid card skeleton
export const SpecialistCardGridSkeleton: React.FC = () => {
  const shimmerAnim = useShimmer();

  return (
    <View style={gridStyles.card}>
      {/* Avatar */}
      <SkeletonBlock
        width={80}
        height={80}
        borderRadius={40}
        style={gridStyles.avatar}
        shimmerAnim={shimmerAnim}
      />

      {/* Name */}
      <SkeletonBlock
        width={140}
        height={20}
        borderRadius={10}
        style={gridStyles.name}
        shimmerAnim={shimmerAnim}
      />

      {/* Title */}
      <SkeletonBlock
        width={100}
        height={14}
        borderRadius={7}
        style={gridStyles.title}
        shimmerAnim={shimmerAnim}
      />

      {/* Meta row */}
      <View style={gridStyles.metaRow}>
        <SkeletonBlock
          width={60}
          height={16}
          borderRadius={8}
          shimmerAnim={shimmerAnim}
        />
        <SkeletonBlock
          width={50}
          height={16}
          borderRadius={8}
          shimmerAnim={shimmerAnim}
        />
      </View>

      {/* Tags */}
      <View style={gridStyles.tagsRow}>
        <SkeletonBlock
          width={60}
          height={24}
          borderRadius={12}
          shimmerAnim={shimmerAnim}
        />
        <SkeletonBlock
          width={70}
          height={24}
          borderRadius={12}
          shimmerAnim={shimmerAnim}
        />
        <SkeletonBlock
          width={50}
          height={24}
          borderRadius={12}
          shimmerAnim={shimmerAnim}
        />
      </View>

      {/* Availability */}
      <SkeletonBlock
        width={100}
        height={14}
        borderRadius={7}
        style={gridStyles.availability}
        shimmerAnim={shimmerAnim}
      />

      {/* CTA Button */}
      <SkeletonBlock
        width="100%"
        height={44}
        borderRadius={10}
        shimmerAnim={shimmerAnim}
      />
    </View>
  );
};

// List item skeleton
export const SpecialistListItemSkeleton: React.FC = () => {
  const shimmerAnim = useShimmer();

  return (
    <View style={listStyles.card}>
      {/* Avatar */}
      <SkeletonBlock
        width={64}
        height={64}
        borderRadius={32}
        shimmerAnim={shimmerAnim}
      />

      {/* Info section */}
      <View style={listStyles.infoSection}>
        <SkeletonBlock
          width={140}
          height={18}
          borderRadius={9}
          style={listStyles.name}
          shimmerAnim={shimmerAnim}
        />
        <SkeletonBlock
          width={100}
          height={12}
          borderRadius={6}
          style={listStyles.title}
          shimmerAnim={shimmerAnim}
        />
        <View style={listStyles.metaRow}>
          <SkeletonBlock
            width={50}
            height={14}
            borderRadius={7}
            shimmerAnim={shimmerAnim}
          />
          <SkeletonBlock
            width={60}
            height={14}
            borderRadius={7}
            shimmerAnim={shimmerAnim}
          />
        </View>
        <View style={listStyles.tagsRow}>
          <SkeletonBlock
            width={50}
            height={20}
            borderRadius={10}
            shimmerAnim={shimmerAnim}
          />
          <SkeletonBlock
            width={60}
            height={20}
            borderRadius={10}
            shimmerAnim={shimmerAnim}
          />
        </View>
      </View>

      {/* CTA */}
      <SkeletonBlock
        width={90}
        height={36}
        borderRadius={8}
        shimmerAnim={shimmerAnim}
      />
    </View>
  );
};

// Loading grid
interface LoadingGridProps {
  count?: number;
  viewMode?: 'grid' | 'list';
}

export const SpecialistsLoadingState: React.FC<LoadingGridProps> = ({
  count = 6,
  viewMode = 'grid',
}) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const isTablet = width >= 768 && width < 1024;

  const columns = isDesktop ? 3 : isTablet ? 2 : 1;

  if (viewMode === 'list') {
    return (
      <View style={loadingStyles.listContainer}>
        {Array.from({ length: count }).map((_, index) => (
          <SpecialistListItemSkeleton key={index} />
        ))}
      </View>
    );
  }

  // Grid layout
  const rows = Math.ceil(count / columns);

  return (
    <View style={loadingStyles.gridContainer}>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <View key={rowIndex} style={loadingStyles.row}>
          {Array.from({ length: columns }).map((_, colIndex) => {
            const itemIndex = rowIndex * columns + colIndex;
            if (itemIndex >= count) return <View key={colIndex} style={{ flex: 1 }} />;
            return <SpecialistCardGridSkeleton key={colIndex} />;
          })}
        </View>
      ))}
    </View>
  );
};

const gridStyles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 280,
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: spacing.lg,
    alignItems: 'center',
    ...shadows.sm,
  },
  avatar: {
    marginBottom: 12,
  },
  name: {
    marginBottom: 8,
  },
  title: {
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: spacing.sm,
    marginBottom: 12,
    gap: 16,
  },
  tagsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 12,
  },
  availability: {
    marginBottom: 12,
  },
});

const listStyles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    ...shadows.sm,
  },
  infoSection: {
    flex: 1,
    marginLeft: spacing.md,
    marginRight: spacing.sm,
  },
  name: {
    marginBottom: 6,
  },
  title: {
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 4,
  },
});

const loadingStyles = StyleSheet.create({
  gridContainer: {
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  listContainer: {
    gap: spacing.md,
  },
});

export default SpecialistsLoadingState;
