import type { ClinicalPatientAction, ClinicalPatientSection } from '../../components/professional/ClinicalPatientWorkspace';
import type { ClinicalTimelinePage } from '../../services/clinicalService';
import { PatientPackages } from '../../components/packages/PatientPackages';
import type { PatientPackage } from '../../services/packageService';
import { PatientCommission } from '../commissions/CommissionLinks';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRef } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { AnimatedPressable, Button, Card } from '../../components/common';
import { TourTarget } from '../../components/onboarding/TourTarget';
import { useOptionalProfessionalTour } from '../../components/onboarding/professionalTourContext';
import type { ProfessionalTourTargetId } from '../../components/onboarding/professionalTourTypes';
import { ClinicalTab, type ClinicalPatientAccessState } from '../../components/professional/ClinicalTab';
import { ManagedSessionSchedulerModal } from '../../components/professional/ManagedSessionSchedulerModal';
import { borderRadius, layout, spacing, typography } from '../../constants/colors';
import {
  CONTACT_METHOD_REQUIRED_MESSAGE,
  getErrorMessage,
} from '../../constants/errors';
import { lightTheme } from '../../constants/theme';
import type { AppNavigationProp, AppRouteProp } from '../../constants/types';
import { useTheme } from '../../contexts/ThemeContext';
import * as professionalService from '../../services/professionalService';
import { showAppAlert, useAppAlert } from '../../components/common/alert';

type TabKey = ClinicalPatientSection | 'clinical';

const TABS: Array<{ key: TabKey; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: 'summary', label: 'Resumen', icon: 'grid-outline' },
  { key: 'history', label: 'Sesiones', icon: 'calendar-outline' },
  { key: 'notes', label: 'Notas', icon: 'document-text-outline' },
  { key: 'exercises', label: 'Ejercicios', icon: 'fitness-outline' },
  { key: 'documents', label: 'Documentación', icon: 'folder-open-outline' },
  { key: 'packages', label: 'Datos y bonos', icon: 'person-outline' },
];

const resolveInitialTab = (tab?: AppRouteProp<'ClientProfile'>['params']['initialTab'], workspace?: 'general' | 'sessions', sessionId?: string): TabKey => {
  if (tab === 'history' || workspace === 'sessions' || sessionId) return 'history';
  if (tab === 'notes' || tab === 'exercises' || tab === 'documents' || tab === 'packages') return tab;

  return 'summary';
};

const textStyles = {
  eyebrow: {
    fontSize: typography.fontSizes.xs,
    lineHeight: 18,
    fontWeight: '700' as const,
    fontFamily: lightTheme.fontSansBold,
    letterSpacing: 1.1,
    textTransform: 'uppercase' as const,
  },
  title: { fontSize: typography.fontSizes.xxxl, lineHeight: 36, fontWeight: '700' as const, fontFamily: lightTheme.fontHeading },
  section: { fontSize: typography.fontSizes.xxl, lineHeight: 30, fontWeight: '700' as const, fontFamily: lightTheme.fontHeading },
  body: { fontSize: typography.fontSizes.sm, lineHeight: 22, fontFamily: lightTheme.fontSans },
  strong: { fontSize: typography.fontSizes.sm, lineHeight: 22, fontWeight: '700' as const, fontFamily: lightTheme.fontSansBold },
  metric: { fontSize: typography.fontSizes.xxl, lineHeight: 30, fontWeight: '700' as const, fontFamily: lightTheme.fontHeading },
  caption: { fontSize: typography.fontSizes.xs, lineHeight: 18, fontWeight: '700' as const, fontFamily: lightTheme.fontSansBold },
};

const SESSION_TYPE_LABELS: Record<string, string> = {
  VIDEO_CALL: 'Videollamada',
  IN_PERSON: 'Presencial',
  CHAT: 'Chat',
  PHONE_CALL: 'Llamada',
};

const SESSION_STATUS_LABELS: Record<string, string> = {
  CONFIRMED: 'Confirmada',
  COMPLETED: 'Completada',
  PENDING: 'Pendiente',
  CANCELLED: 'Cancelada',
};

type MeasurableNativeRef = {
  measureInWindow: (
    callback: (x: number, y: number, width: number, height: number) => void,
  ) => void;
};

const MEASURE_SCROLL_VIEWPORT_TIMEOUT_MS = 80;

const formatDate = (value?: string | Date | null, withTime = false) =>
  value
    ? new Date(value).toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
      })
    : 'Sin fecha';

const getClientAge = (birthDate?: string | null) => {
  if (!birthDate) {
    return null;
  }

  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }

  return age;
};

const getSessionTypeLabel = (type: string) => SESSION_TYPE_LABELS[type.toUpperCase()] || type;
const getSessionStatusLabel = (status: string) =>
  SESSION_STATUS_LABELS[status.toUpperCase()] || status;

const getTimelineStatusColor = (
  status: string,
  theme: ReturnType<typeof useTheme>['theme']
) => {
  const normalized = status.toUpperCase();

  if (normalized === 'COMPLETED') {
    return theme.success;
  }

  if (normalized === 'CONFIRMED') {
    return theme.primary;
  }

  if (normalized === 'PENDING') {
    return theme.warning;
  }

  if (normalized === 'CANCELLED') {
    return theme.error;
  }

  return theme.textMuted;
};

export function ClientProfileScreen() {
  const navigation = useNavigation<AppNavigationProp>();
  const route = useRoute<AppRouteProp<'ClientProfile'>>();
  const appAlert = useAppAlert();
  const {
    clientId,
    initialTab,
    clinicalWorkspace,
    focusSessionId,
    focusBillingEditor,
  } = route.params;
  const { height, width } = useWindowDimensions();
  const { theme } = useTheme();
  const tour = useOptionalProfessionalTour();

  const [activeTab, setActiveTab] = useState<TabKey>(resolveInitialTab(initialTab, clinicalWorkspace, focusSessionId));
  const [actionsVisible, setActionsVisible] = useState(false);
  const [clinicalAction, setClinicalAction] = useState<ClinicalPatientAction>();
  const [clinicalState, setClinicalState] = useState<ClinicalPatientAccessState & { clientId: string }>({ clientId: '', unlocked: false, granted: false, closed: false, consentStatus: null });
  const [clinicalCounters, setClinicalCounters] = useState<{ clientId: string; value: ClinicalTimelinePage['counters'] } | null>(null);
  const updateClinicalState = useCallback((state: ClinicalPatientAccessState) => setClinicalState({ clientId, ...state }), [clientId]);
  const updateClinicalCounters = useCallback((value: ClinicalTimelinePage['counters']) => setClinicalCounters({ clientId, value }), [clientId]);
  const consumeClinicalAction = useCallback((id: number) => {
    setClinicalAction(current => current && current.id <= id ? undefined : current);
  }, []);
  const requestClinicalAction = (kind: ClinicalPatientAction['kind']) => {
    if (activeTab === 'packages') setActiveTab('summary');
    setClinicalAction({ id: Date.now(), kind });
  };
  const [client, setClient] = useState<professionalService.Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshingClient, setRefreshingClient] = useState(false);
  const [billingModalVisible, setBillingModalVisible] = useState(false);
  const [savingBilling, setSavingBilling] = useState(false);
  const [billingContactError, setBillingContactError] = useState('');
  const [sessionModalVisible, setSessionModalVisible] = useState(false);
  const [scheduledPackage, setScheduledPackage] = useState<PatientPackage>();
  const [sessionSaving, setSessionSaving] = useState(false);
  const [archiveSubmitting, setArchiveSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visibleHistoryItems, setVisibleHistoryItems] = useState(5);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [billingForm, setBillingForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    billingFullName: '',
    billingTaxId: '',
    billingAddress: '',
    billingPostalCode: '',
    billingCity: '',
    billingCountry: 'Spain',
  });
  const hasLoadedClientRef = useRef(false);
  const loadClientPromiseRef = useRef<Promise<void> | null>(null);
  const activeClientIdRef = useRef(clientId);
  if (activeClientIdRef.current !== clientId) {
    activeClientIdRef.current = clientId;
    hasLoadedClientRef.current = false;
    loadClientPromiseRef.current = null;
  }
  const autoOpenedBillingRef = useRef(false);
  const tourScrollRef = useRef<ScrollView>(null);

  const isDesktop = width >= 1180;
  const isMobile = width < 720;
  const sectionTitleStyle = useMemo(() => ({ fontFamily: theme.fontHeading }), [theme]);
  const emphasisStyle = useMemo(() => ({ fontFamily: theme.fontSansSemiBold }), [theme]);
  const labelStyle = useMemo(() => ({ fontFamily: theme.fontSansSemiBold }), [theme]);
  const inputTextStyle = useMemo(() => ({ fontFamily: theme.fontSans }), [theme]);

  const loadClient = useCallback(async () => {
    if (loadClientPromiseRef.current) {
      await loadClientPromiseRef.current;
      return;
    }

    const isInitialLoad = !hasLoadedClientRef.current;
    const request = (async () => {
      try {
        if (isInitialLoad) {
          setLoading(true);
        } else {
          setRefreshingClient(true);
        }

        const result = await professionalService.getProfessionalClientDetail(clientId);
        if (activeClientIdRef.current !== clientId) return;

        if (!result) {
          setError('Paciente no encontrado');
          return;
        }

        setClient(result);
        setError(null);
        hasLoadedClientRef.current = true;
      } catch (loadError: unknown) {
        if (activeClientIdRef.current !== clientId) return;
        setError(getErrorMessage(loadError, 'No se pudo cargar la ficha del paciente'));
      } finally {
        if (activeClientIdRef.current !== clientId) return;
        if (isInitialLoad) {
          setLoading(false);
        } else {
          setRefreshingClient(false);
        }

        loadClientPromiseRef.current = null;
      }
    })();

    loadClientPromiseRef.current = request;
    await request;
  }, [clientId]);

  useFocusEffect(
    useCallback(() => {
      void loadClient();
    }, [loadClient])
  );

  useEffect(() => {
    setVisibleHistoryItems(5);
    setActiveTab(resolveInitialTab(initialTab, clinicalWorkspace, focusSessionId));
  }, [clientId, initialTab, clinicalWorkspace, focusSessionId]);

  useEffect(() => {
    setRefreshingClient(false);
    setClinicalCounters(null);
    setClinicalAction(undefined);
    setActionsVisible(false);
    autoOpenedBillingRef.current = false;
  }, [clientId]);

  useEffect(() => {
    if (!client) {
      return;
    }

    setBillingForm({
      firstName: client.firstName || '',
      lastName: client.lastName || '',
      email: client.primaryEmail || client.email || '',
      phone: client.phone || client.primaryPhone || '',
      billingFullName: client.billingFullName || '',
      billingTaxId: client.billingTaxId || '',
      billingAddress: client.billingAddress || '',
      billingPostalCode: client.billingPostalCode || '',
      billingCity: client.billingCity || '',
      billingCountry: client.billingCountry || 'Spain',
    });
    setBillingContactError('');
  }, [client]);

  useEffect(() => {
    if (focusBillingEditor && client && !autoOpenedBillingRef.current) {
      autoOpenedBillingRef.current = true;
      setBillingModalVisible(true);
    }
  }, [client, focusBillingEditor]);

  const sessions = useMemo(
    () =>
      [...(client?.sessions || [])].sort(
        (left, right) => new Date(right.date).getTime() - new Date(left.date).getTime()
      ),
    [client?.sessions]
  );

  const completedSessions = useMemo(
    () => sessions.filter((session) => session.status.toUpperCase() === 'COMPLETED').length,
    [sessions]
  );

  const nextSession = useMemo(
    () =>
      sessions
        .filter((session) => new Date(session.date).getTime() > Date.now() && ['PENDING', 'CONFIRMED'].includes(session.status.toUpperCase()))
        .sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime())[0] || null,
    [sessions]
  );

  const visibleSessions = useMemo(
    () => sessions.slice(0, visibleHistoryItems),
    [sessions, visibleHistoryItems]
  );

  const initials = client?.initials || (client?.displayName || client?.user.name || 'P').slice(0, 2).toUpperCase();
  const age = getClientAge(client?.user.birthDate);
  const isManagedClient = client?.source === 'MANAGED';
  const isClientArchived = Boolean(client?.archivedAt);
  const locationSummary = [client?.homeCity, client?.homeCountry].filter(Boolean).join(', ');
  const hasCompleteBilling = Boolean(
    client?.billingFullName &&
      client?.billingTaxId &&
      client?.billingAddress &&
      client?.billingPostalCode &&
      client?.billingCity &&
      client?.billingCountry
  );
  const showScrollCue = isMobile && contentHeight > viewportHeight + 48 && scrollOffset < 20;

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setScrollOffset(event.nativeEvent.contentOffset.y);
  }, []);

  const measureScrollViewport = useCallback(async () => {
    const scrollRef = tourScrollRef.current as unknown as MeasurableNativeRef | null;

    if (!scrollRef || typeof scrollRef.measureInWindow !== 'function') {
      return null;
    }

    return new Promise<{ height: number; y: number } | null>((resolve) => {
      let hasResolved = false;
      const timeout = setTimeout(() => {
        if (!hasResolved) {
          hasResolved = true;
          resolve(null);
        }
      }, MEASURE_SCROLL_VIEWPORT_TIMEOUT_MS);

      scrollRef.measureInWindow((_x, y, _width, measuredHeight) => {
        if (hasResolved) {
          return;
        }

        hasResolved = true;
        clearTimeout(timeout);
        resolve({ height: measuredHeight, y });
      });
    });
  }, []);

  const prepareClinicalTourStep = useCallback(
    async (targetId: ProfessionalTourTargetId) => {
      const targetLayout = await tour?.measureTarget(targetId);

      if (!targetLayout) {
        return;
      }

      const scrollViewport = await measureScrollViewport();
      const viewportTop = scrollViewport?.y ?? 0;
      const visibleHeight = scrollViewport?.height || viewportHeight || height;

      if (visibleHeight <= 0) {
        return;
      }

      const targetCenter = targetLayout.y + targetLayout.height / 2;
      const viewportCenter = viewportTop + visibleHeight / 2;
      const nextScrollOffset = Math.max(
        0,
        Math.min(
          Math.max(0, contentHeight - visibleHeight),
          scrollOffset + targetCenter - viewportCenter,
        ),
      );

      if (Math.abs(nextScrollOffset - scrollOffset) < 1) {
        return;
      }

      setScrollOffset(nextScrollOffset);
      tourScrollRef.current?.scrollTo({
        animated: false,
        y: nextScrollOffset,
      });
    },
    [
      contentHeight,
      height,
      measureScrollViewport,
      scrollOffset,
      tour,
      viewportHeight,
    ],
  );

  const updateBillingField = useCallback(
    (field: keyof typeof billingForm, value: string) => {
      setBillingForm((current) => ({ ...current, [field]: value }));
      if (field === 'email' || field === 'phone') {
        setBillingContactError('');
      }
    },
    [],
  );

  const handleSaveBilling = useCallback(async () => {
    if (!client || client.archivedAt) {
      return;
    }

    if (
      client.source === 'MANAGED'
      && !billingForm.email.trim()
      && !billingForm.phone.trim()
    ) {
      setBillingContactError(CONTACT_METHOD_REQUIRED_MESSAGE);
      return;
    }

    try {
      setSavingBilling(true);
      setBillingContactError('');

      const trimmedBilling = {
        billingFullName: billingForm.billingFullName.trim(),
        billingTaxId: billingForm.billingTaxId.trim().toUpperCase(),
        billingAddress: billingForm.billingAddress.trim(),
        billingPostalCode: billingForm.billingPostalCode.trim(),
        billingCity: billingForm.billingCity.trim(),
        billingCountry: billingForm.billingCountry.trim(),
      };

      const billingFieldsChanged =
        trimmedBilling.billingFullName !== (client.billingFullName || '') ||
        trimmedBilling.billingTaxId !== (client.billingTaxId || '') ||
        trimmedBilling.billingAddress !== (client.billingAddress || '') ||
        trimmedBilling.billingPostalCode !== (client.billingPostalCode || '') ||
        trimmedBilling.billingCity !== (client.billingCity || '') ||
        trimmedBilling.billingCountry !== (client.billingCountry || 'Spain');

      const billingPayload = {
        ...trimmedBilling,
      };

      const updatedClient =
        client.source === 'MANAGED'
          ? await professionalService.updateManagedClient(client.id, {
              firstName: billingForm.firstName.trim() || undefined,
              lastName: billingForm.lastName.trim() || undefined,
              email: billingForm.email.trim(),
              phone: billingForm.phone.trim(),
              ...(billingFieldsChanged ? billingPayload : {}),
            })
          : billingFieldsChanged || billingForm.firstName.trim() !== (client.firstName || '') || billingForm.lastName.trim() !== (client.lastName || '')
            ? await professionalService.updateClientBilling(client.id, { ...billingPayload, firstName: billingForm.firstName.trim() || undefined, lastName: billingForm.lastName.trim() || undefined })
            : client;

      setClient(updatedClient);
      setBillingModalVisible(false);
      if (route.params.returnAfterBillingSave) { navigation.goBack(); return; }
      showAppAlert(appAlert, 
        'Éxito',
        client.source === 'MANAGED'
          ? 'La ficha del paciente se ha actualizado.'
          : 'Los datos fiscales del paciente se han actualizado.'
      );
    } catch (saveError: unknown) {
      showAppAlert(appAlert, 'Error', getErrorMessage(saveError, 'No se pudieron guardar los datos del paciente.'));
    } finally {
      setSavingBilling(false);
    }
  }, [appAlert, billingForm, client, navigation, route.params.returnAfterBillingSave]);

  const canScheduleProfessionalSession = Boolean(
    client && !isClientArchived
  );

  const openSessionScheduler = useCallback(() => {
    if (!canScheduleProfessionalSession) return;
    setScheduledPackage(undefined);
    setSessionModalVisible(true);
  }, [canScheduleProfessionalSession]);

  const closeSessionScheduler = useCallback(() => {
    if (sessionSaving) return;
    setSessionModalVisible(false);
  }, [sessionSaving]);

  const handleToggleArchive = useCallback(() => {
    if (!client || client.source !== 'MANAGED' || archiveSubmitting) {
      return;
    }

    const shouldArchive = !client.archivedAt;

    const applyArchiveChange = async () => {
      try {
        setArchiveSubmitting(true);
        const updatedClient = await professionalService.updateManagedClient(client.id, {
          archived: shouldArchive,
        });
        setClient(updatedClient);

        showAppAlert(
          appAlert,
          'Éxito',
          shouldArchive
            ? 'Tu relación asistencial está archivada. Conservas tu historia; la atención con otros profesionales y las citas existentes continúan.'
            : 'Tu relación vuelve a estar activa. Si el expediente estaba cerrado, solicita de nuevo el consentimiento asistencial antes de incorporar información clínica.'
        );
      } catch (archiveError: unknown) {
        showAppAlert(
          appAlert,
          shouldArchive ? 'No se pudo archivar' : 'No se pudo desarchivar',
          getErrorMessage(
            archiveError,
            shouldArchive
              ? 'No se pudo archivar el paciente.'
              : 'No se pudo desarchivar el paciente.'
          )
        );
      } finally {
        setArchiveSubmitting(false);
      }
    };

    if (shouldArchive) {
      showAppAlert(
        appAlert,
        'Archivar paciente',
        'El paciente pasará a archivados y no se podrán crear nuevas citas mientras esté archivado. Podrás desarchivarlo desde esta misma ficha.',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Archivar',
            style: 'destructive',
            onPress: () => {
              void applyArchiveChange();
            },
          },
        ],
        { cancelable: true }
      );
      return;
    }

    void applyArchiveChange();
  }, [appAlert, archiveSubmitting, client]);

  const handleCreateManagedSession = useCallback(
    async (input: professionalService.CreateManagedClientSessionInput) => {
      if (!client) return;

      try {
        setSessionSaving(true);
        await professionalService.createManagedClientSession(input);
        setSessionModalVisible(false);
        showAppAlert(appAlert, 'Cita creada', 'La cita se ha programado correctamente.');
        await loadClient();
      } catch (createError: unknown) {
        if (professionalService.isManagedSessionBufferConflictError(createError)) {
          throw createError;
        }

        showAppAlert(
          appAlert,
          'No se pudo crear la cita',
          getErrorMessage(createError, 'No se pudo crear la cita')
        );
      } finally {
        setSessionSaving(false);
      }
    },
    [appAlert, client, loadClient],
  );

  if ((loading && !client) || (!error && client?.id !== clientId)) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.bg }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (!client || error) {
    return (
      <View style={[styles.centered, styles.errorWrap, { backgroundColor: theme.bg }]}>
        <Ionicons name="alert-circle-outline" size={42} color={theme.warning} />
        <Text style={[textStyles.section, { color: theme.textPrimary }]}>No se pudo abrir la ficha</Text>
        <Text style={[textStyles.body, { color: theme.textSecondary, textAlign: 'center' }]}>
          {error || 'Paciente no encontrado'}
        </Text>
      </View>
    );
  }

  const mobileSurfaceCard = isMobile
    ? [styles.mobileSurfaceCard, { borderColor: theme.border }]
    : [];
  const administrativeSections: Array<{
    title: string;
    items: Array<{
      label: string;
      value: string;
      icon: keyof typeof Ionicons.glyphMap;
      tone?: 'success' | 'warning';
      wide?: boolean;
    }>;
  }> = [
    {
      title: 'Contacto',
      items: [
        {
          label: 'Email',
          value: client.primaryEmail || 'No registrado',
          icon: 'mail-outline',
          wide: true,
        },
        {
          label: 'Teléfono',
          value: client.primaryPhone || 'No registrado',
          icon: 'call-outline',
        },
      ],
    },
    {
      title: 'Datos personales',
      items: [
        {
          label: 'Ocupación',
          value: client.user.occupation || 'Sin información',
          icon: 'briefcase-outline',
        },
        {
          label: 'Ubicación',
          value: locationSummary || 'Sin información',
          icon: 'location-outline',
        },
      ],
    },
    {
      title: 'Facturación',
      items: [
        {
          label: 'Estado fiscal',
          value: client.billingReadiness?.missingFields.length ? `Falta: ${client.billingReadiness.missingFields.map(field => field.label).join(', ')}` : hasCompleteBilling ? 'Datos completos para factura completa' : 'Factura simplificada disponible. Datos fiscales adicionales solo para factura completa.',
          icon: hasCompleteBilling ? 'checkmark-circle-outline' : 'alert-circle-outline',
          tone: hasCompleteBilling ? 'success' : 'warning',
          wide: true,
        },
      ],
    },
  ];

  const administrativeCard = (
    <Card variant="default" padding="large" style={mobileSurfaceCard}>
      <Text style={[textStyles.section, { color: theme.textPrimary }, sectionTitleStyle]}>
        Información administrativa
      </Text>
      {!!client.billingReadiness?.missingFields.length && <Button variant="outline" onPress={() => setBillingModalVisible(true)}>Completar datos</Button>}

      <View style={styles.adminSections}>
        {administrativeSections.map((section) => (
          <View key={section.title} style={styles.adminSection}>
            <Text style={[styles.adminSectionTitle, labelStyle, { color: theme.textSecondary }]}>
              {section.title}
            </Text>
            <View style={[styles.adminGrid, isMobile && styles.adminGridStack]}>
              {section.items.map((item) => (
                <View
                  key={`${section.title}-${item.label}`}
                  style={[
                    styles.adminCell,
                    item.wide && !isMobile ? styles.adminCellWide : null,
                    { backgroundColor: theme.bgMuted, borderColor: theme.borderLight },
                  ]}
                >
                  <View style={styles.adminCellHeader}>
                    <Ionicons
                      name={item.icon}
                      size={14}
                      color={
                        item.tone === 'success'
                          ? theme.success
                          : item.tone === 'warning'
                            ? theme.warning
                            : theme.textMuted
                      }
                    />
                    <Text style={[styles.adminCellLabel, labelStyle, { color: theme.textMuted }]}>
                      {item.label}
                    </Text>
                  </View>
                  <Text
                    numberOfLines={item.wide ? 2 : 1}
                    style={[
                      styles.adminCellValue,
                      emphasisStyle,
                      {
                        color:
                          item.tone === 'success'
                            ? theme.success
                            : item.tone === 'warning'
                              ? theme.warning
                              : theme.textPrimary,
                      },
                    ]}
                  >
                    {item.value}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>
    </Card>
  );


  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView
        ref={tourScrollRef}
        style={{ flex: 1, backgroundColor: theme.bg }}
        contentContainerStyle={[
          styles.container,
          {
            paddingHorizontal: width < 720 ? spacing.md : spacing.lg,
          },
        ]}
        showsVerticalScrollIndicator
        scrollEventThrottle={16}
        onScroll={handleScroll}
        onLayout={(event) => {
          setViewportHeight(event.nativeEvent.layout.height);
        }}
        onContentSizeChange={(_, height) => {
          setContentHeight(height);
        }}
      >
      <TourTarget id="professional.client-profile.hero" fill>
        <Card padding="medium" style={styles.patientHero}>
          <View style={[styles.patientHeader, !isDesktop && { flexDirection: 'column', alignItems: 'stretch' }]}>
            <View style={styles.patientIdentity}>
              <AnimatedPressable accessibilityLabel="Volver" hoverLift={false} onPress={() => navigation.goBack()} style={styles.patientBack}><Ionicons name="arrow-back" size={20} color={theme.textSecondary} /></AnimatedPressable>
              <View style={[styles.patientAvatar, { backgroundColor: theme.bgMuted }]}>
                {client.user?.avatar ? <Image source={{ uri: client.user.avatar }} style={{ width: '100%', height: '100%' }} /> : <Text style={{ color: theme.textPrimary, fontFamily: theme.fontHeading, fontSize: 21 }}>{initials}</Text>}
              </View>
              <View style={styles.patientName}>
                <View style={styles.patientNameRow}><Text style={[styles.patientTitle, { color: theme.textPrimary, fontFamily: theme.fontHeading }]}>{client.displayName || client.user?.name}</Text>
                  <Text style={[styles.patientStatus, { color: isClientArchived ? theme.warning : theme.success, backgroundColor: isClientArchived ? theme.warningBg : theme.successBg, fontFamily: theme.fontSansSemiBold }]}>{isClientArchived ? 'ARCHIVADO' : clinicalState.clientId === client.id && clinicalState.closed ? 'PROCESO CERRADO' : 'EN SEGUIMIENTO'}</Text></View>
                <Text style={{ color: theme.textSecondary, fontFamily: theme.fontSans, fontSize: 12, lineHeight: 20 }}>{age !== null ? `${age} años · ` : ''}Paciente desde {formatDate(client.createdAt)}</Text>
                <AnimatedPressable hoverLift={false} accessibilityLabel="Gestionar consentimiento y acceso clínico" onPress={() => requestClinicalAction('CONSENT')}>
                  <Text style={{ color: theme.primary, fontFamily: theme.fontSansSemiBold, fontSize: 11, lineHeight: 20 }}>{clinicalState.clientId === client.id && clinicalState.unlocked ? `Área clínica desbloqueada · Consentimiento ${clinicalState.consentStatus === 'GRANTED' ? 'vigente' : clinicalState.consentStatus === 'REVOKED' ? 'retirado' : 'pendiente'}` : 'Área clínica protegida · Gestionar consentimiento'}</Text>
                </AnimatedPressable>
              </View>
            </View>
            <TourTarget id="professional.client-profile.actions" fill style={{ minWidth: 0, maxWidth: '100%', ...(!isDesktop ? { width: '100%' } : {}) }}>
              <View style={styles.patientActions}>
                {canScheduleProfessionalSession ? <Button variant="outline" size="small" onPress={openSessionScheduler}>Programar sesión</Button> : null}
                {clinicalState.clientId === client.id && clinicalState.granted && !clinicalState.closed ? <><Button variant="outline" size="small" onPress={() => requestClinicalAction('UPLOAD')}>Subir archivo</Button><Button size="small" onPress={() => requestClinicalAction('NOTE')}>+ Nueva nota</Button></> : null}
                <Button variant="ghost" size="small" accessibilityLabel="Más acciones del paciente" onPress={() => setActionsVisible(value => !value)}>Más ···</Button>
              </View>
            </TourTarget>
          </View>
          {actionsVisible ? <View style={[styles.patientMenu, { borderTopColor: theme.borderLight }]}>
            <Button variant="ghost" size="small" disabled={isClientArchived} onPress={() => { setActionsVisible(false); setBillingModalVisible(true); }}>Editar datos</Button>
            <Button variant="ghost" size="small" disabled={!client.primaryEmail} onPress={() => { if (client.primaryEmail) void Linking.openURL(`mailto:${client.primaryEmail}`); }}>Email</Button>
            <Button variant="ghost" size="small" disabled={isClientArchived} onPress={() => navigation.navigate('Referrals', { clientId: client.id })}>Proponer derivación</Button>
            {isManagedClient ? <Button variant="ghost" size="small" loading={archiveSubmitting} onPress={handleToggleArchive}>{isClientArchived ? 'Desarchivar paciente' : 'Archivar paciente'}</Button> : null}
          </View> : null}
          <View style={styles.patientMetrics}>
            {[{ label: 'PRÓXIMA SESIÓN', value: nextSession ? `${new Date(nextSession.date).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })} · ${new Date(nextSession.date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}` : 'Sin cita programada', hint: nextSession ? `${getSessionTypeLabel(nextSession.type)} · ${nextSession.duration} min` : 'Programa una sesión cuando la necesites' },
              { label: 'SESIONES REALIZADAS', value: String(completedSessions), hint: `${sessions.length} sesiones registradas` },
              ...(clinicalState.clientId === client.id && clinicalState.granted && clinicalCounters?.clientId === client.id ? [
                { label: 'SESIONES SIN NOTAS', value: String(clinicalCounters.value.withoutNotes), hint: 'Completadas por documentar' },
                { label: 'ARCHIVOS DEL EXPEDIENTE', value: String(clinicalCounters.value.activeFiles), hint: 'Archivos activos del proceso' },
              ] : [])].map(metric => <View key={metric.label} style={[styles.patientMetric, { backgroundColor: theme.bgMuted }]}>
                <Text style={{ color: theme.textSecondary, fontFamily: theme.fontSansSemiBold, fontSize: 10, lineHeight: 17, letterSpacing: 0.5 }}>{metric.label}</Text>
                <Text style={{ color: theme.textPrimary, fontFamily: theme.fontHeading, fontSize: metric.label === 'PRÓXIMA SESIÓN' ? 14 : 22, lineHeight: 27 }}>{metric.value}</Text>
                {!isMobile || metric.label === 'PRÓXIMA SESIÓN' ? <Text style={{ color: theme.textSecondary, fontFamily: theme.fontSans, fontSize: 11, lineHeight: 17 }}>{metric.hint}</Text> : null}
              </View>)}
          </View>
          {refreshingClient ? <ActivityIndicator size="small" color={theme.primary} /> : null}
        </Card>
      </TourTarget>
      <TourTarget id="professional.client-profile.tabs" fill><TourTarget id="professional.clinical.workspace-tabs" fill>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.patientTabs, { borderBottomColor: theme.borderLight }]}>
          {TABS.map(tab => { const selected = activeTab === tab.key || (activeTab === 'clinical' && tab.key === 'summary'); return <AnimatedPressable key={tab.key} hoverLift={false} accessibilityRole="tab" accessibilityState={{ selected }} onPress={() => setActiveTab(tab.key)} style={[styles.patientTab, { borderBottomColor: selected ? theme.actionPrimary : 'transparent' }]}>
            <Text style={{ color: selected ? theme.textPrimary : theme.textSecondary, fontFamily: selected ? theme.fontSansSemiBold : theme.fontSans, fontSize: 13, lineHeight: 20 }}>{tab.label}</Text>
          </AnimatedPressable>; })}
        </ScrollView>
      </TourTarget></TourTarget>

      {activeTab === 'packages' ? <View style={styles.patientAdmin}>
        {administrativeCard}
        <PatientCommission clientId={clientId} />
        <PatientPackages clientId={clientId} onReserve={row => { setScheduledPackage(row); setSessionModalVisible(true); }} />
      </View> : null}
      {activeTab === 'history' && !(clinicalState.clientId === client.id && clinicalState.granted) ? (
        <Card variant="default" padding="large">
          <View style={styles.historyHeader}>
            <Text style={[textStyles.section, { color: theme.textPrimary }, sectionTitleStyle]}>Historial de sesiones</Text>
            <Text style={[textStyles.body, { color: theme.textSecondary }]}>{sessions.length} sesiones registradas</Text>
          </View>

          <View style={styles.timeline}>
            {sessions.length === 0 ? (
              <Text style={[textStyles.body, { color: theme.textSecondary }]}>Todavía no hay sesiones asociadas a este paciente.</Text>
            ) : (
              visibleSessions.map((session) => (
                <View key={session.id} style={[styles.timelineItem, { borderColor: theme.border, backgroundColor: theme.bgMuted }]}>
                  <View style={styles.timelineMarkerColumn}>
                    <View style={[styles.timelineDot, { backgroundColor: getTimelineStatusColor(session.status, theme) }]} />
                    <View style={[styles.timelineLine, { backgroundColor: theme.border }]} />
                  </View>

                  <View style={styles.timelineContent}>
                    <View style={styles.timelineTopRow}>
                      <Text style={[textStyles.strong, { color: theme.textPrimary }, emphasisStyle]}>{formatDate(session.date, true)}</Text>
                      <Text style={[textStyles.caption, { color: theme.textMuted }]}>{getSessionStatusLabel(session.status)}</Text>
                    </View>
                    <Text style={[textStyles.body, { color: theme.textSecondary }]}>
                      {session.duration} min · {getSessionTypeLabel(session.type)}
                    </Text>
                  </View>
                </View>
              ))
            )}

            {visibleHistoryItems < sessions.length ? (
              <View style={styles.historyLoadMore}>
                <Button variant="secondary" size="medium" onPress={() => setVisibleHistoryItems((current) => current + 5)}>
                  Cargar más sesiones
                </Button>
              </View>
            ) : null}
          </View>
        </Card>
      ) : null}

        <View style={activeTab === 'packages' ? styles.hiddenTabContent : undefined}>
          <ClinicalTab key={client.id}
            section={activeTab === 'clinical' ? 'summary' : activeTab}
            action={clinicalAction} onActionConsumed={consumeClinicalAction} onSection={setActiveTab} onAccessState={updateClinicalState} onCounters={updateClinicalCounters}
            clientId={client.id}
            client={client}
            initialWorkspace={clinicalWorkspace}
            focusSessionId={focusSessionId}
            onPrepareClinicalTourStep={prepareClinicalTourStep}
            onRequestRefreshClient={loadClient}
            tourTargetsActive={activeTab !== 'packages'}
          />
        </View>
      </ScrollView>

      <Modal
        visible={billingModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setBillingModalVisible(false)}
      >
        <View style={[styles.modalBackdrop, { backgroundColor: theme.overlay }]}>
          <Card
            variant="default"
            padding="large"
            style={[styles.modalCard, { backgroundColor: theme.bgCard, borderColor: theme.border }]}
          >
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderCopy}>
                  <Text style={[textStyles.section, { color: theme.textPrimary }, sectionTitleStyle]}>
                    Editar paciente
                  </Text>
                  <Text style={[textStyles.body, { color: theme.textSecondary }]}>
                    {client.source === 'MANAGED'
                      ? 'Puedes actualizar datos de contacto y datos fiscales para la factura completa.'
                      : 'Completa los datos fiscales necesarios para emitir facturas completas a este paciente.'}
                  </Text>
                </View>
                <AnimatedPressable
                  onPress={() => setBillingModalVisible(false)}
                  hoverLift={false}
                  pressScale={0.96}
                  style={[styles.closeButton, { backgroundColor: theme.bgMuted }]}
                >
                  <Ionicons name="close" size={18} color={theme.textSecondary} />
                </AnimatedPressable>
              </View>

              {client.source === 'MANAGED' || client.billingReadiness?.missingFields.some(field => field.purpose === 'BOOKING') ? (
                <View style={styles.modalGrid}>
                  <View style={styles.modalField}>
                    <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Nombre</Text>
                    <TextInput
                      value={billingForm.firstName}
                      editable={client.source === 'MANAGED' || !client.firstName?.trim()}
                      onChangeText={(value) => updateBillingField('firstName', value)}
                      style={[styles.modalInput, inputTextStyle, { color: theme.textPrimary, borderColor: theme.border }]}
                      placeholder="Nombre"
                      placeholderTextColor={theme.textMuted}
                    />
                  </View>
                  <View style={styles.modalField}>
                    <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Apellidos</Text>
                    <TextInput
                      value={billingForm.lastName}
                      editable={client.source === 'MANAGED' || !client.lastName?.trim()}
                      onChangeText={(value) => updateBillingField('lastName', value)}
                      style={[styles.modalInput, inputTextStyle, { color: theme.textPrimary, borderColor: theme.border }]}
                      placeholder="Apellidos"
                      placeholderTextColor={theme.textMuted}
                    />
                  </View>
                  <View style={styles.modalField}>
                    <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Email</Text>
                    <TextInput
                      value={billingForm.email}
                      editable={client.source === 'MANAGED' && client.accountLinkStatus !== 'CONFIRMED'}
                      onChangeText={(value) => updateBillingField('email', value)}
                      style={[
                        styles.modalInput,
                        inputTextStyle,
                        {
                          color: theme.textPrimary,
                          borderColor: billingContactError ? theme.error : theme.border,
                        },
                      ]}
                      placeholder="email@paciente.com"
                      placeholderTextColor={theme.textMuted}
                      autoCapitalize="none"
                      keyboardType="email-address"
                    />
                  </View>
                  <View style={styles.modalField}>
                    <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Teléfono</Text>
                    <TextInput
                      value={billingForm.phone}
                      editable={client.source === 'MANAGED'}
                      onChangeText={(value) => updateBillingField('phone', value)}
                      style={[
                        styles.modalInput,
                        inputTextStyle,
                        {
                          color: theme.textPrimary,
                          borderColor: billingContactError ? theme.error : theme.border,
                        },
                      ]}
                      placeholder="600 000 000"
                      placeholderTextColor={theme.textMuted}
                      keyboardType="phone-pad"
                    />
                  </View>
                  {billingContactError ? (
                    <View style={styles.modalFieldFull}>
                      <Text style={[styles.modalError, { color: theme.error }]}>
                        {billingContactError}
                      </Text>
                    </View>
                  ) : null}
                </View>
              ) : null}

              <View style={styles.modalSection}>
                <Text style={[textStyles.strong, { color: theme.textPrimary }, emphasisStyle]}>
                  Datos fiscales para factura completa
                </Text>
                <View style={styles.modalGrid}>
                  <View style={styles.modalField}>
                    <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Nombre fiscal</Text>
                    <TextInput
                      value={billingForm.billingFullName}
                      onChangeText={(value) => updateBillingField('billingFullName', value)}
                      style={[styles.modalInput, inputTextStyle, { color: theme.textPrimary, borderColor: theme.border }]}
                      placeholder="Nombre y apellidos"
                      placeholderTextColor={theme.textMuted}
                    />
                  </View>
                  <View style={styles.modalField}>
                    <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>NIF/NIE</Text>
                    <TextInput
                      value={billingForm.billingTaxId}
                      onChangeText={(value) => updateBillingField('billingTaxId', value)}
                      style={[styles.modalInput, inputTextStyle, { color: theme.textPrimary, borderColor: theme.border }]}
                      placeholder="12345678A"
                      placeholderTextColor={theme.textMuted}
                      autoCapitalize="characters"
                    />
                  </View>
                  <View style={[styles.modalField, styles.modalFieldFull]}>
                    <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Dirección fiscal</Text>
                    <TextInput
                      value={billingForm.billingAddress}
                      onChangeText={(value) => updateBillingField('billingAddress', value)}
                      style={[styles.modalInput, inputTextStyle, { color: theme.textPrimary, borderColor: theme.border }]}
                      placeholder="Calle, número, piso..."
                      placeholderTextColor={theme.textMuted}
                    />
                  </View>
                  <View style={styles.modalField}>
                    <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Código postal</Text>
                    <TextInput
                      value={billingForm.billingPostalCode}
                      onChangeText={(value) => updateBillingField('billingPostalCode', value)}
                      style={[styles.modalInput, inputTextStyle, { color: theme.textPrimary, borderColor: theme.border }]}
                      placeholder="28001"
                      placeholderTextColor={theme.textMuted}
                    />
                  </View>
                  <View style={styles.modalField}>
                    <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Ciudad</Text>
                    <TextInput
                      value={billingForm.billingCity}
                      onChangeText={(value) => updateBillingField('billingCity', value)}
                      style={[styles.modalInput, inputTextStyle, { color: theme.textPrimary, borderColor: theme.border }]}
                      placeholder="Madrid"
                      placeholderTextColor={theme.textMuted}
                    />
                  </View>
                  <View style={styles.modalField}>
                    <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>País</Text>
                    <TextInput
                      value={billingForm.billingCountry}
                      onChangeText={(value) => updateBillingField('billingCountry', value)}
                      style={[styles.modalInput, inputTextStyle, { color: theme.textPrimary, borderColor: theme.border }]}
                      placeholder="Spain"
                      placeholderTextColor={theme.textMuted}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.modalActions}>
                <Button variant="ghost" size="medium" onPress={() => setBillingModalVisible(false)}>
                  Cancelar
                </Button>
                <Button variant="primary" size="medium" onPress={handleSaveBilling} loading={savingBilling}>
                  Guardar cambios
                </Button>
              </View>
            </ScrollView>
          </Card>
        </View>
      </Modal>

      <ManagedSessionSchedulerModal
        visible={sessionModalVisible}
        clients={client ? [client] : []}
        initialClientId={client?.id}
        initialValues={scheduledPackage && scheduledPackage.snapshot.options[0] ? { clientId, patientPackageId: scheduledPackage.id, optionId: scheduledPackage.snapshot.options[0].id, type: scheduledPackage.snapshot.options[0].modality, duration: scheduledPackage.snapshot.options[0].durationMinutes, date: new Date(Date.now() + 86400000).toISOString() } : undefined}
        saving={sessionSaving}
        onClose={closeSessionScheduler}
        onSubmit={handleCreateManagedSession}
      />

      {showScrollCue ? (
        <View pointerEvents="none" style={styles.scrollCueWrap}>
          <View style={[styles.scrollCueSurface, { backgroundColor: theme.bg }]}>
            <View
              style={[
                styles.scrollCuePill,
                {
                  backgroundColor: theme.bgCard,
                  borderColor: theme.border,
                },
              ]}
            >
              <Text style={[styles.scrollCueText, { color: theme.textSecondary }, labelStyle]}>
                Desliza para ver más
              </Text>
              <Ionicons name="chevron-down" size={16} color={theme.textSecondary} />
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  patientHero: { gap: 10 }, patientHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 18 },
  patientIdentity: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 240 }, patientBack: { width: 28, height: 42, alignItems: 'center', justifyContent: 'center' },
  patientAvatar: { width: 54, height: 54, borderRadius: 20, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }, patientName: { flex: 1, minWidth: 0, gap: 2 },
  patientNameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 }, patientTitle: { fontSize: 24, lineHeight: 31 }, patientStatus: { fontSize: 9, letterSpacing: 0.5, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 6 },
  patientActions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, maxWidth: '100%', flexShrink: 1 }, patientMenu: { flexDirection: 'row', flexWrap: 'wrap', borderTopWidth: 1, paddingTop: 10, gap: 4 },
  patientMetrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }, patientMetric: { flex: 1, minWidth: 135, borderRadius: 10, padding: 11, gap: 2 },
  patientTabs: { flexDirection: 'row', gap: 26, borderBottomWidth: 1, minWidth: '100%' }, patientTab: { paddingVertical: 13, borderBottomWidth: 2 }, patientAdmin: { gap: 18 },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorWrap: {
    gap: spacing.md,
    padding: spacing.xl,
  },
  container: {
    width: '100%',
    maxWidth: 1360,
    alignSelf: 'center',
    paddingVertical: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  adminSections: {
    gap: spacing.md,
    marginTop: spacing.md,
  },
  adminSection: {
    gap: spacing.sm,
  },
  adminSectionTitle: {
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  adminGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  adminGridStack: {
    flexDirection: 'column',
    flexWrap: 'nowrap',
  },
  adminCell: {
    minWidth: 190,
    flexBasis: 190,
    flexGrow: 1,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 6,
  },
  adminCellWide: {
    minWidth: 260,
    flexBasis: 300,
  },
  adminCellHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  adminCellLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  adminCellValue: {
    ...textStyles.strong,
    minWidth: 0,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    flexWrap: 'wrap',
    marginBottom: spacing.md,
  },
  timeline: {
    gap: spacing.md,
  },
  historyLoadMore: {
    marginTop: spacing.sm,
    alignItems: 'flex-start',
  },
  timelineItem: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    padding: spacing.md,
    flexDirection: 'row',
    gap: spacing.md,
  },
  timelineMarkerColumn: {
    alignItems: 'center',
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 999,
    marginTop: 4,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginTop: 8,
  },
  timelineContent: {
    flex: 1,
    gap: 4,
  },
  timelineTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  scrollCueWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  scrollCueSurface: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  scrollCuePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  scrollCueText: {
    ...textStyles.caption,
  },
  modalBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 780,
    maxHeight: '88%',
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  modalHeaderCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  modalField: {
    minWidth: 220,
    flex: 1,
    gap: spacing.xs,
  },
  modalFieldFull: {
    flexBasis: '100%',
  },
  modalLabel: {
    ...textStyles.caption,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.fontSizes.sm,
    fontFamily: lightTheme.fontSans,
    backgroundColor: 'transparent',
  },
  modalError: {
    ...textStyles.caption,
  },
  modalSection: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  modalActions: {
    marginTop: spacing.xl,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  mobileSurfaceCard: {
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
    borderWidth: 1,
  },
  hiddenTabContent: {
    display: 'none',
  },
});
