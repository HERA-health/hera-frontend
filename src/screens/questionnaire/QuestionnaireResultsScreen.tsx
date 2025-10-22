import React from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, Image } from 'react-native';
import { colors, spacing } from '../../constants/colors';
import { Button } from '../../components/common/Button';
import { SpecialistCard } from '../../components/features/SpecialistCard';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { MatchResult } from '../../utils/matchingAlgorithm';
import { LinearGradient } from 'expo-linear-gradient';

const { width: screenWidth } = Dimensions.get('window');

export function QuestionnaireResultsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const results: MatchResult[] = route.params?.results || [];

  const topMatch = results[0];

  return (
    <View style={styles.container}>
      {/* Decorative background */}
      <LinearGradient
        colors={[colors.primary.main, colors.primary.dark]}
        style={styles.backgroundGradient}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Success header - floating card */}
        <View style={styles.headerCard}>
          <View style={styles.successIconContainer}>
            <LinearGradient
              colors={[colors.primary.light, colors.primary.main]}
              style={styles.successIconGradient}
            >
              <Ionicons name="heart" size={48} color={colors.neutral.white} />
            </LinearGradient>
          </View>

          <Text style={styles.title}>¡Encontramos tu match perfecto!</Text>
          <Text style={styles.subtitle}>
            Basándonos en tus respuestas, estos son los profesionales más compatibles contigo
          </Text>
        </View>

        {/* Content container with max-width */}
        <View style={styles.contentContainer}>
          {/* Top match highlight */}
          {topMatch && (
            <View style={styles.topMatchSection}>
              <View style={styles.topMatchBadge}>
                <Ionicons name="trophy" size={20} color={colors.secondary.orange} />
                <Text style={styles.topMatchBadgeText}>Tu Mejor Match</Text>
              </View>

              <SpecialistCard
                specialist={topMatch.specialist}
                onPress={() => navigation.navigate('SpecialistDetail', { specialistId: topMatch.specialist.id })}
              />

              <View style={styles.matchDetails}>
                <Text style={styles.matchDetailsTitle}>
                  ¿Por qué es tu mejor match?
                </Text>
                <View style={styles.matchAttributesList}>
                  {topMatch.matchedAttributes.slice(0, 5).map((attr, index) => (
                    <View key={index} style={styles.matchAttribute}>
                      <View style={styles.checkCircle}>
                        <Ionicons name="checkmark" size={14} color={colors.primary.main} />
                      </View>
                      <Text style={styles.matchAttributeText}>{attr}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* Other matches */}
          {results.length > 1 && (
            <View style={styles.otherMatchesSection}>
              <Text style={styles.sectionTitle}>Otros profesionales compatibles</Text>
              <Text style={styles.sectionSubtitle}>
                También tienen alta afinidad contigo
              </Text>

              {results.slice(1).map(result => (
                <SpecialistCard
                  key={result.specialist.id}
                  specialist={result.specialist}
                  onPress={() => navigation.navigate('SpecialistDetail', { specialistId: result.specialist.id })}
                  style={styles.matchCard}
                />
              ))}
            </View>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            <Button
              variant="primary"
              size="large"
              onPress={() => navigation.navigate('Specialists')}
            >
              Ver todos los especialistas
            </Button>
            <Button
              variant="outline"
              size="large"
              onPress={() => navigation.navigate('Home')}
            >
              Volver al inicio
            </Button>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral.gray50,
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 300,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxxl,
  },
  headerCard: {
    backgroundColor: colors.neutral.white,
    marginHorizontal: screenWidth > 768 ? spacing.xxxl * 2 : spacing.lg,
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
    padding: spacing.xl,
    borderRadius: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  successIconContainer: {
    marginBottom: spacing.lg,
  },
  successIconGradient: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary.main,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.neutral.gray900,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    color: colors.neutral.gray600,
    textAlign: 'center',
    lineHeight: 24,
  },
  contentContainer: {
    paddingHorizontal: screenWidth > 768 ? spacing.xxxl * 2 : spacing.lg,
  },
  topMatchSection: {
    backgroundColor: colors.neutral.white,
    borderRadius: 20,
    padding: spacing.xl,
    marginBottom: spacing.xl,
    borderWidth: 3,
    borderColor: colors.primary.main,
    shadowColor: colors.primary.main,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  topMatchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.secondary.orange + '20',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginBottom: spacing.lg,
    gap: spacing.xs,
  },
  topMatchBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.secondary.orange,
  },
  matchDetails: {
    marginTop: spacing.xl,
    paddingTop: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.neutral.gray200,
  },
  matchDetailsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.neutral.gray900,
    marginBottom: spacing.md,
  },
  matchAttributesList: {
    gap: spacing.sm,
  },
  matchAttribute: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  matchAttributeText: {
    flex: 1,
    fontSize: 15,
    color: colors.neutral.gray700,
  },
  otherMatchesSection: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.neutral.gray900,
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    fontSize: 15,
    color: colors.neutral.gray600,
    marginBottom: spacing.lg,
  },
  matchCard: {
    marginBottom: spacing.md,
  },
  actions: {
    gap: spacing.md,
  },
});
