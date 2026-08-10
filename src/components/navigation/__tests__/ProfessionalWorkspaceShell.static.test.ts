import fs from 'node:fs';
import path from 'node:path';

const navigationRoot = path.join(__dirname, '..');
const frontendSrc = path.join(navigationRoot, '..', '..');
const readSource = (...segments: string[]) => fs.readFileSync(
  path.join(frontendSrc, ...segments),
  'utf8',
);

describe('professional workspace shell hardening', () => {
  const mainLayout = readSource('components', 'navigation', 'MainLayout.tsx');
  const topBar = readSource('components', 'navigation', 'ProfessionalTopBar.tsx');
  const drawer = readSource('components', 'navigation', 'CustomDrawerContent.tsx');
  const quickSearch = readSource('components', 'navigation', 'ProfessionalQuickSearch.tsx');
  const home = readSource('screens', 'professional', 'ProfessionalHomeScreen.tsx');

  it('keeps the 1040 professional breakpoint without changing other roles', () => {
    expect(mainLayout).toContain('isLargeScreenForRole(windowWidth, isProfessional)');
    expect(mainLayout).toContain('<ProfessionalWorkspaceProvider key={user?.id');
  });

  it('uses one provider instead of duplicate home and support requests', () => {
    expect(topBar).toContain('useProfessionalWorkspace()');
    expect(drawer).toContain('useOptionalProfessionalWorkspace()');
    expect(topBar).not.toContain('getSpecialistContactSummary');
    expect(drawer).not.toContain('getSpecialistContactSummary');
    expect(topBar).not.toContain('dashboardService.getProfessionalHome');
  });

  it('only claims all-clear after every source is confirmed', () => {
    expect(topBar).toContain("homeStatus === 'ready'");
    expect(topBar).toContain("supportStatus === 'ready'");
    expect(topBar).toContain("profileStatus === 'ready'");
    expect(topBar).toContain('attentionCount === 0 && attentionSourcesReady');
    expect(topBar).toContain('<WorkspaceStatusNotice');
    expect(topBar).toContain('refreshAttention()');
  });

  it('counts only profile items that require a professional action', () => {
    expect(topBar).toContain("profileItems.filter((item) => item.state === 'ACTION_REQUIRED')");
    expect(topBar).toContain('+ actionableProfileItems.length');
    expect(home).toContain("profileItems.filter((item) => item.state === 'ACTION_REQUIRED')");
    expect(home).toContain('profileItems={actionableProfileItems.length}');
  });

  it('keeps the activation and attention cards in equal columns on wide screens', () => {
    expect(home).toContain('style={[styles.priorityGrid, !isWide ? styles.priorityGridStacked : null]}');
    expect(home).toContain('style={isWide ? styles.priorityColumn : styles.stackedColumn}');
    expect(home).not.toContain('!isWide || isNewSpecialist');
    expect(home).not.toContain('isWide && !isNewSpecialist');
  });

  it('keeps search analytics categorical and results scrollable', () => {
    expect(quickSearch).toContain('<ScrollView');
    expect(quickSearch).toContain("category: 'patient'");
    expect(quickSearch).toContain("category: 'navigation'");
    expect(quickSearch).not.toMatch(/analyticsService\.track\([^\n]+(?:query|patientId|displayName)/);
  });
});
