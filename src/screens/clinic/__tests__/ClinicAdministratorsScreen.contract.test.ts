import fs from 'node:fs';
import path from 'node:path';

describe('ClinicAdministratorsScreen source guards', () => {
  const clinicDir = path.join(__dirname, '..');
  const screenSource = fs.readFileSync(
    path.join(clinicDir, 'ClinicAdministratorsScreen.tsx'),
    'utf8',
  );
  const serviceSource = fs.readFileSync(
    path.join(__dirname, '..', '..', '..', 'services', 'clinic', 'adminService.ts'),
    'utf8',
  );
  const navigationSource = fs.readFileSync(
    path.join(__dirname, '..', '..', '..', 'navigation', 'RootNavigator.tsx'),
    'utf8',
  );
  const navConfigSource = fs.readFileSync(
    path.join(__dirname, '..', '..', '..', 'components', 'navigation', 'sidebar', 'navConfig.ts'),
    'utf8',
  );

  it('keeps administrator management separate from the clinical team surface', () => {
    expect(screenSource).toContain('title="Administradores"');
    expect(screenSource).toContain('separados del equipo asistencial');
    expect(screenSource).toContain('listClinicAdministrators');
    expect(screenSource).toContain('addClinicAdministrator');
    expect(screenSource).toContain('updateClinicAdministratorRole');
    expect(screenSource).toContain('updateClinicAdministratorStatus');
    expect(screenSource).not.toContain('ClinicSpecialistPayload');
    expect(screenSource).not.toContain('linkClinicSpecialist');
    expect(screenSource).not.toContain('ClinicalRecord');
    expect(screenSource).not.toContain('clinicalRecord');
  });

  it('uses clinic domain services instead of raw api calls from the screen', () => {
    expect(screenSource).toContain("from '../../services/clinicService'");
    expect(screenSource).not.toContain("from '../../services/api'");
    expect(screenSource).not.toContain('api.');
    expect(serviceSource).toContain('/clinics/${clinicId}/admins');
  });

  it('keeps mutations behind owner-only UI state and protects the last owner', () => {
    expect(screenSource).toContain(
      "user?.type === 'clinic' && workspace.selectedMembership?.role === 'OWNER'",
    );
    expect(screenSource).toContain("administrator.user.userType === 'CLINIC'");
    expect(screenSource).toContain('activeOwnerCount <= 1');
    expect(screenSource).toContain('Es el último propietario activo');
    expect(screenSource).toContain('Solo propietarios activos pueden añadir');
    expect(screenSource).toContain("administrator.user.accountStatus !== 'ACTIVE'");
    expect(serviceSource).toContain('CLINIC_ADMIN_MEMBERSHIP_INACTIVE');
  });

  it('reserves owner promotion for clinic accounts', () => {
    expect(screenSource).toContain("nextRole === 'OWNER' && administrator.user.userType !== 'CLINIC'");
    expect(screenSource).toContain(
      "const canChangeRole = administrator.role === 'OWNER' || administrator.user.userType === 'CLINIC';",
    );
    expect(serviceSource).toContain('CLINIC_ADMIN_OWNER_REQUIRES_CLINIC_ACCOUNT');
    expect(serviceSource).toContain('Solo una cuenta de clínica puede ser propietaria.');
  });

  it('confirms sensitive additions and ignores stale clinic mutation responses', () => {
    expect(screenSource).toContain("title: 'Añadir administrador'");
    expect(screenSource).toContain('se reactivará');
    expect(screenSource).toContain('clinicIdAtSubmit');
    expect(screenSource).toContain('selectedClinicIdRef');
    expect(screenSource).toContain('isCurrentClinic(clinicIdAtSubmit)');
  });

  it('shows account and linked specialist status for administrators', () => {
    expect(screenSource).toContain('ACCOUNT_STATUS_LABELS');
    expect(screenSource).toContain('LINKED_SPECIALIST_STATUS_LABELS');
    expect(screenSource).toContain('La cuenta no está activa');
    expect(screenSource).toContain('MetaItem label="Cuenta"');
  });

  it('adds clinic administrator navigation for clinic and professional-admin stacks', () => {
    expect(navigationSource).toContain('ClinicAdministratorsRoute');
    expect(navigationSource).toContain('name="ClinicAdministrators"');
    expect(navConfigSource).toContain("id: 'clinic-administrators'");
    expect(navConfigSource).toContain("route: 'ClinicAdministrators'");
    expect(navConfigSource).toContain('PROFESSIONAL_CLINIC_SECTION');
    expect(navConfigSource).toContain('hasClinicAdminAccess');
  });
});
