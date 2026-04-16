/**
 * SpecializationsSection
 *
 * Keeps the breadth signal, but reframes it around the types of specialists
 * that can work with HERA instead of a pure discovery marketplace.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';

interface Specialization {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  accent: 'primary' | 'secondary' | 'success' | 'warning' | 'info';
}

const specializations: Specialization[] = [
  {
    id: 'anxiety',
    icon: 'pulse-outline',
    title: 'Ansiedad y estrés',
    description: 'Especialistas que trabajan procesos de regulación emocional y acompañamiento continuado.',
    accent: 'primary',
  },
  {
    id: 'couples',
    icon: 'heart-outline',
    title: 'Terapia de pareja',
    description: 'Profesionales que pueden operar sesiones y seguimiento relacional desde HERA.',
    accent: 'warning',
  },
  {
    id: 'depression',
    icon: 'cloudy-outline',
    title: 'Depresión',
    description: 'Consulta, sesiones y continuidad para trabajo clínico alrededor del estado de ánimo.',
    accent: 'info',
  },
  {
    id: 'trauma',
    icon: 'medical-outline',
    title: 'Trauma y EMDR',
    description: 'Una base organizada para especialidades que requieren seguimiento y estructura.',
    accent: 'secondary',
  },
  {
    id: 'selfesteem',
    icon: 'sunny-outline',
    title: 'Autoestima',
    description: 'Espacios profesionales orientados al desarrollo personal y la intervención psicológica.',
    accent: 'warning',
  },
  {
    id: 'family',
    icon: 'people-outline',
    title: 'Terapia familiar',
    description: 'Gestión más clara de sesiones y pacientes en contextos familiares y sistémicos.',
    accent: 'success',
  },
  {
    id: 'personal',
    icon: 'trophy-outline',
    title: 'Desarrollo personal',
    description: 'Especialistas que necesitan una operativa sencilla para sostener el acompañamiento.',
    accent: 'success',
  },
  {
    id: 'work',
    icon: 'briefcase-outline',
    title: 'Estrés laboral',
    description: 'Consultas con enfoque en burnout, equilibrio y bienestar en el trabajo.',
    accent: 'secondary',
  },
];

interface SpecializationsSectionProps {
  onSpecializationPress?: (id: string) => void;
}

export const SpecializationsSection: React.FC<SpecializationsSectionProps> = ({
  onSpecializationPress,
}) => {
  const { width } = useWindowDimensions();
  const { theme } = useTheme();
  const isDesktop = width >= 1024;
  const isTablet = width >= 768 && width < 1024;

  const getColumns = () => {
    if (isDesktop) return 4;
    if (isTablet) return 3;
    return 2;
  };

  const getAccentColors = (accent: Specialization['accent']) => {
    switch (accent) {
      case 'secondary':
        return { icon: theme.secondary, bg: theme.secondaryAlpha12 };
      case 'success':
        return { icon: theme.success, bg: theme.successBg };
      case 'warning':
        return { icon: theme.warningAmber, bg: theme.warningBg };
      case 'info':
        return { icon: theme.info, bg: theme.primaryAlpha12 };
      default:
        return { icon: theme.primary, bg: theme.primaryAlpha12 };
    }
  };

  const renderGrid = () => {
    const columns = getColumns();
    const rows: Specialization[][] = [];

    for (let i = 0; i < specializations.length; i += columns) {
      rows.push(specializations.slice(i, i + columns));
    }

    return rows.map((row, rowIndex) => (
      <View
        key={rowIndex}
        style={[
          styles.row,
          isDesktop && styles.rowDesktop,
          isTablet && styles.rowTablet,
        ]}
      >
        {row.map((spec) => {
          const accent = getAccentColors(spec.accent);

          return (
            <TouchableOpacity
              key={spec.id}
              style={[
                styles.card,
                {
                  backgroundColor: theme.bgCard,
                  borderColor: theme.border,
                  shadowColor: theme.shadowNeutral,
                },
                isDesktop && styles.cardDesktop,
                isTablet && styles.cardTablet,
              ]}
              onPress={() => onSpecializationPress?.(spec.id)}
              activeOpacity={0.85}
            >
              <View style={[styles.iconContainer, { backgroundColor: accent.bg }]}>
                <Ionicons name={spec.icon} size={22} color={accent.icon} />
              </View>

              <Text
                style={[
                  styles.title,
                  { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold },
                ]}
                numberOfLines={2}
              >
                {spec.title}
              </Text>

              <Text
                style={[
                  styles.description,
                  { color: theme.textSecondary, fontFamily: theme.fontSans },
                ]}
                numberOfLines={3}
              >
                {spec.description}
              </Text>

              <View style={styles.linkContainer}>
                <Text
                  style={[
                    styles.linkText,
                    { color: accent.icon, fontFamily: theme.fontSansSemiBold },
                  ]}
                >
                  Ver especialistas
                </Text>
                <Ionicons name="arrow-forward" size={14} color={accent.icon} />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    ));
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.bg },
        isDesktop && styles.containerDesktop,
      ]}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text
            style={[
              styles.eyebrow,
              { color: theme.primary, fontFamily: theme.fontSansSemiBold },
            ]}
          >
            ESPECIALIDADES
          </Text>
          <Text
            style={[
              styles.headerTitle,
              { color: theme.textPrimary, fontFamily: theme.fontDisplay },
              isDesktop && styles.headerTitleDesktop,
            ]}
          >
            Especialidades que pueden trabajar con HERA
          </Text>
          <Text
            style={[
              styles.headerSubtitle,
              { color: theme.textSecondary, fontFamily: theme.fontSans },
            ]}
          >
            El producto sigue siendo compatible con diferentes tipos de práctica clínica,
            aunque ahora el mensaje principal esté puesto en la gestión profesional.
          </Text>
          <View
            style={[
              styles.expansionBadge,
              { backgroundColor: theme.primaryAlpha12, borderColor: theme.primaryAlpha20 },
            ]}
          >
            <Ionicons name="add-circle-outline" size={16} color={theme.primary} />
            <Text
              style={[
                styles.expansionBadgeText,
                { color: theme.primary, fontFamily: theme.fontSansSemiBold },
              ]}
            >
              Y seguiremos ampliando muchas más áreas relacionadas con la salud mental
            </Text>
          </View>
        </View>

        <View style={styles.grid}>{renderGrid()}</View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  containerDesktop: {
    paddingVertical: 92,
    paddingHorizontal: 60,
  },
  content: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 50,
  },
  eyebrow: {
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 32,
    textAlign: 'center',
    marginBottom: 12,
  },
  headerTitleDesktop: {
    fontSize: 40,
  },
  headerSubtitle: {
    fontSize: 17,
    textAlign: 'center',
    maxWidth: 760,
  },
  expansionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  expansionBadgeText: {
    fontSize: 13,
    textAlign: 'center',
  },
  grid: {
    gap: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  rowDesktop: {
    gap: 20,
  },
  rowTablet: {
    gap: 16,
  },
  card: {
    flex: 1,
    borderRadius: 18,
    padding: 16,
    alignItems: 'flex-start',
    borderWidth: 1,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  cardDesktop: {
    padding: 24,
  },
  cardTablet: {
    padding: 20,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 16,
    marginBottom: 6,
    lineHeight: 22,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
    flex: 1,
  },
  linkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 'auto',
  },
  linkText: {
    fontSize: 13,
  },
});
