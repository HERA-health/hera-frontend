import { directoryEntryHref } from '../../services/directoryBookingService';
import { SearchableProfileSelect } from '../../components/common/SearchableProfileSelect';
import { renderLanguageIcon } from '../../components/common/LanguageIcon';
import { usePublicDirectory } from './usePublicDirectory';
import { DirectoryPagination } from './components/DirectoryPagination';
import { DirectoryFiltersSheet } from './components/DirectoryFiltersSheet';
import { useProfileOptions } from '../../hooks/useProfileOptions';
import { optionLabel } from '../../utils/profileOptions';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/common/Button';
import LoadingState from '../../components/common/LoadingState';
import { Input } from '../../components/common/Input';
import { SimpleDropdown } from '../../components/common/SimpleDropdown';
import { MultiSelectDropdown } from '../../components/common/MultiSelectDropdown';
import { PublicSpecialistCard } from '../../components/features/PublicSpecialistCard';
import type { AppRouteProp, RootStackParamList } from '../../constants/types';
import {
  PROFESSIONAL_TYPE_OPTIONS,
  type ProfessionalType,
} from '../../constants/professionalTypes';
import {
  PROFESSIONAL_SPECIALTY_OPTIONS,
  PROFESSIONAL_THERAPEUTIC_APPROACH_OPTIONS,
  isProfessionalSpecialtyValue,
  type ProfessionalSpecialtyValue,
  type ProfessionalTherapeuticApproachValue,
} from '../../constants/professionalMatchingOptions';
import * as specialistsService from '../../services/specialistsService';
import * as analyticsService from '../../services/analyticsService';
import { LandingHeader } from '../landing/components/LandingHeader';
import type { LandingSectionAnchor } from '../landing/types';
import { useWebPageMetadata } from '../../hooks/useWebPageMetadata';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'PublicSpecialists'>;

const MODALITY_OPTIONS: Array<{ label: string; value: specialistsService.PublicSpecialistModality }> = [
  { label: 'Terapia online', value: 'ONLINE' },
  { label: 'Llamada', value: 'PHONE_CALL' },
  { label: 'Terapia presencial', value: 'IN_PERSON' },
];

type RatingFilter = 4 | 4.5;
type PriceFilter = 50 | 60 | 80;
const RATING_OPTIONS: ReadonlyArray<{ label: string; value: RatingFilter }> = [
  { label: '4,5 o más', value: 4.5 },
  { label: '4 o más', value: 4 },
];

const PRICE_OPTIONS: ReadonlyArray<{ label: string; value: PriceFilter }> = [
  { label: 'Hasta 50 €', value: 50 },
  { label: 'Hasta 60 €', value: 60 },
  { label: 'Hasta 80 €', value: 80 },
];

const SORT_OPTIONS: ReadonlyArray<{
  label: string;
  value: specialistsService.PublicSpecialistDirectorySort;
}> = [
  { label: 'Más recientes', value: 'RECENT' },
  { label: 'Mejor valorados', value: 'RATING_DESC' },
  { label: 'Más reseñas', value: 'REVIEWS_DESC' },
  { label: 'Precio: menor primero', value: 'PRICE_ASC' },
  { label: 'Precio: mayor primero', value: 'PRICE_DESC' },
];

type DirectoryFilters = {
  language?: string;
  religion?: string;
  q: string;
  professionalType: ProfessionalType | null;
  modality: specialistsService.PublicSpecialistModality | null;
  specialties: ProfessionalSpecialtyValue[];
  approaches: ProfessionalTherapeuticApproachValue[];
  minRating: RatingFilter | null;
  maxPrice: PriceFilter | null;
  sort: specialistsService.PublicSpecialistDirectorySort;
};

const INITIAL_FILTERS: DirectoryFilters = {
  q: '',
  professionalType: null,
  modality: null,
  specialties: [],
  approaches: [],
  minRating: null,
  maxPrice: null,
  sort: 'RECENT',
};

const createInitialFilters = (specialty: unknown): DirectoryFilters =>
  isProfessionalSpecialtyValue(specialty)
    ? { ...INITIAL_FILTERS, specialties: [specialty] }
    : INITIAL_FILTERS;

export const PublicSpecialistsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<AppRouteProp<'PublicSpecialists'>>();
  const {
    isAuthenticated,
    user,
    verificationSubmitted,
  } = useAuth();
  const { theme, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1180;
  const isMobile = width < 720;
  const { options: profileOptions, error: optionsError, retry: retryOptions } = useProfileOptions();
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const resultsTop = useRef(0);
  const previousPage = useRef(1);
  const [gridWidth, setGridWidth] = useState(0);
  const gridColumns = gridWidth >= 740 ? 2 : 1;
  const compactCards = (gridWidth - (gridColumns - 1) * 20) / gridColumns >= 460;
  const [queryInput, setQueryInput] = useState('');
  const [searchError, setSearchError] = useState<string | undefined>();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<DirectoryFilters>(() =>
    createInitialFilters(route.params?.specialty)
  );
  const [headerScrolled, setHeaderScrolled] = useState(false);
  const headerScrolledRef = useRef(false);
  const requestFilters = useMemo<specialistsService.PublicSpecialistDirectoryFilters>(() => ({
    q: filters.q || undefined, language: filters.language, religion: filters.religion,
    professionalType: filters.professionalType ?? undefined, modality: filters.modality ?? undefined,
    specialties: filters.specialties.length ? filters.specialties : undefined,
    approaches: filters.approaches.length ? filters.approaches : undefined,
    minRating: filters.minRating ?? undefined, maxPrice: filters.maxPrice ?? undefined, sort: filters.sort,
  }), [filters]);
  const { data, loading, error, loadPage, retry } = usePublicDirectory(requestFilters);
  const items = data?.items ?? [];
  const rows = Array.from({ length: Math.ceil(items.length / gridColumns) }, (_, index) =>
    items.slice(index * gridColumns, (index + 1) * gridColumns)
  );
  const page = data?.page ?? 1;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  useEffect(() => {
    if (data && previousPage.current !== data.page) scrollRef.current?.scrollTo({ y: Math.max(0, resultsTop.current - 88), animated: false });
    if (data) previousPage.current = data.page;
  }, [data]);
  useWebPageMetadata({
    title: 'Hera | Especialistas',
    description: 'Explora especialistas de salud mental verificados, compara sus modalidades y consulta sus perfiles públicos antes de reservar.',
    canonicalPath: '/especialistas',
  });

  useEffect(() => {
    analyticsService.trackScreen('public_specialists_directory');
  }, []);

  useEffect(() => {
    const requestedSpecialty = route.params?.specialty;

    if (!isProfessionalSpecialtyValue(requestedSpecialty)) {
      return;
    }

    setFilters((currentFilters) =>
      currentFilters.specialties.length === 1
      && currentFilters.specialties[0] === requestedSpecialty
        ? currentFilters
        : { ...currentFilters, specialties: [requestedSpecialty] }
    );
  }, [route.params?.specialty]);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextHeaderScrolled = event.nativeEvent.contentOffset.y > 24;

    if (nextHeaderScrolled !== headerScrolledRef.current) {
      headerScrolledRef.current = nextHeaderScrolled;
      setHeaderScrolled(nextHeaderScrolled);
    }
  }, []);

  const navigateToLandingSection = useCallback((section: LandingSectionAnchor) => {
    navigation.navigate('Landing', { section });
  }, [navigation]);

  const navigateToLandingHome = useCallback(() => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Landing' }],
    });
  }, [navigation]);

  const navigateToAuthenticatedWorkspace = useCallback((): boolean => {
    if (!isAuthenticated || !user) {
      return false;
    }

    const workspaceRoute = user.type === 'professional'
      ? (verificationSubmitted === false ? 'ProfessionalVerification' : 'ProfessionalHome')
      : (user.type === 'clinic' ? 'ClinicDashboard' : 'Home');
    // RootNavigator owns the current legal gate; the login snapshot can be stale.
    navigation.navigate(
      navigation.getState().routeNames.includes('RequiredLegalAcceptance')
        ? 'RequiredLegalAcceptance'
        : workspaceRoute
    );
    return true;
  }, [
    isAuthenticated,
    navigation,
    user,
    verificationSubmitted,
  ]);

  const handleAccess = useCallback(() => {
    if (!navigateToAuthenticatedWorkspace()) {
      navigation.navigate('Welcome');
    }
  }, [navigateToAuthenticatedWorkspace, navigation]);

  const canVisitLanding = navigation.getState().routeNames.includes('Landing');

  const submitSearch = useCallback(() => {
    const nextQuery = queryInput.trim();
    if (nextQuery.length === 1) {
      setSearchError('Escribe al menos 2 caracteres para buscar.');
      return;
    }
    setSearchError(undefined);
    setFilters((currentFilters) => ({
      ...currentFilters,
      q: nextQuery,
    }));
  }, [queryInput]);

  const clearFilters = useCallback(() => {
    setQueryInput('');
    setSearchError(undefined);
    setFilters(INITIAL_FILTERS);
  }, []);

  const selectedProfessionalType = useMemo(
    () => PROFESSIONAL_TYPE_OPTIONS.map(option => ({ label: option.label, value: option.id })), []
  );
  const activeFilters: Array<{ key: string; label: string; remove: () => void }> = [];
  if (filters.q) activeFilters.push({ key: 'q', label: `«${filters.q}»`, remove: () => { setQueryInput(''); setSearchError(undefined); setFilters(current => ({ ...current, q: '' })); } });
  if (filters.language) activeFilters.push({ key: 'language', label: optionLabel(profileOptions?.languages ?? [], filters.language), remove: () => setFilters(current => ({ ...current, language: undefined })) });
  if (filters.religion) activeFilters.push({ key: 'religion', label: optionLabel(profileOptions?.religions ?? [], filters.religion), remove: () => setFilters(current => ({ ...current, religion: undefined })) });
  if (filters.professionalType) activeFilters.push({ key: 'type', label: selectedProfessionalType.find(option => option.value === filters.professionalType)?.label ?? filters.professionalType, remove: () => setFilters(current => ({ ...current, professionalType: null })) });
  if (filters.modality) activeFilters.push({ key: 'modality', label: MODALITY_OPTIONS.find(option => option.value === filters.modality)?.label ?? filters.modality, remove: () => setFilters(current => ({ ...current, modality: null })) });
  if (filters.minRating) activeFilters.push({ key: 'rating', label: `${filters.minRating} estrellas o más`, remove: () => setFilters(current => ({ ...current, minRating: null })) });
  if (filters.maxPrice) activeFilters.push({ key: 'price', label: `Hasta ${filters.maxPrice} €`, remove: () => setFilters(current => ({ ...current, maxPrice: null })) });
  filters.specialties.forEach(value => activeFilters.push({ key: `specialty-${value}`, label: PROFESSIONAL_SPECIALTY_OPTIONS.find(option => option.value === value)?.label ?? value, remove: () => setFilters(current => ({ ...current, specialties: current.specialties.filter(item => item !== value) })) }));
  filters.approaches.forEach(value => activeFilters.push({ key: `approach-${value}`, label: PROFESSIONAL_THERAPEUTIC_APPROACH_OPTIONS.find(option => option.value === value)?.label ?? value, remove: () => setFilters(current => ({ ...current, approaches: current.approaches.filter(item => item !== value) })) }));
  const activeFilterCount = activeFilters.length;
  const hasActiveFilters = activeFilterCount > 0 || Boolean(queryInput);
  const textStyle = { color: theme.textSecondary, fontFamily: theme.fontSans };
  const fieldLabel = { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold, fontSize: 13, lineHeight: 19 };
  const filterMenuWidth = Math.min(520, width - 80);

  const sortControl = (
    <View style={[styles.sort, isMobile && styles.sortMobile]}>
      <SimpleDropdown options={SORT_OPTIONS} value={filters.sort} onSelect={sort => setFilters(current => ({ ...current, sort }))}
        placeholder="Ordenar" accessibilityLabel="Ordenar especialistas" compact presentation="portal" keyboardNavigation
        selectionIndicator="radio" highlightSelection={false} optionsMinWidth={230} optionsAlign="right" />
    </View>
  );
  const activeFilterSummary = activeFilterCount > 0 ? (
    <View style={[styles.activeFilters, isDesktop && styles.sidebarActiveFilters]}>
      {activeFilters.map(filter => <Pressable key={filter.key} accessibilityRole="button" accessibilityLabel={`Quitar filtro: ${filter.label}`}
        onPress={filter.remove} style={[styles.activeChip, { backgroundColor: theme.secondaryMuted }]}>
        <Text numberOfLines={1} style={[styles.activeChipText, { color: theme.textPrimary, fontFamily: theme.fontSans }]}>{filter.label}</Text>
        <Ionicons name="close" size={14} color={theme.textPrimary} />
      </Pressable>)}
      {!isDesktop ? <Pressable accessibilityRole="button" onPress={clearFilters} style={styles.clearButton}>
        <Text style={{ color: theme.primary, fontFamily: theme.fontSansSemiBold, fontSize: 12 }}>Limpiar filtros</Text>
      </Pressable> : null}
    </View>
  ) : null;

  const filterPanel = (
    <View style={[styles.filtersPanel, !isDesktop && styles.sheetFields, { backgroundColor: theme.bgCard, borderColor: theme.borderLight }]}>
      {isDesktop ? <View style={[styles.filtersHeading, { borderBottomColor: theme.borderLight }]}>
        <Text accessibilityRole="header" style={[styles.filtersTitle, { color: theme.textPrimary, fontFamily: theme.fontDisplay }]}>Filtros</Text>
        {hasActiveFilters ? <Pressable accessibilityRole="button" accessibilityLabel="Limpiar filtros" onPress={clearFilters} style={styles.clearButton}>
          <Text style={{ color: theme.primary, fontFamily: theme.fontSansSemiBold, fontSize: 12 }}>Limpiar</Text>
        </Pressable> : null}
      </View> : null}
      {isDesktop ? activeFilterSummary : null}
      <View style={[styles.filterField, { zIndex: 9 }]}>
        <Text style={fieldLabel}>¿En qué necesitas apoyo?</Text>
        <MultiSelectDropdown options={PROFESSIONAL_SPECIALTY_OPTIONS} values={filters.specialties}
          onApply={specialties => setFilters(current => ({ ...current, specialties }))} placeholder="Tema" presentation="modal" menuWidth={filterMenuWidth} maxOptionsHeight={230} />
      </View>
      <View style={[styles.filterField, { zIndex: 8 }]}>
        <Text style={fieldLabel}>Modalidad de consulta</Text>
        <SimpleDropdown options={MODALITY_OPTIONS} value={filters.modality} onSelect={modality => setFilters(current => ({ ...current, modality }))}
          placeholder="Modalidad" accessibilityLabel="Modalidad" compact presentation="portal" keyboardNavigation selectionIndicator="checkbox"
          onClear={() => setFilters(current => ({ ...current, modality: null }))} />
      </View>
      <SearchableProfileSelect label="Idioma de las sesiones" options={profileOptions?.languages ?? []}
        values={filters.language ? [filters.language] : []} disabled={!profileOptions} renderIcon={renderLanguageIcon}
        onChange={values => setFilters(current => ({ ...current, language: values[0] }))} emptyLabel="Cualquiera" />
      <View style={[styles.filterField, { zIndex: 6 }]}>
        <Text style={fieldLabel}>Precio por sesión</Text>
        <SimpleDropdown options={PRICE_OPTIONS} value={filters.maxPrice} onSelect={maxPrice => setFilters(current => ({ ...current, maxPrice }))}
          placeholder="Precio" accessibilityLabel="Precio" compact presentation="portal" keyboardNavigation selectionIndicator="checkbox"
          onClear={() => setFilters(current => ({ ...current, maxPrice: null }))} />
      </View>
      <View style={[styles.filterField, { zIndex: 5 }]}>
        <Text style={fieldLabel}>Enfoque terapéutico</Text>
        <MultiSelectDropdown options={PROFESSIONAL_THERAPEUTIC_APPROACH_OPTIONS} values={filters.approaches}
          onApply={approaches => setFilters(current => ({ ...current, approaches }))} placeholder="Enfoque" presentation="modal" menuWidth={filterMenuWidth} maxOptionsHeight={230} />
      </View>
      <View style={[styles.filterField, { zIndex: 4 }]}>
        <Text style={fieldLabel}>Tipo de profesional</Text>
        <SimpleDropdown options={selectedProfessionalType} value={filters.professionalType} onSelect={professionalType => setFilters(current => ({ ...current, professionalType }))}
          placeholder="Perfil" accessibilityLabel="Perfil" compact presentation="portal" keyboardNavigation selectionIndicator="checkbox" optionsMinWidth={260}
          onClear={() => setFilters(current => ({ ...current, professionalType: null }))} />
      </View>
      <View style={[styles.filterField, { zIndex: 3 }]}>
        <Text style={fieldLabel}>Valoraciones</Text>
        <SimpleDropdown options={RATING_OPTIONS} value={filters.minRating} onSelect={minRating => setFilters(current => ({ ...current, minRating }))}
          placeholder="Valoración" accessibilityLabel="Valoración" compact presentation="portal" keyboardNavigation selectionIndicator="checkbox"
          onClear={() => setFilters(current => ({ ...current, minRating: null }))} />
      </View>
      {profileOptions?.religionEnabled ? <>
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: moreFiltersOpen }}
          onPress={() => setMoreFiltersOpen(open => !open)} style={styles.additionalFilters}>
          <Text style={{ color: theme.primary, fontFamily: theme.fontSansSemiBold, fontSize: 13 }}>Más filtros{filters.religion ? ' · 1' : ''}</Text>
          <Ionicons name={moreFiltersOpen ? 'chevron-up' : 'chevron-down'} size={15} color={theme.primary} />
        </Pressable>
        {moreFiltersOpen ? <SearchableProfileSelect label="Perspectiva espiritual o religiosa"
          options={profileOptions.religions.map(option => ({ ...option, label: option.value === 'christian' ? 'Cristiana, incluidas católica y evangélica' : option.label }))}
          values={filters.religion ? [filters.religion] : []} onChange={values => setFilters(current => ({ ...current, religion: values[0] }))} emptyLabel="Cualquiera" /> : null}
      </> : null}
      {optionsError ? <Pressable accessibilityRole="button" onPress={retryOptions} style={styles.clearButton}>
        <Text style={[styles.hint, textStyle]}>No se pudieron cargar las opciones. Reintentar</Text>
      </Pressable> : null}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.bgMuted }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.bgMuted} />
      <LandingHeader
        onViewPlans={() => navigation.navigate('Pricing')}
        context="directory"
        isScrolled={headerScrolled}
        accessLabel={isAuthenticated ? 'Mi espacio' : 'Acceder'}
        onLogoPress={canVisitLanding ? navigateToLandingHome : handleAccess}
        onExploreProfessionals={canVisitLanding ? () => navigateToLandingSection('forSpecialists') : undefined}
        onAccess={handleAccess}
        onScrollToSection={canVisitLanding ? navigateToLandingSection : undefined}
      />
      <ScrollView ref={scrollRef} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator onScroll={handleScroll} scrollEventThrottle={24} keyboardShouldPersistTaps="handled">
        <View style={[styles.heroBand, isMobile && styles.heroBandMobile, isDesktop && styles.desktopPadding, isDesktop && styles.heroBandDesktop]}>
          <View style={[styles.hero, isMobile && styles.heroMobile, isDesktop && styles.heroDesktop]}>
            <View style={styles.heroCopy}>
              <View style={styles.eyebrowRow}>
                <Text style={[styles.eyebrow, { color: theme.primary, fontFamily: theme.fontSansSemiBold }]}>DIRECTORIO DE ESPECIALISTAS</Text>
                <View style={[styles.eyebrowRule, { backgroundColor: theme.secondary }]} />
              </View>
              <Text accessibilityRole="header" aria-level={1} style={[styles.title, isMobile && styles.titleMobile, isDesktop && styles.titleDesktop, { color: theme.textPrimary, fontFamily: theme.fontDisplay }]}>Encuentra un especialista a tu ritmo</Text>
              <Text style={[styles.subtitle, isMobile && styles.subtitleMobile, textStyle]}>Compara perfiles verificados y encuentra el apoyo que necesitas.</Text>
            </View>
            <View style={[styles.searchArea, isDesktop && styles.searchAreaDesktop]}>
              <View style={styles.searchRow}>
                <Input value={queryInput} onChangeText={value => { setQueryInput(value); setSearchError(undefined); }} onSubmitEditing={submitSearch}
                  maxLength={80}
                  placeholder={isMobile ? 'Nombre o especialidad' : 'Nombre, profesión o especialidad'} accessibilityLabel="Nombre, profesión o especialidad" returnKeyType="search"
                  style={isMobile ? styles.mobileSearchInput : undefined}
                  leftIcon={!isMobile ? <Ionicons name="search-outline" size={19} color={theme.primary} /> : undefined}
                  rightIcon={isMobile ? <Pressable accessibilityRole="button" accessibilityLabel="Buscar" onPress={submitSearch}
                    style={[styles.mobileSearchButton, { backgroundColor: theme.actionPrimary }]}>
                    <Ionicons name="search-outline" size={20} color={theme.actionPrimaryText} />
                  </Pressable> : undefined}
                  containerStyle={styles.searchField} />
                {!isMobile ? <Button variant="primary" size="medium" onPress={submitSearch}>Buscar</Button> : null}
              </View>
              <Text accessibilityLiveRegion="polite" style={[styles.hint, { color: searchError ? theme.error : theme.textSecondary, fontFamily: theme.fontSans }]}>
                {searchError ?? 'Combina nombre, profesión, especialidad o enfoque. Entre 2 y 80 caracteres.'}
              </Text>
              {isDesktop ? <View style={styles.searchTools}>
                <View style={styles.searchHint}>
                  <Ionicons name="shield-checkmark-outline" size={16} color={theme.primary} />
                  <Text accessibilityLiveRegion="polite" style={[styles.hint, styles.hintText, textStyle]}>
                    {loading && data ? 'Actualizando…' : 'Profesionales verificados'}
                  </Text>
                </View>
                <View style={styles.desktopSort}>
                  <Text style={[styles.hint, textStyle]}>Ordenar por</Text>
                  {sortControl}
                </View>
              </View> : null}
            </View>
          </View>
        </View>

        <View onLayout={event => { resultsTop.current = event.nativeEvent.layout.y; }} style={[styles.bodyWrap, isMobile && styles.bodyWrapMobile, isDesktop && styles.desktopPadding]}>
          <View style={[styles.body, isDesktop && styles.bodyDesktop]}>
            {isDesktop ? <View style={styles.sidebar}>{filterPanel}</View> : null}
            <View style={styles.results}>
              {!isDesktop ? <View style={[styles.resultsHeader, isMobile && styles.resultsHeaderMobile]}>
                {loading && data ? <Text accessibilityLiveRegion="polite" style={[styles.updateStatus, styles.hint, textStyle]}>Actualizando…</Text> : null}
                <View style={styles.toolbarActions}>
                  <Pressable accessibilityRole="button" accessibilityState={{ expanded: mobileFiltersOpen }}
                    accessibilityLabel={`Filtros${activeFilterCount ? `, ${activeFilterCount} activos` : ''}`} onPress={() => setMobileFiltersOpen(open => !open)}
                    style={[styles.filtersToggle, { borderColor: activeFilterCount ? theme.primary : theme.border, backgroundColor: activeFilterCount ? theme.secondaryMuted : theme.bgCard }]}>
                    <Ionicons name="options-outline" size={17} color={theme.primary} />
                    <Text style={[styles.hint, { color: theme.primary, fontFamily: theme.fontSansSemiBold }]}>Filtros{activeFilterCount ? ` · ${activeFilterCount}` : ''}</Text>
                  </Pressable>
                  {sortControl}
                </View>
              </View> : null}
              {!isDesktop ? activeFilterSummary : null}
              {error && data ? <View accessibilityRole="alert" style={[styles.errorBanner, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
                <Text style={[styles.errorText, textStyle]}>{error} Puedes seguir consultando los últimos resultados disponibles.</Text>
                <Button variant="outline" size="small" onPress={() => void retry()}>Reintentar</Button>
              </View> : null}
              <View onLayout={event => setGridWidth(event.nativeEvent.layout.width)} style={styles.gridContainer}>
                {loading && !data ? (
                  <View style={styles.loadingState}><LoadingState size="small" message="Cargando perfiles verificados…" /></View>
                ) : error && !data ? (
                  <View style={styles.notice}>
                    <Ionicons name="cloud-offline-outline" size={30} color={theme.primary} />
                    <Text style={[styles.noticeTitle, { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold }]}>No hemos podido cargar el directorio</Text>
                    <Text style={[styles.noticeText, textStyle]}>{error}</Text>
                    <Button variant="outline" size="small" onPress={() => void retry()}>Reintentar</Button>
                  </View>
                ) : items.length === 0 ? (
                  <View style={styles.notice}>
                    <Ionicons name="people-outline" size={30} color={theme.primary} />
                    <Text style={[styles.noticeTitle, { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold }]}>No hemos encontrado perfiles con estos criterios</Text>
                    <Text style={[styles.noticeText, textStyle]}>Prueba a modificar la búsqueda o a eliminar alguno de los filtros.</Text>
                    <Button variant="outline" size="small" onPress={clearFilters}>Limpiar filtros</Button>
                  </View>
                ) : (
                  <View style={styles.grid} testID="directory-grid">
                    {rows.map(row => <View key={row[0].id} style={styles.gridRow} testID="directory-row">
                      {row.map(specialist => <View key={specialist.id} style={styles.gridCell}>
                        <PublicSpecialistCard specialist={specialist} variant="directory"
                          compactDirectory={compactCards}
                          mobileDirectory={isMobile}
                          profileOptions={profileOptions}
                          style={styles.gridCell}
                          href={directoryEntryHref(specialist.publicSlug ?? specialist.id, specialist.matchedOptionId ?? undefined)}
                          onPress={() => navigation.navigate('PublicSpecialistProfile', {
                            profileRef: specialist.publicSlug ?? specialist.id,
                            optionId: specialist.matchedOptionId ?? undefined,
                          })} />
                      </View>)}
                      {row.length < gridColumns ? <View style={styles.gridCell} testID="directory-empty-cell" /> : null}
                    </View>)}
                  </View>
                )}
              </View>
              {data ? <DirectoryPagination page={page} totalPages={totalPages} compact={isMobile} busy={loading} onChange={next => void loadPage(next)} /> : null}
            </View>
          </View>
        </View>
      </ScrollView>
      {!isDesktop ? <DirectoryFiltersSheet visible={mobileFiltersOpen} onClose={() => setMobileFiltersOpen(false)}
        onClear={clearFilters} hasFilters={hasActiveFilters}>
        {filterPanel}
      </DirectoryFiltersSheet> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingTop: 78, paddingBottom: 56 },
  desktopPadding: { paddingHorizontal: 32 },
  heroBand: { paddingHorizontal: 20, paddingVertical: 20 },
  heroBandMobile: { paddingVertical: 16 },
  heroBandDesktop: { paddingVertical: 14 },
  hero: { width: '100%', maxWidth: 1680, alignSelf: 'center', gap: 20 },
  heroMobile: { gap: 16 },
  heroDesktop: { flexDirection: 'row', alignItems: 'center', gap: 48 },
  heroCopy: { flex: 1, minWidth: 0 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 8 },
  eyebrow: { fontSize: 10, lineHeight: 16, letterSpacing: 1.3 },
  eyebrowRule: { width: 56, height: 1, flexShrink: 1 },
  title: { fontSize: 30, lineHeight: 36, maxWidth: 660, letterSpacing: -0.6 },
  titleMobile: { fontSize: 26, lineHeight: 32 },
  titleDesktop: { fontSize: 38, lineHeight: 43 },
  subtitle: { fontSize: 14, lineHeight: 21, marginTop: 8, maxWidth: 580 },
  subtitleMobile: { fontSize: 13, lineHeight: 19 },
  searchArea: { minWidth: 0, gap: 12 },
  searchAreaDesktop: { flex: 0.85 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  searchField: { flex: 1, minWidth: 0, marginBottom: 0 },
  mobileSearchInput: { minWidth: 0, fontSize: 16 },
  mobileSearchButton: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  searchTools: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  searchHint: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 7 },
  hintText: { flexShrink: 1 },
  desktopSort: { width: 280, flexDirection: 'row', alignItems: 'center', gap: 8 },
  hint: { fontSize: 12, lineHeight: 18 },
  bodyWrap: { paddingHorizontal: 20, paddingTop: 20 },
  bodyWrapMobile: { paddingTop: 8 },
  body: { width: '100%', maxWidth: 1680, alignSelf: 'center', gap: 24 },
  bodyDesktop: { flexDirection: 'row', alignItems: 'flex-start' },
  sidebar: { width: 260, flexShrink: 0, zIndex: 20 },
  filtersPanel: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 17 },
  sheetFields: { borderWidth: 0, borderRadius: 0, padding: 20, gap: 20 },
  filtersHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, paddingBottom: 10 },
  filtersTitle: { fontSize: 24, lineHeight: 30 },
  filterField: { gap: 7 },
  additionalFilters: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  results: { flex: 1, minWidth: 0, width: '100%', zIndex: 1 },
  resultsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 12, marginBottom: 14, zIndex: 30 },
  resultsHeaderMobile: { flexDirection: 'column', alignItems: 'stretch', gap: 10 },
  updateStatus: { flex: 1, minWidth: 0 },
  toolbarActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sort: { flex: 1, minWidth: 170, maxWidth: 220 },
  sortMobile: { minWidth: 0, maxWidth: '100%' },
  filtersToggle: { flexDirection: 'row', gap: 7, alignItems: 'center', minHeight: 44, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12 },
  activeFilters: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 16 },
  sidebarActiveFilters: { marginBottom: 0 },
  activeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, minHeight: 44, borderRadius: 8, maxWidth: '100%' },
  activeChipText: { fontSize: 12, flexShrink: 1 },
  clearButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
  gridContainer: { width: '100%' },
  grid: { gap: 20 },
  // Let flex distribute the real width; onLayout can round fractional web widths up.
  gridRow: { flexDirection: 'row', gap: 20, alignItems: 'stretch' },
  gridCell: { flex: 1, minWidth: 0 },
  loadingState: { minHeight: 320, alignItems: 'center', justifyContent: 'center' },
  notice: { minHeight: 320, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  noticeTitle: { fontSize: 20, lineHeight: 27, textAlign: 'center' },
  noticeText: { fontSize: 14, lineHeight: 22, textAlign: 'center', maxWidth: 460 },
  errorBanner: { borderWidth: 1, borderRadius: 12, padding: 16, gap: 12, marginBottom: 16 },
  errorText: { fontSize: 14, lineHeight: 21 },
  inlineError: { fontSize: 14, marginBottom: 16 },
});

export default PublicSpecialistsScreen;
