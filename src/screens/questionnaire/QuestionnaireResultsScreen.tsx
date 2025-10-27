import React from 'react';
import { View, Text, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import { colors, spacing } from '../../constants/colors';
import { Button } from '../../components/common/Button';
import { SpecialistCard } from '../../components/features/SpecialistCard';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { MatchResult } from '../../utils/matchingAlgorithm';
import { LinearGradient } from 'expo-linear-gradient';

export function QuestionnaireResultsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { width } = useWindowDimensions();
  const results: MatchResult[] = route.params?.results || [];

  // Log the results for debugging
  console.log('📊 QuestionnaireResultsScreen received results:', results);
  console.log('📊 Number of specialists:', results.length);

  const topMatch = results[0];

  // Show message if no results
  if (!results || results.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle" size={64} color={colors.neutral.gray400} />
          <Text style={styles.emptyTitle}>No se encontraron resultados</Text>
          <Text style={styles.emptyDescription}>
            No pudimos encontrar especialistas compatibles. Por favor, intenta de nuevo.
          </Text>
          <Button
            variant="primary"
            size="large"
            onPress={() => navigation.navigate('Home')}
          >
            Volver al inicio
          </Button>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: width > 768 ? spacing.xxxl : spacing.md }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Success header - floating card */}
        <View style={styles.headerCard}>
          <View style={styles.successIconContainer}>
            <LinearGradient
              colors={['#2196F3', '#00897B']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.successIconCircle}
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
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxxl,
  },
  headerCard: {
    backgroundColor: colors.neutral.white,
    marginHorizontal: spacing.md,
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
    padding: spacing.xl,
    borderRadius: 16,
    alignItems: 'center',
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  successIconContainer: {
    marginBottom: spacing.lg,
  },
  successIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2196F3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
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
    width: '100%',
    maxWidth: 1200, // Limit width on tablets
    alignSelf: 'center', // Center on wide screens
  },
  topMatchSection: {
    backgroundColor: colors.neutral.white,
    borderRadius: 16,
    padding: spacing.xl,
    marginBottom: spacing.xl,
    marginHorizontal: spacing.md,
    borderWidth: 2,
    borderColor: '#2196F3',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
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
    marginHorizontal: spacing.md,
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
    marginHorizontal: spacing.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
    maxWidth: 600, // Limit width on tablets
    alignSelf: 'center', // Center on wide screens
    width: '100%',
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.neutral.gray900,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  emptyDescription: {
    fontSize: 16,
    color: colors.neutral.gray600,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.lg,
  },
});
