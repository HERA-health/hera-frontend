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
    expect(screenSource).toContain('onPress={handleApplyFilters}');
    expect(screenSource).not.toContain('clinicService.listClinicInvoices');
  });

  it('keeps cheap invoice refreshes separate from reference data reloads', () => {
    expect(controllerSource).toContain('reloadInvoicesAndSummary');
    expect(controllerSource).toContain('loadReferenceData');
    expect(controllerSource).toContain('loadSummary');
  });

  it('exposes VAT exemption reason and applies compact styles through child panels', () => {
    expect(screenSource).toContain('vatExemptReason');
    expect(screenSource).toContain('Motivo de exencion IVA');
    expect(screenSource).toContain('isCompact={isCompact}');
    expect(screenSource).not.toContain('createStyles(theme, false)');
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
    expect(screenSource).toContain('sin snapshot');
    expect(screenSource).toContain('Liquidaciones');
    expect(screenSource).toContain('Registro interno; no realiza transferencia bancaria');
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
