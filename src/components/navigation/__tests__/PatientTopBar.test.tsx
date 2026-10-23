import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { Image, Modal, View, useWindowDimensions } from 'react-native';
import { PatientTopBar } from '../PatientTopBar';

const mockNavigate = jest.fn();
const mockLogout = jest.fn();
const mockSetMode = jest.fn();

jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ navigate: mockNavigate }) }));
jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { type: 'client', name: 'Paciente Prueba', avatar: 'https://example.invalid/avatar.png' }, logout: mockLogout }),
}));
jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: jest.requireActual('../../../constants/theme').lightTheme, mode: 'light', setMode: mockSetMode }),
}));

const mockDimensions = jest.spyOn(require('react-native'), 'useWindowDimensions');
const renderBar = (currentRoute = 'Home', onOpenMobileSidebar = jest.fn()) => render(
  <PatientTopBar currentRoute={currentRoute} onOpenMobileSidebar={onOpenMobileSidebar} />,
);

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(View.prototype, 'measureInWindow').mockImplementation((callback) => callback(1200, 16, 44, 44));
  mockDimensions.mockReturnValue({ width: 1440, height: 900, scale: 1, fontScale: 1 } satisfies ReturnType<typeof useWindowDimensions>);
});

describe('patient toolbar', () => {
  it('opens the specialist directory from search and reservation', () => {
    const view = renderBar();
    expect(view.getByText('Inicio')).toBeTruthy();
    expect(view.queryByLabelText('Abrir menú')).toBeNull();
    fireEvent.press(view.getByRole('button', { name: 'Buscar especialistas' }));
    fireEvent.press(view.getByRole('button', { name: 'Reservar sesión' }));
    expect(mockNavigate.mock.calls).toEqual([['Specialists'], ['Specialists']]);
  });

  it('keeps the title and navigation usable on mobile', () => {
    mockDimensions.mockReturnValue({ width: 390, height: 844, scale: 1, fontScale: 1 });
    const openSidebar = jest.fn();
    const view = renderBar('Sessions', openSidebar);
    expect(view.getByText('Mis sesiones')).toBeTruthy();
    expect(view.queryByLabelText('Buscar especialistas')).toBeNull();
    fireEvent.press(view.getByRole('button', { name: 'Abrir menú' }));
    expect(openSidebar).toHaveBeenCalledTimes(1);
    fireEvent.press(view.getByRole('button', { name: 'Reservar sesión' }));
    expect(mockNavigate).toHaveBeenCalledWith('Specialists');
  });

  it('preserves the tablet sidebar breakpoint without crowding the toolbar', () => {
    mockDimensions.mockReturnValue({ width: 768, height: 1024, scale: 1, fontScale: 1 });
    const view = renderBar();
    expect(view.queryByLabelText('Abrir menú')).toBeNull();
    expect(view.queryByLabelText('Buscar especialistas')).toBeNull();
    expect(view.getByRole('button', { name: 'Reservar sesión' })).toBeTruthy();
  });

  it('keeps profile, all appearance modes and logout available in the account menu', () => {
    const view = renderBar();
    fireEvent.press(view.getByRole('button', { name: 'Abrir menú de usuario' }));
    expect(view.getByText('Paciente Prueba')).toBeTruthy();
    for (const [label, value] of [['claro', 'light'], ['oscuro', 'dark'], ['sistema', 'system']]) {
      fireEvent.press(view.getByRole('button', { name: `Tema ${label}` }));
      expect(mockSetMode).toHaveBeenLastCalledWith(value);
    }
    fireEvent.press(view.getByRole('button', { name: 'Mi perfil' }));
    expect(mockNavigate).toHaveBeenCalledWith('Profile');
    expect(view.queryByText('Apariencia')).toBeNull();
    fireEvent.press(view.getByRole('button', { name: 'Abrir menú de usuario' }));
    fireEvent.press(view.getByRole('button', { name: 'Cerrar sesión' }));
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it('dismisses the account menu on outside press, back and route changes', () => {
    const view = renderBar();
    const open = () => fireEvent.press(view.getByRole('button', { name: 'Abrir menú de usuario' }));
    open();
    fireEvent.press(view.getByTestId('patient-account-backdrop', { includeHiddenElements: true }));
    expect(view.queryByText('Apariencia')).toBeNull();
    open();
    fireEvent(view.UNSAFE_getByType(Modal), 'requestClose');
    expect(view.queryByText('Apariencia')).toBeNull();
    open();
    view.rerender(<PatientTopBar currentRoute="Profile" onOpenMobileSidebar={jest.fn()} />);
    expect(view.queryByText('Apariencia')).toBeNull();
    expect(view.getByText('Perfil')).toBeTruthy();
  });

  it('shows initials if the avatar cannot load', () => {
    const view = renderBar();
    fireEvent(view.UNSAFE_getByType(Image), 'error');
    expect(view.getByText('PP')).toBeTruthy();
    expect(view.getByRole('button', { name: 'Abrir menú de usuario' })).toBeTruthy();
  });
});
