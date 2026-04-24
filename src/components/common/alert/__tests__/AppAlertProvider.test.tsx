import React, { useState } from 'react';
import { Text, Pressable, View } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import { AlertProvider, useAppAlert } from '../AppAlertContext';

jest.mock('../../../../contexts/ThemeContext', () => {
  const { lightTheme } = jest.requireActual('../../../../constants/theme');
  return {
    useTheme: () => ({
      theme: lightTheme,
      isDark: false,
      mode: 'light',
      setMode: jest.fn(),
    }),
  };
});

function AlertHarness() {
  const alert = useAppAlert();
  const [result, setResult] = useState('idle');

  return (
    <View>
      <Pressable
        onPress={() => {
          void alert.success({ title: 'Guardado', message: 'Los cambios se han guardado.' });
        }}
      >
        <Text>show success</Text>
      </Pressable>

      <Pressable
        onPress={() => {
          void alert.confirm({ title: 'Confirmar', message: '¿Continuar?' }).then((confirmed) => {
            setResult(confirmed ? 'confirmed' : 'cancelled');
          });
        }}
      >
        <Text>show confirm</Text>
      </Pressable>

      <Pressable
        onPress={() => {
          void alert.info({ title: 'Primero', message: 'Primer aviso.' });
          void alert.error({ title: 'Segundo', message: 'Segundo aviso.' });
        }}
      >
        <Text>show queue</Text>
      </Pressable>

      <Pressable
        onPress={() => {
          void alert
            .choose({
              title: 'Elegir',
              message: 'Selecciona una opción.',
              actions: [
                { label: 'Acción primaria', value: 'primary', role: 'confirm' },
                { label: 'Cancelar', value: 'cancelled', role: 'cancel' },
              ],
            })
            .then((value) => {
              setResult(value ?? 'dismissed');
            });
        }}
      >
        <Text>show choice</Text>
      </Pressable>

      <Text testID="result">{result}</Text>
    </View>
  );
}

function renderHarness() {
  return render(
    <AlertProvider>
      <AlertHarness />
    </AlertProvider>,
  );
}

describe('AlertProvider', () => {
  it('shows simple alerts and closes them', async () => {
    const screen = renderHarness();

    fireEvent.press(screen.getByText('show success'));

    expect(await screen.findByText('Guardado')).toBeTruthy();
    expect(screen.getByText('Los cambios se han guardado.')).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByText('Aceptar'));
    });

    await waitFor(() => {
      expect(screen.queryByText('Guardado')).toBeNull();
    });
  });

  it('resolves confirm as true when accepted', async () => {
    const screen = renderHarness();

    fireEvent.press(screen.getByText('show confirm'));
    expect(await screen.findByText('Confirmar')).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByText('Aceptar'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('result')).toHaveTextContent('confirmed');
    });
  });

  it('resolves confirm as false when cancelled', async () => {
    const screen = renderHarness();

    fireEvent.press(screen.getByText('show confirm'));
    expect(await screen.findByText('Confirmar')).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByText('Cancelar'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('result')).toHaveTextContent('cancelled');
    });
  });

  it('queues alerts without replacing the active alert', async () => {
    const screen = renderHarness();

    fireEvent.press(screen.getByText('show queue'));

    expect(await screen.findByText('Primero')).toBeTruthy();
    expect(screen.queryByText('Segundo')).toBeNull();

    await act(async () => {
      fireEvent.press(screen.getByText('Aceptar'));
    });

    expect(await screen.findByText('Segundo')).toBeTruthy();
  });

  it('resolves the selected cancel action for choice alerts', async () => {
    const screen = renderHarness();

    fireEvent.press(screen.getByText('show choice'));
    expect(await screen.findByText('Elegir')).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByText('Cancelar'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('result')).toHaveTextContent('cancelled');
    });
  });
});
