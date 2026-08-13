import { act, renderHook } from '@testing-library/react-native';
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
      await result.current.handleEdit();
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

    rerender({ width: 390 });

    expect(result.current.width).toBe(390);
    expect(result.current.controller.sameBillingData).toBe(true);
    expect(result.current.controller.form.billingFullName).toBe('Lucía Martín');
  });
});
