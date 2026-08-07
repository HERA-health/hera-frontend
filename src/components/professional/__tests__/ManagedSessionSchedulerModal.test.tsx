import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { lightTheme } from '../../../constants/theme';
import { useTheme } from '../../../contexts/ThemeContext';
import { ManagedSessionSchedulerModal } from '../ManagedSessionSchedulerModal';
import type {
  Client,
  CreateManagedClientSessionInput,
  ManagedSessionSlotOptionsResult,
} from '../../../services/professionalService';
import { parseMadridDateTime } from '../../../utils/madridTime';
import { MANAGED_SESSION_TIME_OPTIONS } from '../../../utils/managedSessionSchedulerOptions';

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: jest.fn(),
}));

const mockGetManagedSessionSlotOptions = jest.fn();

jest.mock('../../../services/professionalService', () => ({
  getManagedSessionSlotOptions: (input: unknown) => mockGetManagedSessionSlotOptions(input),
  isManagedSessionBufferConflictError: (error: unknown) => (
    error !== null
    && typeof error === 'object'
    && 'code' in error
    && error.code === 'BUFFER_CONFLICT_REQUIRES_OVERRIDE'
    && 'bufferMinutes' in error
    && typeof error.bufferMinutes === 'number'
  ),
}));

let mockCalendarDate = '2026-01-03';

jest.mock('react-native-calendars', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return {
    LocaleConfig: {
      locales: {},
      defaultLocale: 'es',
    },
    Calendar: ({ onDayPress }: { onDayPress?: (day: { dateString: string }) => void }) => (
      <Text
        testID="managed-session-calendar"
        onPress={() => onDayPress?.({ dateString: mockCalendarDate })}
      >
        calendar
      </Text>
    ),
  };
});

const mockedUseTheme = jest.mocked(useTheme);

const client: Client = {
  id: 'client-1',
  userId: null,
  source: 'MANAGED',
  firstName: 'Lucia',
  lastName: 'Gomez',
  email: 'lucia@example.com',
  phone: null,
  user: {
    id: null,
    email: 'lucia@example.com',
    name: 'Lucia Gomez',
    userType: 'CLIENT',
    avatar: 'https://cdn.hera.test/avatar-lucia.jpg',
  },
};

const secondClient: Client = {
  id: 'client-2',
  userId: null,
  source: 'MANAGED',
  firstName: 'Sara',
  lastName: 'Herrer',
  email: 'sara@example.com',
  phone: null,
  user: {
    id: null,
    email: 'sara@example.com',
    name: 'Sara Herrer',
    userType: 'CLIENT',
    avatar: null,
  },
};

const pad = (value: number): string => String(value).padStart(2, '0');

const formatDateInput = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const formatTimeInput = (date: Date): string =>
  `${pad(date.getHours())}:${pad(date.getMinutes())}`;

const buildAvailableSlotOptions = (): ManagedSessionSlotOptionsResult => ({
  date: mockCalendarDate,
  duration: 60,
  bufferMinutes: 15,
  slots: MANAGED_SESSION_TIME_OPTIONS.map((startTime) => ({
    startTime,
    endTime: startTime,
    status: 'AVAILABLE' as const,
    selectable: true,
  })),
});

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, resolve, reject };
}

describe('ManagedSessionSchedulerModal buffer override UX', () => {
  beforeEach(() => {
    const futureNow = new Date();
    futureNow.setDate(futureNow.getDate() + 1);
    futureNow.setHours(8, 0, 0, 0);
    const calendarDate = new Date(futureNow.getTime() + 3 * 24 * 60 * 60 * 1000);
    mockCalendarDate = formatDateInput(calendarDate);

    jest.spyOn(Date, 'now').mockReturnValue(futureNow.getTime());
    mockedUseTheme.mockReturnValue({
      theme: lightTheme,
      mode: 'light',
      isDark: false,
      setMode: jest.fn(),
    });
    mockGetManagedSessionSlotOptions.mockReset();
    mockGetManagedSessionSlotOptions.mockResolvedValue(buildAvailableSlotOptions());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('keeps patient options collapsed and overlays them only when requested', async () => {
    render(
      <ManagedSessionSchedulerModal
        visible
        clients={[client, secondClient]}
        onClose={jest.fn()}
        onSubmit={jest.fn(() => Promise.resolve())}
      />
    );

    await waitFor(() => {
      expect(mockGetManagedSessionSlotOptions).toHaveBeenCalled();
    });

    const selector = screen.getByTestId('managed-session-client-selector');
    expect(selector.props.accessibilityState.expanded).toBe(false);
    expect(screen.getByText('Selecciona un paciente')).toBeTruthy();
    expect(screen.getByText('Obligatorio para crear la cita')).toBeTruthy();
    expect(screen.getByText('Selecciona un paciente para indicar dónde se enviará el aviso de la cita.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Crear cita' }).props.accessibilityState.disabled).toBe(true);
    expect(screen.queryByPlaceholderText('Buscar por nombre o email')).toBeNull();
    expect(screen.queryByText('Sara Herrer')).toBeNull();
    expect(screen.getByText('Fecha')).toBeTruthy();

    fireEvent.press(selector);

    expect(screen.getByTestId('managed-session-client-selector').props.accessibilityState.expanded).toBe(true);
    expect(screen.getByPlaceholderText('Buscar por nombre o email')).toBeTruthy();
    expect(screen.getByText('Sara Herrer')).toBeTruthy();
    expect(screen.getByText('Fecha')).toBeTruthy();

    fireEvent.press(screen.getByText('Sara Herrer'));

    expect(screen.queryByPlaceholderText('Buscar por nombre o email')).toBeNull();
    expect(screen.getByText('sara@example.com')).toBeTruthy();
    expect(screen.getByText('Se enviará un aviso de la cita a sara@example.com.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Crear cita' }).props.accessibilityState.disabled).toBe(false);
  });

  it('closes the patient dropdown from another control or Escape and clears the search', async () => {
    render(
      <ManagedSessionSchedulerModal
        visible
        clients={[client, secondClient]}
        onClose={jest.fn()}
        onSubmit={jest.fn(() => Promise.resolve())}
      />
    );

    await waitFor(() => {
      expect(mockGetManagedSessionSlotOptions).toHaveBeenCalled();
    });

    fireEvent.press(screen.getByTestId('managed-session-client-selector'));
    fireEvent.changeText(screen.getByPlaceholderText('Buscar por nombre o email'), 'Sara');
    fireEvent.press(screen.getByLabelText('Seleccionar fecha'));
    expect(screen.queryByPlaceholderText('Buscar por nombre o email')).toBeNull();

    fireEvent.press(screen.getByTestId('managed-session-client-selector'));
    expect(screen.getByPlaceholderText('Buscar por nombre o email').props.value).toBe('');
    fireEvent(screen.getByPlaceholderText('Buscar por nombre o email'), 'keyPress', {
      nativeEvent: { key: 'Escape' },
    });
    expect(screen.queryByPlaceholderText('Buscar por nombre o email')).toBeNull();

    fireEvent.press(screen.getByTestId('managed-session-client-selector'));
    fireEvent.changeText(screen.getByPlaceholderText('Buscar por nombre o email'), 'Sara');
    fireEvent(screen.getByTestId('managed-session-modal-overlay'), 'touchStart');
    expect(screen.queryByPlaceholderText('Buscar por nombre o email')).toBeNull();

    fireEvent.press(screen.getByTestId('managed-session-client-selector'));
    expect(screen.getByPlaceholderText('Buscar por nombre o email').props.value).toBe('');
  });

  it('allows recovering when the requested initial patient is no longer available', async () => {
    render(
      <ManagedSessionSchedulerModal
        visible
        clients={[client, secondClient]}
        initialClientId="missing-client"
        onClose={jest.fn()}
        onSubmit={jest.fn(() => Promise.resolve())}
      />
    );

    await waitFor(() => {
      expect(mockGetManagedSessionSlotOptions).toHaveBeenCalled();
    });

    const createButton = screen.getByRole('button', { name: 'Crear cita' });
    expect(screen.getByTestId('managed-session-client-selector')).toBeTruthy();
    expect(screen.getByText('Selecciona un paciente')).toBeTruthy();
    expect(createButton.props.accessibilityState.disabled).toBe(true);

    fireEvent.press(screen.getByTestId('managed-session-client-selector'));
    fireEvent.press(screen.getByText('Sara Herrer'));

    expect(screen.getByText('sara@example.com')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Crear cita' }).props.accessibilityState.disabled).toBe(false);
  });

  it('preserves configured fields when saving rerenders with a fresh clients array', async () => {
    const onSubmit = jest.fn(() => Promise.resolve());
    const renderModal = (saving: boolean) => (
      <ManagedSessionSchedulerModal
        visible
        saving={saving}
        clients={[{ ...client, user: { ...client.user } }]}
        initialClientId="client-1"
        onClose={jest.fn()}
        onSubmit={onSubmit}
      />
    );
    const { rerender } = render(renderModal(false));

    await waitFor(() => {
      expect(mockGetManagedSessionSlotOptions).toHaveBeenCalled();
    });

    fireEvent.changeText(screen.getByTestId('managed-session-time-input'), '14:30');
    fireEvent.press(screen.getByTestId('managed-session-duration-option-90'));
    fireEvent.press(screen.getByText('Teléfono'));

    rerender(renderModal(true));
    expect(screen.getByDisplayValue('14:30')).toBeTruthy();

    rerender(renderModal(false));
    expect(screen.getByDisplayValue('14:30')).toBeTruthy();
    fireEvent.press(screen.getByText('Crear cita'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      clientId: 'client-1',
      duration: 90,
      type: 'PHONE_CALL',
    }));
  });

  it('hydrates a late initial patient without resetting fields already configured', async () => {
    const renderModal = (clients: Client[]) => (
      <ManagedSessionSchedulerModal
        visible
        clients={clients}
        initialClientId="client-1"
        onClose={jest.fn()}
        onSubmit={jest.fn(() => Promise.resolve())}
      />
    );
    const { rerender } = render(renderModal([]));

    await waitFor(() => {
      expect(mockGetManagedSessionSlotOptions).toHaveBeenCalled();
    });

    fireEvent.changeText(screen.getByTestId('managed-session-time-input'), '14:30');
    fireEvent.press(screen.getByTestId('managed-session-duration-option-90'));
    rerender(renderModal([{ ...client, user: { ...client.user } }]));

    await waitFor(() => expect(screen.getByText('lucia@example.com')).toBeTruthy());
    expect(screen.getByDisplayValue('14:30')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Crear cita' }).props.accessibilityState.disabled).toBe(false);
  });

  it('limits rendered patient results while searching across the complete collection', async () => {
    const manyClients: Client[] = Array.from({ length: 55 }, (_, index) => ({
      ...client,
      id: `client-${index + 1}`,
      firstName: `Paciente ${index + 1}`,
      lastName: '',
      email: `paciente${index + 1}@example.com`,
      user: {
        ...client.user,
        email: `paciente${index + 1}@example.com`,
        name: `Paciente ${index + 1}`,
      },
    }));

    render(
      <ManagedSessionSchedulerModal
        visible
        clients={manyClients}
        onClose={jest.fn()}
        onSubmit={jest.fn(() => Promise.resolve())}
      />
    );

    await waitFor(() => {
      expect(mockGetManagedSessionSlotOptions).toHaveBeenCalled();
    });

    fireEvent.press(screen.getByTestId('managed-session-client-selector'));
    expect(screen.queryByText('Paciente 55')).toBeNull();
    expect(screen.getByText('Hay 5 resultados más. Escribe para acotar la búsqueda.')).toBeTruthy();

    fireEvent.changeText(screen.getByPlaceholderText('Buscar por nombre o email'), 'paciente55@');
    expect(screen.getByText('Paciente 55')).toBeTruthy();
  });

  it('shows the buffer warning and resubmits with an explicit override', async () => {
    const submissions: CreateManagedClientSessionInput[] = [];
    const bufferError = Object.assign(new Error('buffer conflict'), {
      code: 'BUFFER_CONFLICT_REQUIRES_OVERRIDE' as const,
      bufferMinutes: 15,
    });
    const onSubmit = jest.fn((input: CreateManagedClientSessionInput) => {
      submissions.push(input);
      return submissions.length === 1
        ? Promise.reject(bufferError)
        : Promise.resolve();
    });

    render(
      <ManagedSessionSchedulerModal
        visible
        clients={[client]}
        initialClientId="client-1"
        onClose={jest.fn()}
        onSubmit={onSubmit}
      />
    );

    fireEvent.press(screen.getByText('Crear cita'));

    await waitFor(() => {
      expect(screen.getByText('Descanso entre sesiones')).toBeTruthy();
    });
    expect(screen.getByText('Esta cita no respeta el descanso de 15 min configurado entre sesiones.')).toBeTruthy();

    fireEvent.press(screen.getByText('Crear igualmente'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(2);
    });
    expect(submissions[1]).toMatchObject({
      clientId: 'client-1',
      duration: 60,
      type: 'VIDEO_CALL',
      overrideBuffer: true,
    });
  });

  it('preloads edit values and resubmits buffer override as a schedule update', async () => {
    const startsAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    startsAt.setHours(12, 30, 0, 0);

    const submissions: CreateManagedClientSessionInput[] = [];
    const bufferError = Object.assign(new Error('buffer conflict'), {
      code: 'BUFFER_CONFLICT_REQUIRES_OVERRIDE' as const,
      bufferMinutes: 10,
    });
    const onSubmit = jest.fn((input: CreateManagedClientSessionInput) => {
      submissions.push(input);
      return submissions.length === 1
        ? Promise.reject(bufferError)
        : Promise.resolve();
    });

    render(
      <ManagedSessionSchedulerModal
        visible
        mode="edit"
        clients={[client]}
        initialClientId="client-1"
        editingSessionId="session-1"
        initialValues={{
          clientId: 'client-1',
          date: startsAt.toISOString(),
          duration: 75,
          type: 'PHONE_CALL',
        }}
        onClose={jest.fn()}
        onSubmit={onSubmit}
      />
    );

    expect(screen.getByText('Modificar cita')).toBeTruthy();
    expect(screen.getByText(formatDateInput(startsAt))).toBeTruthy();
    expect(screen.getByDisplayValue(formatTimeInput(startsAt))).toBeTruthy();
    expect(screen.getByText('75 min')).toBeTruthy();
    await waitFor(() => {
      expect(mockGetManagedSessionSlotOptions).toHaveBeenCalledWith({
        date: formatDateInput(startsAt),
        duration: 75,
        sessionId: 'session-1',
      });
    });

    fireEvent.press(screen.getByText('Guardar cambios'));

    await waitFor(() => {
      expect(screen.getByText('Descanso entre sesiones')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('Guardar igualmente'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(2);
    });
    expect(submissions[1]).toMatchObject({
      clientId: 'client-1',
      duration: 75,
      type: 'PHONE_CALL',
      overrideBuffer: true,
    });
  });

  it('selects date, dropdown time and predefined duration while keeping time editable', async () => {
    const onSubmit = jest.fn(() => Promise.resolve());

    render(
      <ManagedSessionSchedulerModal
        visible
        clients={[client]}
        initialClientId="client-1"
        onClose={jest.fn()}
        onSubmit={onSubmit}
      />
    );

    expect(screen.queryByPlaceholderText('AAAA-MM-DD')).toBeNull();
    expect(screen.getByTestId('managed-session-time-input')).toBeTruthy();
    expect(screen.queryByPlaceholderText('Min')).toBeNull();

    fireEvent.press(screen.getByLabelText('Seleccionar fecha'));
    fireEvent.press(screen.getByTestId('managed-session-calendar'));
    fireEvent.press(screen.getByLabelText('Seleccionar hora'));
    fireEvent.press(screen.getByTestId('managed-session-time-option-14:30'));
    fireEvent.press(screen.getByTestId('managed-session-duration-option-90'));
    fireEvent.press(screen.getByText('Crear cita'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
    expect(onSubmit).toHaveBeenCalledWith({
      clientId: 'client-1',
      date: parseMadridDateTime(mockCalendarDate, '14:30')?.iso,
      duration: 90,
      type: 'VIDEO_CALL',
    });
  });

  it('allows typing a fixed available time without opening the selector', async () => {
    const onSubmit = jest.fn(() => Promise.resolve());

    render(
      <ManagedSessionSchedulerModal
        visible
        clients={[client]}
        initialClientId="client-1"
        onClose={jest.fn()}
        onSubmit={onSubmit}
      />
    );

    fireEvent.press(screen.getByLabelText('Seleccionar fecha'));
    fireEvent.press(screen.getByTestId('managed-session-calendar'));
    fireEvent.changeText(screen.getByTestId('managed-session-time-input'), '14:30');
    fireEvent.press(screen.getByText('Crear cita'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
    expect(onSubmit).toHaveBeenCalledWith({
      clientId: 'client-1',
      date: parseMadridDateTime(mockCalendarDate, '14:30')?.iso,
      duration: 60,
      type: 'VIDEO_CALL',
    });
  });

  it('moves create flow to the next available slot when the suggested time is occupied', async () => {
    const response = buildAvailableSlotOptions();
    response.slots = response.slots.map((slot) => (
      slot.startTime === '09:00'
        ? { ...slot, status: 'OCCUPIED' as const, selectable: false }
        : slot
    ));
    mockGetManagedSessionSlotOptions.mockResolvedValueOnce(response);

    render(
      <ManagedSessionSchedulerModal
        visible
        clients={[client]}
        initialClientId="client-1"
        onClose={jest.fn()}
        onSubmit={jest.fn(() => Promise.resolve())}
      />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('09:15')).toBeTruthy();
    });
  });

  it('disables occupied slots and keeps buffer slots selectable with a visible warning', async () => {
    const response = buildAvailableSlotOptions();
    response.slots = response.slots.map((slot) => {
      if (slot.startTime === '14:30') {
        return { ...slot, status: 'OCCUPIED' as const, selectable: false };
      }

      if (slot.startTime === '14:45') {
        return { ...slot, status: 'BUFFER_CONFLICT' as const, selectable: true };
      }

      return slot;
    });
    mockGetManagedSessionSlotOptions.mockResolvedValueOnce(response);

    render(
      <ManagedSessionSchedulerModal
        visible
        clients={[client]}
        initialClientId="client-1"
        onClose={jest.fn()}
        onSubmit={jest.fn(() => Promise.resolve())}
      />
    );

    fireEvent.press(screen.getByLabelText('Seleccionar hora'));

    await waitFor(() => {
      expect(screen.getByLabelText('Hora 14:30, ocupada')).toBeTruthy();
      expect(screen.getByLabelText('Hora 14:45, en descanso')).toBeTruthy();
    });
    expect(screen.getByText('Disponible')).toBeTruthy();
    expect(screen.getByText('No disponible')).toBeTruthy();
    expect(screen.getByText('Descanso')).toBeTruthy();

    expect(screen.getByLabelText('Hora 14:30, ocupada').props.accessibilityState.disabled).toBe(true);

    fireEvent.press(screen.getByLabelText('Hora 14:45, en descanso'));

    expect(screen.getByText('Este hueco pisa el descanso configurado entre sesiones.')).toBeTruthy();
  });

  it('shows a typed occupied slot as blocked without silently replacing it', async () => {
    const onSubmit = jest.fn(() => Promise.resolve());
    const response = buildAvailableSlotOptions();
    response.slots = response.slots.map((slot) => (
      slot.startTime === '14:30'
        ? { ...slot, status: 'OCCUPIED' as const, selectable: false }
        : slot
    ));
    mockGetManagedSessionSlotOptions.mockResolvedValueOnce(response);

    render(
      <ManagedSessionSchedulerModal
        visible
        clients={[client]}
        initialClientId="client-1"
        onClose={jest.fn()}
        onSubmit={onSubmit}
      />
    );

    fireEvent.press(screen.getByLabelText('Seleccionar hora'));
    await waitFor(() => {
      expect(screen.getByLabelText('Hora 14:30, ocupada')).toBeTruthy();
    });

    fireEvent.changeText(screen.getByTestId('managed-session-time-input'), '14:30');

    await waitFor(() => {
      expect(screen.getByDisplayValue('14:30')).toBeTruthy();
      expect(screen.getByText('Ese hueco ya está ocupado. Elige otra hora.')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('Crear cita'));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('clears stale occupied state immediately when duration reloads slot options', async () => {
    const startsAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    startsAt.setHours(12, 30, 0, 0);
    const firstResponse = buildAvailableSlotOptions();
    firstResponse.slots = firstResponse.slots.map((slot) => (
      slot.startTime === '12:30'
        ? { ...slot, status: 'OCCUPIED' as const, selectable: false }
        : slot
    ));
    const pendingResponse = createDeferred<ManagedSessionSlotOptionsResult>();
    mockGetManagedSessionSlotOptions
      .mockResolvedValueOnce(firstResponse)
      .mockReturnValueOnce(pendingResponse.promise);

    render(
      <ManagedSessionSchedulerModal
        visible
        mode="edit"
        clients={[client]}
        initialClientId="client-1"
        editingSessionId="session-1"
        initialValues={{
          clientId: 'client-1',
          date: startsAt.toISOString(),
          duration: 60,
          type: 'VIDEO_CALL',
        }}
        onClose={jest.fn()}
        onSubmit={jest.fn(() => Promise.resolve())}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Ese hueco ya está ocupado. Elige otra hora.')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('managed-session-duration-option-90'));

    await waitFor(() => {
      expect(mockGetManagedSessionSlotOptions).toHaveBeenLastCalledWith({
        date: formatDateInput(startsAt),
        duration: 90,
        sessionId: 'session-1',
      });
    });
    expect(screen.queryByText('Ese hueco ya está ocupado. Elige otra hora.')).toBeNull();

    await act(async () => {
      pendingResponse.resolve({ ...buildAvailableSlotOptions(), duration: 90 });
    });
  });

  it('ignores an older slot response that resolves after a newer duration request', async () => {
    const startsAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    startsAt.setHours(12, 30, 0, 0);
    const staleResponse = buildAvailableSlotOptions();
    staleResponse.slots = staleResponse.slots.map((slot) => (
      slot.startTime === '12:30'
        ? { ...slot, status: 'OCCUPIED' as const, selectable: false }
        : slot
    ));
    const firstRequest = createDeferred<ManagedSessionSlotOptionsResult>();
    mockGetManagedSessionSlotOptions
      .mockReturnValueOnce(firstRequest.promise)
      .mockResolvedValueOnce({ ...buildAvailableSlotOptions(), duration: 90 });

    render(
      <ManagedSessionSchedulerModal
        visible
        mode="edit"
        clients={[client]}
        initialClientId="client-1"
        editingSessionId="session-1"
        initialValues={{
          clientId: 'client-1',
          date: startsAt.toISOString(),
          duration: 60,
          type: 'VIDEO_CALL',
        }}
        onClose={jest.fn()}
        onSubmit={jest.fn(() => Promise.resolve())}
      />
    );

    await waitFor(() => {
      expect(mockGetManagedSessionSlotOptions).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('managed-session-duration-option-90'));
    });

    await waitFor(() => {
      expect(mockGetManagedSessionSlotOptions).toHaveBeenCalledTimes(2);
    });

    await act(async () => {
      firstRequest.resolve(staleResponse);
    });

    expect(screen.queryByText('Ese hueco ya está ocupado. Elige otra hora.')).toBeNull();
  });

  it('keeps backend submit protection available when slot lookup fails', async () => {
    const onSubmit = jest.fn(() => Promise.resolve());
    mockGetManagedSessionSlotOptions.mockRejectedValueOnce(new Error('network'));

    render(
      <ManagedSessionSchedulerModal
        visible
        clients={[client]}
        initialClientId="client-1"
        onClose={jest.fn()}
        onSubmit={onSubmit}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('No se pudieron comprobar huecos. Se validará al guardar.')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('Crear cita'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
  });

  it('shows non-standard edit values as invalid until a fixed option is selected', async () => {
    const startsAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    startsAt.setHours(12, 32, 0, 0);
    const onSubmit = jest.fn(() => Promise.resolve());

    render(
      <ManagedSessionSchedulerModal
        visible
        mode="edit"
        clients={[client]}
        initialClientId="client-1"
        initialValues={{
          clientId: 'client-1',
          date: startsAt.toISOString(),
          duration: 65,
          type: 'VIDEO_CALL',
        }}
        onClose={jest.fn()}
        onSubmit={onSubmit}
      />
    );

    expect(screen.getByDisplayValue('12:32')).toBeTruthy();
    expect(screen.getByText('65 min')).toBeTruthy();

    fireEvent.press(screen.getByText('Guardar cambios'));

    await waitFor(() => {
      expect(screen.getByText('Elige una franja horaria de la lista')).toBeTruthy();
      expect(screen.getByText('Elige una duración de la lista')).toBeTruthy();
    });
    expect(onSubmit).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.press(screen.getByTestId('managed-session-duration-option-60'));
    });

    expect(screen.queryByText('Elige una duración de la lista')).toBeNull();
  });

  it('does not silently move an edited session when its current slot is occupied', async () => {
    const startsAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    startsAt.setHours(12, 30, 0, 0);
    const response = buildAvailableSlotOptions();
    response.slots = response.slots.map((slot) => (
      slot.startTime === '12:30'
        ? { ...slot, status: 'OCCUPIED' as const, selectable: false }
        : slot
    ));
    mockGetManagedSessionSlotOptions.mockResolvedValueOnce(response);

    render(
      <ManagedSessionSchedulerModal
        visible
        mode="edit"
        clients={[client]}
        initialClientId="client-1"
        editingSessionId="session-1"
        initialValues={{
          clientId: 'client-1',
          date: startsAt.toISOString(),
          duration: 60,
          type: 'VIDEO_CALL',
        }}
        onClose={jest.fn()}
        onSubmit={jest.fn(() => Promise.resolve())}
      />
    );

    expect(screen.getByDisplayValue('12:30')).toBeTruthy();
    await waitFor(() => {
      expect(screen.getByText('Ese hueco ya está ocupado. Elige otra hora.')).toBeTruthy();
    });

    fireEvent.press(screen.getByLabelText('Seleccionar hora'));
    fireEvent.press(screen.getByTestId('managed-session-time-option-12:45'));

    expect(screen.queryByText('Ese hueco ya está ocupado. Elige otra hora.')).toBeNull();
    expect(screen.getByDisplayValue('12:45')).toBeTruthy();
  });

  it('shows the selected patient avatar when editing a session', async () => {
    const startsAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    startsAt.setHours(12, 30, 0, 0);

    render(
      <ManagedSessionSchedulerModal
        visible
        mode="edit"
        clients={[client]}
        initialClientId="client-1"
        initialValues={{
          clientId: 'client-1',
          date: startsAt.toISOString(),
          duration: 60,
          type: 'VIDEO_CALL',
        }}
        onClose={jest.fn()}
        onSubmit={jest.fn(() => Promise.resolve())}
      />
    );

    expect(screen.getByText('lucia@example.com')).toBeTruthy();
    expect(screen.getByText('Se enviará un aviso con los cambios a lucia@example.com.')).toBeTruthy();
    expect(screen.getByTestId('managed-session-selected-client-avatar').props.source).toEqual({
      uri: 'https://cdn.hera.test/avatar-lucia.jpg',
    });
    await waitFor(() => {
      expect(mockGetManagedSessionSlotOptions).toHaveBeenCalled();
    });
  });

  it('uses modification copy when an edited session patient has no email', async () => {
    const startsAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    startsAt.setHours(12, 30, 0, 0);
    const clientWithoutEmail: Client = {
      ...client,
      email: null,
      primaryEmail: null,
      user: {
        ...client.user,
        email: '',
      },
    };

    render(
      <ManagedSessionSchedulerModal
        visible
        mode="edit"
        clients={[clientWithoutEmail]}
        initialClientId="client-1"
        initialValues={{
          clientId: 'client-1',
          date: startsAt.toISOString(),
          duration: 60,
          type: 'VIDEO_CALL',
        }}
        onClose={jest.fn()}
        onSubmit={jest.fn(() => Promise.resolve())}
      />
    );

    expect(screen.getByText('Este paciente no tiene email. La cita se modificará sin aviso por correo.')).toBeTruthy();
    await waitFor(() => {
      expect(mockGetManagedSessionSlotOptions).toHaveBeenCalled();
    });
  });
});
