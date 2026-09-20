import api from '../api';
import { acceptLegalDocuments } from '../legalService';
jest.mock('../api', () => ({ __esModule: true, default: { post: jest.fn(), get: jest.fn() } }));
test('sends exactly the version and hash presented by the gate, not a newer implicit version', async () => {
  jest.mocked(api.post).mockResolvedValue({ data: { data: { requiresAcceptance: false } } });
  const document = { key: 'TERMS_OF_SERVICE' as const, version: 'presented', contentHash: 'a'.repeat(64), title: 'Términos', publicPath: '/legal/terminos' };
  await acceptLegalDocuments(['TERMS_OF_SERVICE'], 'required-gate', [document]);
  expect(api.post).toHaveBeenCalledWith('/legal/accept', { source: 'required-gate', documentKeys: ['TERMS_OF_SERVICE'], documents: [{ documentKey: 'TERMS_OF_SERVICE', version: 'presented', contentHash: 'a'.repeat(64) }] });
});
