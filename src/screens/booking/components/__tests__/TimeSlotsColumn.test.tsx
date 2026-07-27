import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { lightTheme } from '../../../../constants/theme';
import { useTheme } from '../../../../contexts/ThemeContext';
import { TimeSlotsColumn } from '../TimeSlotsColumn';

jest.mock('../../../../contexts/ThemeContext', () => ({
  useTheme: jest.fn(),
}));

const mockedUseTheme = jest.mocked(useTheme);

describe('TimeSlotsColumn disabled slot UX', () => {
  beforeEach(() => {
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

  it('renders disabled slot options without letting patients select them', () => {
    const onTimeSelect = jest.fn();
    const availableSlot = { startTime: '11:30', endTime: '12:30', available: true };

    render(
      <TimeSlotsColumn
        selectedDate="2026-06-15"
        availableSlots={[
          { startTime: '10:15', endTime: '11:15', available: false },
          availableSlot,
        ]}
        selectedTime={null}
        onTimeSelect={onTimeSelect}
        loading={false}
      />
    );

    expect(screen.getByText('Elige una hora')).toBeTruthy();
    expect(screen.getByText('No disponible')).toBeTruthy();

    fireEvent.press(screen.getByText('10:15'));
    expect(onTimeSelect).not.toHaveBeenCalled();

    fireEvent.press(screen.getByText('11:30'));
    expect(onTimeSelect).toHaveBeenCalledWith(availableSlot);
  });

  it('keeps the empty state compact and explains the next action', () => {
    render(
      <TimeSlotsColumn
        selectedDate={null}
        availableSlots={[]}
        selectedTime={null}
        onTimeSelect={jest.fn()}
      />
    );

    expect(screen.getByText('Tu horario aparecerá aquí')).toBeTruthy();
    expect(screen.getByText('Cuando marques un día, te mostraremos las horas disponibles.')).toBeTruthy();
  });

  it('offers a retry action when availability cannot be loaded', () => {
    const onRetry = jest.fn();

    render(
      <TimeSlotsColumn
        selectedDate="2026-06-15"
        availableSlots={[]}
        selectedTime={null}
        onTimeSelect={jest.fn()}
        error="No se pudieron cargar los horarios disponibles"
        onRetry={onRetry}
      />
    );

    expect(screen.getByText('No hemos podido consultar la agenda')).toBeTruthy();
    fireEvent.press(screen.getByText('Reintentar'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('blocks all slot interaction while disabled and exposes checked radio state', () => {
    const onTimeSelect = jest.fn();

    render(
      <TimeSlotsColumn
        selectedDate="2026-06-15"
        availableSlots={[
          { startTime: '10:15', endTime: '11:15', available: true },
          { startTime: '11:30', endTime: '12:30', available: true },
        ]}
        selectedTime="10:15"
        onTimeSelect={onTimeSelect}
        disabled
      />,
    );

    const selectedSlot = screen.getByLabelText('Seleccionar las 10:15');
    const otherSlot = screen.getByLabelText('Seleccionar las 11:30');

    expect(selectedSlot.props.accessibilityState).toEqual(
      expect.objectContaining({ checked: true, disabled: true }),
    );
    expect(otherSlot.props.accessibilityState).toEqual(
      expect.objectContaining({ checked: false, disabled: true }),
    );

    fireEvent.press(otherSlot);
    expect(onTimeSelect).not.toHaveBeenCalled();
  });

  it('announces loading availability as a busy live region', () => {
    render(
      <TimeSlotsColumn
        selectedDate="2026-06-15"
        availableSlots={[]}
        selectedTime={null}
        onTimeSelect={jest.fn()}
        loading
      />,
    );

    const loadingRegion = screen.getByLabelText(
      'Cargando horarios. Estamos consultando la agenda del profesional.',
    );

    expect(loadingRegion.props.accessibilityLiveRegion).toBe('polite');
    expect(loadingRegion.props.accessibilityState).toEqual(
      expect.objectContaining({ busy: true }),
    );
  });
});
