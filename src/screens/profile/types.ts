export interface PaymentMethod {
  id: string;
  type: 'visa' | 'mastercard' | 'amex';
  last4: string;
  expiryMonth: string;
  expiryYear: string;
  isDefault: boolean;
}

export interface Transaction {
  id: string;
  date: Date;
  amount: number;
  currency: string;
  description: string;
  specialistName: string;
  status: 'paid' | 'pending' | 'refunded';
}

export interface CardFormState {
  number: string;
  expiry: string;
  cvv: string;
  name: string;
}

export interface ProfileLocationData {
  homeAddress: string;
  homeCity: string;
  homePostalCode: string;
  homeCountry: string;
  homeLat: number | null;
  homeLng: number | null;
}

export interface ProfileFormData {
  fullName: string;
  email: string;
  phone: string;
  birthDate: string;
  city: string;
  postalCode: string;
}
