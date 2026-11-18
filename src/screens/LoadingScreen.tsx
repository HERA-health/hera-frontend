import React from 'react';
import { Platform, View } from 'react-native';
import LoadingState from '../components/common/LoadingState';
import { GoogleCalendarConnectionState } from '../components/professional/GoogleCalendarConnectionState';
import { getCalendarIntent } from '../services/googleCalendarIntent';

const LoadingScreen = () => {
  if (Platform.OS === 'web' && typeof document !== 'undefined' && document.getElementById('pricing-first-paint') &&
      window.matchMedia('(max-width:767px)').matches) {
    return <View testID="pricing-initial-load" />;
  }
  return getCalendarIntent()?.kind === 'connect'
    ? <GoogleCalendarConnectionState loading title="Preparando tu conexión" description="Estamos recuperando tu sesión de HERA para continuar con Google Calendar." />
    : <LoadingState fullScreen showLogo size="small" message="Preparando tu espacio…" />;
};

export default LoadingScreen;
