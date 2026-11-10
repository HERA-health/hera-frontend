import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import type { RootStackParamList } from '../../constants/types';
import { PROFESSIONAL_TYPE_OPTIONS } from '../../constants/professionalTypes';
import { PROFESSIONAL_SPECIALTY_OPTIONS, PROFESSIONAL_THERAPEUTIC_APPROACH_OPTIONS } from '../../constants/professionalMatchingOptions';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { SimpleDropdown } from '../../components/common/SimpleDropdown';
import { SearchableProfileSelect } from '../../components/common/SearchableProfileSelect';
import { renderLanguageIcon } from '../../components/common/LanguageIcon';
import { DirectorySpecialistCard, type DirectoryFavoriteState } from '../../components/features/DirectorySpecialistCard';
import { DirectoryFiltersSheet } from './components/DirectoryFiltersSheet';
import { useProfileOptions } from '../../hooks/useProfileOptions';
import { optionLabel } from '../../utils/profileOptions';
import { getMyClientProfile } from '../../services/clientService';
import { trackScreen } from '../../services/analyticsService';
import type { SpecialistData, SpecialistFilters, PublicSpecialistModality } from '../../services/specialistsService';
import { patientDirectoryCards, searchAndSortPatientCards, type PatientDirectoryCard, type PatientDirectorySort } from './patientDirectoryModel';
import { usePatientSpecialists } from './usePatientSpecialists';
import { SpecialistProfileContent } from './SpecialistDetailScreen';
import { navigatePatientSpecialists } from '../../navigation/patientSpecialistsNavigation';

const MODALITIES: { label: string; value: PublicSpecialistModality }[] = [
  { label: 'Terapia online', value: 'ONLINE' }, { label: 'Llamada', value: 'PHONE_CALL' }, { label: 'Terapia presencial', value: 'IN_PERSON' },
];
const PRICES = [50, 60, 80].map(value => ({ value, label: `Hasta ${value} €` }));
const RATINGS = [{ value: 4.5, label: '4,5 o más' }, { value: 4, label: '4 o más' }];
const DISTANCES = [5, 10, 15, 25, 50].map(value => ({ value, label: `Hasta ${value} km` }));
const PROFESSIONS = PROFESSIONAL_TYPE_OPTIONS.map(option => ({ value: option.id, label: option.label }));
const SPECIALTIES = PROFESSIONAL_SPECIALTY_OPTIONS.map(option => ({ ...option, aliases: [...option.aliases] }));
const APPROACHES = PROFESSIONAL_THERAPEUTIC_APPROACH_OPTIONS.map(option => ({ ...option, aliases: [...option.aliases] }));
const EMPTY_SPECIALISTS: SpecialistData[] = [];
const EMPTY_IDS: string[] = [];

function PatientSpecialistsScreen({ isClient }: { isClient: boolean }) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'Specialists'>>();
  const { theme } = useTheme();
  const { options, error: optionsError, retry: retryOptions } = useProfileOptions();
  const [width, setWidth] = useState(0);
  const [gridWidth, setGridWidth] = useState(0);
  const desktop = width >= 1180;
  const mobile = width < 720;
  const columns = gridWidth >= 740 ? 2 : 1;
  const cardWidth = (gridWidth - (columns - 1) * 20) / columns;
  const [tab, setTab] = useState<'all' | 'favorites'>('all');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<SpecialistFilters>({});
  const [queryInput, setQueryInput] = useState('');
  const [query, setQuery] = useState('');
  const [searchError, setSearchError] = useState<string>();
  const [sort, setSort] = useState<PatientDirectorySort>('recommended');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationState, setLocationState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [locationAttempt, setLocationAttempt] = useState(0);
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const data = usePatientSpecialists(filters, isClient);
  const text = { color: theme.textSecondary, fontFamily: theme.fontSans };
  const label = { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold };
  const surface = { backgroundColor: theme.bgCard, borderColor: theme.borderLight };

  useEffect(() => { trackScreen('specialists_list'); }, []);
  useFocusEffect(useCallback(() => {
    if (!isClient) return;
    let active = true;
    setLocationState('loading');
    getMyClientProfile().then(profile => {
      if (!active) return;
      const nextLocation = profile.homeLat != null && profile.homeLng != null ? { lat: profile.homeLat, lng: profile.homeLng } : null;
      setLocation(nextLocation);
      setFilters(current => {
        if (!current.near || (nextLocation && current.lat === nextLocation.lat && current.lng === nextLocation.lng)) return current;
        return nextLocation ? { ...current, ...nextLocation } : { ...current, near: undefined, lat: undefined, lng: undefined, maxDistance: undefined };
      });
      if (!nextLocation) setSort(current => current === 'distance' ? 'recommended' : current);
      setLocationState('ready');
    }).catch(() => { if (active) setLocationState('error'); });
    return () => { active = false; };
  }, [isClient, locationAttempt]));
  useEffect(() => { if (desktop) setFiltersOpen(false); }, [desktop]);
  useEffect(() => {
    if (options && !options.religionEnabled && filters.religion) setFilters(current => ({ ...current, religion: undefined }));
  }, [options, filters.religion]);

  const update = <K extends keyof SpecialistFilters>(key: K, value: SpecialistFilters[K]) =>
    setFilters(current => ({ ...current, [key]: value }));
  const clear = () => {
    setFilters({}); setQuery(''); setQueryInput(''); setSearchError(undefined);
    if (sort === 'distance') setSort('recommended');
  };
  const setProximity = (distance?: number) => {
    if (distance !== undefined && location) {
      setFilters(current => ({ ...current, near: true, ...location, maxDistance: distance, modality: 'IN_PERSON' }));
      setSort('distance');
    } else {
      setFilters(current => ({ ...current, near: undefined, lat: undefined, lng: undefined, maxDistance: undefined }));
      if (sort === 'distance') setSort('recommended');
    }
  };
  const setModality = (modality?: PublicSpecialistModality) => {
    setFilters(current => ({ ...current, modality,
      ...(modality !== 'IN_PERSON' ? { near: undefined, lat: undefined, lng: undefined, maxDistance: undefined } : {}) }));
    if (modality !== 'IN_PERSON' && sort === 'distance') setSort('recommended');
  };
  const submitSearch = () => {
    const value = queryInput.trim();
    if (value.length === 1 || value.length > 80) { setSearchError('Escribe entre 2 y 80 caracteres para buscar.'); return; }
    setSearchError(undefined); setQuery(value);
  };
  const activeFilters: { key: string; label: string; remove: () => void }[] = [];
  if (query) activeFilters.push({ key: 'q', label: `«${query}»`, remove: () => { setQuery(''); setQueryInput(''); setSearchError(undefined); } });
  for (const value of filters.specialties ?? []) activeFilters.push({ key: `s-${value}`, label: optionLabel(SPECIALTIES, value), remove: () => update('specialties', filters.specialties?.filter(item => item !== value)) });
  for (const value of filters.approaches ?? []) activeFilters.push({ key: `a-${value}`, label: optionLabel(APPROACHES, value), remove: () => update('approaches', filters.approaches?.filter(item => item !== value)) });
  if (filters.language) activeFilters.push({ key: 'language', label: optionLabel(options?.languages ?? [], filters.language), remove: () => update('language', undefined) });
  if (filters.religion) activeFilters.push({ key: 'religion', label: optionLabel(options?.religions ?? [], filters.religion), remove: () => update('religion', undefined) });
  if (filters.professionalType) activeFilters.push({ key: 'type', label: PROFESSIONS.find(item => item.value === filters.professionalType)?.label ?? '', remove: () => update('professionalType', undefined) });
  if (filters.modality) activeFilters.push({ key: 'modality', label: MODALITIES.find(item => item.value === filters.modality)?.label ?? '', remove: () => setModality(undefined) });
  if (filters.maxPrice !== undefined) activeFilters.push({ key: 'price', label: `Hasta ${filters.maxPrice} €`, remove: () => update('maxPrice', undefined) });
  if (filters.minRating) activeFilters.push({ key: 'rating', label: `${String(filters.minRating).replace('.', ',')} estrellas o más`, remove: () => update('minRating', undefined) });
  if (filters.near) activeFilters.push({ key: 'near', label: `Hasta ${filters.maxDistance} km`, remove: () => setProximity() });
  const hasServerFilters = Boolean(filters.specialties?.length || filters.approaches?.length || filters.language || filters.religion
    || filters.professionalType || filters.modality || filters.maxPrice !== undefined || filters.minRating || filters.near);
  const favorites = data.personalization?.favoriteSpecialists ?? EMPTY_SPECIALISTS;
  const favoriteIds = data.personalization?.favoriteSpecialistIds ?? EMPTY_IDS;
  const matched = data.matches?.specialists ?? EMPTY_SPECIALISTS;
  const effectiveSort = sort === 'recommended' && !matched.length ? 'name' : sort;
  // Personalization can contain a legacy price; the current directory owns offer details.
  const source = useMemo(() => tab === 'favorites' && !hasServerFilters
    ? favorites.map(item => data.available.find(current => current.id === item.id) ?? item)
    : data.available, [tab, hasServerFilters, favorites, data.available]);
  const cards = useMemo(() => searchAndSortPatientCards(
    patientDirectoryCards(source, matched, filters).filter(card => tab !== 'favorites' || favoriteIds.includes(card.id)), query, effectiveSort, favoriteIds,
  ), [source, matched, filters, tab, favoriteIds, query, effectiveSort]);
  const sortOptions: { label: string; value: PatientDirectorySort }[] = [
    ...(isClient ? [{ label: 'Favoritos primero', value: 'favorites' as const }] : []),
    ...(matched.length ? [{ label: 'Recomendaciones', value: 'recommended' as const }] : []),
    { label: 'Nombre: A–Z', value: 'name' }, { label: 'Mejor valorados', value: 'rating' },
    { label: 'Precio: menor primero', value: 'price_low' }, { label: 'Precio: mayor primero', value: 'price_high' },
    ...(filters.near ? [{ label: 'Más cercanos', value: 'distance' as const }] : []),
  ];
  const openProfile = (card: PatientDirectoryCard) => navigation.navigate('SpecialistDetail', { specialistId: card.id, optionId: card.matchedOptionId ?? undefined });
  const original = (id: string): SpecialistData | undefined => source.find(item => item.id === id) ?? favorites.find(item => item.id === id)
    ?? (data.personalization?.primarySpecialist?.specialist.id === id ? data.personalization.primarySpecialist.specialist : undefined);
  const favoriteState = (id: string): DirectoryFavoriteState => ({ selected: favoriteIds.includes(id), busy: data.pendingIds.has(id),
    disabled: data.personalLoading || data.personalError || !data.personalization,
    onPress: () => { const item = original(id); if (item) void data.toggleFavorite(item); } });
  const renderCard = (card: PatientDirectoryCard) => <DirectorySpecialistCard key={card.id} specialist={card}
    compactDirectory={cardWidth >= 460} mobileDirectory={mobile} profileOptions={options}
    onPress={() => openProfile(card)} style={styles.card} priceIsSelection={Boolean(card.matchedOptionId)} priceUnavailable={!card.publicOptions?.length} distanceKm={filters.near ? card.distance : undefined}
    favorite={isClient ? favoriteState(card.id) : undefined} />;

  const filterPanel = <View style={[styles.filters, desktop && styles.filterSurface, desktop && surface]}>
    {desktop ? <Text accessibilityRole="header" style={[styles.filterTitle, label, { fontFamily: theme.fontDisplay }]}>Filtros</Text> : null}
    <SearchableProfileSelect label="¿En qué necesitas apoyo?" options={SPECIALTIES} values={filters.specialties ?? []}
      onChange={values => update('specialties', values)} multiple max={22} emptyLabel="Todas las especialidades" />
    <View style={styles.field}><Text style={label}>Modalidad de consulta</Text>
      <SimpleDropdown options={MODALITIES} value={filters.modality ?? null} onSelect={setModality} onClear={() => setModality(undefined)}
        placeholder="Cualquier modalidad" accessibilityLabel="Modalidad" compact presentation="portal" portalAnimation="none" focusOptionOnShow keyboardNavigation />
    </View>
    <SearchableProfileSelect label="Idioma de las sesiones" options={options?.languages ?? []} values={filters.language ? [filters.language] : []}
      disabled={!options} renderIcon={renderLanguageIcon} onChange={values => update('language', values[0])} emptyLabel="Cualquiera" />
    <View style={styles.field}><Text style={label}>Precio por sesión</Text>
      <SimpleDropdown options={PRICES} value={filters.maxPrice ?? null} onSelect={value => update('maxPrice', value)} onClear={() => update('maxPrice', undefined)}
        placeholder="Cualquier precio" accessibilityLabel="Precio" compact presentation="portal" portalAnimation="none" focusOptionOnShow keyboardNavigation />
    </View>
    <SearchableProfileSelect label="Enfoque terapéutico" options={APPROACHES} values={filters.approaches ?? []}
      onChange={values => update('approaches', values)} multiple max={12} emptyLabel="Cualquier enfoque" />
    <View style={styles.field}><Text style={label}>Tipo de profesional</Text>
      <SimpleDropdown options={PROFESSIONS} value={filters.professionalType ?? null} onSelect={value => update('professionalType', value)} onClear={() => update('professionalType', undefined)}
        placeholder="Todos los tipos" accessibilityLabel="Tipo de profesional" compact presentation="portal" portalAnimation="none" focusOptionOnShow keyboardNavigation />
    </View>
    <View style={styles.field}><Text style={label}>Valoraciones</Text>
      <SimpleDropdown options={RATINGS} value={filters.minRating ?? null} onSelect={value => update('minRating', value)} onClear={() => update('minRating', undefined)}
        placeholder="Cualquier valoración" accessibilityLabel="Valoración" compact presentation="portal" portalAnimation="none" focusOptionOnShow keyboardNavigation />
    </View>
    {isClient ? <View style={styles.field}><Text style={label}>Cerca de mí</Text>
      {location ? <SimpleDropdown options={DISTANCES} value={filters.near ? filters.maxDistance ?? 10 : null} onSelect={setProximity} onClear={() => setProximity()}
        placeholder="Sin límite de distancia" accessibilityLabel="Distancia" compact presentation="portal" portalAnimation="none" focusOptionOnShow keyboardNavigation />
        : locationState === 'loading' ? <Text style={text}>Consultando tu ubicación…</Text>
          : <Button variant="outline" onPress={() => locationState === 'error' ? setLocationAttempt(value => value + 1) : navigation.navigate('Profile')}>
            {locationState === 'error' ? 'Reintentar ubicación' : 'Añadir ubicación al perfil'}</Button>}
      <Text style={[text, styles.small]}>La distancia se aplica a consultas presenciales.</Text>
    </View> : null}
    {options?.religionEnabled ? <>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: moreFiltersOpen }} onPress={() => setMoreFiltersOpen(value => !value)} style={styles.textButton}>
        <Text style={[label, { color: theme.primary }]}>Más filtros{filters.religion ? ' · 1' : ''}</Text>
        <Ionicons name={moreFiltersOpen ? 'chevron-up' : 'chevron-down'} size={16} color={theme.primary} />
      </Pressable>
      {moreFiltersOpen ? <SearchableProfileSelect label="Perspectiva espiritual o religiosa" options={options.religions} values={filters.religion ? [filters.religion] : []}
        onChange={values => update('religion', values[0])} emptyLabel="Cualquiera" /> : null}
    </> : null}
    {optionsError ? <Button variant="outline" onPress={retryOptions}>Reintentar opciones de filtros</Button> : null}
  </View>;

  const needsDirectory = tab === 'all' || hasServerFilters;
  const resultsLoading = (needsDirectory && data.loading) || (tab === 'favorites' && data.personalLoading && !data.personalization);
  const resultsError = (needsDirectory && data.error) || (tab === 'favorites' && data.personalError);
  const primary = data.personalization?.primarySpecialist;
  const sortControl = <View style={styles.sort}><SimpleDropdown options={sortOptions} value={effectiveSort} onSelect={setSort} accessibilityLabel="Ordenar especialistas"
            compact presentation="portal" portalAnimation="none" focusOptionOnShow keyboardNavigation selectionIndicator="none" highlightSelection={false} optionsAlign="right" optionsMinWidth={280} maxHeight={400} /></View>;
  return <View testID="patient-directory" style={[styles.screen, { backgroundColor: theme.bgMuted }]} onLayout={event => setWidth(event.nativeEvent.layout.width)}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, mobile && styles.mobileContent]}>
      <View style={styles.header}>
        <View style={styles.heading}><Text accessibilityRole="header" style={[styles.title, label, mobile && styles.mobileTitle]}>Encuentra tu especialista</Text>
          <Text style={[text, styles.subtitle]}>Compara perfiles verificados y encuentra el apoyo que necesitas.</Text></View>
        {isClient ? <View style={styles.headerActions}><Button variant="primary" icon={<Ionicons aria-hidden name="sparkles-outline" size={20} color={theme.actionPrimaryText} />} disabled={!data.matches || data.matchesError} onPress={() => data.matches?.hasCompletedQuestionnaire
          ? navigation.navigate('QuestionnaireResults', { adviceId: undefined }) : navigation.navigate('Questionnaire')}>
          Ver recomendaciones</Button>
          {primary && !data.personalError ? <Button variant="outline" icon={<Ionicons aria-hidden name="person-outline" size={20} color={theme.primary} />}
            onPress={() => navigatePatientSpecialists(navigation, 'Specialists')}>
            Mi especialista
          </Button> : null}
        </View> : null}
      </View>
      {data.matchesError ? <View style={styles.notice}><Text style={text}>No se pudieron cargar tus recomendaciones.</Text>
        <Button variant="outline" onPress={data.retryMatches}>Reintentar recomendaciones</Button></View> : null}
      <View style={[styles.searchControls, desktop && styles.searchControlsDesktop]}>
        <View style={[styles.searchRow, desktop && styles.searchHalf]}>
          <Input value={queryInput} onChangeText={setQueryInput} placeholder={mobile ? 'Nombre o especialidad' : 'Nombre, profesión o especialidad'} accessibilityLabel="Buscar especialistas"
            onSubmitEditing={submitSearch} returnKeyType="search" error={searchError} containerStyle={styles.searchInput}
            leftIcon={<Ionicons name="search-outline" size={22} color={theme.primary} />} />
          <Button variant="primary" onPress={submitSearch}>Buscar</Button>
        </View>
        {desktop ? sortControl : null}
      </View>
      <View style={styles.toolbar}>
        <View style={styles.tabs}>
          {(['all', ...(isClient ? ['favorites'] as const : [])] as const).map(value => <Pressable key={value} accessibilityRole="tab"
            accessibilityLabel={value === 'all' ? 'Todos' : 'Favoritos'} accessibilityState={{ selected: tab === value }} onPress={() => setTab(value)}
            style={[styles.tab, { borderBottomColor: tab === value ? theme.primary : 'transparent' }]}>
            <Text style={[label, { color: tab === value ? theme.primary : theme.textSecondary }]}>
              {value === 'all' ? 'Todos' : `Favoritos${data.personalization && !data.personalError ? ` · ${favoriteIds.length}` : ''}`}</Text>
          </Pressable>)}
        </View>
        <View style={styles.toolbarActions}>
          {!desktop ? <Button variant="outline" accessibilityLabel={activeFilters.length ? `Filtros: ${activeFilters.length} activos` : 'Abrir filtros'} onPress={() => setFiltersOpen(true)}>
            {`Filtros${activeFilters.length ? ` · ${activeFilters.length}` : ''}`}</Button> : null}
          {!desktop ? sortControl : null}
        </View>
      </View>
      {activeFilters.length ? <View style={styles.chips}>
        {activeFilters.map(filter => <Pressable key={filter.key} accessibilityRole="button" accessibilityLabel={`Quitar filtro: ${filter.label}`}
          onPress={filter.remove} style={[styles.chip, { backgroundColor: theme.secondaryMuted }]}>
          <Text style={[text, styles.small]}>{filter.label}</Text><Ionicons name="close" size={14} color={theme.textPrimary} />
        </Pressable>)}
        <Pressable accessibilityRole="button" accessibilityLabel="Limpiar filtros" onPress={clear} style={styles.textButton}>
          <Text style={[label, { color: theme.primary }]}>Limpiar filtros</Text>
        </Pressable>
      </View> : null}
      {data.personalError && tab === 'all' ? <View style={styles.notice}><Text style={text}>No se pudieron cargar tus datos personales. Puedes seguir explorando el directorio.</Text>
        <Button variant="outline" onPress={data.retryPersonalization}>Reintentar favoritos</Button></View> : null}
      {data.favoriteError ? <Text accessibilityRole="alert" style={[text, { color: theme.error }]}>{data.favoriteError}</Text> : null}
      <View style={[styles.layout, desktop && styles.desktopLayout]}>
        {desktop ? <View style={styles.sidebar}>{filterPanel}</View> : null}
        <View style={styles.results}>
          {resultsLoading ? <View accessibilityLabel="Cargando especialistas" style={styles.state}><ActivityIndicator color={theme.primary} /><Text style={text}>Cargando especialistas…</Text></View>
            : resultsError ? <View style={styles.state}><Text accessibilityRole="alert" style={label}>{tab === 'favorites' && data.personalError ? 'No se pudieron cargar tus favoritos' : 'No se pudo cargar el listado'}</Text>
              <Button variant="outline" onPress={tab === 'favorites' && data.personalError ? data.retryPersonalization : data.retry}>Reintentar</Button></View>
              : cards.length === 0 ? <View style={styles.state}><Ionicons name={tab === 'favorites' ? 'heart-outline' : 'search-outline'} size={32} color={theme.primary} />
                <Text style={[label, styles.emptyTitle]}>{tab === 'favorites' && !favoriteIds.length ? 'Todavía no tienes favoritos' : 'No encontramos especialistas'}</Text>
                <Text style={[text, styles.emptyCopy]}>{tab === 'favorites' && !favoriteIds.length ? 'Guarda los perfiles que te interesen pulsando el corazón. Solo tú puedes verlos.' : 'Prueba con otra búsqueda o ajusta los filtros para ampliar resultados.'}</Text>
                {tab === 'favorites' && !favoriteIds.length ? <Button variant="outline" onPress={() => setTab('all')}>Explorar especialistas</Button> : activeFilters.length ? <Button variant="outline" onPress={clear}>Limpiar filtros</Button> : null}
              </View> : null}
          <View testID="patient-directory-grid" onLayout={event => setGridWidth(event.nativeEvent.layout.width)} style={styles.grid}>
            {!resultsLoading && !resultsError ? Array.from({ length: Math.ceil(cards.length / columns) }, (_, index) => <View key={index} style={styles.row}>
              {cards.slice(index * columns, (index + 1) * columns).map(card => <View key={card.id} style={styles.cell}>{renderCard(card)}</View>)}
              {columns === 2 && index * columns + 1 === cards.length ? <View style={styles.cell} /> : null}
            </View>) : null}
          </View>
        </View>
      </View>
    </ScrollView>
    {!desktop ? <DirectoryFiltersSheet visible={filtersOpen} onClose={() => setFiltersOpen(false)} onClear={clear} hasFilters={activeFilters.length > 0}>{filterPanel}</DirectoryFiltersSheet> : null}
  </View>;
}

export function SpecialistsDirectoryScreen() {
  const { user } = useAuth();
  return <PatientSpecialistsScreen key={`${user?.type ?? 'guest'}:${user?.id ?? ''}`} isClient={user?.type === 'client'} />;
}

const ENTRY_FILTERS: SpecialistFilters = {};

function PatientSpecialistEntry() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { theme } = useTheme();
  const data = usePatientSpecialists(ENTRY_FILTERS, true, false);
  const primary = data.personalization?.primarySpecialist;
  useEffect(() => {
    if (data.personalization && !data.personalLoading && !data.personalError && !primary) {
      // Preserve an existing list (including its filters and scroll), or replace
      // this resolver on first entry. The directory itself never redirects.
      navigation.popTo('SpecialistsDirectory', undefined, { merge: true });
    }
  }, [data.personalization, data.personalLoading, data.personalError, primary, navigation]);

  if (data.personalError) return <View style={[styles.entryState, { backgroundColor: theme.bgMuted }]}>
    <Text accessibilityRole="alert" style={{ color: theme.textPrimary, fontFamily: theme.fontSansSemiBold }}>
      No hemos podido cargar tu especialista.
    </Text>
    <Button onPress={data.retryPersonalization}>Reintentar</Button>
    <Button variant="outline" onPress={() => navigatePatientSpecialists(navigation, 'SpecialistsDirectory')}>Ver todos los especialistas</Button>
  </View>;
  if (primary) return <SpecialistProfileContent key={primary.specialist.id}
    route={{ params: { specialistId: primary.specialist.id } }} navigation={navigation} continuity />;
  return <View accessibilityLabel="Cargando tu especialista" style={[styles.entryState, { backgroundColor: theme.bgMuted }]}>
    <ActivityIndicator color={theme.primary} />
    <Text style={{ color: theme.textSecondary, fontFamily: theme.fontSans }}>Cargando tu espacio…</Text>
  </View>;
}

export default function SpecialistsScreen() {
  const { user } = useAuth();
  return user?.type === 'client'
    ? <PatientSpecialistEntry key={user.id} />
    : <SpecialistsDirectoryScreen />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, minHeight: 0 },
  content: { padding: 24, paddingBottom: 48, gap: 20, width: '100%', maxWidth: 1800, alignSelf: 'center' },
  mobileContent: { padding: 16, gap: 16 },
  header: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  heading: { flex: 1, minWidth: 200, gap: 6 },
  title: { fontSize: 30, lineHeight: 38 }, mobileTitle: { fontSize: 25, lineHeight: 32 }, subtitle: { fontSize: 15, lineHeight: 23 },
  searchControls: { gap: 12 }, searchControlsDesktop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  searchHalf: { width: '50%' },
  searchRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 }, searchInput: { flex: 1, minWidth: 0, marginBottom: 0 },
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  tabs: { flexDirection: 'row', gap: 24 }, tab: { minHeight: 48, justifyContent: 'center', borderBottomWidth: 2 },
  toolbarActions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 }, sort: { minWidth: 240, flexShrink: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  chip: { minHeight: 36, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 6 },
  textButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  small: { fontSize: 12, lineHeight: 18 }, layout: { gap: 24 }, desktopLayout: { flexDirection: 'row', alignItems: 'flex-start' },
  sidebar: { width: 260 }, filters: { padding: 20, gap: 22 }, filterSurface: { borderWidth: 1, borderRadius: 18 },
  filterTitle: { fontSize: 28, lineHeight: 34 }, field: { gap: 10 },
  results: { flex: 1, minWidth: 0, gap: 16 },
  grid: { gap: 20, width: '100%' }, row: { flexDirection: 'row', gap: 20 }, cell: { flex: 1, minWidth: 0 }, card: { flex: 1 },
  headerActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center' },
  entryState: { flex: 1, padding: 32, gap: 20, alignItems: 'center', justifyContent: 'center' },
  notice: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 },
  state: { padding: 32, gap: 16, alignItems: 'center' }, emptyTitle: { fontSize: 20, textAlign: 'center' }, emptyCopy: { maxWidth: 420, textAlign: 'center', lineHeight: 23 },
});
