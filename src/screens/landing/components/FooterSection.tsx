import { PrivacyControlsContext } from '../../../components/common/PrivacyPreferences';
import React from 'react';
import {
  Linking,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AnimatedPressable } from '../../../components/common/AnimatedPressable';
import { StyledLogo } from '../../../components/common/StyledLogo';
import { footerColumns, footerDescription, footerSocialLinks, footerTagline, type FooterLink, type FooterAction } from '../../../constants/publicFooter';
import { useTheme } from '../../../contexts/ThemeContext';
import type { FooterSectionProps } from '../types';

export const FooterSection: React.FC<FooterSectionProps> = ({
  onFindSpecialist,
  professionalActionLabel,
  professionalActionHref,
  professionalLoginHref,
  onProfessionalAction,
  onProfessionalLogin,
  onScrollToSection,
  onViewPlans,
}) => {
  const openPrivacy = React.useContext(PrivacyControlsContext);
  const { width } = useWindowDimensions();
  const { theme } = useTheme();
  const isDesktop = width >= 1024;
  const isTablet = width >= 700;

  const columns = footerColumns(professionalActionLabel, professionalActionHref, professionalLoginHref);
  const actions: Record<FooterAction, (() => void) | undefined> = {
    directory: onFindSpecialist, professional: onProfessionalAction, access: onProfessionalLogin,
    plans: onViewPlans, privacy: openPrivacy ?? undefined,
  };
  const handleLinkPress = (link: FooterLink) => {
    if (link.action) actions[link.action]?.();
    else if (link.section) onScrollToSection?.(link.section);
    else void Linking.openURL(link.href.startsWith('/') ? 'https://www.health-hera.com' + link.href : link.href);
  };

  const renderLink = (link: FooterLink) => {
    const linkText = (
      <Text
        style={[
          styles.linkText,
          { color: theme.textSecondary, fontFamily: theme.fontSans },
        ]}
      >
        {link.label}
      </Text>
    );

    return (
      <AnimatedPressable
        key={link.label}
        onPress={() => handleLinkPress(link)}
        href={link.action === 'privacy' ? undefined : link.href}
        hoverLift={false}
        pressScale={0.98}
        accessibilityRole="link"
        accessibilityLabel={link.label}
        style={styles.link}
      >
        {linkText}
      </AnimatedPressable>
    );
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.bgAlt, borderTopColor: theme.border },
      ]}
    >
      <View style={styles.content}>
        <View style={[styles.main, isDesktop && styles.mainDesktop]}>
          <View style={styles.brand}>
            <StyledLogo size={54} />
            <Text
              style={[
                styles.tagline,
                { color: theme.textPrimary, fontFamily: theme.fontDisplay },
              ]}
            >
              {footerTagline}
            </Text>
            <Text
              style={[
                styles.description,
                { color: theme.textSecondary, fontFamily: theme.fontSans },
              ]}
            >
              {footerDescription}
            </Text>
            <View style={styles.socialLinks}>
              {footerSocialLinks.map((socialLink) => (
                <AnimatedPressable
                  key={socialLink.label}
                  onPress={() => {
                    void Linking.openURL(socialLink.href).catch(() => undefined);
                  }}
                  hoverLift={false}
                  pressScale={0.96}
                  accessibilityRole="link"
                  accessibilityLabel={socialLink.label}
                  style={[
                    styles.socialButton,
                    {
                      backgroundColor: theme.primaryAlpha12,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <Ionicons name={socialLink.icon} size={19} color={theme.primary} />
                </AnimatedPressable>
              ))}
            </View>
            <Text style={[styles.copyright, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>
              © {new Date().getFullYear()} HERA
            </Text>
          </View>

          <View style={[styles.columns, isTablet && styles.columnsWide]}>
            {columns.map((column) => (
              <View key={column.title} style={styles.column}>
                <Text
                  style={[
                    styles.columnTitle,
                    { color: theme.textPrimary, fontFamily: theme.fontSansBold },
                  ]}
                >
                  {column.title}
                </Text>
                {column.links.filter(link => (!link.action || actions[link.action]) && (!link.section || onScrollToSection)).map(renderLink)}
              </View>
            ))}
          </View>
        </View>

      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 64,
    paddingBottom: 28,
    paddingHorizontal: 20,
    borderTopWidth: 1,
  },
  content: {
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
  },
  main: {
    gap: 44,
  },
  mainDesktop: {
    flexDirection: 'row',
    gap: 78,
  },
  brand: {
    width: '100%',
    maxWidth: 340,
  },
  tagline: {
    fontSize: 24,
    lineHeight: 31,
    marginTop: 18,
    marginBottom: 11,
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 20,
  },
  socialLinks: {
    flexDirection: 'row',
    gap: 10,
  },
  socialButton: {
    width: 44,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  columns: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 32,
  },
  columnsWide: {
    justifyContent: 'space-between',
  },
  column: {
    minWidth: 145,
    flexGrow: 1,
  },
  columnTitle: {
    fontSize: 13,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    marginBottom: 15,
  },
  link: {
    alignSelf: 'flex-start',
  },
  linkText: {
    fontSize: 14,
    lineHeight: 24,
    marginBottom: 11,
  },
  copyright: {
    marginTop: 12,
    fontSize: 13,
  },
});
