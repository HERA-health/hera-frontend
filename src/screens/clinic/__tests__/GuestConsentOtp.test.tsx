import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { GuestConsentPublicScreen } from '../ClinicGuestConsentPublicScreen';
import { getGuestConsentFlowAdapter, type GuestConsentFlowAdapter } from '../../consent/guestConsentFlowAdapter';
import { GuestConsentHttpError } from '../../../services/guestConsentHttpClient';

jest.mock('../../consent/guestConsentFlowAdapter', () => ({ getGuestConsentFlowAdapter: jest.fn() }));
jest.mock('../../consent/GuestConsentDocumentFrame', () => ({ GuestConsentDocumentFrame: () => null }));
jest.mock('../../../services/clinicalGuestConsentPublicService', () => ({ downloadClinicalGuestReceipt: jest.fn() }));

const descriptors = new Map(['window', 'document'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
let adapter: GuestConsentFlowAdapter;
beforeEach(() => {
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {
    location: { hash: '', pathname: '/clinical-consent/guest/test', search: '' },
    history: { replaceState: jest.fn() }, setInterval, clearInterval, setTimeout, clearTimeout,
  } });
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { title: 'HERA' } });
  const now = Date.now();
  adapter = {
    parseFragment: () => null, generateNonce: () => 'nonce', bootstrap: jest.fn(), requestOtp: jest.fn(),
    resolve: jest.fn().mockResolvedValue({ stage: 'OTP_REQUIRED', status: 'PENDING', serverTime: new Date(now).toISOString(), maskedEmail: 'p***@example.test', otpDeliveryStatus: 'SENT', otpReference: 'AB12-CD34', otpExpiresAt: new Date(now + 600000).toISOString(), canResendAt: new Date(now + 60000).toISOString() }),
    verifyOtp: jest.fn().mockRejectedValue(new GuestConsentHttpError('OTP_INVALID')),
    decide: jest.fn(), loadDocument: jest.fn(), intro: 'Documento de prueba', grantLabel: 'Consentimiento informado',
  };
  jest.mocked(getGuestConsentFlowAdapter).mockReturnValue(adapter);
});
afterEach(() => {
  cleanup();
  for (const [key, descriptor] of descriptors) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else Reflect.deleteProperty(globalThis, key);
  }
  jest.clearAllMocks();
});

test('shows the email reference and guides a rejected code without claiming it expired', async () => {
  render(<GuestConsentPublicScreen requestId="test" flow="specialist" />);
  fireEvent.press(screen.getByText('Continuar y recibir código por email'));
  await screen.findByText(/Referencia del código: AB12-CD34/);
  fireEvent.changeText(screen.getByLabelText('Código de verificación de seis cifras'), '001234');
  fireEvent.press(screen.getByText('Verificar código'));
  await screen.findByText(/Comprueba la referencia del correo o solicita otro código/);
  await waitFor(() => expect(adapter.verifyOtp).toHaveBeenCalledWith('test', '001234'));
  expect(screen.getByLabelText('Código de verificación de seis cifras').props.value).toBe('');
  expect(screen.queryByText('El código no es válido, ha caducado o ha alcanzado el máximo de intentos.')).toBeNull();
});
