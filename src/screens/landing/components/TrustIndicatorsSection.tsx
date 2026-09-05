import React from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { MotionView } from '../../../components/common/MotionView';
import { useTheme } from '../../../contexts/ThemeContext';

const TRUST_ITEMS = [
  {
    icon: 'checkmark-circle-outline' as const,
    title: 'Verificación profesional',
    description: 'Los perfiles públicos pasan por un proceso de verificación antes de mostrarse.',
  },
  {
    icon: 'lock-closed-outline' as const,
    title: 'Privacidad por diseño',
    description: 'La experiencia se plantea para reducir la exposición de información sensible.',
  },
  {
    icon: 'document-lock-outline' as const,
    title: 'Consentimientos y documentación',
    description: 'Los flujos profesionales reúnen documentos y consentimientos con acceso protegido.',
  },
  {
    icon: 'shield-checkmark-outline' as const,
    title: 'Marco RGPD y LOPDGDD',
    description: 'La gestión se diseña de acuerdo con el marco europeo y español de protección de datos.',
  },
];

export const TrustIndicatorsSection: React.FC = () => {
  const { width } = useWindowDimensions();
  const { theme } = useTheme();
  const isDesktop = width >= 1024;
  const isTablet = width >= 640;

  return (
    <View
      style={[
        styles.container,
        isDesktop && styles.containerDesktop,
        { backgroundColor: theme.landingCanvas },
      ]}
    >
      <View
        style={[
          styles.panel,
          isDesktop && styles.panelDesktop,
          {
            backgroundColor: theme.landingTrustPanel,
            borderColor: theme.landingPanelBorder,
          },
        ]}
      >
        <View style={styles.content}>
          <MotionView entering="fadeIn" style={styles.header}>
            <Text
              style={[
                styles.eyebrow,
                { color: theme.primary, fontFamily: theme.fontSansSemiBold },
              ]}
            >
              CONFIANZA Y PRIVACIDAD
            </Text>
            <Text
              accessibilityRole="header"
              style={[
                styles.title,
                isDesktop && styles.titleDesktop,
                { color: theme.textPrimary, fontFamily: theme.fontDisplay },
              ]}
            >
              Seriedad para un contexto sensible
            </Text>
            <Text
              style={[
                styles.subtitle,
                { color: theme.textSecondary, fontFamily: theme.fontSans },
              ]}
            >
              Pruebas concretas para que pacientes y profesionales sepan qué pueden
              esperar de HERA.
            </Text>
          </MotionView>

          <View style={[styles.grid, isTablet && styles.gridWide]}>
            {TRUST_ITEMS.map((item, index) => (
              <MotionView
                key={item.title}
                entering="fadeIn"
                delay={70 + index * 55}
                style={isTablet ? styles.itemMotion : undefined}
              >
                <View
                  style={[
                    styles.item,
                    { borderColor: theme.borderStrong },
                  ]}
                >
                  <View style={[styles.icon, { backgroundColor: 'transparent' }]}>
                    <Ionicons name={item.icon} size={23} color={theme.primary} />
                  </View>
                  <Text
                    style={[
                      styles.itemTitle,
                      { color: theme.textPrimary, fontFamily: theme.fontSansBold },
                    ]}
                  >
                    {item.title}
                  </Text>
                  <Text
                    style={[
                      styles.itemDescription,
                      { color: theme.textSecondary, fontFamily: theme.fontSans },
                    ]}
                  >
                    {item.description}
                  </Text>
                </View>
              </MotionView>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 28,
    paddingHorizontal: 20,
  },
  containerDesktop: {
    paddingVertical: 40,
    paddingHorizontal: 60,
  },
  panel: {
    width: '100%',
    maxWidth: 1320,
    alignSelf: 'center',
    borderWidth: 0,
    borderRadius: 12,
    paddingVertical: 48,
    paddingHorizontal: 22,
  },
  panelDesktop: {
    paddingVertical: 64,
    paddingHorizontal: 60,
    borderRadius: 12,
  },
  content: {
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
  },
  header: {
    maxWidth: 720,
    marginBottom: 36,
  },
  eyebrow: {
    fontSize: 12,
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  title: {
    fontSize: 34,
    lineHeight: 42,
    marginBottom: 11,
  },
  titleDesktop: {
    fontSize: 44,
    lineHeight: 52,
  },
  subtitle: {
    fontSize: 17,
    lineHeight: 26,
  },
  grid: {
    gap: 32,
  },
  gridWide: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  itemMotion: {
    width: '47%',
    flexGrow: 1,
  },
  item: {
    height: '100%',
    minHeight: 210,
    paddingVertical: 24,
    borderTopWidth: 1,
  },
  icon: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  itemTitle: {
    fontSize: 18,
    lineHeight: 24,
    marginBottom: 8,
  },
  itemDescription: {
    fontSize: 15,
    lineHeight: 24,
  },
});
