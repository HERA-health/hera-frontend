import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import * as service from '../../../services/heraCommissionService';
import { CommissionExplanation } from '../CommissionExplanation';
import { CommissionInfoLink, PatientCommission } from '../CommissionLinks';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  useFocusEffect: (effect: React.EffectCallback) => {
    const react = jest.requireActual<typeof React>('react');
    react.useEffect(effect, [effect]);
  },
}));
jest.mock('../../../services/heraCommissionService', () => ({ patient: jest.fn(), invitation: jest.fn() }));
beforeEach(() => jest.clearAllMocks());

it('shows the scale and example immediately while keeping additional rules expandable', () => {
  const view = render(<CommissionExplanation />);
  for (const value of ['20%', '10%', '5%', '16 €', '8 €', '4 €']) expect(view.getByText(value)).toBeTruthy();
  expect(view.getByText('Pacientes propios: sin comisión HERA')).toBeTruthy();
  expect(view.queryByText(/Las gratuitas, canceladas/)).toBeNull();
  fireEvent.press(view.getByRole('button', { name: 'Qué cuenta y qué queda fuera' }));
  expect(view.getByText(/Las gratuitas, canceladas/)).toBeTruthy();
  fireEvent.press(view.getByRole('button', { name: 'Ocultar detalles del cálculo' }));
  expect(view.queryByText(/Las gratuitas, canceladas/)).toBeNull();
});

it('names the compact information button and opens the commission screen', () => {
  const view = render(<CommissionInfoLink compact />);
  fireEvent.press(view.getByRole('button', { name: 'Cómo funcionan las comisiones' }));
  expect(mockNavigate).toHaveBeenCalledWith('HeraCommissions');
});

it('keeps commission details folded without manual invitation codes', async () => {
  jest.mocked(service.patient).mockResolvedValue({ id: 'relation', origin: 'SPECIALIST_OWN', status: 'CONFIRMED', initialCount: null, sessions: [] });
  const view = render(<PatientCommission clientId="patient-fixture" />);
  await view.findByText('Paciente propio · Sin comisión HERA');
  fireEvent.press(view.getByRole('button', { name: 'Ver opciones' }));
  expect(view.getByRole('button', { name: 'Cómo funcionan las comisiones' })).toBeTruthy();
  expect(view.queryByText(/Copiar invitación/)).toBeNull();
  expect(service.invitation).not.toHaveBeenCalled();
});
