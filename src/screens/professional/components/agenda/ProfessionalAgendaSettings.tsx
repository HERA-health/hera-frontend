import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Switch, Text, View, useWindowDimensions } from 'react-native';
import { Button } from '../../../../components/common';
import { useTheme } from '../../../../contexts/ThemeContext';
import { getErrorMessage } from '../../../../constants/errors';
import { getAgendaPreferences, updateAgendaPreferences, type AgendaPreferences } from '../../../../services/professionalService';

const FIELDS: { key: keyof AgendaPreferences; label: string; description: string }[] = [
  { key: 'autoConfirmSessionRequests', label: 'Confirmación automática', description: 'Confirma al momento las reservas en horarios disponibles. Si la desactivas, podrás aprobarlas antes de confirmarlas.' },
  { key: 'emailSessionRequestsEnabled', label: 'Nueva reserva', description: 'Recibe un email cuando un paciente reserve o solicite una cita.' },
  { key: 'emailSessionCancellationsEnabled', label: 'Cancelación de cita', description: 'Recibe un email si un paciente cancela una cita.' },
  { key: 'emailSessionReminder24hEnabled', label: 'Recordatorio 24 h antes', description: 'Recibe un email por cada cita confirmada, 24 horas antes.' },
];

interface Props {
  visible: boolean;
  anchor: { x: number; y: number } | null;
  onClose: () => void;
  onGoogleCalendar: () => void;
  onAvailability: () => void;
}

export function ProfessionalAgendaSettings({ visible, anchor, onClose, onGoogleCalendar, onAvailability }: Props) {
  const { theme } = useTheme();
  const { width, height } = useWindowDimensions();
  const mobile = width < 768;
  const [saved, setSaved] = useState<AgendaPreferences | null>(null);
  const [draft, setDraft] = useState<AgendaPreferences | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const sequence = useRef(0);
  useEffect(() => {
    const request = ++sequence.current;
    if (!visible) return;
    setLoading(true); setSaving(false); setSaved(null); setDraft(null); setError('');
    void getAgendaPreferences().then((preferences) => {
      if (request !== sequence.current) return;
      if (!preferences) throw new Error('No se encontró la configuración de agenda.');
      setSaved(preferences); setDraft(preferences);
    }).catch((cause: unknown) => {
      if (request === sequence.current) setError(getErrorMessage(cause, 'No se pudieron cargar los ajustes.'));
    }).finally(() => { if (request === sequence.current) setLoading(false); });
    return () => { sequence.current += 1; };
  }, [visible, retry]);

  const dirty = Boolean(saved && draft && FIELDS.some(({ key }) => saved[key] !== draft[key]));
  const save = async () => {
    if (!saved || !draft || saving || !dirty) return;
    const changes: Partial<AgendaPreferences> = {};
    FIELDS.forEach(({ key }) => { if (saved[key] !== draft[key]) changes[key] = draft[key]; });
    const request = sequence.current;
    setSaving(true); setError('');
    try {
      const confirmed = await updateAgendaPreferences(changes);
      if (request !== sequence.current) return;
      setSaved(confirmed); setDraft(confirmed); setSaving(false); onClose();
    } catch (cause: unknown) {
      if (request === sequence.current) setError(getErrorMessage(cause, 'No se pudieron guardar los ajustes. Inténtalo de nuevo.'));
    } finally { if (request === sequence.current) setSaving(false); }
  };
  const close = () => { if (!saving) onClose(); };
  const panelWidth = Math.min(460, width - 24);
  const text = { fontFamily: theme.fontSans, color: theme.textSecondary, fontSize: 13 };
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
    <Pressable onPress={close} accessibilityLabel="Cerrar ajustes" style={{ flex: 1, backgroundColor: theme.overlay, justifyContent: mobile ? 'flex-end' : undefined }}>
      <Pressable onPress={(event) => event.stopPropagation()} accessibilityViewIsModal style={[
        { backgroundColor: theme.bgCard, borderRadius: 16, borderWidth: 1, borderColor: theme.border, overflow: 'hidden', maxHeight: height - 32 },
        mobile ? { margin: 12 } : { position: 'absolute', width: panelWidth, left: Math.max(12, Math.min((anchor?.x ?? width - 12) - panelWidth, width - panelWidth - 12)), top: Math.max(16, Math.min((anchor?.y ?? 100) + 20, height - 620)) },
      ]}>
        <ScrollView contentContainerStyle={{ padding: 22, gap: 20 }}>
          <Text accessibilityRole="header" style={{ fontFamily: theme.fontSansBold, color: theme.textPrimary, fontSize: 21 }}>Agenda y reservas</Text>
          {loading ? <ActivityIndicator accessibilityLabel="Cargando ajustes" color={theme.primary} /> : null}
          {draft ? FIELDS.map(({ key, label, description }, index) => <View key={key} style={{ gap: 8 }}>
            {index === 1 ? <Text style={[text, { fontFamily: theme.fontSansBold, marginTop: 4 }]}>Avisos por email para ti</Text> : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              <View style={{ flex: 1, gap: 5 }}><Text style={{ color: theme.textPrimary, fontFamily: theme.fontSansSemiBold, fontSize: 15 }}>{label}</Text><Text style={text}>{description}</Text></View>
              <Switch accessibilityLabel={label} value={draft[key]} disabled={saving} onValueChange={(value) => setDraft({ ...draft, [key]: value })} trackColor={{ true: theme.primary, false: theme.border }} />
            </View>
          </View>) : null}
          {error ? <View accessibilityRole="alert" style={{ gap: 10 }}><Text style={[text, { color: theme.error }]}>{error}</Text>{!draft && !loading ? <Button size="small" onPress={() => setRetry((value) => value + 1)}>Reintentar</Button> : null}</View> : null}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button variant="outline" size="small" disabled={saving} onPress={close}>Cancelar</Button>
            <Button size="small" disabled={!dirty || saving || loading} loading={saving} onPress={() => { void save(); }}>Guardar</Button>
          </View>
          <View style={{ gap: 10, borderTopWidth: 1, borderColor: theme.borderLight, paddingTop: 16 }}>
            <Button variant="outline" size="small" disabled={saving} onPress={() => { onClose(); onAvailability(); }}>Disponibilidad</Button>
            <Button variant="outline" size="small" disabled={saving} onPress={() => { onClose(); onGoogleCalendar(); }}>Google Calendar</Button>
          </View>
        </ScrollView>
      </Pressable>
    </Pressable>
  </Modal>;
}
