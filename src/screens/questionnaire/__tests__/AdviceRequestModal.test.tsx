import React, { useState } from 'react';
import { View } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Button } from '../../../components/common/Button';
import { AdviceRequestModal } from '../components/AdviceRequestModal';
import {
  sendAdvice,
  type AdviceRequest,
} from '../../../services/questionnaireService';
jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: require('../../../constants/theme').lightTheme }),
}));
jest.mock('../../../services/questionnaireService', () => ({
  sendAdvice: jest.fn(),
}));
jest.mock('../../../utils/secureRandom', () => ({
  createSecureRandomUuid: () => 'retry-key',
}));
const onClose = jest.fn();
const onView = jest.fn();
const sent: AdviceRequest = {
  id: 'saved',
  status: 'SUBMITTED',
  specialistId: null,
  createdAt: '',
  expiresAt: null,
  submittedAt: '',
  respondedAt: null,
  teamNotifiedAt: null,
  patientNotifiedAt: null,
  notificationPending: true,
  questionnaire: null,
  request: null,
  response: null,
};
function Harness() {
  const [visible, setVisible] = useState(true);
  return (
    <>
      <Button onPress={() => setVisible(true)}>Abrir orientación</Button>
      <AdviceRequestModal
        visible={visible}
        onClose={() => {
          onClose();
          setVisible(false);
        }}
        onViewRequest={onView}
        onSent={() => {}}
      />
    </>
  );
}
beforeEach(() => {
  jest.clearAllMocks();
});
test('closing and reopening keeps the unsent text in memory', () => {
  render(<Harness />);
  fireEvent.changeText(
    screen.getByLabelText('Cuéntanos qué necesitas'),
    'Mi consulta',
  );
  fireEvent.press(screen.getByLabelText('Cerrar asesoramiento'));
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(sendAdvice).not.toHaveBeenCalled();
  fireEvent.press(screen.getByText('Abrir orientación'));
  expect(screen.getByLabelText('Cuéntanos qué necesitas').props.value).toBe(
    'Mi consulta',
  );
});
test('a retry preserves the key and sharing choice, prevents duplicate sends and reports pending email honestly', async () => {
  jest.mocked(sendAdvice).mockRejectedValueOnce(new Error('Sin conexión'));
  render(<Harness />);
  const input = screen.getByLabelText('Cuéntanos qué necesitas');
  expect(input.props.maxLength).toBe(500);
  fireEvent.changeText(input, 'Ayuda para elegir');
  fireEvent.press(screen.getByText('Enviar solicitud al equipo'));
  await screen.findByText('Sin conexión');
  expect(input.props.value).toBe('Ayuda para elegir');
  let finish!: (value: AdviceRequest) => void;
  jest.mocked(sendAdvice).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const button = screen.getByText('Enviar solicitud al equipo');
  fireEvent.press(button);
  fireEvent.press(button);
  fireEvent.press(screen.getByLabelText('Cerrar asesoramiento'));
  expect(onClose).not.toHaveBeenCalled();
  expect(sendAdvice).toHaveBeenCalledTimes(2);
  expect(jest.mocked(sendAdvice).mock.calls[0]).toEqual(
    jest.mocked(sendAdvice).mock.calls[1],
  );
  expect(jest.mocked(sendAdvice).mock.calls[1][0].shareQuestionnaire).toBe(
    false,
  );
  await act(async () => {
    finish(sent);
  });
  await screen.findByText('Tu solicitud está guardada');
  expect(screen.getByText(/El aviso por correo está pendiente/)).toBeTruthy();
  fireEvent.press(screen.getByText('Ver solicitud'));
  expect(onView).toHaveBeenCalledWith('saved');
});
test('a different request context starts a separate form', async () => {
  const props = {
    visible: true,
    onClose,
    onViewRequest: onView,
    onSent: jest.fn(),
  };
  const { rerender } = render(
    <View>
      <AdviceRequestModal key="first" {...props} draftId="first" />
    </View>,
  );
  fireEvent.changeText(
    screen.getByLabelText('Cuéntanos qué necesitas'),
    'Texto anterior',
  );
  fireEvent.press(screen.getByRole('checkbox'));
  rerender(
    <View>
      <AdviceRequestModal key="second" {...props} draftId="second" />
    </View>,
  );
  expect(screen.getByLabelText('Cuéntanos qué necesitas').props.value).toBe('');
  expect(screen.getByRole('checkbox').props.accessibilityState.checked).toBe(
    false,
  );
  expect(sendAdvice).not.toHaveBeenCalled();
});
