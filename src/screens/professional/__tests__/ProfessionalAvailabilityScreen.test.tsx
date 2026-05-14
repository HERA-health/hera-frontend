import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import { showAppAlert, useAppAlert } from '../../../components/common/alert';
import { lightTheme } from '../../../constants/theme';
import { useTheme } from '../../../contexts/ThemeContext';
import * as availabilityService from '../../../services/availabilityService';
import { billingService } from '../../../services/billingService';
import { ProfessionalAvailabilityScreen } from '../ProfessionalAvailabilityScreen';

jest.mock('react-native-calendars', () => ({
  Calendar: () => {
    const React = require('react');
    const { Text } = require('react-native');
    return <Text>calendar</Text>;
  },
}));

jest.mock('../../../components/common/alert', () => ({
  showAppAlert: jest.fn(),
  useAppAlert: jest.fn(),
}));

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: jest.fn(),
}));

jest.mock('../../../services/analyticsService', () => ({
  trackScreen: jest.fn(),
}));

jest.mock('../../../services/availabilityService', () => ({
  getMyWeeklySchedule: jest.fn(),
  getMyExceptions: jest.fn(),
  getMyBufferTime: jest.fn(),
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
    mockedUseTheme.mockReturnValue({
      theme: lightTheme,
      mode: 'light',
      isDark: false,
      setMode: jest.fn(),
    } as unknown as ReturnType<typeof useTheme>);
    mockedUseAppAlert.mockReturnValue({} as ReturnType<typeof useAppAlert>);
    mockedAvailabilityService.getMyWeeklySchedule.mockResolvedValue(emptyWeeklySchedule);
    mockedAvailabilityService.getMyExceptions.mockResolvedValue([]);
    mockedAvailabilityService.getMyBufferTime.mockResolvedValue(15);
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
});
