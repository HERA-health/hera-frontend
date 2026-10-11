import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { lightTheme } from '../../../constants/theme';
import { useTheme } from '../../../contexts/ThemeContext';
import { loadPublicPackages } from '../../../services/packageService';
import { showAppAlert } from '../../common/alert';
import { ProfilePackages } from '../ProfilePackages';
import { offer, patientPackage } from '../testing/packageFixtures';
let mockAuth = { isAuthenticated: true, user: { type: 'client' }, legalStatusSnapshot: { requiresAcceptance: false } };
let mockAcquired = patientPackage;
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ navigate: mockNavigate, getState: () => ({ routeNames: ['Booking'] }) }) }));
jest.mock('../../../contexts/AuthContext', () => ({ useAuth: () => mockAuth }));
jest.mock('../../../contexts/ThemeContext', () => ({ useTheme: jest.fn() }));
jest.mock('../../../services/packageService', () => ({ loadPublicPackages: jest.fn(), packagePrice: (n: number) => `${(n / 100).toFixed(2)} €`, packageModality: (type: string) => type }));
jest.mock('../../../services/packagePaymentService', () => ({ storePackagePaymentAccess: jest.fn() }));
jest.mock('../../common/alert', () => ({ useAppAlert: jest.fn(), showAppAlert: jest.fn() }));
jest.mock('../PackageAcquisition', () => ({ PackageAcquisition: ({ onAcquired }: { onAcquired: (row: typeof mockAcquired) => void }) => {
  const React = require('react'); const { Text } = require('react-native');
  return React.createElement(Text, { onPress: () => onAcquired(mockAcquired) }, 'Confirmar adquisición sintética');
} }));
beforeEach(() => {
  jest.clearAllMocks(); mockAuth = { isAuthenticated: true, user: { type: 'client' }, legalStatusSnapshot: { requiresAcceptance: false } }; mockAcquired = patientPackage;
  jest.mocked(useTheme).mockReturnValue({ theme: lightTheme, isDark: false, mode: 'light', setMode: jest.fn() });
  jest.mocked(loadPublicPackages).mockResolvedValue([offer]);
});
test('renders package conditions in the profile and sends acquired coverage to booking', async () => {
  render(<ProfilePackages specialistId="specialist" intentToken="directory-intent" />);
  fireEvent.press(await screen.findByText('Solicitar bono'));
  expect(screen.getByText(offer.description!)).toBeTruthy(); expect(screen.getByText(/VIDEO_CALL · 50 min/)).toBeTruthy();
  fireEvent.press(screen.getByText('Confirmar adquisición sintética'));
  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('Booking', { specialistId: 'specialist', patientPackageId: 'acquired' }));
});
test('a pending online payment goes to payment instead of booking', async () => {
  mockAcquired = { ...patientPackage, payment: { mode: 'ONLINE', available: true, termsVersion: 'v1', status: 'UNPAID', required: true, canReserve: false, canPay: true, issueCode: null, checkoutUrl: null, paidAt: null, totalCents: 54000 } };
  render(<ProfilePackages specialistId="specialist" />); fireEvent.press(await screen.findByText('Solicitar bono')); fireEvent.press(screen.getByText('Confirmar adquisición sintética'));
  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('PackagePayment', { patientPackageId: 'acquired' }));
});
test('preserves legal and account gates before starting an acquisition', async () => {
  mockAuth.legalStatusSnapshot.requiresAcceptance = true;
  const view = render(<ProfilePackages specialistId="specialist" />); fireEvent.press(await screen.findByText('Solicitar bono'));
  expect(mockNavigate).toHaveBeenCalledWith('RequiredLegalAcceptance'); expect(screen.queryByText('Confirmar adquisición sintética')).toBeNull();
  mockAuth = { ...mockAuth, user: { type: 'professional' }, legalStatusSnapshot: { requiresAcceptance: false } };
  view.rerender(<ProfilePackages specialistId="specialist" />); fireEvent.press(screen.getByText('Solicitar bono'));
  expect(showAppAlert).toHaveBeenCalled(); expect(screen.queryByText('Confirmar adquisición sintética')).toBeNull();
});
