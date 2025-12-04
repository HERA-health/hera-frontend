/**
 * SpecialistsScreen
 * Browse and search specialists with filters and sorting
 * Displays all specialist cards with affinity percentages
 *
 * LAYOUT STRUCTURE:
 * - Header with title
 * - Search bar (full width, gray background)
 * - Filters and Sort row (horizontal with space-between)
 * - Tabs (Especialistas | Publicaciones)
 * - Scrollable list of ALL specialist cards
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { SpecialistCard } from '../../components/features/SpecialistCard';
import { GradientBackground } from '../../components/common/GradientBackground';
import { colors, spacing, typography, borderRadius, branding, shadows } from '../../constants/colors';
import { SortOption, Specialist, RootStackParamList } from '../../constants/types';
import * as specialistsService from '../../services/specialistsService';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Specialists'>;

const SpecialistsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('affinity');
  const [activeTab, setActiveTab] = useState<'specialists' | 'posts'>('specialists');
  const [matchedSpecialists, setMatchedSpecialists] = useState<Specialist[]>([]);
  const [allSpecialists, setAllSpecialists] = useState<Specialist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasCompletedQuestionnaire, setHasCompletedQuestionnaire] = useState(false);
  const { width } = useWindowDimensions();

  // Fetch specialists on mount
  useEffect(() => {
    fetchSpecialists();
  }, []);

  // Translation map for matched attributes
  const attributeLabels: Record<string, string> = {
    specialty: 'Especialidad coincidente',
    approach: 'Enfoque terapéutico',
    sessionStyle: 'Estilo de sesión',
    personality: 'Personalidad compatible',
    ageGroup: 'Experiencia con tu edad',
    availability: 'Disponibilidad',
    format: 'Modalidad compatible',
    experience: 'Alta experiencia',
  };

  const fetchSpecialists = async () => {
    try {
      setLoading(true);
      setError(null);

      // Try to fetch matched specialists first (requires auth)
      let matchedData: Specialist[] = [];
      let hasQuestionnaire = false;

      try {
        const matchedResponse = await specialistsService.getMatchedSpecialists();
        hasQuestionnaire = matchedResponse.hasCompletedQuestionnaire;

        if (hasQuestionnaire && matchedResponse.specialists.length > 0) {
          // Map matched specialists with real affinity scores
          matchedData = matchedResponse.specialists.map((s) => {
            const name = s.user.name;
            const initial = name.charAt(0).toUpperCase();
            const affinityPercentage = s.affinity ? Math.round((s.affinity / 130) * 100) : 0;

            // Translate matched attributes to user-friendly Spanish labels
            const translatedTags = (s.matchedAttributes || [])
              .map((attr: string) => attributeLabels[attr] || attr)
              .filter((tag: string) => tag); // Remove empty tags

            return {
              id: s.id,
              name,
              avatar: s.avatar || undefined,
              initial,
              specialization: s.specialization,
              rating: s.rating,
              reviewCount: s.reviewCount,
              description: s.description,
              affinityPercentage,
              tags: translatedTags,
              pricePerSession: s.pricePerSession,
              firstVisitFree: s.firstVisitFree,
              verified: true,
              matchingProfile: {
                therapeuticApproach: [],
                specialties: [],
                sessionStyle: '',
                personality: [],
                ageGroups: [],
                experienceYears: 0,
                language: [],
                availability: '',
                format: [],
              },
            };
          });

          console.log('✅ Fetched matched specialists:', matchedData.length);
        }
      } catch (matchErr: any) {
        // If matched specialists fetch fails (e.g., not authenticated), continue with all specialists
        console.log('ℹ️ Could not fetch matched specialists (user may not be authenticated):', matchErr.message);
      }

      // Always fetch all specialists as fallback/supplement
      const allSpecialistsData = await specialistsService.getAllSpecialists();

      // Map all specialists to frontend format
      const mappedAllSpecialists: Specialist[] = allSpecialistsData.map((s) => {
        const name = s.user.name;
        const initial = name.charAt(0).toUpperCase();

        // Use rating as affinity proxy for non-matched specialists
        const affinityPercentage = Math.round((s.rating / 5) * 100);
        const tags = s.matchedAttributes || [];

        return {
          id: s.id,
          name,
          avatar: s.avatar || undefined,
          initial,
          specialization: s.specialization,
          rating: s.rating,
          reviewCount: s.reviewCount,
          description: s.description,
          affinityPercentage,
          tags,
          pricePerSession: s.pricePerSession,
          firstVisitFree: s.firstVisitFree,
          verified: true,
          matchingProfile: {
            therapeuticApproach: [],
            specialties: [],
            sessionStyle: '',
            personality: [],
            ageGroups: [],
            experienceYears: 0,
            language: [],
            availability: '',
            format: [],
          },
        };
      });

      setMatchedSpecialists(matchedData);
      setAllSpecialists(mappedAllSpecialists);
      setHasCompletedQuestionnaire(hasQuestionnaire);

      console.log(`📊 Loaded ${matchedData.length} matched, ${mappedAllSpecialists.length} total specialists`);
    } catch (err: any) {
      console.error('Error fetching specialists:', err);
      setError(err.message || 'Error al cargar especialistas');
    } finally {
      setLoading(false);
    }
  };

  const handleSpecialistPress = (specialistId: string) => {
    // Find the specialist in matched or all specialists to get their affinity score
    const specialist = matchedSpecialists.find(s => s.id === specialistId) ||
                      allSpecialists.find(s => s.id === specialistId);
    const affinity = specialist ? specialist.affinityPercentage / 100 : undefined;

    navigation.navigate('SpecialistDetail', {
      specialistId,
      affinity,
    });
  };

  const handleFilters = () => {
    Alert.alert(
      'Filtros',
      'Filtrar por: especialización, rango de precio, disponibilidad, idiomas, etc.',
      [{ text: 'Entendido' }]
    );
  };

  const handleSort = () => {
    Alert.alert(
      'Ordenar por',
      'Selecciona un criterio de ordenación',
      [
        { text: 'Afinidad (Recomendado)', onPress: () => setSortOption('affinity') },
        { text: 'Mejor valorados', onPress: () => setSortOption('rating') },
        { text: 'Precio más bajo', onPress: () => setSortOption('price_low') },
        { text: 'Precio más alto', onPress: () => setSortOption('price_high') },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  };

  const getSortLabel = () => {
    switch (sortOption) {
      case 'affinity':
        return 'Afinidad (Recomendado)';
      case 'rating':
        return 'Mejor valorados';
      case 'price_low':
        return 'Precio: Menor a Mayor';
      case 'price_high':
        return 'Precio: Mayor a Menor';
      default:
        return 'Ordenar por';
    }
  };

  // Combine specialists: matched first, then others (excluding duplicates)
  const matchedIds = matchedSpecialists.map(s => s.id);
  const otherSpecialists = allSpecialists.filter(s => !matchedIds.includes(s.id));

  // Filter and sort matched specialists
  const filteredMatchedSpecialists = matchedSpecialists
    .filter((specialist) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        specialist.name.toLowerCase().includes(query) ||
        specialist.specialization.toLowerCase().includes(query) ||
        specialist.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    })
    .sort((a, b) => {
      switch (sortOption) {
        case 'affinity':
          return b.affinityPercentage - a.affinityPercentage;
        case 'rating':
          if (b.rating !== a.rating) {
            return b.rating - a.rating;
          }
          return b.reviewCount - a.reviewCount;
        case 'price_low':
          return a.pricePerSession - b.pricePerSession;
        case 'price_high':
          return b.pricePerSession - a.pricePerSession;
        default:
          return 0;
      }
    });

  // Filter and sort other specialists
  const filteredOtherSpecialists = otherSpecialists
    .filter((specialist) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        specialist.name.toLowerCase().includes(query) ||
        specialist.specialization.toLowerCase().includes(query) ||
        specialist.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    })
    .sort((a, b) => {
      switch (sortOption) {
        case 'affinity':
          return b.affinityPercentage - a.affinityPercentage;
        case 'rating':
          if (b.rating !== a.rating) {
            return b.rating - a.rating;
          }
          return b.reviewCount - a.reviewCount;
        case 'price_low':
          return a.pricePerSession - b.pricePerSession;
        case 'price_high':
          return b.pricePerSession - a.pricePerSession;
        default:
          return 0;
      }
    });

  // Combine for total count
  const allFilteredSpecialists = [...filteredMatchedSpecialists, ...filteredOtherSpecialists];

  // Render matched specialist card with special styling
  const renderMatchedSpecialistItem = ({ item, index }: { item: Specialist; index: number }) => (
    <View style={styles.matchedCardWrapper}>
      <SpecialistCard
        specialist={item}
        position={index < 3 ? (index + 1) as 1 | 2 | 3 : undefined}
        onPress={() => handleSpecialistPress(item.id)}
      />
    </View>
  );

  // Render regular specialist card
  const renderSpecialistItem = ({ item }: { item: Specialist }) => (
    <SpecialistCard
      specialist={item}
      onPress={() => handleSpecialistPress(item.id)}
    />
  );

  // Render questionnaire banner for users who haven't completed it
  const renderQuestionnaireBanner = () => (
    <TouchableOpacity
      style={styles.questionnaireBanner}
      onPress={() => navigation.navigate('Questionnaire')}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={[branding.primary, branding.secondary, branding.accent]}
        style={styles.questionnaireBannerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <View style={styles.questionnaireBannerContent}>
          <View style={styles.questionnaireBannerIcon}>
            <Ionicons name="heart" size={32} color={colors.neutral.white} />
          </View>
          <View style={styles.questionnaireBannerText}>
            <Text style={styles.questionnaireBannerTitle}>
              Descubre tus mejores matches
            </Text>
            <Text style={styles.questionnaireBannerSubtitle}>
              Completa el cuestionario para ver especialistas personalizados para ti
            </Text>
          </View>
          <Ionicons name="arrow-forward" size={24} color={colors.neutral.white} />
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  // Render section header
  const renderSectionHeader = (title: string, count: number) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderTitle}>{title}</Text>
      <Text style={styles.sectionHeaderCount}>({count})</Text>
    </View>
  );

  // Empty state for no results
  const renderEmptySpecialists = () => {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="search" size={64} color={colors.neutral.gray300} />
        <Text style={styles.emptyTitle}>No se encontraron resultados</Text>
        <Text style={styles.emptyDescription}>
          Intenta con otros términos de búsqueda o ajusta tus filtros
        </Text>
      </View>
    );
  };

  // Empty state for posts tab
  const renderEmptyPosts = () => (
    <View style={styles.emptyState}>
      <Ionicons name="document-text" size={64} color={colors.neutral.gray300} />
      <Text style={styles.emptyTitle}>Próximamente</Text>
      <Text style={styles.emptyDescription}>
        Publicaciones y artículos de especialistas estarán disponibles pronto
      </Text>
    </View>
  );

  // Show loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.main} />
        <Text style={styles.loadingText}>Cargando especialistas...</Text>
      </View>
    );
  }

  // Show error state
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={64} color={colors.feedback.error} />
        <Text style={styles.errorTitle}>Error al cargar</Text>
        <Text style={styles.errorDescription}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchSpecialists}>
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <GradientBackground>
      <View style={styles.container}>
        {/* Search Bar - Full Width with Gray Background */}
        <View style={styles.searchSection}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color={colors.neutral.gray600} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar especialistas, temas, síntomas..."
            placeholderTextColor={colors.neutral.gray600}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={colors.neutral.gray600} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filters and Sort Row - Horizontal with Space Between */}
        <View style={styles.filterRow}>
          <TouchableOpacity style={styles.filterButton} onPress={handleFilters}>
            <Ionicons name="options" size={18} color={colors.neutral.gray900} />
            <Text style={styles.filterButtonText}>Filtros</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.sortButton} onPress={handleSort}>
            <Text style={styles.sortButtonText}>{getSortLabel()}</Text>
            <Ionicons name="chevron-down" size={16} color={colors.neutral.gray600} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs - Especialistas | Publicaciones */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'specialists' && styles.tabActive]}
          onPress={() => setActiveTab('specialists')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'specialists' && styles.tabTextActive,
            ]}
          >
            Especialistas
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'posts' && styles.tabActive]}
          onPress={() => setActiveTab('posts')}
        >
          <Text
            style={[styles.tabText, activeTab === 'posts' && styles.tabTextActive]}
          >
            Publicaciones
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content - Sectioned list with matched specialists first */}
      {activeTab === 'specialists' ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.listContent,
            { paddingHorizontal: width > 768 ? spacing.xxxl : spacing.lg }
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Questionnaire Banner (if not completed) */}
          {!hasCompletedQuestionnaire && renderQuestionnaireBanner()}

          {/* Matched Specialists Section (if questionnaire completed) */}
          {hasCompletedQuestionnaire && filteredMatchedSpecialists.length > 0 && (
            <View style={styles.matchedSection}>
              {renderSectionHeader('⭐ Tus Mejores Matches', filteredMatchedSpecialists.length)}
              {filteredMatchedSpecialists.slice(0, 5).map((specialist, index) => (
                <View key={specialist.id}>
                  {renderMatchedSpecialistItem({ item: specialist, index })}
                </View>
              ))}
            </View>
          )}

          {/* Other Specialists Section */}
          {allFilteredSpecialists.length > 0 && (
            <View style={styles.otherSection}>
              {hasCompletedQuestionnaire && filteredMatchedSpecialists.length > 0
                ? renderSectionHeader('📋 Otros Especialistas', filteredOtherSpecialists.length)
                : renderSectionHeader('📋 Todos los Especialistas', allFilteredSpecialists.length)
              }
              {(hasCompletedQuestionnaire ? filteredOtherSpecialists : allFilteredSpecialists).map((specialist) => (
                <View key={specialist.id}>
                  {renderSpecialistItem({ item: specialist })}
                </View>
              ))}
            </View>
          )}

          {/* Empty State */}
          {allFilteredSpecialists.length === 0 && renderEmptySpecialists()}
        </ScrollView>
      ) : (
        <View style={styles.postsContainer}>
          {renderEmptyPosts()}
        </View>
      )}
      </View>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // GradientBackground handles the background
  },
  scrollView: {
    flex: 1,
  },
  searchSection: {
    backgroundColor: branding.cardBackground,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray200,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.gray50,
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.neutral.gray900,
    paddingVertical: 0,
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: branding.accentLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: branding.accent,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.gray100,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    gap: spacing.xs,
  },
  sortButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.neutral.gray700,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: branding.cardBackground,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray200,
    gap: spacing.lg,
  },
  tab: {
    paddingVertical: spacing.md,
    paddingHorizontal: 0,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: branding.accent,
  },
  tabText: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.medium,
    color: colors.neutral.gray600,
  },
  tabTextActive: {
    color: branding.accent,
    fontWeight: typography.fontWeights.semibold,
  },
  listContent: {
    paddingVertical: spacing.lg,
    flexGrow: 1,
  },
  postsContainer: {
    flex: 1,
    padding: spacing.lg,
  },
  resultsText: {
    fontSize: typography.fontSizes.sm,
    color: colors.neutral.gray600,
    marginBottom: spacing.md,
    fontWeight: typography.fontWeights.medium,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl * 2,
  },
  emptyTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.semibold,
    color: colors.neutral.gray900,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  emptyDescription: {
    fontSize: typography.fontSizes.sm,
    color: colors.neutral.gray600,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
    lineHeight: typography.fontSizes.sm * typography.lineHeights.relaxed,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    gap: spacing.md,
  },
  loadingText: {
    fontSize: typography.fontSizes.md,
    color: colors.neutral.gray600,
    fontWeight: typography.fontWeights.medium,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  errorTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.semibold,
    color: colors.neutral.gray900,
    marginTop: spacing.md,
  },
  errorDescription: {
    fontSize: typography.fontSizes.sm,
    color: colors.neutral.gray600,
    textAlign: 'center',
    lineHeight: typography.fontSizes.sm * typography.lineHeights.relaxed,
  },
  retryButton: {
    backgroundColor: colors.primary.main,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 12,
    marginTop: spacing.md,
  },
  retryButtonText: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
    color: colors.neutral.white,
  },
  // Questionnaire Banner Styles
  questionnaireBanner: {
    marginBottom: spacing.xl,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#2196F3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  questionnaireBannerGradient: {
    padding: spacing.lg,
  },
  questionnaireBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  questionnaireBannerIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  questionnaireBannerText: {
    flex: 1,
  },
  questionnaireBannerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.neutral.white,
    marginBottom: spacing.xs,
  },
  questionnaireBannerSubtitle: {
    fontSize: 14,
    color: colors.neutral.white,
    opacity: 0.95,
    lineHeight: 20,
  },
  // Section Header Styles
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  sectionHeaderTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.neutral.gray900,
  },
  sectionHeaderCount: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.neutral.gray600,
    marginLeft: spacing.xs,
  },
  // Section Container Styles
  matchedSection: {
    marginBottom: spacing.xl,
  },
  otherSection: {
    marginBottom: spacing.lg,
  },
  // Matched Card Wrapper with Subtle Visual Differentiation
  matchedCardWrapper: {
    marginBottom: spacing.md,
    borderRadius: 16,
    // Remove harsh blue border, use subtle shadow glow instead
    shadowColor: '#2196F3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
});

export default SpecialistsScreen;
