import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { AnimatedPressable, Button, Card } from '../common';
import { PinCodeInput } from './PinCodeInput';
import { ClinicalGeneralWorkspace } from './ClinicalGeneralWorkspace';
import { ClinicalSessionsWorkspace } from './ClinicalSessionsWorkspace';
import { borderRadius, spacing, typography } from '../../constants/colors';
import { useTheme } from '../../contexts/ThemeContext';
import type { Client } from '../../services/professionalService';
import { getErrorMessage } from '../../constants/errors';
import { useClinicalAccessController } from '../../hooks/useClinicalAccessController';
import { useClinicalWorkspaceData } from '../../hooks/useClinicalWorkspaceData';

interface ClinicalTabProps {
  clientId: string;
  client: Client;
  onRequestRefreshClient?: () => Promise<void>;
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

export function ClinicalTab({ clientId, client, onRequestRefreshClient }: ClinicalTabProps) {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const isTablet = width >= 920;

  const [workspace, setWorkspace] = useState<ClinicalWorkspaceKey>('general');
  const [banner, setBanner] = useState<BannerState | null>(null);
  const [pin, setPin] = useState('');
  const [setupPin, setSetupPin] = useState('');
  const [setupPinConfirm, setSetupPinConfirm] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [showSetupPin, setShowSetupPin] = useState(false);

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

  const handleWorkspaceAccessLost = useCallback(
    (message: string) => {
      void access.clearAccessState(message);
    },
    [access.clearAccessState]
  );

  const workspaceData = useClinicalWorkspaceData({
    clientId,
    token: access.token,
    onRequestRefreshClient,
    onAccessLost: handleWorkspaceAccessLost,
  });

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
    setWorkspace('general');
    setPin('');
    setSetupPin('');
    setSetupPinConfirm('');
    setBanner(null);
  }, [clientId]);

  useFocusEffect(
    useCallback(() => {
      void access.loadStatus();

      if (access.token) {
        void workspaceData.loadRecord();
      }
    }, [access.loadStatus, access.token, workspaceData.loadRecord])
  );

  const handleAcceptDpa = async () => {
    try {
      await access.acceptDataProcessingAgreement();
      showBanner('success', 'Encargo de tratamiento aceptado. Ya puedes configurar el acceso clinico.');
    } catch (error) {
      showBanner('error', getErrorMessage(error, 'No se pudo aceptar el encargo de tratamiento.'));
    }
  };

  const handleSetupPin = async () => {
    if (!isValidPin(setupPin)) {
      showBanner('warning', 'El PIN clinico debe tener 6 digitos.');
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
      showBanner('success', 'PIN clinico configurado. Ya puedes abrir el expediente.');
    } catch (error) {
      showBanner('error', getErrorMessage(error, 'No se pudo configurar el PIN clinico.'));
    }
  };

  const handleUnlock = async () => {
    if (!isValidPin(pin)) {
      showBanner('warning', 'Introduce un PIN clinico valido de 6 digitos.');
      return;
    }

    try {
      await access.unlockClinicalArea(pin);
      setPin('');
      showBanner('success', 'Area clinica abierta. Puedes trabajar con el expediente desde aqui.');
    } catch (error) {
      showBanner('error', getErrorMessage(error, 'No se pudo desbloquear el area clinica.'));
    }
  };

  const handleLock = async () => {
    try {
      await access.lockClinicalArea();
      showBanner('info', 'Area clinica cerrada.');
    } catch (error) {
      showBanner('error', getErrorMessage(error, 'No se pudo bloquear el area clinica.'));
    }
  };

  const hasAcceptedDpa = Boolean(access.accessStatus?.acceptedDataProcessingAgreementAt);
  const hasPin = Boolean(access.accessStatus?.hasPin);
  const hasActiveSession = Boolean(access.token && access.accessStatus?.session.active);
  const record = workspaceData.record;
  const recordLoading = workspaceData.recordLoading;

  const consentLabel = record
    ? record.consentStatus === 'GRANTED'
      ? 'Vigente'
      : record.consentStatus === 'REVOKED'
        ? 'Retirado'
        : 'Pendiente'
    : client.consentOnFile
      ? 'Vigente'
      : 'Pendiente';

  const consentColor =
    consentLabel === 'Vigente'
      ? theme.success
      : consentLabel === 'Retirado'
        ? theme.error
        : theme.warning;

  const sidebarRows: SidebarRow[] = hasActiveSession
    ? [
        { label: 'Consentimiento', value: consentLabel, color: consentColor },
        {
          label: 'Retencion',
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
        { label: 'Consentimiento', value: consentLabel, color: consentColor },
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
                { color: item.color, fontFamily: theme.fontDisplayBold },
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

      {access.statusLoading ? (
        <Card variant="default" padding="large">
          <View style={styles.centeredState}>
            <ActivityIndicator size="small" color={theme.primary} />
            <Text style={[styles.centeredText, { color: theme.textSecondary }]}>
              Preparando el acceso clinico...
            </Text>
          </View>
        </Card>
      ) : !hasAcceptedDpa ? (
        <Card variant="default" padding="large">
          <View style={[styles.singlePanel, styles.focusPanel]}>
            <View style={styles.stateCopy}>
              <View style={[styles.eyebrowPill, { backgroundColor: theme.primaryAlpha12 }]}>
                <Ionicons name="shield-checkmark-outline" size={14} color={theme.primary} />
                <Text style={[styles.eyebrowPillText, { color: theme.primary, fontFamily: theme.fontSansSemiBold }]}>
                  Area clinica protegida
                </Text>
              </View>
              <Text style={[styles.stateTitle, { color: theme.textPrimary, fontFamily: theme.fontDisplayBold }]}>
                Activa el encargo de tratamiento
              </Text>
              <Text style={[styles.stateDescription, { color: theme.textSecondary }]}>
                Antes de abrir historias clinicas debes aceptar la version vigente del encargo de tratamiento.
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
                  Primer acceso clinico
                </Text>
              </View>
              <Text style={[styles.stateTitle, { color: theme.textPrimary, fontFamily: theme.fontDisplayBold }]}>
                Configura tu PIN clinico
              </Text>
              <Text style={[styles.stateDescription, { color: theme.textSecondary }]}>
                Usa un codigo de 6 digitos para proteger la entrada al expediente.
              </Text>
            </View>

            <View style={styles.pinSetupGrid}>
              <PinCodeInput
                value={setupPin}
                onChange={setSetupPin}
                masked={!showSetupPin}
                label="Crea tu PIN"
                hint="6 digitos"
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
          <View style={[styles.heroPanel, !isTablet && styles.heroPanelStack]}>
            <View style={styles.heroMain}>
              <View style={[styles.eyebrowPill, { backgroundColor: theme.primaryAlpha12 }]}>
                <Ionicons name="shield-checkmark-outline" size={14} color={theme.primary} />
                <Text style={[styles.eyebrowPillText, { color: theme.primary, fontFamily: theme.fontSansSemiBold }]}>
                  Area clinica protegida
                </Text>
              </View>
              <Text style={[styles.stateTitle, { color: theme.textPrimary, fontFamily: theme.fontDisplayBold }]}>
                Desbloquear expediente
              </Text>
              <Text style={[styles.stateDescription, { color: theme.textSecondary }]}>
                Introduce tu PIN para entrar en la parte privada del expediente y continuar tu trabajo.
              </Text>

              <PinCodeInput
                value={pin}
                onChange={setPin}
                masked={!showPin}
                label="PIN clinico"
                hint="Solo tu puedes abrir este expediente"
              />

              <View style={styles.stateActions}>
                <Button variant="ghost" size="small" onPress={() => setShowPin((current) => !current)}>
                  {showPin ? 'Ocultar PIN' : 'Mostrar PIN'}
                </Button>
                <Button
                  variant="primary"
                  size="small"
                  onPress={handleUnlock}
                  loading={access.accessSubmitting}
                >
                  Abrir expediente
                </Button>
              </View>
            </View>

            {renderSidebar(sidebarRows)}
          </View>
        </Card>
      ) : recordLoading || !record ? (
        <Card variant="default" padding="large">
          <View style={styles.centeredState}>
            <ActivityIndicator size="small" color={theme.primary} />
            <Text style={[styles.centeredText, { color: theme.textSecondary }]}>
              Cargando expediente clinico...
            </Text>
          </View>
        </Card>
      ) : (
        <View style={styles.workspaceStack}>
          <Card variant="default" padding="large">
            <View style={[styles.heroPanel, !isTablet && styles.heroPanelStack]}>
              <View style={styles.heroMain}>
                <View style={[styles.eyebrowPill, { backgroundColor: theme.primaryAlpha12 }]}>
                  <Ionicons name="shield-checkmark-outline" size={14} color={theme.primary} />
                  <Text style={[styles.eyebrowPillText, { color: theme.primary, fontFamily: theme.fontSansSemiBold }]}>
                    Area clinica disponible
                  </Text>
                </View>
                <Text style={[styles.stateTitle, { color: theme.textPrimary, fontFamily: theme.fontDisplayBold }]}>
                  Expediente abierto
                </Text>
                <Text style={[styles.stateDescription, { color: theme.textSecondary }]}>
                  Todo el contenido clinico del paciente esta listo para trabajar desde aqui.
                </Text>
              </View>

              {renderSidebar(sidebarRows, true)}
            </View>
          </Card>

          <View style={styles.segmentedWrap}>
            {[
              { key: 'general' as const, label: 'General', icon: 'folder-open-outline' as const },
              { key: 'sessions' as const, label: 'Sesiones', icon: 'calendar-outline' as const },
            ].map((item) => {
              const active = workspace === item.key;

              return (
                <AnimatedPressable
                  key={item.key}
                  hoverLift={false}
                  pressScale={0.99}
                  onPress={() => setWorkspace(item.key)}
                  style={[
                    styles.segmentedItem,
                    {
                      backgroundColor: active ? theme.primary : theme.bgCard,
                      borderColor: active ? theme.primary : theme.border,
                    },
                  ]}
                >
                  <Ionicons
                    name={item.icon}
                    size={16}
                    color={active ? '#FFFFFF' : theme.textSecondary}
                  />
                  <Text
                    style={[
                      styles.segmentedText,
                      {
                        color: active ? '#FFFFFF' : theme.textSecondary,
                        fontFamily: theme.fontSansSemiBold,
                      },
                    ]}
                  >
                    {item.label}
                  </Text>
                </AnimatedPressable>
              );
            })}
          </View>

          {workspace === 'general' ? (
            <ClinicalGeneralWorkspace
              client={client}
              record={record}
              isTablet={isTablet}
              noteSaving={workspaceData.noteSaving}
              documentUploading={workspaceData.documentUploading}
              consentSubmitting={workspaceData.consentSubmitting}
              closingProcess={workspaceData.closingProcess}
              openingDocumentId={workspaceData.openingDocumentId}
              loadingMoreNotes={workspaceData.loadingMoreNotes}
              loadingMoreDocuments={workspaceData.loadingMoreDocuments}
              loadingMoreConsentEvents={workspaceData.loadingMoreConsentEvents}
              onSaveNote={workspaceData.saveClinicalNote}
              onOpenDocument={workspaceData.openClinicalDocument}
              onUploadDocument={workspaceData.uploadClinicalDocument}
              onRequestDigitalConsent={workspaceData.requestDigitalConsent}
              onAttestClinicalConsent={workspaceData.attestClinicalConsent}
              onCloseClinicalProcess={workspaceData.closeClinicalProcess}
              onLoadMoreNotes={workspaceData.loadMoreNotes}
              onLoadMoreDocuments={workspaceData.loadMoreDocuments}
              onLoadMoreConsentEvents={workspaceData.loadMoreConsentEvents}
            />
          ) : (
            <ClinicalSessionsWorkspace
              clientId={clientId}
              client={client}
              isTablet={isTablet}
              sessionFolders={record.sessionFolders}
              hasMore={record.pagination.sessionFolders.hasMore}
              loadingMore={workspaceData.loadingMoreSessions}
              consentGranted={record.consentStatus === 'GRANTED'}
              noteSaving={workspaceData.noteSaving}
              documentUploading={workspaceData.documentUploading}
              openingDocumentId={workspaceData.openingDocumentId}
              onOpenDocument={workspaceData.openClinicalDocument}
              onSaveNote={workspaceData.saveClinicalNote}
              onUploadDocument={workspaceData.uploadClinicalDocument}
              onLoadMore={workspaceData.loadMoreSessionFolders}
              onReloadWorkspace={workspaceData.loadRecord}
              onRequestRefreshClient={onRequestRefreshClient}
            />
          )}
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
  segmentedWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  segmentedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
  },
  segmentedText: {
    fontSize: typography.fontSizes.sm,
    lineHeight: 20,
  },
});
