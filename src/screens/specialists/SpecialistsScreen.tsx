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
import * as clientService from '../../services/clientService';
import { useAuth } from '../../contexts/AuthContext';

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

// Distance options for proximity filter (in km)
const DISTANCE_OPTIONS = [
  { value: 5, label: '5 km' },
  { value: 10, label: '10 km' },
  { value: 15, label: '15 km' },
  { value: 25, label: '25 km' },
  { value: 50, label: '50 km' },
];

const SpecialistsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
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

  // Proximity filter state
  const [proximityEnabled, setProximityEnabled] = useState(false);
  const [maxDistance, setMaxDistance] = useState(10); // Default 10km
  const [clientLocation, setClientLocation] = useState<{
    lat: number | null;
    lng: number | null;
    hasLocation: boolean;
  }>({ lat: null, lng: null, hasLocation: false });

  // Animation values
  const headerOpacity = React.useRef(new Animated.Value(0)).current;

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

  // Memoized fetch function to avoid stale closures
  // IMPORTANT: Defined BEFORE useEffects that use it
  const fetchSpecialists = useCallback(async (
    forceProximity?: boolean,
    forceMaxDistance?: number
  ) => {
    // Use forced values if provided, otherwise use current state
    const useProximity = forceProximity !== undefined ? forceProximity : proximityEnabled;
    const useMaxDist = forceMaxDistance !== undefined ? forceMaxDistance : maxDistance;

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
      } catch (matchErr: unknown) {
        // Silent fail - matched specialists are optional
      }

      // Build filters for API call
      const filters: specialistsService.SpecialistFilters = {};

      // Add proximity filter if enabled and client has location
      if (useProximity && clientLocation.hasLocation && clientLocation.lat && clientLocation.lng) {
        filters.near = true;
        filters.lat = clientLocation.lat;
        filters.lng = clientLocation.lng;
        filters.maxDistance = useMaxDist;
      }

      // Always fetch all specialists as fallback/supplement
      const allSpecialistsData = await specialistsService.getAllSpecialists(filters);

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
          // Location & distance
          offersInPerson: s.offersInPerson,
          offersOnline: s.offersOnline,
          officeCity: s.officeCity,
          distance: s.distance,
        };
      });

      setMatchedSpecialists(matchedData);
      setAllSpecialists(mappedAllSpecialists);
      setHasCompletedQuestionnaire(hasQuestionnaire);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar especialistas';
      console.error('Error fetching specialists:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [proximityEnabled, maxDistance, clientLocation]);

  // Load client location on mount
  useEffect(() => {
    const loadClientLocation = async () => {
      if (user?.type !== 'client') return;

      try {
        const profile = await clientService.getMyClientProfile();
        if (profile.homeLat && profile.homeLng) {
          setClientLocation({
            lat: profile.homeLat,
            lng: profile.homeLng,
            hasLocation: true,
          });
        }
      } catch (err) {
        // Silent fail - location is optional
        console.log('Could not load client location:', err);
      }
    };

    loadClientLocation();
  }, [user?.type]);

  // Fetch specialists on mount
  useEffect(() => {
    fetchSpecialists();

    // Animate header
    Animated.timing(headerOpacity, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-fetch when proximity filter changes
  // Note: fetchSpecialists is in deps and has the current state values
  useEffect(() => {
    // Skip initial mount (handled above) and only run when filter changes
    if (clientLocation.hasLocation) {
      fetchSpecialists();
    }
  }, [fetchSpecialists, clientLocation.hasLocation]);

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
    const options: { text: string; onPress?: () => void; style?: 'cancel' | 'destructive' }[] = [
      { text: 'Afinidad (Recomendado)', onPress: () => setSortOption('affinity') },
      { text: 'Mejor valorados', onPress: () => setSortOption('rating') },
      { text: 'Precio mas bajo', onPress: () => setSortOption('price_low') },
      { text: 'Precio mas alto', onPress: () => setSortOption('price_high') },
    ];

    // Add distance option only when proximity filter is active
    if (proximityEnabled && clientLocation.hasLocation) {
      options.splice(1, 0, { text: 'Más cercanos', onPress: () => setSortOption('distance') });
    }

    options.push({ text: 'Cancelar', style: 'cancel' });

    Alert.alert('Ordenar por', 'Selecciona un criterio de ordenacion', options);
  };

  const getSortLabel = () => {
    switch (sortOption) {
      case 'affinity': return 'Afinidad';
      case 'rating': return 'Valoracion';
      case 'price_low': return 'Precio: Bajo';
      case 'price_high': return 'Precio: Alto';
      case 'distance': return 'Distancia';
      default: return 'Ordenar';
    }
  };

  // Toggle proximity filter
  const handleToggleProximity = () => {
    if (!clientLocation.hasLocation) {
      Alert.alert(
        'Ubicación no configurada',
        'Añade tu ubicación en tu perfil para usar este filtro.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Ir a Perfil', onPress: () => navigation.navigate('Profile' as never) },
        ]
      );
      return;
    }

    const newProximityEnabled = !proximityEnabled;
    setProximityEnabled(newProximityEnabled);
    if (newProximityEnabled) {
      setSortOption('distance');
    }

    // Immediately fetch with the NEW value (don't wait for state update)
    fetchSpecialists(newProximityEnabled, maxDistance);
  };

  // Handle distance change
  const handleDistanceChange = () => {
    const buttons: { text: string; onPress?: () => void; style?: 'cancel' | 'destructive' }[] =
      DISTANCE_OPTIONS.map(opt => ({
        text: opt.label,
        onPress: () => {
          setMaxDistance(opt.value);
          // Immediately fetch with the NEW distance (don't wait for state update)
          if (proximityEnabled) {
            fetchSpecialists(proximityEnabled, opt.value);
          }
        },
      }));
    buttons.push({ text: 'Cancelar', style: 'cancel' });

    Alert.alert('Distancia máxima', 'Selecciona la distancia máxima', buttons);
  };

  // Combine and filter specialists
  // CRITICAL: When proximity filter is enabled, use ONLY allSpecialists (which has proximity filtering)
  // The matchedSpecialists endpoint doesn't support proximity filtering
  let combinedSpecialists: Specialist[];

  if (proximityEnabled && clientLocation.hasLocation) {
    // When proximity is enabled, only use allSpecialists (which was filtered by backend)
    // These specialists have valid distance values
    combinedSpecialists = allSpecialists;
  } else {
    // Normal mode: combine matched + unmatched
    const matchedIds = matchedSpecialists.map(s => s.id);
    const unmatchedSpecialists = allSpecialists.filter(s => !matchedIds.includes(s.id));
    combinedSpecialists = [...matchedSpecialists, ...unmatchedSpecialists];
  }

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
        case 'distance':
          // Sort by distance (specialists without distance go to the end)
          if (a.distance === undefined && b.distance === undefined) return 0;
          if (a.distance === undefined) return 1;
          if (b.distance === undefined) return -1;
          return a.distance - b.distance;
        default:
          return 0;
      }
    });

  // Calculate grid columns based on screen size
  const gridColumns = isDesktop ? 3 : isTablet ? 2 : 1;

  // Render questionnaire banner for users who haven't completed
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

  // Render refine matches banner for users who completed questionnaire
  const renderRefineMatchesBanner = () => (
    <TouchableOpacity
      style={styles.refineMatchesBanner}
      onPress={() => navigation.navigate('Questionnaire')}
      activeOpacity={0.8}
    >
      <View style={styles.refineMatchesIcon}>
        <Ionicons name="options-outline" size={22} color={heraLanding.primary} />
      </View>
      <View style={styles.refineMatchesTextContainer}>
        <Text style={styles.refineMatchesTitle}>¿Cambiaron tus necesidades?</Text>
        <Text style={styles.refineMatchesSubtitle}>
          Actualiza tus preferencias para mejorar tus matches
        </Text>
      </View>
      <View style={styles.refineMatchesButton}>
        <Text style={styles.refineMatchesButtonText}>Refinar</Text>
        <Ionicons name="refresh" size={14} color={heraLanding.primary} />
      </View>
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
      <TouchableOpacity style={styles.retryButton} onPress={() => fetchSpecialists()}>
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

        {/* Proximity Filter */}
        {user?.type === 'client' && (
          <View style={styles.proximityFilterContainer}>
            <TouchableOpacity
              style={[
                styles.proximityToggle,
                proximityEnabled && styles.proximityToggleActive,
              ]}
              onPress={handleToggleProximity}
              activeOpacity={0.7}
            >
              <Ionicons
                name={proximityEnabled ? 'location' : 'location-outline'}
                size={18}
                color={proximityEnabled ? heraLanding.textOnPrimary : heraLanding.primary}
              />
              <Text
                style={[
                  styles.proximityToggleText,
                  proximityEnabled && styles.proximityToggleTextActive,
                ]}
              >
                Cerca de mí
              </Text>
            </TouchableOpacity>

            {/* Distance Chips - Horizontal selector */}
            {proximityEnabled && clientLocation.hasLocation && (
              <View style={styles.distanceChipsContainer}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.distanceChipsScroll}
                >
                  {DISTANCE_OPTIONS.map(opt => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[
                        styles.distanceChip,
                        maxDistance === opt.value && styles.distanceChipActive,
                      ]}
                      onPress={() => {
                        setMaxDistance(opt.value);
                        fetchSpecialists(true, opt.value);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.distanceChipText,
                          maxDistance === opt.value && styles.distanceChipTextActive,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {!clientLocation.hasLocation && (
              <Text style={styles.noLocationHint}>
                Añade tu ubicación en tu perfil
              </Text>
            )}
          </View>
        )}

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
            {/* Questionnaire Banner (for users who haven't completed) */}
            {!hasCompletedQuestionnaire && !loading && renderQuestionnaireBanner()}

            {/* Refine Matches Banner (for users who completed) */}
            {hasCompletedQuestionnaire && !loading && renderRefineMatchesBanner()}

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

  // Refine Matches Banner
  refineMatchesBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 2,
    borderColor: heraLanding.primaryMuted,
    gap: spacing.md,
    ...shadows.sm,
  },
  refineMatchesIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: heraLanding.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  refineMatchesTextContainer: {
    flex: 1,
  },
  refineMatchesTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: heraLanding.textPrimary,
    marginBottom: 2,
  },
  refineMatchesSubtitle: {
    fontSize: 13,
    color: heraLanding.textSecondary,
    lineHeight: 18,
  },
  refineMatchesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: heraLanding.primaryMuted,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  refineMatchesButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: heraLanding.primary,
  },

  // ===== PROXIMITY FILTER =====
  proximityFilterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: heraLanding.border,
    gap: spacing.sm,
  },
  proximityToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: heraLanding.background,
    borderWidth: 2,
    borderColor: heraLanding.primary,
    gap: 6,
  },
  proximityToggleActive: {
    backgroundColor: heraLanding.primary,
    borderColor: heraLanding.primary,
  },
  proximityToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: heraLanding.primary,
  },
  proximityToggleTextActive: {
    color: heraLanding.textOnPrimary,
  },
  distanceSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: heraLanding.primaryMuted,
    gap: 4,
  },
  distanceSelectorText: {
    fontSize: 13,
    fontWeight: '600',
    color: heraLanding.primary,
  },
  noLocationHint: {
    fontSize: 12,
    color: heraLanding.textMuted,
    fontStyle: 'italic',
  },
  // Distance Chips
  distanceChipsContainer: {
    flex: 1,
  },
  distanceChipsScroll: {
    flexDirection: 'row',
    gap: 8,
  },
  distanceChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: heraLanding.background,
    borderWidth: 1,
    borderColor: heraLanding.border,
  },
  distanceChipActive: {
    backgroundColor: heraLanding.primary,
    borderColor: heraLanding.primary,
  },
  distanceChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: heraLanding.textSecondary,
  },
  distanceChipTextActive: {
    color: heraLanding.textOnPrimary,
    fontWeight: '600',
  },
});

export default SpecialistsScreen;
