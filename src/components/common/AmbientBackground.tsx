/**
 * AmbientBackground — Decorative gradient blobs
 *
 * Creates depth and a "startup premium" feel by placing large,
 * blurred gradient ellipses in the background. Absolute positioned,
 * zIndex -1, pointerEvents: none.
 *
 * Uses react-native-svg RadialGradient + feGaussianBlur for cross-platform
 * support (no Skia dependency for web compatibility).
 *
 * Variants:
 *  - 'landing': Large sage blob top-right + lavender blob bottom-left
 *  - 'home': Medium sage blob centered-top + small lavender bottom
 *  - 'subtle': Single very faint centered blob
 *  - 'auth': Soft full-screen gradient
 *
 * Usage:
 *   <View style={{ flex: 1 }}>
 *     <AmbientBackground variant="landing" />
 *     {/* content *\/}
 *   </View>
 */

import React from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, {
  Defs,
  RadialGradient,
  Stop,
  Ellipse,
  Filter,
  FeGaussianBlur,
} from 'react-native-svg';
import { useTheme } from '../../contexts/ThemeContext';

// ─── Types ────────────────────────────────────────────────────────────────────

type AmbientVariant = 'landing' | 'home' | 'subtle' | 'auth';

interface AmbientBackgroundProps {
  variant?: AmbientVariant;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AmbientBackground({ variant = 'subtle' }: AmbientBackgroundProps) {
  const { width: screenW, height: screenH } = useWindowDimensions();
  const { isDark, theme } = useTheme();

  // Color stops vary by dark/light
  const sageStart = isDark ? theme.primary : '#8B9D83';
  const lavStart  = isDark ? theme.secondary : '#B8A8D9';

  const blobs = getBlobConfig(variant, screenW, screenH, sageStart, lavStart, isDark);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg
        width={screenW}
        height={screenH}
        style={StyleSheet.absoluteFill}
      >
        <Defs>
          {blobs.map((blob) => (
            <Filter key={`filter-${blob.id}`} id={`blur-${blob.id}`}>
              <FeGaussianBlur stdDeviation={blob.blur} />
            </Filter>
          ))}
          {blobs.map((blob) => (
            <RadialGradient
              key={`grad-${blob.id}`}
              id={`grad-${blob.id}`}
              cx="50%"
              cy="50%"
              r="50%"
            >
              <Stop offset="0%" stopColor={blob.colorStart} stopOpacity={blob.opacity} />
              <Stop offset="100%" stopColor={blob.colorStart} stopOpacity={0} />
            </RadialGradient>
          ))}
        </Defs>

        {blobs.map((blob) => (
          <Ellipse
            key={blob.id}
            cx={blob.cx}
            cy={blob.cy}
            rx={blob.rx}
            ry={blob.ry}
            fill={`url(#grad-${blob.id})`}
            filter={`url(#blur-${blob.id})`}
          />
        ))}
      </Svg>
    </View>
  );
}

// ─── Blob configurations ──────────────────────────────────────────────────────

interface BlobConfig {
  id: string;
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  blur: number;
  colorStart: string;
  opacity: number;
}

function getBlobConfig(
  variant: AmbientVariant,
  w: number,
  h: number,
  sage: string,
  lav: string,
  isDark: boolean,
): BlobConfig[] {
  const baseOpacity = isDark ? 0.20 : 0.14;
  const subtleOpacity = isDark ? 0.12 : 0.08;

  switch (variant) {
    case 'landing':
      return [
        {
          id: 'sage-landing',
          cx: w * 0.88,
          cy: h * 0.12,
          rx: w * 0.58,
          ry: h * 0.34,
          blur: 64,
          colorStart: sage,
          opacity: baseOpacity,
        },
        {
          id: 'lav-landing',
          cx: w * 0.10,
          cy: h * 0.84,
          rx: w * 0.52,
          ry: h * 0.32,
          blur: 64,
          colorStart: lav,
          opacity: baseOpacity * 0.72,
        },
      ];

    case 'home':
      return [
        {
          id: 'sage-home',
          cx: w * 0.82,
          cy: h * 0.08,
          rx: w * 0.42,
          ry: h * 0.18,
          blur: 54,
          colorStart: sage,
          opacity: subtleOpacity * 1.1,
        },
        {
          id: 'lav-home',
          cx: w * 0.15,
          cy: h * 0.72,
          rx: w * 0.28,
          ry: h * 0.16,
          blur: 58,
          colorStart: lav,
          opacity: subtleOpacity * 0.7,
        },
      ];

    case 'auth':
      return [
        {
          id: 'sage-auth',
          cx: w * 0.5,
          cy: h * 0.18,
          rx: w * 0.64,
          ry: h * 0.28,
          blur: 68,
          colorStart: sage,
          opacity: subtleOpacity * 1.15,
        },
        {
          id: 'lav-auth',
          cx: w * 0.84,
          cy: h * 0.78,
          rx: w * 0.36,
          ry: h * 0.24,
          blur: 62,
          colorStart: lav,
          opacity: subtleOpacity * 0.8,
        },
      ];

    case 'subtle':
    default:
      return [
        {
          id: 'sage-subtle',
          cx: w * 0.82,
          cy: h * 0.10,
          rx: w * 0.30,
          ry: h * 0.14,
          blur: 56,
          colorStart: sage,
          opacity: subtleOpacity,
        },
      ];
  }
}
