import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ProfileTabNavigation } from '../ProfileTabNavigation';

jest.mock('../../../../config/sessionPayments', () => ({ SESSION_PAYMENTS_VISIBLE: false }));
jest.mock('../../../../contexts/ThemeContext', () => ({ useTheme: () => ({ theme: require('../../../../constants/theme').lightTheme, isDark: false }) }));

test.each([true, false])('unpublished payments stay hidden in the patient profile (desktop=%s)', isDesktop => {
  render(<ProfileTabNavigation activeTab="information" onTabChange={jest.fn()} isDesktop={isDesktop} />);
  expect(screen.getByText('Información Personal')).toBeTruthy();
  expect(screen.queryByText('Pagos y Facturación')).toBeNull();
});
