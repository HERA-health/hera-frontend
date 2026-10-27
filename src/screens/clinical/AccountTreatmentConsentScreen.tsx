import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Button, Card } from '../../components/common';
import { TreatmentConsentDocument } from '../../components/professional/TreatmentConsentDocument';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import type { AppNavigationProp } from '../../constants/types';
import * as consent from '../../services/treatmentConsentService';

export function AccountTreatmentConsentScreen({
  requestId,
  token,
}: {
  requestId: string;
  token: string;
}) {
  const { theme } = useTheme();
  const { isAuthenticated, user } = useAuth();
  const navigation = useNavigation<AppNavigationProp>();
  const [data, setData] = useState<consent.AccountTreatmentConsent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);
  const loggedIn = isAuthenticated && user?.type === 'client';
  const scope = `${user?.id}:${requestId}:${token}`;
  const [dataScope, setDataScope] = useState('');
  const busyRef = useRef(false);
  useEffect(() => {
    let active = true;
    setData(null);
    setError(null);
    if (loggedIn) {
      setBusy(true);
      void consent
        .getAccountTreatmentConsent(requestId, token)
        .then((result) => {
          if (active) {
            setData(result);
            setDataScope(scope);
          }
        })
        .catch((e) => {
          if (active) setError(e instanceof Error ? e.message : 'No se pudo abrir el documento.');
        })
        .finally(() => {
          if (active) setBusy(false);
        });
    }
    return () => {
      active = false;
    };
  }, [loggedIn, requestId, token, reload, scope]);
  const decide = async (decision: 'ACCEPT' | 'REJECT') => {
    if (!data || busy || busyRef.current || !loggedIn || dataScope !== scope) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      setData(await consent.decideAccountTreatmentConsent(requestId, token, data.sha256, decision));
      setDataScope(scope);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo registrar tu decisión.');
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };
  const body = {
    color: theme.textSecondary,
    fontFamily: theme.fontSans,
    fontSize: 15,
    lineHeight: 23,
  };
  return (
    <ScrollView
      style={{ backgroundColor: theme.bg }}
      contentContainerStyle={{
        padding: 20,
        maxWidth: 850,
        width: '100%',
        alignSelf: 'center',
        gap: 16,
      }}
    >
      <Card padding="large">
        <View style={{ gap: 16 }}>
          <Text
            accessibilityRole="header"
            style={{ color: theme.textPrimary, fontFamily: theme.fontHeading, fontSize: 28 }}
          >
            Consentimiento informado
          </Text>
          {!loggedIn ? (
            <>
              <Text style={body}>
                Inicia sesión con la cuenta del paciente destinatario para leer el documento y
                decidir.
              </Text>
              <Button onPress={() => navigation.navigate('Login', { userType: 'CLIENT' })}>
                Iniciar sesión
              </Button>
            </>
          ) : null}
          {busy ? <ActivityIndicator color={theme.primary} /> : null}
          {error ? (
            <>
              <Text accessibilityRole="alert" style={{ ...body, color: theme.error }}>
                {error}
              </Text>
              <Button variant="outline" onPress={() => setReload((value) => value + 1)}>
                Reintentar
              </Button>
            </>
          ) : null}
          {loggedIn && dataScope === scope && data ? (
            <>
              <Text style={body}>
                {data.status === 'REVOKED'
                  ? 'Este consentimiento fue retirado. Puedes conservar el justificante de la aceptación original.'
                  : data.status === 'ACCEPTED'
                    ? data.requestKind === 'WITHDRAWAL'
                      ? 'Tu retirada ha quedado registrada.'
                      : 'Tu consentimiento ha quedado registrado.'
                    : data.status === 'REJECTED'
                      ? 'Has rechazado la solicitud.'
                      : data.status !== 'PENDING'
                        ? 'Esta solicitud ya no admite aceptación.'
                        : 'Lee el documento completo. Si necesitas aclaraciones, consulta con tu profesional antes de aceptar.'}
              </Text>
              <TreatmentConsentDocument html={data.html} borderColor={theme.borderLight} />
              {data.status === 'PENDING' ? (
                <View style={{ gap: 12 }}>
                  <Text style={body}>
                    Al aceptar confirmas la decisión descrita y la recepción de la información
                    incluida en este documento.
                  </Text>
                  <Button disabled={busy} onPress={() => void decide('ACCEPT')}>
                    {data.requestKind === 'WITHDRAWAL'
                      ? 'Confirmar retirada'
                      : 'Aceptar consentimiento informado'}
                  </Button>
                  <Button variant="ghost" disabled={busy} onPress={() => void decide('REJECT')}>
                    Rechazar solicitud
                  </Button>
                </View>
              ) : null}
              {data.acceptedAt ? (
                <Button
                  variant="outline"
                  disabled={busy}
                  onPress={() => {
                    setBusy(true);
                    void consent
                      .downloadAccountReceipt(requestId)
                      .catch((e) =>
                        setError(e instanceof Error ? e.message : 'No se pudo descargar.'),
                      )
                      .finally(() => setBusy(false));
                  }}
                >
                  Descargar documento y justificante
                </Button>
              ) : null}
            </>
          ) : null}
        </View>
      </Card>
    </ScrollView>
  );
}
