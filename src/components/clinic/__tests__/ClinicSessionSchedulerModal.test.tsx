import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { lightTheme } from '../../../constants/theme';
import { useTheme } from '../../../contexts/ThemeContext';
import type {
  ClinicPatientSummary,
  ClinicSessionSummary,
  ClinicSessionSlotOptionsResult,
  ClinicSessionServiceOptionsResult,
  GetClinicSessionServiceOptionsInput,
  GetClinicSessionSlotOptionsInput,
} from '../../../services/clinicService';
import { ClinicSessionSchedulerModal } from '../ClinicSessionSchedulerModal';

jest.mock('react-native-calendars', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return {
    LocaleConfig: { locales: {}, defaultLocale: 'es' },
    Calendar: ({ onDayPress, testID }: {
      onDayPress?: (day: { dateString: string }) => void;
      testID?: string;
    }) => (
      <Text testID={testID ?? 'clinic-scheduler-calendar'} onPress={() => {
        onDayPress?.({ dateString: '2030-01-15' });
      }}>
        calendar
      </Text>
    ),
  };
});

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: jest.fn(),
}));

const mockedUseTheme = jest.mocked(useTheme);
const onLoadSlotOptions = jest.fn<
  Promise<ClinicSessionSlotOptionsResult>,
  [GetClinicSessionSlotOptionsInput]
>(async () => ({
  date: '2030-01-15',
  duration: 60,
  slots: [{
    startTime: '10:30',
    endTime: '11:30',
    status: 'AVAILABLE',
    selectable: true,
  }],
}));
const onLoadServiceOptions = jest.fn<
  Promise<ClinicSessionServiceOptionsResult>,
  [GetClinicSessionServiceOptionsInput]
>(async () => ({ catalogActivated: false, services: [] }));

const selectCalendarDate = async (waitForAvailability = true): Promise<void> => {
  await waitFor(() => expect(
    screen.getByTestId('clinic-session-date-trigger').props.accessibilityState.disabled,
  ).toBe(false));
  const requestsBeforeSelection = onLoadSlotOptions.mock.calls.length;
  fireEvent.press(screen.getByTestId('clinic-session-date-trigger'));
  fireEvent.press(screen.getByTestId('clinic-session-date-calendar'));
  await waitFor(() => {
    expect(onLoadSlotOptions.mock.calls.length).toBeGreaterThan(requestsBeforeSelection);
  });
  if (waitForAvailability) {
    await waitFor(() => {
      expect(screen.queryByText('Comprobando disponibilidad…')).toBeNull();
    });
  }
};

const selectTime = async (time: string): Promise<void> => {
  await waitFor(() => expect(
    screen.getByTestId('clinic-session-time-trigger').props.accessibilityState.disabled,
  ).toBe(false));
  fireEvent.press(screen.getByTestId('clinic-session-time-trigger'));
  fireEvent.press(screen.getByTestId(`clinic-session-time-option-${time}`));
};

const createDeferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
};

const renderModal = async (
  element: React.ReactElement,
): Promise<ReturnType<typeof render>> => {
  const view = render(element);
  await act(async () => {
    for (let cycle = 0; cycle < 8; cycle += 1) {
      await Promise.resolve();
    }
  });
  return view;
};

const patient: ClinicPatientSummary = {
  id: 'patient-1',
  status: 'ACTIVE',
  displayName: 'Lucía Martín',
  firstName: 'Lucía',
  lastName: 'Martín',
  email: 'lucia@example.com',
  phone: null,
  billingDataComplete: true,
  createdAt: '2026-08-01T08:00:00.000Z',
  updatedAt: '2026-08-01T08:00:00.000Z',
  archivedAt: null,
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

const secondPatient: ClinicPatientSummary = {
  ...patient,
  id: 'patient-2',
  displayName: 'Mario Gómez',
  firstName: 'Mario',
  lastName: 'Gómez',
  email: 'mario@example.com',
  activeAssignment: {
    ...patient.activeAssignment!,
    id: 'assignment-2',
    clinicSpecialistId: 'specialist-2',
    clinicSpecialistDisplayName: 'Dr. Pablo León',
  },
};

const session: ClinicSessionSummary = {
  id: 'session-1',
  date: '2030-01-15T09:30:00.000Z',
  duration: 50,
  type: 'PHONE_CALL',
  status: 'CONFIRMED',
  bookedPrice: null,
  bookedCurrency: null,
  cancelledAt: null,
  createdAt: '2026-08-01T08:00:00.000Z',
  updatedAt: '2026-08-01T08:00:00.000Z',
  patient: {
    id: patient.id,
    displayName: patient.displayName,
    email: patient.email,
    phone: patient.phone,
    status: patient.status,
  },
  specialist: {
    id: 'specialist-1',
    displayName: 'Dra. Ana Ruiz',
    professionalTitle: 'Psicóloga sanitaria',
    status: 'ACTIVE',
    linkedProfessionalName: 'Ana Ruiz',
  },
};

describe('ClinicSessionSchedulerModal', () => {
  beforeEach(() => {
    onLoadSlotOptions.mockReset();
    onLoadSlotOptions.mockImplementation(() => new Promise((resolve) => {
      setTimeout(() => resolve({
        date: '2030-01-15',
        duration: 60,
        slots: [{
          startTime: '10:30',
          endTime: '11:30',
          status: 'AVAILABLE',
          selectable: true,
        }],
      }), 0);
    }));
    onLoadServiceOptions.mockReset();
    onLoadServiceOptions.mockResolvedValue({ catalogActivated: false, services: [] });
    mockedUseTheme.mockReturnValue({
      theme: lightTheme,
      mode: 'light',
      isDark: false,
      setMode: jest.fn(),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('locks patient context and submits the assignment-derived payload', async () => {
    const onSubmit = jest.fn(async () => session);
    const onCreated = jest.fn();

    await renderModal(
      <ClinicSessionSchedulerModal
        visible
        clinicName="Clínica HERA"
        patients={[patient]}
        lockedPatientId={patient.id}
        onLoadSlotOptions={onLoadSlotOptions}
        onLoadServiceOptions={onLoadServiceOptions}
        onClose={jest.fn()}
        onSubmit={onSubmit}
        onCreated={onCreated}
      />,
    );

    expect(screen.getByText('Paciente preseleccionado')).toBeTruthy();
    expect(screen.queryByText('Buscar paciente')).toBeNull();
    expect(screen.getByLabelText('Modalidades disponibles').props.accessibilityRole)
      .toBe('radiogroup');
    await selectCalendarDate();
    await selectTime('10:30');
    fireEvent.changeText(screen.getByLabelText('Duración de la cita en minutos'), '50');
    fireEvent.press(screen.getByRole('radio', { name: 'Teléfono, Llamada de voz' }));
    fireEvent.press(screen.getByRole('button', { name: 'Crear cita' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({
      clinicPatientId: 'patient-1',
      clinicSpecialistId: 'specialist-1',
      date: '2030-01-15T09:30:00.000Z',
      duration: 50,
      type: 'PHONE_CALL',
    }));
    expect(onCreated).toHaveBeenCalledWith(session);
  });

  it('uses the default catalog service as the authoritative booking configuration', async () => {
    onLoadServiceOptions.mockResolvedValueOnce({
      catalogActivated: true,
      services: [{
        id: 'service-1',
        name: 'Seguimiento telefónico',
        description: 'Consulta de continuidad',
        durationMinutes: 45,
        price: 65,
        currency: 'EUR',
        modalities: ['PHONE_CALL'],
        isDefault: true,
        version: 4,
      }],
    });
    const onSubmit = jest.fn(async () => session);

    await renderModal(
      <ClinicSessionSchedulerModal
        visible
        clinicName="Clínica HERA"
        patients={[patient]}
        lockedPatientId={patient.id}
        onLoadSlotOptions={onLoadSlotOptions}
        onLoadServiceOptions={onLoadServiceOptions}
        onClose={jest.fn()}
        onSubmit={onSubmit}
        onCreated={jest.fn()}
      />,
    );

    expect(await screen.findByRole('radio', { name: /Seguimiento telefónico/ })).toBeTruthy();
    expect(screen.queryByLabelText('Duración de la cita en minutos')).toBeNull();
    expect(screen.queryByRole('radio', { name: 'Presencial, En la clínica' })).toBeNull();
    expect(screen.getByRole('radio', { name: 'Teléfono, Llamada de voz' }).props.accessibilityState.checked)
      .toBe(true);

    await selectCalendarDate();
    await selectTime('10:30');
    fireEvent.press(screen.getByRole('button', { name: 'Crear cita' }));

    await waitFor(() => expect(onLoadSlotOptions).toHaveBeenCalledWith({
      clinicSpecialistId: 'specialist-1',
      date: '2030-01-15',
      clinicServiceId: 'service-1',
      clinicServiceVersion: 4,
    }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({
      clinicPatientId: 'patient-1',
      clinicSpecialistId: 'specialist-1',
      clinicServiceId: 'service-1',
      clinicServiceVersion: 4,
      date: '2030-01-15T09:30:00.000Z',
      type: 'PHONE_CALL',
    }));
  });

  it('blocks creation when an activated catalog has no service for the responsible professional', async () => {
    onLoadServiceOptions.mockResolvedValueOnce({
      catalogActivated: true,
      services: [],
    });

    await renderModal(
      <ClinicSessionSchedulerModal
        visible
        clinicName="Clínica HERA"
        patients={[patient]}
        lockedPatientId={patient.id}
        onLoadSlotOptions={onLoadSlotOptions}
        onLoadServiceOptions={onLoadServiceOptions}
        onClose={jest.fn()}
        onSubmit={jest.fn(async () => session)}
        onCreated={jest.fn()}
      />,
    );

    expect(await screen.findByText('Sin servicios para este profesional')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Crear cita' }).props.accessibilityState.disabled)
      .toBe(true);
    expect(onLoadSlotOptions).not.toHaveBeenCalled();
  });

  it('recovers in place when the catalog is activated after loading legacy mode', async () => {
    const catalogActivatedError = Object.assign(
      new Error('Selecciona un servicio para crear la cita.'),
      {
        code: 'CLINIC_SESSION_SERVICE_REQUIRED' as const,
        field: 'clinicServiceId' as const,
      },
    );
    onLoadServiceOptions
      .mockResolvedValueOnce({ catalogActivated: false, services: [] })
      .mockResolvedValueOnce({
        catalogActivated: true,
        services: [{
          id: 'service-1',
          name: 'Consulta activada',
          description: null,
          durationMinutes: 45,
          price: 60,
          currency: 'EUR',
          modalities: ['IN_PERSON'],
          isDefault: true,
          version: 1,
        }],
      });
    onLoadSlotOptions
      .mockRejectedValueOnce(catalogActivatedError)
      .mockResolvedValueOnce({
        date: '2030-01-15',
        duration: 45,
        slots: [{
          startTime: '10:30',
          endTime: '11:15',
          status: 'AVAILABLE',
          selectable: true,
        }],
      });

    await renderModal(
      <ClinicSessionSchedulerModal
        visible
        clinicName="Clínica HERA"
        patients={[patient]}
        lockedPatientId={patient.id}
        onLoadSlotOptions={onLoadSlotOptions}
        onLoadServiceOptions={onLoadServiceOptions}
        onClose={jest.fn()}
        onSubmit={jest.fn(async () => session)}
        onCreated={jest.fn()}
      />,
    );

    expect(await screen.findByRole('radio', { name: /Consulta activada/ })).toBeTruthy();
    await waitFor(() => expect(onLoadServiceOptions).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(onLoadSlotOptions).toHaveBeenLastCalledWith({
      clinicSpecialistId: 'specialist-1',
      date: expect.any(String),
      clinicServiceId: 'service-1',
      clinicServiceVersion: 1,
    }));
    expect(screen.queryByText('Selecciona un servicio para crear la cita.')).toBeNull();
    expect(screen.queryByLabelText('Duración de la cita en minutos')).toBeNull();
  });

  it('requires an explicit new selection when the booked service becomes unavailable', async () => {
    const serviceUnavailable = Object.assign(
      new Error('El servicio ya no está disponible para este profesional.'),
      {
        code: 'CLINIC_SESSION_SERVICE_UNAVAILABLE' as const,
        field: 'clinicServiceId' as const,
      },
    );
    onLoadServiceOptions
      .mockResolvedValueOnce({
        catalogActivated: true,
        services: [{
          id: 'service-1',
          name: 'Servicio anterior',
          description: null,
          durationMinutes: 60,
          price: 70,
          currency: 'EUR',
          modalities: ['IN_PERSON'],
          isDefault: true,
          version: 1,
        }],
      })
      .mockResolvedValueOnce({
        catalogActivated: true,
        services: [{
          id: 'service-2',
          name: 'Servicio actualizado',
          description: null,
          durationMinutes: 45,
          price: 55,
          currency: 'EUR',
          modalities: ['IN_PERSON'],
          isDefault: true,
          version: 1,
        }],
      });
    const onSubmit = jest.fn()
      .mockRejectedValueOnce(serviceUnavailable)
      .mockResolvedValueOnce(session);

    await renderModal(
      <ClinicSessionSchedulerModal
        visible
        clinicName="Clínica HERA"
        patients={[patient]}
        lockedPatientId={patient.id}
        onLoadSlotOptions={onLoadSlotOptions}
        onLoadServiceOptions={onLoadServiceOptions}
        onClose={jest.fn()}
        onSubmit={onSubmit}
        onCreated={jest.fn()}
      />,
    );

    await screen.findByRole('radio', { name: /Servicio anterior/ });
    await selectCalendarDate();
    await selectTime('10:30');
    fireEvent.press(screen.getByRole('button', { name: 'Crear cita' }));

    const replacement = await screen.findByRole('radio', { name: /Servicio actualizado/ });
    expect(replacement.props.accessibilityState.checked).toBe(false);
    expect(screen.getByRole('button', { name: 'Crear cita' }).props.accessibilityState.disabled)
      .toBe(true);

    fireEvent.press(replacement);
    await waitFor(() => expect(
      screen.getByRole('button', { name: 'Crear cita' }).props.accessibilityState.disabled,
    ).toBe(false));
  });

  it('clears service errors when the patient and responsible context change', async () => {
    onLoadServiceOptions.mockImplementation(async ({ clinicSpecialistId }) => ({
      catalogActivated: true,
      services: [{
        id: clinicSpecialistId === 'specialist-1' ? 'service-1' : 'service-2',
        name: clinicSpecialistId === 'specialist-1' ? 'Servicio Lucía' : 'Servicio Mario',
        description: null,
        durationMinutes: 60,
        price: 70,
        currency: 'EUR',
        modalities: ['IN_PERSON'],
        isDefault: true,
        version: 1,
      }],
    }));
    const serviceConflict = Object.assign(
      new Error('El servicio ha cambiado. Revisa sus datos antes de guardar de nuevo.'),
      {
        code: 'CLINIC_SESSION_SERVICE_CONFLICT' as const,
        field: 'clinicServiceId' as const,
      },
    );

    await renderModal(
      <ClinicSessionSchedulerModal
        visible
        clinicName="Clínica HERA"
        patients={[patient, secondPatient]}
        patientOptions={[
          { label: patient.displayName, value: patient.id },
          { label: secondPatient.displayName, value: secondPatient.id },
        ]}
        onLoadSlotOptions={onLoadSlotOptions}
        onLoadServiceOptions={onLoadServiceOptions}
        onClose={jest.fn()}
        onSubmit={jest.fn(async () => { throw serviceConflict; })}
        onCreated={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Paciente de la cita' }));
    fireEvent.press(screen.getByRole('button', { name: patient.displayName }));
    await screen.findByRole('radio', { name: /Servicio Lucía/ });
    await selectCalendarDate();
    await selectTime('10:30');
    fireEvent.press(screen.getByRole('button', { name: 'Crear cita' }));
    expect(await screen.findByText(
      'El servicio ha cambiado. Revisa sus datos antes de guardar de nuevo.',
    )).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Paciente de la cita' }));
    fireEvent.press(screen.getByRole('button', { name: secondPatient.displayName }));
    expect(await screen.findByRole('radio', { name: /Servicio Mario/ })).toBeTruthy();
    expect(screen.queryByText(
      'El servicio ha cambiado. Revisa sus datos antes de guardar de nuevo.',
    )).toBeNull();
  });

  it('keeps selectable mode searchable and leaves backend errors in the open form', async () => {
    const onSearch = jest.fn();
    const onSubmit = jest.fn(async () => {
      throw new Error('Ese horario ya no está disponible.');
    });

    await renderModal(
      <ClinicSessionSchedulerModal
        visible
        clinicName="Clínica HERA"
        patients={[patient]}
        patientOptions={[{ label: patient.displayName, value: patient.id }]}
        patientLookupSearch=""
        onPatientSearchChange={onSearch}
        onLoadSlotOptions={onLoadSlotOptions}
        onLoadServiceOptions={onLoadServiceOptions}
        onClose={jest.fn()}
        onSubmit={onSubmit}
        onCreated={jest.fn()}
      />,
    );

    fireEvent.changeText(screen.getByPlaceholderText('Nombre o apellidos'), 'Lucía');
    expect(onSearch).toHaveBeenCalledWith('Lucía');
    fireEvent.press(screen.getByText('Selecciona paciente'));
    fireEvent.press(screen.getByRole('button', { name: patient.displayName }));
    await selectCalendarDate();
    await selectTime('10:30');
    fireEvent.press(screen.getByRole('button', { name: 'Crear cita' }));

    await waitFor(() => {
      expect(screen.getByText('Ese horario ya no está disponible.')).toBeTruthy();
    });
    expect(screen.getByText('Nueva cita')).toBeTruthy();
  });

  it('cancels without submitting and resets transient fields when reopened', async () => {
    const onClose = jest.fn();
    const onSubmit = jest.fn(async () => session);
    const props = {
      clinicName: 'Clínica HERA',
      patients: [patient],
      lockedPatientId: patient.id,
      onLoadSlotOptions,
      onLoadServiceOptions,
      onClose,
      onSubmit,
      onCreated: jest.fn(),
    };
    const view = await renderModal(<ClinicSessionSchedulerModal visible {...props} />);
    await selectCalendarDate();
    expect(screen.getByText('2030-01-15')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();

    view.rerender(<ClinicSessionSchedulerModal visible={false} {...props} />);
    view.rerender(<ClinicSessionSchedulerModal visible {...props} />);
    expect(screen.queryByText('2030-01-15')).toBeNull();
    view.unmount();
  });

  it('closes an expanded patient selector before the next opening', () => {
    const props = {
      clinicName: 'Clínica HERA',
      patients: [patient],
      patientOptions: [{ label: patient.displayName, value: patient.id }],
      onLoadSlotOptions,
      onLoadServiceOptions,
      onClose: jest.fn(),
      onSubmit: jest.fn(async () => session),
      onCreated: jest.fn(),
    };
    const view = render(<ClinicSessionSchedulerModal visible {...props} />);

    fireEvent.press(screen.getByRole('button', { name: 'Paciente de la cita' }));
    expect(screen.getByRole('button', { name: patient.displayName })).toBeTruthy();

    view.rerender(<ClinicSessionSchedulerModal visible={false} {...props} />);
    view.rerender(<ClinicSessionSchedulerModal visible {...props} />);
    expect(screen.queryByRole('button', { name: patient.displayName })).toBeNull();
  });

  it('keeps the selected patient when lookup results are replaced', async () => {
    const onSubmit = jest.fn(async () => session);
    const props = {
      visible: true,
      clinicName: 'Clínica HERA',
      patientLookupSearch: '',
      onPatientSearchChange: jest.fn(),
      onLoadSlotOptions,
      onLoadServiceOptions,
      onClose: jest.fn(),
      onSubmit,
      onCreated: jest.fn(),
    };
    const view = await renderModal(
      <ClinicSessionSchedulerModal
        {...props}
        patients={[patient]}
        patientOptions={[{ label: patient.displayName, value: patient.id }]}
      />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Paciente de la cita' }));
    fireEvent.press(screen.getByRole('button', { name: patient.displayName }));
    view.rerender(
      <ClinicSessionSchedulerModal
        {...props}
        patients={[]}
        patientOptions={[]}
        patientLookupSearch="otra búsqueda"
      />,
    );

    expect(screen.getByText(patient.displayName)).toBeTruthy();
    await selectCalendarDate();
    await selectTime('10:30');
    fireEvent.press(screen.getByRole('button', { name: 'Crear cita' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      clinicPatientId: patient.id,
      clinicSpecialistId: 'specialist-1',
    })));
  });

  it('ignores a previous submission after closing and reopening', async () => {
    const deferred = createDeferred<ClinicSessionSummary>();
    const onSubmit = jest.fn(() => deferred.promise);
    const onCreated = jest.fn();
    const props = {
      clinicName: 'Clínica HERA',
      patients: [patient],
      lockedPatientId: patient.id,
      onLoadSlotOptions,
      onLoadServiceOptions,
      onClose: jest.fn(),
      onSubmit,
      onCreated,
    };
    const view = await renderModal(<ClinicSessionSchedulerModal visible {...props} />);

    await selectCalendarDate();
    await selectTime('10:30');
    const createButton = screen.getByRole('button', { name: 'Crear cita' });
    fireEvent.press(createButton);
    fireEvent.press(createButton);
    expect(onSubmit).toHaveBeenCalledTimes(1);

    view.rerender(<ClinicSessionSchedulerModal visible={false} {...props} />);
    view.rerender(<ClinicSessionSchedulerModal visible {...props} />);
    await act(async () => {
      deferred.resolve(session);
      await deferred.promise;
    });

    expect(onCreated).not.toHaveBeenCalled();
    expect(screen.queryByText('Ese horario ya no está disponible.')).toBeNull();
  });

  it('renders retryable lookup errors and an honest empty state', () => {
    const onRetry = jest.fn();
    const props = {
      visible: true,
      clinicName: 'Clínica HERA',
      patients: [],
      patientOptions: [],
      onLoadSlotOptions,
      onLoadServiceOptions,
      onClose: jest.fn(),
      onSubmit: jest.fn(async () => session),
      onCreated: jest.fn(),
      onRetryPatientLookup: onRetry,
    };
    const view = render(
      <ClinicSessionSchedulerModal
        {...props}
        patientLookupError="No se pudieron actualizar los pacientes."
      />,
    );

    expect(screen.getByText('No se pudieron actualizar los pacientes.')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));
    expect(onRetry).toHaveBeenCalledTimes(1);

    view.rerender(<ClinicSessionSchedulerModal {...props} patientLookupError="" />);
    expect(screen.getByText(
      'No hay pacientes activos con responsable asignado para esta búsqueda.',
    )).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Crear cita' }).props.accessibilityState.disabled)
      .toBe(true);
  });

  it('shows an honest availability error and retries without closing the form', async () => {
    onLoadSlotOptions
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({
        date: '2030-01-15',
        duration: 60,
        slots: [],
      });

    await renderModal(
      <ClinicSessionSchedulerModal
        visible
        clinicName="Clínica HERA"
        patients={[patient]}
        lockedPatientId={patient.id}
        onLoadSlotOptions={onLoadSlotOptions}
        onLoadServiceOptions={onLoadServiceOptions}
        onClose={jest.fn()}
        onSubmit={jest.fn(async () => session)}
        onCreated={jest.fn()}
      />,
    );

    expect(await screen.findByText('No se pudieron comprobar huecos. Se validará al guardar.')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Reintentar disponibilidad' }));
    await waitFor(() => expect(onLoadSlotOptions).toHaveBeenCalledTimes(2));
    await waitFor(() => {
      expect(screen.queryByText('No se pudieron comprobar huecos. Se validará al guardar.')).toBeNull();
    });
  });

  it('discards an obsolete slot response after the date changes', async () => {
    const first = createDeferred<ClinicSessionSlotOptionsResult>();
    const second = createDeferred<ClinicSessionSlotOptionsResult>();
    onLoadSlotOptions
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise);

    await renderModal(
      <ClinicSessionSchedulerModal
        visible
        clinicName="Clínica HERA"
        patients={[patient]}
        lockedPatientId={patient.id}
        onLoadSlotOptions={onLoadSlotOptions}
        onLoadServiceOptions={onLoadServiceOptions}
        onClose={jest.fn()}
        onSubmit={jest.fn(async () => session)}
        onCreated={jest.fn()}
      />,
    );
    await selectCalendarDate(false);

    await act(async () => {
      second.resolve({
        date: '2030-01-15',
        duration: 60,
        slots: [{
          startTime: '10:30',
          endTime: '11:30',
          status: 'OCCUPIED',
          selectable: false,
        }],
      });
      await second.promise;
    });
    await act(async () => {
      first.resolve({
        date: '2026-08-25',
        duration: 60,
        slots: [{
          startTime: '10:30',
          endTime: '11:30',
          status: 'AVAILABLE',
          selectable: true,
        }],
      });
      await first.promise;
    });

    fireEvent.press(screen.getByTestId('clinic-session-time-trigger'));
    expect(screen.getByTestId('clinic-session-time-option-10:30').props.accessibilityState.disabled)
      .toBe(true);
  });

  it('refreshes slots and associates an authoritative conflict with the time field', async () => {
    const refresh = createDeferred<ClinicSessionSlotOptionsResult>();
    const conflict = Object.assign(
      new Error('Ese horario ya no está disponible. Elige otro hueco.'),
      { code: 'CLINIC_SESSION_CONFLICT' as const },
    );
    const onSubmit = jest.fn(async () => {
      throw conflict;
    });

    await renderModal(
      <ClinicSessionSchedulerModal
        visible
        clinicName="Clínica HERA"
        patients={[patient]}
        lockedPatientId={patient.id}
        onLoadSlotOptions={onLoadSlotOptions}
        onLoadServiceOptions={onLoadServiceOptions}
        onClose={jest.fn()}
        onSubmit={onSubmit}
        onCreated={jest.fn()}
      />,
    );
    await selectCalendarDate();
    await selectTime('10:30');
    await waitFor(() => expect(onLoadSlotOptions).toHaveBeenCalled());
    const requestsBeforeSubmit = onLoadSlotOptions.mock.calls.length;
    onLoadSlotOptions.mockImplementationOnce(() => refresh.promise);
    fireEvent.press(screen.getByRole('button', { name: 'Crear cita' }));

    expect(await screen.findByText(
      'Ese horario ya no está disponible. Elige otro hueco.',
    )).toBeTruthy();
    const createButton = screen.getByRole('button', { name: 'Crear cita' });
    expect(createButton.props.accessibilityState.disabled).toBe(true);
    fireEvent.press(createButton);
    expect(onSubmit).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(onLoadSlotOptions.mock.calls.length).toBeGreaterThan(requestsBeforeSubmit);
    });
    await act(async () => {
      refresh.resolve({
        date: '2030-01-15',
        duration: 60,
        slots: [{
          startTime: '10:30',
          endTime: '11:30',
          status: 'AVAILABLE',
          selectable: true,
        }, {
          startTime: '10:45',
          endTime: '11:45',
          status: 'AVAILABLE',
          selectable: true,
        }],
      });
      await refresh.promise;
    });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Crear cita' }).props.accessibilityState.disabled)
        .toBe(true);
    });
    await selectTime('10:45');
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Crear cita' }).props.accessibilityState.disabled)
        .toBe(false);
    });
  });

  it('keeps the modal open and associates an authoritative invalid slot with time', async () => {
    const invalidSlot = Object.assign(
      new Error('Selecciona una hora entre las 07:00 y las 23:00, en intervalos de 15 minutos (hora peninsular).'),
      { code: 'CLINIC_SESSION_INVALID_SLOT' as const, field: 'date' as const },
    );
    const onSubmit = jest.fn(async () => {
      throw invalidSlot;
    });
    const onCreated = jest.fn();

    await renderModal(
      <ClinicSessionSchedulerModal
        visible
        clinicName="Clínica HERA"
        patients={[patient]}
        lockedPatientId={patient.id}
        onLoadSlotOptions={onLoadSlotOptions}
        onLoadServiceOptions={onLoadServiceOptions}
        onClose={jest.fn()}
        onSubmit={onSubmit}
        onCreated={onCreated}
      />,
    );
    await selectCalendarDate();
    await selectTime('10:30');
    fireEvent.press(screen.getByRole('button', { name: 'Crear cita' }));

    expect(await screen.findByText(invalidSlot.message)).toBeTruthy();
    expect(onCreated).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Crear cita' })).toBeTruthy();
  });
});
