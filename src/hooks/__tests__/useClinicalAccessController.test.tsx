import { act, renderHook } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { useClinicalAccessController } from '../useClinicalAccessController';
import * as clinical from '../../services/clinicalService';

jest.mock('../../services/clinicalService', () => ({ getClinicalAccessStatus: jest.fn(), unlockClinicalArea: jest.fn(), lockClinicalArea: jest.fn(), heartbeatClinicalArea: jest.fn() }));
jest.mock('../../services/clinicalPinService', () => ({ subscribeToClinicalPinChange: () => () => undefined }));

const now = new Date('2026-10-19T12:00:00Z');
const session = { token: 'first', sessionId: 'session', absoluteExpiresAt: new Date(now.getTime() + 25 * 60000).toISOString(), idleExpiresAt: new Date(now.getTime() + 11 * 60000).toISOString() };
const status = (active: boolean): clinical.ClinicalAccessStatus => ({
  hasPin: true, pinLockedUntil: null, pinUpdatedAt: null, acceptedDataProcessingAgreementAt: now.toISOString(), dataProcessingAgreementVersion: 'v1',
  session: active ? { ...session, active: true, createdAt: now.toISOString() } : { active: false, sessionId: null, createdAt: null, absoluteExpiresAt: null, idleExpiresAt: null },
});
beforeEach(() => {
  jest.useFakeTimers(); jest.setSystemTime(now); jest.clearAllMocks();
  jest.spyOn(AppState, 'addEventListener').mockReturnValue({ remove: jest.fn() });
  jest.mocked(clinical.getClinicalAccessStatus).mockImplementation(async token => status(Boolean(token)));
  jest.mocked(clinical.unlockClinicalArea).mockResolvedValue(session);
  jest.mocked(clinical.lockClinicalArea).mockResolvedValue(undefined);
  jest.mocked(clinical.heartbeatClinicalArea).mockResolvedValue({ ...session, idleExpiresAt: new Date(now.getTime() + 40 * 60000).toISOString() });
});
afterEach(() => { jest.restoreAllMocks(); jest.useRealTimers(); });

test('idle expiration clears the local token at its deadline', async () => {
  const lost = jest.fn();
  const { result } = renderHook(() => useClinicalAccessController({ onAccessLost: lost }));
  await act(async () => { await result.current.unlockClinicalArea('123456'); });
  jest.mocked(clinical.heartbeatClinicalArea).mockRejectedValue(new Error('Offline'));
  await act(async () => { jest.advanceTimersByTime(11 * 60000); });
  expect(result.current.token).toBeNull();
  expect(result.current.accessStatus?.session.active).toBe(false);
  expect(lost).toHaveBeenCalledWith(expect.stringContaining('caducado'));
});

test('heartbeats can extend idle time but never extend the absolute expiry', async () => {
  const { result } = renderHook(() => useClinicalAccessController());
  await act(async () => { await result.current.unlockClinicalArea('123456'); });
  await act(async () => { jest.advanceTimersByTime(10 * 60000); });
  await act(async () => { jest.advanceTimersByTime(12 * 60000); });
  expect(result.current.token).toBe('first');
  await act(async () => { jest.advanceTimersByTime(3 * 60000); });
  expect(result.current.token).toBeNull();
});

test('manual locking removes sensitive access before the server responds', async () => {
  let finish: (() => void) | undefined;
  jest.mocked(clinical.lockClinicalArea).mockImplementationOnce(() => new Promise(resolve => { finish = () => resolve(undefined); }));
  const { result } = renderHook(() => useClinicalAccessController());
  await act(async () => { await result.current.unlockClinicalArea('123456'); });
  let locking: Promise<void> | undefined;
  await act(async () => { locking = result.current.lockClinicalArea(); });
  expect(result.current.token).toBeNull();
  await act(async () => { finish?.(); await locking; });
});

test('a late status response cannot reactivate a session that has been cleared', async () => {
  let finish: ((value: clinical.ClinicalAccessStatus) => void) | undefined;
  const { result } = renderHook(() => useClinicalAccessController());
  await act(async () => { await result.current.unlockClinicalArea('123456'); });
  jest.mocked(clinical.getClinicalAccessStatus).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  let loading: Promise<unknown> | undefined;
  act(() => { loading = result.current.loadStatus(); });
  await act(async () => { await result.current.clearAccessState(); });
  await act(async () => { finish?.(status(true)); await loading; });
  expect(result.current.token).toBeNull();
  expect(result.current.accessStatus?.session.active).toBe(false);
});
