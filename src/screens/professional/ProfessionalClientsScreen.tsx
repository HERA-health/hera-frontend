import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { z } from 'zod';
import { showAppAlert, useAppAlert, useAppAlertState } from '../../components/common/alert';
import { AnimatedPressable, Button, Card } from '../../components/common';
import { SimpleDropdown } from '../../components/common/SimpleDropdown';
import { TourTarget } from '../../components/onboarding/TourTarget';
import { useProfessionalTourAutoStart } from '../../components/onboarding/professionalTourContext';
import { ManagedSessionSchedulerModal } from '../../components/professional/ManagedSessionSchedulerModal';
import { borderRadius, layout, shadows, spacing, typography } from '../../constants/colors';
import type { RootStackParamList } from '../../constants/types';
import type { Theme } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import {
  CONTACT_METHOD_REQUIRED_MESSAGE,
  getErrorCode,
  getErrorMessage,
} from '../../constants/errors';
import * as clinicalService from '../../services/clinicalService';
import * as clinicService from '../../services/clinicService';
import { createManagedPatientWithInitialConsent } from '../../services/managedPatientConsentService';
import * as professionalService from '../../services/professionalService';
import type { UploadAsset } from '../../utils/multipartUpload';
import {
  CLINICAL_PIN_REGEX,
  CONSENT_DOCUMENT_MIME_TYPES,
  emptyManagedClientForm,
  managedClientSchema,
  type ConsentCaptureMode,
  type ManagedClientForm,
} from './managedClientFormDomain';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'ProfessionalClients'>;
type SourceFilter = professionalService.ClientSource | 'ALL';
type LifecycleFilter = professionalService.ClientLifecycleFilter;
type PatientContextKey = 'individual' | `clinic:${string}`;
type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const INDIVIDUAL_CONTEXT_KEY: PatientContextKey = 'individual';
const PROFESSIONAL_CLINIC_PATIENT_PAGE_LIMIT = 100;
const EMPTY_PROFESSIONAL_CLINIC_PATIENT_PAGE_INFO: clinicService.ClinicPatientListPageInfo = {
  page: 1,
  limit: PROFESSIONAL_CLINIC_PATIENT_PAGE_LIMIT,
  hasMore: false,
  nextPage: null,
};

const FILTERS: Array<{ label: string; value: SourceFilter }> = [
  { label: 'Todos', value: 'ALL' },
  { label: 'Autoregistrados', value: 'REGISTERED' },
  { label: 'Añadidos por mí', value: 'MANAGED' },
];

const LIFECYCLE_FILTERS: Array<{ label: string; value: LifecycleFilter }> = [
  { label: 'Activos', value: 'ACTIVE' },
  { label: 'Archivados', value: 'ARCHIVED' },
  { label: 'Todos', value: 'ALL' },
];

const emptyForm = emptyManagedClientForm;

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
): { backgroundColor: string; borderColor: string; color: string; iconName: IoniconName } => {
  const status = client.consentOnFile ? theme.status.confirmed : theme.status.pending;

  return {
    backgroundColor: status.bg,
    borderColor: status.border,
    color: status.text,
    iconName: client.consentOnFile ? 'shield-checkmark-outline' : 'time-outline',
  };
};

const getConsentDocumentName = (document: UploadAsset | null): string =>
  document?.fileName || document?.name || 'Documento seleccionado';

const pickInitialConsentDocument = async (): Promise<UploadAsset | null> => {
  const result = await DocumentPicker.getDocumentAsync({
    type: CONSENT_DOCUMENT_MIME_TYPES,
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (result.canceled || !result.assets?.length) {
    return null;
  }

  const asset = result.assets[0] as DocumentPicker.DocumentPickerAsset & UploadAsset;

  return {
    ...asset,
    fileName: asset.fileName || asset.name || null,
    name: asset.name || asset.fileName || null,
    mimeType: asset.mimeType || null,
  };
};

const getSessionCountLabel = (count: number): string =>
  count === 1 ? 'sesión' : 'sesiones';

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
      <Text style={[styles.metricLabel, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>
        {label}
      </Text>
      <Text style={[styles.metricValue, { color: theme.textPrimary, fontFamily: theme.fontHeading }]}>
        {value}
      </Text>
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
  const [professionalClinicContexts, setProfessionalClinicContexts] = useState<clinicService.ProfessionalClinicContext[]>([]);
  const [clinicContextsLoading, setClinicContextsLoading] = useState(false);
  const [clinicContextsError, setClinicContextsError] = useState<string | null>(null);
  const [activeContextKey, setActiveContextKey] = useState<PatientContextKey>(INDIVIDUAL_CONTEXT_KEY);
  const [clinicPatients, setClinicPatients] = useState<clinicService.ProfessionalClinicPatientSummary[]>([]);
  const [clinicPatientsLoading, setClinicPatientsLoading] = useState(false);
  const [clinicPatientsLoadingMore, setClinicPatientsLoadingMore] = useState(false);
  const [clinicPatientsError, setClinicPatientsError] = useState<string | null>(null);
  const [clinicPatientsPageInfo, setClinicPatientsPageInfo] =
    useState<clinicService.ClinicPatientListPageInfo>(EMPTY_PROFESSIONAL_CLINIC_PATIENT_PAGE_INFO);
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
  const [clinicalAccessStatus, setClinicalAccessStatus] = useState<clinicalService.ClinicalAccessStatus | null>(null);
  const [clinicalAccessToken, setClinicalAccessToken] = useState<string | null>(null);
  const [form, setForm] = useState<ManagedClientForm>(emptyForm);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof ManagedClientForm, string>>>({});
  const clinicalAccessTokenRef = useRef<string | null>(null);
  const clinicPatientsRequestSeqRef = useRef(0);

  const gridColumns = isDesktop ? 3 : isTablet ? 2 : 1;
  const gridItemWidth = isDesktop ? '31.8%' : isTablet ? '48.8%' : '100%';
  const activeClinicId = activeContextKey.startsWith('clinic:')
    ? activeContextKey.replace('clinic:', '')
    : null;
  const activeClinicContext = useMemo(
    () => professionalClinicContexts.find((context) => context.clinic.id === activeClinicId) ?? null,
    [activeClinicId, professionalClinicContexts],
  );
  const patientContextOptions = useMemo(
    () => [
      {
        label: 'Consulta privada',
        value: INDIVIDUAL_CONTEXT_KEY,
        subtitle: 'Pacientes propios y sesiones individuales',
      },
      ...professionalClinicContexts.map((context) => ({
        label: context.clinic.commercialName,
        value: `clinic:${context.clinic.id}` as PatientContextKey,
        subtitle: context.responsible.displayName,
      })),
    ],
    [professionalClinicContexts],
  );

  const syncClinicalAccessToken = useCallback((nextToken: string | null) => {
    clinicalAccessTokenRef.current = nextToken;
    setClinicalAccessToken(nextToken);
  }, []);
  const clinicalSessionActive = Boolean(clinicalAccessToken && clinicalAccessStatus?.session.active);
  const canAttachInitialConsent = clinicalSessionActive || Boolean(clinicalAccessStatus?.hasPin);
  const initialConsentPinRequired =
    form.consentCaptureMode === 'UPLOAD_NOW' && !clinicalSessionActive;
  const contactMethodError =
    formErrors.email === CONTACT_METHOD_REQUIRED_MESSAGE
      ? formErrors.email
      : undefined;

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

  const loadProfessionalClinicContexts = useCallback(async () => {
    try {
      setClinicContextsLoading(true);
      setClinicContextsError(null);
      const contexts = await clinicService.getMyProfessionalClinicContexts();
      setProfessionalClinicContexts(contexts);
      setActiveContextKey((currentKey) => {
        if (currentKey === INDIVIDUAL_CONTEXT_KEY) {
          return currentKey;
        }

        const currentClinicId = currentKey.replace('clinic:', '');
        return contexts.some((context) => context.clinic.id === currentClinicId)
          ? currentKey
          : INDIVIDUAL_CONTEXT_KEY;
      });
    } catch (loadError: unknown) {
      setProfessionalClinicContexts([]);
      setActiveContextKey(INDIVIDUAL_CONTEXT_KEY);
      setClinicContextsError(getErrorMessage(loadError, 'No se pudieron cargar tus clínicas'));
    } finally {
      setClinicContextsLoading(false);
    }
  }, []);

  const loadClinicPatients = useCallback(async (
    clinicId: string,
    query: string,
    options: { page?: number; append?: boolean } = {},
  ) => {
    const requestSeq = clinicPatientsRequestSeqRef.current + 1;
    clinicPatientsRequestSeqRef.current = requestSeq;
    const pageToLoad = options.page ?? 1;
    const shouldAppend = options.append === true;

    try {
      if (shouldAppend) {
        setClinicPatientsLoadingMore(true);
      } else {
        setClinicPatientsLoading(true);
      }
      setClinicPatientsError(null);
      const page = await clinicService.listProfessionalClinicPatients(clinicId, {
        search: query.trim() || undefined,
        page: pageToLoad,
        limit: PROFESSIONAL_CLINIC_PATIENT_PAGE_LIMIT,
      });

      if (clinicPatientsRequestSeqRef.current !== requestSeq) {
        return;
      }

      setClinicPatientsPageInfo(page.pageInfo);
      setClinicPatients((currentPatients) => {
        if (!shouldAppend) {
          return page.items;
        }

        const currentIds = new Set(currentPatients.map((patient) => patient.clinicPatientId));
        const nextPatients = page.items.filter((patient) => !currentIds.has(patient.clinicPatientId));
        return [...currentPatients, ...nextPatients];
      });
    } catch (loadError: unknown) {
      if (clinicPatientsRequestSeqRef.current !== requestSeq) {
        return;
      }

      if (!shouldAppend) {
        setClinicPatients([]);
        setClinicPatientsPageInfo(EMPTY_PROFESSIONAL_CLINIC_PATIENT_PAGE_INFO);
      }
      setClinicPatientsError(getErrorMessage(loadError, 'No se pudieron cargar tus pacientes de clínica'));
    } finally {
      if (clinicPatientsRequestSeqRef.current === requestSeq) {
        if (shouldAppend) {
          setClinicPatientsLoadingMore(false);
        } else {
          setClinicPatientsLoading(false);
        }
      }
    }
  }, []);

  const loadClinicalAccessStatus = useCallback(async (sessionToken?: string | null) => {
    try {
      setDpaStatusLoading(true);
      const tokenToCheck = sessionToken ?? clinicalAccessTokenRef.current;
      const status = await clinicalService.getClinicalAccessStatus(tokenToCheck || undefined);
      const accepted = clinicalService.hasAcceptedCurrentDataProcessingAgreement(status);
      setClinicalAccessStatus(status);
      setHasAcceptedDpa(accepted);
      if (tokenToCheck && !status.session.active) {
        syncClinicalAccessToken(null);
      }
      return accepted;
    } catch (statusError: unknown) {
      setHasAcceptedDpa(null);
      setClinicalAccessStatus(null);
      setError(getErrorMessage(statusError, 'No se pudo comprobar el encargo de tratamiento'));
      return null;
    } finally {
      setDpaStatusLoading(false);
    }
  }, [syncClinicalAccessToken]);

  useEffect(() => {
    void loadClients();
  }, [loadClients]);

  useEffect(() => {
    void loadProfessionalClinicContexts();
  }, [loadProfessionalClinicContexts]);

  useEffect(() => {
    clinicPatientsRequestSeqRef.current += 1;
    setClinicPatients([]);
    setClinicPatientsError(null);
    setClinicPatientsPageInfo(EMPTY_PROFESSIONAL_CLINIC_PATIENT_PAGE_INFO);
    setClinicPatientsLoadingMore(false);

    if (!activeClinicId) {
      setClinicPatientsLoading(false);
      return undefined;
    }

    setClinicPatientsLoading(true);
    const timeoutId = setTimeout(() => {
      void loadClinicPatients(activeClinicId, searchQuery, { page: 1, append: false });
    }, searchQuery.trim() ? 250 : 0);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [activeClinicId, loadClinicPatients, searchQuery]);

  useEffect(() => {
    void loadClinicalAccessStatus();
  }, [loadClinicalAccessStatus]);

  const handleLoadMoreClinicPatients = useCallback(() => {
    if (
      !activeClinicId
      || clinicPatientsLoading
      || clinicPatientsLoadingMore
      || !clinicPatientsPageInfo.hasMore
      || !clinicPatientsPageInfo.nextPage
    ) {
      return;
    }

    void loadClinicPatients(activeClinicId, searchQuery, {
      page: clinicPatientsPageInfo.nextPage,
      append: true,
    });
  }, [
    activeClinicId,
    clinicPatientsLoading,
    clinicPatientsLoadingMore,
    clinicPatientsPageInfo.hasMore,
    clinicPatientsPageInfo.nextPage,
    loadClinicPatients,
    searchQuery,
  ]);

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
    setFormErrors((current) => {
      const nextErrors = { ...current, [field]: undefined };
      if (field === 'phone' && current.email === CONTACT_METHOD_REQUIRED_MESSAGE) {
        nextErrors.email = undefined;
      }
      return nextErrors;
    });
  };

  const updateConsentCaptureMode = (mode: ConsentCaptureMode) => {
    if (mode === 'UPLOAD_NOW' && !canAttachInitialConsent) {
      setFormErrors((current) => ({
        ...current,
        consentCaptureMode:
          'Configura el PIN clínico desde el área clínica antes de adjuntar el consentimiento en el alta.',
      }));
      return;
    }

    setForm((current) => ({
      ...current,
      consentCaptureMode: mode,
      ...(mode === 'UPLOAD_LATER'
        ? { consentDocument: null, clinicalPin: '' }
        : {}),
    }));
    setFormErrors((current) => ({
      ...current,
      consentCaptureMode: undefined,
      consentDocument: undefined,
      clinicalPin: undefined,
    }));
  };

  const handlePickInitialConsentDocument = async () => {
    try {
      const document = await pickInitialConsentDocument();
      if (!document) return;

      updateFormField('consentDocument', document);
    } catch (pickError: unknown) {
      setFormErrors((current) => ({
        ...current,
        consentDocument: getErrorMessage(pickError, 'No se pudo seleccionar el documento.'),
      }));
    }
  };

  const handleRemoveInitialConsentDocument = () => {
    setForm((current) => ({ ...current, consentDocument: null }));
    setFormErrors((current) => ({ ...current, consentDocument: undefined }));
  };

  const ensureClinicalAccessForInitialConsent = async (pin: string): Promise<string> => {
    const currentToken = clinicalAccessTokenRef.current;

    if (currentToken) {
      const status = await clinicalService.getClinicalAccessStatus(currentToken);
      setClinicalAccessStatus(status);

      if (status.session.active) {
        return currentToken;
      }

      syncClinicalAccessToken(null);
    }

    const status = clinicalAccessStatus ?? await clinicalService.getClinicalAccessStatus();
    setClinicalAccessStatus(status);

    if (!status.hasPin) {
      throw new Error('Configura tu PIN clínico antes de adjuntar el consentimiento en el alta.');
    }

    if (!CLINICAL_PIN_REGEX.test(pin)) {
      throw new Error('Introduce un PIN clínico válido de 6 dígitos.');
    }

    const session = await clinicalService.unlockClinicalArea(pin);
    syncClinicalAccessToken(session.token);
    setClinicalAccessStatus((current) => current
      ? {
          ...current,
          session: {
            active: true,
            sessionId: session.sessionId,
            createdAt: new Date().toISOString(),
            absoluteExpiresAt: session.absoluteExpiresAt,
            idleExpiresAt: session.idleExpiresAt,
          },
        }
      : current);

    return session.token;
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

      showAppAlert(appAlert, 'Encargo aceptado', 'Ya puedes crear pacientes desde esta pantalla.');
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
        'Antes de crear pacientes desde tu panel, HERA necesita registrar que aceptas el encargo de tratamiento vigente.\n\n' +
        'Este acuerdo permite que HERA trate los datos que introduzcas siguiendo tus instrucciones como profesional, con medidas de seguridad y confidencialidad. No sustituye al consentimiento informado del paciente ni te obliga a crear una historia clínica; solo habilita el uso seguro de pacientes añadidos por ti en HERA.',
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
        'Antes de crear pacientes tenemos que comprobar si ya aceptaste el encargo de tratamiento vigente. Si la conexión falló hace un momento, puedes reintentarlo ahora.',
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
      setError(null);
      setFormErrors({});

      const parsed = managedClientSchema.parse(form);
      let initialConsentAccessToken: string | null = null;

      if (parsed.consentCaptureMode === 'UPLOAD_NOW') {
        if (!canAttachInitialConsent) {
          setFormErrors((current) => ({
            ...current,
            consentCaptureMode:
              'Configura el PIN clínico desde el área clínica antes de adjuntar el consentimiento en el alta.',
          }));
          return;
        }

        try {
          initialConsentAccessToken = await ensureClinicalAccessForInitialConsent(parsed.clinicalPin);
        } catch (accessError: unknown) {
          setFormErrors((current) => ({
            ...current,
            clinicalPin: getErrorMessage(accessError, 'No se pudo desbloquear el área clínica.'),
          }));
          return;
        }
      }

      const result = await createManagedPatientWithInitialConsent({
        client: {
          firstName: parsed.firstName,
          lastName: parsed.lastName,
          email: parsed.email,
          phone: parsed.phone,
          billingFullName: parsed.billingFullName,
          billingTaxId: parsed.billingTaxId,
          billingAddress: parsed.billingAddress,
          billingPostalCode: parsed.billingPostalCode,
          billingCity: parsed.billingCity,
          billingCountry: parsed.billingCountry,
          consentVersion: 'v1',
        },
        consentDocument:
          parsed.consentCaptureMode === 'UPLOAD_NOW'
            ? parsed.consentDocument
            : null,
        clinicalAccessToken: initialConsentAccessToken,
        consentVersion: 'v1',
      });

      setClients((current) => [
        result.client,
        ...current.filter((client) => client.id !== result.client.id),
      ]);
      setModalVisible(false);
      resetForm();

      if (result.consentError) {
        showAppAlert(
          appAlert,
          'Paciente creado',
          `La ficha se creó, pero no se pudo registrar el consentimiento firmado: ${getErrorMessage(
            result.consentError,
            'podrás completarlo desde el área clínica.'
          )}`
        );
        return;
      }

      if (result.consentCompleted) {
        showAppAlert(
          appAlert,
          'Consentimiento registrado',
          'Paciente creado y consentimiento firmado registrado como vigente.'
        );
      }
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

      setError(getErrorMessage(createError, 'No se pudo crear el paciente'));
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
              <View style={[
                stylesForTheme.consentBadge,
                {
                  backgroundColor: consentTone.backgroundColor,
                  borderColor: consentTone.borderColor,
                },
              ]}>
                <Ionicons name={consentTone.iconName} size={13} color={consentTone.color} />
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

  const renderClinicPatientCard = (patient: clinicService.ProfessionalClinicPatientSummary) => (
    <Card
      key={patient.clinicPatientId}
      variant="default"
      padding="medium"
      hoverLift
      style={stylesForTheme.clientCard}
    >
      <View style={stylesForTheme.clientHeader}>
        <View style={[stylesForTheme.avatar, { backgroundColor: theme.secondary + '16' }]}>
          <Text style={[stylesForTheme.avatarText, { color: theme.secondary }]}>
            {patient.displayName.slice(0, 1).toUpperCase()}
          </Text>
        </View>

        <View style={stylesForTheme.clientHeaderInfo}>
          <View style={stylesForTheme.badgeRow}>
            <View style={[stylesForTheme.sourceBadge, { backgroundColor: theme.primaryAlpha12 }]}>
              <Text style={[stylesForTheme.sourceBadgeText, { color: theme.primary }]}>
                Clínica
              </Text>
            </View>
            <View style={[stylesForTheme.sourceBadge, { backgroundColor: theme.secondary + '16' }]}>
              <Text style={[stylesForTheme.sourceBadgeText, { color: theme.secondary }]}>
                Asignado
              </Text>
            </View>
          </View>

          <Text style={[stylesForTheme.clientName, { color: theme.textPrimary }]}>
            {patient.displayName}
          </Text>
          <Text style={[stylesForTheme.clientMeta, { color: theme.textSecondary }]}>
            {patient.email ?? 'Sin email registrado'}
          </Text>

          <View style={stylesForTheme.quickFactsRow}>
            <View
              style={[
                stylesForTheme.quickFactPill,
                { backgroundColor: theme.bgMuted, borderColor: theme.border },
              ]}
            >
              <Ionicons name="business-outline" size={13} color={theme.textMuted} />
              <Text style={[stylesForTheme.quickFactText, { color: theme.textSecondary }]} numberOfLines={1}>
                {patient.clinic.name}
              </Text>
            </View>

            <View
              style={[
                stylesForTheme.quickFactPill,
                { backgroundColor: theme.bgMuted, borderColor: theme.border },
              ]}
            >
              <Ionicons name="person-outline" size={13} color={theme.textMuted} />
              <Text style={[stylesForTheme.quickFactText, { color: theme.textSecondary }]} numberOfLines={1}>
                {patient.responsible.displayName}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={stylesForTheme.infoRow}>
        <Ionicons name="call-outline" size={16} color={theme.textMuted} />
        <Text style={[stylesForTheme.infoText, { color: theme.textSecondary }]}>
          {patient.phone ?? 'Sin teléfono'}
        </Text>
      </View>

      <View style={stylesForTheme.cardActions}>
        <View style={stylesForTheme.cardActionItem}>
          <Button
            variant="outline"
            size="small"
            onPress={() => navigation.navigate('ProfessionalClinicPatientDetail', {
              clinicId: patient.clinic.id,
              clinicPatientId: patient.clinicPatientId,
            })}
            icon={<Ionicons name="person-circle-outline" size={16} color={theme.primary} />}
            fullWidth
          >
            Ver ficha
          </Button>
        </View>
      </View>
    </Card>
  );

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

  const renderClinicPatientGrid = () => {
    const rows = [];

    for (let i = 0; i < clinicPatients.length; i += gridColumns) {
      const rowItems = clinicPatients.slice(i, i + gridColumns);
      rows.push(
        <View key={`clinic-row-${i}`} style={stylesForTheme.gridRow}>
          {rowItems.map((patient) => (
            <View key={patient.clinicPatientId} style={[stylesForTheme.gridItem, { width: gridItemWidth }]}>
              {renderClinicPatientCard(patient)}
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

          {!activeClinicId ? (
            <TourTarget
              id="professional.clients.new-patient"
              fill
              style={isMobile ? stylesForTheme.fullWidthTourTarget : undefined}
            >
              <Button
                variant="primary"
                size="large"
                onPress={openManagedClientModal}
                icon={<Ionicons name="add" size={18} color={theme.actionPrimaryText} />}
                fullWidth={isMobile}
                disabled={dpaSubmitting}
                loading={dpaSubmitting}
              >
                Nuevo paciente
              </Button>
            </TourTarget>
          ) : null}
        </View>

        <TourTarget
          id="professional.clients.filters"
          fill
          style={[stylesForTheme.fullWidthTourTarget, stylesForTheme.filtersTourTarget]}
        >
          <Card variant="default" padding="large" style={stylesForTheme.toolbarCard}>
          {professionalClinicContexts.length > 0 || clinicContextsLoading || clinicContextsError ? (
            <View style={stylesForTheme.contextRow}>
              <View style={stylesForTheme.contextDropdown}>
                <Text style={[stylesForTheme.contextLabel, { color: theme.textSecondary }]}>
                  Contexto
                </Text>
                <SimpleDropdown
                  options={patientContextOptions}
                  value={activeContextKey}
                  onSelect={setActiveContextKey}
                  placeholder="Selecciona contexto"
                  maxHeight={240}
                />
              </View>
              {clinicContextsLoading ? (
                <ActivityIndicator color={theme.primary} size="small" />
              ) : null}
              {clinicContextsError ? (
                <Text style={[stylesForTheme.contextHint, { color: theme.warning }]}>
                  {clinicContextsError}
                </Text>
              ) : null}
            </View>
          ) : null}

          <View style={stylesForTheme.searchRow}>
            <View style={[stylesForTheme.searchField, { borderColor: theme.border, backgroundColor: theme.bgMuted }]}>
              <Ionicons name="search-outline" size={18} color={theme.textMuted} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={activeClinicId ? 'Buscar pacientes asignados' : 'Buscar por nombre, email o teléfono'}
                placeholderTextColor={theme.textMuted}
                style={[stylesForTheme.searchInput, { color: theme.textPrimary }]}
              />
            </View>
          </View>

          {activeClinicId ? (
            <View style={[stylesForTheme.contextNotice, { backgroundColor: theme.bgMuted, borderColor: theme.border }]}>
              <Ionicons name="business-outline" size={18} color={theme.primary} />
              <Text style={[stylesForTheme.contextNoticeText, { color: theme.textSecondary }]}>
                {activeClinicContext
                  ? `Viendo pacientes asignados en ${activeClinicContext.clinic.commercialName}.`
                  : 'Viendo pacientes asignados por clínica.'}
              </Text>
            </View>
          ) : (
            <View style={stylesForTheme.filtersBar}>
              <View style={stylesForTheme.filterDropdown}>
                <Text style={[stylesForTheme.contextLabel, { color: theme.textSecondary }]}>
                  Origen
                </Text>
                <SimpleDropdown
                  options={FILTERS}
                  value={sourceFilter}
                  onSelect={setSourceFilter}
                  placeholder="Origen"
                  maxHeight={180}
                />
              </View>
              <View style={stylesForTheme.filterDropdown}>
                <Text style={[stylesForTheme.contextLabel, { color: theme.textSecondary }]}>
                  Estado
                </Text>
                <SimpleDropdown
                  options={LIFECYCLE_FILTERS}
                  value={lifecycleFilter}
                  onSelect={setLifecycleFilter}
                  placeholder="Estado"
                  maxHeight={180}
                />
              </View>
            </View>
          )}
          </Card>
        </TourTarget>

        {(activeClinicId ? clinicPatientsError : error) ? (
          <Card variant="outlined" padding="large" style={stylesForTheme.errorCard}>
            <View style={stylesForTheme.errorRow}>
              <Ionicons name="alert-circle-outline" size={20} color={theme.warning} />
              <Text style={[stylesForTheme.errorText, { color: theme.textSecondary }]}>
                {activeClinicId ? clinicPatientsError : error}
              </Text>
            </View>
          </Card>
        ) : null}

        <TourTarget
          id="professional.clients.grid"
          fill
          style={[stylesForTheme.fullWidthTourTarget, stylesForTheme.gridTourTarget]}
        >
          {activeClinicId ? (
            clinicPatientsLoading ? (
              <View style={stylesForTheme.loadingState}>
                <ActivityIndicator size="large" color={theme.primary} />
                <Text style={[stylesForTheme.loadingText, { color: theme.textSecondary }]}>
                  Cargando pacientes de clínica...
                </Text>
              </View>
            ) : clinicPatients.length === 0 ? (
              <Card variant="outlined" padding="large" style={stylesForTheme.emptyCard}>
                <Ionicons name="business-outline" size={28} color={theme.textMuted} />
                <Text style={[stylesForTheme.emptyTitle, { color: theme.textPrimary }]}>
                  No tienes pacientes asignados aquí
                </Text>
                <Text style={[stylesForTheme.emptyText, { color: theme.textSecondary }]}>
                  Cuando la clínica te asigne pacientes activos, aparecerán en este contexto.
                </Text>
              </Card>
            ) : (
              <View style={stylesForTheme.clientsGrid}>
                {renderClinicPatientGrid()}
                {clinicPatientsPageInfo.hasMore ? (
                  <View style={stylesForTheme.loadMoreRow}>
                    <Button
                      variant="outline"
                      size="medium"
                      onPress={handleLoadMoreClinicPatients}
                      loading={clinicPatientsLoadingMore}
                      disabled={clinicPatientsLoadingMore}
                      icon={<Ionicons name="chevron-down-outline" size={17} color={theme.primary} />}
                    >
                      Cargar más pacientes
                    </Button>
                  </View>
                ) : null}
              </View>
            )
          ) : loading ? (
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
                  : 'Puedes añadir un paciente o cambiar los filtros para ver tu base completa.'}
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
                  <Text style={[stylesForTheme.modalTitle, { color: theme.textPrimary }]}>Nuevo paciente</Text>
                  <Text style={[stylesForTheme.modalSubtitle, { color: theme.textSecondary }]}>
                    Crea la ficha y decide si registras el consentimiento firmado ahora o lo dejas pendiente para completarlo más adelante.
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
                  {formErrors.email && !contactMethodError ? (
                    <Text style={[stylesForTheme.fieldError, { color: theme.error }]}>{formErrors.email}</Text>
                  ) : null}
                </View>

                <View style={stylesForTheme.field}>
                  <Text style={[stylesForTheme.fieldLabel, { color: theme.textSecondary }]}>Teléfono</Text>
                  <TextInput
                    value={form.phone}
                    onChangeText={(value) => updateFormField('phone', value)}
                    style={[stylesForTheme.input, { color: theme.textPrimary, borderColor: formErrors.phone || contactMethodError ? theme.error : theme.border }]}
                    placeholder="Teléfono opcional"
                    keyboardType="phone-pad"
                    placeholderTextColor={theme.textMuted}
                  />
                  {formErrors.phone && !contactMethodError ? (
                    <Text style={[stylesForTheme.fieldError, { color: theme.error }]}>
                      {formErrors.phone}
                    </Text>
                  ) : null}
                </View>

                {contactMethodError ? (
                  <View style={stylesForTheme.contactErrorBlock}>
                    <Text style={[stylesForTheme.fieldError, { color: theme.error }]}>
                      {contactMethodError}
                    </Text>
                  </View>
                ) : null}

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

              <View style={stylesForTheme.consentSection}>
                <View style={stylesForTheme.consentSectionHeader}>
                  <Text style={[stylesForTheme.consentPanelTitle, { color: theme.textPrimary }]}>
                    Consentimiento clínico
                  </Text>
                  <Text style={[stylesForTheme.consentPanelText, { color: theme.textSecondary }]}>
                    Si adjuntas el documento firmado ahora, quedará guardado como evidencia clínica y el consentimiento pasará a vigente.
                  </Text>
                </View>

                <View style={[stylesForTheme.consentOptions, isMobile ? stylesForTheme.consentOptionsMobile : null]}>
                  <AnimatedPressable
                    onPress={() => updateConsentCaptureMode('UPLOAD_NOW')}
                    hoverLift={false}
                    pressScale={0.99}
                    disabled={!canAttachInitialConsent || saving}
                    style={[
                      stylesForTheme.consentOption,
                      {
                        backgroundColor:
                          form.consentCaptureMode === 'UPLOAD_NOW'
                            ? theme.status.confirmed.bg
                            : theme.bgMuted,
                        borderColor:
                          form.consentCaptureMode === 'UPLOAD_NOW'
                            ? theme.status.confirmed.border
                            : theme.border,
                      },
                      !canAttachInitialConsent ? stylesForTheme.consentOptionDisabled : null,
                    ]}
                  >
                    <View style={[
                      stylesForTheme.consentOptionIcon,
                      { backgroundColor: theme.bgCard, borderColor: theme.status.confirmed.border },
                    ]}>
                      <Ionicons name="document-attach-outline" size={19} color={theme.status.confirmed.text} />
                    </View>
                    <View style={stylesForTheme.consentOptionCopy}>
                      <Text style={[stylesForTheme.consentOptionTitle, { color: theme.textPrimary }]}>
                        Adjuntar firmado ahora
                      </Text>
                      <Text style={[stylesForTheme.consentOptionText, { color: theme.textSecondary }]}>
                        Sube PDF o imagen y valida con PIN clínico.
                      </Text>
                    </View>
                    {form.consentCaptureMode === 'UPLOAD_NOW' ? (
                      <Ionicons name="checkmark-circle" size={20} color={theme.status.confirmed.text} />
                    ) : null}
                  </AnimatedPressable>

                  <AnimatedPressable
                    onPress={() => updateConsentCaptureMode('UPLOAD_LATER')}
                    hoverLift={false}
                    pressScale={0.99}
                    disabled={saving}
                    style={[
                      stylesForTheme.consentOption,
                      {
                        backgroundColor:
                          form.consentCaptureMode === 'UPLOAD_LATER'
                            ? theme.status.pending.bg
                            : theme.bgMuted,
                        borderColor:
                          form.consentCaptureMode === 'UPLOAD_LATER'
                            ? theme.status.pending.border
                            : theme.border,
                      },
                    ]}
                  >
                    <View style={[
                      stylesForTheme.consentOptionIcon,
                      { backgroundColor: theme.bgCard, borderColor: theme.status.pending.border },
                    ]}>
                      <Ionicons name="time-outline" size={19} color={theme.status.pending.text} />
                    </View>
                    <View style={stylesForTheme.consentOptionCopy}>
                      <Text style={[stylesForTheme.consentOptionTitle, { color: theme.textPrimary }]}>
                        Añadir después
                      </Text>
                      <Text style={[stylesForTheme.consentOptionText, { color: theme.textSecondary }]}>
                        La ficha se crea con consentimiento pendiente.
                      </Text>
                    </View>
                    {form.consentCaptureMode === 'UPLOAD_LATER' ? (
                      <Ionicons name="checkmark-circle" size={20} color={theme.status.pending.text} />
                    ) : null}
                  </AnimatedPressable>
                </View>

                {!canAttachInitialConsent ? (
                  <Text style={[stylesForTheme.fieldHint, { color: theme.textMuted }]}>
                    Para adjuntar el consentimiento en el alta, configura primero tu PIN clínico desde el área clínica.
                  </Text>
                ) : null}

                {formErrors.consentCaptureMode ? (
                  <Text style={[stylesForTheme.fieldError, { color: theme.error }]}>{formErrors.consentCaptureMode}</Text>
                ) : null}

                {form.consentCaptureMode === 'UPLOAD_NOW' ? (
                  <View style={[
                    stylesForTheme.initialConsentBox,
                    { backgroundColor: theme.bgMuted, borderColor: theme.status.confirmed.border },
                  ]}>
                    <View style={stylesForTheme.initialConsentHeader}>
                      <Ionicons name="shield-checkmark-outline" size={18} color={theme.status.confirmed.text} />
                      <Text style={[stylesForTheme.initialConsentTitle, { color: theme.textPrimary }]}>
                        Documento firmado
                      </Text>
                    </View>

                    {form.consentDocument ? (
                      <View style={[
                        stylesForTheme.selectedDocumentRow,
                        { backgroundColor: theme.bgCard, borderColor: theme.border },
                      ]}>
                        <View style={[
                          stylesForTheme.selectedDocumentIcon,
                          { backgroundColor: theme.primaryAlpha12 },
                        ]}>
                          <Ionicons name="document-text-outline" size={18} color={theme.primary} />
                        </View>
                        <View style={stylesForTheme.selectedDocumentCopy}>
                          <Text style={[stylesForTheme.selectedDocumentName, { color: theme.textPrimary }]} numberOfLines={1}>
                            {getConsentDocumentName(form.consentDocument)}
                          </Text>
                          <Text style={[stylesForTheme.selectedDocumentMeta, { color: theme.textSecondary }]}>
                            Se guardará en el área clínica protegida.
                          </Text>
                        </View>
                        <Button
                          variant="ghost"
                          size="small"
                          onPress={handleRemoveInitialConsentDocument}
                          disabled={saving}
                        >
                          Quitar
                        </Button>
                      </View>
                    ) : (
                      <Button
                        variant="outline"
                        size="medium"
                        onPress={() => { void handlePickInitialConsentDocument(); }}
                        disabled={saving}
                        icon={<Ionicons name="cloud-upload-outline" size={18} color={theme.primary} />}
                      >
                        Adjuntar documento
                      </Button>
                    )}

                    {formErrors.consentDocument ? (
                      <Text style={[stylesForTheme.fieldError, { color: theme.error }]}>{formErrors.consentDocument}</Text>
                    ) : null}

                    {initialConsentPinRequired ? (
                      <View style={stylesForTheme.pinField}>
                        <Text style={[stylesForTheme.fieldLabel, { color: theme.textSecondary }]}>PIN clínico</Text>
                        <TextInput
                          value={form.clinicalPin}
                          onChangeText={(value) => updateFormField('clinicalPin', value)}
                          style={[stylesForTheme.input, { color: theme.textPrimary, borderColor: formErrors.clinicalPin ? theme.error : theme.border }]}
                          placeholder="6 dígitos"
                          placeholderTextColor={theme.textMuted}
                          keyboardType="number-pad"
                          secureTextEntry
                          maxLength={6}
                        />
                        {formErrors.clinicalPin ? (
                          <Text style={[stylesForTheme.fieldError, { color: theme.error }]}>{formErrors.clinicalPin}</Text>
                        ) : null}
                      </View>
                    ) : (
                      <View style={[
                        stylesForTheme.clinicalAccessNotice,
                        { backgroundColor: theme.status.confirmed.bg, borderColor: theme.status.confirmed.border },
                      ]}>
                        <Ionicons name="lock-open-outline" size={17} color={theme.status.confirmed.text} />
                        <Text style={[stylesForTheme.clinicalAccessNoticeText, { color: theme.status.confirmed.text }]}>
                          Área clínica desbloqueada para este registro.
                        </Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <View style={[
                    stylesForTheme.clinicalAccessNotice,
                    { backgroundColor: theme.status.pending.bg, borderColor: theme.status.pending.border },
                  ]}>
                    <Ionicons name="time-outline" size={17} color={theme.status.pending.text} />
                    <Text style={[stylesForTheme.clinicalAccessNoticeText, { color: theme.status.pending.text }]}>
                      El consentimiento aparecerá como pendiente hasta adjuntar el documento firmado.
                    </Text>
                  </View>
                )}
              </View>

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
      fontFamily: theme.fontHeading,
    },
    toolbarCard: {
      gap: spacing.md,
      overflow: 'visible',
      position: 'relative',
      zIndex: 40,
    },
    contextRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: spacing.md,
      flexWrap: 'wrap',
      position: 'relative',
      zIndex: 20,
    },
    contextDropdown: {
      width: '100%',
      maxWidth: 360,
      gap: 6,
      position: 'relative',
      zIndex: 30,
    },
    contextLabel: {
      ...textStyles.caption,
      fontFamily: theme.fontSansBold,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    contextHint: {
      ...textStyles.bodySmall,
      fontFamily: theme.fontSans,
      flex: 1,
      minWidth: 220,
    },
    contextNotice: {
      minHeight: 44,
      borderWidth: 1,
      borderRadius: borderRadius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    contextNoticeText: {
      ...textStyles.bodySmall,
      fontFamily: theme.fontSans,
      flex: 1,
    },
    fullWidthTourTarget: {
      width: '100%',
    },
    filtersTourTarget: {
      position: 'relative',
      zIndex: 40,
    },
    gridTourTarget: {
      position: 'relative',
      zIndex: 1,
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
      fontFamily: theme.fontSans,
      minHeight: 44,
    },
    filtersBar: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
      alignItems: 'flex-start',
      position: 'relative',
      zIndex: 50,
    },
    filterDropdown: {
      width: '100%',
      maxWidth: 260,
      minWidth: 220,
      gap: 6,
      position: 'relative',
      zIndex: 60,
    },
    errorCard: {
      borderColor: theme.warning + '35',
      backgroundColor: isDark ? theme.bgMuted : theme.warningBg,
    },
    errorRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      alignItems: 'center',
    },
    errorText: {
      ...textStyles.body,
      fontFamily: theme.fontSans,
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
      fontFamily: theme.fontSans,
    },
    emptyCard: {
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.xxl,
    },
    emptyTitle: {
      ...textStyles.h4,
      fontWeight: '700',
      fontFamily: theme.fontHeading,
    },
    emptyText: {
      ...textStyles.body,
      fontFamily: theme.fontSans,
      maxWidth: 520,
      textAlign: 'center',
    },
    clientsGrid: {
      gap: spacing.md,
    },
    loadMoreRow: {
      alignItems: 'center',
      paddingTop: spacing.sm,
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
      fontFamily: theme.fontSansBold,
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
      fontFamily: theme.fontSansBold,
    },
    consentBadge: {
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: 999,
      borderWidth: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    consentBadgeText: {
      ...textStyles.caption,
      fontWeight: '700',
      fontFamily: theme.fontSansBold,
    },
    clientName: {
      ...textStyles.h4,
      fontWeight: '700',
      fontFamily: theme.fontHeading,
    },
    clientMeta: {
      ...textStyles.bodySmall,
      fontFamily: theme.fontSans,
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
      fontFamily: theme.fontSans,
      flexShrink: 1,
    },
    quickFactValue: {
      fontWeight: '700',
      fontFamily: theme.fontSansBold,
    },
    infoRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      alignItems: 'center',
    },
    infoText: {
      ...textStyles.bodySmall,
      fontFamily: theme.fontSans,
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
      fontFamily: theme.fontHeading,
      marginBottom: 6,
    },
    modalSubtitle: {
      ...textStyles.bodySmall,
      fontFamily: theme.fontSans,
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
    contactErrorBlock: {
      flexBasis: '100%',
      marginTop: -spacing.xs,
    },
    fieldLabel: {
      ...textStyles.caption,
      fontWeight: '700',
      fontFamily: theme.fontSansBold,
    },
    fieldHint: {
      ...textStyles.bodySmall,
      fontFamily: theme.fontSans,
      lineHeight: 20,
    },
    input: {
      minHeight: 50,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      paddingHorizontal: spacing.md,
      backgroundColor: theme.bgMuted,
      ...textStyles.body,
      fontFamily: theme.fontSans,
    },
    fieldError: {
      ...textStyles.caption,
      fontWeight: '600',
      fontFamily: theme.fontSansSemiBold,
    },
    consentSection: {
      gap: spacing.md,
    },
    consentSectionHeader: {
      gap: 6,
    },
    consentPanelTitle: {
      ...textStyles.body,
      fontWeight: '700',
      fontFamily: theme.fontSansBold,
    },
    consentPanelText: {
      ...textStyles.bodySmall,
      fontFamily: theme.fontSans,
      lineHeight: 22,
    },
    consentOptions: {
      flexDirection: 'row',
      gap: spacing.sm,
      alignItems: 'stretch',
    },
    consentOptionsMobile: {
      flexDirection: 'column',
    },
    consentOption: {
      flex: 1,
      minWidth: 0,
      minHeight: 104,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      padding: spacing.md,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
    },
    consentOptionDisabled: {
      opacity: 0.52,
    },
    consentOptionIcon: {
      width: 38,
      height: 38,
      borderRadius: 12,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    consentOptionCopy: {
      flex: 1,
      minWidth: 0,
      gap: 4,
    },
    consentOptionTitle: {
      ...textStyles.bodySmall,
      fontWeight: '700',
      fontFamily: theme.fontSansBold,
    },
    consentOptionText: {
      ...textStyles.caption,
      fontFamily: theme.fontSans,
      lineHeight: 18,
    },
    initialConsentBox: {
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      padding: spacing.md,
      gap: spacing.sm,
    },
    initialConsentHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    initialConsentTitle: {
      ...textStyles.bodySmall,
      fontWeight: '700',
      fontFamily: theme.fontSansBold,
    },
    selectedDocumentRow: {
      minHeight: 62,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      padding: spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    selectedDocumentIcon: {
      width: 38,
      height: 38,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    selectedDocumentCopy: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    selectedDocumentName: {
      ...textStyles.bodySmall,
      fontWeight: '700',
      fontFamily: theme.fontSansBold,
    },
    selectedDocumentMeta: {
      ...textStyles.caption,
      fontFamily: theme.fontSans,
    },
    pinField: {
      gap: 8,
      maxWidth: 260,
    },
    clinicalAccessNotice: {
      minHeight: 42,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    clinicalAccessNoticeText: {
      ...textStyles.caption,
      fontWeight: '700',
      fontFamily: theme.fontSansBold,
      flex: 1,
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
