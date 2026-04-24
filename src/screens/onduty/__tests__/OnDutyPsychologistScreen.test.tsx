import React from 'react';
import { render, screen } from '@testing-library/react-native';

import { darkTheme } from '../../../constants/theme';
import { useTheme } from '../../../contexts/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { AlertProvider } from '../../../components/common/alert';
import OnDutyPsychologistScreen from '../OnDutyPsychologistScreen';

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('../../../services/analyticsService', () => ({
  trackScreen: jest.fn(),
  track: jest.fn(),
}));

const mockedUseTheme = jest.mocked(useTheme);
const mockedUseNavigation = jest.mocked(useNavigation);

describe('OnDutyPsychologistScreen', () => {
  beforeEach(() => {
    mockedUseTheme.mockReturnValue({
      theme: darkTheme,
      mode: 'dark',
      isDark: true,
      setMode: jest.fn(),
    } as unknown as ReturnType<typeof useTheme>);

    mockedUseNavigation.mockReturnValue({
      navigate: jest.fn(),
      replace: jest.fn(),
      goBack: jest.fn(),
    } as ReturnType<typeof useNavigation>);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the screen as an honest demo and avoids fake immediate-operational copy', () => {
    render(
      <AlertProvider>
        <OnDutyPsychologistScreen />
      </AlertProvider>,
    );

    expect(screen.getByText('Vista previa informativa')).toBeTruthy();
    expect(screen.getByText('Demo del servicio, no canal operativo 24/7')).toBeTruthy();
    expect(screen.getByText('Explorar especialistas')).toBeTruthy();
    expect(screen.queryByText(/conectando/i)).toBeNull();
  });
});
