import { api } from '../api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requestPublicBooking, verifyPublicBooking } from '../sessionsService';

jest.mock('../api', () => {
  const api = { post: jest.fn() };
  return { __esModule: true, api, default: api };
});
jest.mock('@react-native-async-storage/async-storage', () => {
  const values = new Map<string, string>();
  return { __esModule: true, default: {
    getItem: async (key: string) => values.get(key) ?? null,
    setItem: async (key: string, value: string) => { values.set(key, value); },
    removeItem: async (key: string) => { values.delete(key); },
    clear: async () => values.clear(),
  } };
});
jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'sha256' },
  digestStringAsync: async (_: string, text: string) => require('crypto').createHash('sha256').update(text).digest('hex'),
  randomUUID: () => require('crypto').randomUUID(),
}));

const post = jest.mocked(api.post);
const input: Parameters<typeof requestPublicBooking>[0] = {
  specialistId: 'specialist-fixture', date: '2026-10-20T10:00:00.000Z', duration: 60, type: 'VIDEO_CALL',
  patient: { firstName: 'Paciente', lastName: 'Sintético', email: 'fixture@example.invalid' },
  privacyAccepted: true, privacyVersion: 'fixture',
};
const response = { data: { requestId: 'request-fixture', expiresAt: '2026-10-20T09:00:00.000Z' } };
const rejection = (code: string, message: string) => Object.assign(new Error('Request failed with status code 409'), { response: { data: { code, message } } });
beforeEach(async () => { post.mockReset(); await AsyncStorage.clear(); });

it.each([
  ['HERA_BOOKING_EMAIL_FAILED', 'No se pudo enviar el código. Conserva el formulario y reintenta.'],
  ['REQUEST_TIMEOUT', 'La solicitud ha tardado demasiado. Intenta de nuevo.'],
])('preserves the same request after %s and exposes the useful error', async (code, message) => {
  post.mockRejectedValueOnce(rejection(code, message)).mockResolvedValue(response);
  await expect(requestPublicBooking(input)).rejects.toThrow(message);
  await expect(requestPublicBooking(input)).resolves.toEqual(response.data);
  expect(post.mock.calls[1][1]).toEqual(post.mock.calls[0][1]);
});

it.each(['HERA_BOOKING_EXPIRED', 'HERA_REQUEST_CHANGED'])('releases an unusable %s request so the next click can recover', async code => {
  post.mockRejectedValueOnce(rejection(code, 'Solicita un nuevo código.')).mockResolvedValue(response);
  await expect(requestPublicBooking(input)).rejects.toThrow('Solicita un nuevo código.');
  expect(post).toHaveBeenCalledTimes(1);
  await expect(requestPublicBooking(input)).resolves.toEqual(response.data);
  expect(post.mock.calls[1][1]).not.toEqual(post.mock.calls[0][1]);
  expect(post.mock.calls[1][1]).toMatchObject(input);
});

it('preserves one request when concurrent sends race', async () => {
  post.mockResolvedValue(response);
  await Promise.all([requestPublicBooking(input), requestPublicBooking(input)]);
  expect(post.mock.calls[0][1]).toEqual(post.mock.calls[1][1]);
});

it('explains an ambiguous patient record and permits retrying the same verification after resolution', async () => {
  const message = 'Tu especialista debe revisar las fichas coincidentes antes de reservar.';
  post.mockRejectedValueOnce(rejection('PATIENT_ACCOUNT_LINK_AMBIGUOUS', message))
    .mockResolvedValue({ data: { data: { id: 'session-fixture', status: 'CONFIRMED' } } });
  await expect(verifyPublicBooking('request-fixture', 'fixture-code')).rejects.toThrow(message);
  await expect(verifyPublicBooking('request-fixture', 'fixture-code')).resolves.toEqual({ id: 'session-fixture', status: 'CONFIRMED' });
  expect(post.mock.calls[0][1]).toEqual(post.mock.calls[1][1]);
});

it.each([
  ['SLOT_UNAVAILABLE', 'Este horario ya no está disponible. Elige otro hueco.'],
  ['UNSUPPORTED_MODALITY', 'Este especialista no ofrece sesiones por videollamada.'],
  ['SPECIALIST_NOT_BOOKABLE', 'Este especialista no acepta reservas en este momento.'],
])('preserves the patient-facing explanation for %s', async (code, message) => {
  post.mockRejectedValueOnce(rejection(code, message));
  await expect(verifyPublicBooking('request-fixture', 'fixture-code')).rejects.toThrow(message);
});
