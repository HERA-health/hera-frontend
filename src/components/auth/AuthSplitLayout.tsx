import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../contexts/ThemeContext';
import { ThemeToggleButton } from '../common/ThemeToggleButton';
import { spacing } from '../../constants/colors';

interface AuthFeature {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
}

interface AuthSplitLayoutProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  accent: 'primary' | 'secondary';
  features: AuthFeature[];
  form: React.ReactNode;
  footer?: React.ReactNode;
}

export function AuthSplitLayout({
  eyebrow,
  title,
  subtitle,
  accent,
  features,
  form,
  footer,
}: AuthSplitLayoutProps): React.ReactElement {
  const { width } = useWindowDimensions();
  const { theme, isDark } = useTheme();
  const isDesktop = width >= 768;
  const isLargeDesktop = width >= 1200;
  const isMobile = width < 768;
  const isCompactMobile = width < 420;

  const brandSideColor = accent === 'primary'
    ? (isDark ? theme.primaryMuted : theme.primary)
    : (isDark ? theme.secondaryMuted : theme.secondaryDark);

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: theme.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.toggleWrap}>
        <ThemeToggleButton size="sm" showLabel />
      </View>

      <View style={[styles.content, isDesktop ? styles.contentDesktop : null]}>
        <View
          style={[
            styles.brandSide,
            isDesktop ? styles.brandSideDesktop : styles.brandSideMobile,
            isCompactMobile ? styles.brandSidePhone : null,
            { backgroundColor: brandSideColor },
          ]}
        >
          <View style={[styles.brandContent, !isDesktop ? styles.brandContentMobile : null]}>
            <View style={[styles.logoRow, isMobile ? styles.logoRowMobile : null]}>
              <View
                style={[
                  styles.logoBadge,
                  isMobile ? styles.logoBadgeMobile : null,
                  {
                    backgroundColor: isDark ? theme.bgElevated : theme.bgCard,
                  },
                ]}
              >
                <Ionicons
                  name="heart"
                  size={isDesktop ? 36 : isCompactMobile ? 24 : 26}
                  color={accent === 'primary' ? theme.primary : theme.secondaryDark}
                />
              </View>
              <Text
                style={[
                  styles.logoText,
                  { fontFamily: theme.fontDisplayBold, color: '#FFFFFF' },
                  !isDesktop ? styles.logoTextMobile : null,
                  isCompactMobile ? styles.logoTextCompactMobile : null,
                ]}
              >
                HERA
              </Text>
            </View>

            <Text
              style={[
                styles.eyebrow,
                isMobile ? styles.eyebrowMobile : null,
                { fontFamily: theme.fontSansSemiBold, color: 'rgba(255,255,255,0.72)' },
              ]}
            >
              {eyebrow}
            </Text>
            <Text
              style={[
                styles.brandTitle,
                isMobile ? styles.brandTitleMobile : null,
                isCompactMobile ? styles.brandTitleCompactMobile : null,
                { fontFamily: theme.fontDisplayBold, color: '#FFFFFF' },
              ]}
            >
              {title}
            </Text>
            <Text
              style={[
                styles.brandSubtitle,
                isMobile ? styles.brandSubtitleMobile : null,
                { fontFamily: theme.fontSans, color: 'rgba(255,255,255,0.9)' },
              ]}
            >
              {subtitle}
            </Text>

            {isDesktop && (
              <View style={styles.featureList}>
                {features.map((feature) => (
                  <View key={feature.title} style={styles.featureRow}>
                    <View style={styles.featureIconWrap}>
                      <Ionicons name={feature.icon} size={18} color="#FFFFFF" />
                    </View>
                    <Text
                      style={[
                        styles.featureText,
                        { fontFamily: theme.fontSansMedium, color: 'rgba(255,255,255,0.95)' },
                      ]}
                    >
                      {feature.title}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        <View
          style={[
            styles.formSide,
            isDesktop ? styles.formSideDesktop : null,
            {
              backgroundColor: theme.bg,
              borderLeftColor: isDesktop ? theme.border : 'transparent',
            },
          ]}
        >
          <ScrollView
            style={styles.formScroll}
            contentContainerStyle={[
              styles.formScrollContent,
              isMobile ? styles.formScrollContentMobile : null,
              isLargeDesktop ? styles.formScrollContentLarge : null,
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.formContainer}>
              {form}
              {footer}
            </View>
          </ScrollView>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  toggleWrap: {
    position: 'absolute',
    top: 18,
    right: 18,
    zIndex: 20,
  },
  content: {
    flex: 1,
  },
  contentDesktop: {
    flexDirection: 'row',
  },
  brandSide: {
    overflow: 'hidden',
    position: 'relative',
  },
  brandSideDesktop: {
    width: '40%',
    minHeight: '100%',
    justifyContent: 'center',
    paddingHorizontal: 48,
  },
  brandSideMobile: {
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  brandSidePhone: {
    paddingTop: 22,
    paddingBottom: 24,
    paddingHorizontal: 24,
    alignItems: 'stretch',
  },
  brandContent: {
    zIndex: 1,
  },
  brandContentMobile: {
    width: '100%',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
  },
  logoRowMobile: {
    marginBottom: 20,
  },
  logoBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logoBadgeMobile: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  logoText: {
    fontSize: 32,
    letterSpacing: 0,
  },
  logoTextMobile: {
    fontSize: 28,
  },
  logoTextCompactMobile: {
    fontSize: 26,
  },
  eyebrow: {
    fontSize: 12,
    letterSpacing: 0,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  eyebrowMobile: {
    fontSize: 11,
    marginBottom: 8,
  },
  brandTitle: {
    fontSize: 36,
    lineHeight: 44,
    marginBottom: 16,
  },
  brandTitleMobile: {
    fontSize: 32,
    lineHeight: 39,
    marginBottom: 12,
  },
  brandTitleCompactMobile: {
    fontSize: 30,
    lineHeight: 37,
  },
  brandSubtitle: {
    fontSize: 17,
    lineHeight: 26,
    marginBottom: 40,
    maxWidth: 420,
  },
  brandSubtitleMobile: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 0,
  },
  featureList: {
    gap: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  featureText: {
    fontSize: 15,
  },
  formSide: {
    flex: 1,
  },
  formSideDesktop: {
    width: '60%',
    borderLeftWidth: 1,
  },
  formScroll: {
    flex: 1,
  },
  formScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    paddingTop: 84,
    paddingBottom: 48,
  },
  formScrollContentMobile: {
    justifyContent: 'flex-start',
    paddingTop: 28,
    paddingBottom: 36,
  },
  formScrollContentLarge: {
    paddingHorizontal: 40,
  },
  formContainer: {
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
  },
});
