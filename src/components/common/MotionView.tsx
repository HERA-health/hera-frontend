/**
 * MotionView — Declarative Reanimated wrapper
 *
 * Drop-in replacement for Animated.View entrance animations.
 * Uses Reanimated 4 entering/exiting animations with spring physics.
 *
 * Usage:
 *   <MotionView entering="fadeInUp" delay={100}>
 *     <Card />
 *   </MotionView>
 */

import React from 'react';
import Animated, {
  FadeInDown,
  FadeInUp,
  FadeIn,
  ZoomIn,
  SlideInRight,
  FadeOutDown,
  FadeOut,
} from 'react-native-reanimated';
import { ViewStyle } from 'react-native';

// ─── Types ────────────────────────────────────────────────────────────────────

type EnteringPreset = 'fadeInUp' | 'fadeInDown' | 'fadeIn' | 'zoomIn' | 'slideInRight';
type ExitingPreset = 'fadeOutDown' | 'fadeOut';

interface MotionViewProps {
  children: React.ReactNode;
  entering?: EnteringPreset;
  exiting?: ExitingPreset;
  delay?: number;
  duration?: number;
  /** Spring damping — lower = more bounce (default 20) */
  damping?: number;
  style?: ViewStyle | ViewStyle[];
}

// ─── Preset maps ──────────────────────────────────────────────────────────────

const ENTERING_MAP = {
  fadeInUp: FadeInUp,
  fadeInDown: FadeInDown,
  fadeIn: FadeIn,
  zoomIn: ZoomIn,
  slideInRight: SlideInRight,
} as const;

const EXITING_MAP = {
  fadeOutDown: FadeOutDown,
  fadeOut: FadeOut,
} as const;

// ─── Component ────────────────────────────────────────────────────────────────

export function MotionView({
  children,
  entering = 'fadeInUp',
  exiting,
  delay = 0,
  duration = 400,
  damping = 20,
  style,
}: MotionViewProps) {
  const EnteringClass = ENTERING_MAP[entering];
  const enteringAnim = EnteringClass
    .duration(duration)
    .delay(delay)
    .springify()
    .damping(damping);

  const exitingAnim = exiting ? EXITING_MAP[exiting].duration(250) : undefined;

  return (
    <Animated.View
      entering={enteringAnim}
      exiting={exitingAnim}
      style={style}
    >
      {children}
    </Animated.View>
  );
}

// ─── Convenience: staggered list wrapper ──────────────────────────────────────

interface MotionListProps {
  children: React.ReactNode[];
  entering?: EnteringPreset;
  stagger?: number;       // ms between each child
  initialDelay?: number;  // ms before first child
  duration?: number;
  style?: ViewStyle;
}

/**
 * Wraps each child in a MotionView with staggered delay.
 * Use for lists of cards, feature rows, etc.
 */
export function MotionList({
  children,
  entering = 'fadeInUp',
  stagger = 80,
  initialDelay = 0,
  duration = 380,
  style,
}: MotionListProps) {
  return (
    <>
      {React.Children.map(children, (child, index) => (
        <MotionView
          entering={entering}
          delay={initialDelay + index * stagger}
          duration={duration}
          style={style}
        >
          {child}
        </MotionView>
      ))}
    </>
  );
}
