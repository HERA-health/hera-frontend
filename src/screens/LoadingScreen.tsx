import React from 'react';
import LoadingState from '../components/common/LoadingState';
import { GoogleCalendarConnectionState } from '../components/professional/GoogleCalendarConnectionState';
import { getCalendarIntent } from '../services/googleCalendarIntent';

const LoadingScreen = () => getCalendarIntent()?.kind === 'connect'
  ? <GoogleCalendarConnectionState loading title="Preparando tu conexión" description="Estamos recuperando tu sesión de HERA para continuar con Google Calendar." />
  : <LoadingState fullScreen showLogo size="small" message="Preparando tu espacio…" />;

export default LoadingScreen;
