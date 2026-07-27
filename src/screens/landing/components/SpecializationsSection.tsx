import React from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AnimatedPressable } from '../../../components/common/AnimatedPressable';
import { MotionView } from '../../../components/common/MotionView';
import { useTheme } from '../../../contexts/ThemeContext';
import type { ProfessionalSpecialtyValue } from '../../../constants/professionalMatchingOptions';

interface SpecializationsSectionProps {
  onSpecializationPress: (specializationId: ProfessionalSpecialtyValue) => void;
}

const SPECIALIZATIONS: ReadonlyArray<{
  id: ProfessionalSpecialtyValue;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  { id: 'anxiety', label: 'Ansiedad y estrés', icon: 'pulse-outline' },
  { id: 'depression', label: 'Depresión', icon: 'rainy-outline' },
  { id: 'couples', label: 'Terapia de pareja', icon: 'people-outline' },
  { id: 'trauma', label: 'Trauma (EMDR)', icon: 'shield-outline' },
  { id: 'self-esteem', label: 'Autoestima', icon: 'heart-outline' },
  { id: 'grief', label: 'Duelo', icon: 'leaf-outline' },
  { id: 'sleep', label: 'Problemas de sueño', icon: 'moon-outline' },
  { id: 'phobias', label: 'Fobias', icon: 'compass-outline' },
];

export const SpecializationsSection: React.FC<SpecializationsSectionProps> = ({
  onSpecializationPress,
}) => {
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
      <View style={styles.content}>
        <MotionView entering="fadeInUp" style={styles.header}>
          <Text
            style={[
              styles.eyebrow,
              { color: theme.primary, fontFamily: theme.fontSansSemiBold },
            ]}
          >
            EXPLORA POR ESPECIALIDAD
          </Text>
          <Text
            accessibilityRole="header"
            style={[
              styles.title,
              isDesktop && styles.titleDesktop,
              { color: theme.textPrimary, fontFamily: theme.fontDisplay },
            ]}
          >
            Empieza por aquello que quieres cuidar
          </Text>
          <Text
            style={[
              styles.subtitle,
              { color: theme.textSecondary, fontFamily: theme.fontSans },
            ]}
          >
            Elige un área para abrir el directorio con ese filtro ya aplicado.
            Después podrás ajustar modalidad, precio y enfoque.
          </Text>
        </MotionView>

        <View style={[styles.grid, isTablet && styles.gridWide]}>
          {SPECIALIZATIONS.map((specialization, index) => (
            <MotionView
              key={specialization.id}
              entering="fadeInUp"
              delay={50 + index * 35}
              style={isTablet ? styles.itemMotion : undefined}
            >
              <AnimatedPressable
                onPress={() => onSpecializationPress(specialization.id)}
                pressScale={0.98}
                hoverLift
                accessibilityRole="link"
                accessibilityLabel={`Ver especialistas en ${specialization.label}`}
                style={[
                  styles.item,
                  {
                    backgroundColor: theme.bgCard,
                    borderColor: theme.border,
                    shadowColor: theme.shadowCard,
                  },
                ]}
              >
                <View style={[styles.icon, { backgroundColor: theme.primaryAlpha12 }]}>
                  <Ionicons name={specialization.icon} size={22} color={theme.primary} />
                </View>
                <Text
                  style={[
                    styles.itemLabel,
                    { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold },
                  ]}
                >
                  {specialization.label}
                </Text>
                <Ionicons name="arrow-forward" size={17} color={theme.textMuted} />
              </AnimatedPressable>
            </MotionView>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 70,
    paddingHorizontal: 20,
  },
  containerDesktop: {
    paddingTop: 88,
    paddingBottom: 92,
    paddingHorizontal: 60,
  },
  content: {
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
  },
  header: {
    maxWidth: 760,
    marginBottom: 38,
  },
  eyebrow: {
    fontSize: 12,
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  title: {
    fontSize: 34,
    lineHeight: 42,
    marginBottom: 12,
  },
  titleDesktop: {
    fontSize: 46,
    lineHeight: 54,
  },
  subtitle: {
    fontSize: 17,
    lineHeight: 26,
  },
  grid: {
    gap: 12,
  },
  gridWide: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  itemMotion: {
    width: '48.8%',
    flexGrow: 1,
  },
  item: {
    minHeight: 76,
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 2,
  },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemLabel: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
  },
});
