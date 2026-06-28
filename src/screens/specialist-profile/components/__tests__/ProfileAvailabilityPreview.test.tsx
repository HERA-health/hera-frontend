import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { lightTheme } from '../../../../constants/theme';
import { useTheme } from '../../../../contexts/ThemeContext';
import * as sessionsService from '../../../../services/sessionsService';
import { getMadridDateKey } from '../../../../utils/madridTime';
import { ProfileAvailabilityPreview } from '../ProfileAvailabilityPreview';

jest.mock('../../../../contexts/ThemeContext', () => ({
  useTheme: jest.fn(),
}));

jest.mock('../../../../services/sessionsService', () => ({
  getAvailableSlots: jest.fn(),
}));

const mockedUseTheme = jest.mocked(useTheme);
const mockedSessionsService = jest.mocked(sessionsService);

describe('ProfileAvailabilityPreview', () => {
  beforeEach(() => {
    mockedUseTheme.mockReturnValue({
      theme: lightTheme,
      mode: 'light',
      isDark: false,
      setMode: jest.fn(),
    } as unknown as ReturnType<typeof useTheme>);
    mockedSessionsService.getAvailableSlots.mockResolvedValue([]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('loads public slots for the first visible day and selects an available slot', async () => {
    const availableSlot = { startTime: '10:00', endTime: '11:00', available: true };
    const onSlotSelect = jest.fn();
    mockedSessionsService.getAvailableSlots.mockResolvedValue([
      { startTime: '09:00', endTime: '10:00', available: false },
      availableSlot,
    ]);

    render(
      <ProfileAvailabilityPreview
        specialistId="specialist-1"
        nextAvailable="2099-06-25T10:00:00.000Z"
        onSlotSelect={onSlotSelect}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('10:00')).toBeTruthy();
    });

    expect(mockedSessionsService.getAvailableSlots).toHaveBeenCalledWith(
      'specialist-1',
      '2099-06-25'
    );
    expect(screen.queryByText('09:00')).toBeNull();

    fireEvent.press(screen.getByText('10:00'));
    expect(onSlotSelect).toHaveBeenCalledWith('2099-06-25', availableSlot);
  });

  it('starts from today in Madrid when nextAvailable points to a past date', async () => {
    const todayKey = getMadridDateKey();

    render(
      <ProfileAvailabilityPreview
        specialistId="specialist-1"
        nextAvailable="2000-01-01T10:00:00.000Z"
        onSlotSelect={jest.fn()}
      />
    );

    await waitFor(() => {
      expect(mockedSessionsService.getAvailableSlots).toHaveBeenCalledWith(
        'specialist-1',
        todayKey
      );
    });
  });

  it('shows an empty state when the selected day has no selectable slots', async () => {
    mockedSessionsService.getAvailableSlots.mockResolvedValue([
      { startTime: '09:00', endTime: '10:00', available: false },
    ]);

    render(
      <ProfileAvailabilityPreview
        specialistId="specialist-1"
        nextAvailable="2099-06-25T10:00:00.000Z"
        onSlotSelect={jest.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('No hay horas libres este día.')).toBeTruthy();
    });
  });

  it('shows an error state and retries the selected date', async () => {
    mockedSessionsService.getAvailableSlots.mockRejectedValueOnce(new Error('Network'));
    mockedSessionsService.getAvailableSlots.mockResolvedValueOnce([
      { startTime: '12:00', endTime: '13:00', available: true },
    ]);

    render(
      <ProfileAvailabilityPreview
        specialistId="specialist-1"
        nextAvailable="2099-06-25T10:00:00.000Z"
        onSlotSelect={jest.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('No pudimos cargar este día.')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('Reintentar'));

    await waitFor(() => {
      expect(screen.getByText('12:00')).toBeTruthy();
    });
  });
});
