import {
  getProfessionalTourDefinition,
  getProfessionalTourIdForRoute,
  getProfessionalTourIdsForRoute,
  getProfessionalTourStepsForDisplay,
  PROFESSIONAL_TOUR_DEFINITIONS,
} from '../professionalTourDefinitions';

describe('professionalTourDefinitions', () => {
  it('maps professional routes to their tour ids', () => {
    expect(getProfessionalTourIdForRoute('ProfessionalClients')).toBe(
      'professional_clients_v1',
    );
    expect(getProfessionalTourIdForRoute('Home')).toBeNull();
  });

  it('filters device-specific steps without dropping shared steps', () => {
    const definition = getProfessionalTourDefinition('professional_home_v1');

    const desktopSteps = getProfessionalTourStepsForDisplay(definition, 'desktop');
    const mobileSteps = getProfessionalTourStepsForDisplay(definition, 'mobile');

    expect(desktopSteps.some((step) => step.targetId === 'professional.nav.home')).toBe(true);
    expect(desktopSteps.some((step) => step.targetId === 'professional.nav.mobile-menu')).toBe(false);
    expect(mobileSteps.some((step) => step.targetId === 'professional.nav.mobile-menu')).toBe(true);
    expect(mobileSteps.some((step) => step.targetId === 'professional.home.calendar')).toBe(true);
  });

  it('keeps clinical patient profile guidance manual-only', () => {
    expect(getProfessionalTourDefinition('professional_client_profile_v1').autoStart).toBe(false);
  });

  it('auto-starts the clinical area guidance independently inside the client profile route', () => {
    const clinicalDefinition = getProfessionalTourDefinition('professional_clinical_area_v1');

    expect(getProfessionalTourIdForRoute('ClientProfile')).toBe('professional_client_profile_v1');
    expect(getProfessionalTourIdsForRoute('ClientProfile')).toEqual([
      'professional_client_profile_v1',
      'professional_clinical_area_v1',
    ]);
    expect(clinicalDefinition.autoStart).toBe(true);
    expect(clinicalDefinition.routeName).toBe('ClientProfile');
    expect(
      clinicalDefinition.steps.map((step) => step.targetId),
    ).toEqual([
      'professional.clinical.hero',
      'professional.clinical.workspace-tabs',
      'professional.clinical.consent',
      'professional.clinical.consent-documents',
      'professional.clinical.questionnaire',
      'professional.clinical.notes',
      'professional.clinical.timeline',
      'professional.clinical.reports',
      'professional.clinical.documents',
    ]);
  });

  it('keeps Spanish guidance copy accented and readable', () => {
    const allCopy = Object.values(PROFESSIONAL_TOUR_DEFINITIONS)
      .flatMap((definition) => definition.steps)
      .map((step) => `${step.title} ${step.body}`)
      .join(' ');

    expect(allCopy).toContain('móvil');
    expect(allCopy).toContain('facturación');
    expect(allCopy).toContain('automáticamente');
    expect(allCopy).toContain('Evolución mensual');
    expect(allCopy).toContain('año');
    expect(allCopy).toContain('área clínica');
    expect(allCopy).toContain('Sesiones organiza cada cita');
    expect(allCopy).toContain('Firma digital de consentimiento clínico');
    expect(allCopy).toContain('Documento de consentimiento clínico');
    expect(allCopy).toContain('habilitar el tratamiento de datos clínicos');
    expect(allCopy).toContain('pacientes gestionados sin cuenta');
    expect(allCopy).not.toMatch(/\b(facturacion|movil|automaticamente|Evolucion|ano)\b/);
  });
});
