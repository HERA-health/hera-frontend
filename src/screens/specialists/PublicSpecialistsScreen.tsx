import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { SimpleDropdown } from '../../components/common/SimpleDropdown';
import { MultiSelectDropdown } from '../../components/common/MultiSelectDropdown';
import { PublicSpecialistCard } from '../../components/features/PublicSpecialistCard';
import type { RootStackParamList } from '../../constants/types';
import {
  PROFESSIONAL_TYPE_OPTIONS,
  type ProfessionalType,
} from '../../constants/professionalTypes';
import {
  PROFESSIONAL_SPECIALTY_OPTIONS,
  PROFESSIONAL_THERAPEUTIC_APPROACH_OPTIONS,
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

export const PublicSpecialistsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { isAuthenticated } = useAuth();
  const { theme, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1180;
  const isMobile = width < 720;
  const useHorizontalCards = width >= 820;
  const [queryInput, setQueryInput] = useState('');
  const [filters, setFilters] = useState<DirectoryFilters>(INITIAL_FILTERS);
  const [items, setItems] = useState<specialistsService.PublicSpecialistDirectoryCard[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [headerScrolled, setHeaderScrolled] = useState(false);
  const headerScrolledRef = useRef(false);
  const mountedRef = useRef(true);
  const requestSequenceRef = useRef(0);
  const activeLoadMoreRequestRef = useRef<number | null>(null);

  useWebPageMetadata({
    title: 'Hera | Especialistas',
    description: 'Explora especialistas de salud mental verificados, compara sus modalidades y consulta sus perfiles públicos antes de reservar.',
    canonicalPath: '/especialistas',
  });

  const loadDirectory = useCallback(async (nextPage: number, append: boolean) => {
    if (append && activeLoadMoreRequestRef.current !== null) {
      return;
    }

    const requestId = requestSequenceRef.current + 1;
    requestSequenceRef.current = requestId;

    if (append) {
      activeLoadMoreRequestRef.current = requestId;
      setLoadingMore(true);
    } else {
      activeLoadMoreRequestRef.current = null;
      setLoading(true);
      setLoadingMore(false);
    }
    setError(null);

    try {
      const response = await specialistsService.getPublicSpecialistDirectory({
        q: filters.q || undefined,
        professionalType: filters.professionalType ?? undefined,
        modality: filters.modality ?? undefined,
        specialties: filters.specialties.length > 0 ? filters.specialties : undefined,
        approaches: filters.approaches.length > 0 ? filters.approaches : undefined,
        minRating: filters.minRating ?? undefined,
        maxPrice: filters.maxPrice ?? undefined,
        sort: filters.sort,
        page: nextPage,
      });

      if (!mountedRef.current || requestSequenceRef.current !== requestId) {
        return;
      }

      setItems((currentItems) => append ? [...currentItems, ...response.items] : response.items);
      setPage(response.page);
      setHasMore(response.hasMore);
    } catch (loadError: unknown) {
      if (!mountedRef.current || requestSequenceRef.current !== requestId) {
        return;
      }
      setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar el directorio');
    } finally {
      if (activeLoadMoreRequestRef.current === requestId) {
        activeLoadMoreRequestRef.current = null;
      }

      if (mountedRef.current && requestSequenceRef.current === requestId) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [filters]);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      requestSequenceRef.current += 1;
      activeLoadMoreRequestRef.current = null;
    };
  }, []);

  useEffect(() => {
    void loadDirectory(1, false);
  }, [loadDirectory]);

  useEffect(() => {
    analyticsService.trackScreen('public_specialists_directory');
  }, []);

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

  const submitSearch = useCallback(() => {
    const nextQuery = queryInput.trim();
    setFilters((currentFilters) => ({
      ...currentFilters,
      q: nextQuery.length >= 2 ? nextQuery : '',
    }));
  }, [queryInput]);

  const clearFilters = useCallback(() => {
    setQueryInput('');
    setFilters(INITIAL_FILTERS);
  }, []);

  const selectedProfessionalType = useMemo(
    () => PROFESSIONAL_TYPE_OPTIONS.map((option) => ({ label: option.label, value: option.id })),
    []
  );

  const hasActiveFilters = Boolean(
    filters.q
    || filters.professionalType
    || filters.modality
    || filters.specialties.length > 0
    || filters.approaches.length > 0
    || filters.minRating
    || filters.maxPrice
    || filters.sort !== 'RECENT'
    || queryInput
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.bg} />
      <LandingHeader
        isScrolled={headerScrolled}
        showAccessActions={!isAuthenticated}
        onLogoPress={isAuthenticated ? undefined : navigateToLandingHome}
        onFindSpecialist={() => navigation.navigate('Login', { userType: 'CLIENT' })}
        onJoinAsProfessional={() => navigation.navigate('Login', { userType: 'PROFESSIONAL' })}
        onJoinAsClinic={() => navigation.navigate('Login', { userType: 'CLINIC' })}
        onScrollToSection={navigateToLandingSection}
      />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, isDesktop && styles.scrollContentDesktop]}
        showsVerticalScrollIndicator
        onScroll={handleScroll}
        scrollEventThrottle={24}
      >
        <View style={[styles.hero, isDesktop && styles.heroDesktop]}>
          <View style={[styles.heroEyebrow, { backgroundColor: theme.primaryAlpha12, borderColor: theme.primaryAlpha20 }]}>
            <Ionicons name="compass-outline" size={14} color={theme.primary} />
            <Text style={[styles.heroEyebrowText, { color: theme.primary, fontFamily: theme.fontSansSemiBold }]}>DIRECTORIO PÚBLICO</Text>
          </View>
          <Text style={[styles.title, isDesktop && styles.titleDesktop, { color: theme.textPrimary, fontFamily: theme.fontDisplay }]}>Encuentra un especialista a tu ritmo</Text>
          <Text style={[styles.subtitle, isDesktop && styles.subtitleDesktop, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>Explora perfiles verificados, compara modalidades y conoce cómo trabaja cada profesional antes de reservar.</Text>
        </View>

        <View style={[styles.filtersPanel, { backgroundColor: theme.bgCard, borderColor: theme.border, shadowColor: theme.shadowCard }]}>
          <View style={[styles.searchRow, isMobile && styles.searchRowMobile]}>
            <View style={[styles.searchField, isMobile && styles.searchFieldMobile]}>
              <Input
                value={queryInput}
                onChangeText={setQueryInput}
                onSubmitEditing={submitSearch}
                placeholder="Nombre, profesión o especialidad"
                returnKeyType="search"
                leftIcon={<Ionicons name="search-outline" size={19} color={theme.textMuted} />}
                containerStyle={styles.inputContainer}
              />
            </View>
            <Button variant="primary" size="medium" onPress={submitSearch} icon={<Ionicons name="search" size={16} color={theme.actionPrimaryText} />}>
              Buscar
            </Button>
          </View>

          <View style={styles.filtersRow}>
            <View style={styles.secondaryFilter}>
              <MultiSelectDropdown
                options={PROFESSIONAL_SPECIALTY_OPTIONS}
                values={filters.specialties}
                onApply={(specialties) => setFilters((currentFilters) => ({ ...currentFilters, specialties }))}
                placeholder="Tema"
                maxOptionsHeight={280}
                menuWidth={520}
              />
            </View>
            <View style={styles.secondaryFilter}>
              <MultiSelectDropdown
                options={PROFESSIONAL_THERAPEUTIC_APPROACH_OPTIONS}
                values={filters.approaches}
                onApply={(approaches) => setFilters((currentFilters) => ({ ...currentFilters, approaches }))}
                placeholder="Enfoque"
                maxOptionsHeight={260}
                menuWidth={580}
                optionsAlign={isMobile ? 'right' : 'left'}
              />
            </View>
            <View style={styles.secondaryFilter}>
              <SimpleDropdown
                options={selectedProfessionalType}
                value={filters.professionalType}
                onSelect={(professionalType) => setFilters((currentFilters) => ({ ...currentFilters, professionalType }))}
                placeholder="Perfil"
                optionsMinWidth={260}
                compact
                selectionIndicator="checkbox"
                onClear={() => setFilters((currentFilters) => ({ ...currentFilters, professionalType: null }))}
              />
            </View>
            <View style={styles.secondaryFilter}>
              <SimpleDropdown
                options={MODALITY_OPTIONS}
                value={filters.modality}
                onSelect={(modality) => setFilters((currentFilters) => ({ ...currentFilters, modality }))}
                placeholder="Modalidad"
                optionsMinWidth={210}
                compact
                selectionIndicator="checkbox"
                onClear={() => setFilters((currentFilters) => ({ ...currentFilters, modality: null }))}
              />
            </View>
            <View style={styles.secondaryFilter}>
              <SimpleDropdown
                options={RATING_OPTIONS}
                value={filters.minRating}
                onSelect={(minRating) => setFilters((currentFilters) => ({ ...currentFilters, minRating }))}
                placeholder="Valoración"
                optionsMinWidth={180}
                compact
                selectionIndicator="checkbox"
                onClear={() => setFilters((currentFilters) => ({ ...currentFilters, minRating: null }))}
              />
            </View>
            <View style={styles.secondaryFilter}>
              <SimpleDropdown
                options={PRICE_OPTIONS}
                value={filters.maxPrice}
                onSelect={(maxPrice) => setFilters((currentFilters) => ({ ...currentFilters, maxPrice }))}
                placeholder="Precio"
                optionsMinWidth={170}
                compact
                selectionIndicator="checkbox"
                onClear={() => setFilters((currentFilters) => ({ ...currentFilters, maxPrice: null }))}
              />
            </View>
            <View style={[styles.secondaryFilter, styles.sortFilter]}>
              <SimpleDropdown
                options={SORT_OPTIONS}
                value={filters.sort}
                onSelect={(sort) => setFilters((currentFilters) => ({ ...currentFilters, sort }))}
                placeholder="Ordenar"
                maxHeight={260}
                optionsMinWidth={240}
                optionsAlign="right"
                compact
                selectionIndicator="radio"
                highlightSelection={filters.sort !== 'RECENT'}
              />
            </View>
            {hasActiveFilters ? (
              <Button variant="ghost" size="small" onPress={clearFilters}>Limpiar</Button>
            ) : null}
          </View>
        </View>

        <View style={styles.resultsHeader}>
          <Text style={[styles.resultsTitle, { color: theme.textPrimary, fontFamily: theme.fontSansBold }]}>Especialistas disponibles</Text>
        </View>

        {loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.loadingText, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>Cargando perfiles verificados…</Text>
          </View>
        ) : error ? (
          <View style={[styles.notice, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
            <Ionicons name="cloud-offline-outline" size={28} color={theme.textMuted} />
            <Text style={[styles.noticeTitle, { color: theme.textPrimary, fontFamily: theme.fontSansBold }]}>No hemos podido cargar el directorio</Text>
            <Text style={[styles.noticeText, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>{error}</Text>
            <Button variant="outline" size="small" onPress={() => void loadDirectory(1, false)}>Reintentar</Button>
          </View>
        ) : items.length === 0 ? (
          <View style={[styles.notice, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
            <Ionicons name="people-outline" size={28} color={theme.textMuted} />
            <Text style={[styles.noticeTitle, { color: theme.textPrimary, fontFamily: theme.fontSansBold }]}>No hemos encontrado perfiles con estos criterios</Text>
            <Text style={[styles.noticeText, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>Prueba a modificar la búsqueda o a eliminar alguno de los filtros.</Text>
            <Button variant="outline" size="small" onPress={clearFilters}>Limpiar filtros</Button>
          </View>
        ) : (
          <>
            <View style={styles.resultsList}>
              {items.map((specialist) => (
                <PublicSpecialistCard
                  key={specialist.id}
                  specialist={specialist}
                  variant="directory"
                  directoryHorizontal={useHorizontalCards}
                  style={styles.resultCard}
                  href={`/especialista/${encodeURIComponent(specialist.id)}`}
                  onPress={() => navigation.navigate('PublicSpecialistProfile', { specialistId: specialist.id })}
                />
              ))}
            </View>
            {hasMore ? (
              <View style={styles.loadMoreWrap}>
                <Button variant="outline" size="medium" loading={loadingMore} onPress={() => void loadDirectory(page + 1, true)}>
                  Cargar más especialistas
                </Button>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 96,
    paddingBottom: 72,
  },
  scrollContentDesktop: {
    paddingHorizontal: 32,
    paddingTop: 94,
  },
  hero: {
    alignItems: 'center',
    alignSelf: 'center',
    width: '100%',
    maxWidth: 760,
    marginBottom: 18,
  },
  heroDesktop: {
    alignItems: 'flex-start',
    maxWidth: 1020,
  },
  heroEyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
    marginBottom: 8,
  },
  heroEyebrowText: {
    fontSize: 11,
    letterSpacing: 0.2,
  },
  title: {
    fontSize: 32,
    lineHeight: 38,
    textAlign: 'center',
  },
  titleDesktop: {
    fontSize: 36,
    lineHeight: 42,
    textAlign: 'left',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 5,
  },
  subtitleDesktop: {
    maxWidth: 860,
    textAlign: 'left',
  },
  filtersPanel: {
    width: '100%',
    maxWidth: 1020,
    alignSelf: 'center',
    borderWidth: 1,
    borderRadius: 16,
    padding: 10,
    gap: 8,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 2,
    position: 'relative',
    zIndex: 100,
    overflow: 'visible',
  },
  searchField: {
    flex: 1,
    minWidth: 240,
  },
  searchFieldMobile: {
    flexBasis: '100%',
  },
  searchRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchRowMobile: {
    flexWrap: 'wrap',
  },
  inputContainer: {
    marginBottom: 0,
  },
  filtersRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  secondaryFilter: {
    flexGrow: 1,
    flexBasis: 126,
    minWidth: 118,
  },
  sortFilter: {
    flexBasis: 158,
  },
  resultsHeader: {
    width: '100%',
    maxWidth: 1020,
    alignSelf: 'center',
    marginTop: 22,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  resultsTitle: {
    fontSize: 20,
  },
  loadingState: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    minHeight: 300,
  },
  loadingText: {
    fontSize: 15,
  },
  resultsList: {
    width: '100%',
    maxWidth: 1020,
    alignSelf: 'center',
    gap: 14,
  },
  resultCard: {
    width: '100%',
  },
  notice: {
    width: '100%',
    maxWidth: 680,
    minHeight: 240,
    alignSelf: 'center',
    borderWidth: 1,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 28,
  },
  noticeTitle: {
    fontSize: 18,
    textAlign: 'center',
  },
  noticeText: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  loadMoreWrap: {
    alignSelf: 'center',
    marginTop: 32,
  },
});

export default PublicSpecialistsScreen;
