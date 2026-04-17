/**
 * FinalCTASection
 *
 * Specialist-first closing CTA with a discreet secondary route for patients.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
  const { theme } = useTheme();
  const isDesktop = width >= 1024;

  const benefits = [
    { icon: 'checkmark-circle' as const, text: 'Agenda y seguimiento' },
    { icon: 'checkmark-circle' as const, text: 'Disponibilidad y sesiones' },
    { icon: 'checkmark-circle' as const, text: 'Facturación, RGPD y LOPDGDD' },
  ];

  return (
    <LinearGradient
      colors={[theme.primary, theme.primaryDark]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, isDesktop && styles.containerDesktop]}
    >
      <View style={[styles.decorCircle, styles.decorCircle1]} />
      <View style={[styles.decorCircle, styles.decorCircle2]} />

      <View style={styles.content}>
        <Text
          style={[
            styles.eyebrow,
            { fontFamily: theme.fontSansSemiBold },
          ]}
        >
          ESPACIO PROFESIONAL
        </Text>

        <Text
          style={[
            styles.title,
            isDesktop && styles.titleDesktop,
            { fontFamily: theme.fontDisplay },
          ]}
        >
          Centraliza tu consulta de salud mental en un solo lugar
        </Text>

        <Text
          style={[
            styles.subtitle,
            isDesktop && styles.subtitleDesktop,
            { fontFamily: theme.fontSans },
          ]}
        >
          Organiza agenda, pacientes, sesiones, disponibilidad y negocio
          con una experiencia más clara y más coherente para el trabajo diario en salud mental.
        </Text>

        <TouchableOpacity
          style={[styles.cta, isDesktop && styles.ctaDesktop]}
          onPress={onJoinAsProfessional ?? onFindSpecialist}
          activeOpacity={0.9}
        >
          <Text style={[styles.ctaText, { color: theme.primaryDark, fontFamily: theme.fontSansBold }]}>
            Entrar como profesional
          </Text>
          <Ionicons name="arrow-forward" size={20} color={theme.primaryDark} />
        </TouchableOpacity>

        <View style={[styles.benefits, isDesktop && styles.benefitsDesktop]}>
          {benefits.map((benefit) => (
            <View key={benefit.text} style={styles.benefitItem}>
              <Ionicons name={benefit.icon} size={18} color="#FFFFFF" />
              <Text style={[styles.benefitText, { fontFamily: theme.fontSansMedium }]}>
                {benefit.text}
              </Text>
            </View>
          ))}
        </View>

        <TouchableOpacity onPress={onFindSpecialist} activeOpacity={0.8}>
          <Text style={[styles.secondaryLink, { fontFamily: theme.fontSansSemiBold }]}>
            ¿Buscas terapia? Encuentra especialistas aquí.
          </Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
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
    zIndex: 1,
  },
  decorCircle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  decorCircle1: {
    width: 400,
    height: 400,
    top: -200,
    right: -100,
  },
  decorCircle2: {
    width: 300,
    height: 300,
    bottom: -150,
    left: -100,
  },
  eyebrow: {
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: 'rgba(255, 255, 255, 0.85)',
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  titleDesktop: {
    fontSize: 44,
  },
  subtitle: {
    fontSize: 17,
    color: 'rgba(255, 255, 255, 0.9)',
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
    shadowColor: 'rgba(44, 62, 44, 0.20)',
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
    letterSpacing: 0.3,
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
    color: '#FFFFFF',
  },
  secondaryLink: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.88)',
    textDecorationLine: 'underline',
    textAlign: 'center',
  },
});
