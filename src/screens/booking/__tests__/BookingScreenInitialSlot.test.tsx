import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { lightTheme } from '../../../constants/theme';
import { useAuth } from '../../../contexts/AuthContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { showAppAlert } from '../../../components/common/alert';
import * as sessionsService from '../../../services/sessionsService';
import * as specialistsService from '../../../services/specialistsService';
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

jest.mock('../../../services/specialistsService', () => ({
  getPublicSpecialistDetails: jest.fn(),
  mapPublicSpecialistToProfile: jest.fn(),
}));

jest.mock('../components', () => {
  const ReactMock = require('react') as typeof import('react');
  const { Pressable, Text } = require('react-native') as typeof import('react-native');

  const renderText = (value: string) => ReactMock.createElement(Text, null, value);

  return {
    BookingModalitySection: ({ disabled }: { disabled?: boolean }) =>
      renderText(disabled ? 'modality-disabled' : 'modality'),
    ProfessionalInfoColumn: ({ booking }: { booking: { selectedDate: string | null; selectedTime: string | null } }) =>
      renderText(`booking:${booking.selectedDate ?? 'none'}:${booking.selectedTime ?? 'none'}`),
    CompactCalendarColumn: ({
      selectedDate,
      onDateSelect,
      disabled,
    }: {
      selectedDate: string | null;
      onDateSelect: (date: string) => void;
      disabled?: boolean;
    }) => ReactMock.createElement(
      ReactMock.Fragment,
      null,
      renderText(`calendar:${selectedDate ?? 'none'}`),
      disabled ? renderText('calendar-disabled') : null,
      ReactMock.createElement(
        Pressable,
        { onPress: disabled ? undefined : () => onDateSelect('2026-06-26') },
        renderText('select-second-date')
      )
    ),
    TimeSlotsColumn: ({
      selectedTime,
      availableSlots,
      onTimeSelect,
      disabled,
    }: {
      selectedTime: string | null;
      availableSlots: Array<{ startTime: string; endTime: string; available?: boolean }>;
      onTimeSelect: (slot: { startTime: string; endTime: string; available?: boolean }) => void;
      disabled?: boolean;
    }) => ReactMock.createElement(
      ReactMock.Fragment,
      null,
      renderText(`slots:${selectedTime ?? 'none'}:${availableSlots.length}`),
      disabled ? renderText('slots-disabled') : null,
      availableSlots[0]
        ? ReactMock.createElement(
            Pressable,
            { onPress: disabled ? undefined : () => onTimeSelect(availableSlots[0]) },
            renderText('select-slot')
          )
        : null
    ),
    BookingLocationMap: () => renderText('booking-location-map'),
  };
});

const mockedUseTheme = jest.mocked(useTheme);
const mockedUseAuth = jest.mocked(useAuth);
const mockedSessionsService = jest.mocked(sessionsService);
const mockedSpecialistsService = jest.mocked(specialistsService);
const mockedShowAppAlert = jest.mocked(showAppAlert);

const route = {
  params: {
    specialistId: 'specialist-1',
    initialDate: '2026-06-25',
    initialSlotStartTime: '10:00',
    initialSlotEndTime: '11:00',
  },
};

const navigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
};

const routeWithoutInitialSlot = {
  params: {
    ...route.params,
    initialDate: undefined,
    initialSlotStartTime: undefined,
    initialSlotEndTime: undefined,
  },
};

describe('BookingScreen initial slot preselection', () => {
  beforeEach(() => {
    mockedSpecialistsService.getPublicSpecialistDetails.mockResolvedValue({
      id: 'specialist-1',
    } as never);
    mockedSpecialistsService.mapPublicSpecialistToProfile.mockReturnValue({
      id: 'specialist-1',
      name: 'Dra. Prueba',
      title: 'Psicóloga sanitaria',
      avatar: undefined,
      bio: '',
      rating: 0,
      reviewCount: 0,
      pricePerSession: 80,
      specializations: ['Ansiedad'],
      slotDuration: 60,
      sessionTypes: [],
      offersOnline: true,
      offersInPerson: false,
    });
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
    mockedSessionsService.getPublicBookingQuote.mockResolvedValue({
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
      expect(screen.getByText('slots:10:00:2')).toBeTruthy();
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
      expect(screen.getByText('slots:none:2')).toBeTruthy();
    });

    expect(mockedShowAppAlert).toHaveBeenCalledWith(
      expect.anything(),
      'Horario no disponible',
      'Ese horario acaba de dejar de estar disponible. Elige otra hora para continuar.'
    );
  });

  it('submits at most once while the current booking request is in flight', async () => {
    mockedSessionsService.getAvailableSlots.mockResolvedValue([
      { startTime: '10:00', endTime: '11:00', available: true },
    ]);
    mockedSessionsService.createSession.mockImplementation(
      () => new Promise(() => undefined),
    );

    render(
      <BookingScreen
        route={route}
        navigation={navigation}
      />
    );

    await screen.findByText('slots:10:00:1');
    const confirmButton = await screen.findByText('Confirmar cita');

    fireEvent.press(confirmButton);
    fireEvent.press(confirmButton);

    await waitFor(() => {
      expect(mockedSessionsService.createSession).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByText('modality-disabled')).toBeTruthy();
    expect(screen.getByText('calendar-disabled')).toBeTruthy();
    expect(screen.getByText('slots-disabled')).toBeTruthy();
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

    fireEvent.press(await screen.findByText('select-second-date'));
    resolveSecondRequest([
      { startTime: '12:00', endTime: '13:00', available: true },
    ]);

    await waitFor(() => {
      expect(screen.getByText('calendar:2026-06-26')).toBeTruthy();
      expect(screen.getByText('slots:none:1')).toBeTruthy();
    });

    resolveFirstRequest([
      { startTime: '10:00', endTime: '11:00', available: true },
      { startTime: '15:00', endTime: '16:00', available: true },
    ]);

    await waitFor(() => {
      expect(screen.getByText('calendar:2026-06-26')).toBeTruthy();
      expect(screen.getByText('slots:none:1')).toBeTruthy();
    });
    expect(mockedShowAppAlert).not.toHaveBeenCalledWith(
      expect.anything(),
      'Horario no disponible',
      expect.any(String)
    );
  });

  it('reveals anonymous contact data only after a valid time is selected', async () => {
    mockedUseAuth.mockReturnValue({
      isAuthenticated: false,
      user: null,
    } as unknown as ReturnType<typeof useAuth>);
    mockedSessionsService.getAvailableSlots.mockResolvedValue([
      { startTime: '12:00', endTime: '13:00', available: true },
    ]);

    render(
      <BookingScreen
        route={routeWithoutInitialSlot}
        navigation={navigation}
      />
    );

    expect(screen.queryByText('Tus datos de contacto')).toBeNull();

    fireEvent.press(await screen.findByText('select-second-date'));
    await screen.findByText('select-slot');
    fireEvent.press(screen.getByText('select-slot'));

    expect(await screen.findByText('Tus datos de contacto')).toBeTruthy();
    expect(screen.getByText('Completar mis datos')).toBeTruthy();

    fireEvent.press(screen.getByText('Completar mis datos'));

    expect(await screen.findByText('Introduce tu nombre')).toBeTruthy();
    expect(screen.getByText('Introduce tus apellidos')).toBeTruthy();
    expect(screen.getByText('Introduce un email válido')).toBeTruthy();
    expect(
      screen.getByText('Acepta la política de privacidad para solicitar la cita')
    ).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Consultar la política de privacidad'));
    expect(navigation.navigate).toHaveBeenCalledWith('LegalDocument', {
      documentKey: 'PRIVACY_POLICY',
    });

    fireEvent.changeText(screen.getByLabelText('Nombre'), 'María');
    fireEvent.changeText(screen.getByLabelText('Apellidos'), 'García');
    fireEvent.changeText(screen.getByLabelText('Correo electrónico'), 'maria@example.com');
    fireEvent.press(screen.getByLabelText('Autorizar el uso de datos para gestionar la cita'));

    expect(await screen.findByText('Confirmar cita')).toBeTruthy();
  });

  it('keeps anonymous contact values when the patient changes the appointment', async () => {
    mockedUseAuth.mockReturnValue({
      isAuthenticated: false,
      user: null,
    } as unknown as ReturnType<typeof useAuth>);
    mockedSessionsService.getAvailableSlots.mockResolvedValue([
      { startTime: '12:00', endTime: '13:00', available: true },
    ]);

    render(
      <BookingScreen
        route={routeWithoutInitialSlot}
        navigation={navigation}
      />
    );

    fireEvent.press(await screen.findByText('select-second-date'));
    await screen.findByText('select-slot');
    fireEvent.press(screen.getByText('select-slot'));

    const firstNameInput = await screen.findByLabelText('Nombre');
    fireEvent.changeText(firstNameInput, 'María');

    fireEvent.press(screen.getByText('select-second-date'));
    await waitFor(() => {
      expect(screen.queryByText('Tus datos de contacto')).toBeNull();
    });

    fireEvent.press(screen.getByText('select-slot'));
    expect(await screen.findByDisplayValue('María')).toBeTruthy();
  });

  it('renders anonymous booking success inside a scrollable surface', async () => {
    mockedUseAuth.mockReturnValue({
      isAuthenticated: false,
      user: null,
    } as unknown as ReturnType<typeof useAuth>);
    mockedSessionsService.getAvailableSlots.mockResolvedValue([
      { startTime: '10:00', endTime: '11:00', available: true },
    ]);
    mockedSessionsService.createPublicSession.mockResolvedValue({
      status: 'PENDING',
    } as never);

    render(
      <BookingScreen
        route={route}
        navigation={navigation}
      />
    );

    await screen.findByText('Tus datos de contacto');
    fireEvent.changeText(screen.getByLabelText('Nombre'), 'María');
    fireEvent.changeText(screen.getByLabelText('Apellidos'), 'García');
    fireEvent.changeText(screen.getByLabelText('Correo electrónico'), 'maria@example.com');
    fireEvent.press(screen.getByLabelText('Autorizar el uso de datos para gestionar la cita'));
    fireEvent.press(await screen.findByText('Confirmar cita'));

    expect(await screen.findByText('Solicitud enviada')).toBeTruthy();
    expect(screen.getByTestId('booking-success-scroll')).toBeTruthy();
  });

  it('blocks booking from an authenticated non-patient account with a clear notice', async () => {
    mockedUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: {
        id: 'professional-1',
        name: 'Profesional',
        email: 'profesional@example.com',
        type: 'professional',
      },
    } as unknown as ReturnType<typeof useAuth>);

    render(
      <BookingScreen
        route={routeWithoutInitialSlot}
        navigation={navigation}
      />
    );

    expect(await screen.findByText('Esta cuenta no puede reservar citas.')).toBeTruthy();
    expect(screen.queryByText('Tus datos de contacto')).toBeNull();
  });

  it('renders the consultation map in the mobile flow for an in-person profile', async () => {
    mockedSpecialistsService.mapPublicSpecialistToProfile.mockReturnValue({
      id: 'specialist-1',
      name: 'Dra. Prueba',
      title: 'Psicóloga sanitaria',
      avatar: undefined,
      bio: '',
      rating: 0,
      reviewCount: 0,
      pricePerSession: 80,
      specializations: ['Ansiedad'],
      slotDuration: 60,
      sessionTypes: [],
      offersOnline: false,
      offersInPerson: true,
      address: {
        street: 'Calle Prueba, 1',
        city: 'Madrid',
        postalCode: '28001',
        latitude: 40.4168,
        longitude: -3.7038,
      },
    });

    render(
      <BookingScreen
        route={routeWithoutInitialSlot}
        navigation={navigation}
      />
    );

    expect(await screen.findByText('booking-location-map')).toBeTruthy();
  });
});
