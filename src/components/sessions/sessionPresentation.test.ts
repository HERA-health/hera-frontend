import { waitFor } from '@testing-library/react-native';

import type { AppAlertApi } from '../common/alert';
import { requestClinicSessionStatusConfirmation } from './sessionPresentation';

const buildAlert = (choice: string | null): AppAlertApi => ({
  show: jest.fn(async () => undefined),
  info: jest.fn(async () => undefined),
  success: jest.fn(async () => undefined),
  error: jest.fn(async () => undefined),
  warning: jest.fn(async () => undefined),
  confirm: jest.fn(async () => false),
  choose: jest.fn(async () => choice) as AppAlertApi['choose'],
});

describe('clinic session status confirmations', () => {
  it('does not execute cancellation when the dialog is dismissed', async () => {
    const alert = buildAlert(null);
    const onConfirm = jest.fn();

    requestClinicSessionStatusConfirmation(alert, 'CANCELLED', onConfirm);

    await waitFor(() => expect(alert.choose).toHaveBeenCalledWith({
      title: 'Cancelar cita',
      message: '¿Seguro que quieres cancelar esta cita? Esta acción no se puede deshacer.',
      tone: 'danger',
      dismissible: true,
      actions: [
        { label: 'Volver', value: '0', role: 'cancel' },
        { label: 'Sí, cancelar', value: '1', role: 'destructive' },
      ],
    }));
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('executes completion once only after explicit confirmation', async () => {
    const alert = buildAlert('1');
    const onConfirm = jest.fn();

    requestClinicSessionStatusConfirmation(alert, 'COMPLETED', onConfirm);

    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
    expect(alert.choose).toHaveBeenCalledWith({
      title: 'Completar cita',
      message: 'Confirma que la cita ya ha finalizado. Esta acción no se puede deshacer.',
      tone: 'info',
      dismissible: true,
      actions: [
        { label: 'Volver', value: '0', role: 'cancel' },
        { label: 'Sí, completar', value: '1', role: 'confirm' },
      ],
    });
  });
});
