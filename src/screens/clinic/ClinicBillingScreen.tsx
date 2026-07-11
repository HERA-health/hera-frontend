import React, { useEffect, useMemo, useState } from 'react';
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
  KIND_OPTIONS,
  REVENUE_SHARE_MONTH_OPTIONS,
  STATUS_OPTIONS,
  useClinicBillingController,
  type ClinicBillingConfigErrors,
  type ClinicBillingConfigForm,
  type ClinicRevenueShareFilters,
  type ClinicSettlementFilters,
} from './useClinicBillingController';

type ClinicBillingSection = 'invoices' | 'revenue' | 'settlements' | 'config';

const BILLING_SECTION_TABS: Array<{
  key: ClinicBillingSection;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
}> = [
  { key: 'invoices', label: 'Facturas', icon: 'receipt-outline' },
  { key: 'revenue', label: 'Reparto', icon: 'pie-chart-outline' },
  { key: 'settlements', label: 'Liquidaciones', icon: 'file-tray-full-outline' },
  { key: 'config', label: 'Configuración', icon: 'settings-outline' },
];

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

const SETTLEMENT_STATUS_LABELS: Record<clinicService.ClinicSettlementStatus, string> = {
  PENDING: 'Pendiente',
  REVIEWED: 'Revisada',
  PAID: 'Pagada',
};

const formatCurrency = (value: number): string =>
  value.toLocaleString('es-ES', {
    style: 'currency',
    currency: 'EUR',
  });

const formatPercentage = (value: number): string =>
  `${value.toLocaleString('es-ES', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  })} %`;

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
  route,
}: ScreenProps<'ClinicBilling'>): React.ReactElement {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const isCompact = width < 960;
  const styles = useMemo(() => createStyles(theme, isCompact), [isCompact, theme]);
  const [activeSection, setActiveSection] = useState<ClinicBillingSection>('invoices');
  const [highlightConfig, setHighlightConfig] = useState(false);
  const {
    canManage,
    configErrors,
    configForm,
    editableFilters,
    error,
    handleApplyFilters,
    handleGenerateSettlement,
    handleInvoiceAction,
    handleLoadMore,
    handleLoadMorePatientOptions,
    handlePatientLookupSearchChange,
    handleRetry,
    handleSaveConfig,
    handleSelectClinic,
    handleSettlementAction,
    handleViewSettlementDetail,
    invoices,
    loading,
    loadingMore,
    pageInfo,
    patientFilterOptions,
    patientLookupLoading,
    patientLookupLoadingMore,
    patientLookupPageInfo,
    patientLookupSearch,
    revenueShareError,
    revenueShareFilters,
    revenueShareLoading,
    revenueShareSummary,
    revenueShareYearOptions,
    saving,
    selectedSettlementDetail,
    settlementError,
    settlementDetailLoading,
    settlementFilters,
    settlementLoading,
    settlementPreview,
    settlements,
    setConfigField,
    setEditableFilter,
    setRevenueShareFilter,
    setSettlementFilter,
    summary,
    workspace,
  } = useClinicBillingController();

  const clinicName = workspace.selectedMembership?.clinic.commercialName;

  useEffect(() => {
    if (route.params?.initialSection !== 'config') return undefined;

    setActiveSection('config');
    setHighlightConfig(true);
    navigation.setParams({ initialSection: undefined });
    return undefined;
  }, [navigation, route.params?.initialSection]);

  useEffect(() => {
    if (!highlightConfig) return undefined;
    const timeout = setTimeout(() => setHighlightConfig(false), 1800);
    return () => clearTimeout(timeout);
  }, [highlightConfig]);

  return (
    <ClinicWorkspaceScaffold
      title="Facturación"
      contextLabel={clinicName}
      subtitle="Emite y gestiona facturas administrativas de la clínica sin mezclar la facturación privada del profesional."
      memberships={workspace.memberships}
      selectedClinicId={workspace.selectedClinicId}
      loading={workspace.loading}
      error={workspace.error}
      onSelectClinic={handleSelectClinic}
      onRetry={handleRetry}
      action={workspace.selectedClinicId && canManage ? (
        <Button
          variant="primary"
          size="medium"
          onPress={() => navigation.navigate('ClinicInvoiceCreate')}
          icon={<Ionicons name="add-circle-outline" size={18} color={theme.actionPrimaryText} />}
        >
          Nueva factura
        </Button>
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

          {canManage ? (
            <>
              <SummaryBand summary={summary} loading={loading} isCompact={isCompact} />

              <BillingSectionTabs
                activeSection={activeSection}
                onChange={setActiveSection}
                isCompact={isCompact}
              />

              {activeSection === 'revenue' ? (
                <RevenueSharePanel
                  summary={revenueShareSummary}
                  filters={revenueShareFilters}
                  yearOptions={revenueShareYearOptions}
                  loading={revenueShareLoading}
                  error={revenueShareError}
                  isCompact={isCompact}
                  onChange={setRevenueShareFilter}
                />
              ) : null}

              {activeSection === 'settlements' ? (
                <SettlementPanel
                  preview={settlementPreview}
                  settlements={settlements}
                  selectedSettlement={selectedSettlementDetail}
                  filters={settlementFilters}
                  yearOptions={revenueShareYearOptions}
                  loading={settlementLoading}
                  detailLoading={settlementDetailLoading}
                  error={settlementError}
                  saving={saving}
                  isCompact={isCompact}
                  onChange={setSettlementFilter}
                  onGenerate={handleGenerateSettlement}
                  onViewDetail={handleViewSettlementDetail}
                  onAction={handleSettlementAction}
                />
              ) : null}

              {activeSection === 'config' ? (
                <View style={styles.topGrid}>
                  <ConfigPanel
                    form={configForm}
                    errors={configErrors}
                    saving={saving}
                    isCompact={isCompact}
                    onChange={setConfigField}
                    onSave={handleSaveConfig}
                    highlighted={highlightConfig}
                  />
                </View>
              ) : null}

              {activeSection === 'invoices' ? (
                <>
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
                      <Input
                        label="Buscar paciente"
                        value={patientLookupSearch}
                        onChangeText={handlePatientLookupSearchChange}
                        containerStyle={styles.lookupInput}
                      />
                      <SimpleDropdown
                        options={patientFilterOptions}
                        value={editableFilters.patientFilter}
                        onSelect={(value) => setEditableFilter('patientFilter', value)}
                      />
                      {patientLookupPageInfo?.hasMore ? (
                        <Button
                          variant="ghost"
                          size="small"
                          onPress={handleLoadMorePatientOptions}
                          loading={patientLookupLoadingMore}
                          disabled={patientLookupLoading || patientLookupLoadingMore}
                        >
                          Cargar mas pacientes
                        </Button>
                      ) : null}
                    </View>
                    <View style={styles.filterAction}>
                      <Button
                        variant="outline"
                        size="medium"
                        onPress={handleApplyFilters}
                        disabled={loading}
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
                        text="Crea una factura desde la vista de emisión cuando tengas una cita completada o un concepto administrativo."
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
                </>
              ) : null}
            </>
          ) : null}
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

function BillingSectionTabs({
  activeSection,
  onChange,
  isCompact,
}: {
  activeSection: ClinicBillingSection;
  onChange: (section: ClinicBillingSection) => void;
  isCompact: boolean;
}): React.ReactElement {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme, isCompact), [isCompact, theme]);

  return (
    <View style={styles.sectionTabs}>
      {BILLING_SECTION_TABS.map((tab) => {
        const active = tab.key === activeSection;
        return (
          <Button
            key={tab.key}
            variant={active ? 'primary' : 'ghost'}
            size="small"
            onPress={() => onChange(tab.key)}
            icon={(
              <Ionicons
                name={tab.icon}
                size={16}
                color={active ? theme.actionPrimaryText : theme.primary}
              />
            )}
          >
            {tab.label}
          </Button>
        );
      })}
    </View>
  );
}

function RevenueSharePanel({
  summary,
  filters,
  yearOptions,
  loading,
  error,
  isCompact,
  onChange,
}: {
  summary: clinicService.ClinicRevenueShareSummary | null;
  filters: ClinicRevenueShareFilters;
  yearOptions: Array<{ label: string; value: number; subtitle?: string }>;
  loading: boolean;
  error: string;
  isCompact: boolean;
  onChange: <K extends keyof ClinicRevenueShareFilters>(
    field: K,
    value: ClinicRevenueShareFilters[K],
  ) => void;
}): React.ReactElement {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme, isCompact), [isCompact, theme]);
  const totals = summary?.totals;
  const pendingSnapshotCount = totals?.pendingSnapshotInvoiceCount ?? 0;
  const missingPercentageCount = totals?.missingPercentageInvoiceCount ?? 0;
  const missingSpecialistCount = totals?.missingSpecialistInvoiceCount ?? 0;
  const metrics = [
    {
      label: 'Base pagada',
      value: formatCurrency(totals?.shareBaseAmount ?? 0),
    },
    {
      label: 'Especialistas',
      value: formatCurrency(totals?.specialistShareAmount ?? 0),
    },
    {
      label: 'Clínica',
      value: formatCurrency(totals?.clinicRetainedAmount ?? 0),
    },
    {
      label: 'Facturas',
      value: String(totals?.paidInvoiceCount ?? 0),
    },
  ];

  return (
    <View style={styles.revenuePanel}>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Reparto mensual</Text>
          <Text style={styles.sectionSubtitle}>Facturas pagadas del periodo.</Text>
        </View>
        {loading ? <ActivityIndicator color={theme.primary} size="small" /> : null}
      </View>

      <View style={styles.revenueControls}>
        <View style={styles.revenueDropdown}>
          <Text style={styles.filterLabel}>Mes</Text>
          <SimpleDropdown
            options={REVENUE_SHARE_MONTH_OPTIONS}
            value={filters.month}
            onSelect={(value) => onChange('month', value)}
          />
        </View>
        <View style={styles.revenueDropdown}>
          <Text style={styles.filterLabel}>Año</Text>
          <SimpleDropdown
            options={yearOptions}
            value={filters.year}
            onSelect={(value) => onChange('year', value)}
          />
        </View>
      </View>

      {error ? (
        <View style={styles.inlineWarning}>
          <Ionicons name="alert-circle-outline" size={18} color={theme.warning} />
          <Text style={styles.inlineWarningText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.revenueMetrics}>
        {metrics.map((metric) => (
          <View key={metric.label} style={styles.revenueMetric}>
            <Text style={styles.metricLabel}>{metric.label}</Text>
            <Text style={styles.revenueMetricValue}>{loading ? '...' : metric.value}</Text>
          </View>
        ))}
      </View>

      {pendingSnapshotCount > 0 ? (
        <View style={styles.inlineWarning}>
          <Ionicons name="warning-outline" size={18} color={theme.warning} />
          <Text style={styles.inlineWarningText}>
            Hay {pendingSnapshotCount} factura{pendingSnapshotCount === 1 ? '' : 's'} pagada{pendingSnapshotCount === 1 ? '' : 's'} anterior{pendingSnapshotCount === 1 ? '' : 'es'} sin snapshot; no se incluye{pendingSnapshotCount === 1 ? '' : 'n'} en los importes.
          </Text>
        </View>
      ) : null}

      {missingPercentageCount > 0 || missingSpecialistCount > 0 ? (
        <View style={styles.inlineWarning}>
          <Ionicons name="warning-outline" size={18} color={theme.warning} />
          <Text style={styles.inlineWarningText}>
            {missingPercentageCount} sin porcentaje y {missingSpecialistCount} sin especialista.
          </Text>
        </View>
      ) : null}

      {!error && !loading && summary && summary.specialists.length === 0 ? (
        <View style={styles.revenueEmpty}>
          <Text style={styles.revenueEmptyText}>Sin facturas pagadas en este mes.</Text>
        </View>
      ) : null}

      {summary && summary.specialists.length > 0 ? (
        <View style={styles.revenueTable}>
          {!isCompact ? (
            <View style={styles.revenueHeaderRow}>
              <Text style={[styles.revenueHeaderCell, styles.revenueSpecialistCell]}>Especialista</Text>
              <Text style={styles.revenueHeaderCell}>Base</Text>
              <Text style={styles.revenueHeaderCell}>Reparto</Text>
              <Text style={styles.revenueHeaderCell}>Clínica</Text>
              <Text style={styles.revenueHeaderCell}>%</Text>
            </View>
          ) : null}
          {summary.specialists.map((specialist) => (
            <View key={specialist.clinicSpecialistId} style={styles.revenueRow}>
              <View style={styles.revenueSpecialistCell}>
                <Text style={styles.revenueSpecialistName}>{specialist.displayName}</Text>
                <Text style={styles.revenueSpecialistMeta}>
                  {specialist.professionalTitle ?? 'Sin título'} · {specialist.paidInvoiceCount} factura{specialist.paidInvoiceCount === 1 ? '' : 's'}
                </Text>
              </View>
              <View style={styles.revenueAmountCell}>
                {isCompact ? <Text style={styles.revenueCompactLabel}>Base</Text> : null}
                <Text style={styles.revenueAmount}>{formatCurrency(specialist.shareBaseAmount)}</Text>
              </View>
              <View style={styles.revenueAmountCell}>
                {isCompact ? <Text style={styles.revenueCompactLabel}>Reparto</Text> : null}
                <Text style={styles.revenueAmount}>{formatCurrency(specialist.specialistShareAmount)}</Text>
              </View>
              <View style={styles.revenueAmountCell}>
                {isCompact ? <Text style={styles.revenueCompactLabel}>Clínica</Text> : null}
                <Text style={styles.revenueAmount}>{formatCurrency(specialist.clinicRetainedAmount)}</Text>
              </View>
              <View style={styles.revenueAmountCell}>
                {isCompact ? <Text style={styles.revenueCompactLabel}>%</Text> : null}
                <Text style={styles.revenueAmount}>
                  {formatPercentage(specialist.effectiveRevenueSharePercentage)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function SettlementPanel({
  preview,
  settlements,
  selectedSettlement,
  filters,
  yearOptions,
  loading,
  detailLoading,
  error,
  saving,
  isCompact,
  onChange,
  onGenerate,
  onViewDetail,
  onAction,
}: {
  preview: clinicService.ClinicSettlementPreview | null;
  settlements: clinicService.ClinicSettlementPeriod[];
  selectedSettlement: clinicService.ClinicSettlementDetail | null;
  filters: ClinicSettlementFilters;
  yearOptions: Array<{ label: string; value: number; subtitle?: string }>;
  loading: boolean;
  detailLoading: boolean;
  error: string;
  saving: boolean;
  isCompact: boolean;
  onChange: <K extends keyof ClinicSettlementFilters>(
    field: K,
    value: ClinicSettlementFilters[K],
  ) => void;
  onGenerate: () => void;
  onViewDetail: (settlement: clinicService.ClinicSettlementPeriod) => void;
  onAction: (
    settlement: clinicService.ClinicSettlementDetail,
    status: Extract<clinicService.ClinicSettlementStatus, 'REVIEWED' | 'PAID'>,
  ) => void;
}): React.ReactElement {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme, isCompact), [isCompact, theme]);
  const blockers = preview?.blockers;
  const totals = preview?.totals;
  const generateLabel = preview?.existingSettlement?.status === 'PENDING'
    ? 'Actualizar borrador'
    : 'Generar liquidación';
  const canReviewSelected = selectedSettlement?.status === 'PENDING';
  const canMarkSelectedPaid = selectedSettlement?.status === 'REVIEWED';
  const metrics = [
    {
      label: 'Base liquidable',
      value: formatCurrency(totals?.shareBaseAmount ?? 0),
    },
    {
      label: 'Especialistas',
      value: formatCurrency(totals?.specialistShareAmount ?? 0),
    },
    {
      label: 'Clínica',
      value: formatCurrency(totals?.clinicRetainedAmount ?? 0),
    },
    {
      label: 'Facturas incluidas',
      value: String(totals?.settledInvoiceCount ?? 0),
    },
  ];

  return (
    <View style={styles.settlementPanel}>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Liquidaciones</Text>
          <Text style={styles.sectionSubtitle}>
            Registro interno; no realiza transferencia bancaria.
          </Text>
        </View>
        {loading ? <ActivityIndicator color={theme.primary} size="small" /> : null}
      </View>

      <View style={styles.revenueControls}>
        <View style={styles.revenueDropdown}>
          <Text style={styles.filterLabel}>Mes</Text>
          <SimpleDropdown
            options={REVENUE_SHARE_MONTH_OPTIONS}
            value={filters.month}
            onSelect={(value) => onChange('month', value)}
          />
        </View>
        <View style={styles.revenueDropdown}>
          <Text style={styles.filterLabel}>Año</Text>
          <SimpleDropdown
            options={yearOptions}
            value={filters.year}
            onSelect={(value) => onChange('year', value)}
          />
        </View>
      </View>

      {error ? (
        <View style={styles.inlineWarning}>
          <Ionicons name="alert-circle-outline" size={18} color={theme.warning} />
          <Text style={styles.inlineWarningText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.revenueMetrics}>
        {metrics.map((metric) => (
          <View key={metric.label} style={styles.revenueMetric}>
            <Text style={styles.metricLabel}>{metric.label}</Text>
            <Text style={styles.revenueMetricValue}>{loading ? '...' : metric.value}</Text>
          </View>
        ))}
      </View>

      {blockers?.periodOpen ? (
        <View style={styles.inlineWarning}>
          <Ionicons name="time-outline" size={18} color={theme.warning} />
          <Text style={styles.inlineWarningText}>
            Este periodo aún no está cerrado en Europe/Madrid.
          </Text>
        </View>
      ) : null}

      {blockers?.noPaidInvoices ? (
        <View style={styles.inlineWarning}>
          <Ionicons name="document-text-outline" size={18} color={theme.warning} />
          <Text style={styles.inlineWarningText}>
            No hay facturas pagadas para liquidar en este periodo.
          </Text>
        </View>
      ) : null}

      {blockers && blockers.pendingSnapshotInvoiceCount > 0 ? (
        <View style={styles.inlineWarning}>
          <Ionicons name="warning-outline" size={18} color={theme.warning} />
          <Text style={styles.inlineWarningText}>
            Hay {blockers.pendingSnapshotInvoiceCount} factura{blockers.pendingSnapshotInvoiceCount === 1 ? '' : 's'} pendiente{blockers.pendingSnapshotInvoiceCount === 1 ? '' : 's'} de snapshot.
          </Text>
        </View>
      ) : null}

      {blockers && blockers.missingSpecialistInvoiceCount > 0 ? (
        <View style={styles.inlineWarning}>
          <Ionicons name="person-remove-outline" size={18} color={theme.warning} />
          <Text style={styles.inlineWarningText}>
            Hay {blockers.missingSpecialistInvoiceCount} factura{blockers.missingSpecialistInvoiceCount === 1 ? '' : 's'} pagada{blockers.missingSpecialistInvoiceCount === 1 ? '' : 's'} sin especialista.
          </Text>
        </View>
      ) : null}

      {blockers && blockers.alreadySettledInvoiceCount > 0 ? (
        <View style={styles.inlineWarning}>
          <Ionicons name="layers-outline" size={18} color={theme.warning} />
          <Text style={styles.inlineWarningText}>
            Hay {blockers.alreadySettledInvoiceCount} factura{blockers.alreadySettledInvoiceCount === 1 ? '' : 's'} ya vinculada{blockers.alreadySettledInvoiceCount === 1 ? '' : 's'} a otra liquidación.
          </Text>
        </View>
      ) : null}

      {blockers?.finalizedSettlement ? (
        <View style={styles.inlineWarning}>
          <Ionicons name="lock-closed-outline" size={18} color={theme.warning} />
          <Text style={styles.inlineWarningText}>
            La liquidación de este periodo ya está revisada o pagada.
          </Text>
        </View>
      ) : null}

      {totals && totals.missingPercentageInvoiceCount > 0 ? (
        <View style={styles.inlineInfo}>
          <Ionicons name="information-circle-outline" size={18} color={theme.primary} />
          <Text style={styles.inlineInfoText}>
            {totals.missingPercentageInvoiceCount} factura{totals.missingPercentageInvoiceCount === 1 ? '' : 's'} sin porcentaje configurado se liquidan con reparto 0.
          </Text>
        </View>
      ) : null}

      <Button
        variant="primary"
        size="medium"
        onPress={onGenerate}
        disabled={saving || loading || !preview?.canGenerate}
        loading={saving}
        icon={<Ionicons name="file-tray-full-outline" size={18} color={theme.actionPrimaryText} />}
      >
        {generateLabel}
      </Button>

      <View style={styles.settlementList}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Histórico</Text>
            <Text style={styles.sectionSubtitle}>
              {settlements.length} liquidación{settlements.length === 1 ? '' : 'es'} del año seleccionado.
            </Text>
          </View>
        </View>

        {!loading && settlements.length === 0 ? (
          <View style={styles.revenueEmpty}>
            <Text style={styles.revenueEmptyText}>Aún no hay liquidaciones generadas.</Text>
          </View>
        ) : null}

        {settlements.map((settlement) => {
          const isSelected = selectedSettlement?.id === settlement.id;
          return (
            <View key={settlement.id} style={[
              styles.settlementRow,
              isSelected ? styles.settlementRowSelected : null,
            ]}>
              <View style={styles.invoiceMain}>
                <View style={styles.invoiceTitleRow}>
                  <Text style={styles.invoiceNumber}>
                    {String(settlement.month).padStart(2, '0')}/{settlement.year}
                  </Text>
                  <Text style={[
                    styles.statusBadge,
                    settlement.status === 'PAID' ? styles.statusPaid : null,
                  ]}>
                    {SETTLEMENT_STATUS_LABELS[settlement.status]}
                  </Text>
                </View>
                <Text style={styles.invoiceMeta}>
                  {settlement.settledInvoiceCount} factura{settlement.settledInvoiceCount === 1 ? '' : 's'} · {formatCurrency(settlement.specialistShareAmount)} especialistas
                </Text>
              </View>
              <View style={styles.invoiceActions}>
                <Text style={styles.invoiceTotal}>{formatCurrency(settlement.shareBaseAmount)}</Text>
                <Button
                  variant={isSelected ? 'primary' : 'outline'}
                  size="small"
                  onPress={() => onViewDetail(settlement)}
                  disabled={saving || detailLoading}
                  loading={detailLoading && isSelected}
                  icon={<Ionicons name="eye-outline" size={16} color={isSelected ? theme.actionPrimaryText : theme.primary} />}
                >
                  Ver detalle
                </Button>
              </View>
            </View>
          );
        })}

        {selectedSettlement ? (
          <View style={styles.settlementDetail}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>
                  Detalle {String(selectedSettlement.month).padStart(2, '0')}/{selectedSettlement.year}
                </Text>
                <Text style={styles.sectionSubtitle}>
                  {selectedSettlement.settledInvoiceCount} factura{selectedSettlement.settledInvoiceCount === 1 ? '' : 's'} vinculada{selectedSettlement.settledInvoiceCount === 1 ? '' : 's'}.
                </Text>
              </View>
              <Text style={[
                styles.statusBadge,
                selectedSettlement.status === 'PAID' ? styles.statusPaid : null,
              ]}>
                {SETTLEMENT_STATUS_LABELS[selectedSettlement.status]}
              </Text>
            </View>

            <View style={styles.settlementDetailMetrics}>
              <Text style={styles.invoiceMeta}>Base {formatCurrency(selectedSettlement.shareBaseAmount)}</Text>
              <Text style={styles.invoiceMeta}>Especialistas {formatCurrency(selectedSettlement.specialistShareAmount)}</Text>
              <Text style={styles.invoiceMeta}>Clínica {formatCurrency(selectedSettlement.clinicRetainedAmount)}</Text>
            </View>

            {selectedSettlement.lines.map((line) => (
              <View key={line.id} style={styles.settlementLine}>
                <View style={styles.invoiceTitleRow}>
                  <View style={styles.invoiceMain}>
                    <Text style={styles.invoiceNumber}>{line.displayName}</Text>
                    <Text style={styles.invoiceMeta}>
                      {line.professionalTitle ?? 'Sin título'} · {line.paidInvoiceCount} factura{line.paidInvoiceCount === 1 ? '' : 's'} · {formatPercentage(line.effectiveRevenueSharePercentage)}
                    </Text>
                  </View>
                  <Text style={styles.invoiceTotal}>{formatCurrency(line.specialistShareAmount)}</Text>
                </View>
                <View style={styles.settlementInvoiceList}>
                  {line.invoices.map((invoice) => (
                    <View key={invoice.id} style={styles.settlementInvoiceRow}>
                      <View style={styles.invoiceMain}>
                        <Text style={styles.invoiceConcept}>{invoice.invoiceNumber}</Text>
                        <Text style={styles.invoiceMeta}>
                          {invoice.patientDisplayName} · {formatDate(invoice.paidAt)}
                        </Text>
                      </View>
                      <Text style={styles.invoiceMeta}>
                        Base {formatCurrency(invoice.shareBaseAmount)} · Rep. {formatCurrency(invoice.specialistShareAmount)} · Clínica {formatCurrency(invoice.clinicRetainedAmount)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}

            <View style={styles.settlementDetailActions}>
              <Button
                variant="outline"
                size="small"
                onPress={() => onAction(selectedSettlement, 'REVIEWED')}
                disabled={saving || !canReviewSelected}
                icon={<Ionicons name="checkmark-circle-outline" size={16} color={theme.primary} />}
              >
                Marcar revisada
              </Button>
              <Button
                variant="outline"
                size="small"
                onPress={() => onAction(selectedSettlement, 'PAID')}
                disabled={saving || !canMarkSelectedPaid}
                icon={<Ionicons name="card-outline" size={16} color={theme.primary} />}
              >
                Registrar pagada
              </Button>
            </View>
          </View>
        ) : null}
      </View>
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
  highlighted,
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
  highlighted: boolean;
}): React.ReactElement {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme, isCompact), [isCompact, theme]);

  return (
    <View style={[styles.panel, highlighted ? styles.panelHighlighted : null]}>
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
    sectionTabs: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      padding: spacing.xs,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: borderRadius.lg,
      backgroundColor: theme.bgMuted,
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
    panelHighlighted: {
      borderColor: theme.primary,
      backgroundColor: theme.primaryAlpha12,
    },
    revenuePanel: {
      width: '100%',
      gap: spacing.lg,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: borderRadius.lg,
      backgroundColor: theme.bgCard,
      zIndex: 40,
    },
    settlementPanel: {
      width: '100%',
      gap: spacing.lg,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: borderRadius.lg,
      backgroundColor: theme.bgCard,
      zIndex: 35,
    },
    revenueControls: {
      flexDirection: isCompact ? 'column' : 'row',
      alignItems: isCompact ? 'stretch' : 'flex-end',
      gap: spacing.md,
      zIndex: 45,
    },
    revenueDropdown: {
      flex: 1,
      minWidth: isCompact ? undefined : 180,
      zIndex: 50,
    },
    revenueMetrics: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    revenueMetric: {
      flexGrow: 1,
      flexBasis: isCompact ? '45%' : 160,
      minWidth: 140,
      gap: 2,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: borderRadius.md,
      backgroundColor: theme.bgMuted,
    },
    revenueMetricValue: {
      color: theme.textPrimary,
      fontFamily: theme.fontSansBold,
      fontSize: typography.fontSizes.lg,
    },
    inlineWarning: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: theme.warning,
      borderRadius: borderRadius.md,
      backgroundColor: theme.warningBg,
    },
    inlineWarningText: {
      flex: 1,
      color: theme.textPrimary,
      fontFamily: theme.fontSans,
      fontSize: typography.fontSizes.sm,
      lineHeight: 20,
    },
    inlineInfo: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: borderRadius.md,
      backgroundColor: theme.bgMuted,
    },
    inlineInfoText: {
      flex: 1,
      color: theme.textPrimary,
      fontFamily: theme.fontSans,
      fontSize: typography.fontSizes.sm,
      lineHeight: 20,
    },
    revenueEmpty: {
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.md,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: borderRadius.md,
      backgroundColor: theme.bgMuted,
    },
    revenueEmptyText: {
      color: theme.textMuted,
      fontFamily: theme.fontSansMedium,
      fontSize: typography.fontSizes.sm,
      textAlign: 'center',
    },
    revenueTable: {
      gap: spacing.xs,
    },
    revenueHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.xs,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    revenueHeaderCell: {
      flex: 1,
      minWidth: 92,
      color: theme.textMuted,
      fontFamily: theme.fontSansSemiBold,
      fontSize: typography.fontSizes.xs,
      textAlign: 'right',
      textTransform: 'uppercase',
    },
    revenueRow: {
      flexDirection: isCompact ? 'column' : 'row',
      alignItems: isCompact ? 'stretch' : 'center',
      gap: isCompact ? spacing.sm : spacing.md,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: borderRadius.md,
      backgroundColor: theme.bg,
    },
    revenueSpecialistCell: {
      flex: isCompact ? undefined : 1.6,
      minWidth: isCompact ? undefined : 180,
    },
    revenueSpecialistName: {
      color: theme.textPrimary,
      fontFamily: theme.fontSansSemiBold,
      fontSize: typography.fontSizes.sm,
    },
    revenueSpecialistMeta: {
      marginTop: 2,
      color: theme.textMuted,
      fontFamily: theme.fontSans,
      fontSize: typography.fontSizes.xs,
    },
    revenueAmountCell: {
      flex: 1,
      minWidth: isCompact ? undefined : 92,
      flexDirection: isCompact ? 'row' : 'column',
      alignItems: isCompact ? 'center' : 'flex-end',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    revenueCompactLabel: {
      color: theme.textMuted,
      fontFamily: theme.fontSansMedium,
      fontSize: typography.fontSizes.xs,
    },
    revenueAmount: {
      color: theme.textPrimary,
      fontFamily: theme.fontSansSemiBold,
      fontSize: typography.fontSizes.sm,
      textAlign: isCompact ? 'right' : 'right',
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
    settlementList: {
      gap: spacing.md,
      paddingTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    settlementRow: {
      flexDirection: isCompact ? 'column' : 'row',
      justifyContent: 'space-between',
      gap: spacing.md,
      padding: spacing.md,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      borderRadius: borderRadius.md,
      backgroundColor: 'transparent',
    },
    settlementRowSelected: {
      backgroundColor: theme.bgMuted,
    },
    settlementDetail: {
      gap: spacing.md,
      paddingTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    settlementDetailMetrics: {
      flexDirection: isCompact ? 'column' : 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
    },
    settlementLine: {
      gap: spacing.sm,
      paddingVertical: spacing.md,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    settlementInvoiceList: {
      gap: spacing.xs,
    },
    settlementInvoiceRow: {
      flexDirection: isCompact ? 'column' : 'row',
      justifyContent: 'space-between',
      gap: spacing.sm,
      paddingVertical: spacing.sm,
    },
    settlementDetailActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
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
      gap: spacing.xs,
      zIndex: 30,
    },
    lookupInput: {
      marginBottom: 0,
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
