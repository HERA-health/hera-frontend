/**
 * SpecialistsScreen - Redesigned
 * Modern, clean design matching HERA landing page aesthetics
 *
 * LAYOUT:
 * - Header with title + search bar + view toggle
 * - Horizontal filter chips
 * - Tabs (Especialistas | Publicaciones)
 * - Responsive grid/list of specialist cards
 *
 * FUNCTIONALITY PRESERVED:
 * - API calls and data fetching (unchanged)
 * - Navigation flow (unchanged)
 * - Filtering/search (unchanged)
 * - Matching algorithm (unchanged)
 * - Booking flow trigger (unchanged)
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  useWindowDimensions,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import {
  SpecialistCardGrid,
  SpecialistListItem,
  FilterChips,
  SearchBar,
  ViewToggle,
  SpecialistsLoadingState,
} from './components';
import type { ViewMode, FilterOption } from './components';
import { heraLanding, spacing, shadows, borderRadius, branding, colors } from '../../constants/colors';
import { SortOption, Specialist, RootStackParamList } from '../../constants/types';
import * as specialistsService from '../../services/specialistsService';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Specialists'>;

// Available filter options
const FILTER_OPTIONS: FilterOption[] = [
  { id: 'ansiedad', label: 'Ansiedad', icon: 'pulse-outline' },
  { id: 'pareja', label: 'Pareja', icon: 'heart-outline' },
  { id: 'depresion', label: 'Depresion', icon: 'sad-outline' },
  { id: 'trauma', label: 'Trauma', icon: 'shield-outline' },
  { id: 'estres', label: 'Estres', icon: 'flash-outline' },
  { id: 'autoestima', label: 'Autoestima', icon: 'star-outline' },
];

const SpecialistsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const isTablet = width >= 768 && width < 1024;
  const isMobile = width < 768;

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('affinity');
  const [activeTab, setActiveTab] = useState<'specialists' | 'posts'>('specialists');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [matchedSpecialists, setMatchedSpecialists] = useState<Specialist[]>([]);
  const [allSpecialists, setAllSpecialists] = useState<Specialist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasCompletedQuestionnaire, setHasCompletedQuestionnaire] = useState(false);

  // Animation values
  const headerOpacity = React.useRef(new Animated.Value(0)).current;

  // Fetch specialists on mount
  useEffect(() => {
    fetchSpecialists();

    // Animate header
    Animated.timing(headerOpacity, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  // Translation map for matched attributes
  const attributeLabels: Record<string, string> = {
    specialty: 'Especialidad coincidente',
    approach: 'Enfoque terapeutico',
    sessionStyle: 'Estilo de sesion',
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
          matchedData = matchedResponse.specialists.map((s) => {
            const name = s.user.name;
            const initial = name.charAt(0).toUpperCase();
            const affinityPercentage = s.affinity ? Math.round((s.affinity / 130) * 100) : 0;

            const translatedTags = (s.matchedAttributes || [])
              .map((attr: string) => attributeLabels[attr] || attr)
              .filter((tag: string) => tag);

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
        }
      } catch (matchErr: any) {
        console.log('Could not fetch matched specialists:', matchErr.message);
      }

      // Always fetch all specialists as fallback/supplement
      const allSpecialistsData = await specialistsService.getAllSpecialists();

      const mappedAllSpecialists: Specialist[] = allSpecialistsData.map((s) => {
        const name = s.user.name;
        const initial = name.charAt(0).toUpperCase();
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
    } catch (err: any) {
      console.error('Error fetching specialists:', err);
      setError(err.message || 'Error al cargar especialistas');
    } finally {
      setLoading(false);
    }
  };

  const handleSpecialistPress = useCallback((specialistId: string) => {
    const specialist = matchedSpecialists.find(s => s.id === specialistId) ||
                      allSpecialists.find(s => s.id === specialistId);
    const affinity = specialist ? specialist.affinityPercentage / 100 : undefined;

    navigation.navigate('SpecialistDetail', {
      specialistId,
      affinity,
    });
  }, [matchedSpecialists, allSpecialists, navigation]);

  const handleSort = () => {
    Alert.alert(
      'Ordenar por',
      'Selecciona un criterio de ordenacion',
      [
        { text: 'Afinidad (Recomendado)', onPress: () => setSortOption('affinity') },
        { text: 'Mejor valorados', onPress: () => setSortOption('rating') },
        { text: 'Precio mas bajo', onPress: () => setSortOption('price_low') },
        { text: 'Precio mas alto', onPress: () => setSortOption('price_high') },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  };

  const getSortLabel = () => {
    switch (sortOption) {
      case 'affinity': return 'Afinidad';
      case 'rating': return 'Valoracion';
      case 'price_low': return 'Precio: Bajo';
      case 'price_high': return 'Precio: Alto';
      default: return 'Ordenar';
    }
  };

  // Combine and filter specialists
  const matchedIds = matchedSpecialists.map(s => s.id);
  const unmatchedSpecialists = allSpecialists.filter(s => !matchedIds.includes(s.id));
  const combinedSpecialists = [...matchedSpecialists, ...unmatchedSpecialists];

  const filteredSpecialists = combinedSpecialists
    .filter((specialist) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          specialist.name.toLowerCase().includes(query) ||
          specialist.specialization.toLowerCase().includes(query) ||
          specialist.tags.some((tag) => tag.toLowerCase().includes(query));
        if (!matchesSearch) return false;
      }

      // Category filters
      if (selectedFilters.length > 0) {
        const matchesFilter = selectedFilters.some(filter =>
          specialist.specialization.toLowerCase().includes(filter.toLowerCase()) ||
          specialist.tags.some(tag => tag.toLowerCase().includes(filter.toLowerCase()))
        );
        if (!matchesFilter) return false;
      }

      return true;
    })
    .sort((a, b) => {
      switch (sortOption) {
        case 'affinity':
          if (b.affinityPercentage !== a.affinityPercentage) {
            return b.affinityPercentage - a.affinityPercentage;
          }
          return a.name.localeCompare(b.name);
        case 'rating':
          if (b.rating !== a.rating) return b.rating - a.rating;
          return b.reviewCount - a.reviewCount;
        case 'price_low':
          return a.pricePerSession - b.pricePerSession;
        case 'price_high':
          return b.pricePerSession - a.pricePerSession;
        default:
          return 0;
      }
    });

  // Calculate grid columns based on screen size
  const gridColumns = isDesktop ? 3 : isTablet ? 2 : 1;

  // Render questionnaire banner
  const renderQuestionnaireBanner = () => (
    <TouchableOpacity
      style={styles.questionnaireBanner}
      onPress={() => navigation.navigate('Questionnaire')}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={heraLanding.gradientPrimary as [string, string]}
        style={styles.questionnaireBannerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <View style={styles.questionnaireBannerContent}>
          <View style={styles.questionnaireBannerIcon}>
            <Ionicons name="heart" size={28} color="#FFFFFF" />
          </View>
          <View style={styles.questionnaireBannerText}>
            <Text style={styles.questionnaireBannerTitle}>
              Descubre tus mejores matches
            </Text>
            <Text style={styles.questionnaireBannerSubtitle}>
              Completa el cuestionario para ver especialistas personalizados
            </Text>
          </View>
          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="search-outline" size={48} color={heraLanding.textMuted} />
      </View>
      <Text style={styles.emptyTitle}>No encontramos especialistas</Text>
      <Text style={styles.emptyDescription}>
        Intenta con otros terminos de busqueda o ajusta tus filtros
      </Text>
      {(searchQuery || selectedFilters.length > 0) && (
        <TouchableOpacity
          style={styles.clearFiltersButton}
          onPress={() => {
            setSearchQuery('');
            setSelectedFilters([]);
          }}
        >
          <Text style={styles.clearFiltersText}>Limpiar filtros</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // Render error state
  const renderErrorState = () => (
    <View style={styles.errorContainer}>
      <View style={styles.errorIconContainer}>
        <Ionicons name="alert-circle-outline" size={56} color={heraLanding.warning} />
      </View>
      <Text style={styles.errorTitle}>Error al cargar</Text>
      <Text style={styles.errorDescription}>{error}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={fetchSpecialists}>
        <Ionicons name="refresh" size={18} color="#FFFFFF" />
        <Text style={styles.retryButtonText}>Reintentar</Text>
      </TouchableOpacity>
    </View>
  );

  // Render posts empty state
  const renderEmptyPosts = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="document-text-outline" size={48} color={heraLanding.textMuted} />
      </View>
      <Text style={styles.emptyTitle}>Proximamente</Text>
      <Text style={styles.emptyDescription}>
        Publicaciones y articulos de especialistas estaran disponibles pronto
      </Text>
    </View>
  );

  // Render specialist grid
  const renderSpecialistsGrid = () => {
    const rows = [];
    for (let i = 0; i < filteredSpecialists.length; i += gridColumns) {
      const rowSpecialists = filteredSpecialists.slice(i, i + gridColumns);
      rows.push(
        <View key={i} style={styles.gridRow}>
          {rowSpecialists.map((specialist, index) => {
            const position = (i + index) < 3 ? ((i + index + 1) as 1 | 2 | 3) : undefined;
            return (
              <View key={specialist.id} style={[styles.gridItem, { maxWidth: `${100 / gridColumns}%` }]}>
                <SpecialistCardGrid
                  specialist={specialist}
                  position={position}
                  onPress={() => handleSpecialistPress(specialist.id)}
                  animationDelay={(i + index) * 50}
                />
              </View>
            );
          })}
          {/* Fill empty slots */}
          {rowSpecialists.length < gridColumns &&
            Array.from({ length: gridColumns - rowSpecialists.length }).map((_, idx) => (
              <View key={`empty-${idx}`} style={[styles.gridItem, { maxWidth: `${100 / gridColumns}%` }]} />
            ))
          }
        </View>
      );
    }
    return rows;
  };

  // Render specialist list
  const renderSpecialistsList = () => (
    <View style={styles.listContainer}>
      {filteredSpecialists.map((specialist, index) => {
        const position = index < 3 ? ((index + 1) as 1 | 2 | 3) : undefined;
        return (
          <SpecialistListItem
            key={specialist.id}
            specialist={specialist}
            position={position}
            onPress={() => handleSpecialistPress(specialist.id)}
            animationDelay={index * 50}
          />
        );
      })}
    </View>
  );

  // Main render
  if (error) {
    return (
      <View style={styles.screenContainer}>
        <View style={styles.container}>
          {renderErrorState()}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screenContainer}>
      <View style={styles.container}>
        {/* Header Section */}
        <Animated.View style={[styles.headerSection, { opacity: headerOpacity }]}>
          {/* Title Row */}
          <View style={[styles.headerRow, isDesktop && styles.headerRowDesktop]}>
            <View style={styles.titleContainer}>
              <Text style={styles.pageTitle}>Encuentra tu especialista</Text>
              {!loading && (
                <Text style={styles.resultsCount}>
                  {filteredSpecialists.length} especialista{filteredSpecialists.length !== 1 ? 's' : ''} disponible{filteredSpecialists.length !== 1 ? 's' : ''}
                </Text>
              )}
            </View>

            {/* Search + View Toggle (Desktop) */}
            {isDesktop && (
              <View style={styles.headerControls}>
                <View style={styles.searchContainer}>
                  <SearchBar
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Buscar por nombre o especialidad..."
                  />
                </View>
                <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
              </View>
            )}
          </View>

          {/* Search (Mobile/Tablet) */}
          {!isDesktop && (
            <View style={styles.mobileSearchRow}>
              <View style={styles.searchContainerMobile}>
                <SearchBar
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Buscar especialistas..."
                />
              </View>
              {!isMobile && (
                <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
              )}
            </View>
          )}

          {/* Sort Button */}
          <View style={styles.sortRow}>
            <TouchableOpacity style={styles.sortButton} onPress={handleSort}>
              <Ionicons name="swap-vertical" size={16} color={heraLanding.textSecondary} />
              <Text style={styles.sortButtonText}>{getSortLabel()}</Text>
              <Ionicons name="chevron-down" size={14} color={heraLanding.textMuted} />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Filter Chips */}
        <FilterChips
          filters={FILTER_OPTIONS}
          selectedFilters={selectedFilters}
          onFilterChange={setSelectedFilters}
        />

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'specialists' && styles.tabActive]}
            onPress={() => setActiveTab('specialists')}
          >
            <Text style={[styles.tabText, activeTab === 'specialists' && styles.tabTextActive]}>
              Especialistas
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'posts' && styles.tabActive]}
            onPress={() => setActiveTab('posts')}
          >
            <Text style={[styles.tabText, activeTab === 'posts' && styles.tabTextActive]}>
              Publicaciones
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        {activeTab === 'specialists' ? (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingHorizontal: isDesktop ? spacing.xxxl : spacing.lg }
            ]}
            showsVerticalScrollIndicator={false}
          >
            {/* Questionnaire Banner */}
            {!hasCompletedQuestionnaire && !loading && renderQuestionnaireBanner()}

            {/* Loading State */}
            {loading && (
              <SpecialistsLoadingState
                count={6}
                viewMode={viewMode}
              />
            )}

            {/* Specialists */}
            {!loading && filteredSpecialists.length > 0 && (
              viewMode === 'grid' ? renderSpecialistsGrid() : renderSpecialistsList()
            )}

            {/* Empty State */}
            {!loading && filteredSpecialists.length === 0 && renderEmptyState()}

            {/* Bottom spacing */}
            <View style={styles.bottomSpacer} />
          </ScrollView>
        ) : (
          <View style={styles.postsContainer}>
            {renderEmptyPosts()}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: heraLanding.background, // Light Sage #F5F7F5
  },
  container: {
    flex: 1,
  },

  // Header Section
  headerSection: {
    backgroundColor: '#FFFFFF',
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: heraLanding.border,
  },
  headerRow: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  headerRowDesktop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.xxxl,
  },
  titleContainer: {
    marginBottom: spacing.sm,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: heraLanding.textPrimary,
    marginBottom: 4,
  },
  resultsCount: {
    fontSize: 14,
    color: heraLanding.textSecondary,
  },
  headerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  searchContainer: {
    width: 360,
  },
  mobileSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  searchContainerMobile: {
    flex: 1,
  },
  sortRow: {
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: heraLanding.background,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  sortButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: heraLanding.textSecondary,
  },

  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: heraLanding.border,
    gap: spacing.xl,
  },
  tab: {
    paddingVertical: spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: heraLanding.primary,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
    color: heraLanding.textSecondary,
  },
  tabTextActive: {
    color: heraLanding.primary,
    fontWeight: '600',
  },

  // Content
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },

  // Grid Layout
  gridRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  gridItem: {
    flex: 1,
    minWidth: 280,
  },

  // List Layout
  listContainer: {
    gap: spacing.md,
  },

  // Questionnaire Banner
  questionnaireBanner: {
    marginBottom: spacing.xl,
    borderRadius: 16,
    overflow: 'hidden',
    ...shadows.md,
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
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  questionnaireBannerText: {
    flex: 1,
  },
  questionnaireBannerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  questionnaireBannerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 20,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: heraLanding.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: heraLanding.textPrimary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 15,
    color: heraLanding.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  clearFiltersButton: {
    backgroundColor: heraLanding.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 10,
  },
  clearFiltersText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Error State
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  errorIconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: `${heraLanding.warning}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: heraLanding.textPrimary,
    marginBottom: spacing.sm,
  },
  errorDescription: {
    fontSize: 15,
    color: heraLanding.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: heraLanding.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 10,
  },
  retryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Posts
  postsContainer: {
    flex: 1,
    padding: spacing.lg,
  },

  // Spacing
  bottomSpacer: {
    height: spacing.xxxl,
  },
});

export default SpecialistsScreen;
