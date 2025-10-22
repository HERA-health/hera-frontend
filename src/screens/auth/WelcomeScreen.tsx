import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../../constants/colors';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export function WelcomeScreen() {
  const navigation = useNavigation<any>();

  return (
    <View style={styles.container}>
      {/* Background gradient */}
      <LinearGradient
        colors={[colors.primary.main, colors.primary.dark, colors.primary.darker]}
        style={styles.gradient}
      >
        {/* Decorative elements */}
        <View style={[styles.decorCircle, styles.decorCircle1]} />
        <View style={[styles.decorCircle, styles.decorCircle2]} />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Ionicons name="heart" size={56} color={colors.neutral.white} />
          </View>
          <Text style={styles.brandName}>MindConnect</Text>
          <Text style={styles.tagline}>Tu bienestar mental es nuestra prioridad</Text>
        </View>

        {/* User type selection - Side by side vertical cards */}
        <View style={styles.cardsContainer}>
          {/* Client Card */}
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('Login', { userType: 'client' })}
            activeOpacity={0.95}
          >
            <LinearGradient
              colors={[colors.neutral.white, colors.primary[50]]}
              style={styles.cardGradient}
            >
              {/* Icon container */}
              <View style={[styles.iconContainer, styles.iconContainerClient]}>
                <Ionicons name="person" size={48} color={colors.primary.main} />
              </View>

              {/* Card content */}
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>Soy Cliente</Text>
                <Text style={styles.cardDescription}>
                  Busco apoyo profesional
                </Text>
              </View>

              {/* Arrow indicator */}
              <View style={styles.arrowContainer}>
                <Ionicons name="arrow-forward" size={24} color={colors.primary.main} />
              </View>

              {/* Badge */}
              <View style={styles.cardBadge}>
                <Text style={styles.cardBadgeText}>Encuentra tu psicólogo</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* Professional Card */}
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('Login', { userType: 'professional' })}
            activeOpacity={0.95}
          >
            <LinearGradient
              colors={[colors.neutral.white, colors.secondary.blue + '15']}
              style={styles.cardGradient}
            >
              {/* Icon container */}
              <View style={[styles.iconContainer, styles.iconContainerProfessional]}>
                <Ionicons name="medical" size={48} color={colors.secondary.blue} />
              </View>

              {/* Card content */}
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>Soy Profesional</Text>
                <Text style={styles.cardDescription}>
                  Ofrezco mis servicios
                </Text>
              </View>

              {/* Arrow indicator */}
              <View style={styles.arrowContainer}>
                <Ionicons name="arrow-forward" size={24} color={colors.secondary.blue} />
              </View>

              {/* Badge */}
              <View style={[styles.cardBadge, styles.cardBadgeProfessional]}>
                <Text style={[styles.cardBadgeText, styles.cardBadgeTextProfessional]}>
                  Conecta con pacientes
                </Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Footer text */}
        <Text style={styles.footerText}>
          Conectamos personas con profesionales de salud mental
        </Text>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    paddingVertical: screenHeight * 0.06,
    paddingHorizontal: spacing.xl,
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
  },
  decorCircle: {
    position: 'absolute',
    borderRadius: 1000,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  decorCircle1: {
    width: 250,
    height: 250,
    top: -50,
    right: -80,
  },
  decorCircle2: {
    width: 180,
    height: 180,
    bottom: -40,
    left: -60,
  },
  header: {
    alignItems: 'center',
    paddingTop: spacing.lg,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  brandName: {
    fontSize: 38,
    fontWeight: '800',
    color: colors.neutral.white,
    marginBottom: spacing.xs,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  tagline: {
    fontSize: 16,
    color: colors.neutral.white,
    opacity: 0.95,
    textAlign: 'center',
  },
  cardsContainer: {
    flexDirection: 'row',
    gap: spacing.lg,
    paddingHorizontal: screenWidth > 768 ? spacing.xxxl * 2 : 0,
    justifyContent: 'center',
  },
  card: {
    flex: 1,
    maxWidth: 200,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 12,
  },
  cardGradient: {
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    minHeight: screenHeight * 0.45,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  iconContainerClient: {
    backgroundColor: colors.primary[100],
  },
  iconContainerProfessional: {
    backgroundColor: colors.secondary.blue + '25',
  },
  cardContent: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    flex: 1,
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.neutral.gray900,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  cardDescription: {
    fontSize: 15,
    color: colors.neutral.gray600,
    textAlign: 'center',
    lineHeight: 20,
  },
  arrowContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cardBadge: {
    backgroundColor: colors.primary.main,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    alignSelf: 'stretch',
  },
  cardBadgeProfessional: {
    backgroundColor: colors.secondary.blue,
  },
  cardBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.neutral.white,
    textAlign: 'center',
  },
  cardBadgeTextProfessional: {
    color: colors.neutral.white,
  },
  footerText: {
    fontSize: 13,
    color: colors.neutral.white,
    opacity: 0.85,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
});
