import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../../contexts/ThemeContext';
import { MotionView } from '../../../components/common/MotionView';
import type { Theme } from '../../../constants/theme';

interface Principle {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}

const PRINCIPLES: Principle[] = [
  {
    icon: 'shield-checkmark-outline',
    title: 'Privacidad desde el diseño',
    description:
      'La información clínica, legal y operativa se trata como sensible desde el primer punto de contacto, no como un detalle añadido al final.',
  },
  {
    icon: 'briefcase-outline',
    title: 'Menos fricción diaria',
    description:
      'Agenda, pacientes, sesiones y facturación deben sentirse conectados para que la consulta no se fragmente en tareas sueltas.',
  },
  {
    icon: 'heart-outline',
    title: 'Tecnología con criterio humano',
    description:
      'Interfaces sobrias, lenguaje claro y decisiones pensadas para cuidar la confianza de profesionales y pacientes.',
  },
];

export const AboutUsSection: React.FC = () => {
  const { width } = useWindowDimensions();
  const { theme, isDark } = useTheme();
  const isDesktop = width >= 1024;
  const isTablet = width >= 768 && width < 1024;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.bg },
        isDesktop && styles.containerDesktop,
      ]}
    >
      <View
        style={[
          styles.content,
          isDesktop && styles.contentDesktop,
          isTablet && styles.contentTablet,
        ]}
      >
        <MotionView
          entering="fadeInUp"
          delay={0}
          style={[
            styles.copyColumn,
            ...(isDesktop ? [styles.copyColumnDesktop] : []),
          ]}
        >
          <View
            style={[
              styles.badge,
              {
                backgroundColor: theme.primaryAlpha12,
                borderColor: theme.primaryAlpha20,
              },
            ]}
          >
            <Ionicons name="sparkles-outline" size={14} color={theme.primary} />
            <Text
              style={[
                styles.badgeText,
                { color: theme.primary, fontFamily: theme.fontSansSemiBold },
              ]}
            >
              Sobre HERA
            </Text>
          </View>

          <Text
            style={[
              styles.eyebrow,
              { color: theme.primary, fontFamily: theme.fontSansSemiBold },
            ]}
          >
            QUIÉNES SOMOS
          </Text>
          <Text
            style={[
              styles.title,
              isDesktop && styles.titleDesktop,
              { color: theme.textPrimary, fontFamily: theme.fontDisplay },
            ]}
          >
            Construimos una forma más clara de trabajar en salud mental
          </Text>
          <Text
            style={[
              styles.lead,
              { color: theme.textSecondary, fontFamily: theme.fontSans },
            ]}
          >
            HERA nace para unir dos necesidades que suelen vivir separadas: una
            experiencia profesional ordenada para especialistas y un acceso más
            comprensible para las personas que buscan ayuda.
          </Text>
          <Text
            style={[
              styles.body,
              { color: theme.textSecondary, fontFamily: theme.fontSans },
            ]}
          >
            Creemos que pedir ayuda y sostener una consulta tienen algo en común:
            necesitan claridad. Para el profesional, eso significa menos tiempo
            persiguiendo agendas, facturas o documentos, y más contexto para
            acompañar cada proceso con cuidado.
          </Text>
          <Text
            style={[
              styles.body,
              styles.bodyFollowUp,
              { color: theme.textSecondary, fontFamily: theme.fontSans },
            ]}
          >
            Para el paciente, significa entender mejor quién le atiende, cómo
            trabaja y qué pasos vienen después. HERA se construye desde esa idea:
            la tecnología debe aportar calma, seguridad y continuidad, y quedarse
            en segundo plano cuando solo añadiría ruido.
          </Text>
        </MotionView>

        <MotionView
          entering="fadeInUp"
          delay={120}
          style={[styles.panel, ...(isDesktop ? [styles.panelDesktop] : [])]}
        >
          <View
            style={[
              styles.panelSurface,
              {
                backgroundColor: isDark ? theme.bgCard : theme.bgElevated,
                borderColor: theme.border,
                shadowColor: theme.shadowNeutral,
              },
            ]}
          >
            <View style={styles.panelHeader}>
              <View
                style={[
                  styles.panelIcon,
                  { backgroundColor: theme.secondaryAlpha12 },
                ]}
              >
                <Ionicons
                  name="compass-outline"
                  size={22}
                  color={isDark ? theme.logoTint : theme.secondaryDark}
                />
              </View>
              <Text
                style={[
                  styles.panelTitle,
                  { color: theme.textPrimary, fontFamily: theme.fontSansBold },
                ]}
              >
                Lo que guía HERA
              </Text>
            </View>

            <View style={styles.principlesList}>
              {PRINCIPLES.map((principle, index) => (
                <PrincipleRow
                  key={principle.title}
                  principle={principle}
                  index={index}
                  theme={theme}
                  isDark={isDark}
                />
              ))}
            </View>
          </View>
        </MotionView>
      </View>
    </View>
  );
};

interface PrincipleRowProps {
  principle: Principle;
  index: number;
  theme: Theme;
  isDark: boolean;
}

function PrincipleRow({ principle, index, theme, isDark }: PrincipleRowProps) {
  const accentColors = [theme.primary, theme.secondary, theme.success];
  const accentColor = accentColors[index] ?? theme.primary;

  return (
    <View
      style={[
        styles.principleRow,
        { borderColor: isDark ? theme.borderLight : theme.border },
      ]}
    >
      <View
        style={[
          styles.principleIcon,
          { backgroundColor: isDark ? theme.bgMuted : theme.primaryAlpha12 },
        ]}
      >
        <Ionicons name={principle.icon} size={18} color={accentColor} />
      </View>
      <View style={styles.principleCopy}>
        <Text
          style={[
            styles.principleTitle,
            { color: theme.textPrimary, fontFamily: theme.fontSansBold },
          ]}
        >
          {principle.title}
        </Text>
        <Text
          style={[
            styles.principleDescription,
            { color: theme.textSecondary, fontFamily: theme.fontSans },
          ]}
        >
          {principle.description}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  containerDesktop: {
    paddingVertical: 96,
    paddingHorizontal: 60,
  },
  content: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    gap: 32,
  },
  contentDesktop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 72,
  },
  contentTablet: {
    gap: 40,
  },
  copyColumn: {
    alignItems: 'flex-start',
  },
  copyColumnDesktop: {
    flex: 0.52,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 18,
  },
  badgeText: {
    fontSize: 12,
  },
  eyebrow: {
    fontSize: 12,
    letterSpacing: 0,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  title: {
    fontSize: 32,
    lineHeight: 39,
    letterSpacing: 0,
    marginBottom: 16,
  },
  titleDesktop: {
    fontSize: 42,
    lineHeight: 50,
  },
  lead: {
    fontSize: 18,
    lineHeight: 29,
    maxWidth: 620,
    marginBottom: 14,
  },
  body: {
    fontSize: 16,
    lineHeight: 26,
    maxWidth: 620,
  },
  bodyFollowUp: {
    marginTop: 14,
  },
  panel: {
    width: '100%',
  },
  panelDesktop: {
    flex: 0.48,
  },
  panelSurface: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 28,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 28,
    elevation: 5,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 22,
  },
  panelIcon: {
    width: 46,
    height: 46,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  panelTitle: {
    fontSize: 20,
    lineHeight: 26,
  },
  principlesList: {
    gap: 14,
  },
  principleRow: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  principleIcon: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  principleCopy: {
    flex: 1,
    minWidth: 0,
  },
  principleTitle: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 4,
  },
  principleDescription: {
    fontSize: 14,
    lineHeight: 21,
  },
});
