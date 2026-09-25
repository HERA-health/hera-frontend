import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';

import { lightTheme } from '../../../constants/theme';
import { useAuth } from '../../../contexts/AuthContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { showAppAlert } from '../../../components/common/alert';
import * as sessionsService from '../../../services/sessionsService';
import * as specialistsService from '../../../services/specialistsService';
import * as packageService from '../../../services/packageService';
import { BookingScreen } from '../BookingScreen';

jest.mock('../../../services/packageService', () => ({
  loadPatientPackages: jest.fn(), loadPublicPackages: jest.fn(), quotePackage: jest.fn(), acquirePackage: jest.fn(),
  requestPublicPackage: jest.fn(), quotePublicPackage: jest.fn(), acquirePublicPackage: jest.fn(),
  packagePrice: (cents: number) => `${cents / 100} EUR`, packageModality: () => 'Vídeo',
}));
jest.mock('expo-crypto', () => ({ randomUUID: () => 'package-test-command' }));
jest.mock('../../../services/professionalService', () => ({ getProfessionalClients: jest.fn().mockResolvedValue([]) }));

jest.mock('../../../services/privateCatalogService', () => ({
  loadPublicBookingOptions: jest.fn(async () => {
    const profile = require('../../../services/specialistsService').mapPublicSpecialistToProfile();
    return ['VIDEO_CALL','IN_PERSON'].filter(type => type === 'VIDEO_CALL' ? profile.offersOnline !== false : profile.offersInPerson === true).map(modality => ({id:modality,serviceId:'base',serviceKey:'base',serviceName:'General',modality,durationMinutes:profile.slotDuration ?? 60,priceCents:6000,isActive:true,isPublic:true,isPreferred:true}));
  }),
}));
jest.mock('../../../services/heraCommissionService', () => ({durableCommandKey:jest.fn(async()=>({commandKey:'fixture-command'}))}));

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
  requestPublicBooking: jest.fn(),
  verifyPublicBooking: jest.fn(),
  verifyPublicBookingQuote: jest.fn(async () => ({price:60,basePrice:60,currency:'EUR',quoteReference:'fixture-quote'})),
}));

jest.mock('../../../services/referralService', () => ({
  getReferralBookingQuote: jest.fn(),
  bookGuestReferral: jest.fn(),
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
    jest.mocked(packageService.loadPatientPackages).mockResolvedValue([]);
    jest.mocked(packageService.loadPublicPackages).mockResolvedValue([]);
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
      quoteReference:'fixture-quote',
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
      quoteReference:'fixture-quote',
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

  it('acquisition refreshes and selects coverage, consumes the intent and reloads the same option with its frozen duration', async () => {
    const offer: packageService.PackageOffer = { id:'offer', name:'Bono nuevo', serviceId:'base', serviceName:'General', sessions:5, totalCents:25000, currency:'EUR', version:1, isPublic:true, archivedAt:null, options:[{id:'VIDEO_CALL',modality:'VIDEO_CALL',durationMinutes:90}] };
    const snapshot = {...offer,paymentConditions:null};
    const acquired: packageService.PatientPackage = {id:'acquired',specialistId:'specialist-1',clientId:'client',createdAt:'2026-09-25',snapshot,balance:{total:5,available:5,reserved:0,consumed:0},invoice:null,uses:[],notifications:[]};
    jest.mocked(packageService.loadPublicPackages).mockResolvedValue([offer]);
    jest.mocked(packageService.quotePackage).mockResolvedValue({snapshot,quoteReference:'package-quote',expiresAt:'2030-01-01',fiscal:{invoiceKind:'SIMPLIFIED',recipientEmail:'patient@example.invalid',recipient:{fiscalName:'Paciente',fiscalTaxId:null,fiscalAddress:null}}});
    jest.mocked(packageService.acquirePackage).mockImplementation(async () => {
      jest.mocked(packageService.loadPatientPackages).mockResolvedValue([acquired]);
      return acquired;
    });
    mockedSessionsService.getAvailableSlots.mockImplementation(async (_specialist, _date, _option, packageId) => [{startTime:'10:00',endTime:packageId ? '11:30' : '11:00',available:true}]);
    mockedSessionsService.createSession.mockImplementation(() => new Promise(() => undefined));
    render(<BookingScreen route={{params:{...route.params,intentToken:'single-use-intent'}}} navigation={navigation} />);
    await screen.findByText('slots:10:00:1');
    fireEvent.press(await screen.findByText('Solicitar bono'));
    fireEvent.press(await screen.findByText('Revisar antes de confirmar'));
    fireEvent.press(await screen.findByText('Solicitar y recibir factura'));
    await screen.findByText(/Bono nuevo.*5 disponibles/);
    expect(packageService.loadPatientPackages).toHaveBeenCalledTimes(2);
    expect(packageService.acquirePackage).toHaveBeenCalledWith(expect.objectContaining({bookingIntentToken:'single-use-intent'}), undefined);
    await waitFor(() => expect(mockedSessionsService.getAvailableSlots).toHaveBeenLastCalledWith('specialist-1','2026-06-25','VIDEO_CALL','acquired'));
    await screen.findByText('slots:10:00:1');
    fireEvent.press(screen.getByText('Sesión individual'));
    await waitFor(() => expect(mockedSessionsService.getAvailableSlots).toHaveBeenLastCalledWith('specialist-1','2026-06-25','VIDEO_CALL',undefined));
    fireEvent.press(screen.getByText(/Bono nuevo.*5 disponibles/));
    await waitFor(() => expect(mockedSessionsService.getAvailableSlots).toHaveBeenLastCalledWith('specialist-1','2026-06-25','VIDEO_CALL','acquired'));
    await screen.findByText('slots:10:00:1');
    fireEvent.press(await screen.findByText('Confirmar cita'));
    await waitFor(() => expect(mockedSessionsService.createSession).toHaveBeenCalledWith(expect.objectContaining({patientPackageId:'acquired',duration:90,intentToken:undefined})));
  });

  it('guest acquisition restarts a pending booking verification without its consumed intent', async () => {
    mockedUseAuth.mockReturnValue({ ...mockedUseAuth(), isAuthenticated:false, user:null });
    const offer: packageService.PackageOffer = {id:'offer',name:'Bono invitado',serviceId:'base',serviceName:'General',sessions:5,totalCents:25000,currency:'EUR',version:1,isPublic:true,archivedAt:null,options:[{id:'VIDEO_CALL',modality:'VIDEO_CALL',durationMinutes:60}]};
    const snapshot = {...offer,paymentConditions:null};
    jest.mocked(packageService.loadPublicPackages).mockResolvedValue([offer]);
    jest.mocked(packageService.requestPublicPackage).mockResolvedValue({requestId:'package-request',expiresAt:'2030-01-01'});
    jest.mocked(packageService.quotePublicPackage).mockResolvedValue({snapshot,quoteReference:'package-quote',expiresAt:'2030-01-01',fiscal:{invoiceKind:'SIMPLIFIED',recipientEmail:'guest@example.invalid',recipient:{fiscalName:'Invitado',fiscalTaxId:null,fiscalAddress:null}}});
    jest.mocked(packageService.acquirePublicPackage).mockResolvedValue({id:'acquired',specialistId:'specialist-1',clientId:'guest',createdAt:'2026-09-25',snapshot,balance:{total:5,available:5,reserved:0,consumed:0},invoice:null,uses:[],notifications:[]});
    mockedSessionsService.getAvailableSlots.mockResolvedValue([{startTime:'10:00',endTime:'11:00',available:true}]);
    mockedSessionsService.requestPublicBooking.mockResolvedValue({requestId:'booking-request',expiresAt:'2030-01-01'});
    render(<BookingScreen route={{params:{...route.params,intentToken:'guest-intent'}}} navigation={navigation} />);
    await screen.findByText('Tus datos de contacto');
    fireEvent.changeText(screen.getByLabelText('Nombre'),'Invitado');
    fireEvent.changeText(screen.getByLabelText('Apellidos'),'Sintético');
    fireEvent.changeText(screen.getByLabelText('Correo electrónico'),'guest@example.invalid');
    fireEvent.press(screen.getByLabelText('Autorizar el uso de datos para gestionar la cita'));
    fireEvent.press(screen.getByText('Continuar con mi reserva'));
    await screen.findByLabelText('Código de verificación del correo');
    fireEvent.press(screen.getByText('Solicitar bono'));
    // The modal owns a separate identity verification for the package acquisition.
    const names = screen.getAllByLabelText('Nombre');
    fireEvent.changeText(names[names.length-1],'Invitado');
    const surnames = screen.getAllByLabelText('Apellidos');
    fireEvent.changeText(surnames[surnames.length-1],'Sintético');
    const emails = screen.getAllByLabelText('Correo electrónico');
    fireEvent.changeText(emails[emails.length-1],'guest@example.invalid');
    fireEvent(screen.getByLabelText('Aceptar política de privacidad'),'valueChange',true);
    fireEvent.press(screen.getByText('Verificar mi correo'));
    fireEvent.changeText(await screen.findByLabelText('Código de verificación'),'123456');
    fireEvent.press(screen.getByText('Verificar y revisar condiciones'));
    fireEvent.press(await screen.findByText('Solicitar y recibir factura'));
    await screen.findByText('Continuar con mi reserva');
    expect(screen.queryByLabelText('Código de verificación del correo')).toBeNull();
    fireEvent.press(screen.getByText('Continuar con mi reserva'));
    await waitFor(() => expect(mockedSessionsService.requestPublicBooking).toHaveBeenCalledTimes(2));
    expect(mockedSessionsService.requestPublicBooking.mock.calls[0][0].intentToken).toBe('guest-intent');
    expect(mockedSessionsService.requestPublicBooking.mock.calls[1][0].intentToken).toBeUndefined();
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
      '2026-06-25',
      'VIDEO_CALL', undefined
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
    const action = screen.getByRole('button', { name: 'Continuar con mi reserva' });
    expect(action).toBeDisabled();
    fireEvent.press(action);
    expect(mockedSessionsService.requestPublicBooking).not.toHaveBeenCalled();
    fireEvent(screen.getByLabelText('Nombre'), 'blur');
    fireEvent(screen.getByLabelText('Apellidos'), 'blur');
    fireEvent(screen.getByLabelText('Correo electrónico'), 'blur');

    expect(await screen.findByText('Introduce tu nombre')).toBeTruthy();
    expect(screen.getByText('Introduce tus apellidos')).toBeTruthy();
    expect(screen.getByText('Introduce un email válido')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Consultar la política de privacidad'));
    expect(navigation.navigate).toHaveBeenCalledWith('LegalDocument', {
      documentKey: 'PRIVACY_POLICY',
    });

    fireEvent.changeText(screen.getByLabelText('Nombre'), 'María');
    fireEvent.changeText(screen.getByLabelText('Apellidos'), 'García');
    fireEvent.changeText(screen.getByLabelText('Correo electrónico'), 'maria@example.com');
    expect(action).toBeDisabled();
    fireEvent.press(screen.getByLabelText('Autorizar el uso de datos para gestionar la cita'));

    expect(action).toBeEnabled();
    const contact = within(screen.getByTestId('booking-contact-section'));
    expect(contact.getByLabelText('Nombre')).toBeTruthy();
    expect(contact.getByRole('button', { name: 'Continuar con mi reserva' })).toBeTruthy();
    expect(contact.getByText('Revisa tu cita')).toBeTruthy();
    expect(contact.getByText('En el siguiente paso comprobaremos tu correo con un código para confirmar la cita.')).toBeTruthy();
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
    mockedSessionsService.requestPublicBooking.mockResolvedValue({ requestId: 'request-fixture', expiresAt: '2026-06-26T11:00:00Z' });
    mockedSessionsService.verifyPublicBookingQuote.mockRejectedValueOnce(new Error('Código incorrecto'));
    mockedSessionsService.verifyPublicBooking.mockResolvedValue({ id: 'session-fixture', status: 'PENDING' });

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
    fireEvent.press(await screen.findByText('Continuar con mi reserva'));
    const code = await screen.findByLabelText('Código de verificación del correo');
    const confirmation = within(screen.getByTestId('booking-contact-confirmation'));
    expect(confirmation.getByLabelText('Código de verificación del correo')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Verificar y revisar precio' })).toBeDisabled();
    fireEvent.changeText(code, '123');
    expect(screen.getByRole('button', { name: 'Verificar y revisar precio' })).toBeDisabled();
    expect(mockedSessionsService.verifyPublicBooking).not.toHaveBeenCalled();
    expect(mockedSessionsService.createPublicSession).not.toHaveBeenCalled();
    fireEvent.changeText(code, '123456');
    fireEvent.press(screen.getByText('Verificar y revisar precio'));
    await waitFor(() => expect(mockedSessionsService.verifyPublicBookingQuote).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockedShowAppAlert).toHaveBeenCalledWith(expect.anything(), expect.any(String), 'Código incorrecto'));
    expect(screen.getByDisplayValue('123456')).toBeTruthy();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Verificar y revisar precio' })).toBeEnabled());
    fireEvent.press(screen.getByText('Verificar y revisar precio'));
    await screen.findByText('Confirmar cita');
    expect(mockedSessionsService.verifyPublicBooking).not.toHaveBeenCalled();
    fireEvent.press(screen.getByText('Confirmar cita'));

    expect(await screen.findByText('Solicitud enviada')).toBeTruthy();
    expect(screen.getByTestId('booking-success-scroll')).toBeTruthy();
  });

  it('requires reviewing the personalized price again when a verified quote expires', async () => {
    jest.useFakeTimers();
    try {
      mockedUseAuth.mockReturnValue({ ...mockedUseAuth(), isAuthenticated: false, user: null });
      mockedSessionsService.getAvailableSlots.mockResolvedValue([
        { startTime: '10:00', endTime: '11:00', available: true },
      ]);
      mockedSessionsService.requestPublicBooking.mockResolvedValue({ requestId: 'request-fixture', expiresAt: new Date(Date.now() + 900_000).toISOString() });
      mockedSessionsService.verifyPublicBookingQuote.mockResolvedValueOnce({
        price: 0, basePrice: 60, currency: 'EUR', quoteReference: 'verified-free-quote',
        specialistId: 'specialist-1', duration: 60, tariffId: null,
        tariffName: null, baseTariffName: null, firstVisitFreeApplied: true,
        expiresAt: new Date(Date.now() + 600_000).toISOString(),
      });
      render(<BookingScreen route={route} navigation={navigation} />);
      await screen.findByText('Tus datos de contacto');
      fireEvent.changeText(screen.getByLabelText('Nombre'), 'María');
      fireEvent.changeText(screen.getByLabelText('Apellidos'), 'García');
      fireEvent.changeText(screen.getByLabelText('Correo electrónico'), 'fixture@example.invalid');
      fireEvent.press(screen.getByLabelText('Autorizar el uso de datos para gestionar la cita'));
      fireEvent.press(await screen.findByText('Continuar con mi reserva'));
      fireEvent.changeText(await screen.findByLabelText('Código de verificación del correo'), '123456');
      fireEvent.press(screen.getByText('Verificar y revisar precio'));
      await screen.findByText('Confirmar cita');
      await act(async () => { jest.advanceTimersByTime(600_000); });
      expect(await screen.findByText('Verificar y revisar precio')).toBeTruthy();
      expect(screen.queryByText('Confirmar cita')).toBeNull();
      expect(screen.getByDisplayValue('123456')).toBeTruthy();
      expect(mockedSessionsService.verifyPublicBooking).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });

  it('keeps contact details after losing a slot and verifies a new request for the replacement date', async () => {
    mockedUseAuth.mockReturnValue({ ...mockedUseAuth(), isAuthenticated: false, user: null });
    mockedSessionsService.getAvailableSlots.mockResolvedValue([
      { startTime: '10:00', endTime: '11:00', available: true },
    ]);
    mockedSessionsService.requestPublicBooking
      .mockResolvedValueOnce({ requestId: 'first-request', expiresAt: '2026-06-26T11:00:00Z' })
      .mockResolvedValueOnce({ requestId: 'replacement-request', expiresAt: '2026-06-26T11:00:00Z' });
    const message = 'Este horario ya no está disponible. Elige otro hueco.';
    mockedSessionsService.verifyPublicBooking.mockRejectedValueOnce(new Error(message))
      .mockResolvedValueOnce({ id: 'replacement-session', status: 'PENDING' });
    render(<BookingScreen route={route} navigation={navigation} />);
    await screen.findByText('Tus datos de contacto');
    fireEvent.changeText(screen.getByLabelText('Nombre'), 'María');
    fireEvent.changeText(screen.getByLabelText('Apellidos'), 'García');
    fireEvent.changeText(screen.getByLabelText('Correo electrónico'), 'fixture@example.invalid');
    fireEvent.press(screen.getByLabelText('Autorizar el uso de datos para gestionar la cita'));
    fireEvent.press(await screen.findByText('Continuar con mi reserva'));
    fireEvent.changeText(await screen.findByLabelText('Código de verificación del correo'), '123456');
    fireEvent.press(screen.getByText('Verificar y revisar precio'));
    fireEvent.press(await screen.findByText('Confirmar cita'));
    await waitFor(() => expect(mockedShowAppAlert).toHaveBeenCalledWith(expect.anything(), expect.any(String), message));
    expect(screen.queryByText('Solicitud enviada')).toBeNull();
    expect(screen.getByDisplayValue('fixture@example.invalid')).toBeTruthy();
    fireEvent.press(screen.getByText('select-second-date'));
    await waitFor(() => expect(screen.queryByLabelText('Código de verificación del correo')).toBeNull());
    fireEvent.press(await screen.findByText('select-slot'));
    fireEvent.press(screen.getByText('Continuar con mi reserva'));
    fireEvent.changeText(await screen.findByLabelText('Código de verificación del correo'), '654321');
    fireEvent.press(screen.getByText('Verificar y revisar precio'));
    fireEvent.press(await screen.findByText('Confirmar cita'));
    await screen.findByText('Solicitud enviada');
    expect(mockedSessionsService.requestPublicBooking).toHaveBeenCalledTimes(2);
    expect(mockedSessionsService.requestPublicBooking.mock.calls[1][0].date).not.toBe(mockedSessionsService.requestPublicBooking.mock.calls[0][0].date);
    expect(mockedSessionsService.verifyPublicBooking).toHaveBeenLastCalledWith('replacement-request', '654321', 'fixture-quote');
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
