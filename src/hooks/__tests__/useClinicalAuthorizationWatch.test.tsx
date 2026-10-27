import { act, renderHook } from '@testing-library/react-native';
import { useClinicalAuthorizationWatch } from '../useClinicalAuthorizationWatch';
import { getClinicalAuthorization } from '../../services/clinicalService';
import { beginClinicalDownload } from '../../services/clinicalDownloads';
jest.mock('@react-navigation/native', () => ({ useFocusEffect: (effect: () => void) => require('react').useEffect(effect, [effect]) }));
jest.mock('../../services/clinicalService', () => ({ getClinicalAuthorization: jest.fn() }));
beforeEach(() => { jest.useFakeTimers(); jest.clearAllMocks(); });
afterEach(() => jest.useRealTimers());
const options = () => ({ clientId: 'patient', token: 'access', treatmentEventId: null, closedAt: null, requestPending: false, onRefresh: jest.fn(async () => undefined), onAccessLost: jest.fn() });

test('unchanged authorization does not reset the workspace; withdrawal refreshes permissions while retained downloads remain available', async () => {
  const props = options();
  jest.mocked(getClinicalAuthorization).mockResolvedValueOnce({ treatmentConsentStatus: 'PENDING', treatmentConsentEventId: null, closedAt: null }).mockResolvedValueOnce({ treatmentConsentStatus: 'REVOKED', treatmentConsentEventId: 'withdrawal', closedAt: null });
  renderHook(() => useClinicalAuthorizationWatch(props));
  await act(async () => { jest.advanceTimersByTime(15000); });
  expect(props.onRefresh).not.toHaveBeenCalled();
  const download = beginClinicalDownload('access');
  props.onRefresh.mockImplementation(async () => { expect(download.isActive()).toBe(true); });
  await act(async () => { jest.advanceTimersByTime(15000); });
  expect(props.onRefresh).toHaveBeenCalledTimes(1);
  download.release();
});

test('an unverifiable authorization fails closed and leaving the screen ignores late responses', async () => {
  const props = options();
  jest.mocked(getClinicalAuthorization).mockRejectedValueOnce(new Error('Offline'));
  const { unmount } = renderHook(() => useClinicalAuthorizationWatch(props));
  await act(async () => { jest.advanceTimersByTime(15000); });
  expect(props.onAccessLost).toHaveBeenCalledWith('Offline');
  let resolve!: (value: { treatmentConsentStatus: 'REVOKED'; treatmentConsentEventId: string; closedAt: null }) => void;
  jest.mocked(getClinicalAuthorization).mockReturnValueOnce(new Promise(done => { resolve = done; }));
  await act(async () => { jest.advanceTimersByTime(15000); });
  unmount();
  await act(async () => { resolve({ treatmentConsentStatus: 'REVOKED', treatmentConsentEventId: 'withdrawal', closedAt: null }); });
  expect(props.onRefresh).not.toHaveBeenCalled();
});
