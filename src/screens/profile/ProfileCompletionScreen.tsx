/**
 * ProfileCompletionScreen
 * Encourages users to complete the affinity questionnaire
 * Shows the 3-step process and "Why HERA" features
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { colors, spacing, typography, borderRadius } from '../../constants/colors';
import { whyHERAFeatures } from '../../utils/mockData';

const ProfileCompletionScreen: React.FC = () => {
  const navigation = useNavigation<any>();

  const handleStartQuestionnaire = () => {
    navigation.navigate('Questionnaire');
  };

  const handleClose = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header with close button */}
        <View style={styles.header}>
          <Button variant="ghost" size="small" onPress={handleClose}>
            <Ionicons name="close" size={24} color={colors.neutral.gray900} />
          </Button>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Success Icon */}
          <View style={styles.iconContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name="checkmark-circle" size={64} color={colors.primary.main} />
            </View>
          </View>

          {/* Title */}
          <Text style={styles.title}>
            ¡Completa tu perfil para mejores resultados!
          </Text>

          {/* Description */}
          <Text style={styles.description}>
            Responde nuestro cuestionario de afinidad y te conectaremos con los
            especialistas más compatibles con tu personalidad y necesidades.
          </Text>

          {/* Process Steps */}
          <View style={styles.stepsSection}>
            <View style={styles.stepItem}>
              <View style={[styles.stepIcon, { backgroundColor: colors.background.tertiary }]}>
                <Ionicons name="clipboard" size={24} color={colors.primary.main} />
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>1. Responde 15 preguntas</Text>
                <Text style={styles.stepDescription}>
                  Solo 5 minutos sobre tus preferencias y valores
                </Text>
              </View>
            </View>

            <View style={styles.stepConnector} />

            <View style={styles.stepItem}>
              <View style={[styles.stepIcon, { backgroundColor: '#F3E8FF' }]}>
                <Ionicons name="analytics" size={24} color={colors.secondary.purple} />
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>2. Algoritmo de matching</Text>
                <Text style={styles.stepDescription}>
                  Analizamos tu perfil para encontrar afinidades
                </Text>
              </View>
            </View>

            <View style={styles.stepConnector} />

            <View style={styles.stepItem}>
              <View style={[styles.stepIcon, { backgroundColor: colors.background.success }]}>
                <Ionicons name="people" size={24} color={colors.primary.main} />
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>3. Encuentra tu especialista</Text>
                <Text style={styles.stepDescription}>
                  Te mostramos especialistas ordenados por afinidad
                </Text>
              </View>
            </View>
          </View>

          {/* CTA Button */}
          <Button
            variant="secondary"
            size="large"
            onPress={handleStartQuestionnaire}
            fullWidth
            style={styles.ctaButton}
          >
            Comenzar Cuestionario
          </Button>

          {/* Why HERA Section */}
          <View style={styles.whySection}>
            <Text style={styles.whyTitle}>¿Por qué HERA?</Text>

            <View style={styles.whyGrid}>
              {whyHERAFeatures.map((feature) => (
                <Card key={feature.id} style={styles.whyCard} padding="medium">
                  <View style={styles.whyIconContainer}>
                    <Ionicons
                      name={feature.icon as any}
                      size={24}
                      color={colors.primary.main}
                    />
                  </View>
                  <Text style={styles.whyCardTitle}>{feature.title}</Text>
                  <Text style={styles.whyCardDescription}>{feature.description}</Text>
                </Card>
              ))}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  iconCircle: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: typography.fontSizes.xxl,
    fontWeight: typography.fontWeights.bold,
    color: colors.neutral.gray900,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  description: {
    fontSize: typography.fontSizes.md,
    color: colors.neutral.gray600,
    textAlign: 'center',
    lineHeight: typography.fontSizes.md * typography.lineHeights.relaxed,
    marginBottom: spacing.xl,
  },
  stepsSection: {
    marginBottom: spacing.xl,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepContent: {
    flex: 1,
    marginLeft: spacing.md,
    paddingTop: spacing.xs,
  },
  stepTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.semibold,
    color: colors.neutral.gray900,
    marginBottom: spacing.xs / 2,
  },
  stepDescription: {
    fontSize: typography.fontSizes.sm,
    color: colors.neutral.gray600,
    lineHeight: typography.fontSizes.sm * typography.lineHeights.normal,
  },
  stepConnector: {
    width: 2,
    height: 32,
    backgroundColor: colors.neutral.gray200,
    marginLeft: 23,
    marginVertical: spacing.sm,
  },
  ctaButton: {
    marginBottom: spacing.xxl,
  },
  whySection: {
    marginTop: spacing.lg,
  },
  whyTitle: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.bold,
    color: colors.neutral.gray900,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  whyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  whyCard: {
    width: '48%',
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  whyIconContainer: {
    width: 48,
    height: 48,
    backgroundColor: colors.background.tertiary,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  whyCardTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    color: colors.neutral.gray900,
    textAlign: 'center',
    marginBottom: spacing.xs / 2,
  },
  whyCardDescription: {
    fontSize: typography.fontSizes.xs,
    color: colors.neutral.gray600,
    textAlign: 'center',
    lineHeight: typography.fontSizes.xs * typography.lineHeights.normal,
  },
});

export default ProfileCompletionScreen;
