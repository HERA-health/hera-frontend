import React, { useCallback, useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Modal, Platform, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { usePreventRemove } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { Button } from '../common/Button';
import { showAppAlert, useAppAlert } from '../common/alert';
import { getErrorMessage, getErrorCode } from '../../constants/errors';
import type { AppNavigationProp } from '../../constants/types';
import { loadPrivateCatalog, type PrivateServiceCatalog } from '../../services/privateCatalogService';
import { loadPackageCatalog, savePackageCatalog, archivePackageCatalog, packageModality, packagePrice, type PackageOffer } from '../../services/packageService';
import { PackageAcquisition } from './PackageAcquisition';
import { CatalogStatusFilter } from '../common/CatalogStatusFilter';

export function PackageCatalog({ navigation }: { navigation: AppNavigationProp }) {
  const { theme } = useTheme(); const alert = useAppAlert();
  const [offers, setOffers] = useState<PackageOffer[]>([]); const [services, setServices] = useState<PrivateServiceCatalog>();
  const [enabled, setEnabled] = useState(false); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false);
  const [error, setError] = useState(''); const [message, setMessage] = useState(''); const [archived, setArchived] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [editing, setEditing] = useState<PackageOffer | null | undefined>(); const [assigning, setAssigning] = useState<PackageOffer>();
  const [name, setName] = useState(''); const [serviceId, setServiceId] = useState(''); const [optionIds, setOptionIds] = useState<string[]>([]);
  const [sessions, setSessions] = useState('5'); const [price, setPrice] = useState(''); const [isPublic, setPublic] = useState(false); const [dirty, setDirty] = useState(false);
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { const [catalog, source] = await Promise.all([loadPackageCatalog(), loadPrivateCatalog()]); setOffers(catalog.data); setEnabled(catalog.acquisitionsEnabled); setServices(source); }
    catch (e) { setError(getErrorMessage(e, 'No se pudo cargar el catálogo de bonos.')); } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  usePreventRemove(dirty, ({ data }) => showAppAlert(alert, 'Cambios sin guardar', 'Tu borrador aún no está guardado.', [{ text: 'Seguir editando', style: 'cancel' }, { text: 'Descartar', onPress: () => navigation.dispatch(data.action) }]));
  useEffect(() => { if (Platform.OS !== 'web' || !dirty) return; const handler = (event: BeforeUnloadEvent) => event.preventDefault(); window.addEventListener('beforeunload', handler); return () => window.removeEventListener('beforeunload', handler); }, [dirty]);
  const close = () => { if (busy) return; if (dirty) showAppAlert(alert, 'Descartar borrador', 'Los cambios no se han guardado.', [{ text: 'Seguir editando', style: 'cancel' }, { text: 'Descartar', onPress: () => { setDirty(false); setEditing(undefined); } }]); else setEditing(undefined); };
  const open = (offer: PackageOffer | null) => { setEditing(offer); setName(offer?.name ?? ''); setServiceId(offer?.serviceId ?? ''); setOptionIds(offer?.options.map(o => o.id) ?? []); setSessions(String(offer?.sessions ?? 5)); setPrice(offer ? (offer.totalCents / 100).toFixed(2) : ''); setPublic(offer?.isPublic ?? false); setDirty(false); setError(''); };
  const save = async () => {
    if (!/^\d+(?:[.,]\d{1,2})?$/.test(price) || !/^\d+$/.test(sessions)) { setError('Introduce un precio en euros y un número entero de sesiones.'); return; }
    setBusy(true); setError('');
    try { setOffers(await savePackageCatalog(editing?.id, { version: editing?.version ?? 0, name, serviceId, optionIds, sessions: Number(sessions), totalCents: Math.round(Number(price.replace(',', '.')) * 100), isPublic, restore: Boolean(editing?.archivedAt) })); setEditing(undefined); setDirty(false); setMessage('Bono guardado. Los pacientes que ya lo tenían mantienen el mismo precio y las mismas condiciones.'); }
    catch (e) { setConflict(getErrorCode(e) === 'PACKAGE_VERSION_CONFLICT'); setError(getErrorMessage(e, 'No se pudo guardar. Tu borrador se conserva.')); } finally { setBusy(false); }
  };
  const text = { color: theme.textPrimary, fontFamily: theme.fontSans }; const field = { ...text, borderWidth: 1, borderColor: theme.border, borderRadius: 8, padding: 12 };
  return <View style={{ gap: 20 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}><CatalogStatusFilter archived={archived} onChange={setArchived} /><Button accessibilityLabel="Nuevo bono" icon={<Ionicons name="add" size={20} color={theme.actionPrimaryText} />} onPress={() => open(null)}>Nuevo bono</Button></View>
    <Text style={{ ...text, color: theme.textSecondary }}>Crea bonos de varias sesiones y asígnalos a tus pacientes. Cada paciente tendrá su propia factura y sus sesiones pendientes.</Text>
    {!enabled && <Text style={text}>Puedes preparar tus bonos, pero por ahora no se pueden asignar a pacientes ni contratar desde la reserva online.</Text>}
    {!!error && editing === undefined && <View style={{ gap: 8 }}><Text accessibilityRole="alert" style={{ color: theme.error }}>{error}</Text><Button variant="ghost" onPress={() => void load()}>Reintentar</Button></View>}
    {!!message && <Text accessibilityLiveRegion="polite" style={{ color: theme.success }}>{message}</Text>}
    {loading ? <ActivityIndicator color={theme.primary} /> : <View style={{ backgroundColor: theme.bgCard, borderWidth: 1, borderColor: theme.border, borderRadius: 16, overflow: 'hidden' }}>
      {!offers.some(o => Boolean(o.archivedAt) === archived) && <View style={{ padding: 28, gap: 10 }}><Text style={text}>{archived ? 'No hay bonos archivados.' : 'Todavía no has creado bonos.'}</Text>{!archived && <Button variant="secondary" onPress={() => open(null)}>Crear primer bono</Button>}</View>}
      {offers.filter(o => Boolean(o.archivedAt) === archived).map(offer => <View key={offer.id} style={{ padding: 20, borderBottomWidth: 1, borderColor: theme.border, flexDirection: 'row', flexWrap: 'wrap', gap: 20, alignItems: 'center' }}>
        <View style={{ flex: 2, minWidth: 200, gap: 6 }}><Text style={{ ...text, fontSize: 18, fontFamily: theme.fontSansSemiBold }}>{offer.name}</Text><Text style={{ ...text, color: theme.textSecondary }}>{offer.serviceName}</Text><Text style={{ ...text, color: theme.textSecondary }}>{offer.options.map(o => `${packageModality(o.modality)} · ${o.durationMinutes} min`).join(' / ')}</Text></View>
        <View style={{ minWidth: 120, gap: 6 }}><Text style={{ ...text, fontSize: 20 }}>{packagePrice(offer.totalCents)}</Text><Text style={text}>{offer.sessions} sesiones</Text></View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}><Button size="small" variant="secondary" onPress={() => open(offer)}>{archived ? 'Restaurar' : 'Editar'}</Button>{!archived && <><Button size="small" disabled={!enabled || busy} onPress={() => setAssigning(offer)}>Asignar</Button><Button size="small" variant="ghost" disabled={busy} onPress={() => { setBusy(true); void archivePackageCatalog(offer).then(setOffers).catch(e => setError(getErrorMessage(e, 'No se pudo archivar.'))).finally(() => setBusy(false)); }}>Archivar</Button></>}</View>
      </View>)}
    </View>}
    <Modal visible={editing !== undefined} transparent animationType="fade" onRequestClose={close}><View style={{ flex: 1, alignItems: 'flex-end', backgroundColor: '#0005' }}><ScrollView accessibilityViewIsModal style={{ width: '100%', maxWidth: 720, backgroundColor: theme.bg }} contentContainerStyle={{ padding: 24, gap: 16 }} keyboardShouldPersistTaps="handled">
      <Text accessibilityRole="header" style={{ ...text, fontSize: 24, fontFamily: theme.fontHeading }}>{editing ? 'Editar bono' : 'Nuevo bono'}</Text>
      <Text style={text}>Nombre del bono</Text><TextInput accessibilityLabel="Nombre del bono" style={field} value={name} onChangeText={v => { setName(v); setDirty(true); }} maxLength={120} />
      <Text style={text}>Servicio al que se aplica</Text><View style={{ gap: 8 }}>{services?.services.filter(s => !s.archivedAt && !s.id.startsWith('legacy:')).map(s => <Button key={s.id} variant={serviceId === s.id ? 'primary' : 'secondary'} onPress={() => { setServiceId(s.id); setOptionIds([]); setDirty(true); }}>{s.name}</Button>)}</View>
      <Text style={text}>Modalidades y duraciones incluidas</Text>
      {services?.services.find(s => s.id === serviceId)?.options.filter(o => o.isActive).map(o => <View key={o.id} style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}><Switch accessibilityLabel={`${packageModality(o.modality)} ${o.durationMinutes} minutos`} value={optionIds.includes(o.id)} onValueChange={checked => { setOptionIds(ids => checked ? [...ids, o.id] : ids.filter(id => id !== o.id)); setDirty(true); }} /><Text style={text}>{packageModality(o.modality)} · {o.durationMinutes} min</Text></View>)}
      <Text style={{ ...text, color: theme.textSecondary }}>Elige cómo se podrán usar las sesiones del bono. Cada cita reserva una sesión, sea cual sea la modalidad o duración elegida.</Text>
      <Text style={text}>Número de sesiones del bono</Text><TextInput accessibilityLabel="Número de sesiones" style={field} keyboardType="number-pad" value={sessions} onChangeText={v => { setSessions(v); setDirty(true); }} />
      <Text style={text}>Precio del bono completo (€) · impuestos incluidos</Text><TextInput accessibilityLabel="Precio total en euros" style={field} keyboardType="decimal-pad" value={price} onChangeText={v => { setPrice(v); setDirty(true); }} placeholder="250,00" placeholderTextColor={theme.textMuted} />
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}><Switch accessibilityLabel="Ofrecer este bono en tu reserva online" value={isPublic} onValueChange={v => { setPublic(v); setDirty(true); }} /><Text style={{ ...text, flex: 1 }}>Ofrecer este bono en tu reserva online</Text></View>
      <Text style={{ ...text, color: theme.textSecondary }}>Si lo activas, los pacientes podrán contratar el bono directamente desde tu página de reservas, sin esperar tu aprobación. Si lo desactivas, solo podrás asignarlo tú.</Text>
      {isPublic && <Text style={{ ...text, color: theme.textSecondary }}>Las modalidades y duraciones elegidas también deben estar disponibles para reserva online en el servicio.</Text>}
      <Text style={{ ...text, color: theme.textSecondary }}>Los cambios de precio o condiciones no afectan a los bonos que ya tienen tus pacientes.</Text>
      {!!error && <Text accessibilityRole="alert" style={{ color: theme.error }}>{error}</Text>}
      {conflict && editing && <Button variant="secondary" disabled={busy} onPress={() => { setBusy(true); void loadPackageCatalog().then(catalog => { const current = catalog.data.find(row => row.id === editing.id); if (current) { setEditing(current); setOffers(catalog.data); setConflict(false); setError(`Hemos cargado los últimos cambios del bono sin borrar lo que has escrito. Revisa los datos antes de guardar.`); } }).catch(e => setError(getErrorMessage(e, 'No se pudo actualizar la versión.'))).finally(() => setBusy(false)); }}>Cargar últimos cambios sin borrar los míos</Button>}
      <Button loading={busy} onPress={() => void save()}>{editing?.archivedAt ? 'Restaurar y guardar' : 'Guardar bono'}</Button><Button variant="ghost" disabled={busy} onPress={close}>Cerrar</Button>
    </ScrollView></View></Modal>
    {assigning && <PackageAcquisition offer={assigning} onClose={() => setAssigning(undefined)} onAcquired={() => { setAssigning(undefined); setMessage('Bono asignado. El paciente ya puede usarlo y recibirá la factura por correo.'); }} />}
  </View>;
}
