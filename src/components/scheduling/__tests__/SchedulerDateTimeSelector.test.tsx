import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { darkTheme, lightTheme } from '../../../constants/theme';
import { useTheme } from '../../../contexts/ThemeContext';
import { SchedulerDateTimeSelector } from '../SchedulerDateTimeSelector';
import type {
  SchedulerAvailabilityState,
  SchedulerDateTimeValue,
  SchedulerOpenPanel,
  SchedulerSlotOption,
} from '../schedulerTypes';

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: jest.fn(),
}));

jest.mock('react-native-calendars', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return {
    LocaleConfig: { locales: {}, defaultLocale: 'es' },
    Calendar: ({ onDayPress }: { onDayPress?: (day: { dateString: string }) => void }) => (
      <Text testID="shared-scheduler-calendar" onPress={() => onDayPress?.({ dateString: '2026-06-16' })}>
        calendar
      </Text>
    ),
  };
});

const mockedUseTheme = jest.mocked(useTheme);

const slots: SchedulerSlotOption[] = [
  {
    startTime: '10:00',
    endTime: '11:00',
    state: 'available',
    selectable: true,
    accessibilityStatus: 'disponible',
  },
  {
    startTime: '10:15',
    endTime: '11:15',
    state: 'unavailable',
    selectable: false,
    accessibilityStatus: 'ocupada',
    message: 'Ese hueco ya está ocupado.',
  },
  {
    startTime: '10:30',
    endTime: '11:30',
    state: 'caution',
    selectable: true,
    accessibilityStatus: 'en descanso',
    message: 'Este hueco pisa el descanso configurado.',
  },
];

interface HarnessProps {
  availabilityState?: SchedulerAvailabilityState;
  availabilityError?: string;
  retry?: jest.Mock;
}

function Harness({
  availabilityState = 'ready',
  availabilityError,
  retry,
}: HarnessProps): React.ReactElement {
  const [value, setValue] = useState<SchedulerDateTimeValue>({ date: '2026-06-15', time: '10:00' });
  const [openPanel, setOpenPanel] = useState<SchedulerOpenPanel>(null);

  return (
    <SchedulerDateTimeSelector
      value={value}
      dateLabel={value.date === '2026-06-15' ? 'Lunes, 15 de junio de 2026' : 'Martes, 16 de junio de 2026'}
      minDate="2026-06-15"
      timeZone="Europe/Madrid"
      timeZoneLabel="Hora peninsular"
      slots={slots}
      availabilityState={availabilityState}
      availabilityError={availabilityError}
      openPanel={openPanel}
      legendLabels={{ available: 'Disponible', unavailable: 'No disponible', caution: 'Descanso' }}
      testIDPrefix="shared-scheduler"
      onDateChange={(date) => setValue((current) => ({ ...current, date }))}
      onTimeChange={(time) => setValue((current) => ({ ...current, time }))}
      onOpenPanelChange={setOpenPanel}
      onRetryAvailability={retry}
    />
  );
}

describe('SchedulerDateTimeSelector', () => {
  beforeEach(() => {
    mockedUseTheme.mockReturnValue({
      theme: lightTheme,
      mode: 'light',
      isDark: false,
      setMode: jest.fn(),
    });
  });

  it('selects a calendar date and exposes the Madrid timezone', () => {
    render(<Harness />);

    const dateTrigger = screen.getByLabelText('Seleccionar fecha');
    expect(dateTrigger.props.accessibilityState.expanded).toBe(false);
    fireEvent.press(dateTrigger);
    expect(screen.getByLabelText('Seleccionar fecha').props.accessibilityState.expanded).toBe(true);
    fireEvent.press(screen.getByTestId('shared-scheduler-calendar'));

    expect(screen.getByText('Martes, 16 de junio de 2026')).toBeTruthy();
    expect(screen.getByText('Hora peninsular · Europe/Madrid')).toBeTruthy();
    expect(screen.getByLabelText('Seleccionar fecha').props.accessibilityState.expanded).toBe(false);
  });

  it('uses radio semantics and keeps unavailable slots blocked', () => {
    render(<Harness />);

    fireEvent.press(screen.getByLabelText('Seleccionar hora'));
    expect(screen.getByLabelText('Horarios en Hora peninsular').props.accessibilityRole).toBe('radiogroup');
    expect(screen.getByLabelText('Hora 10:15, ocupada').props.accessibilityState.disabled).toBe(true);
    expect(screen.getByLabelText('Hora 10:00, disponible').props.accessibilityState.checked).toBe(true);

    fireEvent.press(screen.getByLabelText('Hora 10:30, en descanso'));
    expect(screen.getByTestId('shared-scheduler-time-input').props.value).toBe('10:30');
    expect(screen.getByText('Este hueco pisa el descanso configurado.')).toBeTruthy();
  });

  it('normalizes keyboard input on blur without hiding invalid values', () => {
    render(<Harness />);
    const input = screen.getByTestId('shared-scheduler-time-input');

    fireEvent.changeText(input, '9:30');
    fireEvent(input, 'blur');
    expect(screen.getByTestId('shared-scheduler-time-input').props.value).toBe('09:30');

    fireEvent.changeText(screen.getByTestId('shared-scheduler-time-input'), '9:75');
    fireEvent(screen.getByTestId('shared-scheduler-time-input'), 'blur');
    expect(screen.getByTestId('shared-scheduler-time-input').props.value).toBe('9:75');
    expect(screen.getByText('Selecciona una franja horaria de la lista')).toBeTruthy();
  });

  it('closes the time panel with Escape and reports loading accessibly', () => {
    render(<Harness availabilityState="loading" />);

    expect(screen.getByText('Comprobando disponibilidad…')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Seleccionar hora'));
    expect(screen.getByLabelText('Seleccionar hora').props.accessibilityState.expanded).toBe(true);
    fireEvent(screen.getByTestId('shared-scheduler-time-input'), 'keyPress', {
      nativeEvent: { key: 'Escape' },
    });
    expect(screen.getByLabelText('Seleccionar hora').props.accessibilityState.expanded).toBe(false);
  });

  it('offers an honest availability retry and supports dark theme rendering', () => {
    const retry = jest.fn();
    mockedUseTheme.mockReturnValue({
      theme: darkTheme,
      mode: 'dark',
      isDark: true,
      setMode: jest.fn(),
    });

    render(
      <Harness
        availabilityState="error"
        availabilityError="No se pudieron comprobar huecos. Se validará al guardar."
        retry={retry}
      />,
    );

    expect(screen.getByTestId('shared-scheduler-availability-error').props.accessibilityRole).toBe('alert');
    fireEvent.press(screen.getByLabelText('Reintentar disponibilidad'));
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
