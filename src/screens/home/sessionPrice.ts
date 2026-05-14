interface SessionDisplayPriceInput {
  bookedPrice?: number | null;
  bookedCurrency?: string | null;
  specialist: {
    pricePerSession: number;
  };
}

const formatAmount = (amount: number): string =>
  amount.toLocaleString('es-ES', { maximumFractionDigits: 2 });

export const formatSessionDisplayPrice = (session: SessionDisplayPriceInput): string => {
  const amount = session.bookedPrice ?? session.specialist.pricePerSession;
  const currency = session.bookedCurrency ?? 'EUR';

  return currency === 'EUR'
    ? `€${formatAmount(amount)}`
    : `${formatAmount(amount)} ${currency}`;
};
