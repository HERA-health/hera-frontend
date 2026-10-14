import { emptyManagedClientForm, managedClientSchema } from '../managedClientFormDomain';

const valid = { ...emptyManagedClientForm, firstName: 'Ana', lastName: 'Garcia', email: 'ana@example.invalid' };
it('requires email even when a phone is provided', () => {
  const result = managedClientSchema.safeParse({ ...valid, email: '', phone: '+34600000000' });
  expect(result.success).toBe(false);
  if (!result.success) expect(result.error.issues.some(issue => issue.path[0] === 'email')).toBe(true);
});
it('allows simplified invoice patients without fiscal identification and preserves partial fiscal input', () => {
  expect(managedClientSchema.parse(valid).billingTaxId).toBe('');
  const partial = managedClientSchema.parse({ ...valid, billingTaxId: ' 00000001R ' });
  expect(partial.billingTaxId).toBe('00000001R');
  expect(partial.billingAddress).toBe('');
});
