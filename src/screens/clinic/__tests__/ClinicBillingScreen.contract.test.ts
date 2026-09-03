import fs from 'node:fs';
import path from 'node:path';

describe('ClinicBillingScreen source guards', () => {
  const clinicDir = path.join(__dirname, '..');
  const screenSource = fs.readFileSync(
    path.join(clinicDir, 'ClinicBillingScreen.tsx'),
    'utf8',
  );
  const createScreenSource = fs.readFileSync(
    path.join(clinicDir, 'ClinicInvoiceCreateScreen.tsx'),
    'utf8',
  );
  const controllerSource = fs.readFileSync(
    path.join(clinicDir, 'useClinicBillingController.ts'),
    'utf8',
  );
  const navigationSource = fs.readFileSync(
    path.join(__dirname, '..', '..', '..', 'navigation', 'RootNavigator.tsx'),
    'utf8',
  );
  const combinedSource = `${screenSource}\n${createScreenSource}\n${controllerSource}`;

  it('uses clinic domain services instead of raw api calls', () => {
    expect(screenSource).toContain("from './useClinicBillingController'");
    expect(controllerSource).toContain("from '../../services/clinicService'");
    expect(controllerSource).toContain('clinicService.listClinicInvoices');
    expect(controllerSource).toContain('clinicService.createClinicInvoice');
    expect(controllerSource).toContain('clinicService.createClinicInvoiceFromSession');
    expect(controllerSource).toContain('clinicService.updateClinicBillingConfig');
    expect(controllerSource).toContain('clinicService.getClinicRevenueShareSummary');
    expect(combinedSource).not.toContain("from '../../services/api'");
    expect(combinedSource).not.toContain('api.');
  });

  it('keeps private billing and payment integrations out of clinic billing V1', () => {
    expect(combinedSource).not.toContain('/api/billing');
    expect(combinedSource).not.toContain('stripe');
    expect(combinedSource).not.toContain('PaymentIntent');
    expect(combinedSource).not.toContain('Checkout');
  });

  it('keeps editable filters separate from applied filters', () => {
    expect(controllerSource).toContain('editableFilters');
    expect(controllerSource).toContain('appliedFilters');
    expect(controllerSource).toContain('handleApplyFilters');
    expect(screenSource).toContain('onApply={handleApplyFilters}');
    expect(screenSource).toContain('onPress={onApply}');
    expect(screenSource).not.toContain('clinicService.listClinicInvoices');
  });

  it('keeps cheap invoice refreshes separate from reference data reloads', () => {
    expect(controllerSource).toContain('reloadInvoicesAndSummary');
    expect(controllerSource).toContain('loadReferenceData');
    expect(controllerSource).toContain('loadSummary');
  });

  it('uses paginated patient and completed-session lookups without fixed large limits', () => {
    expect(controllerSource).toContain('CLINIC_REFERENCE_PAGE_LIMIT');
    expect(controllerSource).toContain('CLINIC_SESSION_LOOKUP_PAGE_LIMIT');
    expect(controllerSource).toContain('PATIENT_LOOKUP_DEBOUNCE_MS');
    expect(controllerSource).toContain('invalidateBillingRequests');
    expect(controllerSource).toContain('resetBillingContextState');
    expect(controllerSource).toContain('patientLookupPageInfo');
    expect(controllerSource).toContain('completedSessionPageInfo');
    expect(controllerSource).toContain('clinicPatientId');
    expect(controllerSource).toContain('mountedRef');
    expect(controllerSource).toContain('invoicesRequestSeq');
    expect(controllerSource).toContain('setTimeout');
    expect(controllerSource).toContain('clearTimeout');
    expect(controllerSource).toContain('setInvoiceForm(createInvoiceForm())');
    expect(controllerSource).not.toContain('limit: 200');
    expect(screenSource).toContain('Buscar por paciente');
    expect(createScreenSource).toContain('Cargar más citas');
  });

  it('debounces patient searches and resets invoice form on clinic context changes', () => {
    const handlerSource = controllerSource.slice(
      controllerSource.indexOf('const handlePatientLookupSearchChange'),
      controllerSource.indexOf('const handleLoadMorePatientOptions'),
    );

    expect(handlerSource).toContain('setPatientLookupSearch(search)');
    expect(handlerSource).not.toContain('loadPatientLookup');
    expect(controllerSource).toContain('setInvoiceErrors({})');
    expect(controllerSource).toContain('setSelectedSessionId');
    expect(controllerSource).toContain('setCompletedSessions([])');
  });

  it('exposes VAT exemption reason and applies compact styles through child panels', () => {
    expect(screenSource).toContain('vatExemptReason');
    expect(screenSource).toContain('Motivo de exención o no sujeción');
    expect(screenSource).toContain('isCompact={isCompact}');
    expect(screenSource).not.toContain('createStyles(theme, false)');
  });

  it('does not present an in-flight billing configuration request as an error', () => {
    expect(controllerSource).toContain("const [configLoading, setConfigLoading] = useState(false)");
    expect(controllerSource).toContain("const [configError, setConfigError] = useState('')");
    expect(controllerSource).toContain('setConfigLoading(true)');
    expect(controllerSource).toContain("setConfigError('')");
    expect(screenSource).toContain('const hasLoadError = Boolean(error) && !loading');
    expect(screenSource).toContain('Cargando datos de facturación…');
    expect(screenSource).not.toContain('No hemos podido cargar esta configuración');
    expect(screenSource).not.toContain('No se ha modificado ningún dato');
  });

  it('preserves valid billing data on refresh errors and clears it on a real clinic change', () => {
    const referenceLoader = controllerSource.slice(
      controllerSource.indexOf('const loadReferenceData'),
      controllerSource.indexOf('const reloadInvoicesAndSummary'),
    );
    const contextReset = controllerSource.slice(
      controllerSource.indexOf('const resetBillingContextState'),
      controllerSource.indexOf('const loadInvoices'),
    );

    expect(referenceLoader).toContain('setConfigError(loadError instanceof Error');
    expect(referenceLoader).not.toContain('setConfig(null)');
    expect(contextReset).toContain('setConfig(null)');
    expect(contextReset).toContain("setConfigError('')");
    expect(contextReset).toContain('setConfigLoading(false)');
  });

  it('uses a responsive two-column billing configuration without narrowing tablet fields', () => {
    expect(screenSource).toContain('wideLayout={width >= 1280}');
    expect(screenSource).toContain('styles.configColumnsWide');
    expect(screenSource).toContain('styles.configColumnWide');
    expect(screenSource).toContain('maxWidth: layout.contentMaxWidth');
    expect(screenSource).toContain('>Impuestos</Text>');
    expect(screenSource).toContain('>Cobro y entrega</Text>');
  });

  it('presents the previous system as explicit navigation instead of a filter selector', () => {
    expect(screenSource).toContain("{ key: 'history', label: 'Histórico anterior' }");
    expect(screenSource).toContain('<HistoricalBillingTabs');
    expect(screenSource).toContain('accessibilityLabel="Apartado del histórico anterior"');
    expect(screenSource).toContain('collapseOnMobile={false}');
    expect(screenSource).not.toContain('placeholder="Histórico anterior"');
    expect(screenSource).not.toContain('selectedHistory');
  });

  it('keeps historical invoice search and filters in one responsive work bar', () => {
    expect(screenSource).toContain('<HistoricalInvoiceFilters');
    expect(screenSource).toContain('wideLayout={width >= 1180}');
    expect(screenSource).toContain('styles.filterControlsWide');
    expect(screenSource).toContain('placeholder="Escribe un nombre"');
    expect(screenSource).toContain('Aplicar filtros');
    expect(screenSource).toContain('Crear factura');
    expect(screenSource).not.toContain('Crear factura del histórico');
    expect(screenSource).not.toContain('<LegacyNotice');
  });

  it('supports manual invoices and explicit invoice generation from completed sessions', () => {
    expect(controllerSource).toContain('handleCreateInvoice');
    expect(controllerSource).toContain('handleCreateFromSession');
    expect(controllerSource).toContain("status: 'COMPLETED'");
    expect(screenSource).toContain("navigation.navigate('ClinicInvoiceCreate')");
    expect(screenSource).not.toContain("navigation.navigate('ClinicAgenda')");
    expect(screenSource).not.toContain("navigation.navigate('ClinicDashboard')");
    expect(screenSource).not.toContain('invoiceIntro');
    expect(screenSource).not.toContain('Crear borrador');
    expect(screenSource).not.toContain('Facturar cita');
    expect(screenSource).not.toContain('InvoiceCreatePanel');
    expect(createScreenSource).toContain('Crear borrador');
    expect(createScreenSource).toContain('Facturar cita');
    expect(createScreenSource).toContain('sin datos clínicos');
    expect(createScreenSource).toContain('{!canManage ? (');
    expect(navigationSource).toContain('ClinicInvoiceCreateRoute');
    expect(navigationSource).toContain('name="ClinicInvoiceCreate"');
  });

  it('shows monthly revenue share and internal settlements without payment integrations', () => {
    expect(screenSource).toContain('Reparto mensual');
    expect(screenSource).toContain('Base pagada');
    expect(screenSource).toContain('Especialistas');
    expect(screenSource).toContain('pendingSnapshotInvoiceCount');
    expect(screenSource).toContain('no tiene{pendingSnapshotCount === 1 ? \'\' : \'n\'} el reparto guardado');
    expect(screenSource).toContain('Liquidaciones');
    expect(screenSource).toContain('Repartos cerrados en el sistema anterior');
    expect(screenSource).toContain('Generar liquidación');
    expect(screenSource).toContain('Ver detalle');
    expect(screenSource).toContain('Marcar revisada');
    expect(screenSource).toContain('Registrar pagada');
    expect(controllerSource).toContain('revenueShareFilters');
    expect(controllerSource).toContain('settlementFilters');
    expect(controllerSource).toContain('clinicService.createClinicSettlement');
    expect(controllerSource).toContain('clinicService.getClinicSettlement');
    expect(controllerSource).not.toContain('bank transfer');
  });

  it('keeps admin billing surfaces behind canManage', () => {
    const adminBlockStart = screenSource.indexOf('{canManage ? (');
    expect(adminBlockStart).toBeGreaterThan(-1);
    const adminBlock = screenSource.slice(adminBlockStart, screenSource.indexOf('</>', adminBlockStart));

    expect(adminBlock).toContain('<SummaryBand');
    expect(adminBlock).toContain('<BillingSectionTabs');
    expect(adminBlock).toContain('<RevenueSharePanel');
    expect(adminBlock).toContain('<SettlementPanel');
    expect(adminBlock).toContain('<ConfigPanel');
    expect(adminBlock).not.toContain('<InvoiceCreatePanel');
    expect(adminBlock).toContain('Facturas');
  });

  it('offers revenue share years from 2020 through next year', () => {
    expect(controllerSource).toContain('currentYear + 1 - 2020 + 1');
    expect(controllerSource).toContain('currentYear + 1 - index');
  });
});
