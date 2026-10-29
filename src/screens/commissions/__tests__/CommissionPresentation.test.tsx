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

it('keeps the explanation folded and shows only commission percentages without price examples', () => {
  const view = render(<CommissionExplanation />);
  expect(view.queryByText('20%')).toBeNull();
  expect(view.getByRole('button', { name: 'Cómo se calculan las comisiones' })).toHaveAccessibilityState({ expanded: false });
  fireEvent.press(view.getByRole('button', { name: 'Cómo se calculan las comisiones' }));
  for (const value of ['20%', '10%', '5%']) expect(view.getByText(value)).toBeTruthy();
  expect(view.queryByText(/€/)).toBeNull();
  expect(view.queryByText(/ejemplo/i)).toBeNull();
  for (const [session, rate] of [['1.ª sesión', '20%'], ['2.ª y 3.ª', '10%'], ['4.ª y siguientes', '5%']]) {
    expect(view.getByLabelText(`${session}: comisión del ${rate}.`)).toBeTruthy();
  }
  expect(view.getByText('Pacientes propios: sin comisión HERA')).toBeTruthy();
  expect(view.queryByText(/Las gratuitas, canceladas/)).toBeNull();
  fireEvent.press(view.getByRole('button', { name: 'Qué cuenta y qué queda fuera' }));
  expect(view.getByText(/Las gratuitas, canceladas/)).toBeTruthy();
  fireEvent.press(view.getByRole('button', { name: 'Ocultar detalles del cálculo' }));
  expect(view.queryByText(/Las gratuitas, canceladas/)).toBeNull();
  fireEvent.press(view.getByRole('button', { name: 'Cómo se calculan las comisiones' }));
  expect(view.queryByText('20%')).toBeNull();
});

it('names the compact information button and opens the commission screen', () => {
  const view = render(<CommissionInfoLink compact />);
  fireEvent.press(view.getByRole('button', { name: 'Cómo funcionan las comisiones' }));
  expect(mockNavigate).toHaveBeenCalledWith('HeraCommissions');
});

it('keeps commission details folded without manual invitation codes', async () => {
  jest.mocked(service.patient).mockResolvedValue({ id: 'relation', origin: 'SPECIALIST_OWN', status: 'CONFIRMED', initialCount: null, sessions: [] });
  const view = render(<PatientCommission clientId="patient-fixture" />);
  await view.findByText('Cartera propia');
  fireEvent.press(view.getByRole('button', { name: 'Ver opciones' }));
  expect(view.getByRole('button', { name: 'Cómo funcionan las comisiones' })).toBeTruthy();
  expect(view.queryByText(/Copiar invitación/)).toBeNull();
  expect(service.invitation).not.toHaveBeenCalled();
});

it('shows directory acquisition while a commission is pending or simulated differently', async () => {
  jest.mocked(service.patient).mockResolvedValue({ id: 'relation', origin: 'UNKNOWN', patientOrigin: 'HERA_DIRECTORY', status: 'PENDING', initialCount: null, sessions: [] });
  const view = render(<PatientCommission clientId="patient-fixture" />);
  await view.findByText('Directorio HERA · Comisión en revisión');
  expect(view.queryByText('Procedencia en revisión')).toBeNull();
});
