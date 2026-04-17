import React, { Suspense } from 'react';
import { Platform } from 'react-native';

export type DeferredComponentModule<Props extends object> = {
  default?: React.ComponentType<Props>;
} & Record<string, unknown>;

interface CreateDeferredComponentOptions {
  displayName?: string;
  exportName?: string;
}

const isReactComponent = <Props extends object,>(
  candidate: unknown
): candidate is React.ComponentType<Props> =>
  typeof candidate === 'function' ||
  (typeof candidate === 'object' && candidate !== null);

const resolveComponent = <Props extends object,>(
  module: DeferredComponentModule<Props>,
  exportName?: string
): React.ComponentType<Props> => {
  const candidate = exportName ? module[exportName] : module.default;

  if (!isReactComponent<Props>(candidate)) {
    throw new Error(
      `Unable to resolve deferred component${exportName ? ` "${exportName}"` : ''}.`
    );
  }

  return candidate;
};

export const createDeferredComponent = <Props extends object,>(
  loadModule: () => DeferredComponentModule<Props>,
  options: CreateDeferredComponentOptions = {}
): React.FC<Props> => {
  let LoadedComponent: React.ComponentType<Props> | null = null;

  const DeferredComponent: React.FC<Props> = (props) => {
    if (!LoadedComponent) {
      LoadedComponent = resolveComponent(loadModule(), options.exportName);
    }

    return <LoadedComponent {...props} />;
  };

  DeferredComponent.displayName = options.displayName ?? 'DeferredComponent';

  return DeferredComponent;
};

export const createWebDeferredComponent = <Props extends object,>(
  loadModule: () => DeferredComponentModule<Props>,
  loadAsync: () => Promise<DeferredComponentModule<Props>>,
  options: CreateDeferredComponentOptions = {}
): React.FC<Props> => {
  let LoadedComponent: React.ComponentType<Props> | null = null;

  const LazyComponent =
    Platform.OS === 'web'
      ? React.lazy(async () => ({
          default: resolveComponent(await loadAsync(), options.exportName),
        }))
      : null;

  const DeferredComponent: React.FC<Props> = (props) => {
    if (LazyComponent) {
      return (
        <Suspense fallback={null}>
          <LazyComponent {...props} />
        </Suspense>
      );
    }

    if (!LoadedComponent) {
      LoadedComponent = resolveComponent(loadModule(), options.exportName);
    }

    return <LoadedComponent {...props} />;
  };

  DeferredComponent.displayName = options.displayName ?? 'WebDeferredComponent';

  return DeferredComponent;
};
