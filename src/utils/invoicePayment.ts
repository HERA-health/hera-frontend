export const invoicePaymentMethods = ['Transferencia bancaria', 'Efectivo', 'Tarjeta bancaria', 'Bizum', 'Domiciliación bancaria', 'PayPal', 'Otro'];

export const paymentMethodOptions = invoicePaymentMethods.map(value => ({ label: value, value }));

// Preserve legacy text on unrelated saves. Only an explicit selection replaces it.
export function readInvoicePayment(method?: string | null, instructions?: string | null) {
  return { method: method ?? '', instructions: instructions ?? '' };
}

export function legacyPaymentLabel(method?: string | null) {
  return method && !invoicePaymentMethods.includes(method) ? method : undefined;
}
