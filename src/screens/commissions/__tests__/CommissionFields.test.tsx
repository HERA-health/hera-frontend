import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { CommissionDateField, CommissionSelect } from '../CommissionFields';
import { SchedulerCalendar } from '../../../components/scheduling/SchedulerCalendar';
import { SimpleDropdown } from '../../../components/common/SimpleDropdown';

it('shows a readable date and only changes the Madrid key after selecting a calendar day', () => {
  const change = jest.fn();
  const view = render(<CommissionDateField label="Fecha de recepción" value="2026-09-16" onChangeText={change} />);
  expect(view.getByText('Miércoles, 16 de septiembre de 2026')).toBeTruthy();
  expect(view.queryByPlaceholderText('AAAA-MM-DD')).toBeNull();
  fireEvent.press(view.getByRole('button', { name: 'Fecha de recepción' }));
  expect(view.UNSAFE_getByType(SchedulerCalendar).props.current).toBe('2026-09-16');
  fireEvent.press(view.getByTestId('commission-date-backdrop'));
  expect(change).not.toHaveBeenCalled();
  fireEvent.press(view.getByRole('button', { name: 'Fecha de recepción' }));
  act(() => view.UNSAFE_getByType(SchedulerCalendar).props.onSelectDate('2026-09-14'));
  expect(change).toHaveBeenCalledWith('2026-09-14');
  expect(view.queryByRole('button', { name: 'Cerrar calendario' })).toBeNull();
});

it('navigates years, selects a complete month and clears without inventing a date', () => {
  const change = jest.fn();
  const view = render(<CommissionDateField label="Mes de liquidación" value="2026-09" onChangeText={change} granularity="month" />);
  fireEvent.press(view.getByRole('button', { name: 'Mes de liquidación' }));
  fireEvent.press(view.getByRole('button', { name: 'Año anterior' }));
  expect(change).not.toHaveBeenCalled();
  fireEvent.press(view.getByRole('button', { name: 'Diciembre de 2025' }));
  expect(change).toHaveBeenLastCalledWith('2025-12');
  fireEvent.press(view.getByRole('button', { name: 'Mes de liquidación' }));
  fireEvent.press(view.getByRole('button', { name: 'Todos los meses' }));
  expect(change).toHaveBeenLastCalledWith('');
});

it('keeps a disabled date closed and places commission choices in the existing portal', () => {
  const view = render(<CommissionDateField label="Fecha" value="2026-09-16" onChangeText={jest.fn()} disabled />);
  fireEvent.press(view.getByRole('button', { name: 'Fecha' }));
  expect(view.queryByRole('button', { name: 'Cerrar calendario' })).toBeNull();
  const select = render(<CommissionSelect accessibilityLabel="Estado del saldo" value="ALL" onSelect={jest.fn()} options={[{ value: 'ALL', label: 'Todos' }]} />);
  expect(select.UNSAFE_getByType(SimpleDropdown).props.presentation).toBe('portal');
});
