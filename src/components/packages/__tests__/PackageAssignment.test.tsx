import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { lightTheme } from '../../../constants/theme';
import { useTheme } from '../../../contexts/ThemeContext';
import { loadPackageCatalog } from '../../../services/packageService';
import { PackageAssignment } from '../PackageAssignment';
import { offer, patientPackage } from '../testing/packageFixtures';
const mockAcquired = patientPackage;
jest.mock('../../../contexts/ThemeContext', () => ({ useTheme: jest.fn() }));
jest.mock('../../../services/packageService', () => ({ loadPackageCatalog: jest.fn(), packagePrice: (n: number) => `${n / 100} €` }));
jest.mock('../PackageAcquisition', () => ({ PackageAcquisition: ({ clientId, onAcquired }: { clientId: string; onAcquired: (row: typeof mockAcquired) => void }) => {
  const React = require('react'); const { Text } = require('react-native');
  return React.createElement(Text, { onPress: () => onAcquired(mockAcquired) }, `Asignar y facturar a ${clientId}`);
} }));
beforeEach(() => {
  jest.clearAllMocks(); jest.mocked(useTheme).mockReturnValue({ theme: lightTheme, isDark: false, mode: 'light', setMode: jest.fn() });
});
test('assigns an explicitly selected private offer to the preset patient', async () => {
  jest.mocked(loadPackageCatalog).mockResolvedValue({ data: [offer, { ...offer, id: 'archived', archivedAt: '2026-01-01' }], acquisitionsEnabled: true });
  const onAcquired = jest.fn(); render(<PackageAssignment clientId="client-1" onAcquired={onAcquired} />);
  fireEvent.press(screen.getByText('Asignar bono')); fireEvent.press(await screen.findByText(/Diez sesiones/));
  expect(onAcquired).not.toHaveBeenCalled(); fireEvent.press(screen.getByText('Asignar y facturar a client-1'));
  await waitFor(() => expect(onAcquired).toHaveBeenCalledWith(patientPackage));
  expect(screen.queryByText(/Diez sesiones/)).toBeNull();
});
test('changing the patient invalidates a pending catalog response', async () => {
  let finish!: (result: Awaited<ReturnType<typeof loadPackageCatalog>>) => void;
  jest.mocked(loadPackageCatalog).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const onAcquired = jest.fn(); const view = render(<PackageAssignment clientId="client-1" onAcquired={onAcquired} />);
  fireEvent.press(screen.getByText('Asignar bono')); view.rerender(<PackageAssignment clientId="other" onAcquired={onAcquired} />);
  finish({ data: [offer], acquisitionsEnabled: true });
  await waitFor(() => expect(screen.queryByText(/Diez sesiones/)).toBeNull()); expect(onAcquired).not.toHaveBeenCalled();
});
test('preserves the acquisition release gate and allows retry after load failure', async () => {
  jest.mocked(loadPackageCatalog).mockResolvedValueOnce({ data: [offer], acquisitionsEnabled: false }).mockResolvedValueOnce({ data: [offer], acquisitionsEnabled: true });
  render(<PackageAssignment clientId="client-1" onAcquired={jest.fn()} />); fireEvent.press(screen.getByText('Asignar bono'));
  await screen.findByText(/no se pueden asignar nuevos bonos/); expect(screen.queryByText(/Diez sesiones/)).toBeNull();
  fireEvent.press(screen.getByText('Asignar bono')); expect(await screen.findByText(/Diez sesiones/)).toBeTruthy();
});
