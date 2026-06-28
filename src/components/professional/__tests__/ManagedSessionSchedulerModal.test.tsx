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
  },
};

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
});
