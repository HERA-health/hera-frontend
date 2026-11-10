import React from 'react';
import { Linking } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SubscriptionRequestModal } from '../components/SubscriptionRequestModal';
import { PRICING_PLANS } from '../pricingContent';
import { getSubscriptionConditions, submitSubscriptionRequest, SubscriptionRequestError, type SubscriptionConditions } from '../../../services/subscriptionRequestService';

jest.mock('../../../contexts/ThemeContext', () => ({ useTheme: () => ({ theme: require('../../../constants/theme').lightTheme, isDark: false }) }));
jest.mock('../../../services/api', () => ({ publicApi: { get: jest.fn(), post: jest.fn() } }));
jest.mock('../../../services/legalReader', () => ({ legalReaderUrl: (_key: string, version: string) => `https://www.health-hera.com/legal/privacidad/${version}` }));
jest.mock('../../../services/subscriptionRequestService', () => ({
  ...jest.requireActual('../../../services/subscriptionRequestService'),
  getSubscriptionConditions: jest.fn(), submitSubscriptionRequest: jest.fn(),
}));
const conditions: SubscriptionConditions = {
  title: 'Condiciones de solicitud de suscripción', version: 'fixture-v1', contentHash: 'a'.repeat(64),
  paragraphs: ['HERA confirma manualmente el inicio del mes gratuito.', 'La continuidad de pago es voluntaria.'],
  privacy: { title: 'Política de privacidad', version: 'privacy-v1', contentHash: 'b'.repeat(64), publicPath: '/legal/privacidad/privacy-v1' },
};
const load = jest.mocked(getSubscriptionConditions);
const send = jest.mocked(submitSubscriptionRequest);
const accept = () => fireEvent.press(screen.getByRole('checkbox'));
function fill() {
  fireEvent.changeText(screen.getByLabelText('Nombre'), 'Nombre sintético');
  fireEvent.changeText(screen.getByLabelText('Apellidos'), 'Apellidos sintéticos');
  fireEvent.changeText(screen.getByLabelText('Email'), 'fixture@example.invalid');
}
async function open(plan = PRICING_PLANS[0], onClose = jest.fn()) {
  render(<SubscriptionRequestModal plan={plan} onClose={onClose} />);
  await screen.findByRole('checkbox');
}
beforeEach(() => { jest.clearAllMocks(); load.mockResolvedValue(conditions); send.mockResolvedValue(undefined); });

it.each(PRICING_PLANS)('submits $name with optional fields empty and only confirms after success', async plan => {
  await open(plan);
  expect(screen.getByLabelText('Solicitar prueba gratuita')).toBeDisabled();
  fill(); accept();
  fireEvent.press(screen.getByLabelText('Solicitar prueba gratuita'));
  await screen.findByText('Solicitud enviada correctamente');
  expect(send).toHaveBeenCalledWith(expect.objectContaining({
    planId: plan.id, email: 'fixture@example.invalid', phone: '', licenseNumber: '', accepted: true,
    conditionsVersion: conditions.version, conditionsHash: conditions.contentHash,
    privacyVersion: conditions.privacy.version, privacyHash: conditions.privacy.contentHash,
  }));
  expect(screen.getByText(`Hemos recibido tu solicitud para el plan ${plan.name}. HERA contactará contigo por email para confirmar la activación de tu prueba gratuita.`)).toBeTruthy();
});

it('validates required fields and email before contacting the backend', async () => {
  await open(); accept();
  fireEvent.press(screen.getByLabelText('Solicitar prueba gratuita'));
  expect(screen.getByText('Introduce tu nombre.')).toBeTruthy();
  expect(screen.getByText('Introduce tus apellidos.')).toBeTruthy();
  fill(); fireEvent.changeText(screen.getByLabelText('Email'), 'not-an-email');
  fireEvent.press(screen.getByLabelText('Solicitar prueba gratuita'));
  expect(screen.getByText('Introduce un email válido.')).toBeTruthy();
  expect(send).not.toHaveBeenCalled();
});

it('keeps contact fields when reading conditions or opening privacy', async () => {
  const link = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  await open(); fill();
  fireEvent.press(screen.getByText('Leer condiciones'));
  expect(screen.getByText(conditions.paragraphs[0])).toBeTruthy();
  fireEvent.press(screen.getByText('Política de privacidad ↗'));
  expect(link).toHaveBeenCalledWith(expect.stringContaining('/legal/privacidad/privacy-v1'));
  fireEvent.press(screen.getByText('Ocultar condiciones'));
  expect(screen.getByLabelText('Email').props.value).toBe('fixture@example.invalid');
  link.mockRestore();
});

it('blocks repeated submission and closing while the email is pending', async () => {
  let complete: () => void = () => { throw new Error('Missing pending request'); };
  send.mockReturnValue(new Promise<void>(resolve => { complete = resolve; }));
  const close = jest.fn();
  await open(PRICING_PLANS[0], close); fill(); accept();
  const button = screen.getByLabelText('Solicitar prueba gratuita');
  fireEvent.press(button); fireEvent.press(button);
  fireEvent.press(screen.getByLabelText('Cerrar solicitud'));
  expect(send).toHaveBeenCalledTimes(1);
  expect(close).not.toHaveBeenCalled();
  expect(screen.queryByText('Solicitud enviada correctamente')).toBeNull();
  await act(async () => { complete(); });
  expect(screen.getByText('Solicitud enviada correctamente')).toBeTruthy();
});

it.each(['No hemos podido confirmar el envío.', 'Has alcanzado el límite de solicitudes.'])('keeps data and permits retry after %s', async message => {
  send.mockRejectedValueOnce(new SubscriptionRequestError(message));
  await open(); fill(); accept();
  fireEvent.press(screen.getByLabelText('Solicitar prueba gratuita'));
  await screen.findByText(message);
  expect(screen.getByLabelText('Email').props.value).toBe('fixture@example.invalid');
  expect(screen.queryByText('Solicitud enviada correctamente')).toBeNull();
  fireEvent.press(screen.getByLabelText('Solicitar prueba gratuita'));
  await screen.findByText('Solicitud enviada correctamente');
});

it('reloads stale conditions and requires fresh acceptance without discarding the form', async () => {
  await open(); fill(); accept();
  load.mockResolvedValue({ ...conditions, version: 'fixture-v2', contentHash: 'c'.repeat(64) });
  send.mockRejectedValueOnce(new SubscriptionRequestError('Las condiciones han cambiado.', true));
  fireEvent.press(screen.getByLabelText('Solicitar prueba gratuita'));
  await screen.findByText('Versión fixture-v2');
  expect(screen.getByRole('checkbox')).toHaveAccessibilityState({ checked: false });
  expect(screen.getByLabelText('Solicitar prueba gratuita')).toBeDisabled();
  expect(screen.getByLabelText('Nombre').props.value).toBe('Nombre sintético');
  accept(); fireEvent.press(screen.getByLabelText('Solicitar prueba gratuita'));
  await screen.findByText('Solicitud enviada correctamente');
  expect(send).toHaveBeenLastCalledWith(expect.objectContaining({ conditionsVersion: 'fixture-v2' }));
});

it('keeps the submit action unavailable until conditions can be loaded', async () => {
  load.mockRejectedValueOnce(new Error('offline'));
  render(<SubscriptionRequestModal plan={PRICING_PLANS[0]} onClose={jest.fn()} />);
  await screen.findByText('No se han podido cargar las condiciones.');
  expect(screen.getByLabelText('Solicitar prueba gratuita')).toBeDisabled();
  fireEvent.press(screen.getByText('Reintentar carga'));
  await screen.findByRole('checkbox');
  expect(load).toHaveBeenCalledTimes(2);
  expect(send).not.toHaveBeenCalled();
});

it('returns to the plan without submitting', async () => {
  const close = jest.fn(); await open(PRICING_PLANS[0], close);
  fireEvent.press(screen.getByText('Volver'));
  await waitFor(() => expect(close).toHaveBeenCalledTimes(1));
  expect(send).not.toHaveBeenCalled();
});
