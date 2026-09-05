import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { DirectoryVisibilityStatus } from '../DirectoryVisibilityStatus';
import { lightTheme as mockTheme } from '../../../constants/theme';
import type { PublicDirectoryStatus } from '../../../services/professionalService';

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: mockTheme }),
}));

const listed: PublicDirectoryStatus = {
  isListed: true,
  requirements: { accountActive: true, verified: true, visibilityEnabled: true, priceConfigured: true },
  verificationStatus: 'VERIFIED',
};
const props = { status: listed, hasChanges: false, inPersonInsurancePending: false, onAction: jest.fn(), onRetry: jest.fn() };

it('keeps requirements collapsed and preserves the saved status while editing', () => {
  render(<DirectoryVisibilityStatus {...props} hasChanges />);
  expect(screen.queryByText('Tu perfil aparece en el directorio')).toBeNull();
  expect(screen.queryByText(/Este estado refleja tu perfil guardado/)).toBeNull();
  expect(screen.queryByText('Cuenta activa')).toBeNull();
  fireEvent.press(screen.getByRole('button', { name: 'Requisitos del directorio' }));
  expect(screen.getByText('Tu perfil aparece en el directorio')).toBeTruthy();
  expect(screen.getByText(/Este estado refleja tu perfil guardado/)).toBeTruthy();
  expect(screen.getByText('Cuenta activa')).toBeTruthy();
  expect(screen.getByText(/La foto es opcional/)).toBeTruthy();
  fireEvent.press(screen.getByRole('button', { name: 'Cerrar panel de requisitos' }));
  expect(screen.queryByText('Cuenta activa')).toBeNull();
});

it('links a missing price to billing and shows the conditional insurance guidance', () => {
  const onAction = jest.fn();
  render(<DirectoryVisibilityStatus {...props} onAction={onAction} inPersonInsurancePending status={{ ...listed, isListed: false, requirements: { ...listed.requirements, priceConfigured: false } }} />);
  fireEvent.press(screen.getByRole('button', { name: 'Requisitos del directorio' }));
  fireEvent.press(screen.getByText('Configurar precio'));
  expect(onAction).toHaveBeenCalledWith('pricing');
  fireEvent.press(screen.getByRole('button', { name: 'Requisitos del directorio' }));
  expect(screen.getByText(/tu seguro debe estar subido y aprobado/)).toBeTruthy();
});

it('describes deliberately hidden profiles without claiming they are listed', () => {
  render(<DirectoryVisibilityStatus {...props} status={{ ...listed, isListed: false, requirements: { ...listed.requirements, visibilityEnabled: false } }} />);
  expect(screen.queryByText('Has ocultado tu perfil del directorio')).toBeNull();
  expect(screen.queryByText('Ir a Privacidad')).toBeNull();
  expect(screen.queryByText('Revisar visibilidad')).toBeNull();
  fireEvent.press(screen.getByRole('button', { name: 'Requisitos del directorio' }));
  expect(screen.getByText('Pendiente')).toBeTruthy();
  expect(screen.getByText('Has ocultado tu perfil del directorio')).toBeTruthy();
  expect(screen.getAllByText('Cumplido')).toHaveLength(3);
  fireEvent.press(screen.getByTestId('requirements-backdrop', { includeHiddenElements: true }));
  expect(screen.queryByText('Cuenta activa')).toBeNull();
});

it('offers retry when the server status is unavailable', () => {
  const onRetry = jest.fn();
  render(<DirectoryVisibilityStatus {...props} status={null} onRetry={onRetry} />);
  expect(screen.queryByText('Tu perfil aparece en el directorio')).toBeNull();
  fireEvent.press(screen.getByText('Reintentar'));
  expect(onRetry).toHaveBeenCalledTimes(1);
});
