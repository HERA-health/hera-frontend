import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import {
  ConnectAccountOnboarding,
  ConnectComponentsProvider,
  ConnectPayouts,
  loadConnectAndInitialize,
  type StripeConnectInstance,
} from "@stripe/stripe-react-native";
import * as WebBrowser from "expo-web-browser";
import { connectSession } from "../../services/sessionPaymentService";
import { useTheme } from "../../contexts/ThemeContext";
import { Button } from "../common/Button";
import { connectAppearance } from "./connectAppearance";
import { connectFonts } from "./connectFonts";
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
    setError(false);
    setInstance(undefined);
    void Promise.all([connectSession(), connectFonts()])
      .then(([first, fonts]) => {
        if (!active) return;
        let secret: string | null = first.clientSecret;
        setInstance(
          loadConnectAndInitialize({
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
          }),
        );
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [retry]);
  useEffect(() => {
    instance?.update({
      appearance: connectAppearance(theme, "HeraSans, sans-serif"),
    });
  }, [instance, theme]);
  if (error)
    return (
      <View style={{ gap: 12, paddingVertical: 20 }}>
        <Text
          accessibilityRole="alert"
          style={{ color: theme.error, fontFamily: theme.fontSans }}
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
      <ActivityIndicator
        accessibilityLabel="Abriendo Stripe"
        color={theme.primary}
      />
    );
  return (
    <View style={{ minHeight: 420 }}>
      <ConnectComponentsProvider connectInstance={instance}>
        {view === "balance" ? (
          <ConnectPayouts
            style={{ height: 550 }}
            onLoadError={() => setError(true)}
          />
        ) : (
          <ConnectAccountOnboarding
            title="Cuenta Stripe"
            onExit={onExit}
            collectionOptions={{
              fields: "eventually_due",
              futureRequirements: "include",
            }}
            onLoadError={() => setError(true)}
          />
        )}
      </ConnectComponentsProvider>
      <Button
        variant="outline"
        style={{ alignSelf: "flex-start", marginTop: 16, maxWidth: "100%" }}
        onPress={() =>
          void WebBrowser.openBrowserAsync("https://dashboard.stripe.com")
        }
      >
        Abrir mi cuenta Stripe
      </Button>
    </View>
  );
}
