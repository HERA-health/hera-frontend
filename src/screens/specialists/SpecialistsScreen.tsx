import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  Image,
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
import {
  getProfessionalTypeLabel,
  PROFESSIONAL_TYPE_OPTIONS,
  type ProfessionalType,
} from '../../constants/professionalTypes';
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

const PROFESSIONAL_TYPE_FILTERS: FilterOption[] = PROFESSIONAL_TYPE_OPTIONS.map((option) => ({
  id: option.id,
  label: option.label,
  icon: option.icon,
}));

const PROFESSIONAL_TYPE_FILTER_GROUPS = [
  {
    title: 'Tipo profesional',
    ids: PROFESSIONAL_TYPE_OPTIONS.map((option) => option.id),
  },
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

const mapSpecialistDataToCard = (
  specialist: specialistsService.SpecialistData,
  favoriteIds: Set<string>,
  affinityOverride?: number
): Specialist => {
  const name = specialist.user.name;

  return {
    id: specialist.id,
    name,
    avatar: specialist.avatar || undefined,
    initial: name.charAt(0).toUpperCase(),
    specialization: specialist.specialization,
    professionalType: specialist.professionalType,
    professionalTypeLabel: specialist.professionalTypeLabel,
    rating: specialist.rating,
    reviewCount: specialist.reviewCount,
    description: specialistsService.normalizeSpecialistDescription(specialist.description),
    affinityPercentage: affinityOverride ?? (
      specialist.affinity
        ? Math.round((specialist.affinity / 130) * 100)
        : Math.round((specialist.rating / 5) * 100)
    ),
    tags: specialist.matchedAttributes || [],
    pricePerSession: specialist.pricePerSession,
    firstVisitFree: specialist.firstVisitFree,
    verified: true,
    matchingProfile: buildMatchingProfile(specialist.matchingProfile),
    offersInPerson: specialist.offersInPerson,
    offersOnline: specialist.offersOnline,
    officeCity: specialist.officeCity,
    distance: specialist.distance,
    isFavorite: favoriteIds.has(specialist.id),
  };
};

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
  const { width } = useWindowDimensions();

  const isDesktop = width >= 1180;
  const isTablet = width >= 768 && width < 1180;
  const isMobile = width < 768;
  const styles = useMemo(() => createStyles(theme, isDark, isMobile), [theme, isDark, isMobile]);
  const gridColumns = isDesktop ? 3 : isTablet ? 2 : 1;
  const gridItemWidth = isDesktop ? '31.8%' : isTablet ? '48.6%' : '100%';

  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('affinity');
  const [activeTab, setActiveTab] = useState<'specialists' | 'posts'>('specialists');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [selectedProfessionalTypes, setSelectedProfessionalTypes] = useState<ProfessionalType[]>([]);
  const [showAllSpecialists, setShowAllSpecialists] = useState(false);
  const [matchedSpecialists, setMatchedSpecialists] = useState<Specialist[]>([]);
  const [allSpecialists, setAllSpecialists] = useState<Specialist[]>([]);
  const [primarySpecialist, setPrimarySpecialist] = useState<Specialist | null>(null);
  const [primarySession, setPrimarySession] = useState<specialistsService.PrimarySpecialistSessionContext | null>(null);
  const [favoriteSpecialists, setFavoriteSpecialists] = useState<Specialist[]>([]);
  const [favoriteSpecialistIds, setFavoriteSpecialistIds] = useState<string[]>([]);
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
      let favoriteIds = new Set<string>();
      let personalization: specialistsService.SpecialistPersonalizationResponse | null = null;

      if (user?.type === 'client') {
        try {
          personalization = await specialistsService.getSpecialistPersonalization();
          favoriteIds = new Set(personalization.favoriteSpecialistIds);
        } catch {
          // Personalization is private enhancement. The marketplace should still render.
        }
      }

      try {
        const matchedResponse = await specialistsService.getMatchedSpecialists();
        hasQuestionnaire = matchedResponse.hasCompletedQuestionnaire;

        if (hasQuestionnaire && matchedResponse.specialists.length > 0) {
          matchedData = matchedResponse.specialists.map((specialist) => {
            const affinityPercentage = specialist.affinity ? Math.round((specialist.affinity / 130) * 100) : 0;
            const mapped = mapSpecialistDataToCard(specialist, favoriteIds, affinityPercentage);

            return {
              ...mapped,
              tags: (specialist.matchedAttributes || [])
                .map((attr) => attributeLabels[attr] || attr)
                .filter(Boolean),
            };
          });
        }
      } catch {
        // Best effort. The public list must still render.
      }

      const filters: specialistsService.SpecialistFilters = {};
      if (selectedProfessionalTypes.length === 1) {
        filters.professionalType = selectedProfessionalTypes[0];
      }
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
      const mappedAllSpecialists = allSpecialistsData.map((specialist) =>
        mapSpecialistDataToCard(specialist, favoriteIds)
      );

      setMatchedSpecialists(matchedData);
      setAllSpecialists(mappedAllSpecialists);
      setFavoriteSpecialistIds(Array.from(favoriteIds));
      setFavoriteSpecialists(
        personalization?.favoriteSpecialists.map((specialist) =>
          mapSpecialistDataToCard(specialist, favoriteIds)
        ) ?? []
      );
      setPrimarySpecialist(
        personalization?.primarySpecialist
          ? mapSpecialistDataToCard(personalization.primarySpecialist.specialist, favoriteIds)
          : null
      );
      setPrimarySession(personalization?.primarySpecialist?.session ?? null);
      setHasCompletedQuestionnaire(hasQuestionnaire);
    } catch (fetchError: unknown) {
      setError(fetchError instanceof Error ? fetchError.message : 'Error al cargar especialistas');
    } finally {
      setLoading(false);
    }
  }, [
    attributeLabels,
    clientLocation.hasLocation,
    clientLocation.lat,
    clientLocation.lng,
    maxDistance,
    proximityEnabled,
    selectedProfessionalTypes,
    user?.type,
  ]);

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
  }, [fetchSpecialists]);

  useEffect(() => {
    if (searchQuery || selectedFilters.length > 0 || selectedProfessionalTypes.length > 0 || proximityEnabled) {
      setShowAllSpecialists(true);
    }
  }, [proximityEnabled, searchQuery, selectedFilters.length, selectedProfessionalTypes.length]);

  const handleSpecialistPress = useCallback((specialistId: string) => {
    const specialist = matchedSpecialists.find((item) => item.id === specialistId)
      || allSpecialists.find((item) => item.id === specialistId);
    const affinity = specialist ? specialist.affinityPercentage / 100 : undefined;

    navigation.navigate('SpecialistDetail', { specialistId, affinity });
  }, [allSpecialists, matchedSpecialists, navigation]);

  const applyFavoriteState = useCallback((specialistId: string, isFavorite: boolean) => {
    const update = (items: Specialist[]) =>
      items.map((item) => (item.id === specialistId ? { ...item, isFavorite } : item));

    setMatchedSpecialists(update);
    setAllSpecialists(update);
    setFavoriteSpecialists((items) => {
      const updated = update(items);
      if (!isFavorite) {
        return updated.filter((item) => item.id !== specialistId);
      }

      if (updated.some((item) => item.id === specialistId)) {
        return updated;
      }

      const source = allSpecialists.find((item) => item.id === specialistId)
        || matchedSpecialists.find((item) => item.id === specialistId)
        || primarySpecialist;

      return source ? [{ ...source, isFavorite: true }, ...updated] : updated;
    });
    setPrimarySpecialist((current) =>
      current?.id === specialistId ? { ...current, isFavorite } : current
    );
    setFavoriteSpecialistIds((ids) => (
      isFavorite
        ? Array.from(new Set([specialistId, ...ids]))
        : ids.filter((id) => id !== specialistId)
    ));
  }, [allSpecialists, matchedSpecialists, primarySpecialist]);

  const handleToggleFavorite = useCallback(async (specialistId: string) => {
    if (user?.type !== 'client') return;

    const isFavorite = favoriteSpecialistIds.includes(specialistId);
    applyFavoriteState(specialistId, !isFavorite);

    try {
      if (isFavorite) {
        await specialistsService.removeFavoriteSpecialist(specialistId);
      } else {
        await specialistsService.addFavoriteSpecialist(specialistId);
      }
    } catch (favoriteError: unknown) {
      applyFavoriteState(specialistId, isFavorite);
      showAppAlert(
        appAlert,
        'No se pudo actualizar',
        favoriteError instanceof Error ? favoriteError.message : 'Inténtalo de nuevo en unos segundos.'
      );
    }
  }, [appAlert, applyFavoriteState, favoriteSpecialistIds, user?.type]);

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
            || getProfessionalTypeLabel(
              specialist.professionalType,
              specialist.professionalTypeLabel,
            ).toLowerCase().includes(query)
            || specialist.matchingProfile.therapeuticApproach.some((approach) =>
              approach.toLowerCase().includes(query)
            )
            || specialist.matchingProfile.specialties.some((specialty) =>
              specialty.toLowerCase().includes(query)
            )
            || specialist.tags.some((tag) => tag.toLowerCase().includes(query));
          if (!matchesSearch) return false;
        }

        if (selectedProfessionalTypes.length > 0) {
          if (!specialist.professionalType) return false;
          if (!selectedProfessionalTypes.includes(specialist.professionalType)) return false;
        }

        if (selectedFilters.length > 0) {
          const matchesFilter = selectedFilters.some((filter) =>
            specialist.specialization.toLowerCase().includes(filter.toLowerCase())
            || specialist.matchingProfile.specialties.some((specialty) =>
              specialty.toLowerCase().includes(filter.toLowerCase())
            )
            || specialist.matchingProfile.therapeuticApproach.some((approach) =>
              approach.toLowerCase().includes(filter.toLowerCase())
            )
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
  }, [combinedSpecialists, searchQuery, selectedFilters, selectedProfessionalTypes, sortOption]);

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

  const renderFavoriteButton = (specialist: Specialist, compact = false) => (
    <AnimatedPressable
      onPress={() => handleToggleFavorite(specialist.id)}
      hoverLift={false}
      pressScale={0.92}
      style={[
        compact ? styles.favoriteIconButtonCompact : styles.favoriteIconButton,
        {
          backgroundColor: specialist.isFavorite ? theme.secondaryAlpha12 : theme.bgAlt,
          borderColor: specialist.isFavorite ? theme.secondary : theme.borderLight,
        },
      ]}
      accessibilityLabel={specialist.isFavorite ? 'Quitar de favoritos' : 'Guardar como favorito'}
    >
      <Ionicons
        name={specialist.isFavorite ? 'heart' : 'heart-outline'}
        size={compact ? 17 : 19}
        color={specialist.isFavorite ? theme.secondary : theme.textMuted}
      />
    </AnimatedPressable>
  );

  const renderPrimarySpecialist = () => {
    if (!primarySpecialist) return null;
    const isActiveSession = primarySession?.status === 'PENDING' || primarySession?.status === 'CONFIRMED';
    const sessionLabel = isActiveSession ? 'Cita en curso' : 'Última sesión';

    return (
      <View style={styles.primarySection}>
        <View style={styles.primaryHeader}>
          <View>
            <Text style={styles.primaryEyebrow}>Tu especialista</Text>
            <Text style={styles.primaryTitle}>Continúa con {primarySpecialist.name}</Text>
          </View>
          {user?.type === 'client' ? renderFavoriteButton(primarySpecialist) : null}
        </View>
        <AnimatedPressable
          onPress={() => handleSpecialistPress(primarySpecialist.id)}
          pressScale={0.985}
          style={styles.primaryCard}
        >
          <LinearGradient
            colors={isDark ? [theme.bgElevated, theme.bgCard] : [theme.bgCard, theme.primaryAlpha12]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.primaryCardInner}
          >
            <View style={styles.primaryAvatar}>
              {primarySpecialist.avatar ? (
                <Image source={{ uri: primarySpecialist.avatar }} style={styles.primaryAvatarImage} />
              ) : (
                <Text style={styles.primaryAvatarInitial}>{primarySpecialist.initial}</Text>
              )}
            </View>
            <View style={styles.primaryCopy}>
              <View style={styles.primaryPillsRow}>
                <View style={styles.primaryPill}>
                  <Ionicons name="calendar-outline" size={13} color={theme.primary} />
                  <Text style={styles.primaryPillText}>{sessionLabel}</Text>
                </View>
                <View style={styles.primaryPill}>
                  <Ionicons name="star" size={13} color={theme.starRating} />
                  <Text style={styles.primaryPillText}>{primarySpecialist.rating.toFixed(1)}</Text>
                </View>
              </View>
              <Text style={styles.primaryName}>{primarySpecialist.name}</Text>
              <Text style={styles.primarySpecialization}>
                {getProfessionalTypeLabel(
                  primarySpecialist.professionalType,
                  primarySpecialist.professionalTypeLabel,
                )}
              </Text>
              <Text style={styles.primaryDescription} numberOfLines={2}>
                {primarySpecialist.description}
              </Text>
            </View>
            <View style={styles.primaryActions}>
              <Button
                variant="primary"
                size="medium"
                onPress={() => handleSpecialistPress(primarySpecialist.id)}
                icon={<Ionicons name="arrow-forward" size={16} color={theme.textOnPrimary} />}
                iconPosition="right"
              >
                Ver perfil
              </Button>
            </View>
          </LinearGradient>
        </AnimatedPressable>
      </View>
    );
  };

  const renderFavoritesSection = () => {
    if (favoriteSpecialists.length === 0) return null;

    return (
      <View style={styles.favoriteSection}>
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsTitle}>Favoritos</Text>
          <Text style={styles.resultsMeta}>Privado para ti</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.favoritesRail}
        >
          {favoriteSpecialists.map((specialist) => (
            <AnimatedPressable
              key={`favorite-${specialist.id}`}
              onPress={() => handleSpecialistPress(specialist.id)}
              style={styles.favoriteCard}
              pressScale={0.98}
            >
              {renderFavoriteButton(specialist, true)}
              <View style={styles.favoriteAvatar}>
                {specialist.avatar ? (
                  <Image source={{ uri: specialist.avatar }} style={styles.favoriteAvatarImage} />
                ) : (
                  <Text style={styles.favoriteAvatarInitial}>{specialist.initial}</Text>
                )}
              </View>
              <Text style={styles.favoriteName} numberOfLines={1}>{specialist.name}</Text>
              <Text style={styles.favoriteSpec} numberOfLines={2}>
                {getProfessionalTypeLabel(specialist.professionalType, specialist.professionalTypeLabel)}
              </Text>
            </AnimatedPressable>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.stateIconWrap}>
        <Ionicons name="search-outline" size={42} color={theme.textMuted} />
      </View>
      <Text style={styles.stateTitle}>No encontramos especialistas</Text>
      <Text style={styles.stateDescription}>
        Prueba con otra búsqueda o ajusta los filtros para ampliar resultados.
      </Text>
      {(searchQuery || selectedFilters.length > 0 || selectedProfessionalTypes.length > 0) ? (
        <Button
          variant="outline"
          onPress={() => {
            setSearchQuery('');
            setSelectedFilters([]);
            setSelectedProfessionalTypes([]);
          }}
        >
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
                onToggleFavorite={user?.type === 'client' ? () => handleToggleFavorite(specialist.id) : undefined}
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
              filters={PROFESSIONAL_TYPE_FILTERS}
              selectedFilters={selectedProfessionalTypes}
              onFilterChange={(ids) => setSelectedProfessionalTypes(ids as ProfessionalType[])}
              triggerLabel="Tipo profesional"
              panelTitle="Tipo profesional"
              panelSubtitle="Filtra por la profesión regulada del especialista."
              allLabel="Todos los tipos"
              allCaption="Sin limitar por profesión regulada."
              groups={PROFESSIONAL_TYPE_FILTER_GROUPS}
            />
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
          {!loading ? renderPrimarySpecialist() : null}
          {!loading ? renderFavoritesSection() : null}

          {primarySpecialist && !showAllSpecialists && !loading ? (
            <View style={styles.revealListCard}>
              <View style={styles.revealCopy}>
                <Text style={styles.revealTitle}>También puedes explorar otros especialistas</Text>
                <Text style={styles.revealSubtitle}>
                  Tu especialista aparece primero, pero la lista completa sigue disponible cuando quieras comparar.
                </Text>
              </View>
              <Button
                variant="outline"
                onPress={() => setShowAllSpecialists(true)}
                icon={<Ionicons name="list-outline" size={16} color={theme.primary} />}
              >
                Ver todos los especialistas
              </Button>
            </View>
          ) : null}

          {(!primarySpecialist || showAllSpecialists) ? (
            <>
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
                      onToggleFavorite={user?.type === 'client' ? () => handleToggleFavorite(specialist.id) : undefined}
                    />
                  ))}
                </View>
              ) : null}
            </>
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

function createStyles(theme: Theme, isDark: boolean, isMobile: boolean) {
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
    primarySection: {
      gap: spacing.md,
    },
    primaryHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: spacing.md,
    },
    primaryEyebrow: {
      fontSize: 12,
      fontFamily: theme.fontSansBold,
      color: theme.primary,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    primaryTitle: {
      marginTop: 3,
      fontSize: 24,
      fontFamily: theme.fontDisplay,
      color: theme.textPrimary,
    },
    primaryCard: {
      borderRadius: 22,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: theme.primaryMuted,
      shadowColor: theme.shadowCard,
      shadowOffset: { width: 0, height: 14 },
      shadowOpacity: 0.8,
      shadowRadius: 28,
      elevation: 4,
    },
    primaryCardInner: {
      padding: spacing.lg,
      flexDirection: isMobile ? 'column' : 'row',
      alignItems: isMobile ? 'flex-start' : 'center',
      gap: spacing.lg,
    },
    primaryAvatar: {
      width: 86,
      height: 86,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      backgroundColor: theme.primary,
    },
    primaryAvatarImage: {
      width: 86,
      height: 86,
    },
    primaryAvatarInitial: {
      fontSize: 34,
      fontFamily: theme.fontDisplay,
      color: theme.textOnPrimary,
    },
    primaryCopy: {
      flex: 1,
      minWidth: 0,
      gap: 6,
    },
    primaryPillsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    primaryPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: isDark ? theme.bgElevated : theme.bgAlt,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    primaryPillText: {
      fontSize: 12,
      fontFamily: theme.fontSansSemiBold,
      color: theme.textSecondary,
    },
    primaryName: {
      fontSize: 25,
      fontFamily: theme.fontDisplay,
      color: theme.textPrimary,
    },
    primarySpecialization: {
      fontSize: 14,
      fontFamily: theme.fontSansSemiBold,
      color: theme.primary,
    },
    primaryDescription: {
      fontSize: 14,
      lineHeight: 20,
      fontFamily: theme.fontSans,
      color: theme.textSecondary,
    },
    primaryActions: {
      alignSelf: isMobile ? 'stretch' : 'center',
    },
    favoriteIconButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
    },
    favoriteIconButtonCompact: {
      position: 'absolute',
      top: 10,
      right: 10,
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      zIndex: 2,
    },
    favoriteSection: {
      gap: spacing.md,
    },
    favoritesRail: {
      gap: spacing.md,
      paddingRight: spacing.lg,
    },
    favoriteCard: {
      width: 164,
      minHeight: 180,
      padding: spacing.md,
      borderRadius: 18,
      backgroundColor: theme.bgCard,
      borderWidth: 1,
      borderColor: theme.borderLight,
      shadowColor: theme.shadowCard,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.6,
      shadowRadius: 18,
      elevation: 2,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    favoriteAvatar: {
      width: 58,
      height: 58,
      borderRadius: 29,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primary,
    },
    favoriteAvatarImage: {
      width: 58,
      height: 58,
    },
    favoriteAvatarInitial: {
      fontSize: 22,
      fontFamily: theme.fontDisplay,
      color: theme.textOnPrimary,
    },
    favoriteName: {
      fontSize: 14,
      fontFamily: theme.fontSansBold,
      color: theme.textPrimary,
      textAlign: 'center',
      width: '100%',
    },
    favoriteSpec: {
      fontSize: 12,
      lineHeight: 16,
      fontFamily: theme.fontSans,
      color: theme.textSecondary,
      textAlign: 'center',
    },
    revealListCard: {
      padding: spacing.lg,
      borderRadius: 20,
      backgroundColor: theme.bgCard,
      borderWidth: 1,
      borderColor: theme.borderLight,
      flexDirection: isMobile ? 'column' : 'row',
      alignItems: isMobile ? 'stretch' : 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    revealCopy: {
      flex: 1,
      gap: 4,
    },
    revealTitle: {
      fontSize: 17,
      fontFamily: theme.fontSansBold,
      color: theme.textPrimary,
    },
    revealSubtitle: {
      fontSize: 13,
      lineHeight: 19,
      fontFamily: theme.fontSans,
      color: theme.textSecondary,
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
