export const formatPhoneNumber = (value: string): string => {
  const trimmed = value.trimStart();
  const hasPlus = trimmed.startsWith('+');
  const digits = value.replace(/\D/g, '');

  if (!digits) return hasPlus ? '+' : '';

  let countryCode = '';
  let localDigits = digits;

  if (hasPlus) {
    if (digits.startsWith('34') && digits.length > 9) {
      countryCode = '34';
      localDigits = digits.slice(2);
    } else if (digits.length > 9) {
      const codeLength = Math.min(3, digits.length - 9);
      countryCode = digits.slice(0, codeLength);
      localDigits = digits.slice(codeLength);
    }
  }

  const groupedLocal = localDigits.match(/\d{1,3}/g)?.join(' ') ?? localDigits;

  if (countryCode) {
    return `+${countryCode} ${groupedLocal}`.trim();
  }

  return `${hasPlus ? '+' : ''}${groupedLocal}`.trim();
};

export const formatDateForDisplay = (date: Date): string =>
  date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

export const parseDateString = (dateStr: string): Date | null => {
  if (!dateStr) return null;
  const parts = dateStr.split('/');
  if (parts.length !== 3) return null;
  const [day, month, year] = parts.map(Number);
  if (Number.isNaN(day) || Number.isNaN(month) || Number.isNaN(year)) return null;
  return new Date(year, month - 1, day);
};

export const formatCardNumber = (value: string): string => {
  const numbers = value.replace(/\D/g, '');
  const groups = numbers.match(/.{1,4}/g);
  return groups ? groups.join(' ').slice(0, 19) : '';
};

export const formatExpiry = (value: string): string => {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length >= 2) {
    return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}`;
  }
  return numbers;
};
