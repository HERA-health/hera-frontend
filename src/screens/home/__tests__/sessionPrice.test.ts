import { formatSessionDisplayPrice } from '../sessionPrice';

describe('formatSessionDisplayPrice', () => {
  it('uses the booked snapshot before the specialist current price', () => {
    expect(formatSessionDisplayPrice({
      bookedPrice: 0,
      bookedCurrency: 'EUR',
      specialist: { pricePerSession: 80 },
    })).toBe('€0');
  });

  it('falls back to the specialist price for old sessions without snapshot', () => {
    expect(formatSessionDisplayPrice({
      bookedPrice: null,
      bookedCurrency: null,
      specialist: { pricePerSession: 80 },
    })).toBe('€80');
  });
});
