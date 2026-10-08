import React, { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { PackageCoverage } from '../PackageCoverage';
import { loadPatientPackages, type PatientPackage } from '../../../services/packageService';

jest.mock('../../../services/packageService', () => ({ loadPatientPackages: jest.fn() }));
const load = jest.mocked(loadPatientPackages);
const row = (id: string, available: number): PatientPackage => ({ id, specialistId: 'specialist', clientId: 'client', createdAt: '2026-01-01', snapshot: { name: id, serviceId: 'service', serviceName: 'Terapia', sessions: 5, totalCents: 25000, paymentConditions: null, options: [{ id: 'option', modality: 'VIDEO_CALL', durationMinutes: 60 }] }, balance: { total: 5, consumed: 5 - available, reserved: 0, available }, invoice: { id: `invoice-${id}`, invoiceNumber: id, total: 250, status: 'DRAFT', paidAt: null, sentAt: null }, uses: [], notifications: [] });
function Coverage({ change }: { change: jest.Mock }) {
  const [value, setValue] = useState<string>();
  return <PackageCoverage specialistId="specialist" optionId="option" value={value} onChange={(id, pack) => { setValue(id); change(id, pack); }} />;
}
beforeEach(() => jest.clearAllMocks());
test('proposes the oldest unpaid compatible balance and preserves an explicit individual choice', async () => {
  const oldest = row('Anterior', 2); load.mockResolvedValue([row('Agotado', 0), oldest, row('Nuevo', 5)]);
  const change = jest.fn(); render(<Coverage change={change} />);
  await waitFor(() => expect(change).toHaveBeenCalledWith('Anterior', oldest));
  expect(screen.getByRole('button', { name: /Anterior/, selected: true })).toBeTruthy();
  expect(screen.getByText('2 sesiones disponibles')).toBeTruthy();
  fireEvent.press(screen.getByText('Sesión individual'));
  await waitFor(() => expect(change.mock.calls.at(-1)?.[0]).toBeUndefined());
  expect(screen.queryByText(/Incluida en tu bono/)).toBeNull();
});
test('a failed balance request exposes retry and never invents coverage', async () => {
  load.mockRejectedValueOnce(new Error('Fallo sintético')).mockResolvedValueOnce([row('Bono', 1)]);
  const change=jest.fn(); render(<Coverage change={change} />);
  await screen.findByText('Fallo sintético'); expect(change).not.toHaveBeenCalled();
  fireEvent.press(screen.getByText('Reintentar bonos'));
  await waitFor(() => expect(change).toHaveBeenCalledWith('Bono', expect.objectContaining({ id: 'Bono' })));
});

test('online unpaid packages are not selected automatically and expose payment outside the agenda', async () => {
  const unpaid = { ...row('Pendiente', 5), payment: { mode: 'ONLINE' as const, available: true, termsVersion: 'v1', status: 'UNPAID', required: true, canReserve: false, canPay: true, issueCode: null, checkoutUrl: null, paidAt: null, totalCents: 25000 } };
  load.mockResolvedValue([unpaid]);
  const change = jest.fn(), pay = jest.fn();
  render(<PackageCoverage specialistId="specialist" optionId="option" initialPackageId="Pendiente" onChange={change} onPay={pay} />);
  fireEvent.press(await screen.findByText('Pagar bono'));
  expect(change).not.toHaveBeenCalled(); expect(pay).toHaveBeenCalledWith('Pendiente');
  expect(screen.queryByText(/Incluida en tu bono/)).toBeNull();
});

test('professional manual scheduling can select an unpaid online package', async () => {
  const unpaid = { ...row('Pendiente', 5), payment: { mode: 'ONLINE' as const, available: true, termsVersion: 'v1', status: 'UNPAID', required: true, canReserve: false, canPay: true, issueCode: null, checkoutUrl: null, paidAt: null, totalCents: 25000 } };
  load.mockResolvedValue([unpaid]);
  const change = jest.fn();
  render(<PackageCoverage clientId="client" specialistId="specialist" optionId="option" onChange={change} />);
  await waitFor(() => expect(change).toHaveBeenCalledWith('Pendiente', unpaid));
});
