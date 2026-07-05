import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { lightTheme } from '../../../constants/theme';
import { useAuth } from '../../../contexts/AuthContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { showAppAlert } from '../../../components/common/alert';
import * as sessionsService from '../../../services/sessionsService';
import { BookingScreen } from '../BookingScreen';

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: jest.fn(),
}));

jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../../components/common/alert', () => ({
  showAppAlert: jest.fn(),
  useAppAlert: jest.fn(() => ({ showAlert: jest.fn() })),
}));

jest.mock('../../../services/sessionsService', () => ({
  getAvailableSlots: jest.fn(),
  getBookingQuote: jest.fn(),
  getPublicBookingQuote: jest.fn(),
  createSession: jest.fn(),
  createPublicSession: jest.fn(),
}));

jest.mock('../components', () => {
  const ReactMock = require('react') as typeof import('react');
  const { Pressable, Text } = require('react-native') as typeof import('react-native');

  const renderText = (value: string) => ReactMock.createElement(Text, null, value);

  return {
    ProfessionalInfoColumn: ({ booking }: { booking: { selectedDate: string | null; selectedTime: string | null } }) =>
      renderText(`booking:${booking.selectedDate ?? 'none'}:${booking.selectedTime ?? 'none'}`),
    CompactCalendarColumn: ({
      selectedDate,
      onDateSelect,
    }: {
      selectedDate: string | null;
      onDateSelect: (date: string) => void;
    }) => ReactMock.createElement(
      ReactMock.Fragment,
      null,
      renderText(`calendar:${selectedDate ?? 'none'}`),
      ReactMock.createElement(
        Pressable,
        { onPress: () => onDateSelect('2026-06-26') },
        renderText('select-second-date')
      )
    ),
    TimeSlotsColumn: ({
      selectedTime,
      availableSlots,
    }: {
      selectedTime: string | null;
      availableSlots: Array<{ startTime: string; endTime: string; available?: boolean }>;
    }) => renderText(`slots:${selectedTime ?? 'none'}:${availableSlots.length}`),
  };
});

const mockedUseTheme = jest.mocked(useTheme);
const mockedUseAuth = jest.mocked(useAuth);
const mockedSessionsService = jest.mocked(sessionsService);
const mockedShowAppAlert = jest.mocked(showAppAlert);

const route = {
  params: {
    specialistId: 'specialist-1',
    specialistName: 'Dra. Prueba',
    pricePerSession: 80,
    title: 'Psicóloga sanitaria',
    specializations: ['Ansiedad'],
    slotDuration: 60,
    offersOnline: true,
    offersInPerson: false,
    initialDate: '2026-06-25',
    initialSlotStartTime: '10:00',
    initialSlotEndTime: '11:00',
  },
};

const navigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
};

describe('BookingScreen initial slot preselection', () => {
  beforeEach(() => {
    mockedUseTheme.mockReturnValue({
      theme: lightTheme,
      mode: 'light',
      isDark: false,
      setMode: jest.fn(),
    } as unknown as ReturnType<typeof useTheme>);
    mockedUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: {
        id: 'client-user-1',
        name: 'Paciente',
        email: 'paciente@example.com',
        type: 'client',
      },
    } as unknown as ReturnType<typeof useAuth>);
    mockedSessionsService.getBookingQuote.mockResolvedValue({
      specialistId: 'specialist-1',
      duration: 60,
      currency: 'EUR',
      price: 80,
      basePrice: 80,
      tariffId: null,
      tariffName: null,
      baseTariffName: null,
      firstVisitFreeApplied: false,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('preselects the initial slot only after it is revalidated as available', async () => {
    mockedSessionsService.getAvailableSlots.mockResolvedValue([
      { startTime: '10:00', endTime: '11:00', available: true },
      { startTime: '12:00', endTime: '13:00', available: true },
    ]);

    render(
      <BookingScreen
        route={route}
        navigation={navigation}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('booking:2026-06-25:10:00')).toBeTruthy();
    });

    expect(mockedSessionsService.getAvailableSlots).toHaveBeenCalledWith(
      'specialist-1',
      '2026-06-25'
    );
    expect(mockedShowAppAlert).not.toHaveBeenCalledWith(
      expect.anything(),
      'Horario no disponible',
      expect.any(String)
    );
  });

  it('keeps the date but clears the initial slot when it is no longer available', async () => {
    mockedSessionsService.getAvailableSlots.mockResolvedValue([
      { startTime: '10:00', endTime: '11:00', available: false },
      { startTime: '12:00', endTime: '13:00', available: true },
    ]);

    render(
      <BookingScreen
        route={route}
        navigation={navigation}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('booking:2026-06-25:none')).toBeTruthy();
    });

    expect(mockedShowAppAlert).toHaveBeenCalledWith(
      expect.anything(),
      'Horario no disponible',
      'Ese horario acaba de dejar de estar disponible. Elige otra hora para continuar.'
    );
  });

  it('ignores stale slot responses after the patient selects another date', async () => {
    let resolveFirstRequest: (
      slots: Array<{ startTime: string; endTime: string; available?: boolean }>
    ) => void = () => undefined;
    let resolveSecondRequest: (
      slots: Array<{ startTime: string; endTime: string; available?: boolean }>
    ) => void = () => undefined;

    const firstRequest = new Promise<Array<{ startTime: string; endTime: string; available?: boolean }>>((resolve) => {
      resolveFirstRequest = resolve;
    });
    const secondRequest = new Promise<Array<{ startTime: string; endTime: string; available?: boolean }>>((resolve) => {
      resolveSecondRequest = resolve;
    });

    mockedSessionsService.getAvailableSlots
      .mockReturnValueOnce(firstRequest)
      .mockReturnValueOnce(secondRequest);

    render(
      <BookingScreen
        route={route}
        navigation={navigation}
      />
    );

    fireEvent.press(screen.getByText('select-second-date'));
    resolveSecondRequest([
      { startTime: '12:00', endTime: '13:00', available: true },
    ]);

    await waitFor(() => {
      expect(screen.getByText('booking:2026-06-26:none')).toBeTruthy();
      expect(screen.getByText('slots:none:1')).toBeTruthy();
    });

    resolveFirstRequest([
      { startTime: '10:00', endTime: '11:00', available: true },
      { startTime: '15:00', endTime: '16:00', available: true },
    ]);

    await waitFor(() => {
      expect(screen.getByText('booking:2026-06-26:none')).toBeTruthy();
      expect(screen.getByText('slots:none:1')).toBeTruthy();
    });
    expect(mockedShowAppAlert).not.toHaveBeenCalledWith(
      expect.anything(),
      'Horario no disponible',
      expect.any(String)
    );
  });
});
