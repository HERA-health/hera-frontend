import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { lightTheme } from '../../../../constants/theme';
import { useTheme } from '../../../../contexts/ThemeContext';
import { CompactCalendarColumn, shiftBookingDate } from '../CompactCalendarColumn';

let mockLastCalendarProps: {
  current?: string;
  initialDate?: string;
  onDayPress?: (day: { dateString: string }) => void;
} = {};

jest.mock('react-native-calendars', () => ({
  Calendar: (props: typeof mockLastCalendarProps) => {
    const { Text, View } = jest.requireActual('react-native');
    mockLastCalendarProps = props;
    return (
      <View>
        <Text testID="calendar-current">{props.current}</Text>
        <Text
          testID="calendar-day"
          onPress={() => props.onDayPress?.({ dateString: '2026-08-21' })}
        >
          21
        </Text>
      </View>
    );
  },
}));

jest.mock('../../../../contexts/ThemeContext', () => ({
  useTheme: jest.fn(),
}));

const mockedUseTheme = jest.mocked(useTheme);

describe('CompactCalendarColumn accessibility and initial month', () => {
  beforeEach(() => {
    mockedUseTheme.mockReturnValue({
      theme: lightTheme,
      mode: 'light',
      isDark: false,
      setMode: jest.fn(),
    });
    mockLastCalendarProps = {};
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('opens the calendar on the month of an initial selected date', () => {
    render(
      <CompactCalendarColumn
        selectedDate="2026-08-18"
        minDate="2026-07-26"
        onDateSelect={jest.fn()}
      />,
    );

    expect(screen.queryByTestId('calendar-current')).toBeNull();
    fireEvent.press(screen.getByLabelText('Ver calendario completo'));
    expect(screen.getByTestId('calendar-current').props.children).toBe('2026-08-18');
    expect(mockLastCalendarProps.initialDate).toBe('2026-08-18');
  });

  it('blocks date changes while disabled', () => {
    const onDateSelect = jest.fn();

    render(
      <CompactCalendarColumn
        selectedDate="2026-08-18"
        minDate="2026-07-26"
        onDateSelect={onDateSelect}
        disabled
      />,
    );

    fireEvent.press(screen.getByLabelText('Ver calendario completo'));
    fireEvent.press(screen.getAllByRole('radio')[0]);
    expect(screen.queryByTestId('calendar-day')).toBeNull();
    expect(onDateSelect).not.toHaveBeenCalled();
  });

  it('pages dates without selecting or loading a day, and cannot page before today', () => {
    const onDateSelect = jest.fn();
    render(<CompactCalendarColumn selectedDate={null} minDate="2026-10-28" onDateSelect={onDateSelect} />);
    expect(screen.getByLabelText('Fechas anteriores')).toBeDisabled();
    fireEvent.press(screen.getByLabelText('Fechas siguientes'));
    expect(screen.getByLabelText('Fechas anteriores')).toBeEnabled();
    expect(onDateSelect).not.toHaveBeenCalled();
    fireEvent.press(screen.getByLabelText('Fechas anteriores'));
    expect(screen.getByLabelText('Fechas anteriores')).toBeDisabled();
  });

  it('selects a calendar day, closes the dialog and brings that day into the strip', () => {
    const onDateSelect = jest.fn();
    render(<CompactCalendarColumn selectedDate="2026-07-26" minDate="2026-07-26" onDateSelect={onDateSelect} />);
    fireEvent.press(screen.getByLabelText('Ver calendario completo'));
    fireEvent.press(screen.getByTestId('calendar-day'));
    expect(onDateSelect).toHaveBeenCalledWith('2026-08-21');
    expect(screen.queryByTestId('calendar-current')).toBeNull();
    expect(screen.getByLabelText('viernes, 21 de agosto de 2026')).toBeTruthy();
  });

  it('keeps date arithmetic stable across DST, month and year boundaries', () => {
    expect(shiftBookingDate('2026-03-28', 2)).toBe('2026-03-30');
    expect(shiftBookingDate('2026-10-24', 2)).toBe('2026-10-26');
    expect(shiftBookingDate('2026-12-31', 1)).toBe('2027-01-01');
    expect(shiftBookingDate('2028-02-28', 1)).toBe('2028-02-29');
  });
});
