import type { ClinicPatientSummary } from '../../../services/clinicService';
import {
  createClinicSessionSchedulerForm,
  validateClinicSessionSchedulerForm,
} from '../clinicSessionSchedulerDomain';

const assignedPatient: ClinicPatientSummary = {
  id: 'patient-1',
  status: 'ACTIVE',
  displayName: 'Lucía Martín',
  firstName: 'Lucía',
  lastName: 'Martín',
  email: 'lucia@example.com',
  phone: null,
  billingDataComplete: true,
  createdAt: '2029-01-01T09:00:00.000Z',
  updatedAt: '2029-01-01T09:00:00.000Z',
  archivedAt: null,
  activeAssignment: {
    id: 'assignment-1',
    clinicSpecialistId: 'specialist-1',
    clinicSpecialistDisplayName: 'Dra. Ana Ruiz',
    clinicSpecialistProfessionalTitle: 'Psicóloga sanitaria',
    clinicSpecialistStatus: 'ACTIVE',
    startedAt: '2029-01-01T09:00:00.000Z',
    reason: null,
  },
};

describe('clinicSessionSchedulerDomain', () => {
  it('derives the locked specialist and converts Europe/Madrid to an ISO instant', () => {
    const result = validateClinicSessionSchedulerForm({
      ...createClinicSessionSchedulerForm(assignedPatient.id),
      date: '2030-01-15',
      time: '10:30',
      duration: '50',
      type: 'PHONE_CALL',
    }, [assignedPatient], new Date('2029-01-01T00:00:00.000Z'));

    expect(result).toEqual({
      success: true,
      payload: {
        clinicPatientId: 'patient-1',
        clinicSpecialistId: 'specialist-1',
        date: '2030-01-15T09:30:00.000Z',
        duration: 50,
        type: 'PHONE_CALL',
      },
    });
  });

  it('rejects an inactive assignment without accepting an editable specialist', () => {
    const result = validateClinicSessionSchedulerForm({
      ...createClinicSessionSchedulerForm(assignedPatient.id),
      date: '2030-01-15',
    }, [{
      ...assignedPatient,
      activeAssignment: assignedPatient.activeAssignment
        ? { ...assignedPatient.activeAssignment, clinicSpecialistStatus: 'INACTIVE' }
        : null,
    }], new Date('2029-01-01T00:00:00.000Z'));

    expect(result).toEqual({
      success: false,
      errors: { clinicSpecialistId: 'El paciente no tiene un responsable activo.' },
    });
  });

  it('keeps field validation next to the invalid inputs', () => {
    const result = validateClinicSessionSchedulerForm({
      clinicPatientId: '',
      date: '15/01/2030',
      time: '10',
      duration: '5',
      type: 'IN_PERSON',
    }, [assignedPatient]);

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.errors).toMatchObject({
      clinicPatientId: expect.any(String),
      date: expect.any(String),
      time: expect.any(String),
      duration: expect.any(String),
    });
  });
});
