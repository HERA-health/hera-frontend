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
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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

  const gradientColors = accent === 'primary'
    ? ([theme.primary, theme.primaryDark] as const)
    : ([theme.secondary, theme.secondaryDark] as const);

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: theme.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.toggleWrap}>
        <ThemeToggleButton size="sm" showLabel />
      </View>

      <View style={[styles.content, isDesktop ? styles.contentDesktop : null]}>
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.brandSide,
            isDesktop ? styles.brandSideDesktop : styles.brandSideMobile,
          ]}
        >
          <View style={[styles.decorCircle, styles.decorCircleOne]} />
          <View style={[styles.decorCircle, styles.decorCircleTwo]} />
          <View style={[styles.decorCircle, styles.decorCircleThree]} />

          <View style={styles.brandContent}>
            <View style={styles.logoRow}>
              <View
                style={[
                  styles.logoBadge,
                  {
                    backgroundColor: isDark ? 'rgba(20, 26, 21, 0.92)' : '#FFFFFF',
                  },
                ]}
              >
                <Ionicons
                  name="heart"
                  size={isDesktop ? 36 : 28}
                  color={accent === 'primary' ? theme.primary : theme.secondary}
                />
              </View>
              <Text
                style={[
                  styles.logoText,
                  { fontFamily: theme.fontDisplayBold, color: '#FFFFFF' },
                  !isDesktop ? styles.logoTextMobile : null,
                ]}
              >
                HERA
              </Text>
            </View>

            <Text
              style={[
                styles.eyebrow,
                { fontFamily: theme.fontSansSemiBold, color: 'rgba(255,255,255,0.72)' },
              ]}
            >
              {eyebrow}
            </Text>
            <Text
              style={[
                styles.brandTitle,
                { fontFamily: theme.fontDisplayBold, color: '#FFFFFF' },
              ]}
            >
              {title}
            </Text>
            <Text
              style={[
                styles.brandSubtitle,
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
        </LinearGradient>

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
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  brandContent: {
    zIndex: 1,
  },
  decorCircle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  decorCircleOne: {
    width: 300,
    height: 300,
    top: -100,
    right: -100,
  },
  decorCircleTwo: {
    width: 200,
    height: 200,
    bottom: 50,
    left: -80,
  },
  decorCircleThree: {
    width: 150,
    height: 150,
    top: '50%',
    right: 20,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
  },
  logoBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logoText: {
    fontSize: 32,
    letterSpacing: 2,
  },
  logoTextMobile: {
    fontSize: 28,
  },
  eyebrow: {
    fontSize: 12,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  brandTitle: {
    fontSize: 36,
    lineHeight: 44,
    marginBottom: 16,
  },
  brandSubtitle: {
    fontSize: 17,
    lineHeight: 26,
    marginBottom: 40,
    maxWidth: 420,
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
  formScrollContentLarge: {
    paddingHorizontal: 40,
  },
  formContainer: {
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
  },
});
