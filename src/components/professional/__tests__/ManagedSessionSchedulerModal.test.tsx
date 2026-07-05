import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { lightTheme } from '../../../constants/theme';
import { useTheme } from '../../../contexts/ThemeContext';
import { ManagedSessionSchedulerModal } from '../ManagedSessionSchedulerModal';
import type { Client, CreateManagedClientSessionInput } from '../../../services/professionalService';

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: jest.fn(),
}));

jest.mock('../../../services/professionalService', () => ({
  isManagedSessionBufferConflictError: (error: unknown) => (
    error !== null
    && typeof error === 'object'
    && 'code' in error
    && error.code === 'BUFFER_CONFLICT_REQUIRES_OVERRIDE'
    && 'bufferMinutes' in error
    && typeof error.bufferMinutes === 'number'
  ),
}));

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

const pad = (value: number): string => String(value).padStart(2, '0');

const formatDateInput = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const formatTimeInput = (date: Date): string =>
  `${pad(date.getHours())}:${pad(date.getMinutes())}`;

describe('ManagedSessionSchedulerModal buffer override UX', () => {
  beforeEach(() => {
    const futureNow = new Date();
    futureNow.setDate(futureNow.getDate() + 1);
    futureNow.setHours(8, 0, 0, 0);

    jest.spyOn(Date, 'now').mockReturnValue(futureNow.getTime());
    mockedUseTheme.mockReturnValue({
      theme: lightTheme,
      mode: 'light',
      isDark: false,
      setMode: jest.fn(),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
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
    expect(screen.getByDisplayValue(formatDateInput(startsAt))).toBeTruthy();
    expect(screen.getByDisplayValue(formatTimeInput(startsAt))).toBeTruthy();
    expect(screen.getByDisplayValue('75')).toBeTruthy();

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

  it('shows the selected patient avatar when editing a session', () => {
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
  });

  it('uses modification copy when an edited session patient has no email', () => {
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
  });
});
