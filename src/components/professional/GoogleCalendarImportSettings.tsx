import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Switch, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../contexts/ThemeContext';
import { Button } from '../common/Button';
import { AnimatedPressable } from '../common/AnimatedPressable';
import { getErrorMessage } from '../../constants/errors';
import { configureCalendarImport, consumeCalendarImportSetup, getImportCalendars } from '../../services/googleCalendarService';
import type { CalendarChoice, CalendarImportStatus } from '../../services/externalCalendarContracts';

export function GoogleCalendarImportSettings({ userId, status, connected, onAuthorize, onChanged }: {
  userId: string; status: CalendarImportStatus; connected: boolean; onAuthorize: () => Promise<void>; onChanged: () => Promise<void>;
}) {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false), [loadingCalendars, setLoadingCalendars] = useState(false), [error, setError] = useState('');
  const [action, setAction] = useState<'save' | 'disable' | 'authorize' | null>(null);
  const busy = loadingCalendars || action !== null;
  const [choices, setChoices] = useState<CalendarChoice[]>([]), [selected, setSelected] = useState<string[]>([]);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => { if (status.available && consumeCalendarImportSetup(userId)) setOpen(true); }, [status.available, userId]);
  useEffect(() => {
    if (!open || status.permissionRequired || !connected) return;
    let active = true; setLoadingCalendars(true); setError(''); setChoices([]); setSelected([]);
    void getImportCalendars().then(items => { if (active) {
      setChoices(items); setSelected(status.enabled ? status.calendars.map(c => c.id) : items.filter(c => c.primary).map(c => c.id));
    } }).catch(cause => { if (active) setError(getErrorMessage(cause)); }).finally(() => { if (active) setLoadingCalendars(false); });
    return () => { active = false; };
  }, [open, status.permissionRequired, status.revision, connected]);
  if (!status.available) return null;
  const text = { fontFamily: theme.fontSans, fontSize: 14, lineHeight: 21, color: theme.textSecondary };
  const workingButtonStyle = action ? { backgroundColor: theme.actionPrimary, borderColor: theme.actionPrimary } : undefined;
  const workingButtonText = action ? { color: theme.actionPrimaryText } : undefined;
  const run = async (kind: 'save' | 'disable' | 'authorize', operation: () => Promise<void>) => { if (busy) return; setAction(kind); setError(''); try { await operation(); }
    catch (cause) { if (mounted.current) setError(getErrorMessage(cause)); } finally { if (mounted.current) setAction(null); } };
  const save = (enable: boolean) => run(enable ? 'save' : 'disable', async () => {
    await configureCalendarImport({ enabled: enable, calendarIds: enable ? selected : [], revision: status.revision, disclosureVersion: status.disclosureVersion });
    await onChanged(); if (mounted.current) setOpen(false);
  });
  return <View style={{ gap: 8, borderTopWidth: 1, borderColor: theme.borderLight, paddingTop: 18 }}>
    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
      <Text style={[text, { flex: 1, fontFamily: theme.fontSansSemiBold, color: theme.textPrimary }]}>Incluir eventos de Google en mi agenda de HERA</Text>
      <Switch accessibilityLabel="Incluir eventos de Google en mi agenda de HERA" value={status.enabled || open} disabled={busy || (!connected && !status.enabled)}
        accessibilityHint={open && !status.enabled ? 'Pendiente de guardar los calendarios para activar la importación.' : undefined}
        onValueChange={value => { if (status.enabled) { void save(false); } else { setError(''); setOpen(value); } }}
        thumbColor={theme.bgCard} {...(Platform.OS === 'web' ? { activeThumbColor: theme.bgCard } : {})}
        trackColor={{ false: theme.border, true: theme.actionPrimary }} />
    </View>
    <Text style={text}>{status.enabled
      ? 'Tus otros compromisos aparecen en HERA y bloquean los horarios ocupados.'
      : open ? 'Elige los calendarios que quieres ver en HERA y guarda para empezar.'
      : 'Activa esta opción para ver también tus compromisos de Google en HERA y evitar solapamientos.'}</Text>
    {open && !status.enabled && <Text accessibilityLiveRegion="polite" style={[text, { fontSize: 12, fontFamily: theme.fontSansSemiBold, color: theme.warning }]}>Pendiente de guardar · Aún no se incluyen eventos.</Text>}
    {action === 'disable' && <Text accessibilityLiveRegion="polite" style={text}>Desactivando…</Text>}
    {status.enabled && !open && <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
      <Text style={text}>{!status.calendars.length ? 'Revisa el acceso a tus calendarios' : `${status.calendars.length} ${status.calendars.length === 1 ? 'calendario incluido' : 'calendarios incluidos'}`}</Text>
      <Button variant="ghost" size="small" disabled={busy || !connected} onPress={() => setOpen(true)}>Cambiar</Button>
    </View>}
    {status.enabled && <Text style={[text, { fontSize: 12 }]}>Al desactivar, sus horarios dejarán de bloquear nuevas citas. Tus citas de HERA seguirán apareciendo en Google.</Text>}
    {open && <View style={{ padding: 16, gap: 12, borderRadius: 12, backgroundColor: theme.bgMuted }}>
      <Text style={[text, { fontFamily: theme.fontSansSemiBold, color: theme.textPrimary }]}>Calendarios que quieres incluir</Text>
      <Text style={text}>Marca los calendarios que usas para organizar tu tiempo.</Text>
      {status.permissionRequired ? <>
        <Text style={text}>Autoriza la lectura con la misma cuenta de Google que tienes conectada a HERA. Después podrás elegir los calendarios.</Text>
        <Button disabled={busy || !connected} style={workingButtonStyle} textStyle={workingButtonText}
          accessibilityState={{ busy: action === 'authorize' }}
          icon={action === 'authorize' ? <ActivityIndicator size="small" color={theme.actionPrimaryText} /> : undefined}
          onPress={() => { void run('authorize', onAuthorize); }}>{action === 'authorize' ? 'Abriendo Google…' : 'Continuar con Google'}</Button>
      </> : loadingCalendars ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 88 }}><ActivityIndicator accessibilityLabel="Cargando calendarios" color={theme.primary} /><Text style={text}>Buscando tus calendarios…</Text></View> : <>
        {choices.map(c => <AnimatedPressable key={c.id} accessibilityRole="checkbox" accessibilityLabel={c.name} disabled={busy} accessibilityState={{ checked: selected.includes(c.id), disabled: busy }}
          hoverLift={false} onPress={() => setSelected(ids => ids.includes(c.id) ? ids.filter(id => id !== c.id) : [...ids, c.id])}
          style={{ flexDirection: 'row', gap: 10, minHeight: 44, alignItems: 'center' }}>
          <Ionicons name={selected.includes(c.id) ? 'checkbox' : 'square-outline'} size={22} color={theme.primary} />
          <View style={{ flex: 1 }}><Text style={[text, { color: theme.textPrimary }]}>{c.name}</Text>
            {c.availabilityOnly && <Text style={[text, { fontSize: 12 }]}>Solo se mostrarán los horarios ocupados.</Text>}</View>
        </AnimatedPressable>)}
        {!choices.length && !error && <Text style={text}>No hay calendarios disponibles en esta cuenta.</Text>}
        <Text style={[text, { fontSize: 12 }]}>Verás el título y el horario. Los eventos se editan en Google y no crean sesiones en HERA.</Text>
        <Button disabled={!selected.length || busy} style={workingButtonStyle} textStyle={workingButtonText}
          accessibilityState={{ busy: action === 'save' }}
          icon={action === 'save' ? <ActivityIndicator size="small" color={theme.actionPrimaryText} /> : undefined}
          onPress={() => { void save(true); }}>{action === 'save' ? 'Guardando…' : status.enabled ? 'Guardar calendarios' : 'Guardar y activar'}</Button>
      </>}
      <Button variant="ghost" disabled={busy} style={{ backgroundColor: 'transparent', borderColor: 'transparent' }}
        onPress={() => { setOpen(false); setError(''); }}>{status.enabled ? 'Cancelar' : 'Ahora no'}</Button>
    </View>}
    {error && <Text accessibilityRole="alert" style={[text, { color: theme.error }]}>{error}</Text>}
  </View>;
}
