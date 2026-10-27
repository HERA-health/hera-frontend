import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { lightTheme } from '../../../constants/theme';
import { useTheme } from '../../../contexts/ThemeContext';
import { loadPublicPackageCatalog } from '../../../services/packageService';
import { showAppAlert } from '../../common/alert';
import { ProfilePackages } from '../ProfilePackages';
import { offer, patientPackage } from '../testing/packageFixtures';
let mockAuth = { isAuthenticated: true, user: { type: 'client' }, legalStatusSnapshot: { requiresAcceptance: false } };
let mockAcquired = patientPackage;
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ navigate: mockNavigate, getState: () => ({ routeNames: ['Booking'] }) }) }));
jest.mock('../../../contexts/AuthContext', () => ({ useAuth: () => mockAuth }));
jest.mock('../../../contexts/ThemeContext', () => ({ useTheme: jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: require('react-native').View }));
jest.mock('../../../services/packageService', () => ({ loadPublicPackageCatalog: jest.fn(), packagePrice: (n: number) => `${(n / 100).toFixed(2)} €`, packageModality: (type: string) => type }));
jest.mock('../../../services/packagePaymentService', () => ({ storePackagePaymentAccess: jest.fn() }));
jest.mock('../../common/alert', () => ({ useAppAlert: jest.fn(), showAppAlert: jest.fn() }));
jest.mock('../PackageAcquisition', () => ({ PackageAcquisition: ({ onAcquired, onClose }: { onAcquired: (row: typeof mockAcquired) => void; onClose: () => void }) => {
  const React = require('react'); const { Text, View } = require('react-native');
  return React.createElement(View, {}, React.createElement(Text, { onPress: () => onAcquired(mockAcquired) }, 'Confirmar adquisición sintética'),
    React.createElement(Text, { onPress: onClose }, 'Cerrar adquisición sintética'));
} }));
beforeEach(() => {
  jest.clearAllMocks(); mockAuth = { isAuthenticated: true, user: { type: 'client' }, legalStatusSnapshot: { requiresAcceptance: false } }; mockAcquired = patientPackage;
  jest.mocked(useTheme).mockReturnValue({ theme: lightTheme, isDark: false, mode: 'light', setMode: jest.fn() });
  jest.mocked(loadPublicPackageCatalog).mockResolvedValue({ offers: [offer], acquisitionsEnabled: true });
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

test('the public presentation distinguishes loading from no available packages', async () => {
  jest.mocked(loadPublicPackageCatalog).mockResolvedValueOnce({ offers: [], acquisitionsEnabled: true });
  render(<ProfilePackages editorial specialistId="specialist" />);
  expect(screen.getByText('Consultando bonos disponibles…')).toBeTruthy();
  expect(await screen.findByText('No hay bonos disponibles en este perfil. Puedes consultar las opciones de sesión individual.')).toBeTruthy();
  expect(screen.getByText('Bonos de sesiones')).toBeTruthy();
  expect(screen.queryByText('Solicitar bono')).toBeNull();
});

test('the public package list permits retry without presenting an error as an empty catalog', async () => {
  jest.mocked(loadPublicPackageCatalog).mockRejectedValueOnce(new Error('No se pudieron cargar los bonos disponibles.'));
  render(<ProfilePackages editorial specialistId="specialist" />);
  fireEvent.press(await screen.findByText('Reintentar bonos disponibles'));
  expect(screen.queryByText(/No hay bonos disponibles/)).toBeNull();
  expect(await screen.findByText('Solicitar bono')).toBeTruthy();
  expect(screen.getByText(offer.name)).toBeTruthy();
});

test('the existing internal presentation keeps an empty catalog hidden', async () => {
  jest.mocked(loadPublicPackageCatalog).mockResolvedValueOnce({ offers: [], acquisitionsEnabled: true });
  render(<ProfilePackages specialistId="specialist" />);
  await waitFor(() => expect(loadPublicPackageCatalog).toHaveBeenCalledWith('specialist'));
  expect(screen.queryByText('Bonos de sesiones')).toBeNull();
  expect(screen.queryByText(/No hay bonos disponibles/)).toBeNull();
});

test('published packages remain visible when acquisition is disabled, without offering a purchase', async () => {
  jest.mocked(loadPublicPackageCatalog).mockResolvedValue({
    offers: [
      { ...offer, name: 'Bono 5 sesiones individuales online', sessions: 5, totalCents: 20000 },
      { ...offer, id: 'couple', name: 'Bono 4 sesiones de pareja/familia online', sessions: 4, totalCents: 20000 },
    ],
    acquisitionsEnabled: false,
  });
  render(<ProfilePackages editorial specialistId="specialist" />);
  expect(await screen.findByText('Bono 5 sesiones individuales online')).toBeTruthy();
  expect(screen.getByText('Bono 4 sesiones de pareja/familia online')).toBeTruthy();
  expect(screen.getAllByText('200.00 € en total')).toHaveLength(2);
  expect(screen.getByText('La adquisición de bonos no está disponible en este momento.')).toBeTruthy();
  expect(screen.queryByText(/No hay bonos disponibles/)).toBeNull();
  expect(screen.queryByText('Solicitar bono')).toBeNull();
  expect(mockNavigate).not.toHaveBeenCalled();
});

test('the existing purchase presentation stays hidden while acquisition is disabled', async () => {
  jest.mocked(loadPublicPackageCatalog).mockResolvedValue({ offers: [offer], acquisitionsEnabled: false });
  render(<ProfilePackages specialistId="specialist" />);
  await waitFor(() => expect(loadPublicPackageCatalog).toHaveBeenCalledWith('specialist'));
  expect(screen.queryByText(offer.name)).toBeNull();
  expect(screen.queryByText('Solicitar bono')).toBeNull();
});

test('the public dialog opens from a compact action, returns from acquisition and keeps the purchase route', async () => {
  const onVisibility = jest.fn();
  render(<ProfilePackages presentation="dialog" specialistId="specialist" onModalVisibilityChange={onVisibility} />);
  await waitFor(() => expect(loadPublicPackageCatalog).toHaveBeenCalled());
  expect(screen.queryByText(offer.name)).toBeNull();
  fireEvent.press(await screen.findByRole('button', { name: 'Comprar bono de sesiones' }));
  expect(await screen.findByText(offer.name)).toBeTruthy();
  expect(onVisibility).toHaveBeenLastCalledWith(true);
  fireEvent.press(screen.getByText('Solicitar bono'));
  expect(screen.queryByLabelText('Cerrar bonos de sesiones')).toBeNull();
  fireEvent.press(screen.getByText('Cerrar adquisición sintética'));
  expect(screen.getByText(offer.name)).toBeTruthy();
  fireEvent.press(screen.getByLabelText('Cerrar bonos de sesiones'));
  expect(screen.queryByText(offer.name)).toBeNull();
  expect(onVisibility).toHaveBeenLastCalledWith(false);
  fireEvent.press(await screen.findByRole('button', { name: 'Comprar bono de sesiones' }));
  fireEvent.press(screen.getByText('Solicitar bono'));
  fireEvent.press(screen.getByText('Confirmar adquisición sintética'));
  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('Booking', { specialistId: 'specialist', patientPackageId: 'acquired' }));
  expect(loadPublicPackageCatalog).toHaveBeenCalledTimes(1);
});

test.each([false, true])('does not advertise packages before the catalog resolves (offers: %s)', async hasOffers => {
  let resolveCatalog: (catalog: Awaited<ReturnType<typeof loadPublicPackageCatalog>>) => void = () => { throw new Error('Request not started'); };
  jest.mocked(loadPublicPackageCatalog).mockReturnValueOnce(new Promise(resolve => { resolveCatalog = resolve; }));
  render(<ProfilePackages presentation="dialog" specialistId="specialist" />);
  expect(screen.queryByRole('button', { name: 'Comprar bono de sesiones' })).toBeNull();
  await act(async () => resolveCatalog({ offers: hasOffers ? [offer] : [], acquisitionsEnabled: true }));
  expect(Boolean(screen.queryByRole('button', { name: 'Comprar bono de sesiones' }))).toBe(hasOffers);
});

test('the dialog lists published offers when acquisition is disabled and hides the action for an empty catalog', async () => {
  jest.mocked(loadPublicPackageCatalog).mockResolvedValueOnce({ offers: [offer], acquisitionsEnabled: false });
  const view = render(<ProfilePackages presentation="dialog" specialistId="specialist" />);
  fireEvent.press(await screen.findByRole('button', { name: 'Comprar bono de sesiones' }));
  expect(await screen.findByText(offer.name)).toBeTruthy();
  expect(screen.getByText('La adquisición de bonos no está disponible en este momento.')).toBeTruthy();
  expect(screen.queryByText('Solicitar bono')).toBeNull();
  fireEvent.press(screen.getByLabelText('Cerrar bonos de sesiones'));
  jest.mocked(loadPublicPackageCatalog).mockResolvedValueOnce({ offers: [], acquisitionsEnabled: true });
  view.rerender(<ProfilePackages presentation="dialog" specialistId="another" />);
  await waitFor(() => expect(loadPublicPackageCatalog).toHaveBeenLastCalledWith('another'));
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Comprar bono de sesiones' })).toBeNull());
});

test('an error remains accessible through the dialog and can be retried', async () => {
  jest.mocked(loadPublicPackageCatalog).mockRejectedValueOnce(new Error('No se pudieron cargar los bonos disponibles.'));
  render(<ProfilePackages presentation="dialog" specialistId="specialist" />);
  fireEvent.press(await screen.findByRole('button', { name: 'Comprar bono de sesiones' }));
  fireEvent.press(await screen.findByText('Reintentar bonos disponibles'));
  expect(await screen.findByText(offer.name)).toBeTruthy();
  expect(screen.queryByText(/No hay bonos disponibles/)).toBeNull();
});

test('the catalog closes when legal acceptance is required so it cannot cover the destination screen', async () => {
  mockAuth.legalStatusSnapshot.requiresAcceptance = true;
  render(<ProfilePackages presentation="dialog" specialistId="specialist" />);
  fireEvent.press(await screen.findByRole('button', { name: 'Comprar bono de sesiones' }));
  fireEvent.press(await screen.findByText('Solicitar bono'));
  expect(mockNavigate).toHaveBeenCalledWith('RequiredLegalAcceptance');
  expect(screen.queryByLabelText('Cerrar bonos de sesiones')).toBeNull();
  expect(screen.queryByText('Confirmar adquisición sintética')).toBeNull();
});
