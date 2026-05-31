import React, { useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { SimpleDropdown } from '../../components/common/SimpleDropdown';
import { borderRadius, spacing, typography } from '../../constants/colors';
import { Theme } from '../../constants/theme';
import type { ScreenProps } from '../../constants/types';
import { useTheme } from '../../contexts/ThemeContext';
import { ClinicWorkspaceScaffold } from './components/ClinicWorkspaceScaffold';
import {
  CREATE_KIND_OPTIONS,
  useClinicBillingController,
  type ClinicBillingInvoiceErrors,
  type ClinicBillingInvoiceForm,
} from './useClinicBillingController';

export function ClinicInvoiceCreateScreen({
  navigation,
}: ScreenProps<'ClinicInvoiceCreate'>): React.ReactElement {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const isCompact = width < 780;
  const styles = useMemo(() => createStyles(theme, isCompact), [isCompact, theme]);
  const {
    canManage,
    completedSessionLoading,
    completedSessionLoadingMore,
    completedSessionOptions,
    completedSessionPageInfo,
    handleCreateFromSession,
    handleCreateInvoice,
    handleLoadMoreCompletedSessions,
    handleLoadMorePatientOptions,
    handlePatientLookupSearchChange,
    handleRetry,
    handleSelectClinic,
    invoiceErrors,
    invoiceForm,
    patientLookupLoading,
    patientLookupLoadingMore,
    patientLookupPageInfo,
    patientLookupSearch,
    patientOptions,
    saving,
    selectedSessionId,
    setInvoiceField,
    setSelectedSessionId,
    workspace,
  } = useClinicBillingController();

  const clinicName = workspace.selectedMembership?.clinic.commercialName;

  const handleCreateAndReturn = async (): Promise<void> => {
    const created = await handleCreateInvoice();
    if (created) {
      navigation.navigate('ClinicBilling');
    }
  };

  const handleCreateFromSessionAndReturn = async (): Promise<void> => {
    const created = await handleCreateFromSession();
    if (created) {
      navigation.navigate('ClinicBilling');
    }
  };

  return (
    <ClinicWorkspaceScaffold
      title="Nueva factura"
      contextLabel={clinicName}
      subtitle="Crea borradores administrativos de clínica sin incorporar notas, documentos ni contenido clínico."
      memberships={workspace.memberships}
      selectedClinicId={workspace.selectedClinicId}
      loading={workspace.loading}
      error={workspace.error}
      onSelectClinic={handleSelectClinic}
      onRetry={handleRetry}
      action={workspace.selectedClinicId ? (
        <Button
          variant="ghost"
          size="medium"
          onPress={() => navigation.navigate('ClinicBilling')}
          icon={<Ionicons name="arrow-back-outline" size={18} color={theme.primary} />}
        >
          Volver
        </Button>
      ) : undefined}
    >
      {!workspace.selectedMembership ? (
        <StatePanel
          icon="business-outline"
          title="No hay clínica vinculada"
          text="Selecciona una clínica activa para preparar una factura."
          isCompact={isCompact}
        />
      ) : (
        <View style={styles.workspace}>
          {!canManage ? (
            <View style={styles.notice}>
              <Ionicons name="lock-closed-outline" size={18} color={theme.warning} />
              <Text style={styles.noticeText}>
                La creación de facturas de clínica está reservada a propietarios y administradores.
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.infoBanner}>
                <Ionicons name="shield-checkmark-outline" size={18} color={theme.primary} />
                <Text style={styles.infoText}>
                  Usa solo conceptos administrativos o fiscales. Esta vista no traslada datos clínicos,
                  notas privadas ni documentos de pacientes.
                </Text>
              </View>
              <InvoiceCreatePanel
                form={invoiceForm}
                errors={invoiceErrors}
                patientOptions={patientOptions}
                patientLookupSearch={patientLookupSearch}
                patientLookupLoading={patientLookupLoading}
                patientLookupLoadingMore={patientLookupLoadingMore}
                patientLookupHasMore={Boolean(patientLookupPageInfo?.hasMore)}
                sessionOptions={completedSessionOptions}
                sessionLookupLoading={completedSessionLoading}
                sessionLookupLoadingMore={completedSessionLoadingMore}
                sessionLookupHasMore={Boolean(completedSessionPageInfo?.hasMore)}
                selectedSessionId={selectedSessionId}
                saving={saving}
                isCompact={isCompact}
                onChange={setInvoiceField}
                onCreate={handleCreateAndReturn}
                onCreateFromSession={handleCreateFromSessionAndReturn}
                onLoadMorePatients={handleLoadMorePatientOptions}
                onLoadMoreSessions={handleLoadMoreCompletedSessions}
                onPatientSearchChange={handlePatientLookupSearchChange}
                onSelectSession={setSelectedSessionId}
              />
            </>
          )}
        </View>
      )}
    </ClinicWorkspaceScaffold>
  );
}

function InvoiceCreatePanel({
  form,
  errors,
  patientOptions,
  patientLookupSearch,
  patientLookupLoading,
  patientLookupLoadingMore,
  patientLookupHasMore,
  sessionOptions,
  sessionLookupLoading,
  sessionLookupLoadingMore,
  sessionLookupHasMore,
  selectedSessionId,
  saving,
  isCompact,
  onChange,
  onCreate,
  onCreateFromSession,
  onLoadMorePatients,
  onLoadMoreSessions,
  onPatientSearchChange,
  onSelectSession,
}: {
  form: ClinicBillingInvoiceForm;
  errors: ClinicBillingInvoiceErrors;
  patientOptions: Array<{ label: string; value: string; subtitle?: string }>;
  patientLookupSearch: string;
  patientLookupLoading: boolean;
  patientLookupLoadingMore: boolean;
  patientLookupHasMore: boolean;
  sessionOptions: Array<{ label: string; value: string; subtitle?: string }>;
  sessionLookupLoading: boolean;
  sessionLookupLoadingMore: boolean;
  sessionLookupHasMore: boolean;
  selectedSessionId: string;
  saving: boolean;
  isCompact: boolean;
  onChange: <K extends keyof ClinicBillingInvoiceForm>(
    field: K,
    value: ClinicBillingInvoiceForm[K],
  ) => void;
  onCreate: () => void;
  onCreateFromSession: () => void;
  onLoadMorePatients: () => void;
  onLoadMoreSessions: () => void;
  onPatientSearchChange: (search: string) => void;
  onSelectSession: (sessionId: string) => void;
}): React.ReactElement {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme, isCompact), [isCompact, theme]);

  return (
    <View style={styles.panel}>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Crear factura</Text>
          <Text style={styles.sectionSubtitle}>Borrador manual o desde una cita completada.</Text>
        </View>
      </View>

      <View style={styles.formGrid}>
        <View style={styles.dropdownStackTop}>
          <Text style={styles.filterLabel}>Paciente</Text>
          <Input
            label="Buscar paciente"
            value={patientLookupSearch}
            onChangeText={onPatientSearchChange}
            containerStyle={styles.lookupInput}
          />
          <SimpleDropdown
            options={patientOptions}
            value={form.clinicPatientId || null}
            onSelect={(value) => onChange('clinicPatientId', value)}
            placeholder="Selecciona paciente"
          />
          {patientLookupHasMore ? (
            <Button
              variant="ghost"
              size="small"
              onPress={onLoadMorePatients}
              loading={patientLookupLoadingMore}
              disabled={patientLookupLoading || patientLookupLoadingMore}
            >
              Cargar mas pacientes
            </Button>
          ) : null}
          {errors.clinicPatientId || errors.clinicSpecialistId ? (
            <Text style={styles.fieldError}>{errors.clinicPatientId ?? errors.clinicSpecialistId}</Text>
          ) : null}
        </View>
        <View style={styles.dropdownStackMiddle}>
          <Text style={styles.filterLabel}>Tipo</Text>
          <SimpleDropdown
            options={CREATE_KIND_OPTIONS}
            value={form.invoiceKind}
            onSelect={(value) => onChange('invoiceKind', value)}
          />
        </View>
        <Input
          label="Concepto"
          value={form.concept}
          onChangeText={(value) => onChange('concept', value)}
          error={errors.concept}
        />
        <View style={styles.inlineFields}>
          <Input
            label="Total"
            value={form.subtotal}
            onChangeText={(value) => onChange('subtotal', value)}
            keyboardType="decimal-pad"
            error={errors.subtotal}
            containerStyle={styles.inlineField}
          />
          <Input
            label="IVA"
            value={form.vatRate}
            onChangeText={(value) => onChange('vatRate', value)}
            keyboardType="numeric"
            error={errors.vatRate}
            containerStyle={styles.inlineField}
          />
        </View>
        <View style={styles.inlineFields}>
          <Input
            label="Fecha sesión"
            value={form.sessionDate}
            onChangeText={(value) => onChange('sessionDate', value)}
            placeholder="YYYY-MM-DD"
            error={errors.sessionDate}
            containerStyle={styles.inlineField}
          />
          <Input
            label="Minutos"
            value={form.durationMinutes}
            onChangeText={(value) => onChange('durationMinutes', value)}
            keyboardType="numeric"
            error={errors.durationMinutes}
            containerStyle={styles.inlineField}
          />
        </View>
        <Input
          label="Notas administrativas internas"
          value={form.internalNotes}
          onChangeText={(value) => onChange('internalNotes', value)}
          error={errors.internalNotes}
          helperText="Solo motivo administrativo, sin datos clínicos."
        />
      </View>

      <View style={styles.actionRow}>
        <Button
          variant="primary"
          size="medium"
          onPress={onCreate}
          loading={saving}
          disabled={saving || patientOptions.length === 0}
          fullWidth={isCompact}
          icon={<Ionicons name="receipt-outline" size={18} color={theme.actionPrimaryText} />}
        >
          Crear borrador
        </Button>
      </View>

      <View style={styles.sessionBox}>
        <Text style={styles.filterLabel}>Cita completada</Text>
        <View style={styles.dropdownStackTop}>
          <SimpleDropdown
            options={sessionOptions}
            value={selectedSessionId || null}
            onSelect={onSelectSession}
            placeholder="Selecciona cita"
            maxHeight={260}
          />
          {sessionLookupHasMore ? (
            <Button
              variant="ghost"
              size="small"
              onPress={onLoadMoreSessions}
              loading={sessionLookupLoadingMore}
              disabled={sessionLookupLoading || sessionLookupLoadingMore}
            >
              Cargar mas citas
            </Button>
          ) : null}
        </View>
        <Button
          variant="outline"
          size="medium"
          onPress={onCreateFromSession}
          disabled={saving || !selectedSessionId}
          fullWidth
          icon={<Ionicons name="add-circle-outline" size={18} color={theme.primary} />}
        >
          Facturar cita
        </Button>
      </View>
    </View>
  );
}

function StatePanel({
  icon,
  title,
  text,
  actionLabel,
  onAction,
  isCompact,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  text: string;
  actionLabel?: string;
  onAction?: () => void;
  isCompact: boolean;
}): React.ReactElement {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme, isCompact), [isCompact, theme]);

  return (
    <View style={styles.statePanel}>
      <Ionicons name={icon} size={24} color={theme.primary} />
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateText}>{text}</Text>
      {actionLabel && onAction ? (
        <Button variant="outline" size="medium" onPress={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </View>
  );
}

const createStyles = (theme: Theme, isCompact: boolean) =>
  StyleSheet.create({
    workspace: {
      gap: spacing.lg,
    },
    notice: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      padding: spacing.md,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.warning,
      backgroundColor: theme.warningBg,
    },
    noticeText: {
      flex: 1,
      color: theme.textPrimary,
      fontFamily: theme.fontSansMedium,
      fontSize: typography.fontSizes.sm,
    },
    infoBanner: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      padding: spacing.md,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.bgMuted,
    },
    infoText: {
      flex: 1,
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
      fontSize: typography.fontSizes.sm,
      lineHeight: 20,
    },
    panel: {
      width: '100%',
      gap: spacing.lg,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: borderRadius.lg,
      backgroundColor: theme.bgCard,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    sectionTitle: {
      color: theme.textPrimary,
      fontFamily: theme.fontSansBold,
      fontSize: typography.fontSizes.lg,
    },
    sectionSubtitle: {
      marginTop: 2,
      color: theme.textMuted,
      fontFamily: theme.fontSans,
      fontSize: typography.fontSizes.sm,
    },
    formGrid: {
      gap: spacing.md,
    },
    dropdownStackTop: {
      position: 'relative',
      zIndex: 60,
      elevation: 60,
    },
    dropdownStackMiddle: {
      position: 'relative',
      zIndex: 50,
      elevation: 50,
    },
    filterLabel: {
      marginBottom: spacing.xs,
      color: theme.textSecondary,
      fontFamily: theme.fontSansSemiBold,
      fontSize: typography.fontSizes.sm,
    },
    lookupInput: {
      marginBottom: 0,
    },
    fieldError: {
      marginTop: spacing.xs,
      color: theme.error,
      fontFamily: theme.fontSans,
      fontSize: typography.fontSizes.xs,
    },
    inlineFields: {
      flexDirection: isCompact ? 'column' : 'row',
      gap: spacing.md,
    },
    inlineField: {
      flex: 1,
      marginBottom: 0,
    },
    actionRow: {
      alignItems: isCompact ? 'stretch' : 'flex-start',
    },
    sessionBox: {
      gap: spacing.md,
      padding: spacing.md,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.bgMuted,
    },
    statePanel: {
      alignItems: 'center',
      gap: spacing.sm,
      padding: spacing.xl,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: borderRadius.lg,
      backgroundColor: theme.bgCard,
    },
    stateTitle: {
      color: theme.textPrimary,
      fontFamily: theme.fontSansBold,
      fontSize: typography.fontSizes.lg,
      textAlign: 'center',
    },
    stateText: {
      maxWidth: 520,
      color: theme.textMuted,
      fontFamily: theme.fontSans,
      fontSize: typography.fontSizes.sm,
      lineHeight: 20,
      textAlign: 'center',
    },
  });

export default ClinicInvoiceCreateScreen;
