/**
 * FooterSection
 *
 * Keeps the existing footer structure while making the professional workspace
 * the dominant narrative and leaving patient access visible but secondary.
 */

import React, { type CSSProperties } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  Linking,
  Platform,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { StyledLogo } from '../../../components/common/StyledLogo';
import { getLegalDocumentUrl } from '../../../constants/legal';

const webAnchorStyle: CSSProperties = {
  display: 'block',
  textDecoration: 'none',
};

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
      title: 'Espacio profesional',
      links: [
        { label: 'Acceder como profesional', onPress: onJoinAsProfessional },
        { label: 'Herramientas', href: '#herramientas' },
        { label: 'Dashboard', href: '#dashboard' },
        { label: 'Disponibilidad y agenda', href: '#agenda' },
      ],
    },
    {
      title: 'Pacientes',
      links: [
        { label: 'Buscar especialista', onPress: onFindSpecialist },
        { label: 'Especialidades', href: '#especialidades' },
        { label: 'Cómo funciona', href: '#como-funciona' },
        { label: 'Centro de ayuda', href: '#ayuda' },
      ],
    },
    {
      title: 'Legal',
      links: [
        { label: 'Política de privacidad', href: getLegalDocumentUrl('PRIVACY_POLICY') },
        { label: 'Términos y condiciones', href: getLegalDocumentUrl('TERMS_OF_SERVICE') },
        { label: 'Contacto', href: 'mailto:herahealthtech@gmail.com' },
      ],
    },
  ];

  const socialLinks = [
    { icon: 'logo-instagram' as const, href: 'https://instagram.com' },
    { icon: 'logo-linkedin' as const, href: 'https://www.linkedin.com/in/hera-health' },
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

  const renderFooterLink = (link: FooterLink) => {
    if (Platform.OS === 'web' && link.href && !link.onPress) {
      return React.createElement(
        'a',
        {
          key: link.label,
          href: link.href,
          style: webAnchorStyle,
        },
        <Text style={styles.columnLink}>{link.label}</Text>
      );
    }

    return (
      <TouchableOpacity
        key={link.label}
        onPress={() => handleLinkPress(link)}
        activeOpacity={0.7}
      >
        <Text style={styles.columnLink}>{link.label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View
          style={[
            styles.mainContent,
            isDesktop && styles.mainContentDesktop,
            isTablet && styles.mainContentTablet,
          ]}
        >
          <View style={[styles.brandColumn, isDesktop && styles.brandColumnDesktop]}>
            <View style={styles.logoRow}>
              <StyledLogo size={48} />
              <Text style={styles.brandName}>HERA</Text>
            </View>
            <Text style={styles.tagline}>Workspace para salud mental</Text>
            <Text style={styles.brandDescription}>
              HERA evoluciona hacia una herramienta de gestión para especialistas,
              manteniendo el acceso paciente sin perder una presentación honesta y calmada para salud mental.
            </Text>

            <View style={styles.socialLinks}>
              {socialLinks.map((social) => (
                <TouchableOpacity
                  key={social.icon}
                  style={styles.socialButton}
                  onPress={() => handleSocialPress(social.href)}
                  activeOpacity={0.7}
                >
                  <Ionicons name={social.icon} size={20} color="rgba(255, 255, 255, 0.7)" />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View
            style={[
              styles.columnsContainer,
              isDesktop && styles.columnsContainerDesktop,
              isTablet && styles.columnsContainerTablet,
            ]}
          >
            {columns.map((column) => (
              <View
                key={column.title}
                style={[styles.column, isDesktop && styles.columnDesktop]}
              >
                <Text style={styles.columnTitle}>{column.title}</Text>
                {column.links.map((link) => renderFooterLink(link))}
              </View>
            ))}
          </View>
        </View>

        <View style={styles.divider} />

        <View style={[styles.bottomBar, isDesktop && styles.bottomBarDesktop]}>
          <Text style={styles.copyright}>
            (c) {new Date().getFullYear()} HERA - Workspace para especialistas y pacientes
          </Text>
          <Text style={styles.madeWith}>
            Hecho con <Ionicons name="heart" size={12} color="#D9A84F" /> en España
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#2C3E2C',
    paddingTop: 60,
    paddingBottom: 32,
    paddingHorizontal: 20,
  },
  content: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },
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
  brandColumn: {
    maxWidth: 340,
  },
  brandColumnDesktop: {
    flex: 0.35,
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
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 32,
  },
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
    textAlign: 'center',
  },
  madeWith: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)',
  },
});
