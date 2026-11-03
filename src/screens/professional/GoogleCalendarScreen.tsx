import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { StackActions, useNavigation, useRoute } from '@react-navigation/native';
import type { AppNavigationProp, AppRouteProp } from '../../constants/types';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { getErrorMessage } from '../../constants/errors';
import { GoogleCalendarConnectionState } from '../../components/professional/GoogleCalendarConnectionState';
import { Button } from '../../components/common/Button';
import { completeGoogleCalendar, resolveCalendarSession, offerCalendarImportSetup } from '../../services/googleCalendarService';
import { clearCalendarIntent, getCalendarIntent } from '../../services/googleCalendarIntent';

export function GoogleCalendarScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<AppNavigationProp>();
  const route = useRoute<AppRouteProp<'GoogleCalendarIntegration'>>();
  const intent = getCalendarIntent();
  const attempt = route.params?.attempt ?? (intent?.kind === 'connect' ? intent.attempt : undefined);
  const [busy, setBusy] = useState(Boolean(attempt));
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (user?.type !== 'professional') return;
    let active = true;
    if (!attempt) {
      clearCalendarIntent();
      // A direct link can mount this screen before the navigator is ready.
      const frame = requestAnimationFrame(() => navigation.dispatch(StackActions.replace('ProfessionalProfile', { initialTab: 'google' })));
      return () => cancelAnimationFrame(frame);
    }
    setBusy(true); setError(null);
    void completeGoogleCalendar(user.id, attempt).then(next => {
      if (active) {
        if (next.import?.available) offerCalendarImportSetup(user.id);
        clearCalendarIntent();
        navigation.dispatch(StackActions.replace('ProfessionalProfile', { initialTab: 'google' }));
      }
    }).catch(cause => { if (active) { setError(getErrorMessage(cause)); clearCalendarIntent(); } })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [user?.id, user?.type, attempt, navigation]);
  const professional = user?.type === 'professional';
  return <GoogleCalendarConnectionState
    title={!user ? 'Continúa con tu calendario' : !professional ? 'Conexión para especialistas' : error ? 'Revisa la conexión con Google' : busy ? 'Conectando Google Calendar' : 'Volviendo a tu agenda'}
    description={!user ? 'Inicia sesión en HERA para completar la conexión con Google.' : !professional ? 'Entra con tu cuenta profesional para conectar tu calendario.' : 'Estamos terminando la conexión para que puedas organizar tu agenda desde HERA.'}
    loading={professional && !error} error={error}>
    {!user && <Button onPress={() => navigation.navigate('Login', { userType: 'PROFESSIONAL' })}>Iniciar sesión</Button>}
    {professional && error && <Button variant="outline" onPress={() => { clearCalendarIntent(); navigation.navigate('ProfessionalProfile', { initialTab: 'google' }); }}>Volver a ajustes de Google</Button>}
  </GoogleCalendarConnectionState>;
}

export function GoogleCalendarSessionScreen() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const navigation = useNavigation<AppNavigationProp>();
  const route = useRoute<AppRouteProp<'GoogleCalendarSession'>>();
  const pending = getCalendarIntent();
  const sessionId = route.params?.sessionId ?? (pending?.kind === 'session' ? pending.sessionId : undefined);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (user?.type !== 'professional' || !sessionId) return;
    let active = true;
    setError(null);
    void resolveCalendarSession(sessionId).then(session => {
      if (!active) return;
      clearCalendarIntent();
      if (session.clinicId) navigation.navigate('ProfessionalClinicWorkspace', { clinicId: session.clinicId, section: 'agenda', focusId: session.id });
      else navigation.navigate('ProfessionalSessions', { focusSessionId: session.id });
    }).catch(cause => { if (active) setError(getErrorMessage(cause)); });
    return () => { active = false; };
  }, [user?.id, user?.type, sessionId, navigation, retry]);
  return <View style={[styles.page, { backgroundColor: theme.bg }]}>
    {!user ? <><Text style={{ color: theme.textPrimary }}>Inicia sesión para consultar esta cita en HERA.</Text><Button onPress={() => navigation.navigate('Login', { userType: 'PROFESSIONAL' })}>Iniciar sesión</Button></>
      : user.type !== 'professional' ? <Text style={{ color: theme.textPrimary }}>Esta cita solo está disponible para su especialista.</Text>
      : error ? <><Text accessibilityRole="alert" style={{ color: theme.error }}>{error}</Text><Button onPress={() => setRetry(value => value + 1)}>Reintentar</Button><Button variant="ghost" onPress={() => { clearCalendarIntent(); navigation.navigate('ProfessionalSessions'); }}>Ir a mi agenda</Button></>
      : <ActivityIndicator color={theme.primary} />}
  </View>;
}
const styles = StyleSheet.create({ page: { flexGrow: 1, padding: 20, gap: 18 }, content: { width: '100%', maxWidth: 880, alignSelf: 'center', gap: 12 } });
