import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { lightTheme } from '../../../../constants/theme';
import { useTheme } from '../../../../contexts/ThemeContext';
import { CompactCalendarColumn } from '../CompactCalendarColumn';

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

    fireEvent.press(screen.getByTestId('calendar-day'));
    expect(onDateSelect).not.toHaveBeenCalled();
  });
});
