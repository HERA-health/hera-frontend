import fs from 'node:fs';
import path from 'node:path';

const frontendSrc = path.join(__dirname, '..', '..', '..');
const frontendRoot = path.join(frontendSrc, '..');

const readSource = (...segments: string[]) =>
  fs.readFileSync(path.join(frontendSrc, ...segments), 'utf8');

describe('specialist contact frontend contracts', () => {
  const workspace = readSource(
    'components',
    'specialistContact',
    'ProfessionalContactWorkspace.tsx'
  );
  const service = readSource('services', 'specialistContactService.ts');
  const navConfig = readSource('components', 'navigation', 'sidebar', 'navConfig.ts');
  const professionalTopBar = readSource('components', 'navigation', 'ProfessionalTopBar.tsx');
  const types = readSource('constants', 'types.ts');
  const rootNavigator = readSource('navigation', 'RootNavigator.tsx');
  const adminTabs = readSource('screens', 'admin', 'AdminPanelTabbedScreen.tsx');
  const adminHelp = readSource('components', 'specialistContact', 'AdminHelpView.tsx');
  const adminFeedback = readSource('components', 'specialistContact', 'AdminFeedbackView.tsx');
  const adminStyles = readSource('components', 'specialistContact', 'adminContactStyles.ts');
  const drawer = readSource('components', 'navigation', 'CustomDrawerContent.tsx');
  const app = fs.readFileSync(path.join(frontendRoot, 'App.tsx'), 'utf8');
  const professionalScreen = readSource('screens', 'professional', 'ProfessionalHelpScreen.tsx');

  it('registers the professional-only menu destination and typed route', () => {
    const professionalSection = navConfig.slice(
      navConfig.indexOf('export const PROFESSIONAL_SECTIONS'),
      navConfig.indexOf('export const CLINIC_SECTIONS')
    );

    expect(professionalSection).toContain("label: 'Soporte'");
    expect(professionalSection).toContain("label: 'Ayuda y comentarios'");
    expect(professionalSection).toContain("route: 'ProfessionalHelp'");
    expect(professionalTopBar).toContain('title="Ayuda y comentarios"');
    expect(professionalTopBar).toContain("navigateSimple('ProfessionalHelp')");
    expect(professionalSection).toContain("roles: ['PROFESSIONAL']");
    expect(types).toContain("section?: 'help' | 'feedback'");
    expect(rootNavigator).toContain('name="ProfessionalHelp"');
  });

  it('keeps deep links for specialist help and admin request detail', () => {
    expect(workspace).toContain("initialSection = 'feedback'");
    expect(professionalScreen).toContain("route.params?.section ?? 'feedback'");
    expect(app).toContain("section === 'help' ? 'help' : 'feedback'");
    expect(workspace.indexOf('Compartir comentarios')).toBeLessThan(workspace.indexOf('Solicitar ayuda'));

    expect(app).toContain("ProfessionalHelp: {");
    expect(app).toContain("path: 'ayuda'");
    expect(app).toContain("AdminPanel: {");
    expect(app).toContain("path: 'admin'");
    expect(types).toContain("initialTab?: 'verifications' | 'management' | 'help' | 'feedback'");
    expect(types).not.toContain("| 'clinics' | 'help'");
  });

  it('keeps compact service and privacy guidance inside help only', () => {
    const helpBranch = workspace.indexOf("{section === 'help' ? (");
    const guidance = workspace.indexOf('Este canal no es inmediato ni gestiona emergencias clínicas');
    expect(guidance).toBeGreaterThan(helpBranch);
    expect(workspace).toContain('No incluyas nombres, datos de contacto ni información clínica de pacientes');
    expect(workspace).not.toContain('styles.serviceNotice');
    expect(workspace).not.toContain('styles.privacyNotice');
    expect(workspace).toContain('Tu borrador se conserva');
  });

  it('uses text-only forms and does not expose attachment controls', () => {
    expect(workspace).toContain('maxLength={4000}');
    expect(workspace).toContain('multiline');
    expect(workspace).not.toContain('DocumentPicker');
    expect(workspace).not.toContain('ImagePicker');
    expect(workspace).not.toContain('base64');
  });

  it('tracks only categorical usage metadata, never message text', () => {
    expect(workspace).toContain("track('specialist_help_created', { category: helpCategory, impact: helpImpact })");
    expect(workspace).toContain("track('specialist_feedback_created', { category: feedbackCategory })");
    expect(workspace).not.toContain("track('specialist_help_created', { message");
    expect(workspace).not.toContain("track('specialist_feedback_created', { text");
  });

  it('wires every specialist and admin API contract', () => {
    for (const endpoint of [
      '/specialist-contact/help-requests',
      '/specialist-contact/feedback',
      '/specialist-contact/summary',
      '/admin/specialist-contact/help-requests',
      '/admin/specialist-contact/feedback',
      '/admin/specialist-contact/summary',
      '/admin/specialist-contact/notifications/',
    ]) {
      expect(service).toContain(endpoint);
    }
  });

  it('extends admin to four tabs and keeps feedback non-conversational', () => {
    expect(adminTabs).toContain("key: 'help'");
    expect(adminTabs).toContain("key: 'feedback'");
    expect(adminTabs).toContain('<AdminHelpView');
    expect(adminTabs).toContain('<AdminFeedbackView');
    expect(adminFeedback).toContain('Este flujo no permite respuestas ni genera avisos por Discord.');
    expect(adminFeedback).not.toContain('replyToHelpRequestAsAdmin');
  });

  it('keeps admin contact panels scrollable and dropdowns above their content', () => {
    expect(adminTabs).toContain('minHeight: 0');
    expect(adminStyles).not.toContain('minHeight: 520');
    expect(adminStyles).toContain('panelScroll: {');
    expect(adminStyles).toContain('zIndex: 100');
    expect(adminStyles).toContain("flexWrap: 'wrap'");

    for (const view of [adminHelp, adminFeedback]) {
      expect(view).toContain('style={styles.panelScroll}');
      expect(view).toContain('nestedScrollEnabled');
    }
  });

  it('keeps deep-link state and unread counters synchronized', () => {
    expect(adminTabs).toContain('setActiveTab(route.params.initialTab)');
    expect(workspace).toContain('selectedHelp?.id !== initialRequestId');
    expect(adminHelp.indexOf('markAdminHelpRequestRead(id, lastSpecialistMessage.id)')).toBeGreaterThan(-1);
    expect(adminHelp.indexOf('markAdminHelpRequestRead(id, lastSpecialistMessage.id)')).toBeLessThan(
      adminHelp.indexOf('onSummaryChanged?.()')
    );
    expect(workspace).toContain("requestId: undefined");
    expect(adminTabs).toContain('onRequestChange={handleHelpRequestChange}');
    expect(adminHelp).toContain('onRequestChange?.(undefined)');
  });

  it('isolates drafts, read boundaries and secondary refresh failures', () => {
    expect(workspace).toContain('replyDrafts');
    expect(adminHelp).toContain('replyDrafts');
    expect(workspace).not.toContain('const [reply, setReply] = useState');
    expect(adminHelp).not.toContain('const [reply, setReply] = useState');
    expect(service).toContain('{ throughMessageId }');
    expect(workspace).toContain('refreshWarning');
    expect(adminHelp).toContain('refreshWarning');
    expect(adminFeedback).toContain('refreshWarning');
    expect(workspace).not.toContain('const [helpPage, feedbackPage] = await Promise.all');
    const summaryGuard = drawer.slice(
      drawer.indexOf('const refreshContactSummary'),
      drawer.indexOf('const notices')
    );
    expect(summaryGuard).not.toContain('verificationSubmitted === false');
  });

  it('keeps new surfaces theme-driven without legacy token imports', () => {
    const related = [
      workspace,
      readSource('components', 'specialistContact', 'AdminHelpView.tsx'),
      readSource('components', 'specialistContact', 'AdminFeedbackView.tsx'),
      readSource('components', 'specialistContact', 'adminContactStyles.ts'),
    ].join('\n');

    expect(related).not.toContain('heraLanding');
    expect(related).not.toMatch(/#[0-9A-Fa-f]{6}/);
    expect(related).toContain('useTheme');
  });

  it('announces status messages and uses tab semantics', () => {
    expect(workspace).toContain('accessibilityRole="tab"');
    expect(adminTabs).toContain('accessibilityRole="tab"');
    expect(workspace).toContain('accessibilityLiveRegion="assertive"');
    expect(workspace).toContain('accessibilityLiveRegion="polite"');
    expect(adminHelp).toContain('accessibilityLiveRegion="assertive"');
    expect(adminFeedback).toContain('accessibilityLiveRegion="polite"');
  });
});
