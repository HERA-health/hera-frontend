import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useAppAlert } from '../../../components/common/alert';
import * as clinicService from '../../../services/clinicService';
import { useClinicAgendaController } from '../useClinicAgendaController';
import { useClinicWorkspace } from '../useClinicWorkspace';

jest.mock('../../../components/common/alert', () => ({
  showAppAlert: jest.fn(),
  useAppAlert: jest.fn(),
}));
jest.mock('../../../services/clinicService', () => ({
  createClinicSession: jest.fn(),
  getClinicAgenda: jest.fn(),
  getClinicSessionDetail: jest.fn(),
  listClinicPatients: jest.fn(),
  listClinicSpecialists: jest.fn(),
  subscribeClinicSessionChanges: jest.fn(() => jest.fn()),
  updateClinicSessionStatus: jest.fn(),
}));
jest.mock('../useClinicWorkspace', () => ({
  useClinicWorkspace: jest.fn(),
}));

const mockedUseAppAlert = jest.mocked(useAppAlert);
const mockedUseClinicWorkspace = jest.mocked(useClinicWorkspace);
const mockedCreateClinicSession = jest.mocked(clinicService.createClinicSession);
const mockedGetClinicAgenda = jest.mocked(clinicService.getClinicAgenda);
const mockedListClinicPatients = jest.mocked(clinicService.listClinicPatients);
const mockedListClinicSpecialists = jest.mocked(clinicService.listClinicSpecialists);
const mockedSubscribeClinicSessionChanges = jest.mocked(clinicService.subscribeClinicSessionChanges);

let clinicSessionChangeListener: ((change: clinicService.ClinicSessionChange) => void) | null = null;

const pageInfo = (
  page: number,
  hasMore: boolean,
): clinicService.ClinicPatientListPageInfo => ({
  page,
  limit: 50,
  hasMore,
  nextPage: hasMore ? page + 1 : null,
});

const agendaItem = (id: string, status: clinicService.ClinicSessionStatus = 'CONFIRMED'):
clinicService.ClinicAgendaClinicSession => ({
  key: `clinic:${id}`,
  origin: 'CLINIC',
  readOnly: false,
  sessionId: id,
  date: '2030-01-15T09:30:00.000Z',
  duration: 50,
  type: 'IN_PERSON',
  status,
  patientName: `Paciente ${id}`,
  specialist: {
    id: 'specialist-1',
    displayName: 'Dra. Ana Ruiz',
    professionalTitle: 'Psicóloga sanitaria',
  },
});

const createdSession: clinicService.ClinicSessionSummary = {
  id: 'session-created',
  date: '2030-01-15T09:30:00.000Z',
  duration: 50,
  type: 'IN_PERSON',
  status: 'CONFIRMED',
  bookedPrice: null,
  bookedCurrency: null,
  cancelledAt: null,
  createdAt: '2026-08-16T09:00:00.000Z',
  updatedAt: '2026-08-16T09:00:00.000Z',
  patient: {
    id: 'patient-1',
    displayName: 'Lucía Martín',
    email: 'lucia@example.com',
    phone: null,
    status: 'ACTIVE',
  },
  specialist: {
    id: 'specialist-1',
    displayName: 'Dra. Ana Ruiz',
    professionalTitle: 'Psicóloga sanitaria',
    status: 'ACTIVE',
    linkedProfessionalName: 'Ana Ruiz',
  },
};

const assignedPatient: clinicService.ClinicPatientSummary = {
  id: 'patient-1',
  status: 'ACTIVE',
  displayName: 'Lucía Martín',
  firstName: 'Lucía',
  lastName: 'Martín',
  email: 'lucia@example.com',
  phone: null,
  billingDataComplete: false,
  createdAt: '2026-08-01T09:00:00.000Z',
  updatedAt: '2026-08-01T09:00:00.000Z',
  archivedAt: null,
  activeAssignment: {
    id: 'assignment-1',
    clinicSpecialistId: 'specialist-1',
    clinicSpecialistDisplayName: 'Dra. Ana Ruiz',
    clinicSpecialistProfessionalTitle: 'Psicóloga sanitaria',
    clinicSpecialistStatus: 'ACTIVE',
    reason: null,
    startedAt: '2026-08-01T09:00:00.000Z',
  },
};

const workspace = {
  memberships: [],
  selectedClinicId: 'clinic-1',
  selectedMembership: {
    id: 'membership-1',
    role: 'OWNER' as const,
    status: 'ACTIVE' as const,
    createdAt: '2026-08-13T08:00:00.000Z',
    updatedAt: '2026-08-13T08:00:00.000Z',
    clinic: {
      id: 'clinic-1',
      commercialName: 'Clínica HERA',
      legalName: null,
      status: 'ACTIVE' as const,
      createdAt: '2026-08-13T08:00:00.000Z',
      updatedAt: '2026-08-13T08:00:00.000Z',
    },
  },
  loading: false,
  error: '',
  reload: jest.fn(),
  selectClinic: jest.fn(),
};

describe('useClinicAgendaController', () => {
  beforeEach(() => {
    clinicSessionChangeListener = null;
    mockedUseAppAlert.mockReturnValue({
      confirm: jest.fn(),
    } as unknown as ReturnType<typeof useAppAlert>);
    mockedUseClinicWorkspace.mockReturnValue(workspace);
    mockedSubscribeClinicSessionChanges.mockImplementation((listener) => {
      clinicSessionChangeListener = listener;
      return () => {
        if (clinicSessionChangeListener === listener) clinicSessionChangeListener = null;
      };
    });
    mockedListClinicPatients.mockResolvedValue({
      items: [],
      pageInfo: { ...pageInfo(1, false), limit: 25 },
    });
    mockedListClinicSpecialists.mockResolvedValue([]);
    mockedGetClinicAgenda.mockResolvedValue({ items: [], pageInfo: pageInfo(1, false) });
    mockedCreateClinicSession.mockResolvedValue(createdSession);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('contains reference lookup errors, allows opening the scheduler and retries them', async () => {
    mockedListClinicPatients.mockRejectedValueOnce(new Error('Pacientes no disponibles'));
    mockedListClinicSpecialists.mockRejectedValueOnce(new Error('Equipo no disponible'));
    const { result } = renderHook(() => useClinicAgendaController());

    await waitFor(() => {
      expect(result.current.patientLookupError).toBe('Pacientes no disponibles');
      expect(result.current.specialistsError).toBe('Equipo no disponible');
    });

    act(() => result.current.handleOpenCreateModal());
    expect(result.current.modalVisible).toBe(true);

    mockedListClinicPatients.mockResolvedValueOnce({
      items: [],
      pageInfo: { ...pageInfo(1, false), limit: 25 },
    });
    mockedListClinicSpecialists.mockResolvedValueOnce([]);
    act(() => {
      result.current.handleRetryPatientLookup();
      result.current.handleRetrySpecialists();
    });

    await waitFor(() => {
      expect(result.current.patientLookupError).toBe('');
      expect(result.current.specialistsError).toBe('');
    });
  });

  it('ignores another clinic and refreshes every loaded page without dropping rows', async () => {
    const first = agendaItem('session-1');
    const second = agendaItem('session-2');
    const completedSecond = agendaItem('session-2', 'COMPLETED');
    mockedGetClinicAgenda
      .mockResolvedValueOnce({ items: [first], pageInfo: pageInfo(1, true) })
      .mockResolvedValueOnce({ items: [second], pageInfo: pageInfo(2, false) })
      .mockResolvedValueOnce({ items: [first], pageInfo: pageInfo(1, true) })
      .mockResolvedValueOnce({ items: [completedSecond], pageInfo: pageInfo(2, false) });
    const { result } = renderHook(() => useClinicAgendaController());

    await waitFor(() => expect(result.current.agendaPageInfo?.nextPage).toBe(2));
    act(() => result.current.handleLoadMoreSessions());
    await waitFor(() => expect(result.current.sessions).toEqual([first, second]));
    const requestsBeforeOtherClinic = mockedGetClinicAgenda.mock.calls.length;

    act(() => clinicSessionChangeListener?.({
      clinicId: 'clinic-2',
      clinicPatientId: 'patient-1',
      clinicSpecialistId: 'specialist-1',
      sessionId: 'session-2',
      mutation: 'STATUS_UPDATED',
    }));
    expect(mockedGetClinicAgenda).toHaveBeenCalledTimes(requestsBeforeOtherClinic);

    act(() => clinicSessionChangeListener?.({
      clinicId: 'clinic-1',
      clinicPatientId: 'patient-1',
      clinicSpecialistId: 'specialist-1',
      sessionId: 'session-2',
      mutation: 'STATUS_UPDATED',
    }));
    await waitFor(() => expect(result.current.sessions).toEqual([first, completedSecond]));
    expect(result.current.agendaPageInfo).toEqual(pageInfo(2, false));
  });

  it('keeps visible pages when a scoped refresh fails', async () => {
    const first = agendaItem('session-1');
    mockedGetClinicAgenda.mockResolvedValueOnce({ items: [first], pageInfo: pageInfo(1, false) });
    const { result } = renderHook(() => useClinicAgendaController());

    await waitFor(() => expect(result.current.sessions).toEqual([first]));
    mockedGetClinicAgenda.mockRejectedValueOnce(new Error('No se pudo sincronizar'));
    act(() => clinicSessionChangeListener?.({
      clinicId: 'clinic-1',
      clinicPatientId: 'patient-1',
      clinicSpecialistId: 'specialist-1',
      sessionId: 'session-1',
      mutation: 'STATUS_UPDATED',
    }));

    await waitFor(() => expect(result.current.agendaRefreshError).toBe('No se pudo sincronizar'));
    expect(result.current.sessions).toEqual([first]);
    expect(result.current.error).toBe('');
  });

  it('releases a superseded load-more indicator after a scoped refresh', async () => {
    const first = agendaItem('session-1');
    let resolveLoadMore: ((value: clinicService.ClinicAgenda) => void) | null = null;
    const pendingLoadMore = new Promise<clinicService.ClinicAgenda>((resolve) => {
      resolveLoadMore = resolve;
    });
    mockedGetClinicAgenda
      .mockResolvedValueOnce({ items: [first], pageInfo: pageInfo(1, true) })
      .mockReturnValueOnce(pendingLoadMore)
      .mockResolvedValueOnce({ items: [first], pageInfo: pageInfo(1, true) });
    const { result } = renderHook(() => useClinicAgendaController());

    await waitFor(() => expect(result.current.agendaPageInfo?.nextPage).toBe(2));
    act(() => result.current.handleLoadMoreSessions());
    expect(result.current.agendaLoadingMore).toBe(true);

    act(() => clinicSessionChangeListener?.({
      clinicId: 'clinic-1',
      clinicPatientId: 'patient-1',
      clinicSpecialistId: 'specialist-1',
      sessionId: 'session-1',
      mutation: 'STATUS_UPDATED',
    }));
    await waitFor(() => expect(result.current.agendaLoadingMore).toBe(false));

    await act(async () => {
      resolveLoadMore?.({ items: [], pageInfo: pageInfo(2, false) });
      await pendingLoadMore;
    });
    expect(result.current.agendaLoadingMore).toBe(false);
    expect(result.current.sessions).toEqual([first]);
  });

  it('invalidates stale pagination when a new patient search fails', async () => {
    mockedListClinicPatients.mockResolvedValueOnce({
      items: [assignedPatient],
      pageInfo: { ...pageInfo(1, true), limit: 25 },
    });
    const { result } = renderHook(() => useClinicAgendaController());

    await waitFor(() => expect(result.current.patientLookupPageInfo?.nextPage).toBe(2));
    mockedListClinicPatients.mockRejectedValueOnce(new Error('No se pudo buscar'));
    act(() => result.current.handlePatientLookupSearchChange('otra persona'));

    await waitFor(() => expect(result.current.patientLookupError).toBe('No se pudo buscar'));
    expect(result.current.patients).toEqual([assignedPatient]);
    expect(result.current.patientLookupPageInfo).toBeNull();

    const callsBeforeLoadMore = mockedListClinicPatients.mock.calls.length;
    act(() => result.current.handleLoadMorePatientOptions());
    expect(mockedListClinicPatients).toHaveBeenCalledTimes(callsBeforeLoadMore);
  });

  it('restores Agenda patient lookup state when the scheduler is cancelled', async () => {
    const originalPageInfo = { ...pageInfo(1, true), limit: 25 };
    mockedListClinicPatients.mockResolvedValueOnce({
      items: [assignedPatient],
      pageInfo: originalPageInfo,
    });
    const { result } = renderHook(() => useClinicAgendaController());

    await waitFor(() => expect(result.current.patients).toEqual([assignedPatient]));
    act(() => result.current.handleOpenCreateModal());
    mockedListClinicPatients.mockResolvedValueOnce({
      items: [],
      pageInfo: { ...pageInfo(1, false), limit: 25 },
    });
    act(() => result.current.handlePatientLookupSearchChange('sin coincidencias'));
    await waitFor(() => expect(result.current.patients).toEqual([]));

    act(() => result.current.handleCloseCreateModal());
    expect(result.current.patientLookupSearch).toBe('');
    expect(result.current.patients).toEqual([assignedPatient]);
    expect(result.current.patientLookupPageInfo).toEqual(originalPageInfo);
  });

  it('applies creation success only to the active clinic and payload context', async () => {
    const { result } = renderHook(() => useClinicAgendaController());
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.handleOpenCreateModal());

    const payload: clinicService.CreateClinicSessionPayload = {
      clinicPatientId: 'patient-1',
      clinicSpecialistId: 'specialist-1',
      date: createdSession.date,
      duration: createdSession.duration,
      type: createdSession.type,
    };
    await act(async () => {
      await result.current.handleSubmitSession(payload);
    });
    act(() => result.current.handleSessionCreated({
      ...createdSession,
      patient: { ...createdSession.patient, id: 'patient-2' },
    }));
    expect(result.current.modalVisible).toBe(true);

    act(() => result.current.handleSessionCreated(createdSession));
    expect(result.current.modalVisible).toBe(false);
  });
});
