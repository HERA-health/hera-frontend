import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { ReferralDetailView } from '../ReferralDetail';
import * as service from '../../../services/referralService';
jest.mock('../../../services/referralService', () => ({ getReferral: jest.fn(), decideReferral: jest.fn(), downloadReferralDocument: jest.fn(), uploadReferralDocument: jest.fn(), removeReferralDocument: jest.fn(), retryReferralNotifications: jest.fn(), closePrivateCare: jest.fn() }));
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ navigate: jest.fn() }) }));
jest.mock('../../../contexts/ThemeContext', () => ({ useTheme: () => ({ theme: require('../../../constants/theme').lightTheme }) }));
jest.mock('expo-crypto', () => ({ randomUUID: () => '5f4ad245-35b1-4315-aad1-bbd149d53d50' }));
jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));
jest.mock('../../booking/BookingScreen', () => ({ BookingScreen: () => null }));
jest.mock('../ReferralComposer', () => ({ ReferralComposer: () => null }));
const detail: service.ReferralDetail = {
  id: 'referral-1', revision: 2, purpose: 'COMPLEMENTARY', status: 'PENDING_PATIENT', role: 'PATIENT', origin: { id: 'a', name: 'Profesional A' }, recipientId: null,
  client: { id: 'patient-1', name: 'Paciente fixture' }, content: { reason: 'PREFERENCE', explanation: 'Una alternativa para ti', summary: 'Resumen exacto', needs: '', transition: '' }, documents: [],
  candidates: [{ id: 'b', publicSlug: 'profesional-b', professionalType: null, specialization: 'Psicología', pricePerSession: 80, priceCents: 8000, languagesSpoken: ['Español'], verificationStatus: 'VERIFIED', referralCapabilities: [], referralExclusions: [], user: { name: 'Profesional B' } }],
  authorizedAt: null, withdrawnAt: null, acceptedAt: null, expiresAt: '2026-09-15T12:00:00Z', careContextId: null, agreementVersionId: null, previousId: null,
  milestones: { visible: false, booked: false, attended: false }, events: [], deliveries: [],
};
describe('decisión de paciente en derivación', () => {
  beforeEach(() => { jest.resetAllMocks(); jest.mocked(service.getReferral).mockResolvedValue(detail); });
  it('requires explicit adult and sharing decisions before sending the chosen recipient and revision', async () => {
    const view = render(<ReferralDetailView id="referral-1" access={{}} onBack={jest.fn()} />);
    await view.findByText('Resumen exacto');
    const authorize = view.getByRole('button', { name: 'Autorizar y enviar al elegido' });
    expect(authorize.props.accessibilityState.disabled).toBe(true);
    fireEvent.press(view.getByRole('checkbox', { name: 'Soy mayor de edad y decido por mí mismo, sin representación' }));
    fireEvent.press(view.getByRole('checkbox', { name: 'Autorizo enviar al profesional elegido la explicación, el resumen y los documentos que acabo de revisar' }));
    fireEvent.press(view.getByRole('button', { name: 'Autorizar y enviar al elegido' }));
    await waitFor(() => expect(service.decideReferral).toHaveBeenCalledWith('referral-1', expect.objectContaining({ action: 'AUTHORIZE', recipientId: 'b', revision: 2, adultAndSelfDeciding: true, coordinationAuthorized: false }), {}));
  });
  it('retains the reviewed content and choices after a recoverable mutation failure', async () => {
    jest.mocked(service.decideReferral).mockRejectedValue(new Error('Fallo recuperable'));
    const view = render(<ReferralDetailView id="referral-1" access={{}} onBack={jest.fn()} />);
    await view.findByText('Resumen exacto');
    fireEvent.press(view.getByRole('button', { name: 'Rechazar la propuesta' }));
    await view.findByText('Fallo recuperable');
    expect(view.getByText('Resumen exacto')).toBeTruthy();
    fireEvent.press(view.getByRole('button', { name: 'Rechazar la propuesta' }));
    await waitFor(() => expect(service.decideReferral).toHaveBeenCalledTimes(2));
    expect(jest.mocked(service.decideReferral).mock.calls[0][1].commandKey).toEqual(jest.mocked(service.decideReferral).mock.calls[1][1].commandKey);
  });
});
