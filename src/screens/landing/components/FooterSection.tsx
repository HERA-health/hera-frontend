import React, { type CSSProperties } from 'react';
import {
  Linking,
  Platform,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AnimatedPressable } from '../../../components/common/AnimatedPressable';
import { StyledLogo } from '../../../components/common/StyledLogo';
import { getLegalDocumentUrl } from '../../../constants/legal';
import { useTheme } from '../../../contexts/ThemeContext';
import type { LandingSectionAnchor } from '../types';

const webAnchorStyle: CSSProperties = {
  display: 'block',
  textDecoration: 'none',
};

interface FooterLink {
  label: string;
  section?: LandingSectionAnchor;
  href?: string;
  onPress?: () => void;
}

interface FooterColumn {
  title: string;
  links: FooterLink[];
}

interface FooterSectionProps {
  onFindSpecialist: () => void;
  professionalActionLabel: string;
  onProfessionalAction: () => void;
  onProfessionalLogin: () => void;
  onClinicAccess: () => void;
  onScrollToSection: (section: LandingSectionAnchor) => void;
}

export const FooterSection: React.FC<FooterSectionProps> = ({
  onFindSpecialist,
  professionalActionLabel,
  onProfessionalAction,
  onProfessionalLogin,
  onClinicAccess,
  onScrollToSection,
}) => {
  const { width } = useWindowDimensions();
  const { theme } = useTheme();
  const isDesktop = width >= 1024;
  const isTablet = width >= 700;

  const columns: FooterColumn[] = [
    {
      title: 'Pacientes',
      links: [
        { label: 'Explorar profesionales', onPress: onFindSpecialist },
        { label: 'Cómo funciona', section: 'howItWorks' },
        { label: 'Especialidades', section: 'specializations' },
        { label: 'Preguntas frecuentes', section: 'faq' },
      ],
    },
    {
      title: 'Profesionales',
      links: [
        { label: professionalActionLabel, onPress: onProfessionalAction },
        { label: 'Iniciar sesión', onPress: onProfessionalLogin },
        { label: 'Visibilidad y gestión', section: 'forSpecialists' },
        { label: 'Especialistas destacados', section: 'featuredSpecialists' },
      ],
    },
    {
      title: 'Clínicas',
      links: [
        { label: 'Acceso para clínicas', onPress: onClinicAccess },
      ],
    },
    {
      title: 'HERA',
      links: [
        { label: 'Quiénes somos', section: 'about' },
        { label: 'Política de privacidad', href: getLegalDocumentUrl('PRIVACY_POLICY') },
        { label: 'Términos y condiciones', href: getLegalDocumentUrl('TERMS_OF_SERVICE') },
        { label: 'Contacto', href: 'mailto:herahealthtech@gmail.com' },
      ],
    },
  ];

  const handleLinkPress = (link: FooterLink) => {
    if (link.onPress) {
      link.onPress();
    } else if (link.section) {
      onScrollToSection(link.section);
    } else if (link.href) {
      void Linking.openURL(link.href).catch(() => undefined);
    }
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

    if (Platform.OS === 'web' && link.href && !link.onPress && !link.section) {
      return React.createElement(
        'a',
        { key: link.label, href: link.href, style: webAnchorStyle },
        linkText
      );
    }

    return (
      <AnimatedPressable
        key={link.label}
        onPress={() => handleLinkPress(link)}
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
              Salud mental, con más claridad.
            </Text>
            <Text
              style={[
                styles.description,
                { color: theme.textSecondary, fontFamily: theme.fontSans },
              ]}
            >
              Un mismo lugar para encontrar al profesional adecuado y para gestionar
              una consulta con calma, privacidad y contexto.
            </Text>
            <AnimatedPressable
              onPress={() => {
                void Linking.openURL('https://www.linkedin.com/in/hera-health').catch(
                  () => undefined
                );
              }}
              hoverLift={false}
              pressScale={0.96}
              accessibilityRole="link"
              accessibilityLabel="HERA en LinkedIn"
              style={[
                styles.socialButton,
                { backgroundColor: theme.primaryAlpha12, borderColor: theme.border },
              ]}
            >
              <Ionicons name="logo-linkedin" size={19} color={theme.primary} />
            </AnimatedPressable>
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
                {column.links.map(renderLink)}
              </View>
            ))}
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        <View style={[styles.bottom, isTablet && styles.bottomWide]}>
          <Text
            style={[
              styles.bottomText,
              { color: theme.textMuted, fontFamily: theme.fontSans },
            ]}
          >
            © {new Date().getFullYear()} HERA
          </Text>
          <Text
            style={[
              styles.bottomText,
              { color: theme.textMuted, fontFamily: theme.fontSans },
            ]}
          >
            Hecho con cuidado en España
          </Text>
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
  socialButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
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
    lineHeight: 20,
    marginBottom: 11,
  },
  divider: {
    height: 1,
    marginVertical: 30,
  },
  bottom: {
    alignItems: 'center',
    gap: 7,
  },
  bottomWide: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  bottomText: {
    fontSize: 13,
  },
});
