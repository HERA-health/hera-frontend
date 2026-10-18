import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/common/Button';
import { useTheme } from '../contexts/ThemeContext';
import LoadingScreen from '../screens/LoadingScreen';
import { createDeferredComponent, type DeferredComponentModule } from './createDeferredComponent';

export type RouteModule<Props extends object> =
  | DeferredComponentModule<Props>
  | Promise<DeferredComponentModule<Props>>;

/** Call sites must guard require() with Platform.OS so Metro can omit it on web. */
export function createDeferredRouteComponent<Props extends object>(
  loadModule: () => RouteModule<Props>,
  options: { displayName: string; exportName?: string },
): React.FC<Props> {
  if (Platform.OS !== 'web') {
    return createDeferredComponent(() => {
      const module = loadModule();
      if (module instanceof Promise) throw new Error('Native routes must load synchronously.');
      return module;
    }, options);
  }

  let loaded: React.FC<Props> | undefined;
  let pending: Promise<React.FC<Props>> | undefined;
  const load = () => {
    if (loaded) return Promise.resolve(loaded);
    if (!pending) {
      pending = Promise.resolve().then(loadModule).then(module => {
        loaded = createDeferredComponent(() => module, options);
        return loaded;
      }).finally(() => { pending = undefined; });
    }
    return pending;
  };

  const DeferredRoute: React.FC<Props> = props => {
    const { theme } = useTheme();
    const [Component, setComponent] = useState<React.FC<Props> | undefined>(() => loaded);
    const [failed, setFailed] = useState(false);
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
      if (Component) return;
      let active = true;
      load().then(component => {
        if (active) setComponent(() => component);
      }, () => {
        if (active) setFailed(true);
      });
      return () => { active = false; };
    }, [Component, attempt]);

    if (Component) return <Component {...props} />;
    if (!failed) return <LoadingScreen />;
    return (
      <View style={[styles.error, { backgroundColor: theme.landingCanvas }]}>
        <Text accessibilityRole="alert" style={{ color: theme.textPrimary, fontFamily: theme.fontSans }}>
          No se ha podido cargar esta página. Comprueba tu conexión y vuelve a intentarlo.
        </Text>
        <Button onPress={() => {
          setFailed(false);
          setAttempt(value => value + 1);
        }}>Reintentar</Button>
      </View>
    );
  };
  DeferredRoute.displayName = options.displayName;
  return DeferredRoute;
}

const styles = StyleSheet.create({
  error: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 20 },
});
