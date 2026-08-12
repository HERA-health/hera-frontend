import type { ImageSourcePropType } from 'react-native';

export const PROFESSIONAL_PREVIEW_IMAGES: Readonly<{
  light: ImageSourcePropType;
  dark: ImageSourcePropType;
}> = {
  light: require('../../../assets/onboarding/inicio-especialistas.png') as ImageSourcePropType,
  dark: require('../../../assets/onboarding/inicio-especialistas-dark.png') as ImageSourcePropType,
};
