import type React from 'react';

export type AppAlertTone = 'info' | 'success' | 'error' | 'warning' | 'danger';

export type AppAlertActionRole = 'cancel' | 'confirm' | 'destructive';

export interface AppAlertAction<TValue extends string = string> {
  label: string;
  value: TValue;
  role?: AppAlertActionRole;
}

export interface AppAlertBaseOptions {
  title: string;
  message?: string;
  tone?: AppAlertTone;
  dismissible?: boolean;
}

export interface AppAlertConfirmOptions extends AppAlertBaseOptions {
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

export interface AppAlertChoiceOptions<TValue extends string = string> extends AppAlertBaseOptions {
  actions: AppAlertAction<TValue>[];
}

export interface AppAlertApi {
  show: (options: AppAlertBaseOptions) => Promise<void>;
  info: (options: AppAlertBaseOptions) => Promise<void>;
  success: (options: AppAlertBaseOptions) => Promise<void>;
  error: (options: AppAlertBaseOptions) => Promise<void>;
  warning: (options: AppAlertBaseOptions) => Promise<void>;
  confirm: (options: AppAlertConfirmOptions) => Promise<boolean>;
  choose: <TValue extends string = string>(
    options: AppAlertChoiceOptions<TValue>,
  ) => Promise<TValue | null>;
}

export interface AppAlertProviderProps {
  children: React.ReactNode;
}

export interface AppAlertRequest<TValue = unknown> extends AppAlertBaseOptions {
  id: number;
  kind: 'notice' | 'confirm' | 'choice';
  actions: AppAlertAction[];
  resolve: (value: TValue) => void;
}
