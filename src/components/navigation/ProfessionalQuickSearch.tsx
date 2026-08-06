import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { spacing } from '../../constants/colors';
import type { AppNavigationProp } from '../../constants/types';
import { useTheme } from '../../contexts/ThemeContext';
import {
  professionalSearchService,
  type ProfessionalPatientSearchResult,
} from '../../services/professionalSearchService';
import { AnimatedPressable } from '../common/AnimatedPressable';
import { trackProfessionalWorkspaceEvent } from '../../services/professionalWorkspaceAnalytics';

type QuickNavigationRoute =
  | 'ProfessionalHome'
  | 'ProfessionalSessions'
  | 'ProfessionalClients'
  | 'ProfessionalBilling'
  | 'ProfessionalDashboard'
  | 'ProfessionalAvailability';

interface NavigationResult {
  label: string;
  description: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  route: QuickNavigationRoute;
}

const NAVIGATION_RESULTS: NavigationResult[] = [
  { label: 'Inicio', description: 'Resumen de tu día', icon: 'home-outline', route: 'ProfessionalHome' },
  { label: 'Agenda', description: 'Día, semana, mes y lista', icon: 'calendar-outline', route: 'ProfessionalSessions' },
  { label: 'Pacientes', description: 'Gestión de pacientes', icon: 'people-outline', route: 'ProfessionalClients' },
  { label: 'Facturación', description: 'Facturas y configuración', icon: 'receipt-outline', route: 'ProfessionalBilling' },
  { label: 'Estadísticas', description: 'Actividad e ingresos', icon: 'stats-chart-outline', route: 'ProfessionalDashboard' },
  { label: 'Disponibilidad', description: 'Configura tu horario base', icon: 'time-outline', route: 'ProfessionalAvailability' },
];

interface ProfessionalQuickSearchProps {
  drawer?: boolean;
  onNavigate?: () => Promise<void> | void;
}

export function ProfessionalQuickSearch({
  drawer = false,
  onNavigate,
}: ProfessionalQuickSearchProps): React.ReactElement {
  const { theme } = useTheme();
  const navigation = useNavigation<AppNavigationProp>();
  const inputRef = useRef<TextInput>(null);
  const wrapperRef = useRef<View>(null);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestSequence = useRef(0);
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [patients, setPatients] = useState<ProfessionalPatientSearchResult[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const normalizedQuery = query.trim().toLocaleLowerCase('es-ES');
  const showResults = focused || drawer;

  const navigationResults = useMemo(() => {
    if (!normalizedQuery) return NAVIGATION_RESULTS.slice(0, 4);
    return NAVIGATION_RESULTS.filter((item) => (
      `${item.label} ${item.description}`.toLocaleLowerCase('es-ES').includes(normalizedQuery)
    ));
  }, [normalizedQuery]);

  const selectableResults = useMemo(() => [
    ...patients.map((patient) => ({ kind: 'patient' as const, patient })),
    ...navigationResults.map((item) => ({ kind: 'navigation' as const, item })),
  ], [navigationResults, patients]);

  useEffect(() => {
    if (Platform.OS !== 'web' || drawer) return undefined;
    const handleKeyDown = (event: KeyboardEvent): void => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase() === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
      }
      if (event.key === 'Escape') {
        inputRef.current?.blur();
        setFocused(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [drawer]);

  useEffect(() => () => {
    if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
  }, []);

  useEffect(() => {
    setActiveIndex(-1);
  }, [normalizedQuery, patients, navigationResults]);

  useEffect(() => {
    requestSequence.current += 1;
    const requestId = requestSequence.current;
    if (normalizedQuery.length < 2) {
      setPatients([]);
      setLoading(false);
      setError(false);
      return undefined;
    }

    setLoading(true);
    setError(false);
    const timeout = setTimeout(() => {
      void professionalSearchService.searchPatients(query).then((results) => {
        if (requestSequence.current === requestId) setPatients(results);
      }).catch(() => {
        if (requestSequence.current === requestId) {
          setPatients([]);
          setError(true);
        }
      }).finally(() => {
        if (requestSequence.current === requestId) setLoading(false);
      });
    }, 250);

    return () => clearTimeout(timeout);
  }, [normalizedQuery, query]);

  const handleQueryChange = useCallback((value: string): void => {
    requestSequence.current += 1;
    setQuery(value);
  }, []);

  const completeNavigation = (): void => {
    setQuery('');
    setFocused(false);
    inputRef.current?.blur();
    void Promise.resolve(onNavigate?.()).catch(() => undefined);
  };

  const navigateToRoute = (route: QuickNavigationRoute): void => {
    trackProfessionalWorkspaceEvent({
      event: 'professional_quick_search_result_selected',
      properties: { category: 'navigation' },
    });
    switch (route) {
      case 'ProfessionalHome': navigation.navigate('ProfessionalHome'); break;
      case 'ProfessionalSessions': navigation.navigate('ProfessionalSessions'); break;
      case 'ProfessionalClients': navigation.navigate('ProfessionalClients'); break;
      case 'ProfessionalBilling': navigation.navigate('ProfessionalBilling'); break;
      case 'ProfessionalDashboard': navigation.navigate('ProfessionalDashboard'); break;
      case 'ProfessionalAvailability': navigation.navigate('ProfessionalAvailability'); break;
    }
    completeNavigation();
  };

  const navigateToPatient = (patientId: string): void => {
    trackProfessionalWorkspaceEvent({
      event: 'professional_quick_search_result_selected',
      properties: { category: 'patient' },
    });
    navigation.navigate('ClientProfile', { clientId: patientId });
    completeNavigation();
  };

  const hasNoResults = normalizedQuery.length >= 2
    && !loading
    && !error
    && patients.length === 0
    && navigationResults.length === 0;

  useEffect(() => {
    if (Platform.OS !== 'web' || drawer || !focused) return undefined;

    const handlePointerDown = (event: PointerEvent): void => {
      const wrapperNode = wrapperRef.current as unknown as { contains?: (node: Node) => boolean } | null;
      if (!wrapperNode?.contains?.(event.target as Node)) {
        inputRef.current?.blur();
        setFocused(false);
      }
    };
    const handleResultNavigation = (event: KeyboardEvent): void => {
      if (event.key === 'ArrowDown' && selectableResults.length > 0) {
        event.preventDefault();
        setActiveIndex((current) => (current + 1) % selectableResults.length);
      } else if (event.key === 'ArrowUp' && selectableResults.length > 0) {
        event.preventDefault();
        setActiveIndex((current) => (
          current <= 0 ? selectableResults.length - 1 : current - 1
        ));
      } else if (event.key === 'Enter' && activeIndex >= 0) {
        event.preventDefault();
        const selected = selectableResults[activeIndex];
        if (selected?.kind === 'patient') navigateToPatient(selected.patient.id);
        if (selected?.kind === 'navigation') navigateToRoute(selected.item.route);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleResultNavigation);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleResultNavigation);
    };
  }, [activeIndex, drawer, focused, selectableResults]);

  return (
    <View ref={wrapperRef} style={[styles.wrapper, drawer ? styles.drawerWrapper : null]}>
      <View
        style={[
          styles.inputShell,
          drawer ? styles.drawerInputShell : null,
          {
            backgroundColor: theme.bgMuted,
            borderColor: focused ? theme.focus : theme.borderLight,
          },
        ]}
      >
        <Ionicons name="search-outline" size={18} color={theme.textMuted} />
        <TextInput
          ref={inputRef}
          value={query}
          onChangeText={handleQueryChange}
          onFocus={() => {
            if (blurTimeoutRef.current) {
              clearTimeout(blurTimeoutRef.current);
              blurTimeoutRef.current = null;
            }
            if (!focused) {
              trackProfessionalWorkspaceEvent({
                event: 'professional_quick_search_opened',
                properties: {},
              });
            }
            setFocused(true);
          }}
          onBlur={() => {
            if (!drawer) {
              blurTimeoutRef.current = setTimeout(() => {
                setFocused(false);
                blurTimeoutRef.current = null;
              }, 150);
            }
          }}
          placeholder="Buscar pacientes o ir a…"
          placeholderTextColor={theme.textMuted}
          style={[styles.input, { color: theme.textPrimary, fontFamily: theme.fontSans }]}
          accessibilityLabel="Buscar pacientes o navegar"
          accessibilityState={{ expanded: showResults, busy: loading }}
          returnKeyType="search"
        />
        {loading ? <ActivityIndicator size="small" color={theme.primary} /> : null}
      </View>

      {showResults && (focused || drawer && query.length > 0) ? (
        <ScrollView
          testID="professional-quick-search-results"
          style={[
            styles.results,
            drawer ? styles.drawerResults : null,
            {
              backgroundColor: theme.bgElevated,
              borderColor: theme.border,
              shadowColor: theme.shadowStrong,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator
        >
          {error ? (
            <SearchMessage icon="cloud-offline-outline" text="No se pudo completar la búsqueda" />
          ) : null}
          {!error && patients.length > 0 ? (
            <SearchGroupLabel label="Pacientes" />
          ) : null}
          {!error && patients.map((patient, index) => (
            <SearchResultRow
              key={patient.id}
              iconText={patient.initials}
              label={patient.displayName}
              description="Abrir ficha del paciente"
              onPress={() => navigateToPatient(patient.id)}
              active={activeIndex === index}
            />
          ))}
          {navigationResults.length > 0 ? <SearchGroupLabel label="Ir a" /> : null}
          {navigationResults.map((item, index) => (
            <SearchResultRow
              key={item.route}
              icon={item.icon}
              label={item.label}
              description={item.description}
              onPress={() => navigateToRoute(item.route)}
              active={activeIndex === patients.length + index}
            />
          ))}
          {hasNoResults ? (
            <SearchMessage icon="search-outline" text="No hay resultados para esta búsqueda" />
          ) : null}
          {normalizedQuery.length === 1 ? (
            <SearchMessage icon="text-outline" text="Escribe al menos 2 caracteres para buscar pacientes" />
          ) : null}
        </ScrollView>
      ) : null}
    </View>
  );
}

function SearchGroupLabel({ label }: { label: string }): React.ReactElement {
  const { theme } = useTheme();
  return <Text style={[styles.groupLabel, { color: theme.textMuted, fontFamily: theme.fontSansSemiBold }]}>{label}</Text>;
}

function SearchMessage({
  icon,
  text,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  text: string;
}): React.ReactElement {
  const { theme } = useTheme();
  return (
    <View style={styles.messageRow}>
      <Ionicons name={icon} size={17} color={theme.textMuted} />
      <Text style={[styles.messageText, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>{text}</Text>
    </View>
  );
}

function SearchResultRow({
  icon,
  iconText,
  label,
  description,
  onPress,
  active = false,
}: {
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  iconText?: string;
  label: string;
  description: string;
  onPress: () => void;
  active?: boolean;
}): React.ReactElement {
  const { theme } = useTheme();
  return (
    <AnimatedPressable
      onPress={onPress}
      style={[styles.resultRow, active ? { backgroundColor: theme.primaryAlpha12 } : null]}
      hoverLift={false}
      pressScale={0.99}
      accessibilityState={{ selected: active }}
    >
      <View style={[styles.resultIcon, { backgroundColor: theme.primaryAlpha12 }]}>
        {iconText ? (
          <Text style={[styles.resultIconText, { color: theme.primary, fontFamily: theme.fontSansBold }]}>{iconText}</Text>
        ) : (
          <Ionicons name={icon ?? 'arrow-forward-outline'} size={17} color={theme.primary} />
        )}
      </View>
      <View style={styles.resultCopy}>
        <Text style={[styles.resultTitle, { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold }]} numberOfLines={1}>{label}</Text>
        <Text style={[styles.resultDescription, { color: theme.textMuted, fontFamily: theme.fontSans }]} numberOfLines={1}>{description}</Text>
      </View>
      <Ionicons name="arrow-forward" size={14} color={theme.textMuted} />
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  wrapper: { width: '100%', maxWidth: 520, zIndex: 80 },
  drawerWrapper: { maxWidth: '100%', paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  inputShell: { minHeight: 44, borderWidth: 1, borderRadius: 14, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 10 },
  drawerInputShell: { minHeight: 48 },
  input: { flex: 1, minWidth: 0, fontSize: 14, paddingVertical: 0, outlineStyle: 'none' } as never,
  results: { position: 'absolute', top: 50, left: 0, right: 0, maxHeight: 520, borderRadius: 18, borderWidth: 1, padding: 8, shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.18, shadowRadius: 32, elevation: 20 },
  drawerResults: { position: 'relative', top: 6, maxHeight: 390, shadowOpacity: 0, elevation: 0 },
  groupLabel: { fontSize: 10, letterSpacing: 0.7, textTransform: 'uppercase', paddingHorizontal: 10, paddingTop: 9, paddingBottom: 5 },
  resultRow: { minHeight: 55, borderRadius: 12, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 10 },
  resultIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  resultIconText: { fontSize: 11 },
  resultCopy: { flex: 1, minWidth: 0 },
  resultTitle: { fontSize: 13 },
  resultDescription: { fontSize: 11, marginTop: 2 },
  messageRow: { minHeight: 54, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 9 },
  messageText: { flex: 1, fontSize: 12, lineHeight: 17 },
});

export default ProfessionalQuickSearch;
