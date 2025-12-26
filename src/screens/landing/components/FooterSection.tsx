/**
 * FooterSection Component
 *
 * Functional footer with 4 columns and bottom bar.
 * Responsive layout that stacks on mobile.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { heraLanding, shadows } from '../../../constants/colors';
import { StyledLogo } from '../../../components/common/StyledLogo';

interface FooterLink {
  label: string;
  href?: string;
  onPress?: () => void;
}

interface FooterColumn {
  title: string;
  links: FooterLink[];
}

interface FooterSectionProps {
  onFindSpecialist?: () => void;
  onJoinAsProfessional?: () => void;
}

export const FooterSection: React.FC<FooterSectionProps> = ({
  onFindSpecialist,
  onJoinAsProfessional,
}) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const isTablet = width >= 768 && width < 1024;

  const columns: FooterColumn[] = [
    {
      title: 'Para Clientes',
      links: [
        { label: 'Encuentra especialista', onPress: onFindSpecialist },
        { label: 'Cómo funciona', href: '#como-funciona' },
        { label: 'Precios', href: '#precios' },
        { label: 'FAQ', href: '#faq' },
      ],
    },
    {
      title: 'Para Profesionales',
      links: [
        { label: 'Únete a HERA', onPress: onJoinAsProfessional },
        { label: 'Beneficios', href: '#beneficios' },
        { label: 'Recursos', href: '#recursos' },
        { label: 'Centro de ayuda', href: '#ayuda' },
      ],
    },
    {
      title: 'Legal',
      links: [
        { label: 'Política de Privacidad', href: '#privacidad' },
        { label: 'Términos de Uso', href: '#terminos' },
        { label: 'Política de Cookies', href: '#cookies' },
        { label: 'Contacto', href: 'mailto:contacto@hera.com' },
      ],
    },
  ];

  const socialLinks = [
    { icon: 'logo-instagram' as const, href: 'https://instagram.com' },
    { icon: 'logo-linkedin' as const, href: 'https://linkedin.com' },
    { icon: 'logo-twitter' as const, href: 'https://twitter.com' },
    { icon: 'logo-facebook' as const, href: 'https://facebook.com' },
  ];

  const handleLinkPress = (link: FooterLink) => {
    if (link.onPress) {
      link.onPress();
    } else if (link.href) {
      Linking.openURL(link.href).catch(() => {});
    }
  };

  const handleSocialPress = (href: string) => {
    Linking.openURL(href).catch(() => {});
  };

  return (
    <View style={[styles.container, isDesktop && styles.containerDesktop]}>
      <View style={styles.content}>
        {/* Main Footer Content */}
        <View style={[
          styles.mainContent,
          isDesktop && styles.mainContentDesktop,
          isTablet && styles.mainContentTablet,
        ]}>
          {/* Brand Column */}
          <View style={[styles.brandColumn, isDesktop && styles.brandColumnDesktop]}>
            <View style={styles.logoRow}>
              <StyledLogo size={48} />
              <Text style={styles.brandName}>HERA</Text>
            </View>
            <Text style={styles.tagline}>Tu bienestar mental</Text>
            <Text style={styles.brandDescription}>
              Conectamos personas con los mejores profesionales de salud mental.
              Terapia accesible, profesional y privada.
            </Text>

            {/* Social Links */}
            <View style={styles.socialLinks}>
              {socialLinks.map((social, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.socialButton}
                  onPress={() => handleSocialPress(social.href)}
                  activeOpacity={0.7}
                >
                  <Ionicons name={social.icon} size={20} color={heraLanding.textSecondary} />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Link Columns */}
          <View style={[
            styles.columnsContainer,
            isDesktop && styles.columnsContainerDesktop,
            isTablet && styles.columnsContainerTablet,
          ]}>
            {columns.map((column, colIndex) => (
              <View
                key={colIndex}
                style={[
                  styles.column,
                  isDesktop && styles.columnDesktop,
                ]}
              >
                <Text style={styles.columnTitle}>{column.title}</Text>
                {column.links.map((link, linkIndex) => (
                  <TouchableOpacity
                    key={linkIndex}
                    onPress={() => handleLinkPress(link)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.columnLink}>{link.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </View>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Bottom Bar */}
        <View style={[styles.bottomBar, isDesktop && styles.bottomBarDesktop]}>
          <Text style={styles.copyright}>
            © {new Date().getFullYear()} HERA - Tu bienestar mental
          </Text>
          <Text style={styles.madeWith}>
            Hecho con <Ionicons name="heart" size={12} color={heraLanding.warning} /> en España
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: heraLanding.textPrimary,
    paddingTop: 60,
    paddingBottom: 32,
    paddingHorizontal: 20,
  },
  containerDesktop: {
    paddingTop: 80,
    paddingHorizontal: 60,
  },
  content: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },

  // Main content
  mainContent: {
    gap: 40,
  },
  mainContentDesktop: {
    flexDirection: 'row',
    gap: 80,
  },
  mainContentTablet: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 40,
  },

  // Brand column
  brandColumn: {
    maxWidth: 320,
  },
  brandColumnDesktop: {
    flex: 0.35,
    maxWidth: 340,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  brandName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 16,
  },
  brandDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: 22,
    marginBottom: 24,
  },

  // Social links
  socialLinks: {
    flexDirection: 'row',
    gap: 12,
  },
  socialButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Link columns
  columnsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 32,
  },
  columnsContainerDesktop: {
    flex: 0.65,
    justifyContent: 'space-between',
  },
  columnsContainerTablet: {
    flex: 1,
    justifyContent: 'space-around',
  },
  column: {
    minWidth: 140,
  },
  columnDesktop: {
    minWidth: 160,
  },
  columnTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 20,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  columnLink: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 14,
    lineHeight: 20,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 32,
  },

  // Bottom bar
  bottomBar: {
    alignItems: 'center',
    gap: 8,
  },
  bottomBarDesktop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  copyright: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  madeWith: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)',
  },
});
