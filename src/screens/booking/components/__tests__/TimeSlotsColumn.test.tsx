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
});
