import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { getGoogleCalendarStatus, type GoogleCalendarStatus } from '../../services/googleCalendarService';
import { Button } from '../common/Button';

export function VideoCallSetupPrompt({ hasUnsavedChanges, busy, onSetup }: {
  hasUnsavedChanges: boolean;
  busy: boolean;
  onSetup: () => void;
}) {
  const { theme } = useTheme();
  const [status, setStatus] = useState<GoogleCalendarStatus | null>(null);
  useEffect(() => {
    let active = true;
    void getGoogleCalendarStatus().then(next => {
      if (active) setStatus(next);
    }).catch(() => {
      // An optional initial suggestion must not interrupt the profile.
      // Account settings expose errors and retry controls for the actual setup.
    });
    return () => { active = false; };
  }, []);

  const available = status?.enabled && status.meetAssignmentsEnabled === true;
  const reconnect = status?.status === 'REAUTH_REQUIRED' || status?.privacyUpdateRequired;
  const ready = available && status.status === 'CONNECTED' && !reconnect
    && status.meetEnabled && status.videoProviderPreference === 'GOOGLE_MEET';
  const disconnecting = status?.status === 'DISCONNECTING';
  const calendarConnected = status?.status === 'CONNECTED' && !reconnect;
  const title = reconnect ? 'Recupera tus videollamadas con Google Meet'
    : calendarConnected ? 'Solo falta activar Google Meet' : 'Prepara tus videollamadas con Google Meet';
  const copy = reconnect ? 'Renueva la conexión de Google y revisa la activación de Meet para preparar los enlaces de tus nuevas citas.'
    : calendarConnected ? 'Google Calendar ya está conectado. Activa Meet para preparar automáticamente los enlaces de tus nuevas videollamadas.'
    : 'Conecta Google Calendar y activa Meet. Tendrás tus citas en el calendario y un enlace de videollamada por cita.';
  const action = 'Configurar Google Meet';

  // Setup completion belongs to the account, not this browser or device.
  // Keep the prompt absent while loading, including during a staggered rollout.
  if (!status || status.videoSetupCompleted !== false || ready || !available || disconnecting) return null;

  return <View style={[styles.container, { borderColor: theme.borderLight }]}>
      <View style={styles.header}>
        <Image source={require('../../../assets/google-meet.png')} style={styles.logo} resizeMode="contain" accessible={false} />
        <View style={styles.headerCopy}>
          <Text style={[styles.eyebrow, { color: theme.textSecondary, fontFamily: theme.fontSansSemiBold }]}>RECOMENDADO · GOOGLE MEET</Text>
          <Text accessibilityRole="header" style={[styles.title, { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold }]}>{title}</Text>
        </View>
      </View>
      <Text style={[styles.copy, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>{copy}</Text>
      <Button loading={busy} onPress={onSetup}>
        {hasUnsavedChanges ? `Guardar y ${action.charAt(0).toLocaleLowerCase('es-ES')}${action.slice(1)}` : action}
      </Button>
  </View>;
}

const styles = StyleSheet.create({
  container: { marginTop: 20, paddingTop: 20, borderTopWidth: 1, gap: 14 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerCopy: { flex: 1, minWidth: 0, gap: 4 },
  logo: { width: 32, height: 32 },
  eyebrow: { fontSize: 11, lineHeight: 17, letterSpacing: 0.6 },
  title: { fontSize: 16, lineHeight: 23 },
  copy: { fontSize: 14, lineHeight: 22 },
});
