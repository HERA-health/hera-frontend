import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';

import { AppAlertModal } from './AppAlertModal';
import type {
  AppAlertApi,
  AppAlertBaseOptions,
  AppAlertChoiceOptions,
  AppAlertConfirmOptions,
  AppAlertProviderProps,
  AppAlertRequest,
} from './types';

const AppAlertContext = createContext<AppAlertApi | null>(null);

const DEFAULT_CONFIRM_LABEL = 'Aceptar';
const DEFAULT_CANCEL_LABEL = 'Cancelar';

export function AlertProvider({ children }: AppAlertProviderProps) {
  const nextId = useRef(1);
  const queue = useRef<AppAlertRequest[]>([]);
  const [current, setCurrent] = useState<AppAlertRequest | null>(null);

  const showNext = useCallback(() => {
    setCurrent((active) => {
      if (active) return active;
      return queue.current.shift() ?? null;
    });
  }, []);

  const enqueue = useCallback(<TValue,>(request: Omit<AppAlertRequest<TValue>, 'id' | 'resolve'>) => {
    return new Promise<TValue>((resolve) => {
      const nextRequest: AppAlertRequest<TValue> = {
        ...request,
        id: nextId.current,
        resolve,
      };
      nextId.current += 1;

      setCurrent((active) => {
        if (active) {
          queue.current.push(nextRequest as AppAlertRequest);
          return active;
        }
        return nextRequest as AppAlertRequest;
      });
    });
  }, []);

  const resolveCurrent = useCallback(
    (value: unknown) => {
      const active = current;
      if (!active) return;

      active.resolve(value);
      setCurrent(null);
      requestAnimationFrame(showNext);
    },
    [current, showNext],
  );

  const api = useMemo<AppAlertApi>(() => {
    const show = async (options: AppAlertBaseOptions) => {
      await enqueue<void>({
        ...options,
        tone: options.tone ?? 'info',
        dismissible: options.dismissible ?? true,
        kind: 'notice',
        actions: [{ label: DEFAULT_CONFIRM_LABEL, value: 'ok', role: 'confirm' }],
      });
    };

    return {
      show,
      info: (options) => show({ ...options, tone: 'info' }),
      success: (options) => show({ ...options, tone: 'success' }),
      error: (options) => show({ ...options, tone: 'error' }),
      warning: (options) => show({ ...options, tone: 'warning' }),
      confirm: async (options: AppAlertConfirmOptions) => {
        const confirmed = await enqueue<boolean>({
          ...options,
          tone: options.tone ?? (options.destructive ? 'danger' : 'warning'),
          dismissible: options.dismissible ?? false,
          kind: 'confirm',
          actions: [
            {
              label: options.cancelLabel ?? DEFAULT_CANCEL_LABEL,
              value: 'cancel',
              role: 'cancel',
            },
            {
              label: options.confirmLabel ?? DEFAULT_CONFIRM_LABEL,
              value: 'confirm',
              role: options.destructive ? 'destructive' : 'confirm',
            },
          ],
        });
        return confirmed;
      },
      choose: async <TValue extends string = string>(options: AppAlertChoiceOptions<TValue>) => {
        const value = await enqueue<TValue | null>({
          ...options,
          tone: options.tone ?? 'info',
          dismissible: options.dismissible ?? true,
          kind: 'choice',
          actions: options.actions,
        });
        return value;
      },
    };
  }, [enqueue]);

  return (
    <AppAlertContext.Provider value={api}>
      {children}
      <AppAlertModal
        request={current}
        onAction={(action) => {
          if (action.role === 'cancel') {
            resolveCurrent(current?.kind === 'confirm' ? false : action.value);
            return;
          }
          if (current?.kind === 'confirm' && (action.role === 'confirm' || action.role === 'destructive')) {
            resolveCurrent(true);
            return;
          }
          resolveCurrent(action.value);
        }}
        onDismiss={() => {
          if (current?.dismissible) resolveCurrent(null);
        }}
      />
    </AppAlertContext.Provider>
  );
}

export function useAppAlert(): AppAlertApi {
  const context = useContext(AppAlertContext);
  if (!context) {
    throw new Error('useAppAlert must be used inside AlertProvider');
  }
  return context;
}
