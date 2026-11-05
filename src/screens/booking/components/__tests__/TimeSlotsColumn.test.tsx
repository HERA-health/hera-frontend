import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { lightTheme } from '../../../../constants/theme';
import { useTheme } from '../../../../contexts/ThemeContext';
import { TimeSlotsColumn } from '../TimeSlotsColumn';

jest.mock('../../../../contexts/ThemeContext', () => ({
  useTheme: jest.fn(),
}));

const native = jest.requireActual<typeof import('react-native')>('react-native');
let dimensionsSpy: jest.SpyInstance<ReturnType<typeof native.useWindowDimensions>, []> | undefined;

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
    dimensionsSpy?.mockRestore();
  });

  it('limits the time preview to two columns in a narrow patient container', () => {
    dimensionsSpy = jest.spyOn(native, 'useWindowDimensions').mockReturnValue({ width: 1536, height: 960, scale: 1, fontScale: 1 });
    const props = { selectedDate: '2026-06-15', selectedTime: null, onTimeSelect: jest.fn(),
      availableSlots: Array.from({ length: 6 }, (_, index) => ({ startTime: `${10 + index}:00`, endTime: `${11 + index}:00`, available: true })) };
    const view = render(<TimeSlotsColumn {...props} layoutWidth={700} />);
    expect(screen.getAllByRole('radio')).toHaveLength(4);
    view.rerender(<TimeSlotsColumn {...props} />);
    expect(screen.getAllByRole('radio')).toHaveLength(6);
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

    expect(screen.getByText('Horarios disponibles')).toBeTruthy();
    expect(screen.queryByText('10:15')).toBeNull();
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

    expect(screen.getByText('Elige un día para ver los horarios disponibles.')).toBeTruthy();
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
