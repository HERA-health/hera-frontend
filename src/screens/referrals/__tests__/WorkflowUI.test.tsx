import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { WorkflowDate } from '../WorkflowUI';
import { ReferralPreferencesForm } from '../ReferralPreferencesForm';
jest.mock('../../../components/scheduling/SchedulerCalendar', () => ({ SchedulerCalendar: ({ onSelectDate }: { onSelectDate: (date: string) => void }) => { const { Button } = require('react-native'); return <Button title="Elegir fecha de prueba" onPress={() => onSelectDate('2026-10-25')} />; } }));
it('keeps the Madrid date key unchanged on opening/cancelling and returns the selected calendar date', () => {
  const change = jest.fn();
  const view = render(<WorkflowDate label="Inicio (AAAA-MM-DD)" value="2026-09-09" onChangeText={change} />);
  fireEvent.press(view.getByRole('button', { name: 'Elegir fecha: Inicio (AAAA-MM-DD)' }));
  fireEvent.press(view.getByRole('button', { name: 'Cerrar calendario' }));
  expect(change).not.toHaveBeenCalled();
  fireEvent.press(view.getByRole('button', { name: 'Elegir fecha: Inicio (AAAA-MM-DD)' }));
  fireEvent.press(view.getByText('Elegir fecha de prueba'));
  expect(change).toHaveBeenCalledWith('2026-10-25');
});
it('saves pending capability text without requiring an extra add click and preserves existing exclusions', () => {
  const save = jest.fn();
  const view = render(<ReferralPreferencesForm initial={{ acceptsReferrals: true, referralCapabilities: ['Adultos'], referralExclusions: ['Criterio declarado'] }} busy={false} onSave={save} onCancel={jest.fn()} />);
  fireEvent.changeText(view.getByLabelText('Capacidades y poblaciones atendidas'), '  Pareja  ');
  fireEvent.press(view.getByRole('button', { name: 'Guardar disponibilidad' }));
  expect(save).toHaveBeenCalledWith({ acceptsReferrals: true, referralCapabilities: ['Adultos', 'Pareja'], referralExclusions: ['Criterio declarado'] });
});
it('removes a declared option and avoids duplicate capabilities', () => {
  const save = jest.fn();
  const view = render(<ReferralPreferencesForm initial={{ acceptsReferrals: true, referralCapabilities: ['Adultos'], referralExclusions: ['Criterio declarado'] }} busy={false} onSave={save} onCancel={jest.fn()} />);
  fireEvent.changeText(view.getByLabelText('Capacidades y poblaciones atendidas'), 'Adultos');
  fireEvent.press(view.getByRole('button', { name: 'Añadir capacidad' }));
  fireEvent.press(view.getByRole('button', { name: 'Quitar exclusión: Criterio declarado' }));
  fireEvent.press(view.getByRole('checkbox', { name: 'Estoy disponible para recibir derivaciones' }));
  fireEvent.press(view.getByRole('button', { name: 'Guardar disponibilidad' }));
  expect(save).toHaveBeenCalledWith({ acceptsReferrals: false, referralCapabilities: ['Adultos'], referralExclusions: [] });
});
