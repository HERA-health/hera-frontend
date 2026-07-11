import fs from 'node:fs';
import path from 'node:path';

describe('professional profile completion warnings', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'SpecialistProfileScreen.tsx'),
    'utf8',
  );

  it('shows persistent guidance beside every actionable profile section', () => {
    expect(source).toContain("renderCompletionWarning(");
    expect(source).toContain("'PROFILE_IDENTITY'");
    expect(source).toContain("'PROFILE_BIO'");
    expect(source).toContain("'PROFILE_MATCHING'");
    expect(source).toContain("'PROFILE_MODALITY'");
    expect(source).toContain("'PROFILE_LOCATION'");
    expect(source).toContain("'PROFESSIONAL_VERIFICATION'");
    expect(source).toContain("'PROFESSIONAL_INSURANCE'");
    expect(source).toContain("'PROFESSIONAL_BILLING'");
  });

  it('explains the description requirement using the visible field terminology', () => {
    expect(source).toContain('Descripción profesional incompleta');
    expect(source).toContain('caracteres para alcanzar el mínimo de 150');
    expect(source).not.toContain('Amplía tu biografía');
  });

  it('marks profile tabs with their pending section count', () => {
    expect(source).toContain('pendingCount: informationCompletionCount');
    expect(source).toContain('pendingCount: credentialsCompletionCount');
    expect(source).toContain('pendingCount: billingCompletionCount');
    expect(source).toContain('styles.tabPendingBadge');
  });

  it('uses action-specific alert titles instead of a generic Error heading', () => {
    expect(source).not.toContain("showAppAlert(appAlert, 'Error'");
    expect(source).toContain("'No se pudo guardar el perfil'");
    expect(source).toContain("'No se pudo subir la póliza'");
    expect(source).toContain("'No se pudo subir el certificado'");
  });
});
