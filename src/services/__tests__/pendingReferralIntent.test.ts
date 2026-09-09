jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() }));
import AsyncStorage from '@react-native-async-storage/async-storage';
import { captureReferralUrl, clearPendingReferralIntent, clearPendingCollaborationIntent, getReferralGuestToken, getPendingCollaborationIntent, getPendingReferralIntent, rememberCollaborationIntent, rememberReferralIntent } from '../pendingReferralIntent';

describe('private navigation after authentication', () => {
  beforeEach(async () => {
    jest.mocked(AsyncStorage.getItem).mockResolvedValue(null);
    jest.mocked(AsyncStorage.setItem).mockResolvedValue();
    jest.mocked(AsyncStorage.removeItem).mockResolvedValue();
    await clearPendingReferralIntent(); await clearPendingCollaborationIntent(); jest.clearAllMocks();
  });
  it('removes guest credentials from both web and native URLs and never persists them', async () => {
    const token = 'a'.repeat(64);
    expect(captureReferralUrl(`https://example.invalid/derivaciones/r1?token=${token}`)).toBe('https://example.invalid/derivaciones/r1');
    expect(getReferralGuestToken('r1')).toBe(token);
    expect(captureReferralUrl(`hera://derivaciones/r2?token=${token}`)).toBe('hera://derivaciones/r2');
    await rememberReferralIntent('r2');
    expect(JSON.stringify(jest.mocked(AsyncStorage.setItem).mock.calls)).not.toContain(token);
    expect(await getPendingReferralIntent()).toBe('r2');
  });
  it('restores the appropriate route from storage and expires abandoned navigation', async () => {
    jest.mocked(AsyncStorage.getItem).mockResolvedValue(JSON.stringify({ route: 'Collaborations', id: 'agreement', expiresAt: Date.now() + 10000 }));
    expect(await getPendingReferralIntent()).toBeUndefined();
    expect(await getPendingCollaborationIntent()).toBe('agreement');
    await clearPendingCollaborationIntent();
    await rememberCollaborationIntent('new-agreement');
    const now = jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 31 * 60000);
    expect(await getPendingCollaborationIntent()).toBeUndefined(); now.mockRestore();
  });
});
