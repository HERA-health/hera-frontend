import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { lightTheme } from '../../../../constants/theme';
import { useTheme } from '../../../../contexts/ThemeContext';
import type { PrivateServiceOption } from '../../../../services/privateCatalogService';
import { BookingServiceSection } from '../BookingServiceSection';

jest.mock('../../../../contexts/ThemeContext', () => ({ useTheme: jest.fn() }));
const option = (index: number): PrivateServiceOption => ({
  id: `option-${index}`, serviceId: `service-${index}`, name: `Servicio ${index}`, serviceName: `Servicio ${index}`,
  modality: 'VIDEO_CALL', durationMinutes: 60, priceCents: 6000, currency: 'EUR', isActive: true,
  isPublic: true, isPreferred: true, version: 1, legacyDuration: false, legacyTariffId: null,
});
beforeEach(() => jest.mocked(useTheme).mockReturnValue({ theme: lightTheme, mode: 'light', isDark: false, setMode: jest.fn() }));

it('shows one selected service as information rather than a radio', () => {
  render(<BookingServiceSection options={[option(1)]} serviceId="service-1" selectedOptionId="option-1" disabled={false} onServiceSelect={jest.fn()} />);
  expect(screen.getByText('Servicio 1')).toBeTruthy();
  expect(screen.queryAllByRole('radio')).toHaveLength(0);
});

it.each([2, 4])('groups %s services without duplicating their modality variants', count => {
  const onSelect = jest.fn();
  const options = Array.from({ length: count }, (_, index) => option(index));
  options.push({ ...option(0), id: 'in-person', modality: 'IN_PERSON', priceCents: 8000 });
  render(<BookingServiceSection options={options} serviceId="service-1" selectedOptionId="option-1" disabled={false} onServiceSelect={onSelect} />);
  expect(screen.getAllByRole('radio')).toHaveLength(Math.min(count, 3));
  expect(screen.getByText(/Desde/)).toBeTruthy();
  fireEvent.press(screen.getAllByRole('radio')[1]);
  expect(onSelect).toHaveBeenCalledWith('service-1');
});

it('pages ten services in groups of three without changing the booking selection', () => {
  const onSelect = jest.fn();
  render(<BookingServiceSection options={Array.from({ length: 10 }, (_, index) => option(index))} serviceId="service-0" disabled={false} onServiceSelect={onSelect} />);
  expect(screen.getAllByRole('radio')).toHaveLength(3);
  expect(screen.getByLabelText('Servicios anteriores').props.accessibilityState.disabled).toBe(true);
  fireEvent.press(screen.getByLabelText('Servicios siguientes'));
  expect(screen.getByText('Servicio 3')).toBeTruthy();
  expect(screen.queryByText('Servicio 0')).toBeNull();
  expect(screen.getByLabelText('Página 2 de 4 de servicios')).toBeTruthy();
  expect(onSelect).not.toHaveBeenCalled();
  fireEvent.press(screen.getByLabelText('Volver al servicio seleccionado'));
  expect(screen.getByText('Servicio 0')).toBeTruthy();
  for (let i = 0; i < 3; i++) fireEvent.press(screen.getByLabelText('Servicios siguientes'));
  expect(screen.getAllByRole('radio')).toHaveLength(1);
  expect(screen.getByLabelText('Servicios siguientes').props.accessibilityState.disabled).toBe(true);
  fireEvent.press(screen.getByText('Servicio 9'));
  expect(onSelect).toHaveBeenCalledWith('service-9');
});

it('opens the page of a preselected service and follows changes from the profile', () => {
  const options = Array.from({ length: 10 }, (_, index) => option(index));
  const props = { options, disabled: false, onServiceSelect: jest.fn() };
  const view = render(<BookingServiceSection {...props} serviceId="service-8" />);
  expect(screen.getByLabelText('Página 3 de 4 de servicios')).toBeTruthy();
  expect(screen.getByText('Servicio 8')).toBeTruthy();
  view.rerender(<BookingServiceSection {...props} serviceId="service-1" />);
  expect(screen.getByText('Servicio 1')).toBeTruthy();
  expect(screen.getByLabelText('Página 1 de 4 de servicios')).toBeTruthy();
});

it('clamps pagination when the active catalog shrinks and blocks paging during submission', () => {
  const options = Array.from({ length: 10 }, (_, index) => option(index));
  const props = { onServiceSelect: jest.fn(), serviceId: 'service-0' };
  const view = render(<BookingServiceSection {...props} options={options} disabled={false} />);
  fireEvent.press(screen.getByLabelText('Servicios siguientes'));
  view.rerender(<BookingServiceSection {...props} options={options} disabled />);
  fireEvent.press(screen.getByLabelText('Servicios siguientes'));
  expect(screen.getByLabelText('Página 2 de 4 de servicios')).toBeTruthy();
  view.rerender(<BookingServiceSection {...props} options={options.slice(0, 2)} disabled={false} />);
  expect(screen.getAllByRole('radio')).toHaveLength(2);
  expect(screen.getByText('Servicio 0')).toBeTruthy();
  expect(screen.queryByLabelText('Servicios siguientes')).toBeNull();
});

it('does not allow selection while submitting or expose inactive services', () => {
  const onSelect = jest.fn();
  render(<BookingServiceSection options={[option(0), option(1), { ...option(2), isActive: false }]} disabled onServiceSelect={onSelect} />);
  fireEvent.press(screen.getAllByRole('radio')[0]);
  expect(onSelect).not.toHaveBeenCalled();
  expect(screen.queryByText('Servicio 2')).toBeNull();
});
