jest.mock('../api', () => ({
  api: {
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('../../utils/multipartUpload', () => ({
  buildImageFormData: jest.fn(),
}));

jest.mock('../dashboardService', () => ({
  notifyProfessionalHomeChanged: jest.fn(),
}));

import { api } from '../api';
import { billingService } from '../billingService';
import { notifyProfessionalHomeChanged } from '../dashboardService';

const mockedApi = api as jest.Mocked<typeof api>;
const mockedNotify = jest.mocked(notifyProfessionalHomeChanged);

describe('professional workspace billing invalidation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const response = { data: { data: { id: 'invoice-1' } } };
    mockedApi.post.mockResolvedValue(response);
    mockedApi.put.mockResolvedValue(response);
    mockedApi.patch.mockResolvedValue(response);
    mockedApi.delete.mockResolvedValue(response);
  });

  it('invalidates the home summary after invoice lifecycle mutations', async () => {
    await billingService.createInvoice({} as Parameters<typeof billingService.createInvoice>[0]);
    await billingService.updateInvoice('invoice-1', {});
    await billingService.sendInvoice('invoice-1');
    await billingService.cancelInvoice('invoice-1');
    await billingService.markInvoiceAsPaid('invoice-1');
    await billingService.generateInvoiceFromSession('session-1');
    await billingService.attachInvoiceToSession('session-1', 'invoice-1');

    expect(mockedNotify).toHaveBeenCalledTimes(7);
  });
});
