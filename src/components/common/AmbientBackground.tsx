/**
 * AmbientBackground - Decorative gradient blobs
 *
 * Creates depth and a premium feel in the background.
 * On web we use CSS radial gradients to keep paint cost low.
 * On native we keep the SVG version for parity.
 */

import React from 'react';
import {
  Platform,
  StyleSheet,
  View,
  ViewStyle,
  useWindowDimensions,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

type AmbientVariant = 'landing' | 'home' | 'subtle' | 'auth';

interface AmbientBackgroundProps {
  variant?: AmbientVariant;
}

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

const hexToRgba = (color: string, opacity: number): string => {
  const normalized = color.replace('#', '');

  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return color;
  }

  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

const buildWebGradientStyle = (
  blobs: BlobConfig[],
  width: number,
  height: number
): ViewStyle => {
  const backgroundImage = blobs
    .map((blob) => {
      const x = Math.round((blob.cx / width) * 100);
      const y = Math.round((blob.cy / height) * 100);
      const radiusX = Math.max(24, Math.round((blob.rx / width) * 100));
      const radiusY = Math.max(18, Math.round((blob.ry / height) * 100));
      const start = hexToRgba(blob.colorStart, blob.opacity);
      const end = hexToRgba(blob.colorStart, 0);

      return `radial-gradient(${radiusX}% ${radiusY}% at ${x}% ${y}%, ${start} 0%, ${end} 72%)`;
    })
    .join(', ');

  return {
    backgroundImage,
    backgroundRepeat: 'no-repeat',
  } as unknown as ViewStyle;
};

const NativeAmbientSvg: React.FC<{ blobs: BlobConfig[]; height: number; width: number }> = ({
  blobs,
  height,
  width,
}) => {
  const SvgModule = require('react-native-svg') as typeof import('react-native-svg');
  const Svg = SvgModule.default;
  const { Defs, RadialGradient, Stop, Ellipse, Filter, FeGaussianBlur } = SvgModule;

  return (
    <Svg
      width={width}
      height={height}
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
  );
};

export function AmbientBackground({ variant = 'subtle' }: AmbientBackgroundProps) {
  const { width: screenW, height: screenH } = useWindowDimensions();
  const { isDark, theme } = useTheme();

  const sageStart = isDark ? theme.primary : '#8B9D83';
  const lavStart = isDark ? theme.secondary : '#B8A8D9';

  const blobs = getBlobConfig(variant, screenW, screenH, sageStart, lavStart, isDark);

  if (Platform.OS === 'web') {
    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View
          style={[
            StyleSheet.absoluteFill,
            styles.webLayer,
            buildWebGradientStyle(blobs, screenW, screenH),
          ]}
        />
      </View>
    );
  }

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <NativeAmbientSvg blobs={blobs} height={screenH} width={screenW} />
    </View>
  );
}

function getBlobConfig(
  variant: AmbientVariant,
  width: number,
  height: number,
  sage: string,
  lavender: string,
  isDark: boolean
): BlobConfig[] {
  const baseOpacity = isDark ? 0.2 : 0.14;
  const subtleOpacity = isDark ? 0.12 : 0.08;

  switch (variant) {
    case 'landing':
      return [
        {
          id: 'sage-landing',
          cx: width * 0.88,
          cy: height * 0.12,
          rx: width * 0.58,
          ry: height * 0.34,
          blur: 64,
          colorStart: sage,
          opacity: baseOpacity,
        },
        {
          id: 'lav-landing',
          cx: width * 0.1,
          cy: height * 0.84,
          rx: width * 0.52,
          ry: height * 0.32,
          blur: 64,
          colorStart: lavender,
          opacity: baseOpacity * 0.72,
        },
      ];

    case 'home':
      return [
        {
          id: 'sage-home',
          cx: width * 0.82,
          cy: height * 0.08,
          rx: width * 0.42,
          ry: height * 0.18,
          blur: 54,
          colorStart: sage,
          opacity: subtleOpacity * 1.1,
        },
        {
          id: 'lav-home',
          cx: width * 0.15,
          cy: height * 0.72,
          rx: width * 0.28,
          ry: height * 0.16,
          blur: 58,
          colorStart: lavender,
          opacity: subtleOpacity * 0.7,
        },
      ];

    case 'auth':
      return [
        {
          id: 'sage-auth',
          cx: width * 0.5,
          cy: height * 0.18,
          rx: width * 0.64,
          ry: height * 0.28,
          blur: 68,
          colorStart: sage,
          opacity: subtleOpacity * 1.15,
        },
        {
          id: 'lav-auth',
          cx: width * 0.84,
          cy: height * 0.78,
          rx: width * 0.36,
          ry: height * 0.24,
          blur: 62,
          colorStart: lavender,
          opacity: subtleOpacity * 0.8,
        },
      ];

    case 'subtle':
    default:
      return [
        {
          id: 'sage-subtle',
          cx: width * 0.82,
          cy: height * 0.1,
          rx: width * 0.3,
          ry: height * 0.14,
          blur: 56,
          colorStart: sage,
          opacity: subtleOpacity,
        },
      ];
  }
}

const styles = StyleSheet.create({
  webLayer: {
    opacity: 0.96,
  },
});
