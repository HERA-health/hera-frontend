import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { z } from 'zod';
import { showAppAlert, useAppAlert, useAppAlertState } from '../../components/common/alert';
import { AnimatedPressable, Button, Card } from '../../components/common';
import { TourTarget } from '../../components/onboarding/TourTarget';
import { useProfessionalTourAutoStart } from '../../components/onboarding/professionalTourContext';
import { ManagedSessionSchedulerModal } from '../../components/professional/ManagedSessionSchedulerModal';
import { borderRadius, layout, shadows, spacing, typography } from '../../constants/colors';
import type { RootStackParamList } from '../../constants/types';
import type { Theme } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { getErrorCode, getErrorMessage } from '../../constants/errors';
import * as clinicalService from '../../services/clinicalService';
import * as professionalService from '../../services/professionalService';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'ProfessionalClients'>;
type SourceFilter = professionalService.ClientSource | 'ALL';
type LifecycleFilter = professionalService.ClientLifecycleFilter;

const managedClientSchema = z.object({
  firstName: z.string().trim().min(2, 'Introduce el nombre'),
  lastName: z.string().trim().min(2, 'Introduce los apellidos'),
  email: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || '')
    .refine((value) => value.length === 0 || z.string().email().safeParse(value).success, {
      message: 'Introduce un email válido',
    }),
  phone: z.string().trim().optional().transform((value) => value || ''),
  billingFullName: z.string().trim().optional().transform((value) => value || ''),
  billingTaxId: z.string().trim().optional().transform((value) => value || ''),
  billingAddress: z.string().trim().optional().transform((value) => value || ''),
  billingPostalCode: z.string().trim().optional().transform((value) => value || ''),
  billingCity: z.string().trim().optional().transform((value) => value || ''),
  billingCountry: z.string().trim().optional().transform((value) => value || 'Spain'),
  consentOnFile: z.boolean().refine((value) => value === true, {
    message: 'Debes confirmar que dispones del consentimiento informado',
  }),
});

type ManagedClientForm = z.infer<typeof managedClientSchema>;

const FILTERS: Array<{ label: string; value: SourceFilter }> = [
  { label: 'Todos', value: 'ALL' },
  { label: 'Registrados', value: 'REGISTERED' },
  { label: 'Gestionados', value: 'MANAGED' },
];

const LIFECYCLE_FILTERS: Array<{ label: string; value: LifecycleFilter }> = [
  { label: 'Activos', value: 'ACTIVE' },
  { label: 'Archivados', value: 'ARCHIVED' },
  { label: 'Todos', value: 'ALL' },
];

const emptyForm: ManagedClientForm = {
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
  consentOnFile: false,
};

const textStyles = {
  caption: { fontSize: typography.fontSizes.xs, lineHeight: 18 },
  bodySmall: { fontSize: typography.fontSizes.sm, lineHeight: 21 },
  body: { fontSize: typography.fontSizes.md, lineHeight: 24 },
  h4: { fontSize: typography.fontSizes.xl, lineHeight: 28 },
  h3: { fontSize: typography.fontSizes.xxl, lineHeight: 32 },
  h1: { fontSize: typography.fontSizes.xxxxl, lineHeight: 40 },
};

const formatDate = (date?: string | Date | null, options?: Intl.DateTimeFormatOptions) => {
  if (!date) {
    return 'Sin fecha';
  }

  return new Date(date).toLocaleDateString('es-ES', options || {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const getConsentLabel = (client: professionalService.Client): string => {
  if (client.consentOnFile) {
    return 'Consentimiento vigente';
  }

  return 'Pendiente de consentimiento';
};

const getConsentTone = (
  client: professionalService.Client,
  theme: Theme
): { backgroundColor: string; color: string } =>
  client.consentOnFile
    ? { backgroundColor: theme.success + '18', color: theme.success }
    : { backgroundColor: theme.warning + '18', color: theme.warning };

const getSessionCountLabel = (count: number): string =>
  count === 1 ? 'sesión' : 'sesiones';

function SegmentedFilterGroup<T extends string>({
  label,
  options,
  activeValue,
  onChange,
  theme,
}: {
  label: string;
  options: Array<{ label: string; value: T }>;
  activeValue: T;
  onChange: (value: T) => void;
  theme: Theme;
}) {
  return (
    <View style={styles.segmentedGroup}>
      <Text style={[styles.segmentedLabel, { color: theme.textMuted }]}>{label}</Text>
      <View
        style={[
          styles.segmentedTrack,
          {
            backgroundColor: theme.bgMuted,
            borderColor: theme.border,
          },
        ]}
      >
        {options.map((option) => {
          const active = option.value === activeValue;

          return (
            <AnimatedPressable
              key={option.value}
              onPress={() => onChange(option.value)}
              hoverLift={false}
              pressScale={0.98}
              style={[
                styles.segmentedOption,
                active && {
                  backgroundColor: theme.bgCard,
                  borderColor: theme.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.segmentedOptionText,
                  { color: active ? theme.textPrimary : theme.textSecondary },
                ]}
              >
                {option.label}
              </Text>
            </AnimatedPressable>
          );
        })}
      </View>
    </View>
  );
}

function MetricCard({
  icon,
  label,
  value,
  theme,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  theme: Theme;
}) {
  return (
    <Card variant="default" padding="large" style={styles.metricCard}>
      <View style={[styles.metricIconWrap, { backgroundColor: theme.primary + '16' }]}>
        <Ionicons name={icon} size={18} color={theme.primary} />
      </View>
      <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>{label}</Text>
      <Text style={[styles.metricValue, { color: theme.textPrimary }]}>{value}</Text>
    </Card>
  );
}

export function ProfessionalClientsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const appAlert = useAppAlert();
  const { isVisible: isAppAlertVisible } = useAppAlertState();
  const { width } = useWindowDimensions();
  const { theme, isDark } = useTheme();
  const stylesForTheme = useMemo(() => createStyles(theme, isDark), [theme, isDark]);
  const isDesktop = width >= 1180;
  const isTablet = width >= 768 && width < 1180;
  const isMobile = width < 768;

  const [clients, setClients] = useState<professionalService.Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('ALL');
  const [lifecycleFilter, setLifecycleFilter] = useState<LifecycleFilter>('ACTIVE');
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [sessionModalVisible, setSessionModalVisible] = useState(false);
  const [sessionSaving, setSessionSaving] = useState(false);
  const [selectedSessionClient, setSelectedSessionClient] = useState<professionalService.Client | null>(null);
  const [hasAcceptedDpa, setHasAcceptedDpa] = useState<boolean | null>(null);
  const [dpaStatusLoading, setDpaStatusLoading] = useState(true);
  const [dpaSubmitting, setDpaSubmitting] = useState(false);
  const [form, setForm] = useState<ManagedClientForm>(emptyForm);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof ManagedClientForm, string>>>({});

  const gridColumns = isDesktop ? 3 : isTablet ? 2 : 1;
  const gridItemWidth = isDesktop ? '31.8%' : isTablet ? '48.8%' : '100%';

  const loadClients = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await professionalService.getProfessionalClients(sourceFilter, lifecycleFilter);
      setClients(data);
    } catch (loadError: unknown) {
      setError(getErrorMessage(loadError, 'No se pudo cargar tu base de pacientes'));
    } finally {
      setLoading(false);
    }
  }, [lifecycleFilter, sourceFilter]);

  const loadClinicalAccessStatus = useCallback(async () => {
    try {
      setDpaStatusLoading(true);
      const status = await clinicalService.getClinicalAccessStatus();
      const accepted = clinicalService.hasAcceptedCurrentDataProcessingAgreement(status);
      setHasAcceptedDpa(accepted);
      return accepted;
    } catch (statusError: unknown) {
      setHasAcceptedDpa(null);
      setError(getErrorMessage(statusError, 'No se pudo comprobar el encargo de tratamiento'));
      return null;
    } finally {
      setDpaStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadClients();
  }, [loadClients]);

  useEffect(() => {
    void loadClinicalAccessStatus();
  }, [loadClinicalAccessStatus]);

  useProfessionalTourAutoStart(
    'professional_clients_v1',
    !loading && !error && !modalVisible && !sessionModalVisible && !isAppAlertVisible,
  );

  const filteredClients = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return clients.filter((client) => {
      if (!query) {
        return true;
      }

      const haystacks = [
        client.displayName,
        client.primaryEmail,
        client.primaryPhone,
        client.user?.email,
      ]
        .filter(Boolean)
        .map((value) => value!.toLowerCase());

      return haystacks.some((value) => value.includes(query));
    });
  }, [clients, searchQuery]);

  const resetForm = () => {
    setForm(emptyForm);
    setFormErrors({});
  };

  const openManagedClientForm = (options: { reset?: boolean } = {}) => {
    if (options.reset !== false) {
      resetForm();
    }
    setModalVisible(true);
  };

  const updateFormField = <K extends keyof ManagedClientForm>(field: K, value: ManagedClientForm[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
    setFormErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleAcceptDataProcessingAgreement = async (
    options: { openFormAfterAccept?: boolean; resetFormBeforeOpen?: boolean } = {}
  ) => {
    try {
      setDpaSubmitting(true);
      setError(null);
      await clinicalService.acceptDataProcessingAgreement();
      setHasAcceptedDpa(true);

      if (options.openFormAfterAccept) {
        openManagedClientForm({ reset: options.resetFormBeforeOpen });
        return;
      }

      showAppAlert(appAlert, 'Encargo aceptado', 'Ya puedes crear pacientes gestionados desde esta pantalla.');
    } catch (acceptError: unknown) {
      showAppAlert(
        appAlert,
        'No se pudo aceptar el encargo',
        getErrorMessage(acceptError, 'No se pudo aceptar el encargo de tratamiento')
      );
    } finally {
      setDpaSubmitting(false);
    }
  };

  const promptDataProcessingAgreement = async (
    options: { openFormAfterAccept?: boolean; resetFormBeforeOpen?: boolean } = {}
  ) => {
    const action = await appAlert.choose<'accept' | 'cancel'>({
      title: 'Encargo de tratamiento',
      tone: 'info',
      dismissible: true,
      message:
        'Antes de crear pacientes gestionados, HERA necesita registrar que aceptas el encargo de tratamiento vigente.\n\n' +
        'Este acuerdo permite que HERA trate los datos que introduzcas siguiendo tus instrucciones como profesional, con medidas de seguridad y confidencialidad. No sustituye al consentimiento informado del paciente ni te obliga a crear una historia clínica; solo habilita el uso seguro de pacientes gestionados en HERA.',
      actions: [
        { label: 'Ahora no', value: 'cancel', role: 'cancel' },
        { label: 'Aceptar y continuar', value: 'accept', role: 'confirm' },
      ],
    });

    if (action === 'accept') {
      await handleAcceptDataProcessingAgreement(options);
    }
  };

  const promptDataProcessingStatusRetry = async () => {
    const action = await appAlert.choose<'retry' | 'cancel'>({
      title: 'Comprobación pendiente',
      tone: 'warning',
      dismissible: true,
      message:
        'Antes de crear pacientes gestionados tenemos que comprobar si ya aceptaste el encargo de tratamiento vigente. Si la conexión falló hace un momento, puedes reintentarlo ahora.',
      actions: [
        { label: 'Cancelar', value: 'cancel', role: 'cancel' },
        { label: 'Reintentar', value: 'retry', role: 'confirm' },
      ],
    });

    if (action !== 'retry') {
      return;
    }

    const accepted = await loadClinicalAccessStatus();
    if (accepted === true) {
      openManagedClientForm();
      return;
    }

    if (accepted === false) {
      await promptDataProcessingAgreement({ openFormAfterAccept: true });
    }
  };

  const openManagedClientModal = () => {
    if (dpaStatusLoading) {
      void appAlert.info({
        title: 'Comprobando encargo',
        message: 'Estamos comprobando el estado del encargo de tratamiento. Inténtalo de nuevo en unos segundos.',
      });
      return;
    }

    if (hasAcceptedDpa === false) {
      void promptDataProcessingAgreement({ openFormAfterAccept: true });
      return;
    }

    if (hasAcceptedDpa === null) {
      void promptDataProcessingStatusRetry();
      return;
    }

    openManagedClientForm();
  };

  const handleCreateManagedClient = async () => {
    try {
      setSaving(true);
      setFormErrors({});

      const parsed = managedClientSchema.parse(form);
      const created = await professionalService.createManagedClient({
        ...parsed,
        consentOnFile: true,
        consentVersion: 'v1',
      });

      setClients((current) => [created, ...current]);
      setModalVisible(false);
      resetForm();
    } catch (createError: unknown) {
      if (createError instanceof z.ZodError) {
        const nextErrors: Partial<Record<keyof ManagedClientForm, string>> = {};
        createError.issues.forEach((issue) => {
          const field = issue.path[0] as keyof ManagedClientForm | undefined;
          if (field) {
            nextErrors[field] = issue.message;
          }
        });
        setFormErrors(nextErrors);
        return;
      }

      const errorCode = getErrorCode(createError);
      if (errorCode === 'DATA_PROCESSING_AGREEMENT_REQUIRED') {
        setHasAcceptedDpa(false);
        setModalVisible(false);
        void promptDataProcessingAgreement({
          openFormAfterAccept: true,
          resetFormBeforeOpen: false,
        });
        return;
      }

      setError(getErrorMessage(createError, 'No se pudo crear el paciente gestionado'));
    } finally {
      setSaving(false);
    }
  };

  const openSessionScheduler = (client: professionalService.Client) => {
    if (client.source !== 'MANAGED' || client.archivedAt) {
      return;
    }

    setSelectedSessionClient(client);
    setSessionModalVisible(true);
  };

  const closeSessionScheduler = () => {
    if (sessionSaving) return;
    setSessionModalVisible(false);
    setSelectedSessionClient(null);
  };

  const handleCreateManagedSession = async (
    input: professionalService.CreateManagedClientSessionInput
  ) => {
    try {
      setSessionSaving(true);
      await professionalService.createManagedClientSession(input);
      setSessionModalVisible(false);
      setSelectedSessionClient(null);
      showAppAlert(appAlert, 'Cita creada', 'La cita se ha programado correctamente.');
      await loadClients();
    } catch (createError: unknown) {
      const message = getErrorMessage(createError, 'No se pudo crear la cita');
      showAppAlert(appAlert, 'No se pudo crear la cita', message);
    } finally {
      setSessionSaving(false);
    }
  };

  const renderClientCard = (client: professionalService.Client) => {
    const consentTone = getConsentTone(client, theme);
    const sessionCount = client.sessions?.length || 0;
    const nextSession = client.sessions
      ?.filter((session) => new Date(session.date).getTime() > Date.now())
      .sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime())[0];
    const nextSessionValue = nextSession
      ? formatDate(nextSession.date, { day: 'numeric', month: 'short' })
      : 'Sin cita';

    return (
      <Card
        key={client.id}
        variant="default"
        padding="medium"
        hoverLift
        style={stylesForTheme.clientCard}
      >
        <View style={stylesForTheme.clientHeader}>
          <View style={[stylesForTheme.avatar, { backgroundColor: theme.primary + '14' }]}>
            {client.user?.avatar ? (
              <Image
                source={{ uri: client.user.avatar }}
                style={stylesForTheme.avatarImage}
              />
            ) : (
              <Text style={[stylesForTheme.avatarText, { color: theme.primary }]}>
                {client.initials || client.displayName?.slice(0, 1) || 'P'}
              </Text>
            )}
          </View>

          <View style={stylesForTheme.clientHeaderInfo}>
            <View style={stylesForTheme.badgeRow}>
              <View
                style={[
                  stylesForTheme.sourceBadge,
                  {
                    backgroundColor:
                      client.source === 'MANAGED' ? theme.secondary + '16' : theme.primary + '12',
                  },
                ]}
              >
                <Text
                  style={[
                    stylesForTheme.sourceBadgeText,
                    { color: client.source === 'MANAGED' ? theme.secondary : theme.primary },
                  ]}
                >
                  {client.source === 'MANAGED' ? 'Gestionado' : 'Registrado'}
                </Text>
              </View>
              {client.archivedAt ? (
                <View
                  style={[
                    stylesForTheme.sourceBadge,
                    { backgroundColor: theme.textMuted + '14' },
                  ]}
                >
                  <Text style={[stylesForTheme.sourceBadgeText, { color: theme.textMuted }]}>
                    Archivado
                  </Text>
                </View>
              ) : null}
              <View style={[stylesForTheme.consentBadge, { backgroundColor: consentTone.backgroundColor }]}>
                <Text style={[stylesForTheme.consentBadgeText, { color: consentTone.color }]}>
                  {getConsentLabel(client)}
                </Text>
              </View>
            </View>

            <Text style={[stylesForTheme.clientName, { color: theme.textPrimary }]}>
              {client.displayName || client.user?.name || 'Paciente'}
            </Text>
            <Text style={[stylesForTheme.clientMeta, { color: theme.textSecondary }]}>
              {client.primaryEmail || 'Sin email registrado'}
            </Text>

            <View style={stylesForTheme.quickFactsRow}>
              <View
                style={[
                  stylesForTheme.quickFactPill,
                  { backgroundColor: theme.bgMuted, borderColor: theme.border },
                ]}
              >
                <Ionicons name="albums-outline" size={13} color={theme.textMuted} />
                <Text style={[stylesForTheme.quickFactText, { color: theme.textSecondary }]} numberOfLines={1}>
                  <Text style={[stylesForTheme.quickFactValue, { color: theme.textPrimary }]}>
                    {sessionCount}
                  </Text>
                  {` ${getSessionCountLabel(sessionCount)}`}
                </Text>
              </View>

              <View
                style={[
                  stylesForTheme.quickFactPill,
                  { backgroundColor: theme.bgMuted, borderColor: theme.border },
                ]}
              >
                <Ionicons name="calendar-outline" size={13} color={theme.textMuted} />
                <Text style={[stylesForTheme.quickFactText, { color: theme.textSecondary }]} numberOfLines={1}>
                  {nextSession ? 'Próx. ' : ''}
                  <Text style={[stylesForTheme.quickFactValue, { color: theme.textPrimary }]}>
                    {nextSessionValue}
                  </Text>
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={stylesForTheme.infoRow}>
          <Ionicons name="call-outline" size={16} color={theme.textMuted} />
          <Text style={[stylesForTheme.infoText, { color: theme.textSecondary }]}>
            {client.primaryPhone || 'Sin teléfono'}
          </Text>
        </View>

        <View style={stylesForTheme.cardActions}>
          <View style={stylesForTheme.cardActionItem}>
            <Button
              variant="outline"
              size="small"
              onPress={() => navigation.navigate('ClientProfile', { clientId: client.id })}
              icon={<Ionicons name="person-circle-outline" size={16} color={theme.primary} />}
              fullWidth
            >
              Ver ficha
            </Button>
          </View>
          {client.source === 'MANAGED' && !client.archivedAt ? (
            <View style={stylesForTheme.cardActionItem}>
              <Button
                variant="secondary"
                size="small"
                onPress={() => openSessionScheduler(client)}
                icon={<Ionicons name="calendar-outline" size={16} color={theme.secondaryDark} />}
                fullWidth
              >
                Crear cita
              </Button>
            </View>
          ) : null}
        </View>
      </Card>
    );
  };

  const renderClientGrid = () => {
    const rows = [];

    for (let i = 0; i < filteredClients.length; i += gridColumns) {
      const rowItems = filteredClients.slice(i, i + gridColumns);
      rows.push(
        <View key={`row-${i}`} style={stylesForTheme.gridRow}>
          {rowItems.map((client) => (
            <View key={client.id} style={[stylesForTheme.gridItem, { width: gridItemWidth }]}>
              {renderClientCard(client)}
            </View>
          ))}
        </View>
      );
    }

    return rows;
  };

  return (
    <>
      <ScrollView
        style={[stylesForTheme.screen, { backgroundColor: theme.bg }]}
        contentContainerStyle={[
          stylesForTheme.content,
          width < 720 ? stylesForTheme.contentCompact : null,
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[stylesForTheme.hero, isMobile ? stylesForTheme.heroMobile : null]}>
          <View style={[stylesForTheme.heroTextBlock, isMobile ? stylesForTheme.heroMobileTextBlock : null]}>
            <Text style={[stylesForTheme.title, { color: theme.textPrimary }]}>Mis pacientes</Text>
          </View>

          <TourTarget
            id="professional.clients.new-patient"
            fill
            style={isMobile ? stylesForTheme.fullWidthTourTarget : undefined}
          >
            <Button
              variant="primary"
              size="large"
              onPress={openManagedClientModal}
              icon={<Ionicons name="add" size={18} color={theme.textOnPrimary} />}
              fullWidth={isMobile}
              disabled={dpaSubmitting}
              loading={dpaSubmitting}
            >
              Nuevo paciente
            </Button>
          </TourTarget>
        </View>

        <TourTarget id="professional.clients.filters" fill style={stylesForTheme.fullWidthTourTarget}>
          <Card variant="default" padding="large" style={stylesForTheme.toolbarCard}>
          <View style={stylesForTheme.searchRow}>
            <View style={[stylesForTheme.searchField, { borderColor: theme.border, backgroundColor: theme.bgMuted }]}>
              <Ionicons name="search-outline" size={18} color={theme.textMuted} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Buscar por nombre, email o teléfono"
                placeholderTextColor={theme.textMuted}
                style={[stylesForTheme.searchInput, { color: theme.textPrimary }]}
              />
            </View>
          </View>

          <View style={stylesForTheme.filtersBar}>
            <SegmentedFilterGroup
              label="Tipo"
              options={FILTERS}
              activeValue={sourceFilter}
              onChange={setSourceFilter}
              theme={theme}
            />
            <SegmentedFilterGroup
              label="Estado"
              options={LIFECYCLE_FILTERS}
              activeValue={lifecycleFilter}
              onChange={setLifecycleFilter}
              theme={theme}
            />
          </View>
          </Card>
        </TourTarget>

        {error ? (
          <Card variant="outlined" padding="large" style={stylesForTheme.errorCard}>
            <View style={stylesForTheme.errorRow}>
              <Ionicons name="alert-circle-outline" size={20} color={theme.warning} />
              <Text style={[stylesForTheme.errorText, { color: theme.textSecondary }]}>{error}</Text>
            </View>
          </Card>
        ) : null}

        <TourTarget id="professional.clients.grid" fill style={stylesForTheme.fullWidthTourTarget}>
          {loading ? (
            <View style={stylesForTheme.loadingState}>
              <ActivityIndicator size="large" color={theme.primary} />
              <Text style={[stylesForTheme.loadingText, { color: theme.textSecondary }]}>
                Cargando pacientes...
              </Text>
            </View>
          ) : filteredClients.length === 0 ? (
            <Card variant="outlined" padding="large" style={stylesForTheme.emptyCard}>
                <Ionicons name="people-outline" size={28} color={theme.textMuted} />
              <Text style={[stylesForTheme.emptyTitle, { color: theme.textPrimary }]}>
                No hay pacientes para este filtro
              </Text>
              <Text style={[stylesForTheme.emptyText, { color: theme.textSecondary }]}>
                {lifecycleFilter === 'ARCHIVED'
                  ? 'Todavía no tienes pacientes archivados con este filtro.'
                  : 'Puedes crear un paciente gestionado o cambiar los filtros para ver tu base completa.'}
              </Text>
            </Card>
          ) : (
            <View style={stylesForTheme.clientsGrid}>{renderClientGrid()}</View>
          )}
        </TourTarget>
      </ScrollView>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={stylesForTheme.modalBackdrop}>
          <Card
            variant="default"
            padding="none"
            style={isMobile ? [stylesForTheme.modalCard, stylesForTheme.modalCardMobile] : stylesForTheme.modalCard}
          >
            <ScrollView
              contentContainerStyle={stylesForTheme.modalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={stylesForTheme.modalHeader}>
                <View style={stylesForTheme.modalHeaderCopy}>
                  <Text style={[stylesForTheme.modalTitle, { color: theme.textPrimary }]}>Nuevo paciente gestionado</Text>
                  <Text style={[stylesForTheme.modalSubtitle, { color: theme.textSecondary }]}>
                    Crea una ficha administrativa mínima. El expediente clínico permanecerá pendiente hasta adjuntar el consentimiento firmado y desbloquear el área clínica.
                  </Text>
                </View>
                <AnimatedPressable
                  onPress={() => setModalVisible(false)}
                  hoverLift={false}
                  pressScale={0.96}
                  style={[stylesForTheme.closeButton, { backgroundColor: theme.bgMuted }]}
                >
                  <Ionicons name="close" size={18} color={theme.textSecondary} />
                </AnimatedPressable>
              </View>

              <View style={[stylesForTheme.formGrid, isMobile ? stylesForTheme.formGridMobile : null]}>
                <View style={stylesForTheme.field}>
                  <Text style={[stylesForTheme.fieldLabel, { color: theme.textSecondary }]}>Nombre</Text>
                  <TextInput
                    value={form.firstName}
                    onChangeText={(value) => updateFormField('firstName', value)}
                    style={[stylesForTheme.input, { color: theme.textPrimary, borderColor: formErrors.firstName ? theme.error : theme.border }]}
                    placeholder="Nombre"
                    placeholderTextColor={theme.textMuted}
                  />
                  {formErrors.firstName ? (
                    <Text style={[stylesForTheme.fieldError, { color: theme.error }]}>{formErrors.firstName}</Text>
                  ) : null}
                </View>

                <View style={stylesForTheme.field}>
                  <Text style={[stylesForTheme.fieldLabel, { color: theme.textSecondary }]}>Apellidos</Text>
                  <TextInput
                    value={form.lastName}
                    onChangeText={(value) => updateFormField('lastName', value)}
                    style={[stylesForTheme.input, { color: theme.textPrimary, borderColor: formErrors.lastName ? theme.error : theme.border }]}
                    placeholder="Apellidos"
                    placeholderTextColor={theme.textMuted}
                  />
                  {formErrors.lastName ? (
                    <Text style={[stylesForTheme.fieldError, { color: theme.error }]}>{formErrors.lastName}</Text>
                  ) : null}
                </View>

                <View style={stylesForTheme.field}>
                  <Text style={[stylesForTheme.fieldLabel, { color: theme.textSecondary }]}>Email</Text>
                  <TextInput
                    value={form.email}
                    onChangeText={(value) => updateFormField('email', value)}
                    style={[stylesForTheme.input, { color: theme.textPrimary, borderColor: formErrors.email ? theme.error : theme.border }]}
                    placeholder="Email opcional"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    placeholderTextColor={theme.textMuted}
                  />
                  {formErrors.email ? (
                    <Text style={[stylesForTheme.fieldError, { color: theme.error }]}>{formErrors.email}</Text>
                  ) : null}
                </View>

                <View style={stylesForTheme.field}>
                  <Text style={[stylesForTheme.fieldLabel, { color: theme.textSecondary }]}>Teléfono</Text>
                  <TextInput
                    value={form.phone}
                    onChangeText={(value) => updateFormField('phone', value)}
                    style={[stylesForTheme.input, { color: theme.textPrimary, borderColor: formErrors.phone ? theme.error : theme.border }]}
                    placeholder="Teléfono opcional"
                    keyboardType="phone-pad"
                    placeholderTextColor={theme.textMuted}
                  />
                  {formErrors.phone ? (
                    <Text style={[stylesForTheme.fieldError, { color: theme.error }]}>{formErrors.phone}</Text>
                  ) : null}
                </View>

                <View style={[stylesForTheme.field, { flexBasis: '100%' }]}>
                  <Text style={[stylesForTheme.fieldLabel, { color: theme.textSecondary }]}>
                    Datos fiscales para factura completa
                  </Text>
                  <Text style={[stylesForTheme.fieldHint, { color: theme.textMuted }]}>
                    Opcional. Puedes dejarlo preparado ahora o completarlo más adelante desde la ficha del paciente.
                  </Text>
                </View>

                <View style={stylesForTheme.field}>
                  <Text style={[stylesForTheme.fieldLabel, { color: theme.textSecondary }]}>Nombre fiscal</Text>
                  <TextInput
                    value={form.billingFullName}
                    onChangeText={(value) => updateFormField('billingFullName', value)}
                    style={[stylesForTheme.input, { color: theme.textPrimary, borderColor: theme.border }]}
                    placeholder="Nombre y apellidos"
                    placeholderTextColor={theme.textMuted}
                  />
                </View>

                <View style={stylesForTheme.field}>
                  <Text style={[stylesForTheme.fieldLabel, { color: theme.textSecondary }]}>NIF/NIE</Text>
                  <TextInput
                    value={form.billingTaxId}
                    onChangeText={(value) => updateFormField('billingTaxId', value)}
                    style={[stylesForTheme.input, { color: theme.textPrimary, borderColor: theme.border }]}
                    placeholder="12345678A"
                    autoCapitalize="characters"
                    placeholderTextColor={theme.textMuted}
                  />
                </View>

                <View style={[stylesForTheme.field, { flexBasis: '100%' }]}>
                  <Text style={[stylesForTheme.fieldLabel, { color: theme.textSecondary }]}>Dirección fiscal</Text>
                  <TextInput
                    value={form.billingAddress}
                    onChangeText={(value) => updateFormField('billingAddress', value)}
                    style={[stylesForTheme.input, { color: theme.textPrimary, borderColor: theme.border }]}
                    placeholder="Calle, número, piso..."
                    placeholderTextColor={theme.textMuted}
                  />
                </View>

                <View style={stylesForTheme.field}>
                  <Text style={[stylesForTheme.fieldLabel, { color: theme.textSecondary }]}>Código postal</Text>
                  <TextInput
                    value={form.billingPostalCode}
                    onChangeText={(value) => updateFormField('billingPostalCode', value)}
                    style={[stylesForTheme.input, { color: theme.textPrimary, borderColor: theme.border }]}
                    placeholder="28001"
                    placeholderTextColor={theme.textMuted}
                  />
                </View>

                <View style={stylesForTheme.field}>
                  <Text style={[stylesForTheme.fieldLabel, { color: theme.textSecondary }]}>Ciudad</Text>
                  <TextInput
                    value={form.billingCity}
                    onChangeText={(value) => updateFormField('billingCity', value)}
                    style={[stylesForTheme.input, { color: theme.textPrimary, borderColor: theme.border }]}
                    placeholder="Madrid"
                    placeholderTextColor={theme.textMuted}
                  />
                </View>

                <View style={stylesForTheme.field}>
                  <Text style={[stylesForTheme.fieldLabel, { color: theme.textSecondary }]}>País</Text>
                  <TextInput
                    value={form.billingCountry}
                    onChangeText={(value) => updateFormField('billingCountry', value)}
                    style={[stylesForTheme.input, { color: theme.textPrimary, borderColor: theme.border }]}
                    placeholder="Spain"
                    placeholderTextColor={theme.textMuted}
                  />
                </View>
              </View>

              <View style={[stylesForTheme.consentPanel, { backgroundColor: theme.bgMuted, borderColor: theme.border }]}>
                <View style={stylesForTheme.consentPanelCopy}>
                  <Text style={[stylesForTheme.consentPanelTitle, { color: theme.textPrimary }]}>
                    Declaración previa del profesional
                  </Text>
                  <Text style={[stylesForTheme.consentPanelText, { color: theme.textSecondary }]}>
                    Confirmas que cuentas con el consentimiento informado y que adjuntarás el documento firmado en el área clínica antes de activar el expediente.
                  </Text>
                </View>
                <Switch
                  value={form.consentOnFile}
                  onValueChange={(value) => updateFormField('consentOnFile', value)}
                  trackColor={{ false: theme.border, true: theme.primary }}
                  thumbColor={theme.textOnPrimary}
                />
              </View>
              {formErrors.consentOnFile ? (
                <Text style={[stylesForTheme.fieldError, { color: theme.error }]}>{formErrors.consentOnFile}</Text>
              ) : null}

              <View style={[stylesForTheme.modalActions, isMobile ? stylesForTheme.modalActionsMobile : null]}>
                <Button variant="ghost" size="medium" onPress={() => setModalVisible(false)} fullWidth={isMobile}>
                  Cancelar
                </Button>
                <Button variant="primary" size="medium" onPress={handleCreateManagedClient} loading={saving} fullWidth={isMobile}>
                  Crear paciente
                </Button>
              </View>
            </ScrollView>
          </Card>
        </View>
      </Modal>

      <ManagedSessionSchedulerModal
        visible={sessionModalVisible}
        clients={selectedSessionClient ? [selectedSessionClient] : []}
        initialClientId={selectedSessionClient?.id}
        saving={sessionSaving}
        onClose={closeSessionScheduler}
        onSubmit={handleCreateManagedSession}
      />
    </>
  );
}

const styles = StyleSheet.create({
  segmentedGroup: {
    gap: 6,
    minWidth: 220,
  },
  segmentedLabel: {
    ...textStyles.caption,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  segmentedTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  segmentedOption: {
    minHeight: 34,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentedOptionText: {
    ...textStyles.bodySmall,
    fontWeight: '700',
  },
  metricCard: {
    flex: 1,
    minWidth: 170,
  },
  metricIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  metricLabel: {
    ...textStyles.caption,
    marginBottom: 6,
  },
  metricValue: {
    ...textStyles.h3,
    fontWeight: '700',
  },
});

const createStyles = (theme: Theme, isDark: boolean) =>
  StyleSheet.create({
    screen: {
      flex: 1,
    },
    content: {
      padding: spacing.lg,
      paddingTop: spacing.md,
      gap: spacing.lg,
      paddingBottom: spacing.xxl,
      maxWidth: 1320,
      width: '100%',
      alignSelf: 'center',
    },
    contentCompact: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
    },
    hero: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: spacing.lg,
      alignItems: 'flex-end',
      flexWrap: 'wrap',
    },
    heroMobile: {
      paddingLeft: layout.mobileShellCompactLeftInset,
      alignItems: 'stretch',
      gap: spacing.md,
    },
    heroTextBlock: {
      flex: 1,
      minWidth: 280,
    },
    heroMobileTextBlock: {
      minWidth: 0,
    },
    title: {
      ...textStyles.h1,
      fontWeight: '700',
    },
    toolbarCard: {
      gap: spacing.md,
    },
    fullWidthTourTarget: {
      width: '100%',
    },
    searchRow: {
      flexDirection: 'row',
      gap: spacing.md,
      flexWrap: 'wrap',
    },
    searchField: {
      minHeight: 52,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      paddingHorizontal: spacing.md,
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.sm,
      flex: 1,
      minWidth: 260,
    },
    searchInput: {
      flex: 1,
      ...textStyles.body,
      minHeight: 44,
    },
    filterRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    filtersBar: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
      alignItems: 'flex-start',
    },
    errorCard: {
      borderColor: theme.warning + '35',
      backgroundColor: isDark ? theme.bgMuted : '#FFF7EC',
    },
    errorRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      alignItems: 'center',
    },
    errorText: {
      ...textStyles.body,
      flex: 1,
    },
    loadingState: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.md,
      paddingVertical: spacing.xxl,
    },
    loadingText: {
      ...textStyles.body,
    },
    emptyCard: {
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.xxl,
    },
    emptyTitle: {
      ...textStyles.h4,
      fontWeight: '700',
    },
    emptyText: {
      ...textStyles.body,
      maxWidth: 520,
      textAlign: 'center',
    },
    clientsGrid: {
      gap: spacing.md,
    },
    gridRow: {
      flexDirection: 'row',
      gap: spacing.md,
      alignItems: 'stretch',
    },
    gridItem: {
      alignSelf: 'stretch',
    },
    clientCard: {
      gap: spacing.sm + 2,
      minWidth: 0,
      height: '100%',
    },
    clientHeader: {
      flexDirection: 'row',
      gap: spacing.sm + 2,
      alignItems: 'flex-start',
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    avatarImage: {
      width: '100%',
      height: '100%',
      borderRadius: 16,
    },
    avatarText: {
      ...textStyles.body,
      fontWeight: '700',
    },
    clientHeaderInfo: {
      flex: 1,
      minWidth: 0,
      gap: 5,
    },
    badgeRow: {
      flexDirection: 'row',
      gap: 6,
      flexWrap: 'wrap',
    },
    sourceBadge: {
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: 999,
    },
    sourceBadgeText: {
      ...textStyles.caption,
      fontWeight: '700',
    },
    consentBadge: {
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: 999,
    },
    consentBadgeText: {
      ...textStyles.caption,
      fontWeight: '700',
    },
    clientName: {
      ...textStyles.h4,
      fontWeight: '700',
    },
    clientMeta: {
      ...textStyles.bodySmall,
    },
    quickFactsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 2,
    },
    quickFactPill: {
      minHeight: 28,
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 8,
      paddingVertical: 5,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      maxWidth: '100%',
    },
    quickFactText: {
      ...textStyles.caption,
      flexShrink: 1,
    },
    quickFactValue: {
      fontWeight: '700',
    },
    infoRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      alignItems: 'center',
    },
    infoText: {
      ...textStyles.bodySmall,
      flex: 1,
    },
    cardActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginTop: spacing.xs,
    },
    cardActionItem: {
      flex: 1,
      minWidth: 120,
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(15, 23, 42, 0.42)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.lg,
    },
    modalCard: {
      width: '100%',
      maxWidth: 760,
      maxHeight: '92%',
    },
    modalCardMobile: {
      alignSelf: 'stretch',
      marginTop: 'auto',
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
      maxWidth: '100%',
      maxHeight: '88%',
    },
    modalScrollContent: {
      padding: spacing.lg,
      gap: spacing.lg,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: spacing.md,
      alignItems: 'flex-start',
    },
    modalHeaderCopy: {
      flex: 1,
      minWidth: 0,
    },
    modalTitle: {
      ...textStyles.h3,
      fontWeight: '700',
      marginBottom: 6,
    },
    modalSubtitle: {
      ...textStyles.bodySmall,
      lineHeight: 22,
      maxWidth: 560,
    },
    closeButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    formGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
    },
    formGridMobile: {
      flexDirection: 'column',
    },
    field: {
      minWidth: 220,
      flex: 1,
      gap: 8,
    },
    fieldLabel: {
      ...textStyles.caption,
      fontWeight: '700',
    },
    fieldHint: {
      ...textStyles.bodySmall,
      lineHeight: 20,
    },
    input: {
      minHeight: 50,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      paddingHorizontal: spacing.md,
      backgroundColor: theme.bgMuted,
      ...textStyles.body,
    },
    fieldError: {
      ...textStyles.caption,
      fontWeight: '600',
    },
    consentPanel: {
      borderRadius: borderRadius.xl,
      borderWidth: 1,
      padding: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    consentPanelCopy: {
      flex: 1,
      gap: 6,
    },
    consentPanelTitle: {
      ...textStyles.body,
      fontWeight: '700',
    },
    consentPanelText: {
      ...textStyles.bodySmall,
      lineHeight: 22,
    },
    modalActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: spacing.sm,
      flexWrap: 'wrap',
    },
    modalActionsMobile: {
      justifyContent: 'flex-start',
      flexDirection: 'column-reverse',
    },
  });
