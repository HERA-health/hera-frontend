import React from 'react';
import { View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import Ionicons from '@expo/vector-icons/Ionicons';
import flags from '../../assets/language-flags/flags.json';
import { useTheme } from '../../contexts/ThemeContext';

const languageFlags: Record<string, keyof typeof flags> = {
  spanish: 'es', english: 'gb', catalan: 'es-ct', french: 'fr', german: 'de', portuguese: 'pt',
  galician: 'es-ga', basque: 'es-pv', italian: 'it', romanian: 'ro', ukrainian: 'ua', russian: 'ru',
  polish: 'pl', dutch: 'nl', swedish: 'se', norwegian: 'no', danish: 'dk', finnish: 'fi', greek: 'gr',
  turkish: 'tr', hebrew: 'il', persian: 'ir', urdu: 'pk', hindi: 'in', bengali: 'bd', mandarin: 'cn',
  cantonese: 'hk', japanese: 'jp', korean: 'kr', vietnamese: 'vn', tagalog: 'ph',
};

// Decorative reference only: the language name remains the accessible label.
export function LanguageIcon({ language }: { language: string }) {
  const { theme } = useTheme();
  const flag = languageFlags[language];
  return <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: 24, height: 18, justifyContent: 'center', alignItems: 'center', flexShrink: 0, borderRadius: 3, overflow: 'hidden' }}>
    {flag ? <SvgXml xml={flags[flag]} width={24} height={18} /> : <Ionicons name={language.endsWith('-sign') ? 'hand-left-outline' : 'globe-outline'} size={18} color={theme.primary} />}
  </View>;
}
export const renderLanguageIcon = (language: string) => <LanguageIcon language={language} />;
