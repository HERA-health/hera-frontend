import { Linking, Platform } from 'react-native';

export interface MeetingAccess {
  canJoin: boolean;
  meetingLink: string | null;
  message?: string;
  preparationStatus?: 'NONE' | 'REQUIRES_GOOGLE' | 'PENDING' | 'READY' | 'ERROR' | 'INACTIVE';
}
const opening = new Set<string>();

/** Reserve a web tab during the gesture, before awaiting the authorized URL. */
export async function openSessionMeeting(id: string, load: () => Promise<MeetingAccess>): Promise<void> {
  if (opening.has(id)) return;
  opening.add(id);
  let tab: Window | null = null;
  try {
    if (Platform.OS === 'web') {
      tab = window.open('', '_blank');
      if (!tab) throw new Error('Permite abrir pestañas para HERA y vuelve a pulsar el botón de videollamada.');
      tab.opener = null;
    }
    const meeting = await load();
    if (!meeting.canJoin || !meeting.meetingLink) throw new Error(meeting.message || (
      meeting.preparationStatus === 'PENDING' ? 'Estamos preparando la videollamada. Actualiza el estado en unos segundos.'
        : 'La videollamada no está disponible. Revisa su configuración o contacta con el profesional.'));
    if (tab) { tab.location.replace(meeting.meetingLink); tab = null; }
    else {
      if (!await Linking.canOpenURL(meeting.meetingLink)) throw new Error('Tu dispositivo no puede abrir la videollamada.');
      await Linking.openURL(meeting.meetingLink);
    }
  } finally { tab?.close(); opening.delete(id); }
}
