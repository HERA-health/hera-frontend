import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import {
  loadConnectAndInitialize,
  type StripeConnectInstance,
} from "@stripe/connect-js";
import {
  ConnectComponentsProvider,
  ConnectAccountOnboarding,
  ConnectAccountManagement,
  ConnectBalances,
  ConnectPayouts,
} from "@stripe/react-connect-js";
import { connectSession } from "../../services/sessionPaymentService";
import { useTheme } from "../../contexts/ThemeContext";
import { connectAppearance } from "./connectAppearance";
import { connectFonts } from "./connectFonts";
import { Button } from "../common/Button";
export type ConnectView = "onboarding" | "management" | "balance";
export default function ConnectAccount({
  view,
  onExit,
}: {
  view: ConnectView;
  onExit: () => void;
}) {
  const { theme } = useTheme();
  const [instance, setInstance] = useState<StripeConnectInstance>(),
    [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const latestTheme = useRef(theme);
  latestTheme.current = theme;
  useEffect(() => {
    let active = true;
    let current: StripeConnectInstance | undefined;
    setError(false);
    setInstance(undefined);
    void Promise.all([connectSession(), connectFonts()])
      .then(([first, fonts]) => {
        if (!active) return;
        let secret: string | null = first.clientSecret;
        current = loadConnectAndInitialize({
          publishableKey: first.publishableKey,
          locale: "es-ES",
          appearance: connectAppearance(
            latestTheme.current,
            "HeraSans, sans-serif",
          ),
          fonts,
          fetchClientSecret: async () => {
            if (secret) {
              const value = secret;
              secret = null;
              return value;
            }
            return (await connectSession()).clientSecret;
          },
        });
        setInstance(current);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
      if (current) void current.logout();
    };
  }, [retry]);
  useEffect(() => {
    instance?.update({
      appearance: connectAppearance(theme, "HeraSans, sans-serif"),
    });
  }, [instance, theme]);
  if (error)
    return (
      <View style={{ paddingVertical: 20, gap: 12 }}>
        <Text
          accessibilityRole="alert"
          style={{
            color: theme.error,
            fontFamily: theme.fontSans,
            fontSize: 16,
          }}
        >
          No se pudo abrir Stripe. Comprueba tu conexión y vuelve a intentarlo.
        </Text>
        <Button
          variant="outline"
          style={{ alignSelf: "flex-start" }}
          onPress={() => setRetry((value) => value + 1)}
        >
          Reintentar
        </Button>
      </View>
    );
  if (!instance)
    return (
      <View style={{ paddingVertical: 32, gap: 12 }}>
        <ActivityIndicator
          accessibilityLabel="Abriendo Stripe"
          color={theme.primary}
        />
        <Text
          style={{
            color: theme.textSecondary,
            fontFamily: theme.fontSans,
            textAlign: "center",
          }}
        >
          Abriendo Stripe de forma segura…
        </Text>
      </View>
    );
  const onLoadError = () => setError(true);
  return (
    <View style={{ width: "100%", minWidth: 0 }}>
      <ConnectComponentsProvider connectInstance={instance}>
        {view === "onboarding" ? (
          <ConnectAccountOnboarding onExit={onExit} onLoadError={onLoadError} />
        ) : view === "management" ? (
          <ConnectAccountManagement onLoadError={onLoadError} />
        ) : (
          <>
            <ConnectBalances onLoadError={onLoadError} />
            <ConnectPayouts onLoadError={onLoadError} />
          </>
        )}
      </ConnectComponentsProvider>
    </View>
  );
}
