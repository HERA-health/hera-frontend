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
  createClinicSession: jest.fn(),
  getClinicPatient: jest.fn(),
  getClinicPatientConsent: jest.fn(),
  listClinicPatientAssignmentHistory: jest.fn(),
  listClinicPatients: jest.fn(),
  listClinicSessions: jest.fn(),
  listClinicSpecialists: jest.fn(),
  requestClinicPatientConsent: jest.fn(),
  updateClinicPatient: jest.fn(),
  updateClinicSessionStatus: jest.fn(),
  subscribeClinicSessionChanges: jest.fn(() => jest.fn()),
}));
jest.mock('../../useClinicWorkspace', () => ({
  useClinicWorkspace: jest.fn(),
}));

const mockedUseAppAlert = jest.mocked(useAppAlert);
const mockedUseAuth = jest.mocked(useAuth);
const mockedUseClinicWorkspace = jest.mocked(useClinicWorkspace);
const mockedCreateClinicPatient = jest.mocked(clinicService.createClinicPatient);
const mockedCreateClinicSession = jest.mocked(clinicService.createClinicSession);
const mockedGetClinicPatient = jest.mocked(clinicService.getClinicPatient);
const mockedGetClinicPatientConsent = jest.mocked(clinicService.getClinicPatientConsent);
const mockedListClinicPatientAssignmentHistory = jest.mocked(
  clinicService.listClinicPatientAssignmentHistory,
);
const mockedListClinicPatients = jest.mocked(clinicService.listClinicPatients);
const mockedListClinicSessions = jest.mocked(clinicService.listClinicSessions);
const mockedListClinicSpecialists = jest.mocked(clinicService.listClinicSpecialists);
const mockedRequestClinicPatientConsent = jest.mocked(clinicService.requestClinicPatientConsent);
const mockedUpdateClinicPatient = jest.mocked(clinicService.updateClinicPatient);
const mockedUpdateClinicSessionStatus = jest.mocked(clinicService.updateClinicSessionStatus);
const mockedSubscribeClinicSessionChanges = jest.mocked(clinicService.subscribeClinicSessionChanges);
let clinicSessionChangeListener: ((change: clinicService.ClinicSessionChange) => void) | null = null;

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

const clinicSession: clinicService.ClinicSessionSummary = {
  id: 'session-1',
  date: '2026-08-14T09:00:00.000Z',
  duration: 50,
  type: 'IN_PERSON',
  status: 'CONFIRMED',
  bookedPrice: 70,
  bookedCurrency: 'EUR',
  cancelledAt: null,
  createdAt: '2026-08-01T09:00:00.000Z',
  updatedAt: '2026-08-01T09:00:00.000Z',
  patient: {
    id: patientDetail.id,
    displayName: patientDetail.displayName,
    email: patientDetail.email,
    phone: patientDetail.phone,
    status: patientDetail.status,
  },
  specialist: {
    id: 'specialist-1',
    displayName: 'Dra. Ana Ruiz',
    professionalTitle: 'Psicóloga sanitaria',
    status: 'ACTIVE',
    linkedProfessionalName: 'Ana Ruiz',
  },
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
    clinicSessionChangeListener = null;
    mockedSubscribeClinicSessionChanges.mockImplementation((listener) => {
      clinicSessionChangeListener = listener;
      return () => {
        if (clinicSessionChangeListener === listener) clinicSessionChangeListener = null;
      };
    });
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
      pageInfo: { page: 1, limit: 5, hasMore: false, nextPage: null },
    });
    mockedGetClinicPatientConsent.mockResolvedValue({
      clinicPatientId: 'patient-1',
      patientDisplayName: 'Lucía Martín',
      patientEmail: 'lucia@example.com',
      patientStatus: 'ACTIVE',
      hasLinkedHeraAccount: true,
      digitalConsentChannel: 'HERA_ACCOUNT_EMAIL',
      guestConsentActionsEnabled: false,
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
    mockedCreateClinicSession.mockResolvedValue(clinicSession);
    mockedRequestClinicPatientConsent.mockResolvedValue({
      requestId: 'request-1',
      status: 'PENDING',
      expiresAt: '2026-08-20T10:00:00.000Z',
      createdAt: '2026-08-13T10:00:00.000Z',
    });
    mockedGetClinicPatient.mockResolvedValue(patientDetail);
    mockedUpdateClinicPatient.mockResolvedValue(patientDetail);
    mockedUpdateClinicSessionStatus.mockResolvedValue({
      ...clinicSession,
      status: 'COMPLETED',
    });
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
      hasLinkedHeraAccount: true,
      digitalConsentChannel: 'HERA_ACCOUNT_EMAIL',
      guestConsentActionsEnabled: false,
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

  it('does not open confirmation or call the backend when digital consent is unavailable', async () => {
    enableManagedClinic();
    mockedListClinicPatients.mockResolvedValue({
      items: [patientDetail],
      pageInfo: { page: 1, limit: 50, hasMore: false, nextPage: null },
    });
    mockedGetClinicPatientConsent.mockResolvedValue({
      clinicPatientId: patientDetail.id,
      patientDisplayName: patientDetail.displayName,
      patientEmail: patientDetail.email,
      patientStatus: patientDetail.status,
      hasLinkedHeraAccount: false,
      digitalConsentChannel: null,
      guestConsentActionsEnabled: false,
      status: 'PENDING',
      method: null,
      requestedAt: null,
      grantedAt: null,
      version: null,
      documents: [],
      events: [],
      activeRequest: null,
    });
    const confirm = jest.fn();
    mockedUseAppAlert.mockReturnValue({ confirm } as unknown as ReturnType<typeof useAppAlert>);
    const { result } = renderHook(() => useClinicPatientsController());

    await waitFor(() => {
      expect(result.current.selectedPatientConsent?.digitalConsentChannel).toBeNull();
    });

    await act(async () => {
      await result.current.handleRequestConsent();
    });

    expect(confirm).not.toHaveBeenCalled();
    expect(mockedRequestClinicPatientConsent).not.toHaveBeenCalled();
  });

  it('confirms the exact HERA account email channel before requesting digital consent', async () => {
    enableManagedClinic();
    mockedListClinicPatients.mockResolvedValue({
      items: [patientDetail],
      pageInfo: { page: 1, limit: 50, hasMore: false, nextPage: null },
    });
    const confirm = jest.fn().mockResolvedValue(true);
    mockedUseAppAlert.mockReturnValue({ confirm } as unknown as ReturnType<typeof useAppAlert>);
    const { result } = renderHook(() => useClinicPatientsController());

    await waitFor(() => {
      expect(result.current.selectedPatientConsent?.digitalConsentChannel)
        .toBe('HERA_ACCOUNT_EMAIL');
    });

    await act(async () => {
      await result.current.handleRequestConsent();
    });

    expect(confirm).toHaveBeenCalledWith({
      title: 'Enviar autorización por email',
      message: 'Enviaremos un enlace al email de la cuenta HERA vinculada. El paciente deberá iniciar sesión para revisar la autorización y decidir.',
      confirmLabel: 'Enviar por email',
    });
    expect(mockedRequestClinicPatientConsent).toHaveBeenCalledWith(
      'clinic-1',
      patientDetail.id,
    );
    expect(result.current.feedback).toEqual({
      type: 'success',
      text: 'Autorización enviada por email.',
    });
  });

  it('refreshes consent availability after the backend rejects a stale digital channel', async () => {
    enableManagedClinic();
    mockedListClinicPatients.mockResolvedValue({
      items: [patientDetail],
      pageInfo: { page: 1, limit: 50, hasMore: false, nextPage: null },
    });
    mockedGetClinicPatientConsent
      .mockResolvedValueOnce({
        clinicPatientId: patientDetail.id,
        patientDisplayName: patientDetail.displayName,
        patientEmail: patientDetail.email,
        patientStatus: patientDetail.status,
        hasLinkedHeraAccount: true,
        digitalConsentChannel: 'HERA_ACCOUNT_EMAIL',
        guestConsentActionsEnabled: false,
        status: 'PENDING',
        method: null,
        requestedAt: null,
        grantedAt: null,
        version: null,
        documents: [],
        events: [],
        activeRequest: null,
      })
      .mockResolvedValueOnce({
        clinicPatientId: patientDetail.id,
        patientDisplayName: patientDetail.displayName,
        patientEmail: patientDetail.email,
        patientStatus: patientDetail.status,
        hasLinkedHeraAccount: false,
        digitalConsentChannel: null,
        guestConsentActionsEnabled: false,
        status: 'PENDING',
        method: null,
        requestedAt: null,
        grantedAt: null,
        version: null,
        documents: [],
        events: [],
        activeRequest: null,
      });
    mockedRequestClinicPatientConsent.mockRejectedValueOnce(
      new Error('Este paciente necesita una cuenta HERA enlazada para usar el consentimiento digital.'),
    );
    const confirm = jest.fn().mockResolvedValue(true);
    mockedUseAppAlert.mockReturnValue({ confirm } as unknown as ReturnType<typeof useAppAlert>);
    const { result } = renderHook(() => useClinicPatientsController());

    await waitFor(() => {
      expect(result.current.selectedPatientConsent?.digitalConsentChannel)
        .toBe('HERA_ACCOUNT_EMAIL');
    });

    await act(async () => {
      await result.current.handleRequestConsent();
    });

    expect(mockedGetClinicPatientConsent).toHaveBeenCalledTimes(2);
    expect(result.current.selectedPatientConsent).toEqual(expect.objectContaining({
      hasLinkedHeraAccount: false,
      digitalConsentChannel: null,
    }));
    expect(result.current.feedback).toEqual({
      type: 'error',
      text: 'Este paciente necesita una cuenta HERA enlazada para usar el consentimiento digital.',
    });
  });

  it('keeps a successful request when only the authoritative refresh fails', async () => {
    enableManagedClinic();
    mockedListClinicPatients.mockResolvedValue({
      items: [patientDetail],
      pageInfo: { page: 1, limit: 50, hasMore: false, nextPage: null },
    });
    mockedGetClinicPatientConsent
      .mockResolvedValueOnce({
        clinicPatientId: patientDetail.id,
        patientDisplayName: patientDetail.displayName,
        patientEmail: patientDetail.email,
        patientStatus: patientDetail.status,
        hasLinkedHeraAccount: true,
        digitalConsentChannel: 'HERA_ACCOUNT_EMAIL',
        guestConsentActionsEnabled: false,
        status: 'PENDING',
        method: null,
        requestedAt: null,
        grantedAt: null,
        version: null,
        documents: [],
        events: [],
        activeRequest: null,
      })
      .mockRejectedValueOnce(new Error('No se pudo sincronizar el consentimiento'));
    const confirm = jest.fn().mockResolvedValue(true);
    mockedUseAppAlert.mockReturnValue({ confirm } as unknown as ReturnType<typeof useAppAlert>);
    const { result } = renderHook(() => useClinicPatientsController());

    await waitFor(() => {
      expect(result.current.selectedPatientConsent?.digitalConsentChannel)
        .toBe('HERA_ACCOUNT_EMAIL');
    });

    await act(async () => {
      await result.current.handleRequestConsent();
    });

    expect(mockedRequestClinicPatientConsent).toHaveBeenCalledWith(
      'clinic-1',
      patientDetail.id,
    );
    expect(result.current.feedback).toEqual({
      type: 'success',
      text: 'Autorización enviada por email.',
    });
    expect(result.current.consentError).toBe('No se pudo sincronizar el consentimiento');
  });

  it('does not let a stale consent action supersede the next patient load', async () => {
    enableManagedClinic();
    const secondPatient: clinicService.ClinicPatientDetail = {
      ...patientDetail,
      id: 'patient-2',
      displayName: 'Mario López',
      firstName: 'Mario',
      lastName: 'López',
      email: 'mario@example.com',
    };
    const firstConsent: clinicService.ClinicPatientConsentDetail = {
      clinicPatientId: patientDetail.id,
      patientDisplayName: patientDetail.displayName,
      patientEmail: patientDetail.email,
      patientStatus: patientDetail.status,
      hasLinkedHeraAccount: true,
      digitalConsentChannel: 'HERA_ACCOUNT_EMAIL',
      guestConsentActionsEnabled: false,
      status: 'PENDING',
      method: null,
      requestedAt: null,
      grantedAt: null,
      version: null,
      documents: [],
      events: [],
      activeRequest: null,
    };
    const secondConsent: clinicService.ClinicPatientConsentDetail = {
      ...firstConsent,
      clinicPatientId: secondPatient.id,
      patientDisplayName: secondPatient.displayName,
      patientEmail: secondPatient.email,
      hasLinkedHeraAccount: false,
      digitalConsentChannel: null,
    };
    mockedListClinicPatients.mockResolvedValue({
      items: [patientDetail, secondPatient],
      pageInfo: { page: 1, limit: 50, hasMore: false, nextPage: null },
    });
    mockedGetClinicPatient.mockImplementation(async (_clinicId, patientId) => (
      patientId === secondPatient.id ? secondPatient : patientDetail
    ));
    mockedGetClinicPatientConsent.mockImplementation(async (_clinicId, patientId) => (
      patientId === secondPatient.id ? secondConsent : firstConsent
    ));
    let rejectRequest: (error: Error) => void = () => undefined;
    mockedRequestClinicPatientConsent.mockImplementationOnce(() => new Promise((_, reject) => {
      rejectRequest = reject;
    }));
    const confirm = jest.fn().mockResolvedValue(true);
    mockedUseAppAlert.mockReturnValue({ confirm } as unknown as ReturnType<typeof useAppAlert>);
    const { result } = renderHook(() => useClinicPatientsController());

    await waitFor(() => {
      expect(result.current.selectedPatientConsent?.clinicPatientId).toBe(patientDetail.id);
    });

    let pendingRequest: Promise<void> = Promise.resolve();
    await act(async () => {
      pendingRequest = result.current.handleRequestConsent();
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(mockedRequestClinicPatientConsent).toHaveBeenCalledTimes(1);
    });

    act(() => result.current.handleSelectPatient(secondPatient.id));
    await waitFor(() => {
      expect(result.current.selectedPatientConsent?.clinicPatientId).toBe(secondPatient.id);
    });

    await act(async () => {
      rejectRequest(new Error('La cuenta HERA dejó de estar disponible'));
      await pendingRequest;
    });

    expect(result.current.selectedPatientId).toBe(secondPatient.id);
    expect(result.current.selectedPatientConsent).toEqual(secondConsent);
    expect(result.current.consentError).toBe('');
    expect(result.current.feedback).toBeNull();
    expect(mockedGetClinicPatientConsent).toHaveBeenCalledTimes(2);
  });

  it('reconciles a successful request after reloading the same patient', async () => {
    enableManagedClinic();
    const firstConsent: clinicService.ClinicPatientConsentDetail = {
      clinicPatientId: patientDetail.id,
      patientDisplayName: patientDetail.displayName,
      patientEmail: patientDetail.email,
      patientStatus: patientDetail.status,
      hasLinkedHeraAccount: true,
      digitalConsentChannel: 'HERA_ACCOUNT_EMAIL',
      guestConsentActionsEnabled: false,
      status: 'PENDING',
      method: null,
      requestedAt: null,
      grantedAt: null,
      version: null,
      documents: [],
      events: [],
      activeRequest: null,
    };
    const refreshedConsent: clinicService.ClinicPatientConsentDetail = {
      ...firstConsent,
      requestedAt: '2026-08-18T10:00:00.000Z',
      version: 'v1',
      activeRequest: {
        id: 'request-1',
        status: 'PENDING',
        expiresAt: '2026-08-25T10:00:00.000Z',
        createdAt: '2026-08-18T10:00:00.000Z',
        version: 'v1',
      },
    };
    mockedListClinicPatients.mockResolvedValue({
      items: [patientDetail],
      pageInfo: { page: 1, limit: 50, hasMore: false, nextPage: null },
    });
    mockedGetClinicPatientConsent
      .mockResolvedValueOnce(firstConsent)
      .mockResolvedValueOnce(firstConsent)
      .mockResolvedValueOnce(refreshedConsent);
    let resolveRequest: (result: clinicService.ClinicPatientConsentRequestResult) => void =
      () => undefined;
    mockedRequestClinicPatientConsent.mockImplementationOnce(() => (
      new Promise<clinicService.ClinicPatientConsentRequestResult>((resolve) => {
        resolveRequest = resolve;
      })
    ));
    const confirm = jest.fn().mockResolvedValue(true);
    mockedUseAppAlert.mockReturnValue({ confirm } as unknown as ReturnType<typeof useAppAlert>);
    const { result } = renderHook(() => useClinicPatientsController());

    await waitFor(() => {
      expect(result.current.selectedPatientConsent?.clinicPatientId).toBe(patientDetail.id);
    });

    let pendingRequest: Promise<void> = Promise.resolve();
    await act(async () => {
      pendingRequest = result.current.handleRequestConsent();
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(mockedRequestClinicPatientConsent).toHaveBeenCalledTimes(1);
    });

    act(() => result.current.handleSelectPatient(patientDetail.id));
    await waitFor(() => {
      expect(mockedGetClinicPatientConsent).toHaveBeenCalledTimes(2);
    });

    await act(async () => {
      resolveRequest({
        requestId: 'request-1',
        status: 'PENDING',
        expiresAt: '2026-08-25T10:00:00.000Z',
        createdAt: '2026-08-18T10:00:00.000Z',
      });
      await pendingRequest;
    });

    expect(mockedGetClinicPatientConsent).toHaveBeenCalledTimes(3);
    expect(result.current.selectedPatientConsent?.activeRequest?.id).toBe('request-1');
    expect(result.current.feedback).toEqual({
      type: 'success',
      text: 'Autorización enviada por email.',
    });
  });

  it('loads five patient sessions only when the appointments tab is opened', async () => {
    enableManagedClinic();
    mockedListClinicPatients.mockResolvedValue({
      items: [patientDetail],
      pageInfo: { page: 1, limit: 50, hasMore: false, nextPage: null },
    });
    const { result } = renderHook(() => useClinicPatientsController());

    await waitFor(() => {
      expect(result.current.selectedPatientId).toBe('patient-1');
      expect(result.current.detailLoading).toBe(false);
    });
    expect(mockedListClinicSessions).not.toHaveBeenCalled();

    act(() => result.current.handleSelectDetailTab('sessions'));

    await waitFor(() => {
      expect(mockedListClinicSessions).toHaveBeenCalledWith('clinic-1', expect.objectContaining({
        clinicPatientId: 'patient-1',
        page: 1,
        limit: 5,
      }));
    });

    act(() => result.current.handleSelectDetailTab('summary'));
    act(() => result.current.handleSelectDetailTab('sessions'));
    await waitFor(() => expect(result.current.patientSessionsLoading).toBe(false));
    expect(mockedListClinicSessions).toHaveBeenCalledTimes(1);
  });

  it('discards a pending session response after selecting another patient', async () => {
    enableManagedClinic();
    const secondPatient = {
      ...patientDetail,
      id: 'patient-2',
      displayName: 'Mario López',
      firstName: 'Mario',
      lastName: 'López',
      email: 'mario@example.com',
    };
    mockedListClinicPatients.mockResolvedValue({
      items: [patientDetail, secondPatient],
      pageInfo: { page: 1, limit: 50, hasMore: false, nextPage: null },
    });
    mockedGetClinicPatient.mockImplementation(async (_clinicId, patientId) => (
      patientId === secondPatient.id ? secondPatient : patientDetail
    ));

    let resolveSessions: (page: clinicService.ClinicSessionListPage) => void = () => undefined;
    mockedListClinicSessions.mockImplementationOnce(() => new Promise((resolve) => {
      resolveSessions = resolve;
    }));
    const { result } = renderHook(() => useClinicPatientsController());

    await waitFor(() => expect(result.current.selectedPatientId).toBe('patient-1'));
    act(() => result.current.handleSelectDetailTab('sessions'));
    await waitFor(() => expect(mockedListClinicSessions).toHaveBeenCalledTimes(1));

    act(() => result.current.handleSelectPatient('patient-2'));
    resolveSessions({
      items: [],
      pageInfo: { page: 1, limit: 5, hasMore: false, nextPage: null },
    });

    await waitFor(() => {
      expect(result.current.selectedPatientId).toBe('patient-2');
      expect(result.current.activeDetailTab).toBe('summary');
      expect(result.current.patientSessions).toEqual([]);
    });
  });

  it('reconciles an updated session without losing loaded pages or page info', async () => {
    enableManagedClinic();
    mockedListClinicPatients.mockResolvedValue({
      items: [patientDetail],
      pageInfo: { page: 1, limit: 50, hasMore: false, nextPage: null },
    });
    const secondSession: clinicService.ClinicSessionSummary = {
      ...clinicSession,
      id: 'session-2',
      date: '2026-08-13T09:00:00.000Z',
    };
    const completedSecondSession: clinicService.ClinicSessionSummary = {
      ...secondSession,
      status: 'COMPLETED',
    };
    mockedListClinicSessions
      .mockResolvedValueOnce({
        items: [clinicSession],
        pageInfo: { page: 1, limit: 5, hasMore: true, nextPage: 2 },
      })
      .mockResolvedValueOnce({
        items: [secondSession],
        pageInfo: { page: 2, limit: 5, hasMore: false, nextPage: null },
      })
      .mockResolvedValueOnce({
        items: [clinicSession],
        pageInfo: { page: 1, limit: 5, hasMore: true, nextPage: 2 },
      })
      .mockResolvedValueOnce({
        items: [completedSecondSession],
        pageInfo: { page: 2, limit: 5, hasMore: false, nextPage: null },
      });
    mockedUpdateClinicSessionStatus.mockImplementationOnce(async () => {
      clinicSessionChangeListener?.({
        clinicId: 'clinic-1',
        clinicPatientId: 'patient-1',
        clinicSpecialistId: 'specialist-1',
        sessionId: completedSecondSession.id,
        mutation: 'STATUS_UPDATED',
      });
      return completedSecondSession;
    });
    const { result } = renderHook(() => useClinicPatientsController());

    await waitFor(() => expect(result.current.selectedPatientId).toBe('patient-1'));
    act(() => result.current.handleSelectDetailTab('sessions'));
    await waitFor(() => {
      expect(mockedListClinicSessions).toHaveBeenCalledTimes(1);
      expect(result.current.patientSessionsPageInfo?.nextPage).toBe(2);
      expect(result.current.patientSessionsLoading).toBe(false);
    });
    act(() => result.current.handleLoadMorePatientSessions());
    await waitFor(() => {
      expect(mockedListClinicSessions).toHaveBeenCalledTimes(2);
      expect(result.current.patientSessions).toHaveLength(2);
      expect(result.current.patientSessionsLoadingMore).toBe(false);
    });
    expect(result.current.patientSessions.map((session) => session.id)).toEqual([
      'session-1',
      'session-2',
    ]);
    expect(result.current.patientSessionsPageInfo).toEqual({
      page: 2,
      limit: 5,
      hasMore: false,
      nextPage: null,
    });

    const detailRequestsBeforeUpdate = mockedGetClinicPatient.mock.calls.length;
    let updated = false;
    await act(async () => {
      updated = await result.current.handleUpdateSessionStatus(secondSession, 'COMPLETED');
    });

    expect(updated).toBe(true);
    expect(mockedUpdateClinicSessionStatus).toHaveBeenCalledWith(
      'clinic-1',
      'session-2',
      { status: 'COMPLETED' },
    );
    await waitFor(() => {
      expect(mockedGetClinicPatient).toHaveBeenCalledTimes(detailRequestsBeforeUpdate + 1);
      expect(mockedListClinicSessions).toHaveBeenCalledTimes(4);
      expect(result.current.patientSessions).toEqual([clinicSession, completedSecondSession]);
    });
    expect(result.current.patientSessionsPageInfo).toEqual({
      page: 2,
      limit: 5,
      hasMore: false,
      nextPage: null,
    });
  });

  it('releases a superseded patient-session load-more indicator', async () => {
    enableManagedClinic();
    mockedListClinicPatients.mockResolvedValue({
      items: [patientDetail],
      pageInfo: { page: 1, limit: 50, hasMore: false, nextPage: null },
    });
    let resolveLoadMore: ((value: clinicService.ClinicSessionListPage) => void) | null = null;
    const pendingLoadMore = new Promise<clinicService.ClinicSessionListPage>((resolve) => {
      resolveLoadMore = resolve;
    });
    mockedListClinicSessions
      .mockResolvedValueOnce({
        items: [clinicSession],
        pageInfo: { page: 1, limit: 5, hasMore: true, nextPage: 2 },
      })
      .mockReturnValueOnce(pendingLoadMore)
      .mockResolvedValueOnce({
        items: [clinicSession],
        pageInfo: { page: 1, limit: 5, hasMore: true, nextPage: 2 },
      });
    const { result } = renderHook(() => useClinicPatientsController());

    await waitFor(() => expect(result.current.selectedPatientId).toBe('patient-1'));
    act(() => result.current.handleSelectDetailTab('sessions'));
    await waitFor(() => expect(result.current.patientSessionsPageInfo?.nextPage).toBe(2));
    act(() => result.current.handleLoadMorePatientSessions());
    expect(result.current.patientSessionsLoadingMore).toBe(true);

    act(() => clinicSessionChangeListener?.({
      clinicId: 'clinic-1',
      clinicPatientId: 'patient-1',
      clinicSpecialistId: 'specialist-1',
      sessionId: clinicSession.id,
      mutation: 'STATUS_UPDATED',
    }));
    await waitFor(() => expect(result.current.patientSessionsLoadingMore).toBe(false));

    await act(async () => {
      resolveLoadMore?.({
        items: [],
        pageInfo: { page: 2, limit: 5, hasMore: false, nextPage: null },
      });
      await pendingLoadMore;
    });
    expect(result.current.patientSessionsLoadingMore).toBe(false);
    expect(result.current.patientSessions).toEqual([clinicSession]);
  });

  it('refreshes only the patient detail when the session list was never loaded', async () => {
    enableManagedClinic();
    mockedListClinicPatients.mockResolvedValue({
      items: [patientDetail],
      pageInfo: { page: 1, limit: 50, hasMore: false, nextPage: null },
    });
    const { result } = renderHook(() => useClinicPatientsController());

    await waitFor(() => expect(result.current.selectedPatientId).toBe('patient-1'));
    const detailRequestsBeforeUpdate = mockedGetClinicPatient.mock.calls.length;
    mockedUpdateClinicSessionStatus.mockImplementationOnce(async () => {
      const completedSession = { ...clinicSession, status: 'COMPLETED' as const };
      clinicSessionChangeListener?.({
        clinicId: 'clinic-1',
        clinicPatientId: 'patient-1',
        clinicSpecialistId: 'specialist-1',
        sessionId: completedSession.id,
        mutation: 'STATUS_UPDATED',
      });
      return completedSession;
    });

    let updated = false;
    await act(async () => {
      updated = await result.current.handleUpdateSessionStatus(clinicSession, 'COMPLETED');
    });

    expect(updated).toBe(true);
    expect(mockedListClinicSessions).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(mockedGetClinicPatient).toHaveBeenCalledTimes(detailRequestsBeforeUpdate + 1);
    });
    expect(result.current.patientSessions).toEqual([]);
    expect(result.current.patientSessionsPageInfo).toBeNull();
  });

  it('creates a session only for the active scheduler context and ignores stale success', async () => {
    enableManagedClinic();
    const assignedPatient: clinicService.ClinicPatientDetail = {
      ...patientDetail,
      activeAssignment: {
        id: 'assignment-1',
        clinicSpecialistId: 'specialist-1',
        clinicSpecialistDisplayName: 'Dra. Ana Ruiz',
        clinicSpecialistProfessionalTitle: 'Psicóloga sanitaria',
        clinicSpecialistStatus: 'ACTIVE',
        startedAt: '2026-08-01T08:00:00.000Z',
        reason: null,
      },
    };
    mockedListClinicPatients.mockResolvedValue({
      items: [assignedPatient],
      pageInfo: { page: 1, limit: 50, hasMore: false, nextPage: null },
    });
    mockedGetClinicPatient.mockResolvedValue(assignedPatient);
    const { result } = renderHook(() => useClinicPatientsController());

    await act(async () => {
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 0);
      });
    });
    await waitFor(() => {
      expect(result.current.selectedPatientId).toBe('patient-1');
      expect(result.current.selectedPatient?.activeAssignment).not.toBeNull();
      expect(result.current.patientsLoading).toBe(false);
      expect(result.current.detailLoading).toBe(false);
    });
    act(() => result.current.handleOpenSessionScheduler());
    expect({
      canManage: result.current.canManage,
      feedback: result.current.feedback,
      patient: result.current.selectedPatient,
      visible: result.current.sessionSchedulerVisible,
    }).toEqual(expect.objectContaining({
      canManage: true,
      feedback: null,
      visible: true,
    }));

    act(() => result.current.handlePatientSessionCreated({
      ...clinicSession,
      patient: { ...clinicSession.patient, id: 'patient-2' },
    }));
    expect(result.current.sessionSchedulerVisible).toBe(true);

    const payload: clinicService.CreateClinicSessionPayload = {
      clinicPatientId: 'patient-1',
      clinicSpecialistId: 'specialist-1',
      date: '2030-01-15T09:30:00.000Z',
      duration: 50,
      type: 'IN_PERSON',
    };
    let createdSession: clinicService.ClinicSessionSummary | null = null;
    await act(async () => {
      createdSession = await result.current.handleSubmitPatientSession(payload);
    });
    expect(mockedCreateClinicSession).toHaveBeenCalledWith('clinic-1', payload);

    act(() => result.current.handlePatientSessionCreated(createdSession as clinicService.ClinicSessionSummary));
    expect(result.current.sessionSchedulerVisible).toBe(false);
    expect(result.current.feedback).toEqual({
      type: 'success',
      text: 'Cita creada y ficha actualizada.',
    });
  });
});
