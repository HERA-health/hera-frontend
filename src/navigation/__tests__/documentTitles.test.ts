import { getDocumentTitleForRoute } from '../documentTitles';

describe('documentTitles', () => {
  it('formats public route titles with Hera first', () => {
    expect(getDocumentTitleForRoute('Landing')).toBe('Hera | Inicio');
    expect(getDocumentTitleForRoute('Login')).toBe('Hera | Iniciar sesión');
    expect(getDocumentTitleForRoute('Register')).toBe('Hera | Crear cuenta');
    expect(getDocumentTitleForRoute('PublicSpecialists')).toBe('Hera | Especialistas');
  });

  it('formats professional route titles in Spanish', () => {
    expect(getDocumentTitleForRoute('ProfessionalHome')).toBe('Hera | Agenda profesional');
    expect(getDocumentTitleForRoute('ProfessionalClients')).toBe('Hera | Mis pacientes');
    expect(getDocumentTitleForRoute('ProfessionalBilling')).toBe('Hera | Facturación');
  });

  it('formats clinic route titles', () => {
    expect(getDocumentTitleForRoute('ClinicDashboard')).toBe('Hera | Panel de clínica');
    expect(getDocumentTitleForRoute('ClinicSettings')).toBe('Hera | Configuración de clínica');
    expect(getDocumentTitleForRoute('ClinicAdministrators')).toBe('Hera | Administradores de clínica');
    expect(getDocumentTitleForRoute('ClinicTeam')).toBe('Hera | Equipo de clínica');
    expect(getDocumentTitleForRoute('ClinicPatients')).toBe('Hera | Pacientes de clínica');
    expect(getDocumentTitleForRoute('ClinicPending')).toBe('Hera | Área de clínica');
  });

  it('uses specific legal document titles when params include the document key', () => {
    expect(
      getDocumentTitleForRoute('LegalDocument', { documentKey: 'PRIVACY_POLICY' })
    ).toBe('Hera | Política de privacidad');
  });

  it('falls back to a safe Hera title for unknown route names', () => {
    expect(getDocumentTitleForRoute('UnknownRoute')).toBe('Hera | Área privada');
  });
});
