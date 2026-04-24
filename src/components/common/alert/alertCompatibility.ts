import type { AppAlertApi, AppAlertTone } from './types';

type NativeAlertButtonStyle = 'default' | 'cancel' | 'destructive';

export interface NativeAlertButtonLike {
  text?: string;
  onPress?: () => void;
  style?: NativeAlertButtonStyle;
}

export interface NativeAlertOptionsLike {
  cancelable?: boolean;
}

const DEFAULT_MESSAGE = '';

export function showAppAlert(
  alert: AppAlertApi,
  title: string,
  message?: string,
  buttons?: NativeAlertButtonLike[],
  options?: NativeAlertOptionsLike,
): void {
  if (!buttons || buttons.length === 0) {
    void alert.show({
      title,
      message,
      tone: inferTone(title),
    });
    return;
  }

  void alert
    .choose({
      title,
      message: message ?? DEFAULT_MESSAGE,
      tone: inferTone(title, buttons),
      dismissible: options?.cancelable ?? buttons.some((button) => button.style === 'cancel'),
      actions: buttons.map((button, index) => ({
        label: button.text ?? (index === buttons.length - 1 ? 'Aceptar' : 'Cancelar'),
        value: String(index),
        role:
          button.style === 'cancel'
            ? 'cancel'
            : button.style === 'destructive'
              ? 'destructive'
              : index === buttons.length - 1
                ? 'confirm'
                : undefined,
      })),
    })
    .then((value) => {
      if (value === null) return;
      const index = Number(value);
      buttons[index]?.onPress?.();
    });
}

function inferTone(title: string, buttons?: NativeAlertButtonLike[]): AppAlertTone {
  const normalized = title.toLocaleLowerCase('es-ES');
  if (buttons?.some((button) => button.style === 'destructive')) return 'danger';
  if (normalized.includes('error')) return 'error';
  if (normalized.includes('éxito') || normalized.includes('guardad') || normalized.includes('confirmad')) {
    return 'success';
  }
  if (
    normalized.includes('aviso') ||
    normalized.includes('permiso') ||
    normalized.includes('eliminar') ||
    normalized.includes('rechazar') ||
    normalized.includes('cancelar')
  ) {
    return 'warning';
  }
  return 'info';
}
