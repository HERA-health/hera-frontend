import React from 'react';
import { Platform, Text } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { createDeferredRouteComponent } from '../createDeferredRouteComponent';

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: { landingCanvas: '#fff', textPrimary: '#000', fontSans: 'System' } }),
}));
jest.mock('../../screens/LoadingScreen', () => {
  const { Text } = jest.requireActual('react-native');
  return () => <Text>Cargando página</Text>;
});
jest.mock('../../components/common/Button', () => {
  const { Pressable, Text } = jest.requireActual('react-native');
  return { Button: ({ children, onPress }: { children: React.ReactNode; onPress: () => void }) => (
    <Pressable onPress={onPress}><Text>{children}</Text></Pressable>
  ) };
});

const Example = ({ label }: { label: string }) => <Text>{label}</Text>;
afterEach(() => jest.restoreAllMocks());

it('keeps native routes synchronous and forwards their props', () => {
  jest.replaceProperty(Platform, 'OS', 'ios');
  const load = jest.fn(() => ({ Example }));
  const Route = createDeferredRouteComponent<{ label: string }>(load, { displayName: 'TestRoute', exportName: 'Example' });
  expect(load).not.toHaveBeenCalled();
  const view = render(<Route label="Primero" />);
  expect(screen.getByText('Primero')).toBeTruthy();
  view.rerender(<Route label="Segundo" />);
  expect(screen.getByText('Segundo')).toBeTruthy();
  expect(load).toHaveBeenCalledTimes(1);
});

it('loads web routes on demand, shares a pending request and caches successful loads', async () => {
  jest.replaceProperty(Platform, 'OS', 'web');
  let resolve!: (module: { Example: typeof Example }) => void;
  const load = jest.fn(() => new Promise<{ Example: typeof Example }>(done => { resolve = done; }));
  const Route = createDeferredRouteComponent<{ label: string }>(load, { displayName: 'TestRoute', exportName: 'Example' });
  expect(load).not.toHaveBeenCalled();
  const view = render(<><Route label="Primero" /><Route label="Segundo" /></>);
  expect(screen.getAllByText('Cargando página')).toHaveLength(2);
  await waitFor(() => expect(load).toHaveBeenCalledTimes(1));
  await act(async () => resolve({ Example }));
  expect(screen.getByText('Primero')).toBeTruthy();
  expect(screen.getByText('Segundo')).toBeTruthy();
  view.unmount();
  render(<Route label="Otra visita" />);
  expect(screen.getByText('Otra visita')).toBeTruthy();
  expect(load).toHaveBeenCalledTimes(1);
});

it('allows retry after a failed web download without losing route props', async () => {
  jest.replaceProperty(Platform, 'OS', 'web');
  const load = jest.fn<Promise<{ Example: typeof Example }>, []>()
    .mockRejectedValueOnce(new Error('Network unavailable'))
    .mockResolvedValueOnce({ Example });
  const Route = createDeferredRouteComponent<{ label: string }>(load, { displayName: 'TestRoute', exportName: 'Example' });
  render(<Route label="Destino original" />);
  await screen.findByText('Reintentar');
  fireEvent.press(screen.getByText('Reintentar'));
  await screen.findByText('Destino original');
  expect(load).toHaveBeenCalledTimes(2);
});

it('allows leaving a route while its web download is pending', async () => {
  jest.replaceProperty(Platform, 'OS', 'web');
  let resolve!: (module: { default: typeof Example }) => void;
  const load = jest.fn(() => new Promise<{ default: typeof Example }>(done => { resolve = done; }));
  const Route = createDeferredRouteComponent<{ label: string }>(load, { displayName: 'TestRoute' });
  const view = render(<Route label="Anterior" />);
  await waitFor(() => expect(load).toHaveBeenCalledTimes(1));
  view.unmount();
  await act(async () => resolve({ default: Example }));
  render(<Route label="Regreso" />);
  expect(screen.getByText('Regreso')).toBeTruthy();
  expect(load).toHaveBeenCalledTimes(1);
});
