import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../constants/types';
import { useTheme } from '../../contexts/ThemeContext';
import { getGoogleCalendarStatus } from '../../services/googleCalendarService';
import { Button } from '../common/Button';

export function VideoSetupNotice({ onClose }: { onClose: () => void }) {
  const { theme } = useTheme();
  const navigation = useNavigation<AppNavigationProp>();
  const [needed, setNeeded] = useState(false);
  const [meetUnavailable, setMeetUnavailable] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    void getGoogleCalendarStatus().then(status => {
      if (active) {
        const unavailable = status.videoProviderPreference === 'GOOGLE_MEET' && status.meetAssignmentsEnabled === false;
        setMeetUnavailable(unavailable);
        setNeeded(unavailable || (status.videoProviderPreference === 'GOOGLE_MEET' && (!status.meetEnabled || status.status !== 'CONNECTED' || !!status.privacyUpdateRequired)));
      }
    }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, []);
  if (!needed && !error) return null;
  return <View style={{ gap: 8 }}>
    <Text style={{ color: theme.warning }}>{error ? 'No se pudo comprobar la configuración de videollamadas.' : meetUnavailable ? 'Google Meet no está disponible temporalmente para nuevas citas. Puedes elegir Daily en las otras opciones de videollamada.' : 'Completa la configuración de Google para que esta cita tenga su enlace de videollamada.'}</Text>
    <Button variant="outline" onPress={() => { onClose(); navigation.navigate('ProfessionalProfile', { initialTab: 'account' }); }}>{meetUnavailable ? 'Ver opciones de videollamada' : 'Configurar videollamadas'}</Button>
  </View>;
}
