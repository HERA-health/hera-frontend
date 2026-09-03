import type { AxiosResponse } from 'axios';
import api from '../api';
import { clearRequestCache } from '../requestCache';
import {
  getProfessionalClinicAccess,
  getProfessionalClinicContexts,
  listClinicSessions,
} from '../clinic/professionalWorkspaceService';

jest.mock('../api', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), patch: jest.fn() },
}));

const getMock = api.get as jest.MockedFunction<typeof api.get>;
const timestamp = '2026-09-02T10:00:00.000Z';

const context = {
  clinic: {
    id: 'clinic-1',
    displayName: 'Clínica Serena',
  },
  relationship: {
    clinicSpecialistId: 'clinic-specialist-1',
    displayName: 'Dra. Ana Ruiz',
    professionalTitle: 'Psicóloga sanitaria',
  },
  attention: { pendingTaskCount: 2 },
  capabilities: {
    care: { canViewAssignedPatients: true, canContactUsingAvailableData: true, canOpenClinicalContent: false },
    scheduling: { canView: true, canConfirm: true, canComplete: true, canMarkPatientNoShow: true, canCancel: true, canReschedule: true, canJoinVideo: true },
    finance: { canViewAgreements: true, canRespondToAgreements: true, canViewAmountsAndPayments: true, canManageProfessionalInvoice: true },
    operations: { canViewLocations: true, canViewCoordination: true, canViewSchedules: true, canViewInstructions: true },
    administration: { canOpenAdminWorkspace: false },
  },
} as const;

const session = {
  id: 'session-1',
  origin: 'CLINIC',
  clinic: { id: 'clinic-1', displayName: 'Clínica Serena' },
  professional: { clinicSpecialistId: 'clinic-specialist-1', displayName: 'Dra. Ana Ruiz', professionalTitle: null },
  patient: { id: 'patient-1', displayName: 'Paciente', avatar: null, hasHeraAccount: true },
  service: { id: 'service-1', name: 'Seguimiento' },
  schedule: { startsAt: timestamp, endsAt: '2026-09-02T11:00:00.000Z', durationMinutes: 60, modality: 'VIDEO_CALL' },
  status: 'CONFIRMED',
  attendanceOutcome: null,
  price: { amountCents: 7000, currency: 'EUR' },
  financial: null,
  actions: { canConfirm: false, canCancel: true, canComplete: false, canMarkPatientNoShow: false, canReschedule: true, canJoinVideo: true, canOpenClinicalNotes: false },
  cancelledAt: null,
  createdAt: timestamp,
  updatedAt: timestamp,
} as const;

describe('professionalClinicWorkspaceService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearRequestCache();
  });

  it('validates and caches the canonical professional context per user', async () => {
    getMock.mockResolvedValueOnce({ data: { success: true, data: [context] } } as AxiosResponse);
    const first = await getProfessionalClinicContexts('user-1');
    const second = await getProfessionalClinicContexts('user-1');
    expect(first[0].clinic.displayName).toBe('Clínica Serena');
    expect(first[0].capabilities.care.canOpenClinicalContent).toBe(false);
    expect(second).toEqual(first);
    expect(getMock).toHaveBeenCalledTimes(1);
  });

  it('detects the care link independently from workspace rollout', async () => {
    getMock.mockResolvedValueOnce({
      data: { success: true, data: { hasActiveCareLink: true } },
    } as AxiosResponse);

    await expect(getProfessionalClinicAccess('user-1')).resolves.toEqual({ hasActiveCareLink: true });
    expect(getMock).toHaveBeenCalledWith('/clinics/specialist/access');
  });

  it('rejects unexpected sensitive fields instead of silently accepting contract drift', async () => {
    getMock.mockResolvedValueOnce({
      data: { success: true, data: [{ ...context, clinic: { ...context.clinic, legalName: 'No debe salir' } }] },
    } as AxiosResponse);
    await expect(getProfessionalClinicContexts('user-2')).rejects.toThrow();
  });

  it('requires clinical notes to remain disabled for every clinic session projection', async () => {
    getMock.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          items: [{ ...session, actions: { ...session.actions, canOpenClinicalNotes: true } }],
          pageInfo: { page: 1, limit: 20, total: 1, hasMore: false, nextPage: null },
        },
      },
    } as AxiosResponse);
    await expect(listClinicSessions('clinic-1')).rejects.toThrow();
  });
});
