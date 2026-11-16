import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import type { AppNavigationProp } from '../../constants/types';
import { Button } from '../common/Button';
import { useSubscription } from '../../hooks/useSubscription';
import { dismissSubscriptionInvitation, trialLabel } from '../../services/subscriptionService';
import { getErrorMessage } from '../../constants/errors';

export function SubscriptionInvitation() {
  const { data, loading, refresh } = useSubscription(); const { theme } = useTheme();
  const navigation = useNavigation<AppNavigationProp>(); const [dismissed, setDismissed] = useState(false);
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  if (loading || !data || data.plan !== 'DIRECTORIO' || !data.trialEligible || data.invitationDismissed || dismissed
    || data.requests.some(request => request.status === 'PENDING')) return null;
  return <View style={{ gap: 10, padding: 20, borderRadius: 12, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.bgCard }}>
    <Text accessibilityRole="header" style={{ color: theme.textPrimary, fontFamily: theme.fontSansSemiBold, fontSize: 16 }}>Un espacio para tu consulta propia</Text>
    <Text style={{ color: theme.textSecondary, fontFamily: theme.fontSans, lineHeight: 22 }}>Conoce los planes y solicita {trialLabel(data.trialPolicy)} de prueba gratuita. HERA confirmará contigo cuándo activarla.</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}><Button onPress={() => navigation.navigate('ProfessionalSubscription')}>Ver mi suscripción</Button>
      <Button variant="ghost" loading={busy} onPress={() => { setBusy(true); void dismissSubscriptionInvitation().then(() => { setDismissed(true); refresh(); }).catch(e => setError(getErrorMessage(e))).finally(() => setBusy(false)); }}>Ahora no</Button></View>
    {!!error && <Text accessibilityRole="alert" style={{ color: theme.error }}>{error}</Text>}
  </View>;
}
