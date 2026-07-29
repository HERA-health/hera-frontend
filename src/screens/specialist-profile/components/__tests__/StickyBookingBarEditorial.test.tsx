import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { lightTheme } from '../../../../constants/theme';
import { useTheme } from '../../../../contexts/ThemeContext';
import { StickyBookingBarEditorial } from '../StickyBookingBarEditorial';

jest.mock('../../../../contexts/ThemeContext', () => ({ useTheme: jest.fn() }));

const mockedUseTheme = jest.mocked(useTheme);

describe('StickyBookingBarEditorial', () => {
  beforeEach(() => {
    mockedUseTheme.mockReturnValue({
      theme: lightTheme,
      mode: 'light',
      isDark: false,
      setMode: jest.fn(),
    } as unknown as ReturnType<typeof useTheme>);
  });

  afterEach(() => jest.clearAllMocks());

  it('qualifies the free-session message instead of promising it unconditionally', () => {
    render(
      <StickyBookingBarEditorial
        specialistName="María Lansac"
        pricePerSession={60}
        firstVisitFree
        onBookPress={jest.fn()}
        visible
      />,
    );

    expect(screen.getByText('Gratis si es tu primera sesión')).toBeTruthy();
    expect(screen.queryByText('Primera sesión gratuita')).toBeNull();
  });
});