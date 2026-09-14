import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SpecialistDetailAdminScreen } from '../SpecialistDetailAdminScreen';
import * as adminService from '../../../services/adminService';

const mockConfirm = jest.fn();
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  useFocusEffect: effect => require('react').useEffect(effect, [effect]),
}));
jest.mock('../../../services/heraCommissionService', () => ({
  specialistAccounts: jest.fn().mockResolvedValue([
    { id: 'account-1', mode: 'LIVE', operatorKey: 'Fixture', pendingCents: 2400, creditCents: 0 },
  ]),
}));
jest.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { isAdmin: true } }) }));
jest.mock('../../../components/common/alert', () => ({ useAppAlert: () => ({ confirm: mockConfirm }) }));
jest.mock('../../../services/adminService', () => ({
  getSpecialistDetail: jest.fn(), reviewSpecialistInsuranceDocument: jest.fn(),
  openSpecialistInsuranceDocument: jest.fn(), openSpecialistCertificateDocument: jest.fn(),
  suspendSpecialist: jest.fn(), reactivateSpecialist: jest.fn(), blockSpecialistForLegalRetention: jest.fn(),
}));
jest.mock('../../../components/common', () => {
  const { Pressable, Text } = require('react-native');
  return {
    AnimatedPressable: ({ children, pressScale, ...props }) => <Pressable {...props}>{children}</Pressable>,
    Button: ({ children, ...props }) => <Pressable {...props}><Text>{children}</Text></Pressable>,
  };
});

const detail = (status = 'APPROVED') => ({
  id: 'specialist-1', specialization: 'Psicología', description: 'Descripción profesional',
  pricePerSession: 50, rating: 4.5, reviewCount: 2, certificates: [],
  verificationStatus: 'VERIFIED', insuranceUploaded: status !== 'NOT_UPLOADED',
  insuranceReviewStatus: status, profileVisible: true, offersOnline: true,
  insuranceReviewedAt: '2026-09-07T09:00:00Z',
  user: { name: 'Especialista de prueba', email: 'test@example.invalid', accountStatus: 'ACTIVE', createdAt: '2026-01-01', emailVerified: true },
  sessionStats: { total: 12, completed: 8, cancelled: 1, upcoming: 3 },
  patientStats: { hera: 3, managed: 5, total: 8 },
});
const open = async () => {
  render(<SpecialistDetailAdminScreen route={{ params: { specialistId: 'specialist-1' } }} navigation={{ goBack: jest.fn() }} />);
  await screen.findByText('Especialista de prueba', {}, { timeout: 10000 });
};
beforeEach(() => { jest.clearAllMocks(); mockConfirm.mockResolvedValue(false); });

test('shows the persisted HERA balance and opens this specialist’s transfers', async () => {
  adminService.getSpecialistDetail.mockResolvedValue(detail());
  await open();
  await screen.findByText(/Pendiente 24\.00 €/);
  fireEvent.press(screen.getByText('Gestionar comisiones y transferencias'));
  expect(mockNavigate).toHaveBeenCalledWith('HeraCommissions', { admin: true, specialistId: 'specialist-1' });
});

test.each([
  ['APPROVED', false, false, true],
  ['PENDING', true, true, false],
  ['REJECTED', true, false, false],
  ['NOT_UPLOADED', false, false, false],
])('%s exposes only the relevant insurance decisions', async (status, approve, reject, revoke) => {
  adminService.getSpecialistDetail.mockResolvedValue(detail(status));
  await open();
  expect(Boolean(screen.queryByText('Aprobar'))).toBe(approve);
  expect(Boolean(screen.queryByText('Rechazar'))).toBe(reject);
  expect(Boolean(screen.queryByText('Revocar'))).toBe(revoke);
  expect(screen.getByText('Con cuenta HERA')).toBeTruthy();
  expect(screen.getByText('Gestionados')).toBeTruthy();
});

test('cancelling revocation leaves coverage unchanged', async () => {
  adminService.getSpecialistDetail.mockResolvedValue(detail());
  await open();
  fireEvent.press(screen.getByText('Revocar'));
  await waitFor(() => expect(mockConfirm).toHaveBeenCalledWith(expect.objectContaining({ confirmLabel: 'Revocar' })));
  expect(adminService.reviewSpecialistInsuranceDocument).not.toHaveBeenCalled();
});

test('revocation refreshes the persisted status and removes the revoke action', async () => {
  mockConfirm.mockResolvedValue(true);
  adminService.getSpecialistDetail.mockResolvedValueOnce(detail()).mockResolvedValueOnce(detail('REJECTED'));
  adminService.reviewSpecialistInsuranceDocument.mockResolvedValue(undefined);
  await open();
  fireEvent.press(screen.getByText('Revocar'));
  await screen.findByText('Cobertura presencial revocada');
  expect(adminService.reviewSpecialistInsuranceDocument).toHaveBeenCalledWith('specialist-1', 'REJECTED');
  expect(screen.queryByText('Revocar')).toBeNull();
  expect(screen.getByText('Aprobar')).toBeTruthy();
});

test('failed refresh does not claim the review succeeded', async () => {
  mockConfirm.mockResolvedValue(true);
  adminService.getSpecialistDetail.mockResolvedValueOnce(detail()).mockRejectedValueOnce(new Error('Offline'));
  adminService.reviewSpecialistInsuranceDocument.mockResolvedValue(undefined);
  await open();
  fireEvent.press(screen.getByText('Revocar'));
  await screen.findByText(/No se pudo completar o actualizar la revisión/);
  expect(screen.queryByText('Cobertura presencial revocada')).toBeNull();
});

test('unavailable patient count is not shown as zero', async () => {
  adminService.getSpecialistDetail.mockResolvedValue({ ...detail(), patientStats: undefined });
  await open();
  expect(screen.getByText(/El recuento de pacientes no está disponible/)).toBeTruthy();
});

test('failed review keeps the saved state and can recover by refreshing', async () => {
  mockConfirm.mockResolvedValue(true);
  adminService.getSpecialistDetail.mockResolvedValue(detail());
  adminService.reviewSpecialistInsuranceDocument.mockRejectedValueOnce(new Error('Offline'));
  await open();
  fireEvent.press(screen.getByText('Revocar'));
  await screen.findByText(/No se pudo completar o actualizar la revisión/);
  expect(screen.getByText('Revocar')).toBeTruthy();
  fireEvent.press(screen.getByLabelText('Actualizar ficha'));
  await waitFor(() => expect(screen.queryByText(/No se pudo completar o actualizar la revisión/)).toBeNull());
  expect(adminService.getSpecialistDetail).toHaveBeenCalledTimes(2);
  expect(screen.getByText('Revocar')).toBeTruthy();
});
