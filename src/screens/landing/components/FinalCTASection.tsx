import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../../contexts/ThemeContext';

interface FinalCTASectionProps {
  onFindSpecialist: () => void;
  onJoinAsProfessional?: () => void;
}

export const FinalCTASection: React.FC<FinalCTASectionProps> = ({
  onFindSpecialist,
  onJoinAsProfessional,
}) => {
  const { width } = useWindowDimensions();
  const { theme, isDark } = useTheme();
  const isDesktop = width >= 1024;
  const foregroundColor = theme.textOnPrimary;
  const foregroundMutedColor = isDark ? 'rgba(16, 23, 20, 0.74)' : 'rgba(255, 255, 255, 0.9)';
  const ctaTextColor = isDark ? theme.bg : theme.primaryDark;

  const benefits = [
    { icon: 'checkmark-circle' as const, text: 'Agenda y seguimiento' },
    { icon: 'checkmark-circle' as const, text: 'Disponibilidad y sesiones' },
    { icon: 'checkmark-circle' as const, text: 'Facturación, RGPD y LOPDGDD' },
  ];

  return (
    <View style={[styles.container, isDesktop && styles.containerDesktop, { backgroundColor: theme.primary }]}>
      <View style={styles.content}>
        <Text style={[styles.eyebrow, { color: foregroundMutedColor, fontFamily: theme.fontSansSemiBold }]}>
          ESPACIO PROFESIONAL
        </Text>

        <Text
          style={[
            styles.title,
            isDesktop && styles.titleDesktop,
            { color: foregroundColor, fontFamily: theme.fontDisplay },
          ]}
        >
          Centraliza tu consulta de salud mental en un solo lugar
        </Text>

        <Text
          style={[
            styles.subtitle,
            isDesktop && styles.subtitleDesktop,
            { color: foregroundMutedColor, fontFamily: theme.fontSans },
          ]}
        >
          Organiza agenda, pacientes, sesiones, disponibilidad y negocio con una experiencia más clara y más coherente para el trabajo diario en salud mental.
        </Text>

        <TouchableOpacity
          style={[styles.cta, isDesktop && styles.ctaDesktop]}
          onPress={onJoinAsProfessional ?? onFindSpecialist}
          activeOpacity={0.9}
        >
          <Text style={[styles.ctaText, { color: ctaTextColor, fontFamily: theme.fontSansBold }]}>
            Entrar como profesional
          </Text>
          <Ionicons name="arrow-forward" size={20} color={ctaTextColor} />
        </TouchableOpacity>

        <View style={[styles.benefits, isDesktop && styles.benefitsDesktop]}>
          {benefits.map((benefit) => (
            <View key={benefit.text} style={styles.benefitItem}>
              <Ionicons name={benefit.icon} size={18} color={foregroundColor} />
              <Text style={[styles.benefitText, { color: foregroundColor, fontFamily: theme.fontSansMedium }]}>
                {benefit.text}
              </Text>
            </View>
          ))}
        </View>

        <TouchableOpacity onPress={onFindSpecialist} activeOpacity={0.8}>
          <Text style={[styles.secondaryLink, { color: foregroundMutedColor, fontFamily: theme.fontSansSemiBold }]}>
            ¿Buscas terapia? Encuentra especialistas aquí.
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 80,
    paddingHorizontal: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  containerDesktop: {
    paddingVertical: 120,
    paddingHorizontal: 60,
  },
  content: {
    maxWidth: 840,
    width: '100%',
    alignSelf: 'center',
    alignItems: 'center',
  },
  eyebrow: {
    fontSize: 12,
    letterSpacing: 0,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: 0,
  },
  titleDesktop: {
    fontSize: 44,
  },
  subtitle: {
    fontSize: 17,
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 36,
  },
  subtitleDesktop: {
    fontSize: 18,
    lineHeight: 28,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 18,
    paddingHorizontal: 36,
    borderRadius: 14,
    gap: 10,
    shadowColor: 'rgba(62, 92, 79, 0.20)',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 8,
  },
  ctaDesktop: {
    paddingVertical: 20,
    paddingHorizontal: 48,
  },
  ctaText: {
    fontSize: 17,
    letterSpacing: 0,
  },
  benefits: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 24,
    marginTop: 32,
    marginBottom: 24,
  },
  benefitsDesktop: {
    gap: 40,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  benefitText: {
    fontSize: 14,
  },
  secondaryLink: {
    fontSize: 14,
    textDecorationLine: 'underline',
    textAlign: 'center',
  },
});
