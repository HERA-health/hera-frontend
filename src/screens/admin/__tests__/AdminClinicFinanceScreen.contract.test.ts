import fs from 'node:fs';
import path from 'node:path';

const src = path.resolve(__dirname, '..', '..', '..');
const read = (...parts: string[]) => fs.readFileSync(path.join(src, ...parts), 'utf8');

describe('admin clinic finance activation contracts', () => {
  const tabs = read('screens', 'admin', 'AdminPanelTabbedScreen.tsx');
  const screen = read('screens', 'admin', 'AdminClinicFinanceScreen.tsx');
  const service = read('services', 'adminClinicFinanceService.ts');
  const clinicWorkspace = read('screens', 'clinic', 'finance', 'ClinicFinancialWorkspace.tsx');
  const clinicService = read('services', 'clinic', 'financeService.ts');

  it('registers the clinics tab with its pending-request badge', () => {
    expect(tabs).toContain("key: 'clinics'");
    expect(tabs).toContain('clinicFinanceSummary?.pendingRequests');
    expect(tabs).toContain('AdminClinicFinanceScreen');
  });

  it('keeps admin activation individual, confirmed and idempotent', () => {
    expect(screen).toContain('useAppAlert');
    expect(screen).toContain('createActivationCommandKey');
    expect(screen).toContain('commandReservations.current');
    expect(screen).toContain('Activar clínica');
    expect(screen).not.toContain('Activar todas');
    expect(service).toContain("'Idempotency-Key': idempotencyKey");
  });

  it('cancels stale detail requests and separates list, detail and action errors', () => {
    expect(screen).toContain('detailGeneration.current');
    expect(screen).toContain('listGeneration.current');
    expect(screen).toContain('setDetail(null)');
    expect(screen).toContain('listError');
    expect(screen).toContain('detailError');
    expect(screen).toContain('actionError');
  });

  it('keeps final activation in HERA while allowing the owner to submit a compact review request', () => {
    expect(screen).toContain('Activar clínica');
    expect(screen).toContain('Iniciar comprobación');
    expect(clinicWorkspace).not.toContain('ClinicFinancialActivationCard');
    expect(clinicWorkspace).not.toContain('ModeBadge');
    expect(clinicWorkspace).not.toContain('Pendiente de preparación');
    expect(clinicService).toContain('/finance/activation-readiness');
    expect(clinicService).toContain('/finance/activation-requests');
    expect(clinicService).not.toContain('/finance/activate');
  });

  it('does not expose detailed financial entities in the global admin contract', () => {
    expect(service).not.toContain('patientDisplayName');
    expect(service).not.toContain('amountCents');
    expect(service).not.toContain('ClinicInvoice');
    expect(screen).toContain('sin datos financieros ni pacientes');
  });

  it('keeps both clinic panes scrollable within the available admin viewport', () => {
    expect(screen).toContain('style={styles.masterScroll}');
    expect(screen).toContain('style={styles.detailScroll}');
    expect(screen).toContain('nestedScrollEnabled');
    expect(screen).toContain("workspace: { flex: 1, minHeight: 0");
    expect(screen).not.toContain('minHeight: 520');
    expect(screen).not.toContain('minHeight: 420');
  });
});
