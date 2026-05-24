import React from 'react';
import {
  Image,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
  View,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

interface StyledLogoProps {
  size?: number;
  variant?: 'wordmark' | 'mark';
  tone?: BrandLogoTone;
  tintColor?: string;
  style?: StyleProp<ViewStyle>;
}

type BrandLogoTone =
  | 'brand'
  | 'blueLight'
  | 'beigeLight'
  | 'beigeDark'
  | 'greenLight'
  | 'greenDark';

interface BrandAssetMeta {
  source: ImageSourcePropType;
  canvas: {
    width: number;
    height: number;
  };
  content: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

const WORDMARK_DISPLAY_ASPECT_RATIO = 530 / 226;
const CANVAS_16_9 = { width: 1920, height: 1080 };

// The brand PNG exports are 1920x1080 artboards with the actual mark centered.
// These bounds crop the transparent artboard at render time without mutating assets.
const WORDMARK_ASSETS: Record<BrandLogoTone, BrandAssetMeta> = {
  brand: {
    source: require('../../../assets/main-logo.png'),
    canvas: CANVAS_16_9,
    content: { x: 734, y: 482, width: 451, height: 103 },
  },
  blueLight: {
    source: require('../../../assets/Logo-Hera-azul-claro.png'),
    canvas: CANVAS_16_9,
    content: { x: 806, y: 422, width: 452, height: 103 },
  },
  beigeLight: {
    source: require('../../../assets/Logo-Hera-beige-claro.png'),
    canvas: CANVAS_16_9,
    content: { x: 734, y: 482, width: 451, height: 103 },
  },
  beigeDark: {
    source: require('../../../assets/Logo-Hera-beige-oscuro.png'),
    canvas: CANVAS_16_9,
    content: { x: 734, y: 482, width: 451, height: 103 },
  },
  greenLight: {
    source: require('../../../assets/Logo-Hera-verde-claro.png'),
    canvas: CANVAS_16_9,
    content: { x: 734, y: 482, width: 451, height: 103 },
  },
  greenDark: {
    source: require('../../../assets/Logo-Hera-verde-oscuro.png'),
    canvas: CANVAS_16_9,
    content: { x: 734, y: 482, width: 451, height: 103 },
  },
};

const MARK_ASSETS: Record<BrandLogoTone, BrandAssetMeta> = {
  brand: {
    source: require('../../../assets/Isotipo-Hera-Azul-oscuro-original.png'),
    canvas: CANVAS_16_9,
    content: { x: 918, y: 497, width: 84, height: 86 },
  },
  blueLight: {
    source: require('../../../assets/Isotipo-Hera-Azul-claro.png'),
    canvas: CANVAS_16_9,
    content: { x: 910, y: 489, width: 100, height: 102 },
  },
  beigeLight: {
    source: require('../../../assets/Isotipo-Hera-beige-claro.png'),
    canvas: CANVAS_16_9,
    content: { x: 911, y: 489, width: 98, height: 102 },
  },
  beigeDark: {
    source: require('../../../assets/Isotipo-Hera-beige-claro.png'),
    canvas: CANVAS_16_9,
    content: { x: 911, y: 489, width: 98, height: 102 },
  },
  greenLight: {
    source: require('../../../assets/Isotipo-Hera-verde-claro.png'),
    canvas: CANVAS_16_9,
    content: { x: 910, y: 489, width: 100, height: 102 },
  },
  greenDark: {
    source: require('../../../assets/Isotipo-Hera-verde-oscuro.png'),
    canvas: CANVAS_16_9,
    content: { x: 910, y: 489, width: 100, height: 102 },
  },
};

function getDefaultTone(isDark: boolean): BrandLogoTone {
  return isDark ? 'beigeDark' : 'brand';
}

export const StyledLogo: React.FC<StyledLogoProps> = ({
  size = 120,
  variant = 'wordmark',
  tone,
  tintColor,
  style,
}) => {
  const { isDark } = useTheme();
  const selectedTone = tone ?? getDefaultTone(isDark);
  const asset = variant === 'mark'
    ? MARK_ASSETS[selectedTone]
    : WORDMARK_ASSETS[selectedTone];
  const wrapperWidth = variant === 'mark' ? size : size * WORDMARK_DISPLAY_ASPECT_RATIO;
  const wrapperHeight = size;
  const contentScale = Math.min(
    wrapperWidth / asset.content.width,
    wrapperHeight / asset.content.height,
  );
  const renderedContentWidth = asset.content.width * contentScale;
  const renderedContentHeight = asset.content.height * contentScale;
  const imageWidth = asset.canvas.width * contentScale;
  const imageHeight = asset.canvas.height * contentScale;
  const imageLeft = -asset.content.x * contentScale
    + (wrapperWidth - renderedContentWidth) / 2;
  const imageTop = -asset.content.y * contentScale
    + (wrapperHeight - renderedContentHeight) / 2;

  return (
    <View
      style={[
        {
          width: wrapperWidth,
          height: wrapperHeight,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Image
        source={asset.source}
        style={{
          position: 'absolute',
          width: imageWidth,
          height: imageHeight,
          left: imageLeft,
          top: imageTop,
          tintColor,
        }}
        resizeMode="stretch"
      />
    </View>
  );
};
