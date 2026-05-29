import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Switch,
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
import * as clinicService from '../../services/clinicService';
import { ClinicWorkspaceScaffold } from './components/ClinicWorkspaceScaffold';
import {
  CREATE_KIND_OPTIONS,
  KIND_OPTIONS,
  STATUS_OPTIONS,
  useClinicBillingController,
  type ClinicBillingConfigErrors,
  type ClinicBillingConfigForm,
  type ClinicBillingInvoiceErrors,
  type ClinicBillingInvoiceForm,
} from './useClinicBillingController';

const INVOICE_STATUS_LABELS: Record<clinicService.ClinicInvoiceStatus, string> = {
  DRAFT: 'Borrador',
  SENT: 'Enviada',
  PAID: 'Pagada',
  CANCELLED: 'Cancelada',
};

const INVOICE_KIND_LABELS: Record<clinicService.ClinicInvoiceKind, string> = {
  SIMPLIFIED: 'Simplificada',
  FULL: 'Completa',
};

const formatCurrency = (value: number): string =>
  value.toLocaleString('es-ES', {
    style: 'currency',
    currency: 'EUR',
  });

const formatDate = (value: string | null): string =>
  value
    ? new Date(value).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : 'Sin fecha';

export function ClinicBillingScreen({
  navigation,
}: ScreenProps<'ClinicBilling'>): React.ReactElement {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const isCompact = width < 960;
  const styles = useMemo(() => createStyles(theme, isCompact), [isCompact, theme]);
  const {
    canManage,
    completedSessionOptions,
    configErrors,
    configForm,
    editableFilters,
    error,
    handleApplyFilters,
    handleCreateFromSession,
    handleCreateInvoice,
    handleInvoiceAction,
    handleLoadMore,
    handleRetry,
    handleSaveConfig,
    handleSelectClinic,
    invoiceErrors,
    invoiceForm,
    invoices,
    loading,
    loadingMore,
    pageInfo,
    patientFilterOptions,
    patientOptions,
    saving,
    selectedSessionId,
    setConfigField,
    setEditableFilter,
    setInvoiceField,
    setSelectedSessionId,
    summary,
    workspace,
  } = useClinicBillingController();

  const clinicName = workspace.selectedMembership?.clinic.commercialName ?? 'Facturación de clínica';

  return (
    <ClinicWorkspaceScaffold
      title={clinicName}
      subtitle="Emite y gestiona facturas administrativas de la clínica sin mezclar la facturación privada del profesional."
      memberships={workspace.memberships}
      selectedClinicId={workspace.selectedClinicId}
      loading={workspace.loading}
      error={workspace.error}
      onSelectClinic={handleSelectClinic}
      onRetry={handleRetry}
      action={workspace.selectedClinicId ? (
        <View style={styles.headerActions}>
          <Button
            variant="ghost"
            size="medium"
            onPress={() => navigation.navigate('ClinicAgenda')}
            icon={<Ionicons name="calendar-outline" size={18} color={theme.primary} />}
          >
            Agenda
          </Button>
          <Button
            variant="ghost"
            size="medium"
            onPress={() => navigation.navigate('ClinicDashboard')}
            icon={<Ionicons name="business-outline" size={18} color={theme.primary} />}
          >
            Panel
          </Button>
        </View>
      ) : undefined}
    >
      {!workspace.selectedMembership ? (
        <StatePanel
          icon="business-outline"
          isCompact={isCompact}
          title="No hay clínica vinculada"
          text="Cuando esta cuenta tenga una clínica activa asociada, la facturación aparecerá aquí."
        />
      ) : (
        <View style={styles.workspace}>
          {!canManage ? (
            <View style={styles.notice}>
              <Ionicons name="lock-closed-outline" size={18} color={theme.warning} />
              <Text style={styles.noticeText}>
                La facturación de clínica está reservada a propietarios y administradores.
              </Text>
            </View>
          ) : null}

          <SummaryBand summary={summary} loading={loading} isCompact={isCompact} />

          <View style={styles.topGrid}>
            <ConfigPanel
              form={configForm}
              errors={configErrors}
              saving={saving}
              isCompact={isCompact}
              onChange={setConfigField}
              onSave={handleSaveConfig}
            />
            <InvoiceCreatePanel
              form={invoiceForm}
              errors={invoiceErrors}
              patientOptions={patientOptions}
              sessionOptions={completedSessionOptions}
              selectedSessionId={selectedSessionId}
              saving={saving}
              isCompact={isCompact}
              onChange={setInvoiceField}
              onCreate={handleCreateInvoice}
              onCreateFromSession={handleCreateFromSession}
              onSelectSession={setSelectedSessionId}
            />
          </View>

          <View style={styles.filters}>
            <View style={styles.filterDropdown}>
              <Text style={styles.filterLabel}>Estado</Text>
              <SimpleDropdown
                options={STATUS_OPTIONS}
                value={editableFilters.statusFilter}
                onSelect={(value) => setEditableFilter('statusFilter', value)}
              />
            </View>
            <View style={styles.filterDropdown}>
              <Text style={styles.filterLabel}>Tipo</Text>
              <SimpleDropdown
                options={KIND_OPTIONS}
                value={editableFilters.invoiceKindFilter}
                onSelect={(value) => setEditableFilter('invoiceKindFilter', value)}
              />
            </View>
            <View style={styles.filterDropdown}>
              <Text style={styles.filterLabel}>Paciente</Text>
              <SimpleDropdown
                options={patientFilterOptions}
                value={editableFilters.patientFilter}
                onSelect={(value) => setEditableFilter('patientFilter', value)}
              />
            </View>
            <View style={styles.filterAction}>
              <Button
                variant="outline"
                size="medium"
                onPress={handleApplyFilters}
                disabled={!canManage || loading}
                icon={<Ionicons name="funnel-outline" size={18} color={theme.primary} />}
              >
                Aplicar
              </Button>
            </View>
          </View>

          <View style={styles.invoicePanel}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Facturas</Text>
                <Text style={styles.sectionSubtitle}>
                  {pageInfo ? `${pageInfo.total} registros` : 'Listado administrativo'}
                </Text>
              </View>
              {loading ? <ActivityIndicator color={theme.primary} size="small" /> : null}
            </View>

            {error ? (
              <StatePanel
                icon="alert-circle-outline"
                title="No se pudieron cargar las facturas"
                text={error}
                actionLabel="Reintentar"
                onAction={handleRetry}
                isCompact={isCompact}
              />
            ) : null}

            {!error && !loading && invoices.length === 0 ? (
              <StatePanel
                icon="receipt-outline"
                isCompact={isCompact}
                title="Aún no hay facturas"
                text="Crea una factura manual o genera una desde una cita de clínica completada."
              />
            ) : null}

            <View style={styles.invoiceList}>
              {invoices.map((invoice) => (
                <InvoiceRow
                  key={invoice.id}
                  invoice={invoice}
                  saving={saving}
                  isCompact={isCompact}
                  onAction={handleInvoiceAction}
                />
              ))}
            </View>

            {pageInfo?.nextPage ? (
              <Button
                variant="outline"
                size="medium"
                onPress={handleLoadMore}
                loading={loadingMore}
                disabled={loadingMore}
                fullWidth
              >
                Cargar más
              </Button>
            ) : null}
          </View>
        </View>
      )}
    </ClinicWorkspaceScaffold>
  );
}

function SummaryBand({
  summary,
  loading,
  isCompact,
}: {
  summary: clinicService.ClinicBillingSummary | null;
  loading: boolean;
  isCompact: boolean;
}): React.ReactElement {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme, isCompact), [isCompact, theme]);
  const metrics = [
    {
      label: 'Mes actual',
      value: summary ? formatCurrency(summary.totalThisMonth) : '0,00 €',
      icon: 'trending-up-outline' as const,
    },
    {
      label: 'Año actual',
      value: summary ? formatCurrency(summary.totalThisYear) : '0,00 €',
      icon: 'stats-chart-outline' as const,
    },
    {
      label: 'Facturas del mes',
      value: String(summary?.invoiceCountThisMonth ?? 0),
      icon: 'document-text-outline' as const,
    },
    {
      label: 'Pendientes',
      value: String(summary?.pendingCount ?? 0),
      icon: 'time-outline' as const,
    },
  ];

  return (
    <View style={styles.summaryGrid}>
      {metrics.map((metric) => (
        <View key={metric.label} style={styles.metricTile}>
          <Ionicons name={metric.icon} size={18} color={theme.primary} />
          <Text style={styles.metricLabel}>{metric.label}</Text>
          <Text style={styles.metricValue}>{loading ? '...' : metric.value}</Text>
        </View>
      ))}
    </View>
  );
}

function ConfigPanel({
  form,
  errors,
  saving,
  isCompact,
  onChange,
  onSave,
}: {
  form: ClinicBillingConfigForm;
  errors: ClinicBillingConfigErrors;
  saving: boolean;
  isCompact: boolean;
  onChange: <K extends keyof ClinicBillingConfigForm>(
    field: K,
    value: ClinicBillingConfigForm[K],
  ) => void;
  onSave: () => void;
}): React.ReactElement {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme, isCompact), [isCompact, theme]);

  return (
    <View style={styles.panel}>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Configuración fiscal</Text>
          <Text style={styles.sectionSubtitle}>Datos de emisor y numeración por clínica.</Text>
        </View>
      </View>
      <View style={styles.formGrid}>
        <Input
          label="Razón social"
          value={form.legalName}
          onChangeText={(value) => onChange('legalName', value)}
          error={errors.legalName}
        />
        <Input
          label="NIF/CIF"
          value={form.taxId}
          onChangeText={(value) => onChange('taxId', value)}
          error={errors.taxId}
        />
        <Input
          label="Dirección fiscal"
          value={form.fiscalAddress}
          onChangeText={(value) => onChange('fiscalAddress', value)}
          error={errors.fiscalAddress}
        />
        <View style={styles.inlineFields}>
          <Input
            label="CP"
            value={form.fiscalPostalCode}
            onChangeText={(value) => onChange('fiscalPostalCode', value)}
            error={errors.fiscalPostalCode}
            containerStyle={styles.inlineField}
          />
          <Input
            label="Ciudad"
            value={form.fiscalCity}
            onChangeText={(value) => onChange('fiscalCity', value)}
            error={errors.fiscalCity}
            containerStyle={styles.inlineField}
          />
        </View>
        <View style={styles.inlineFields}>
          <Input
            label="Serie simplificada"
            value={form.simplifiedInvoicePrefix}
            onChangeText={(value) => onChange('simplifiedInvoicePrefix', value)}
            error={errors.simplifiedInvoicePrefix}
            containerStyle={styles.inlineField}
          />
          <Input
            label="Siguiente nº"
            value={form.simplifiedInvoiceNextNumber}
            onChangeText={(value) => onChange('simplifiedInvoiceNextNumber', value)}
            keyboardType="numeric"
            error={errors.simplifiedInvoiceNextNumber}
            containerStyle={styles.inlineField}
          />
        </View>
        <View style={styles.inlineFields}>
          <Input
            label="Serie completa"
            value={form.fullInvoicePrefix}
            onChangeText={(value) => onChange('fullInvoicePrefix', value)}
            error={errors.fullInvoicePrefix}
            containerStyle={styles.inlineField}
          />
          <Input
            label="Siguiente nº"
            value={form.fullInvoiceNextNumber}
            onChangeText={(value) => onChange('fullInvoiceNextNumber', value)}
            keyboardType="numeric"
            error={errors.fullInvoiceNextNumber}
            containerStyle={styles.inlineField}
          />
        </View>
        <View style={styles.switchRow}>
          <View>
            <Text style={styles.switchTitle}>Aplicar IVA</Text>
            <Text style={styles.switchText}>Usa 0, 10 o 21 según corresponda.</Text>
          </View>
          <Switch
            value={form.applyVat}
            onValueChange={(value) => onChange('applyVat', value)}
            trackColor={{ false: theme.border, true: theme.secondaryMuted }}
            thumbColor={form.applyVat ? theme.primary : theme.textMuted}
          />
        </View>
        <Input
          label="IVA"
          value={form.vatRate}
          onChangeText={(value) => onChange('vatRate', value)}
          keyboardType="numeric"
          error={errors.vatRate}
        />
        {!form.applyVat || form.vatRate === '0' ? (
          <Input
            label="Motivo de exencion IVA"
            value={form.vatExemptReason}
            onChangeText={(value) => onChange('vatExemptReason', value)}
            error={errors.vatExemptReason}
          />
        ) : null}
        <Input
          label="IBAN"
          value={form.bankIban}
          onChangeText={(value) => onChange('bankIban', value)}
          error={errors.bankIban}
        />
        <Input
          label="Condiciones de pago"
          value={form.paymentConditions}
          onChangeText={(value) => onChange('paymentConditions', value)}
          error={errors.paymentConditions}
        />
        <Input
          label="Copia de factura"
          value={form.sendInvoiceCopyTo}
          onChangeText={(value) => onChange('sendInvoiceCopyTo', value)}
          keyboardType="email-address"
          autoCapitalize="none"
          error={errors.sendInvoiceCopyTo}
        />
      </View>
      <Button
        variant="primary"
        size="medium"
        onPress={onSave}
        loading={saving}
        disabled={saving}
        icon={<Ionicons name="save-outline" size={18} color={theme.actionPrimaryText} />}
      >
        Guardar configuración
      </Button>
    </View>
  );
}

function InvoiceCreatePanel({
  form,
  errors,
  patientOptions,
  sessionOptions,
  selectedSessionId,
  saving,
  isCompact,
  onChange,
  onCreate,
  onCreateFromSession,
  onSelectSession,
}: {
  form: ClinicBillingInvoiceForm;
  errors: ClinicBillingInvoiceErrors;
  patientOptions: Array<{ label: string; value: string; subtitle?: string }>;
  sessionOptions: Array<{ label: string; value: string; subtitle?: string }>;
  selectedSessionId: string;
  saving: boolean;
  isCompact: boolean;
  onChange: <K extends keyof ClinicBillingInvoiceForm>(
    field: K,
    value: ClinicBillingInvoiceForm[K],
  ) => void;
  onCreate: () => void;
  onCreateFromSession: () => void;
  onSelectSession: (sessionId: string) => void;
}): React.ReactElement {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme, isCompact), [isCompact, theme]);

  return (
    <View style={styles.panel}>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Crear factura</Text>
          <Text style={styles.sectionSubtitle}>Manual o desde una cita completada.</Text>
        </View>
      </View>
      <View style={styles.formGrid}>
        <View style={styles.dropdownStackTop}>
          <Text style={styles.filterLabel}>Paciente</Text>
          <SimpleDropdown
            options={patientOptions}
            value={form.clinicPatientId || null}
            onSelect={(value) => onChange('clinicPatientId', value)}
            placeholder="Selecciona paciente"
          />
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
          label="Notas internas"
          value={form.internalNotes}
          onChangeText={(value) => onChange('internalNotes', value)}
          error={errors.internalNotes}
        />
      </View>
      <Button
        variant="primary"
        size="medium"
        onPress={onCreate}
        loading={saving}
        disabled={saving || patientOptions.length === 0}
        icon={<Ionicons name="receipt-outline" size={18} color={theme.actionPrimaryText} />}
      >
        Crear borrador
      </Button>

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

function InvoiceRow({
  invoice,
  saving,
  isCompact,
  onAction,
}: {
  invoice: clinicService.ClinicInvoiceSummary;
  saving: boolean;
  isCompact: boolean;
  onAction: (
    invoice: clinicService.ClinicInvoiceSummary,
    action: 'send' | 'paid' | 'cancel' | 'pdf',
  ) => void;
}): React.ReactElement {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme, isCompact), [isCompact, theme]);
  const canSend = invoice.status === 'DRAFT' || invoice.status === 'SENT';
  const canMarkPaid = invoice.status === 'SENT';
  const canCancel = invoice.status === 'DRAFT' || invoice.status === 'SENT';

  return (
    <View style={styles.invoiceRow}>
      <View style={styles.invoiceMain}>
        <View style={styles.invoiceTitleRow}>
          <Text style={styles.invoiceNumber}>{invoice.invoiceNumber}</Text>
          <Text style={[
            styles.statusBadge,
            invoice.status === 'PAID' ? styles.statusPaid : null,
            invoice.status === 'CANCELLED' ? styles.statusCancelled : null,
          ]}>
            {INVOICE_STATUS_LABELS[invoice.status]}
          </Text>
        </View>
        <Text style={styles.invoiceConcept}>{invoice.concept}</Text>
        <Text style={styles.invoiceMeta}>
          {invoice.patient.displayName} · {INVOICE_KIND_LABELS[invoice.invoiceKind]} · {formatDate(invoice.sessionDate ?? invoice.createdAt)}
        </Text>
      </View>
      <View style={styles.invoiceActions}>
        <Text style={styles.invoiceTotal}>{formatCurrency(invoice.total)}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.actionStrip}
        >
          <Button
            variant="ghost"
            size="small"
            onPress={() => onAction(invoice, 'pdf')}
            disabled={saving}
            icon={<Ionicons name="download-outline" size={16} color={theme.primary} />}
          >
            PDF
          </Button>
          <Button
            variant="ghost"
            size="small"
            onPress={() => onAction(invoice, 'send')}
            disabled={saving || !canSend}
            icon={<Ionicons name="send-outline" size={16} color={theme.primary} />}
          >
            Enviar
          </Button>
          <Button
            variant="ghost"
            size="small"
            onPress={() => onAction(invoice, 'paid')}
            disabled={saving || !canMarkPaid}
            icon={<Ionicons name="checkmark-done-outline" size={16} color={theme.primary} />}
          >
            Pagada
          </Button>
          <Button
            variant="danger"
            size="small"
            onPress={() => onAction(invoice, 'cancel')}
            disabled={saving || !canCancel}
            icon={<Ionicons name="close-circle-outline" size={16} color={theme.actionPrimaryText} />}
          >
            Cancelar
          </Button>
        </ScrollView>
      </View>
    </View>
  );
}

function StatePanel({
  icon,
  isCompact = false,
  title,
  text,
  actionLabel,
  onAction,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  isCompact?: boolean;
  title: string;
  text: string;
  actionLabel?: string;
  onAction?: () => void;
}): React.ReactElement {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme, isCompact), [isCompact, theme]);

  return (
    <View style={styles.statePanel}>
      <Ionicons name={icon} size={26} color={theme.primary} />
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
      gap: spacing.xl,
    },
    headerActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
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
    summaryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
    },
    metricTile: {
      flexGrow: 1,
      flexBasis: isCompact ? '45%' : 180,
      minWidth: 150,
      gap: spacing.xs,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: borderRadius.lg,
      backgroundColor: theme.bgCard,
    },
    metricLabel: {
      color: theme.textMuted,
      fontFamily: theme.fontSansMedium,
      fontSize: typography.fontSizes.xs,
      textTransform: 'uppercase',
    },
    metricValue: {
      color: theme.textPrimary,
      fontFamily: theme.fontSansBold,
      fontSize: typography.fontSizes.xl,
    },
    topGrid: {
      flexDirection: isCompact ? 'column' : 'row',
      gap: spacing.lg,
      alignItems: 'flex-start',
    },
    panel: {
      flex: 1,
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
      overflow: 'visible',
    },
    dropdownStackMiddle: {
      position: 'relative',
      zIndex: 50,
      elevation: 50,
      overflow: 'visible',
    },
    inlineFields: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    inlineField: {
      flex: 1,
    },
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: borderRadius.lg,
      backgroundColor: theme.bgMuted,
    },
    switchTitle: {
      color: theme.textPrimary,
      fontFamily: theme.fontSansSemiBold,
      fontSize: typography.fontSizes.sm,
    },
    switchText: {
      marginTop: 2,
      color: theme.textMuted,
      fontFamily: theme.fontSans,
      fontSize: typography.fontSizes.xs,
    },
    sessionBox: {
      gap: spacing.sm,
      paddingTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    filters: {
      flexDirection: isCompact ? 'column' : 'row',
      alignItems: isCompact ? 'stretch' : 'flex-end',
      gap: spacing.md,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: borderRadius.lg,
      backgroundColor: theme.bgCard,
      zIndex: 20,
    },
    filterDropdown: {
      flex: 1,
      minWidth: 180,
      zIndex: 30,
    },
    filterAction: {
      minWidth: isCompact ? undefined : 130,
    },
    filterLabel: {
      marginBottom: spacing.xs,
      color: theme.textSecondary,
      fontFamily: theme.fontSansSemiBold,
      fontSize: typography.fontSizes.sm,
    },
    fieldError: {
      marginTop: spacing.xs,
      color: theme.error,
      fontFamily: theme.fontSans,
      fontSize: typography.fontSizes.xs,
    },
    invoicePanel: {
      gap: spacing.lg,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: borderRadius.lg,
      backgroundColor: theme.bgCard,
    },
    invoiceList: {
      gap: spacing.md,
    },
    invoiceRow: {
      flexDirection: isCompact ? 'column' : 'row',
      justifyContent: 'space-between',
      gap: spacing.md,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: borderRadius.lg,
      backgroundColor: theme.bg,
    },
    invoiceMain: {
      flex: 1,
      minWidth: 0,
      gap: spacing.xs,
    },
    invoiceTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    invoiceNumber: {
      color: theme.textPrimary,
      fontFamily: theme.fontSansBold,
      fontSize: typography.fontSizes.md,
    },
    invoiceConcept: {
      color: theme.textPrimary,
      fontFamily: theme.fontSansMedium,
      fontSize: typography.fontSizes.sm,
    },
    invoiceMeta: {
      color: theme.textMuted,
      fontFamily: theme.fontSans,
      fontSize: typography.fontSizes.xs,
    },
    statusBadge: {
      overflow: 'hidden',
      borderRadius: borderRadius.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
      color: theme.primary,
      backgroundColor: theme.secondaryMuted,
      fontFamily: theme.fontSansSemiBold,
      fontSize: typography.fontSizes.xs,
    },
    statusPaid: {
      color: theme.success,
      backgroundColor: theme.successBg,
    },
    statusCancelled: {
      color: theme.error,
      backgroundColor: theme.errorBg,
    },
    invoiceActions: {
      alignItems: isCompact ? 'stretch' : 'flex-end',
      gap: spacing.sm,
    },
    invoiceTotal: {
      color: theme.textPrimary,
      fontFamily: theme.fontSansBold,
      fontSize: typography.fontSizes.lg,
      textAlign: isCompact ? 'left' : 'right',
    },
    actionStrip: {
      gap: spacing.xs,
      alignItems: 'center',
    },
    statePanel: {
      alignItems: 'center',
      justifyContent: 'center',
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
      fontSize: typography.fontSizes.md,
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

export default ClinicBillingScreen;
