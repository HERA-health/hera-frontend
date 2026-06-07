import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as ReactNative from 'react-native';
import { showAppAlert, useAppAlert } from '../../../components/common/alert';
import {
  useProfessionalTourAutoStart,
  useProfessionalTourStepPreparation,
} from '../../../components/onboarding/professionalTourContext';
import { lightTheme } from '../../../constants/theme';
import { useTheme } from '../../../contexts/ThemeContext';
import * as availabilityService from '../../../services/availabilityService';
import { billingService } from '../../../services/billingService';
import { ProfessionalAvailabilityScreen } from '../ProfessionalAvailabilityScreen';

jest.mock('react-native-calendars', () => ({
  Calendar: ({ onDayPress }: { onDayPress?: (day: { dateString: string }) => void }) => {
    const React = require('react');
    const { Pressable, Text, View } = require('react-native');
    const selectableDates = ['2026-06-09', '2026-06-11', '2026-06-16'];
    return (
      <View>
        <Text>calendar</Text>
        {selectableDates.map((date) => (
          <Pressable
            key={date}
            accessibilityLabel={`Seleccionar ${date}`}
            onPress={() => onDayPress?.({ dateString: date })}
          >
            <Text>{date}</Text>
          </Pressable>
        ))}
      </View>
    );
  },
}));

jest.mock('../../../components/common/alert', () => ({
  showAppAlert: jest.fn(),
  useAppAlert: jest.fn(),
  useAppAlertState: jest.fn(),
}));

jest.mock('../../../components/onboarding/professionalTourContext', () => ({
  useOptionalProfessionalTour: jest.fn(() => null),
  useProfessionalTourAutoStart: jest.fn(),
  useProfessionalTourStepPreparation: jest.fn(),
}));

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: jest.fn(),
}));

jest.mock('../../../services/analyticsService', () => ({
  track: jest.fn(),
  trackScreen: jest.fn(),
}));

jest.mock('../../../services/availabilityService', () => ({
  addExceptionRange: jest.fn(),
  getMyWeeklySchedule: jest.fn(),
  getMyExceptions: jest.fn(),
  getExceptionRangeImpact: jest.fn(),
  getMyBufferTime: jest.fn(),
  removeException: jest.fn(),
  removeExceptionRange: jest.fn(),
  updateWeeklySchedule: jest.fn(),
  updateBufferTime: jest.fn(),
}));

jest.mock('../../../services/billingService', () => ({
  billingService: {
    getConfig: jest.fn(),
  },
}));

const mockedUseTheme = jest.mocked(useTheme);
const mockedUseAppAlert = jest.mocked(useAppAlert);
const mockedUseAppAlertState = jest.requireMock('../../../components/common/alert')
  .useAppAlertState as jest.Mock;
const mockedUseProfessionalTourAutoStart = jest.mocked(useProfessionalTourAutoStart);
const mockedUseProfessionalTourStepPreparation = jest.mocked(useProfessionalTourStepPreparation);
const mockedShowAppAlert = jest.mocked(showAppAlert);
const mockedAvailabilityService = jest.mocked(availabilityService);
const mockedBillingService = jest.mocked(billingService);

const emptyWeeklySchedule = {
  monday: null,
  tuesday: null,
  wednesday: null,
  thursday: null,
  friday: null,
  saturday: null,
  sunday: null,
};

describe('ProfessionalAvailabilityScreen', () => {
  beforeEach(() => {
    const desktopMetrics = {
      width: 1200,
      height: 900,
      scale: 1,
      fontScale: 1,
    };
    ReactNative.Dimensions.set({
      window: desktopMetrics,
      screen: desktopMetrics,
    });
    mockedUseTheme.mockReturnValue({
      theme: lightTheme,
      mode: 'light',
      isDark: false,
      setMode: jest.fn(),
    } as unknown as ReturnType<typeof useTheme>);
    mockedUseAppAlert.mockReturnValue({} as ReturnType<typeof useAppAlert>);
    mockedUseAppAlertState.mockReturnValue({ isVisible: false });
    mockedAvailabilityService.getMyWeeklySchedule.mockResolvedValue(emptyWeeklySchedule);
    mockedAvailabilityService.getMyExceptions.mockResolvedValue([]);
    mockedAvailabilityService.getExceptionRangeImpact.mockResolvedValue({ activeSessionCount: 0 });
    mockedAvailabilityService.addExceptionRange.mockResolvedValue({
      activeSessionCount: 0,
      createdCount: 1,
      dayCount: 1,
      endDate: '2026-06-09',
      reason: 'Vacaciones',
      startDate: '2026-06-09',
      updatedCount: 0,
    });
    mockedAvailabilityService.removeException.mockResolvedValue(undefined);
    mockedAvailabilityService.removeExceptionRange.mockResolvedValue({ deletedCount: 1 });
    mockedAvailabilityService.getMyBufferTime.mockResolvedValue(15);
    mockedAvailabilityService.updateWeeklySchedule.mockResolvedValue(undefined);
    mockedAvailabilityService.updateBufferTime.mockResolvedValue(undefined);
    mockedBillingService.getConfig.mockRejectedValue(new Error('No se pudo cargar la configuración de facturación'));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('keeps availability usable when billing config fails to load', async () => {
    const props = {
      navigation: { navigate: jest.fn() },
    } as unknown as React.ComponentProps<typeof ProfessionalAvailabilityScreen>;

    render(<ProfessionalAvailabilityScreen {...props} />);

    await waitFor(() => {
      expect(screen.getAllByText('No disponible').length).toBeGreaterThan(0);
    });
    expect(screen.getByText('No se pudo cargar la configuración de facturación')).toBeTruthy();
    await waitFor(() => {
      expect(mockedAvailabilityService.getMyWeeklySchedule).toHaveBeenCalled();
    });
    expect(mockedShowAppAlert).not.toHaveBeenCalled();
  });

  it('keeps auto-start disabled while a global alert is visible', async () => {
    mockedUseAppAlertState.mockReturnValue({ isVisible: true });
    const props = {
      navigation: { navigate: jest.fn() },
    } as unknown as React.ComponentProps<typeof ProfessionalAvailabilityScreen>;

    render(<ProfessionalAvailabilityScreen {...props} />);

    await waitFor(() => {
      expect(screen.getAllByText('No disponible').length).toBeGreaterThan(0);
    });

    expect(mockedUseProfessionalTourAutoStart).toHaveBeenLastCalledWith(
      'professional_availability_v1',
      false,
    );
  });

  it('renders quick patterns collapsed by default and keeps the weekly grid visible', async () => {
    const props = {
      navigation: { navigate: jest.fn() },
    } as unknown as React.ComponentProps<typeof ProfessionalAvailabilityScreen>;

    render(<ProfessionalAvailabilityScreen {...props} />);

    expect(await screen.findByText('Patrones rápidos')).toBeTruthy();
    expect(screen.getByText('Configura un patrón base en 3 pasos.')).toBeTruthy();
    expect(screen.getByText('Disponibilidad semanal')).toBeTruthy();
    expect(screen.getByText('07:00')).toBeTruthy();
    expect(screen.getByText('22:00')).toBeTruthy();
    expect(screen.queryByText('Elegir horario')).toBeNull();
    expect(screen.queryByText('Copiar lunes')).toBeNull();
  });

  it('expands the guided quick pattern flow from the compact header', async () => {
    const props = {
      navigation: { navigate: jest.fn() },
    } as unknown as React.ComponentProps<typeof ProfessionalAvailabilityScreen>;

    render(<ProfessionalAvailabilityScreen {...props} />);

    await screen.findByText('Patrones rápidos');
    fireEvent.press(screen.getByLabelText('Abrir patrones rápidos'));

    expect(screen.getByText('Elegir horario')).toBeTruthy();
    expect(screen.getByText('Seleccionar días destino')).toBeTruthy();
    expect(screen.getByText('Puedes incluir días sin horario; se activarán al aplicar.')).toBeTruthy();
    expect(screen.getAllByText('Sin horario').length).toBeGreaterThan(0);
    expect(screen.getByText('Confirmar')).toBeTruthy();
    expect(screen.getByText('8-14 h')).toBeTruthy();
    expect(screen.getByText('14-20 h')).toBeTruthy();
    expect(screen.getByText('8-20 h')).toBeTruthy();
  });

  it('does not apply a quick pattern without a complete selection', async () => {
    const props = {
      navigation: { navigate: jest.fn() },
    } as unknown as React.ComponentProps<typeof ProfessionalAvailabilityScreen>;

    render(<ProfessionalAvailabilityScreen {...props} />);

    await screen.findByText('Patrones rápidos');
    fireEvent.press(screen.getByLabelText('Abrir patrones rápidos'));
    fireEvent.press(screen.getByText('Aplicar'));

    expect(screen.queryByText('Cambios sin guardar')).toBeNull();
    expect(mockedAvailabilityService.updateWeeklySchedule).not.toHaveBeenCalled();
  });

  it('blocks a selected absence range with the chosen label', async () => {
    mockedAvailabilityService.addExceptionRange.mockResolvedValue({
      activeSessionCount: 0,
      createdCount: 8,
      dayCount: 8,
      endDate: '2026-06-16',
      reason: 'Formación',
      startDate: '2026-06-09',
      updatedCount: 0,
    });
    const props = {
      navigation: { navigate: jest.fn() },
    } as unknown as React.ComponentProps<typeof ProfessionalAvailabilityScreen>;

    render(<ProfessionalAvailabilityScreen {...props} />);

    await screen.findByText('Patrones rápidos');
    fireEvent.press(screen.getByText('Añadir excepción'));
    fireEvent.press(screen.getByLabelText('Seleccionar 2026-06-09'));
    fireEvent.press(screen.getByLabelText('Seleccionar 2026-06-16'));

    expect(screen.getByText('9-16 jun · 8 días')).toBeTruthy();
    fireEvent.press(screen.getByText('Formación'));
    const blockButtons = screen.getAllByText('Bloquear periodo');
    fireEvent.press(blockButtons[blockButtons.length - 1]);

    await waitFor(() => {
      expect(mockedAvailabilityService.addExceptionRange).toHaveBeenCalledWith(
        '2026-06-09',
        '2026-06-16',
        'Formación',
      );
    });
  });

  it('warns when an absence range contains active sessions', async () => {
    mockedAvailabilityService.getExceptionRangeImpact.mockResolvedValue({ activeSessionCount: 3 });
    const props = {
      navigation: { navigate: jest.fn() },
    } as unknown as React.ComponentProps<typeof ProfessionalAvailabilityScreen>;

    render(<ProfessionalAvailabilityScreen {...props} />);

    await screen.findByText('Patrones rápidos');
    fireEvent.press(screen.getByText('Añadir excepción'));
    fireEvent.press(screen.getByLabelText('Seleccionar 2026-06-09'));

    expect(await screen.findByText('Hay 3 sesiones activas en este periodo. Se mantienen programadas.')).toBeTruthy();
  });

  it('groups consecutive exceptions and removes the whole period in one action', async () => {
    const createException = (
      id: string,
      date: string,
      reason: string
    ): availabilityService.AvailabilityException => ({
      id,
      specialistId: 'specialist-1',
      date,
      reason,
      isAvailable: false,
      createdAt: '2026-06-01T00:00:00.000Z',
      updatedAt: '2026-06-01T00:00:00.000Z',
    });
    mockedAvailabilityService.getMyExceptions.mockResolvedValue([
      createException('exception-1', '2026-06-09T00:00:00.000Z', 'Vacaciones'),
      createException('exception-2', '2026-06-10T00:00:00.000Z', 'Vacaciones'),
      createException('exception-3', '2026-06-11T00:00:00.000Z', 'Vacaciones'),
    ]);
    const props = {
      navigation: { navigate: jest.fn() },
    } as unknown as React.ComponentProps<typeof ProfessionalAvailabilityScreen>;

    render(<ProfessionalAvailabilityScreen {...props} />);

    expect(await screen.findByText('9-11 jun')).toBeTruthy();
    expect(screen.getByText('Vacaciones · 3 días')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Eliminar bloqueo 9-11 jun'));

    const removeAlert = mockedShowAppAlert.mock.calls.find((call) => call[1] === 'Eliminar periodo');
    const buttons = removeAlert?.[3] as Array<{ text: string; onPress?: () => void | Promise<void> }> | undefined;
    expect(buttons).toBeDefined();

    await act(async () => {
      await buttons?.[1]?.onPress?.();
    });

    await waitFor(() => {
      expect(mockedAvailabilityService.removeExceptionRange).toHaveBeenCalledWith(
        '2026-06-09',
        '2026-06-11',
        'Vacaciones',
      );
    });
    expect(mockedAvailabilityService.removeException).not.toHaveBeenCalled();
  });

  it('removes legacy grouped exceptions with one range request', async () => {
    const createException = (
      id: string,
      date: string,
      reason: string
    ): availabilityService.AvailabilityException => ({
      id,
      specialistId: 'specialist-1',
      date,
      reason,
      isAvailable: false,
      createdAt: '2026-06-01T00:00:00.000Z',
      updatedAt: '2026-06-01T00:00:00.000Z',
    });
    mockedAvailabilityService.getMyExceptions.mockResolvedValue([
      createException('exception-1', '2026-06-09T00:00:00.000Z', 'Conferencia'),
      createException('exception-2', '2026-06-10T00:00:00.000Z', 'Conferencia'),
    ]);
    const props = {
      navigation: { navigate: jest.fn() },
    } as unknown as React.ComponentProps<typeof ProfessionalAvailabilityScreen>;

    render(<ProfessionalAvailabilityScreen {...props} />);

    expect(await screen.findByText('9-10 jun')).toBeTruthy();
    expect(screen.getByText('Conferencia · 2 días')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Eliminar bloqueo 9-10 jun'));

    const removeAlert = mockedShowAppAlert.mock.calls.find((call) => call[1] === 'Eliminar periodo');
    const buttons = removeAlert?.[3] as Array<{ text: string; onPress?: () => void | Promise<void> }> | undefined;
    expect(buttons).toBeDefined();

    await act(async () => {
      await buttons?.[1]?.onPress?.();
    });

    await waitFor(() => {
      expect(mockedAvailabilityService.removeExceptionRange).toHaveBeenCalledWith(
        '2026-06-09',
        '2026-06-10',
        'Conferencia',
      );
    });
    expect(mockedAvailabilityService.removeException).not.toHaveBeenCalled();
  });

  it('replaces selected days and activates disabled destinations before saving', async () => {
    mockedAvailabilityService.getMyWeeklySchedule.mockResolvedValue({
      ...emptyWeeklySchedule,
      monday: { start: '14:00', end: '20:00' },
    });
    const props = {
      navigation: { navigate: jest.fn() },
    } as unknown as React.ComponentProps<typeof ProfessionalAvailabilityScreen>;

    render(<ProfessionalAvailabilityScreen {...props} />);

    await screen.findByText('Patrones rápidos');
    fireEvent.press(screen.getByLabelText('Abrir patrones rápidos'));
    fireEvent.press(screen.getByLabelText('Elegir patrón Mañana'));
    fireEvent.press(screen.getByLabelText('Seleccionar Lunes para patrón'));
    fireEvent.press(screen.getByLabelText('Seleccionar Domingo para patrón'));

    expect(screen.getByText('Mañana (8-14 h) -> Lunes, Domingo')).toBeTruthy();

    fireEvent.press(screen.getByText('Aplicar'));
    await waitFor(() => {
      expect(screen.getByText('Cambios sin guardar')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('Guardar'));

    await waitFor(() => {
      expect(mockedAvailabilityService.updateWeeklySchedule).toHaveBeenCalledWith({
        monday: { start: '08:00', end: '14:00' },
        tuesday: null,
        wednesday: null,
        thursday: null,
        friday: null,
        saturday: null,
        sunday: { start: '08:00', end: '14:00' },
      });
    });
  });

  it('expands quick patterns when the availability tour prepares the preset step', async () => {
    const props = {
      navigation: { navigate: jest.fn() },
    } as unknown as React.ComponentProps<typeof ProfessionalAvailabilityScreen>;

    render(<ProfessionalAvailabilityScreen {...props} />);

    await screen.findByText('Patrones rápidos');
    expect(screen.queryByText('Elegir horario')).toBeNull();

    const presetsPreparation = mockedUseProfessionalTourStepPreparation.mock.calls.find(
      ([targetId]) => targetId === 'professional.availability.presets',
    )?.[1];

    expect(presetsPreparation).toEqual(expect.any(Function));

    await act(async () => {
      await presetsPreparation?.();
    });

    expect(screen.getByText('Elegir horario')).toBeTruthy();
  });

  it('keeps manual grid slots available until 23:00', async () => {
    const props = {
      navigation: { navigate: jest.fn() },
    } as unknown as React.ComponentProps<typeof ProfessionalAvailabilityScreen>;

    render(<ProfessionalAvailabilityScreen {...props} />);

    await screen.findByText('Patrones rápidos');
    fireEvent.press(screen.getByLabelText('Activar Lunes'));
    fireEvent.press(screen.getByLabelText('Lunes 22:30'));

    await waitFor(() => {
      expect(screen.getByText('Cambios sin guardar')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('Guardar'));

    await waitFor(() => {
      expect(mockedAvailabilityService.updateWeeklySchedule).toHaveBeenCalledWith({
        monday: { start: '22:30', end: '23:00' },
        tuesday: null,
        wednesday: null,
        thursday: null,
        friday: null,
        saturday: null,
        sunday: null,
      });
    });
  });

  it('expands manual grid edits as a single continuous range', async () => {
    const props = {
      navigation: { navigate: jest.fn() },
    } as unknown as React.ComponentProps<typeof ProfessionalAvailabilityScreen>;

    render(<ProfessionalAvailabilityScreen {...props} />);

    await screen.findByText('Patrones rápidos');
    fireEvent.press(screen.getByLabelText('Activar Lunes'));
    fireEvent.press(screen.getByLabelText('Lunes 08:00'));
    fireEvent.press(screen.getByLabelText('Lunes 10:00'));

    await waitFor(() => {
      expect(screen.getByText('Cambios sin guardar')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('Guardar'));

    await waitFor(() => {
      expect(mockedAvailabilityService.updateWeeklySchedule).toHaveBeenCalledWith({
        monday: { start: '08:00', end: '10:30' },
        tuesday: null,
        wednesday: null,
        thursday: null,
        friday: null,
        saturday: null,
        sunday: null,
      });
    });
  });

  it('trims a manual continuous range from the selected edge', async () => {
    mockedAvailabilityService.getMyWeeklySchedule.mockResolvedValue({
      ...emptyWeeklySchedule,
      monday: { start: '08:00', end: '10:00' },
    });
    const props = {
      navigation: { navigate: jest.fn() },
    } as unknown as React.ComponentProps<typeof ProfessionalAvailabilityScreen>;

    render(<ProfessionalAvailabilityScreen {...props} />);

    await screen.findByText('Patrones rápidos');
    fireEvent.press(screen.getByLabelText('Lunes 08:00'));

    await waitFor(() => {
      expect(screen.getByText('Cambios sin guardar')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('Guardar'));

    await waitFor(() => {
      expect(mockedAvailabilityService.updateWeeklySchedule).toHaveBeenCalledWith({
        monday: { start: '08:30', end: '10:00' },
        tuesday: null,
        wednesday: null,
        thursday: null,
        friday: null,
        saturday: null,
        sunday: null,
      });
    });
  });

  it('blocks interior slot clicks so manual edits cannot create gaps', async () => {
    mockedAvailabilityService.getMyWeeklySchedule.mockResolvedValue({
      ...emptyWeeklySchedule,
      monday: { start: '08:00', end: '10:00' },
    });
    const props = {
      navigation: { navigate: jest.fn() },
    } as unknown as React.ComponentProps<typeof ProfessionalAvailabilityScreen>;

    render(<ProfessionalAvailabilityScreen {...props} />);

    await screen.findByText('Patrones rápidos');
    fireEvent.press(screen.getByLabelText('Lunes 09:00'));

    expect(screen.getByText('Cada día guarda un único tramo continuo. Ajusta el inicio o el final desde los extremos.')).toBeTruthy();
    expect(screen.queryByText('Cambios sin guardar')).toBeNull();
    expect(mockedAvailabilityService.updateWeeklySchedule).not.toHaveBeenCalled();
  });

  it('shows late availability slots in preview instead of truncating the list', async () => {
    mockedAvailabilityService.getMyWeeklySchedule.mockResolvedValue({
      ...emptyWeeklySchedule,
      monday: { start: '07:00', end: '23:00' },
    });
    const props = {
      navigation: { navigate: jest.fn() },
    } as unknown as React.ComponentProps<typeof ProfessionalAvailabilityScreen>;

    render(<ProfessionalAvailabilityScreen {...props} />);

    await screen.findByText('Patrones rápidos');
    fireEvent.press(screen.getByText('Vista previa'));

    expect(screen.getByText('22:30')).toBeTruthy();
  });
});
