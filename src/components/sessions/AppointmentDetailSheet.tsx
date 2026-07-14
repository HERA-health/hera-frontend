import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button } from '../common/Button';
import { spacing } from '../../constants/colors';
import type { Theme } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import type { ClinicSessionDetail } from '../../services/clinicService';
import type { ProfessionalSessionDetail } from '../../services/professionalService';

type AppointmentDetailMode = 'clinic-admin' | 'professional';

interface AppointmentDetailSheetProps {
  visible: boolean;
  mode: AppointmentDetailMode;
  clinicSession?: ClinicSessionDetail | null;
  professionalSession?: ProfessionalSessionDetail | null;
  loading?: boolean;
  error?: string;
  processing?: boolean;
  onClose: () => void;
  onRetry?: () => void;
  onCancel?: () => void;
  onJoinVideo?: () => void;
  onOpenNotes?: () => void;
  onOpenPatient?: () => void;
  onOpenInvoice?: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmada',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
};

const TYPE_LABELS: Record<string, string> = {
  VIDEO_CALL: 'Videollamada',
  PHONE_CALL: 'Llamada',
  IN_PERSON: 'Presencial',
};

const FINANCIAL_SOURCE_LABELS: Record<ClinicSessionDetail['financials']['source'], string> = {
  ACTIVE_INVOICE: 'Factura activa',
  CURRENT_SPECIALIST_CONFIG: 'Configuración actual',
  UNCONFIGURED: 'Sin porcentaje configurado',
};

const formatMoney = (amount?: number | null, currency = 'EUR'): string =>
  typeof amount === 'number'
    ? new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
      }).format(amount)
    : 'Sin importe';

const formatPercentage = (value?: number | null): string =>
  typeof value === 'number' ? `${value.toFixed(2).replace(/\.00$/, '')}%` : 'Sin porcentaje';

const formatDate = (value?: string | null): string =>
  value
    ? new Date(value).toLocaleDateString('es-ES', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : 'Sin fecha';

const formatTime = (value?: string | null): string =>
  value
    ? new Date(value).toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '--:--';

const formatTimeRange = (date?: string | null, duration = 0): string => {
  if (!date) return 'Sin hora';
  const start = new Date(date);
  const end = new Date(start.getTime() + duration * 60 * 1000);
  return `${formatTime(date)} - ${formatTime(end.toISOString())}`;
};

const getStatusColor = (theme: Theme, status?: string): string => {
  switch (status) {
    case 'CONFIRMED':
      return theme.primary;
    case 'COMPLETED':
      return theme.success;
    case 'CANCELLED':
      return theme.error;
    case 'PENDING':
      return theme.warning;
    default:
      return theme.textMuted;
  }
};

export function AppointmentDetailSheet({
  visible,
  mode,
  clinicSession,
  professionalSession,
  loading = false,
  error = '',
  processing = false,
  onClose,
  onRetry,
  onCancel,
  onJoinVideo,
  onOpenNotes,
  onOpenPatient,
  onOpenInvoice,
}: AppointmentDetailSheetProps): React.ReactElement {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const detail = mode === 'clinic-admin' ? clinicSession : professionalSession;
  const statusColor = getStatusColor(theme, detail?.status);

  const patient = mode === 'clinic-admin'
    ? clinicSession?.patient
    : professionalSession?.client;
  const patientName = mode === 'clinic-admin'
    ? clinicSession?.patient.displayName
    : professionalSession?.client?.displayName
      || professionalSession?.client?.user?.name
      || 'Paciente';
  const patientEmail = mode === 'clinic-admin'
    ? clinicSession?.patient.email
    : professionalSession?.client?.primaryEmail
      || professionalSession?.client?.user?.email
      || professionalSession?.client?.email
      || null;
  const patientPhone = mode === 'clinic-admin'
    ? clinicSession?.patient.phone
    : professionalSession?.client?.primaryPhone
      || professionalSession?.client?.phone
      || null;
  const professionalName = mode === 'clinic-admin'
    ? clinicSession?.specialist.displayName
    : professionalSession?.professional.displayName;
  const professionalTitle = mode === 'clinic-admin'
    ? clinicSession?.specialist.professionalTitle
    : professionalSession?.professional.professionalTitle;
  const duration = detail?.bookedDuration ?? detail?.duration ?? 0;
  const priceAmount = mode === 'clinic-admin'
    ? clinicSession?.financials.priceAmount
    : professionalSession?.price.amount;
  const priceCurrency = mode === 'clinic-admin'
    ? clinicSession?.financials.currency
    : professionalSession?.price.currency;
  const canShowNotes = mode === 'professional'
    && Boolean(professionalSession?.clinicalTarget)
    && Boolean(onOpenNotes);
  const invoice = mode === 'clinic-admin' ? clinicSession?.invoice : professionalSession?.invoice;
  const canOpenInvoice = mode === 'professional'
    && professionalSession?.status === 'COMPLETED'
    && Boolean(professionalSession.invoice)
    && Boolean(onOpenInvoice);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Ionicons name="calendar-clear-outline" size={20} color={theme.primary} />
            </View>
            <View style={styles.headerCopy}>
              <Text style={styles.eyebrow}>
                {mode === 'clinic-admin' ? 'Detalle de cita' : 'Tu cita'}
              </Text>
              <Text style={styles.title} numberOfLines={2}>
                {patientName ?? 'Cita'}
              </Text>
            </View>
            <Button variant="ghost" size="small" onPress={onClose} disabled={processing}>
              Cerrar
            </Button>
          </View>

          {loading ? (
            <View style={styles.state}>
              <ActivityIndicator color={theme.primary} />
              <Text style={styles.stateText}>Cargando cita</Text>
            </View>
          ) : error ? (
            <View style={styles.state}>
              <Ionicons name="alert-circle-outline" size={24} color={theme.warning} />
              <Text style={styles.stateTitle}>No se pudo cargar la cita</Text>
              <Text style={styles.stateText}>{error}</Text>
              {onRetry ? (
                <Button variant="outline" size="medium" onPress={onRetry}>
                  Reintentar
                </Button>
              ) : null}
            </View>
          ) : detail ? (
            <>
              <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
                <View style={styles.summaryBand}>
                  <View style={[styles.statusPill, { borderColor: statusColor, backgroundColor: `${statusColor}14` }]}>
                    <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                    <Text style={[styles.statusText, { color: statusColor }]}>
                      {STATUS_LABELS[detail.status] ?? detail.status}
                    </Text>
                  </View>
                  {professionalSession?.origin === 'CLINIC' ? (
                    <View style={styles.contextPill}>
                      <Ionicons name="business-outline" size={14} color={theme.textSecondary} />
                      <Text style={styles.contextPillText}>Gestionada por clínica</Text>
                    </View>
                  ) : null}
                </View>

                <Section title="Horario" icon="time-outline">
                  <InfoRow label="Fecha" value={formatDate(detail.date)} />
                  <InfoRow label="Hora" value={formatTimeRange(detail.date, duration)} />
                  <InfoRow label="Duración" value={`${duration} min`} />
                  <InfoRow label="Modalidad" value={TYPE_LABELS[detail.type] ?? detail.type} />
                </Section>

                <Section title="Paciente" icon="person-outline">
                  <InfoRow label="Nombre" value={patientName ?? 'Sin nombre'} />
                  <InfoRow label="Email" value={patientEmail ?? 'Sin email'} />
                  <InfoRow label="Teléfono" value={patientPhone ?? 'Sin teléfono'} />
                  {patient && 'status' in patient ? (
                    <InfoRow label="Estado" value={patient.status === 'ACTIVE' ? 'Activo' : 'Archivado'} />
                  ) : null}
                </Section>

                <Section title="Profesional" icon="medkit-outline">
                  <InfoRow label="Nombre" value={professionalName ?? 'Sin profesional'} />
                  <InfoRow label="Título" value={professionalTitle ?? 'Sin título informado'} />
                  {professionalSession?.clinicContext ? (
                    <InfoRow label="Clínica" value={professionalSession.clinicContext.clinicName} />
                  ) : null}
                </Section>

                <Section title="Precio" icon="cash-outline">
                  <InfoRow label="Importe" value={formatMoney(priceAmount, priceCurrency ?? 'EUR')} />
                  <InfoRow
                    label="Tarifa"
                    value={
                      mode === 'clinic-admin'
                        ? clinicSession?.bookedTariffName ?? 'Sin tarifa'
                        : professionalSession?.price.tariffName ?? 'Sin tarifa'
                    }
                  />
                  {invoice ? (
                    <InfoRow
                      label="Factura"
                      value={`${invoice.invoiceNumber} · ${invoice.status}`}
                    />
                  ) : null}
                </Section>

                {mode === 'clinic-admin' && clinicSession ? (
                  <Section title="Reparto" icon="pie-chart-outline">
                    <InfoRow
                      label="Base"
                      value={formatMoney(
                        clinicSession.financials.shareBaseAmount,
                        clinicSession.financials.currency
                      )}
                    />
                    <InfoRow
                      label="Profesional"
                      value={`${formatPercentage(clinicSession.financials.professionalSharePercentage)} · ${formatMoney(
                        clinicSession.financials.professionalShareAmount,
                        clinicSession.financials.currency
                      )}`}
                    />
                    <InfoRow
                      label="Clínica"
                      value={`${formatPercentage(clinicSession.financials.clinicSharePercentage)} · ${formatMoney(
                        clinicSession.financials.clinicShareAmount,
                        clinicSession.financials.currency
                      )}`}
                    />
                    <InfoRow
                      label="Origen"
                      value={FINANCIAL_SOURCE_LABELS[clinicSession.financials.source]}
                    />
                  </Section>
                ) : null}
              </ScrollView>

              <View style={styles.footer}>
                {mode === 'clinic-admin' ? (
                  <>
                    {clinicSession?.actions.canCancel && onCancel ? (
                      <Button
                        variant="outline"
                        size="medium"
                        onPress={onCancel}
                        disabled={processing}
                      >
                        Cancelar cita
                      </Button>
                    ) : null}
                  </>
                ) : (
                  <>
                    {onOpenPatient ? (
                      <Button
                        variant="outline"
                        size="medium"
                        onPress={onOpenPatient}
                        icon={<Ionicons name="person-circle-outline" size={18} color={theme.primary} />}
                      >
                        Ver ficha
                      </Button>
                    ) : null}
                    {canOpenInvoice ? (
                      <Button
                        variant="outline"
                        size="medium"
                        onPress={() => {
                          onOpenInvoice?.();
                        }}
                        icon={<Ionicons name="receipt-outline" size={18} color={theme.primary} />}
                      >
                        Ver factura
                      </Button>
                    ) : null}
                    {canShowNotes ? (
                      <Button
                        variant="secondary"
                        size="medium"
                        onPress={() => {
                          onOpenNotes?.();
                        }}
                        icon={<Ionicons name="document-text-outline" size={18} color={theme.primary} />}
                      >
                        Abrir notas
                      </Button>
                    ) : null}
                    {professionalSession?.actions?.canJoinVideo && onJoinVideo ? (
                      <Button
                        variant="primary"
                        size="medium"
                        onPress={onJoinVideo}
                        icon={<Ionicons name="videocam-outline" size={18} color={theme.actionPrimaryText} />}
                      >
                        Unirse
                      </Button>
                    ) : null}
                  </>
                )}
              </View>
            </>
          ) : (
            <View style={styles.state}>
              <Ionicons name="calendar-outline" size={24} color={theme.textMuted} />
              <Text style={styles.stateText}>Selecciona una cita para ver su detalle.</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  children: React.ReactNode;
}): React.ReactElement {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon} size={17} color={theme.primary} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={styles.rows}>{children}</View>
    </View>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}): React.ReactElement {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.overlay,
      padding: spacing.lg,
    },
    sheet: {
      width: '100%',
      maxWidth: 680,
      maxHeight: '92%',
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      backgroundColor: theme.bgCard,
      overflow: 'hidden',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      padding: spacing.lg,
    },
    headerIcon: {
      width: 38,
      height: 38,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primaryAlpha12,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    headerCopy: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    eyebrow: {
      color: theme.textMuted,
      fontFamily: theme.fontSansSemiBold,
      fontSize: 12,
      lineHeight: 16,
      textTransform: 'uppercase',
    },
    title: {
      color: theme.textPrimary,
      fontFamily: theme.fontSansBold,
      fontSize: 20,
      lineHeight: 26,
    },
    body: {
      padding: spacing.lg,
      gap: spacing.md,
    },
    summaryBand: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      alignItems: 'center',
    },
    statusPill: {
      minHeight: 30,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: spacing.sm,
      paddingVertical: 5,
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    statusText: {
      fontFamily: theme.fontSansSemiBold,
      fontSize: 13,
      lineHeight: 18,
    },
    contextPill: {
      minHeight: 30,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      backgroundColor: theme.bgMuted,
      paddingHorizontal: spacing.sm,
      paddingVertical: 5,
    },
    contextPillText: {
      color: theme.textSecondary,
      fontFamily: theme.fontSansSemiBold,
      fontSize: 13,
      lineHeight: 18,
    },
    section: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      backgroundColor: theme.bg,
      overflow: 'hidden',
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: theme.bgMuted,
    },
    sectionTitle: {
      color: theme.textPrimary,
      fontFamily: theme.fontSansBold,
      fontSize: 15,
      lineHeight: 21,
    },
    rows: {
      paddingHorizontal: spacing.md,
    },
    row: {
      minHeight: 40,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
      paddingVertical: spacing.sm,
    },
    rowLabel: {
      color: theme.textMuted,
      fontFamily: theme.fontSansSemiBold,
      fontSize: 12,
      lineHeight: 17,
    },
    rowValue: {
      flex: 1,
      color: theme.textPrimary,
      fontFamily: theme.fontSans,
      fontSize: 14,
      lineHeight: 20,
      textAlign: 'right',
    },
    footer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'flex-end',
      gap: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      padding: spacing.lg,
    },
    state: {
      minHeight: 260,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.md,
      padding: spacing.xl,
    },
    stateTitle: {
      color: theme.textPrimary,
      fontFamily: theme.fontSansBold,
      fontSize: 18,
      lineHeight: 24,
      textAlign: 'center',
    },
    stateText: {
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
      fontSize: 14,
      lineHeight: 21,
      textAlign: 'center',
    },
  });

export default AppointmentDetailSheet;
