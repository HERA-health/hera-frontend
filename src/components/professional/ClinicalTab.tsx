import { TreatmentConsentPanel } from './TreatmentConsentPanel';
import { ClinicalRecordWorkspace } from './patient-detail/ClinicalRecordWorkspace';
import { useClinicalAuthorizationWatch } from '../../hooks/useClinicalAuthorizationWatch';
import type { ClinicalPatientSection, ClinicalPatientAction } from './clinicalPatientTypes';
import type { ClinicalTimelinePage } from '../../services/clinicalService';
import { ClinicalPinManager } from './ClinicalPinManager';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { AnimatedPressable, Button, Card } from '../common';
import { useAppAlertState } from '../common/alert';
import { TourTarget } from '../onboarding/TourTarget';
import {
  useProfessionalTourAutoStart,
  useProfessionalTourRoutePreference,
  useProfessionalTourStepPreparation,
} from '../onboarding/professionalTourContext';
import { PinCodeInput } from './PinCodeInput';
import { borderRadius, spacing, typography } from '../../constants/colors';
import { useTheme } from '../../contexts/ThemeContext';
import type { Client } from '../../services/professionalService';
import { getErrorCode, getErrorMessage } from '../../constants/errors';
import { useClinicalAccessController } from '../../hooks/useClinicalAccessController';
import { useClinicalRecordData } from '../../hooks/useClinicalRecordData';
import {
  hasAcceptedCurrentDataProcessingAgreement,
} from '../../services/clinicalService';
import { LEGAL_DOCUMENT_VERSION } from '../../constants/legal';
import { acceptLegalDocuments, getLegalStatus } from '../../services/legalService';
import type { AppNavigationProp } from '../../constants/types';
import type { ProfessionalTourTargetId } from '../onboarding/professionalTourTypes';

export interface ClinicalPatientAccessState {
  unlocked: boolean;
  granted: boolean;
  closed: boolean;
  consentStatus: 'PENDING' | 'SENT' | 'SIGNED' | 'WITHDRAWN' | null;
}

interface ClinicalTabProps {
  visible?: boolean;
  focusDocumentId?: string;
  section?: ClinicalPatientSection;
  action?: ClinicalPatientAction;
  onActionConsumed?: (id: number) => void;
  onSection?: (section: ClinicalPatientSection) => void;
  onAccessState?: (state: ClinicalPatientAccessState) => void;
  onCounters?: (counters: ClinicalTimelinePage['counters']) => void;
  clientId: string;
  client: Client;
  initialWorkspace?: ClinicalWorkspaceKey;
  focusSessionId?: string;
  onPrepareClinicalTourStep?: (targetId: ProfessionalTourTargetId) => Promise<void> | void;
  onRequestRefreshClient?: () => Promise<void>;
  tourTargetsActive?: boolean;
}

type ClinicalWorkspaceKey = 'general' | 'sessions';
type BannerTone = 'info' | 'success' | 'warning' | 'error';

interface BannerState {
  tone: BannerTone;
  message: string;
}

interface SidebarRow {
  label: string;
  value: string;
  color: string;
}

const BANNER_AUTO_DISMISS_MS = 4500;

const isValidPin = (value: string) => /^\d{6}$/.test(value);

const formatDate = (value?: string | Date | null) =>
  value
    ? new Date(value).toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'Sin fecha';

const getBannerStyles = (
  tone: BannerTone,
  theme: ReturnType<typeof useTheme>['theme']
) => {
  switch (tone) {
    case 'success':
      return {
        backgroundColor: theme.successBg,
        borderColor: `${theme.success}28`,
        iconColor: theme.success,
      };
    case 'warning':
      return {
        backgroundColor: theme.warningBg,
        borderColor: `${theme.warning}28`,
        iconColor: theme.warning,
      };
    case 'error':
      return {
        backgroundColor: theme.errorBg,
        borderColor: `${theme.error}28`,
        iconColor: theme.error,
      };
    default:
      return {
        backgroundColor: theme.primaryAlpha12,
        borderColor: `${theme.primary}28`,
        iconColor: theme.primary,
      };
  }
};

export function ClinicalTab({
  visible = true, focusDocumentId,
  section = 'summary', action, onActionConsumed, onSection, onAccessState, onCounters,
  clientId,
  client,
  initialWorkspace,
  focusSessionId,
  onPrepareClinicalTourStep,
  onRequestRefreshClient,
  tourTargetsActive = true,
}: ClinicalTabProps) {
  const { theme } = useTheme();
  const { isVisible: isAppAlertVisible } = useAppAlertState();
  const navigation = useNavigation<AppNavigationProp>();
  const { width } = useWindowDimensions();
  const isTablet = width >= 920;

  const [workspace, setWorkspace] = useState<ClinicalWorkspaceKey>(
    () => focusSessionId ? 'sessions' : initialWorkspace ?? 'general'
  );
  const [banner, setBanner] = useState<BannerState | null>(null);
  const [tourAction, setTourAction] = useState<ClinicalPatientAction>();
  const consumeAction = useCallback((id: number) => {
    setTourAction(current => current && current.id <= id ? undefined : current);
    onActionConsumed?.(id);
  }, [onActionConsumed]);
  const [pin, setPin] = useState('');
  const [setupPin, setSetupPin] = useState('');
  const [setupPinConfirm, setSetupPinConfirm] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [showSetupPin, setShowSetupPin] = useState(false);
  const [clinicalTermsAccepted, setClinicalTermsAccepted] = useState<boolean | null>(null);
  const [clinicalTermsLoading, setClinicalTermsLoading] = useState(true);

  const showBanner = useCallback((tone: BannerTone, message: string) => {
    setBanner({ tone, message });
  }, []);

  const handleAccessLostBanner = useCallback(
    (message: string) => {
      showBanner('warning', message);
    },
    [showBanner]
  );

  const access = useClinicalAccessController({
    onAccessLost: handleAccessLostBanner,
  });

  const loadClinicalTermsStatus = useCallback(async () => {
    try {
      setClinicalTermsLoading(true);
      const status = await getLegalStatus();
      const hasAcceptedCurrentClinicalTerms = status.acceptedDocuments.some(
        (document) =>
          document.documentKey === 'CLINICAL_MODULE_TERMS'
          && document.version === LEGAL_DOCUMENT_VERSION
      );
      setClinicalTermsAccepted(hasAcceptedCurrentClinicalTerms);
    } catch (error) {
      setClinicalTermsAccepted(false);
      showBanner(
        'error',
        getErrorMessage(error, 'No se pudo comprobar la aceptación del módulo clínico.')
      );
    } finally {
      setClinicalTermsLoading(false);
    }
  }, [showBanner]);

  const handleWorkspaceAccessLost = useCallback(
    (message: string) => {
      void access.clearAccessState(message);
    },
    [access.clearAccessState]
  );

  const workspaceData = useClinicalRecordData({
    clientId,
    token: access.token,
    onAccessLost: handleWorkspaceAccessLost,
  });
  const clinicalRecord = workspaceData.record;
  const focusRefreshRef = useRef(workspaceData.loadRecord);
  focusRefreshRef.current = workspaceData.loadRecord;
  const hasFocusedRef = useRef(false);

  useEffect(() => {
    if (!banner) {
      return undefined;
    }

    const timer = setTimeout(() => {
      setBanner(null);
    }, BANNER_AUTO_DISMISS_MS);

    return () => clearTimeout(timer);
  }, [banner]);

  useEffect(() => {
    void loadClinicalTermsStatus();
  }, [loadClinicalTermsStatus]);

  useEffect(() => {
    setWorkspace(focusSessionId ? 'sessions' : initialWorkspace ?? 'general');
    setPin('');
    setSetupPin('');
    setSetupPinConfirm('');
    setBanner(null);
  }, [clientId, focusSessionId, initialWorkspace]);

  useEffect(() => {
    if (focusSessionId) {
      setWorkspace('sessions');
      return;
    }

    if (initialWorkspace) {
      setWorkspace(initialWorkspace);
    }
  }, [focusSessionId, initialWorkspace]);

  useFocusEffect(
    useCallback(() => {
      void access.loadStatus();

      if (hasFocusedRef.current) void focusRefreshRef.current();
      hasFocusedRef.current = true;
    }, [access.loadStatus])
  );

  useClinicalAuthorizationWatch({
    clientId, token: access.token, closedAt: clinicalRecord?.closedAt,
    requestPending: Boolean(clinicalRecord?.informedConsent?.activeRequest),
    treatmentEventId: clinicalRecord?.informedConsent?.eventId,
    onRefresh: async () => {
      const next = await workspaceData.loadRecord();
      if (next) void onRequestRefreshClient?.().catch(error => showBanner('error', getErrorMessage(error, 'No se pudo actualizar la ficha.')));
    },
    onAccessLost: access.clearAccessState,
  });

  const handleAcceptDpa = async () => {
    try {
      await access.acceptDataProcessingAgreement();
      showBanner('success', 'Encargo de tratamiento aceptado. Ya puedes configurar el acceso clínico.');
    } catch (error) {
      showBanner('error', getErrorMessage(error, 'No se pudo aceptar el encargo de tratamiento.'));
    }
  };

  const handleAcceptClinicalTerms = async () => {
    try {
      setClinicalTermsLoading(true);
      await acceptLegalDocuments(['CLINICAL_MODULE_TERMS'], 'clinical-module');
      setClinicalTermsAccepted(true);
      showBanner('success', 'Condiciones del módulo clínico aceptadas.');
    } catch (error) {
      showBanner(
        'error',
        getErrorMessage(error, 'No se pudo registrar la aceptación del módulo clínico.')
      );
    } finally {
      setClinicalTermsLoading(false);
    }
  };

  const handleSetupPin = async () => {
    if (!isValidPin(setupPin)) {
      showBanner('warning', 'El PIN clínico debe tener 6 dígitos.');
      return;
    }

    if (setupPin !== setupPinConfirm) {
      showBanner('warning', 'Los dos PIN deben coincidir antes de guardarlos.');
      return;
    }

    try {
      await access.setupClinicalPin(setupPin);
      setSetupPin('');
      setSetupPinConfirm('');
      showBanner('success', 'PIN clínico configurado. Ya puedes abrir el expediente.');
    } catch (error) {
      showBanner('error', getErrorMessage(error, 'No se pudo configurar el PIN clínico.'));
    }
  };

  const handleUnlock = async () => {
    if (!isValidPin(pin)) {
      showBanner('warning', 'Introduce un PIN clínico válido de 6 dígitos.');
      return;
    }

    try {
      await access.unlockClinicalArea(pin);
      setPin('');
      showBanner('success', 'Área clínica abierta. Puedes trabajar con el expediente desde aquí.');
    } catch (error) {
      showBanner('error', getErrorMessage(error, 'No se pudo desbloquear el área clínica.'));
    }
  };

  const handleLock = async () => {
    try {
      await access.lockClinicalArea();
      showBanner('info', 'Área clínica cerrada.');
    } catch (error) {
      showBanner('error', getErrorMessage(error, 'No se pudo bloquear el área clínica.'));
    }
  };

  const hasAcceptedDpa = access.accessStatus
    ? hasAcceptedCurrentDataProcessingAgreement(access.accessStatus)
    : false;
  const hasPin = Boolean(access.accessStatus?.hasPin);
  const hasActiveSession = Boolean(access.token && access.accessStatus?.session.active);
  const record = workspaceData.record;
  const recordLoading = workspaceData.recordLoading;
  useEffect(() => {
    onAccessState?.({ unlocked: hasActiveSession, granted: hasActiveSession && record?.access?.canReadClinicalContent === true, closed: Boolean(record?.closedAt), consentStatus: hasActiveSession ? record?.informedConsent?.status ?? null : null });
  }, [hasActiveSession, record?.access?.canReadClinicalContent, record?.informedConsent?.status, record?.closedAt, onAccessState]);
  const handlePatientError = useCallback((error: unknown) => {
    const message = getErrorMessage(error, 'No se pudo completar la acción clínica.');
    const code = getErrorCode(error);
    if (['CLINICAL_UNLOCK_REQUIRED', 'CLINICAL_CONSENT_REQUIRED', 'CLINICAL_RECORD_NOT_FOUND', 'CLINICAL_DPA_REQUIRED'].includes(code ?? '') || /desbloquear|sesión clínica.*(caducada|válida)|expediente.*no.*disponible/i.test(message)) void access.clearAccessState(message);
    else if (code === 'CLINICAL_PROCESS_CLOSED' || code === 'CLINICAL_FRESH_CONSENT_REQUIRED') void workspaceData.loadRecord();
  }, [access.clearAccessState, workspaceData.loadRecord]);

  const [clinicalTourTarget,setClinicalTourTarget] = useState<ProfessionalTourTargetId>();
  const hasBlockingBanner = banner?.tone === 'warning' || banner?.tone === 'error';
  const shouldAutoStartClinicalTour =
    tourTargetsActive
    && hasActiveSession
    && record !== null
    && !recordLoading
    && !access.accessSubmitting
    && !isAppAlertVisible
    && visible && section === 'notes' && record?.access?.canReadClinicalContent === true
    && workspace === 'general'
    && !hasBlockingBanner;
  const canPreferClinicalTour =
    tourTargetsActive
    && hasActiveSession
    && record !== null
    && !recordLoading
    && visible && section === 'notes' && record?.access?.canReadClinicalContent === true
    && workspace === 'general'
    && !hasBlockingBanner;

  useProfessionalTourAutoStart('professional_clinical_area_v1', shouldAutoStartClinicalTour);
  useProfessionalTourRoutePreference('professional_clinical_area_v1', canPreferClinicalTour);

  const prepareClinicalTourStep = useCallback(
    async (targetId: ProfessionalTourTargetId) => {
      if (workspace !== 'general') {
        setWorkspace('general');
      }

      onSection?.('notes');
      setClinicalTourTarget(targetId);
      if (targetId === 'professional.clinical.consent' || targetId === 'professional.clinical.consent-documents') setTourAction({ id: Date.now(), kind: 'CONSENT' });
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      await onPrepareClinicalTourStep?.(targetId);
    },
    [onPrepareClinicalTourStep, onSection, workspace],
  );

  useProfessionalTourStepPreparation(
    'professional.clinical.hero',
    () => prepareClinicalTourStep('professional.clinical.hero'),
  );
  useProfessionalTourStepPreparation(
    'professional.clinical.workspace-tabs',
    () => prepareClinicalTourStep('professional.clinical.workspace-tabs'),
  );
  useProfessionalTourStepPreparation(
    'professional.clinical.notes',
    () => prepareClinicalTourStep('professional.clinical.notes'),
  );
  useProfessionalTourStepPreparation(
    'professional.clinical.timeline',
    () => prepareClinicalTourStep('professional.clinical.timeline'),
  );
  useProfessionalTourStepPreparation(
    'professional.clinical.questionnaire',
    () => prepareClinicalTourStep('professional.clinical.questionnaire'),
  );
  useProfessionalTourStepPreparation(
    'professional.clinical.consent',
    () => prepareClinicalTourStep('professional.clinical.consent'),
  );
  useProfessionalTourStepPreparation(
    'professional.clinical.consent-documents',
    () => prepareClinicalTourStep('professional.clinical.consent-documents'),
  );
  useProfessionalTourStepPreparation(
    'professional.clinical.reports',
    () => prepareClinicalTourStep('professional.clinical.reports'),
  );
  useProfessionalTourStepPreparation(
    'professional.clinical.documents',
    () => prepareClinicalTourStep('professional.clinical.documents'),
  );

  const consentLabel = record?.informedConsent
    ? { PENDING: 'Pendiente', SENT: 'Enviado', SIGNED: 'Firmado', WITHDRAWN: 'Retirado' }[record.informedConsent.status]
    : 'Pendiente';
  const consentColor = consentLabel === 'Firmado' ? theme.status.confirmed.text
    : consentLabel === 'Retirado' ? theme.status.cancelled.text : theme.status.pending.text;

  const sidebarRows: SidebarRow[] = hasActiveSession
    ? [
        { label: 'Consentimiento informado', value: consentLabel, color: consentColor },
        {
          label: 'Retención',
          value: record?.retentionUntil ? formatDate(record.retentionUntil) : 'Abierta',
          color: theme.textPrimary,
        },
        {
          label: 'Contenido',
          value: record
            ? `${record.pagination.notes.total} notas · ${
                record.pagination.documents.total +
                record.sessionFolders.reduce((sum, folder) => sum + folder.documents.length, 0)
              } documentos`
            : 'Sin contenido',
          color: theme.textPrimary,
        },
      ]
    : [
        { label: 'Consentimiento informado', value: consentLabel, color: consentColor },
        {
          label: 'Encargo',
          value: hasAcceptedDpa ? 'Aceptado' : 'Pendiente',
          color: theme.textPrimary,
        },
        {
          label: 'PIN',
          value: hasPin ? 'Configurado' : 'Pendiente',
          color: theme.textPrimary,
        },
      ];

  const bannerColors = banner ? getBannerStyles(banner.tone, theme) : null;

  const renderSidebar = useCallback(
    (rows: SidebarRow[], showLockButton?: boolean) => (
      <View
        style={[
          styles.heroAside,
          {
            backgroundColor: theme.bgMuted,
            borderColor: theme.border,
          },
        ]}
      >
        {rows.map((item) => (
          <View key={item.label} style={styles.heroAsideRow}>
            <Text
              style={[
                styles.heroAsideLabel,
                { color: theme.textMuted, fontFamily: theme.fontSansSemiBold },
              ]}
            >
              {item.label}
            </Text>
            <Text
              style={[
                styles.heroAsideValue,
                { color: item.color, fontFamily: theme.fontHeading },
              ]}
            >
              {item.value}
            </Text>
          </View>
        ))}

        {showLockButton ? (
          <Button
            variant="outline"
            size="small"
            onPress={handleLock}
            loading={access.accessSubmitting}
          >
            Bloquear ahora
          </Button>
        ) : null}
      </View>
    ),
    [access.accessSubmitting, handleLock, theme]
  );

  if (!visible) return null;
  return (
    <View style={styles.screen}>
      {banner && bannerColors ? (
        <View
          style={[
            styles.banner,
            {
              backgroundColor: bannerColors.backgroundColor,
              borderColor: bannerColors.borderColor,
            },
          ]}
        >
          <Ionicons name="checkmark-circle-outline" size={18} color={bannerColors.iconColor} />
          <Text style={[styles.bannerText, { color: theme.textPrimary }]}>{banner.message}</Text>
        </View>
      ) : null}

      {(access.statusLoading && !hasActiveSession) || clinicalTermsLoading || clinicalTermsAccepted === null ? (
        <Card variant="default" padding="large">
          <View style={styles.centeredState}>
            <ActivityIndicator size="small" color={theme.primary} />
            <Text style={[styles.centeredText, { color: theme.textSecondary }]}>
              Preparando el acceso clínico...
            </Text>
          </View>
        </Card>
      ) : !clinicalTermsAccepted ? (
        <Card variant="default" padding="large">
          <View style={[styles.singlePanel, styles.focusPanel]}>
            <View style={styles.stateCopy}>
              <View style={[styles.eyebrowPill, { backgroundColor: theme.primaryAlpha12 }]}>
                <Ionicons name="document-text-outline" size={14} color={theme.primary} />
                <Text style={[styles.eyebrowPillText, { color: theme.primary, fontFamily: theme.fontSansSemiBold }]}>
                  Módulo clínico
                </Text>
              </View>
              <Text style={[styles.stateTitle, { color: theme.textPrimary, fontFamily: theme.fontHeading }]}>
                Acepta las condiciones clínicas
              </Text>
              <Text style={[styles.stateDescription, { color: theme.textSecondary }]}>
                Antes de configurar el PIN o abrir expedientes, debes aceptar las condiciones vigentes del módulo clínico.
              </Text>
              <AnimatedPressable
                onPress={() => navigation.navigate('LegalDocument', { documentKey: 'CLINICAL_MODULE_TERMS' })}
                hoverLift={false}
                pressScale={0.98}
              >
                <Text style={[styles.inlineLegalLink, { color: theme.primary, fontFamily: theme.fontSansSemiBold }]}>
                  Ver condiciones del módulo clínico
                </Text>
              </AnimatedPressable>
            </View>

            <Button
              variant="primary"
              size="small"
              onPress={handleAcceptClinicalTerms}
              loading={clinicalTermsLoading}
            >
              Aceptar condiciones clínicas
            </Button>
          </View>
        </Card>
      ) : !hasAcceptedDpa ? (
        <Card variant="default" padding="large">
          <View style={[styles.singlePanel, styles.focusPanel]}>
            <View style={styles.stateCopy}>
              <View style={[styles.eyebrowPill, { backgroundColor: theme.primaryAlpha12 }]}>
                <Ionicons name="shield-checkmark-outline" size={14} color={theme.primary} />
                <Text style={[styles.eyebrowPillText, { color: theme.primary, fontFamily: theme.fontSansSemiBold }]}>
                  Área clínica protegida
                </Text>
              </View>
              <Text style={[styles.stateTitle, { color: theme.textPrimary, fontFamily: theme.fontHeading }]}>
                Activa el encargo de tratamiento
              </Text>
              <Text style={[styles.stateDescription, { color: theme.textSecondary }]}>
                Antes de abrir historias clínicas debes aceptar la versión vigente del encargo de tratamiento.
              </Text>
            </View>

            <Button
              variant="primary"
              size="small"
              onPress={handleAcceptDpa}
              loading={access.accessSubmitting}
            >
              Aceptar y continuar
            </Button>
          </View>
        </Card>
      ) : !hasPin ? (
        <Card variant="default" padding="large">
          <View style={[styles.singlePanel, styles.focusPanel]}>
            <View style={styles.stateCopy}>
              <View style={[styles.eyebrowPill, { backgroundColor: theme.primaryAlpha12 }]}>
                <Ionicons name="shield-checkmark-outline" size={14} color={theme.primary} />
                <Text style={[styles.eyebrowPillText, { color: theme.primary, fontFamily: theme.fontSansSemiBold }]}>
                  Primer acceso clínico
                </Text>
              </View>
              <Text style={[styles.stateTitle, { color: theme.textPrimary, fontFamily: theme.fontHeading }]}>
                Configura tu PIN clínico
              </Text>
              <Text style={[styles.stateDescription, { color: theme.textSecondary }]}>
                Usa un código de 6 dígitos para proteger la entrada al expediente.
              </Text>
            </View>

            <View style={styles.pinSetupGrid}>
              <PinCodeInput
                value={setupPin}
                onChange={setSetupPin}
                masked={!showSetupPin}
                label="Crea tu PIN"
                hint="6 dígitos"
              />
              <PinCodeInput
                value={setupPinConfirm}
                onChange={setSetupPinConfirm}
                masked={!showSetupPin}
                label="Repite el PIN"
                hint="Para confirmar"
              />
            </View>

            <View style={styles.stateActions}>
              <Button
                variant="ghost"
                size="small"
                onPress={() => setShowSetupPin((current) => !current)}
              >
                {showSetupPin ? 'Ocultar PIN' : 'Mostrar PIN'}
              </Button>
              <Button
                variant="secondary"
                size="small"
                onPress={handleSetupPin}
                loading={access.accessSubmitting}
              >
                Guardar PIN
              </Button>
            </View>
          </View>
        </Card>
      ) : !hasActiveSession ? (
        <Card variant="default" padding="large">
          <View style={{alignItems:'center',gap:18,paddingVertical:isTablet?32:18}}>
            <View style={{width:62,height:62,borderRadius:31,backgroundColor:theme.primaryAlpha12,alignItems:'center',justifyContent:'center'}}><Ionicons name="lock-closed-outline" size={30} color={theme.primary}/></View>
            <Text accessibilityRole="header" style={{fontFamily:theme.fontSansBold,color:theme.textPrimary,fontSize:24}}>{action?.kind === 'CONSENT' ? 'Accede al consentimiento informado' : 'Área clínica protegida'}</Text>
            <Text style={{fontFamily:theme.fontSans,color:theme.textSecondary,fontSize:14,lineHeight:22,textAlign:'center'}}>{action?.kind === 'CONSENT' ? 'El consentimiento forma parte del expediente protegido. Introduce tu PIN para abrir su gestión.' : 'Para acceder a la información clínica del paciente, introduce tu PIN clínico.'}</Text>
            <View style={{width:'100%',flexDirection:isTablet?'row':'column',gap:12,maxWidth:950}}>
              {([{title:'Notas clínicas',description:'Registro de evolución y seguimiento del proceso terapéutico.',icon:'document-text-outline'},{title:'Historia clínica',description:'Evaluaciones, antecedentes, objetivos, tratamiento y ejercicios.',icon:'clipboard-outline'},{title:'Documentación clínica',description:'Informes, consentimientos y documentación del expediente.',icon:'folder-open-outline'}] as const).map(item=><View key={item.title} style={{flex:isTablet?1:undefined,flexDirection:'row',gap:12,alignItems:'center',padding:16,borderWidth:1,borderColor:theme.borderLight,borderRadius:10}}><Ionicons name={item.icon} size={24} color={theme.primary}/><View style={{flex:1,gap:4}}><Text style={{fontFamily:theme.fontSansSemiBold,color:theme.textPrimary,fontSize:14}}>{item.title}</Text><Text style={{fontFamily:theme.fontSans,color:theme.textSecondary,fontSize:12,lineHeight:18}}>{item.description}</Text></View></View>)}
            </View>
            <View style={{maxWidth:380,width:'100%',gap:10}}><PinCodeInput value={pin} onChange={setPin} masked={!showPin} label="PIN clínico" hint="Introduce tu PIN clínico de 6 dígitos para continuar."/><Button onPress={handleUnlock} loading={access.accessSubmitting}>{action?.kind === 'CONSENT' ? 'Continuar al consentimiento' : 'Acceder al área clínica'}</Button><View style={{flexDirection:'row',gap:8,justifyContent:'center',flexWrap:'wrap'}}><Button variant="ghost" size="small" onPress={()=>setShowPin(current=>!current)}>{showPin?'Ocultar PIN':'Mostrar PIN'}</Button><ClinicalPinManager compact clientId={clientId}/></View></View>
          </View>
        </Card>
      ) : workspaceData.recordError && !record ? (
        <Card padding="large"><Text accessibilityRole="alert" style={{ color: theme.error, fontFamily: theme.fontSans }}>{workspaceData.recordError}</Text><Button variant="outline" onPress={() => void workspaceData.loadRecord()}>Reintentar</Button></Card>
      ) : !record ? (
        <Card variant="default" padding="large">
          <View style={styles.centeredState}>
            <ActivityIndicator size="small" color={theme.primary} />
            <Text style={[styles.centeredText, { color: theme.textSecondary }]}>
              Cargando expediente clínico...
            </Text>
          </View>
        </Card>
      ) : (
        <View style={styles.workspaceStack}>
          {workspaceData.recordError ? <Card padding="medium"><Text accessibilityRole="alert" style={{ color: theme.error, fontFamily: theme.fontSans }}>{workspaceData.recordError}</Text><Button variant="ghost" onPress={() => void workspaceData.loadRecord()}>Actualizar expediente</Button></Card> : null}
          <ClinicalRecordWorkspace tourTarget={clinicalTourTarget} focusDocumentId={focusDocumentId} key={`${clientId}:${access.token}:${record.informedConsent?.eventId ?? ''}:${record.closedAt ?? ''}`}
            client={client} record={record} token={access.token!} section={section} action={tourAction && tourAction.id > (action?.id ?? 0) ? tourAction : action}
            onActionConsumed={consumeAction}
            onLock={() => void handleLock()}
            onError={handlePatientError} onRefresh={workspaceData.loadRecord}
            onSection={onSection ?? (() => setWorkspace('sessions'))} onCounters={onCounters}
            onRequestRefreshClient={onRequestRefreshClient} focusSessionId={focusSessionId}
            tourTargetsActive={tourTargetsActive}
            consentPanel={<TreatmentConsentPanel key={`${clientId}:${access.token}:${record.informedConsent?.eventId ?? "pending"}`} clientId={clientId} token={access.token!} onChanged={async () => { await workspaceData.loadRecord(); await onRequestRefreshClient?.(); }} />}

          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: spacing.lg,
  },
  banner: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  bannerText: {
    flex: 1,
    fontSize: typography.fontSizes.sm,
    lineHeight: 22,
  },
  centeredState: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  centeredText: {
    fontSize: typography.fontSizes.sm,
    lineHeight: 22,
  },
  eyebrowPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
  },
  eyebrowPillText: {
    fontSize: typography.fontSizes.xs,
    lineHeight: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  singlePanel: {
    gap: spacing.md,
  },
  focusPanel: {
    maxWidth: 560,
  },
  stateCopy: {
    gap: spacing.xs,
  },
  stateTitle: {
    fontSize: typography.fontSizes.xl,
    lineHeight: 30,
  },
  stateDescription: {
    fontSize: typography.fontSizes.sm,
    lineHeight: 22,
    maxWidth: 620,
  },
  inlineLegalLink: {
    fontSize: typography.fontSizes.sm,
    lineHeight: 22,
  },
  pinSetupGrid: {
    gap: spacing.sm,
  },
  stateActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
  },
  heroPanel: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.lg,
  },
  heroPanelStack: {
    flexDirection: 'column',
  },
  heroMain: {
    flex: 1,
    minWidth: 0,
    gap: spacing.sm,
  },
  heroAside: {
    width: 296,
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    gap: spacing.sm,
  },
  heroAsideRow: {
    gap: 4,
  },
  heroAsideLabel: {
    fontSize: typography.fontSizes.xs,
    lineHeight: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  heroAsideValue: {
    fontSize: typography.fontSizes.md,
    lineHeight: 24,
  },
  workspaceStack: {
    gap: spacing.lg,
  },
});
