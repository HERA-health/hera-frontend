import fs from 'node:fs';
import path from 'node:path';

const src = path.resolve(__dirname, '..', '..', '..');
const read = (...parts: string[]) => fs.readFileSync(path.join(src, ...parts), 'utf8');

describe('admin clinic navigation contracts', () => {
  const tabs = read('screens', 'admin', 'AdminPanelTabbedScreen.tsx');
  const clinicWorkspace = read('screens', 'clinic', 'finance', 'ClinicFinancialWorkspace.tsx');
  const clinicService = read('services', 'clinic', 'financeService.ts');

  it('does not expose a clinic activation queue', () => {
    expect(tabs).not.toContain("key: 'clinics'");
    expect(tabs).not.toContain('clinicFinanceSummary?.pendingRequests');
    expect(tabs).not.toContain('AdminClinicFinanceScreen');
  });

  it('keeps clinic finance free from owner review and activation requests', () => {
    expect(clinicWorkspace).not.toContain('ClinicFinancialActivationCard');
    expect(clinicWorkspace).not.toContain('ModeBadge');
    expect(clinicWorkspace).not.toContain('Pendiente de preparación');
    expect(clinicService).not.toContain('/finance/activation-readiness');
    expect(clinicService).not.toContain('/finance/activation-requests');
    expect(clinicService).not.toContain('/finance/activate');
  });

  it('removes the obsolete global activation implementation', () => {
    expect(fs.existsSync(path.join(src, 'screens', 'admin', 'AdminClinicFinanceScreen.tsx'))).toBe(false);
    expect(fs.existsSync(path.join(src, 'services', 'adminClinicFinanceService.ts'))).toBe(false);
  });
});
