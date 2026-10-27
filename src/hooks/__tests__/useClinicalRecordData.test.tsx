import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useClinicalRecordData } from '../useClinicalRecordData';
import { getClinicalRecord, type ClinicalRecord } from '../../services/clinicalService';
jest.mock('../../services/clinicalService', () => ({ getClinicalRecord: jest.fn() }));
jest.mock('../../services/clinicalDownloads', () => ({ cancelClinicalDownloads: jest.fn() }));
const page = { limit: 10, total: 0, hasMore: false, nextCursor: null };
const record: ClinicalRecord = {
  id: 'record', access: { canReadClinicalContent: true, canWriteClinicalContent: true },
  consentStatus: 'PENDING', consentGivenAt: null, consentRequestedAt: null, consentVersion: null, consentMethod: null,
  closedAt: null, retentionUntil: null, eligibleForManualReview: false, activeConsentRequest: null, guestConsentActionsEnabled: false,
  client: { id: 'patient', source: 'MANAGED', userId: null, user: { id: null, name: 'Synthetic', email: 'synthetic@example.test', userType: 'CLIENT' }, questionnaireAnswers: null },
  notes: [], documents: [], consentEvents: [], sessionFolders: [],
  pagination: { notes: page, documents: page, consentEvents: page, sessionFolders: page },
};
beforeEach(() => jest.resetAllMocks());
test('pending record loads without historical authorization; failed reload clears protected content', async () => {
  jest.mocked(getClinicalRecord).mockResolvedValueOnce(record).mockRejectedValueOnce(new Error('Offline'));
  const { result } = renderHook(() => useClinicalRecordData({ clientId: 'patient', token: 'unlock' }));
  await waitFor(() => expect(result.current.record).toEqual(record));
  await act(async () => { await result.current.loadRecord(); });
  expect(result.current.record).toBeNull();
  expect(result.current.recordError).toBe('Offline');
});
test('changing patient or lock session ignores a previous in-flight response', async () => {
  let resolveOld!: (value: ClinicalRecord) => void;
  jest.mocked(getClinicalRecord).mockReturnValueOnce(new Promise(resolve => { resolveOld = resolve; })).mockResolvedValueOnce({ ...record, id: 'new-record' });
  const { result, rerender } = renderHook<ReturnType<typeof useClinicalRecordData>, { clientId: string; token: string | null }>(({ clientId, token }) => useClinicalRecordData({ clientId, token }), { initialProps: { clientId: 'patient', token: 'unlock' } });
  rerender({ clientId: 'new-patient', token: 'new-unlock' });
  await waitFor(() => expect(result.current.record?.id).toBe('new-record'));
  await act(async () => { resolveOld(record); });
  expect(result.current.record?.id).toBe('new-record');
  rerender({ clientId: 'new-patient', token: null });
  expect(result.current.record).toBeNull();
});
