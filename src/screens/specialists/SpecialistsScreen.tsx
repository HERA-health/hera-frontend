import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { showAppAlert, useAppAlert } from '../../components/common/alert';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  SearchBar,
  SpecialistCardGrid,
  SpecialistListItem,
  SpecialistsLoadingState,
  LocationFilterDropdown,
  TopicFilterDropdown,
  ViewToggle,
} from './components';
import type { FilterOption, ViewMode } from './components';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { AnimatedPressable } from '../../components/common/AnimatedPressable';
import { Button } from '../../components/common/Button';
import { RootStackParamList, SortOption, Specialist } from '../../constants/types';
import { spacing } from '../../constants/colors';
import type { Theme } from '../../constants/theme';
import * as specialistsService from '../../services/specialistsService';
import * as clientService from '../../services/clientService';
import * as analyticsService from '../../services/analyticsService';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Specialists'>;

const FILTER_OPTIONS: FilterOption[] = [
  { id: 'ansiedad', label: 'Ansiedad', icon: 'pulse-outline' },
  { id: 'pareja', label: 'Pareja', icon: 'heart-outline' },
  { id: 'depresion', label: 'Depresión', icon: 'sad-outline' },
  { id: 'trauma', label: 'Trauma', icon: 'shield-outline' },
  { id: 'estres', label: 'Estrés', icon: 'flash-outline' },
  { id: 'autoestima', label: 'Autoestima', icon: 'star-outline' },
];

const DISTANCE_OPTIONS = [
  { value: 5, label: '5 km' },
  { value: 10, label: '10 km' },
  { value: 15, label: '15 km' },
  { value: 25, label: '25 km' },
  { value: 50, label: '50 km' },
];

const buildMatchingProfile = (matchingProfile?: Record<string, unknown>) => ({
  therapeuticApproach: Array.isArray(matchingProfile?.therapeuticApproach)
    ? (matchingProfile.therapeuticApproach as string[])
    : [],
  specialties: Array.isArray(matchingProfile?.specialties)
    ? (matchingProfile.specialties as string[])
    : [],
  sessionStyle:
    typeof matchingProfile?.sessionStyle === 'string' ? matchingProfile.sessionStyle : '',
  personality: Array.isArray(matchingProfile?.personality)
    ? (matchingProfile.personality as string[])
    : [],
  ageGroups: Array.isArray(matchingProfile?.ageGroups)
    ? (matchingProfile.ageGroups as string[])
    : [],
  experienceYears:
    typeof matchingProfile?.experienceYears === 'number'
      ? matchingProfile.experienceYears
      : 0,
  language: Array.isArray(matchingProfile?.language)
    ? (matchingProfile.language as string[])
    : [],
  availability:
    typeof matchingProfile?.availability === 'string' ? matchingProfile.availability : '',
  format: Array.isArray(matchingProfile?.format) ? (matchingProfile.format as string[]) : [],
});

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

const SpecialistsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const appAlert = useAppAlert();
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);
  const { width } = useWindowDimensions();

  const isDesktop = width >= 1180;
  const isTablet = width >= 768 && width < 1180;
  const isMobile = width < 768;
  const gridColumns = isDesktop ? 3 : isTablet ? 2 : 1;
  const gridItemWidth = isDesktop ? '31.8%' : isTablet ? '48.6%' : '100%';

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
  const [proximityEnabled, setProximityEnabled] = useState(false);
  const [maxDistance, setMaxDistance] = useState(10);
  const [clientLocation, setClientLocation] = useState<{
    lat: number | null;
    lng: number | null;
    hasLocation: boolean;
  }>({ lat: null, lng: null, hasLocation: false });

  const fetchSpecialists = useCallback(async (
    forceProximity?: boolean,
    forceMaxDistance?: number,
  ) => {
    const useProximity = forceProximity ?? proximityEnabled;
    const useMaxDistance = forceMaxDistance ?? maxDistance;

    try {
      setLoading(true);
      setError(null);

      let matchedData: Specialist[] = [];
      let hasQuestionnaire = false;

      try {
        const matchedResponse = await specialistsService.getMatchedSpecialists();
        hasQuestionnaire = matchedResponse.hasCompletedQuestionnaire;

        if (hasQuestionnaire && matchedResponse.specialists.length > 0) {
          matchedData = matchedResponse.specialists.map((specialist) => {
            const name = specialist.user.name;
            const affinityPercentage = specialist.affinity ? Math.round((specialist.affinity / 130) * 100) : 0;

            return {
              id: specialist.id,
              name,
              avatar: specialist.avatar || undefined,
              initial: name.charAt(0).toUpperCase(),
              specialization: specialist.specialization,
              rating: specialist.rating,
              reviewCount: specialist.reviewCount,
              description: specialistsService.normalizeSpecialistDescription(specialist.description),
              affinityPercentage,
              tags: (specialist.matchedAttributes || [])
                .map((attr) => attributeLabels[attr] || attr)
                .filter(Boolean),
              pricePerSession: specialist.pricePerSession,
              firstVisitFree: specialist.firstVisitFree,
              verified: true,
              matchingProfile: buildMatchingProfile(specialist.matchingProfile),
            };
          });
        }
      } catch {
        // Best effort. The public list must still render.
      }

      const filters: specialistsService.SpecialistFilters = {};
      if (
        useProximity
        && clientLocation.hasLocation
        && clientLocation.lat !== null
        && clientLocation.lng !== null
      ) {
        filters.near = true;
        filters.lat = clientLocation.lat;
        filters.lng = clientLocation.lng;
        filters.maxDistance = useMaxDistance;
      }

      const allSpecialistsData = await specialistsService.getAllSpecialists(filters);
      const mappedAllSpecialists = allSpecialistsData.map((specialist) => ({
        id: specialist.id,
        name: specialist.user.name,
        avatar: specialist.avatar || undefined,
        initial: specialist.user.name.charAt(0).toUpperCase(),
        specialization: specialist.specialization,
        rating: specialist.rating,
        reviewCount: specialist.reviewCount,
        description: specialistsService.normalizeSpecialistDescription(specialist.description),
        affinityPercentage: Math.round((specialist.rating / 5) * 100),
        tags: specialist.matchedAttributes || [],
        pricePerSession: specialist.pricePerSession,
        firstVisitFree: specialist.firstVisitFree,
        verified: true,
        matchingProfile: buildMatchingProfile(specialist.matchingProfile),
        offersInPerson: specialist.offersInPerson,
        offersOnline: specialist.offersOnline,
        officeCity: specialist.officeCity,
        distance: specialist.distance,
      }));

      setMatchedSpecialists(matchedData);
      setAllSpecialists(mappedAllSpecialists);
      setHasCompletedQuestionnaire(hasQuestionnaire);
    } catch (fetchError: unknown) {
      setError(fetchError instanceof Error ? fetchError.message : 'Error al cargar especialistas');
    } finally {
      setLoading(false);
    }
  }, [attributeLabels, clientLocation.hasLocation, clientLocation.lat, clientLocation.lng, maxDistance, proximityEnabled]);

  useEffect(() => {
    analyticsService.trackScreen('specialists_list');
  }, []);

  useEffect(() => {
    const loadClientLocation = async () => {
      if (user?.type !== 'client') return;

      try {
        const profile = await clientService.getMyClientProfile();
        if (profile.homeLat !== null && profile.homeLng !== null) {
          setClientLocation({
            lat: profile.homeLat,
            lng: profile.homeLng,
            hasLocation: true,
          });
        }
      } catch {
        // Optional enhancement, do not block the screen.
      }
    };

    loadClientLocation();
  }, [user?.type]);

  useEffect(() => {
    void fetchSpecialists();
  }, [user?.type]);

  const handleSpecialistPress = useCallback((specialistId: string) => {
    const specialist = matchedSpecialists.find((item) => item.id === specialistId)
      || allSpecialists.find((item) => item.id === specialistId);
    const affinity = specialist ? specialist.affinityPercentage / 100 : undefined;

    navigation.navigate('SpecialistDetail', { specialistId, affinity });
  }, [allSpecialists, matchedSpecialists, navigation]);

  const handleSort = () => {
    const options: { text: string; onPress?: () => void; style?: 'cancel' }[] = [
      { text: 'Afinidad', onPress: () => setSortOption('affinity') },
      { text: 'Mejor valorados', onPress: () => setSortOption('rating') },
      { text: 'Precio más bajo', onPress: () => setSortOption('price_low') },
      { text: 'Precio más alto', onPress: () => setSortOption('price_high') },
    ];

    if (proximityEnabled && clientLocation.hasLocation) {
      options.splice(1, 0, { text: 'Más cercanos', onPress: () => setSortOption('distance') });
    }

    options.push({ text: 'Cancelar', style: 'cancel' });
    showAppAlert(appAlert, 'Ordenar por', 'Selecciona un criterio de ordenación', options);
  };

  const toggleProximity = () => {
    if (!clientLocation.hasLocation) {
      showAppAlert(appAlert, 
        'Ubicación no configurada',
        'Añade tu ubicación en el perfil para usar este filtro.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Ir a perfil', onPress: () => navigation.navigate('Profile' as never) },
        ],
      );
      return;
    }

    const next = !proximityEnabled;
    setProximityEnabled(next);
    if (next) {
      setSortOption('distance');
    }
    fetchSpecialists(next, maxDistance);
  };

  const combinedSpecialists = useMemo(() => {
    if (proximityEnabled && clientLocation.hasLocation) {
      return allSpecialists;
    }

    const matchedIds = new Set(matchedSpecialists.map((item) => item.id));
    const unmatched = allSpecialists.filter((item) => !matchedIds.has(item.id));
    return [...matchedSpecialists, ...unmatched];
  }, [allSpecialists, clientLocation.hasLocation, matchedSpecialists, proximityEnabled]);

  const filteredSpecialists = useMemo(() => {
    return combinedSpecialists
      .filter((specialist) => {
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          const matchesSearch =
            specialist.name.toLowerCase().includes(query)
            || specialist.specialization.toLowerCase().includes(query)
            || specialist.tags.some((tag) => tag.toLowerCase().includes(query));
          if (!matchesSearch) return false;
        }

        if (selectedFilters.length > 0) {
          const matchesFilter = selectedFilters.some((filter) =>
            specialist.specialization.toLowerCase().includes(filter.toLowerCase())
            || specialist.tags.some((tag) => tag.toLowerCase().includes(filter.toLowerCase())));
          if (!matchesFilter) return false;
        }

        return true;
      })
      .sort((a, b) => {
        switch (sortOption) {
          case 'affinity':
            return b.affinityPercentage - a.affinityPercentage || a.name.localeCompare(b.name);
          case 'rating':
            return b.rating - a.rating || b.reviewCount - a.reviewCount;
          case 'price_low':
            return a.pricePerSession - b.pricePerSession;
          case 'price_high':
            return b.pricePerSession - a.pricePerSession;
          case 'distance':
            if (a.distance === undefined && b.distance === undefined) return 0;
            if (a.distance === undefined) return 1;
            if (b.distance === undefined) return -1;
            return a.distance - b.distance;
          default:
            return 0;
        }
      });
  }, [combinedSpecialists, searchQuery, selectedFilters, sortOption]);

  const renderLegacyQuestionnaireBanner = () => (
    <AnimatedPressable
      onPress={() => navigation.navigate('Questionnaire')}
      style={styles.heroBanner}
    >
      <LinearGradient
        colors={[theme.primary, theme.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroBannerGradient}
      >
        <View style={styles.heroBadge}>
          <Ionicons name="heart" size={22} color={theme.textOnPrimary} />
        </View>
        <View style={styles.heroCopy}>
          <Text style={styles.heroTitle}>Descubre tus mejores matches</Text>
          <Text style={styles.heroSubtitle}>
            Completa el cuestionario para ver recomendaciones realmente personalizadas.
          </Text>
        </View>
        <Ionicons name="arrow-forward" size={18} color={theme.textOnPrimary} />
      </LinearGradient>
    </AnimatedPressable>
  );

  const renderLegacyRefineBanner = () => (
    <AnimatedPressable
      onPress={() => navigation.navigate('Questionnaire')}
      style={styles.refineBanner}
    >
      <View style={styles.refineIcon}>
        <Ionicons name="options-outline" size={20} color={theme.primary} />
      </View>
      <View style={styles.refineCopy}>
        <Text style={styles.refineTitle}>¿Cambiaron tus necesidades?</Text>
        <Text style={styles.refineSubtitle}>Actualiza tus preferencias para mejorar tus matches.</Text>
      </View>
      <View style={styles.refineAction}>
        <Text style={styles.refineActionText}>Refinar</Text>
        <Ionicons name="refresh" size={14} color={theme.primary} />
      </View>
    </AnimatedPressable>
  );

  const renderQuestionnaireBanner = () => {
    const hasQuestionnaire = hasCompletedQuestionnaire;

    return (
      <View style={styles.heroBanner}>
        <LinearGradient
          colors={[theme.primary, theme.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.heroBannerGradient, hasQuestionnaire ? styles.heroBannerGradientCompact : null]}
        >
          <View style={styles.heroBadge}>
            <Ionicons
              name={hasQuestionnaire ? 'refresh-circle-outline' : 'heart'}
              size={22}
              color={theme.textOnPrimary}
            />
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>
              {hasQuestionnaire ? 'Mantén tus matches al día' : 'Descubre tus mejores matches'}
            </Text>
            <Text style={styles.heroSubtitle}>
              {hasQuestionnaire
                ? 'Si han cambiado tus necesidades, repite el cuestionario para actualizar tus recomendaciones.'
                : 'Completa el cuestionario para ver recomendaciones realmente personalizadas.'}
            </Text>
          </View>
          <AnimatedPressable
            onPress={() => navigation.navigate('Questionnaire')}
            hoverLift={false}
            style={[styles.heroAction, hasQuestionnaire ? styles.heroActionSecondary : null]}
          >
            <Text style={styles.heroActionText}>
              {hasQuestionnaire ? 'Repetir cuestionario' : 'Empezar cuestionario'}
            </Text>
            <Ionicons
              name={hasQuestionnaire ? 'refresh' : 'arrow-forward'}
              size={15}
              color={theme.textOnPrimary}
            />
          </AnimatedPressable>
        </LinearGradient>
      </View>
    );
  };

  const renderQuestionnaireAction = (compact = false) => (
    <AnimatedPressable
      onPress={() => navigation.navigate('Questionnaire')}
      hoverLift={false}
      style={[
        styles.questionnaireAction,
        compact ? styles.questionnaireActionCompact : null,
        hasCompletedQuestionnaire ? styles.questionnaireActionActive : null,
      ]}
      accessibilityLabel={hasCompletedQuestionnaire ? 'Repetir cuestionario' : 'Hacer cuestionario'}
    >
      <Ionicons
        name={hasCompletedQuestionnaire ? 'refresh' : 'clipboard-outline'}
        size={14}
        color={hasCompletedQuestionnaire ? theme.primary : theme.textSecondary}
      />
      {!compact ? (
        <Text
          style={[
            styles.questionnaireActionText,
            hasCompletedQuestionnaire ? styles.questionnaireActionTextActive : null,
          ]}
        >
          {hasCompletedQuestionnaire ? 'Repetir cuestionario' : 'Hacer cuestionario'}
        </Text>
      ) : null}
    </AnimatedPressable>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.stateIconWrap}>
        <Ionicons name="search-outline" size={42} color={theme.textMuted} />
      </View>
      <Text style={styles.stateTitle}>No encontramos especialistas</Text>
      <Text style={styles.stateDescription}>
        Prueba con otra búsqueda o ajusta los filtros para ampliar resultados.
      </Text>
      {(searchQuery || selectedFilters.length > 0) ? (
        <Button variant="outline" onPress={() => { setSearchQuery(''); setSelectedFilters([]); }}>
          Limpiar filtros
        </Button>
      ) : null}
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.emptyState}>
      <View style={styles.stateIconWrap}>
        <Ionicons name="alert-circle-outline" size={44} color={theme.warning} />
      </View>
      <Text style={styles.stateTitle}>No se pudo cargar el listado</Text>
      <Text style={styles.stateDescription}>{error}</Text>
      <Button
        variant="primary"
        onPress={() => fetchSpecialists()}
        icon={<Ionicons name="refresh" size={16} color={theme.textOnPrimary} />}
      >
        Reintentar
      </Button>
    </View>
  );

  const renderPostsEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.stateIconWrap}>
        <Ionicons name="document-text-outline" size={42} color={theme.textMuted} />
      </View>
      <Text style={styles.stateTitle}>Publicaciones, pronto</Text>
      <Text style={styles.stateDescription}>
        Aquí mostraremos contenido útil creado por especialistas cuando activemos esta parte.
      </Text>
    </View>
  );

  const renderGrid = () => {
    const rows = [];
    for (let i = 0; i < filteredSpecialists.length; i += gridColumns) {
      const rowItems = filteredSpecialists.slice(i, i + gridColumns);
      rows.push(
          <View key={i} style={styles.gridRow}>
            {rowItems.map((specialist, index) => (
            <View key={specialist.id} style={[styles.gridItem, { width: gridItemWidth }]}>
              <SpecialistCardGrid
                specialist={specialist}
                position={i + index < 3 ? (i + index + 1) as 1 | 2 | 3 : undefined}
                onPress={() => handleSpecialistPress(specialist.id)}
              />
            </View>
          ))}
        </View>,
      );
    }
    return rows;
  };

  if (error) {
    return <View style={styles.screen}>{renderErrorState()}</View>;
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={[styles.headerRow, isDesktop ? styles.headerRowDesktop : null]}>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>Encuentra tu especialista</Text>
            <Text style={styles.subtitle}>
              Una selección más clara, más útil y preparada para encontrar tu mejor ajuste.
            </Text>
          </View>

          <View style={[styles.headerControls, isMobile ? styles.headerControlsMobile : null]}>
            <View style={styles.searchWrap}>
              <SearchBar value={searchQuery} onChangeText={setSearchQuery} />
            </View>
            {!isMobile && user?.type === 'client' ? renderQuestionnaireAction() : null}
            {!isMobile ? <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} /> : null}
          </View>
        </View>

        {isMobile ? (
          <View style={styles.mobileToolsRow}>
            <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
            {user?.type === 'client' ? renderQuestionnaireAction(true) : null}
          </View>
        ) : null}

        <View style={[styles.discoveryBar, isDesktop ? styles.discoveryBarDesktop : null]}>
          <View style={[styles.discoveryMetaGroup, isDesktop ? styles.discoveryMetaGroupDesktop : null]}>
            <View style={styles.tabsRow}>
              {(['specialists', 'posts'] as const).map((tab) => {
                const active = activeTab === tab;
                return (
                  <AnimatedPressable
                    key={tab}
                    onPress={() => setActiveTab(tab)}
                    hoverLift={false}
                    style={[styles.tab, active ? styles.tabActive : undefined]}
                  >
                    <Text style={[styles.tabText, active ? styles.tabTextActive : null]}>
                      {tab === 'specialists' ? 'Especialistas' : 'Publicaciones'}
                    </Text>
                  </AnimatedPressable>
                );
              })}
            </View>

            {user?.type === 'client' ? (
              <LocationFilterDropdown
                enabled={proximityEnabled}
                maxDistance={maxDistance}
                distanceOptions={DISTANCE_OPTIONS}
                hasLocation={clientLocation.hasLocation}
                onToggleEnabled={toggleProximity}
                onDistanceChange={(distance) => {
                  setMaxDistance(distance);
                  if (!proximityEnabled && clientLocation.hasLocation) {
                    setProximityEnabled(true);
                  }
                  fetchSpecialists(true, distance);
                }}
              />
            ) : null}

          </View>

          <View style={styles.filtersRail}>
            <TopicFilterDropdown
              filters={FILTER_OPTIONS}
              selectedFilters={selectedFilters}
              onFilterChange={setSelectedFilters}
            />
          </View>
        </View>

      </View>

      {activeTab === 'specialists' ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.resultsHeader}>
            <Text style={styles.resultsTitle}>Especialistas disponibles</Text>
            {!loading ? (
              <Text style={styles.resultsMeta}>
                {filteredSpecialists.length} resultado{filteredSpecialists.length !== 1 ? 's' : ''}
              </Text>
            ) : null}
          </View>

          {loading ? <SpecialistsLoadingState count={6} viewMode={viewMode} /> : null}
          {!loading && filteredSpecialists.length === 0 ? renderEmptyState() : null}
          {!loading && filteredSpecialists.length > 0 && viewMode === 'grid' ? renderGrid() : null}
          {!loading && filteredSpecialists.length > 0 && viewMode === 'list' ? (
            <View style={styles.listWrap}>
              {filteredSpecialists.map((specialist, index) => (
                <SpecialistListItem
                  key={specialist.id}
                  specialist={specialist}
                  position={index < 3 ? (index + 1) as 1 | 2 | 3 : undefined}
                  onPress={() => handleSpecialistPress(specialist.id)}
                />
              ))}
            </View>
          ) : null}
        </ScrollView>
      ) : (
        <View style={styles.postsWrap}>
          {renderPostsEmptyState()}
        </View>
      )}
    </View>
  );
};

function getSortLabel(sortOption: SortOption) {
  switch (sortOption) {
    case 'affinity':
      return 'Afinidad';
    case 'rating':
      return 'Valoración';
    case 'price_low':
      return 'Precio bajo';
    case 'price_high':
      return 'Precio alto';
    case 'distance':
      return 'Distancia';
    default:
      return 'Ordenar';
  }
}

function createStyles(theme: Theme, isDark: boolean) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.bg,
    },
    header: {
      backgroundColor: theme.bgCard,
      paddingTop: spacing.md,
      paddingBottom: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
    },
    headerRow: {
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
    },
    headerRowDesktop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      paddingHorizontal: spacing.xxxl,
    },
    headerCopy: {
      flex: 1,
      gap: 6,
    },
    title: {
      fontSize: 30,
      fontFamily: theme.fontDisplay,
      color: theme.textPrimary,
    },
    subtitle: {
      fontSize: 14,
      fontFamily: theme.fontSans,
      color: theme.textSecondary,
      lineHeight: 20,
      maxWidth: 560,
    },
    headerControls: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      flexWrap: 'wrap',
    },
    headerControlsMobile: {
      width: '100%',
    },
    searchWrap: {
      minWidth: 280,
      width: 360,
      flex: 1,
    },
    mobileToolsRow: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
      gap: spacing.sm,
    },
    discoveryBar: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      gap: spacing.sm,
    },
    discoveryBarDesktop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    discoveryMetaGroup: {
      gap: spacing.sm,
    },
    discoveryMetaGroupDesktop: {
      flexDirection: 'row',
      alignItems: 'center',
      flexShrink: 0,
    },
    proximityWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      flexWrap: 'wrap',
    },
    proximityToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      alignSelf: 'flex-start',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: isDark ? theme.bgElevated : theme.bgAlt,
      borderWidth: 1.5,
      borderColor: theme.primary,
    },
    proximityToggleActive: {
      backgroundColor: theme.primary,
    },
    proximityText: {
      fontSize: 13,
      fontFamily: theme.fontSansSemiBold,
      color: theme.primary,
    },
    proximityTextActive: {
      color: theme.textOnPrimary,
    },
    distanceScroll: {
      gap: spacing.sm,
      paddingBottom: 2,
    },
    distanceChip: {
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: isDark ? theme.bgElevated : theme.bgAlt,
      borderWidth: 1,
      borderColor: theme.border,
    },
    distanceChipActive: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    distanceChipText: {
      fontSize: 12,
      fontFamily: theme.fontSansMedium,
      color: theme.textSecondary,
    },
    distanceChipTextActive: {
      color: theme.textOnPrimary,
      fontFamily: theme.fontSansBold,
    },
    hintText: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.xs,
      fontSize: 12,
      fontFamily: theme.fontSans,
      color: theme.textMuted,
    },
    filtersRail: {
      flex: 1,
      minWidth: 0,
    },
    tabsRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      flexWrap: 'wrap',
    },
    tab: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: isDark ? theme.bgElevated : theme.bgAlt,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    tabActive: {
      backgroundColor: theme.primaryAlpha12,
      borderColor: theme.primaryMuted,
    },
    tabText: {
      fontSize: 12,
      fontFamily: theme.fontSansSemiBold,
      color: theme.textSecondary,
    },
    tabTextActive: {
      color: theme.primaryDark,
    },
    questionnaireAction: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 7,
      minHeight: 42,
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 999,
      backgroundColor: isDark ? theme.bgElevated : theme.bgAlt,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    questionnaireActionCompact: {
      width: 42,
      minWidth: 42,
      height: 42,
      minHeight: 42,
      justifyContent: 'center',
      paddingHorizontal: 0,
      paddingVertical: 0,
      gap: 0,
      borderRadius: 14,
    },
    questionnaireActionActive: {
      backgroundColor: theme.primaryAlpha12,
      borderColor: theme.primaryMuted,
    },
    questionnaireActionText: {
      fontSize: 12,
      fontFamily: theme.fontSansSemiBold,
      color: theme.textSecondary,
    },
    questionnaireActionTextActive: {
      color: theme.primaryDark,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      paddingBottom: spacing.xxxl,
      gap: spacing.lg,
    },
    heroBanner: {
      borderRadius: 24,
      overflow: 'hidden',
      shadowColor: theme.shadowPrimary,
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.9,
      shadowRadius: 24,
      elevation: 3,
    },
    heroBannerGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.lg,
      justifyContent: 'space-between',
      flexWrap: 'wrap',
    },
    heroBannerGradientCompact: {
      paddingVertical: spacing.md,
    },
    heroBadge: {
      width: 48,
      height: 48,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.16)',
    },
    heroCopy: {
      flex: 1,
      minWidth: 220,
    },
    heroTitle: {
      fontSize: 18,
      fontFamily: theme.fontSansBold,
      color: theme.textOnPrimary,
      marginBottom: 4,
    },
    heroSubtitle: {
      fontSize: 14,
      fontFamily: theme.fontSans,
      color: 'rgba(255,255,255,0.86)',
      lineHeight: 20,
    },
    heroAction: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'flex-start',
      gap: 8,
      minHeight: 44,
      paddingHorizontal: 16,
      paddingVertical: 11,
      borderRadius: 999,
      backgroundColor: 'rgba(255,255,255,0.16)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.24)',
      shadowColor: 'rgba(26, 38, 28, 0.22)',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 1,
      shadowRadius: 18,
      elevation: 2,
    },
    heroActionSecondary: {
      backgroundColor: 'rgba(255,255,255,0.12)',
    },
    heroActionText: {
      fontSize: 13,
      fontFamily: theme.fontSansBold,
      color: theme.textOnPrimary,
    },
    refineBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.md,
      borderRadius: 20,
      backgroundColor: theme.bgCard,
      borderWidth: 1,
      borderColor: theme.primaryMuted,
      shadowColor: theme.shadowCard,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.6,
      shadowRadius: 20,
      elevation: 2,
    },
    refineIcon: {
      width: 44,
      height: 44,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primaryAlpha12,
    },
    refineCopy: {
      flex: 1,
    },
    refineTitle: {
      fontSize: 15,
      fontFamily: theme.fontSansBold,
      color: theme.textPrimary,
      marginBottom: 2,
    },
    refineSubtitle: {
      fontSize: 13,
      fontFamily: theme.fontSans,
      color: theme.textSecondary,
      lineHeight: 19,
    },
    refineAction: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: theme.primaryAlpha12,
    },
    refineActionText: {
      fontSize: 12,
      fontFamily: theme.fontSansBold,
      color: theme.primary,
    },
    resultsHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: spacing.md,
    },
    resultsTitle: {
      fontSize: 20,
      fontFamily: theme.fontDisplay,
      color: theme.textPrimary,
    },
    resultsMeta: {
      fontSize: 13,
      fontFamily: theme.fontSans,
      color: theme.textMuted,
    },
    gridRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'stretch',
      gap: spacing.md,
      marginBottom: spacing.md,
    },
    gridItem: {
      minWidth: 280,
      alignSelf: 'stretch',
      flexGrow: 0,
      flexShrink: 0,
    },
    listWrap: {
      gap: spacing.md,
    },
    emptyState: {
      minHeight: 360,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.xl,
      gap: spacing.md,
    },
    stateIconWrap: {
      width: 82,
      height: 82,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? theme.bgElevated : theme.bgAlt,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    stateTitle: {
      fontSize: 22,
      fontFamily: theme.fontDisplay,
      color: theme.textPrimary,
      textAlign: 'center',
    },
    stateDescription: {
      maxWidth: 520,
      fontSize: 15,
      fontFamily: theme.fontSans,
      color: theme.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
    },
    postsWrap: {
      flex: 1,
      paddingHorizontal: spacing.lg,
    },
  });
}

export default SpecialistsScreen;
