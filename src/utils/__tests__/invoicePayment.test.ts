import { readInvoicePayment, paymentMethodOptions } from '../invoicePayment';

test('preserves legacy free text without silently changing its method', () => {
  expect(readInvoicePayment('Transferencia a 30 días')).toEqual({ method: 'Transferencia a 30 días', instructions: '' });
  expect(readInvoicePayment('Bizum', '600000000')).toEqual({ method: 'Bizum', instructions: '600000000' });
  expect(readInvoicePayment('', '')).toEqual({ method: '', instructions: '' });
  expect(paymentMethodOptions).toHaveLength(7);
});
