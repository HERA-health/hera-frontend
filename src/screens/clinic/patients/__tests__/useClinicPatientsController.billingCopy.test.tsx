import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useAppAlert } from '../../../../components/common/alert/AppAlertContext';
import { useAuth } from '../../../../contexts/AuthContext';
import * as clinicService from '../../../../services/clinicService';
import { useClinicWorkspace } from '../../useClinicWorkspace';
import { useClinicPatientsController } from '../useClinicPatientsController';

jest.mock('../../../../components/common/alert/AppAlertContext', () => ({
  useAppAlert: jest.fn(),
}));
jest.mock('../../../../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));
jest.mock('../../../../services/clinicService', () => ({
  createClinicPatient: jest.fn(),
  getClinicPatient: jest.fn(),
  getClinicPatientConsent: jest.fn(),
  listClinicPatientAssignmentHistory: jest.fn(),
  listClinicPatients: jest.fn(),
  listClinicSessions: jest.fn(),
  listClinicSpecialists: jest.fn(),
  updateClinicPatient: jest.fn(),
}));
jest.mock('../../useClinicWorkspace', () => ({
  useClinicWorkspace: jest.fn(),
}));

const mockedUseAppAlert = jest.mocked(useAppAlert);
const mockedUseAuth = jest.mocked(useAuth);
const mockedUseClinicWorkspace = jest.mocked(useClinicWorkspace);
const mockedCreateClinicPatient = jest.mocked(clinicService.createClinicPatient);
const mockedGetClinicPatient = jest.mocked(clinicService.getClinicPatient);
const mockedGetClinicPatientConsent = jest.mocked(clinicService.getClinicPatientConsent);
const mockedListClinicPatientAssignmentHistory = jest.mocked(
  clinicService.listClinicPatientAssignmentHistory,
);
const mockedListClinicPatients = jest.mocked(clinicService.listClinicPatients);
const mockedListClinicSessions = jest.mocked(clinicService.listClinicSessions);
const mockedListClinicSpecialists = jest.mocked(clinicService.listClinicSpecialists);
const mockedUpdateClinicPatient = jest.mocked(clinicService.updateClinicPatient);

const patientDetail: clinicService.ClinicPatientDetail = {
  id: 'patient-1',
  status: 'ACTIVE',
  displayName: 'Lucía Martín',
  firstName: 'Lucía',
  lastName: 'Martín',
  email: 'lucia@example.com',
  phone: null,
  billingDataComplete: false,
  billingFullName: 'Empresa Familiar SL',
  billingTaxId: 'B12345678',
  billingAddress: 'Calle Sur 2',
  billingPostalCode: '28002',
  billingCity: 'Madrid',
  billingCountry: 'España',
  createdAt: '2026-08-13T08:00:00.000Z',
  updatedAt: '2026-08-13T08:00:00.000Z',
  archivedAt: null,
  activeAssignment: null,
  nextSession: null,
};

const enableManagedClinic = () => {
  mockedUseClinicWorkspace.mockReturnValue({
    memberships: [],
    selectedClinicId: 'clinic-1',
    selectedMembership: {
      id: 'membership-1',
      role: 'OWNER',
      status: 'ACTIVE',
      createdAt: '2026-08-13T08:00:00.000Z',
      updatedAt: '2026-08-13T08:00:00.000Z',
      clinic: {
        id: 'clinic-1',
        commercialName: 'Clínica HERA',
        legalName: null,
        status: 'ACTIVE',
        createdAt: '2026-08-13T08:00:00.000Z',
        updatedAt: '2026-08-13T08:00:00.000Z',
      },
    },
    loading: false,
    error: '',
    reload: jest.fn(),
    selectClinic: jest.fn(),
  });
};

describe('useClinicPatientsController billing copy', () => {
  beforeEach(() => {
    mockedUseAuth.mockReturnValue({
      logout: jest.fn(),
    } as unknown as ReturnType<typeof useAuth>);
    mockedUseAppAlert.mockReturnValue({
      confirm: jest.fn(),
    } as unknown as ReturnType<typeof useAppAlert>);
    mockedUseClinicWorkspace.mockReturnValue({
      memberships: [],
      selectedClinicId: null,
      selectedMembership: null,
      loading: false,
      error: '',
      reload: jest.fn(),
      selectClinic: jest.fn(),
    });
    mockedListClinicPatients.mockResolvedValue({
      items: [],
      pageInfo: { page: 1, limit: 50, hasMore: false, nextPage: null },
    });
    mockedListClinicSpecialists.mockResolvedValue([]);
    mockedListClinicPatientAssignmentHistory.mockResolvedValue({
      items: [],
      pageInfo: { page: 1, limit: 20, hasMore: false, nextPage: null },
    });
    mockedListClinicSessions.mockResolvedValue({
      items: [],
      pageInfo: { page: 1, limit: 20, hasMore: false, nextPage: null },
    });
    mockedGetClinicPatientConsent.mockResolvedValue({
      clinicPatientId: 'patient-1',
      patientDisplayName: 'Lucía Martín',
      patientEmail: 'lucia@example.com',
      patientStatus: 'ACTIVE',
      status: 'PENDING',
      method: null,
      requestedAt: null,
      grantedAt: null,
      version: null,
      documents: [],
      events: [],
      activeRequest: null,
    });
    mockedCreateClinicPatient.mockResolvedValue(patientDetail);
    mockedGetClinicPatient.mockResolvedValue(patientDetail);
    mockedUpdateClinicPatient.mockResolvedValue(patientDetail);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('copies, synchronizes and restores a customized fiscal name', () => {
    const { result } = renderHook(() => useClinicPatientsController());

    act(() => result.current.handleAdd());
    act(() => {
      result.current.handleChange('firstName', 'Lucía');
      result.current.handleChange('lastName', 'Martín');
      result.current.handleChange('billingFullName', 'Empresa Familiar SL');
      result.current.handleChange('billingTaxId', 'B12345678');
      result.current.handleChange('billingAddress', 'Calle Sur 2');
    });

    expect(result.current.sameBillingData).toBe(false);

    act(() => result.current.handleToggleSameBillingData());
    expect(result.current.sameBillingData).toBe(true);
    expect(result.current.form.billingFullName).toBe('Lucía Martín');

    act(() => result.current.handleChange('lastName', 'Martín García'));
    expect(result.current.form.billingFullName).toBe('Lucía Martín García');

    act(() => result.current.handleToggleSameBillingData());
    expect(result.current.sameBillingData).toBe(false);
    expect(result.current.form).toMatchObject({
      billingFullName: 'Empresa Familiar SL',
      billingTaxId: 'B12345678',
      billingAddress: 'Calle Sur 2',
    });
  });

  it('resets the temporary choice when the form is cancelled or reopened', () => {
    const { result } = renderHook(() => useClinicPatientsController());

    act(() => result.current.handleAdd());
    act(() => {
      result.current.handleChange('firstName', 'Lucía');
      result.current.handleChange('lastName', 'Martín');
    });
    act(() => result.current.handleToggleSameBillingData());
    expect(result.current.sameBillingData).toBe(true);

    act(() => result.current.handleCancelForm());
    expect(result.current.sameBillingData).toBe(false);

    act(() => result.current.handleAdd());
    expect(result.current.sameBillingData).toBe(false);
    expect(result.current.form.billingFullName).toBe('');
  });

  it('submits copied billing data on create and resets the temporary choice after saving', async () => {
    enableManagedClinic();
    const { result } = renderHook(() => useClinicPatientsController());

    act(() => result.current.handleAdd());
    act(() => {
      result.current.handleChange('firstName', 'Lucía');
      result.current.handleChange('lastName', 'Martín García');
      result.current.handleChange('email', 'lucia@example.com');
      result.current.handleChange('billingTaxId', 'B12345678');
      result.current.handleChange('billingAddress', 'Calle Sur 2');
    });
    act(() => result.current.handleToggleSameBillingData());

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockedCreateClinicPatient).toHaveBeenCalledWith('clinic-1', {
      firstName: 'Lucía',
      lastName: 'Martín García',
      email: 'lucia@example.com',
      phone: null,
      billingFullName: 'Lucía Martín García',
      billingTaxId: 'B12345678',
      billingAddress: 'Calle Sur 2',
      billingPostalCode: null,
      billingCity: null,
      billingCountry: 'España',
    });
    expect(result.current.sameBillingData).toBe(false);
    expect(result.current.panelMode).toBe('detail');
  });

  it('keeps independent billing data on create and restores it before editing', async () => {
    enableManagedClinic();
    mockedListClinicPatients
      .mockResolvedValueOnce({
        items: [],
        pageInfo: { page: 1, limit: 50, hasMore: false, nextPage: null },
      })
      .mockResolvedValue({
        items: [patientDetail],
        pageInfo: { page: 1, limit: 50, hasMore: false, nextPage: null },
      });
    const { result } = renderHook(() => useClinicPatientsController());

    act(() => result.current.handleAdd());
    act(() => {
      result.current.handleChange('firstName', 'Lucía');
      result.current.handleChange('lastName', 'Martín');
      result.current.handleChange('email', 'lucia@example.com');
      result.current.handleChange('billingFullName', 'Empresa Familiar SL');
    });
    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockedCreateClinicPatient).toHaveBeenCalledWith(
      'clinic-1',
      expect.objectContaining({ billingFullName: 'Empresa Familiar SL' }),
    );

    await act(async () => {
      await result.current.handleEdit('billing');
    });
    expect(result.current.sameBillingData).toBe(false);

    act(() => result.current.handleToggleSameBillingData());
    act(() => result.current.handleToggleSameBillingData());
    expect(result.current.form.billingFullName).toBe('Empresa Familiar SL');

    await act(async () => {
      await result.current.handleSubmit();
    });
    expect(mockedUpdateClinicPatient).toHaveBeenCalledWith(
      'clinic-1',
      'patient-1',
      expect.objectContaining({ billingFullName: 'Empresa Familiar SL' }),
    );
  });

  it('submits only the fields owned by each contextual editor', async () => {
    enableManagedClinic();
    mockedListClinicPatients.mockResolvedValue({
      items: [patientDetail],
      pageInfo: { page: 1, limit: 50, hasMore: false, nextPage: null },
    });
    const { result } = renderHook(() => useClinicPatientsController());

    act(() => result.current.handleAdd());
    act(() => {
      result.current.handleChange('firstName', 'Lucía');
      result.current.handleChange('lastName', 'Martín');
      result.current.handleChange('email', 'lucia@example.com');
    });
    await act(async () => {
      await result.current.handleSubmit();
    });
    mockedUpdateClinicPatient.mockClear();

    await act(async () => {
      await result.current.handleEdit('summary');
    });
    act(() => result.current.handleChange('phone', '+34 611 000 000'));
    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockedUpdateClinicPatient).toHaveBeenLastCalledWith('clinic-1', 'patient-1', {
      firstName: 'Lucía',
      lastName: 'Martín',
      email: 'lucia@example.com',
      phone: '+34 611 000 000',
    });

    await act(async () => {
      await result.current.handleEdit('billing');
    });
    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockedUpdateClinicPatient).toHaveBeenLastCalledWith('clinic-1', 'patient-1', {
      billingFullName: 'Empresa Familiar SL',
      billingTaxId: 'B12345678',
      billingAddress: 'Calle Sur 2',
      billingPostalCode: '28002',
      billingCity: 'Madrid',
      billingCountry: 'España',
    });
  });

  it('preserves the temporary copy state when its parent rerenders at another breakpoint', () => {
    const { result, rerender } = renderHook<{
      width: number;
      controller: ReturnType<typeof useClinicPatientsController>;
    }, { width: number }>(
      ({ width }) => ({ width, controller: useClinicPatientsController() }),
      { initialProps: { width: 1024 } },
    );

    act(() => result.current.controller.handleAdd());
    act(() => {
      result.current.controller.handleChange('firstName', 'Lucía');
      result.current.controller.handleChange('lastName', 'Martín');
    });
    act(() => result.current.controller.handleToggleSameBillingData());
    act(() => result.current.controller.handleSelectDetailTab('billing'));

    rerender({ width: 390 });

    expect(result.current.width).toBe(390);
    expect(result.current.controller.sameBillingData).toBe(true);
    expect(result.current.controller.form.billingFullName).toBe('Lucía Martín');
    expect(result.current.controller.activeDetailTab).toBe('billing');

    act(() => result.current.controller.handleSelectPatient('patient-2'));
    expect(result.current.controller.activeDetailTab).toBe('summary');
    expect(result.current.controller.editSection).toBeNull();
  });

  it('refreshes cached detail when reopening a patient and before contextual editing', async () => {
    enableManagedClinic();
    const patientSummary: clinicService.ClinicPatientSummary = {
      id: patientDetail.id,
      status: patientDetail.status,
      displayName: patientDetail.displayName,
      firstName: patientDetail.firstName,
      lastName: patientDetail.lastName,
      email: patientDetail.email,
      phone: patientDetail.phone,
      billingDataComplete: patientDetail.billingDataComplete,
      createdAt: patientDetail.createdAt,
      updatedAt: patientDetail.updatedAt,
      archivedAt: patientDetail.archivedAt,
      activeAssignment: patientDetail.activeAssignment,
    };
    mockedListClinicPatients.mockResolvedValue({
      items: [patientSummary],
      pageInfo: { page: 1, limit: 50, hasMore: false, nextPage: null },
    });
    const refreshedPatient = {
      ...patientDetail,
      billingFullName: 'Nombre fiscal actualizado externamente',
      nextSession: {
        id: 'session-next',
        date: '2099-08-20T10:00:00.000Z',
        duration: 50,
        type: 'VIDEO_CALL' as const,
        status: 'CONFIRMED' as const,
        clinicSpecialist: null,
      },
    };
    mockedGetClinicPatient.mockResolvedValue(refreshedPatient);
    const { result } = renderHook(() => useClinicPatientsController());

    await waitFor(() => {
      expect(result.current.selectedPatientId).toBe('patient-1');
      expect(mockedGetClinicPatient).toHaveBeenCalledWith('clinic-1', 'patient-1');
    });
    mockedGetClinicPatient.mockClear();

    act(() => result.current.handleSelectPatient('patient-1'));
    await waitFor(() => {
      expect(mockedGetClinicPatient).toHaveBeenCalledWith('clinic-1', 'patient-1');
      expect(result.current.selectedPatient?.nextSession?.id).toBe('session-next');
    });
    mockedGetClinicPatient.mockClear();

    await act(async () => {
      await result.current.handleEdit('billing');
    });

    expect(mockedGetClinicPatient).toHaveBeenCalledWith('clinic-1', 'patient-1');
    expect(result.current.form.billingFullName).toBe('Nombre fiscal actualizado externamente');
    expect(result.current.selectedPatient?.nextSession?.id).toBe('session-next');
  });

  it('recovers a failed detail request when retrying the same patient', async () => {
    enableManagedClinic();
    mockedListClinicPatients.mockResolvedValue({
      items: [patientDetail],
      pageInfo: { page: 1, limit: 50, hasMore: false, nextPage: null },
    });
    mockedGetClinicPatient.mockRejectedValueOnce(new Error('Detalle no disponible'));
    const { result } = renderHook(() => useClinicPatientsController());

    await waitFor(() => {
      expect(result.current.detailError).toBe('Detalle no disponible');
      expect(result.current.detailLoading).toBe(false);
    });

    mockedGetClinicPatient.mockResolvedValueOnce(patientDetail);
    act(() => result.current.handleRetryDetail());

    await waitFor(() => {
      expect(result.current.detailError).toBe('');
      expect(result.current.selectedPatient?.id).toBe('patient-1');
      expect(result.current.feedback).toBeNull();
    });
  });

  it('recovers an unavailable consent and refreshes it when opening its tab', async () => {
    enableManagedClinic();
    mockedListClinicPatients.mockResolvedValue({
      items: [patientDetail],
      pageInfo: { page: 1, limit: 50, hasMore: false, nextPage: null },
    });
    mockedGetClinicPatientConsent.mockRejectedValueOnce(
      new Error('Consentimiento no disponible'),
    );
    const { result } = renderHook(() => useClinicPatientsController());

    await waitFor(() => {
      expect(result.current.consentError).toBe('Consentimiento no disponible');
      expect(result.current.consentLoading).toBe(false);
      expect(result.current.selectedPatientConsent).toBeNull();
    });

    const grantedConsent: clinicService.ClinicPatientConsentDetail = {
      clinicPatientId: patientDetail.id,
      patientDisplayName: patientDetail.displayName,
      patientEmail: patientDetail.email,
      patientStatus: patientDetail.status,
      status: 'GRANTED',
      method: 'DIGITAL_SIGNATURE',
      requestedAt: '2026-08-13T09:00:00.000Z',
      grantedAt: '2026-08-13T09:05:00.000Z',
      version: 'v1',
      documents: [],
      events: [],
      activeRequest: null,
    };
    mockedGetClinicPatientConsent.mockResolvedValueOnce(grantedConsent);
    act(() => result.current.handleRetryConsent());

    await waitFor(() => {
      expect(result.current.consentError).toBe('');
      expect(result.current.selectedPatientConsent?.status).toBe('GRANTED');
    });

    mockedGetClinicPatientConsent.mockResolvedValueOnce({
      ...grantedConsent,
      status: 'REVOKED',
      grantedAt: null,
    });
    act(() => result.current.handleSelectDetailTab('consent'));

    await waitFor(() => {
      expect(result.current.activeDetailTab).toBe('consent');
      expect(result.current.selectedPatientConsent?.status).toBe('REVOKED');
      expect(mockedGetClinicPatientConsent).toHaveBeenCalledTimes(3);
    });
  });
});
