import { billingMetricComparison } from '../billingMetricComparison';

describe('billingMetricComparison', () => {
  it.each([
    [0, 0, 'Sin variación'],
    [100, 0, 'Sin base de comparación'],
    [0, 100, '−100%'],
    [150, 100, '+50%'],
    [80, 100, '−20%'],
    [100.001, 100, 'Sin variación'],
    [170, 150, '+13,3%'],
  ])('compares %s to %s as %s', (current, previous, expected) => {
    expect(billingMetricComparison(current, previous)).toBe(expected);
  });
});
