import React from 'react';
import { render, screen } from '@testing-library/react-native';

import { darkTheme } from '../../../../constants/theme';
import { useTheme } from '../../../../contexts/ThemeContext';
import CalendarPanel from '../CalendarPanel';

jest.mock('../../../../contexts/ThemeContext', () => ({
  useTheme: jest.fn(),
}));

const mockedUseTheme = jest.mocked(useTheme);

describe('CalendarPanel locale', () => {
  beforeEach(() => {
    mockedUseTheme.mockReturnValue({
      theme: darkTheme,
      mode: 'dark',
      isDark: true,
      setMode: jest.fn(),
    } as unknown as ReturnType<typeof useTheme>);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the month and weekday headers in Spanish', () => {
    render(
      <CalendarPanel
        sessions={[]}
        selectedDate="2026-07-10"
        onDateSelect={jest.fn()}
      />
    );

    expect(
      screen.getByTestId('patient-sessions-calendar.header.title', { includeHiddenElements: true })
    ).toHaveTextContent('Julio 2026');

    ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].forEach((dayName) => {
      expect(
        screen.getByTestId(`patient-sessions-calendar.header.dayName_${dayName}`, {
          includeHiddenElements: true,
        })
      ).toHaveTextContent(dayName);
    });

    expect(
      screen.queryByTestId('patient-sessions-calendar.header.dayName_Mon', {
        includeHiddenElements: true,
      })
    ).toBeNull();
  });
});
