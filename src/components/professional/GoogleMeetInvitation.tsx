import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { AppNavigationProp } from '../../constants/types';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { getGoogleCalendarStatus } from '../../services/googleCalendarService';
import { Button } from '../common/Button';

export function GoogleMeetInvitation() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const navigation = useNavigation<AppNavigationProp>();
  const [invitation, setInvitation] = useState<{ userId: string; connected: boolean } | null>(null);
  const userId = user?.type === 'professional' ? user.id : null;
  const storageKey = userId ? `hera:meet-invitation:v1:${userId}` : null;

  useFocusEffect(useCallback(() => {
    let active = true;
    setInvitation(null);
    if (userId && storageKey) {
      void AsyncStorage.getItem(storageKey).then(async dismissed => {
        if (!active || dismissed === 'hidden') return;
        const status = await getGoogleCalendarStatus();
        if (active && status.enabled && status.meetAssignmentsEnabled && status.videoProviderPreference === 'DAILY' && status.status !== 'DISCONNECTING') {
          setInvitation({ userId, connected: status.status === 'CONNECTED' && !status.privacyUpdateRequired });
        }
      }).catch(() => {
        // An optional suggestion must not interrupt the professional's agenda.
      });
    }
    return () => { active = false; };
  }, [userId, storageKey]));

  if (!invitation || invitation.userId !== userId) return null;
  return <View style={[styles.container, { borderColor: theme.border, backgroundColor: theme.bgCard }]}>
    <View style={styles.copy}>
      <Text style={[styles.title, { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold }]}>Tus sesiones con Google Meet</Text>
      <Text style={[styles.description, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>
        {invitation.connected ? 'Tu calendario ya está conectado. Activa Meet para tus próximas videollamadas.' : 'Conecta Google Calendar y activa Meet para tus próximas videollamadas.'} Las citas ya preparadas conservan su acceso.
      </Text>
    </View>
    <View style={styles.actions}>
      <Button size="small" variant="outline" onPress={() => navigation.navigate('ProfessionalProfile', { initialTab: 'account' })}>Configurar Google Meet</Button>
      <Button size="small" variant="ghost" onPress={() => {
        setInvitation(null);
        if (storageKey) void AsyncStorage.setItem(storageKey, 'hidden').catch(() => {
          // Keep it hidden for this view even when local persistence is unavailable.
        });
      }}>Ocultar sugerencia</Button>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  container: { padding: 20, borderWidth: 1, borderRadius: 16, gap: 16, marginBottom: 24, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  copy: { flexGrow: 1, flexBasis: 300, gap: 6 },
  title: { fontSize: 16, lineHeight: 22 },
  description: { fontSize: 14, lineHeight: 22 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
