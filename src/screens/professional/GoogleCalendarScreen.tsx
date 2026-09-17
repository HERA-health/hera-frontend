import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { AppNavigationProp, AppRouteProp } from '../../constants/types';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { getErrorMessage } from '../../constants/errors';
import { Button } from '../../components/common/Button';
import { GoogleCalendarCard } from '../../components/professional/GoogleCalendarCard';
import { completeGoogleCalendar, resolveCalendarSession } from '../../services/googleCalendarService';
import { clearCalendarIntent, getCalendarIntent } from '../../services/googleCalendarIntent';

export function GoogleCalendarScreen() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const navigation = useNavigation<AppNavigationProp>();
  const route = useRoute<AppRouteProp<'GoogleCalendarIntegration'>>();
  const intent = getCalendarIntent();
  const attempt = route.params?.attempt ?? (intent?.kind === 'connect' ? intent.attempt : undefined);
  const [busy, setBusy] = useState(Boolean(attempt));
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (user?.type !== 'professional') return;
    let active = true;
    if (!attempt) { setBusy(false); clearCalendarIntent(); return; }
    setBusy(true); setError(null);
    void completeGoogleCalendar(user.id, attempt).then(() => {
      if (active) { clearCalendarIntent(); navigation.setParams({ attempt: undefined }); }
    }).catch(cause => { if (active) { setError(getErrorMessage(cause)); clearCalendarIntent(); } })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [user?.id, user?.type, attempt, navigation]);
  return <ScrollView contentContainerStyle={[styles.page, { backgroundColor: theme.bg }]}>
    <View style={styles.content}>
      {!user ? <><Text style={{ color: theme.textPrimary }}>Inicia sesión en HERA para completar la vinculación.</Text><Button onPress={() => navigation.navigate('Login', { userType: 'PROFESSIONAL' })}>Iniciar sesión</Button></>
        : user.type !== 'professional' ? <Text style={{ color: theme.textPrimary }}>La vinculación está disponible para especialistas.</Text>
        : <>
          {busy ? <><ActivityIndicator color={theme.primary} /><Text style={{ color: theme.textPrimary }}>Completando la vinculación con Google…</Text></> : null}
          {error ? <Text accessibilityRole="alert" style={{ color: theme.error }}>{error}</Text> : null}
          {!busy ? <GoogleCalendarCard /> : null}
          <Button variant="ghost" onPress={() => { clearCalendarIntent(); navigation.navigate('ProfessionalProfile', { initialTab: 'account' }); }}>Volver a ajustes de cuenta</Button>
        </>}
    </View>
  </ScrollView>;
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
const styles = StyleSheet.create({ page: { flexGrow: 1, padding: 24, gap: 18 }, content: { width: '100%', maxWidth: 700, alignSelf: 'center', gap: 18 } });
