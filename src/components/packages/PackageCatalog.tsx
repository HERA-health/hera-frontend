import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Modal, Platform, Text, View } from 'react-native';
import { usePreventRemove } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { Button } from '../common/Button';
import { showAppAlert, useAppAlert } from '../common/alert';
import { getErrorMessage } from '../../constants/errors';
import type { AppNavigationProp } from '../../constants/types';
import { loadPrivateCatalog, type PrivateServiceCatalog } from '../../services/privateCatalogService';
import { loadPackageCatalog, archivePackageCatalog, packageModality, packagePrice, type PackageOffer } from '../../services/packageService';
import { PackageAcquisition } from './PackageAcquisition';
import { PackageEditor } from './PackageEditor';
import { CatalogStatusFilter } from '../common/CatalogStatusFilter';

export function PackageCatalog({ navigation, active = true, onServicesChanged }: { navigation: AppNavigationProp; active?: boolean; onServicesChanged?: (catalog: PrivateServiceCatalog) => void }) {
  const { theme } = useTheme(); const alert = useAppAlert();
  const [offers, setOffers] = useState<PackageOffer[]>([]); const [services, setServices] = useState<PrivateServiceCatalog>();
  const [enabled, setEnabled] = useState(false); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false);
  const [error, setError] = useState(''); const [message, setMessage] = useState(''); const [archived, setArchived] = useState(false);
  const [editing, setEditing] = useState<PackageOffer | null | undefined>(); const [assigning, setAssigning] = useState<PackageOffer>();
  const [dirty, setDirty] = useState(false);
  const opening = useRef(false);
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { const [catalog, source] = await Promise.all([loadPackageCatalog(), loadPrivateCatalog()]); setOffers(catalog.data); setEnabled(catalog.acquisitionsEnabled); setServices(source); }
    catch (e) { setError(getErrorMessage(e, 'No se pudo cargar el catálogo de bonos.')); } finally { setLoading(false); }
  }, []);
  useEffect(() => { if (active) void load(); }, [load, active]);
  usePreventRemove(dirty, ({ data }) => showAppAlert(alert, 'Cambios sin guardar', 'Tu borrador aún no está guardado.', [{ text: 'Seguir editando', style: 'cancel' }, { text: 'Descartar', onPress: () => navigation.dispatch(data.action) }]));
  useEffect(() => { if (Platform.OS !== 'web' || !dirty) return; const handler = (event: BeforeUnloadEvent) => event.preventDefault(); window.addEventListener('beforeunload', handler); return () => window.removeEventListener('beforeunload', handler); }, [dirty]);
  const close = () => { if (busy) return; if (dirty) showAppAlert(alert, 'Descartar borrador', 'Los cambios no se han guardado.', [{ text: 'Seguir editando', style: 'cancel' }, { text: 'Descartar', onPress: () => { setDirty(false); setEditing(undefined); } }]); else setEditing(undefined); };
  const open = async (offer: PackageOffer | null) => {
    if (opening.current || busy) return;
    opening.current = true; setBusy(true); setError('');
    try {
      const [catalog, source] = await Promise.all([loadPackageCatalog(), loadPrivateCatalog()]);
      const current = offer ? catalog.data.find(row => row.id === offer.id) : null;
      if (offer && !current) throw new Error('El bono ya no está disponible.');
      setOffers(catalog.data); setEnabled(catalog.acquisitionsEnabled); setServices(source);
      setEditing(current ?? null); setDirty(false);
    } catch (e) { setError(getErrorMessage(e, 'No se pudo abrir el editor.')); }
    finally { opening.current = false; setBusy(false); }
  };
  const text = { color: theme.textPrimary, fontFamily: theme.fontSans };
  return <View style={{ gap: 20 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}><CatalogStatusFilter archived={archived} onChange={setArchived} /><Button accessibilityLabel="Nuevo bono" icon={<Ionicons name="add" size={20} color={theme.actionPrimaryText} />} onPress={() => void open(null)}>Nuevo bono</Button></View>
    <Text style={{ ...text, color: theme.textSecondary }}>Crea bonos de varias sesiones y asígnalos a tus pacientes. Cada paciente tendrá su propia factura y sus sesiones pendientes.</Text>
    {!enabled && <Text style={text}>Puedes preparar tus bonos, pero por ahora no se pueden asignar a pacientes ni contratar desde la reserva online.</Text>}
    {!!error && editing === undefined && <View style={{ gap: 8 }}><Text accessibilityRole="alert" style={{ color: theme.error }}>{error}</Text><Button variant="ghost" onPress={() => void load()}>Reintentar</Button></View>}
    {!!message && <Text accessibilityLiveRegion="polite" style={{ color: theme.success }}>{message}</Text>}
    {loading ? <ActivityIndicator color={theme.primary} /> : <View style={{ backgroundColor: theme.bgCard, borderWidth: 1, borderColor: theme.border, borderRadius: 16, overflow: 'hidden' }}>
      {!offers.some(o => Boolean(o.archivedAt) === archived) && <View style={{ padding: 28, gap: 10 }}><Text style={text}>{archived ? 'No hay bonos archivados.' : 'Todavía no has creado bonos.'}</Text>{!archived && <Button variant="secondary" onPress={() => void open(null)}>Crear primer bono</Button>}</View>}
      {offers.filter(o => Boolean(o.archivedAt) === archived).map(offer => <View key={offer.id} style={{ padding: 20, borderBottomWidth: 1, borderColor: theme.border, flexDirection: 'row', flexWrap: 'wrap', gap: 20, alignItems: 'center' }}>
        <View style={{ flex: 2, minWidth: 200, gap: 6 }}><Text style={{ ...text, fontSize: 18, fontFamily: theme.fontSansSemiBold }}>{offer.name}</Text><Text style={{ ...text, color: theme.textSecondary }}>{offer.serviceName} · {offer.isPublic ? 'Público' : 'Privado'}</Text>{!!offer.description && <Text style={{ ...text, color: theme.textSecondary }}>{offer.description}</Text>}<Text style={{ ...text, color: theme.textSecondary }}>{offer.options.map(o => `${packageModality(o.modality)} · ${o.durationMinutes} min`).join(' / ')}</Text></View>
        <View style={{ minWidth: 120, gap: 6 }}><Text style={{ ...text, fontSize: 20 }}>{packagePrice(offer.totalCents)}</Text><Text style={text}>{offer.sessions} sesiones</Text></View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}><Button size="small" variant="secondary" onPress={() => void open(offer)}>{archived ? 'Restaurar' : 'Editar'}</Button>{!archived && <><Button size="small" disabled={!enabled || busy} onPress={() => setAssigning(offer)}>Asignar</Button><Button size="small" variant="ghost" disabled={busy} onPress={() => { setBusy(true); void archivePackageCatalog(offer).then(setOffers).catch(e => setError(getErrorMessage(e, 'No se pudo archivar.'))).finally(() => setBusy(false)); }}>Archivar</Button></>}</View>
      </View>)}
    </View>}
    <Modal visible={editing !== undefined} transparent animationType="fade" onRequestClose={close}>
      <View style={{ flex: 1, alignItems: 'flex-end', backgroundColor: '#0005' }}>
        <View accessibilityViewIsModal style={{ width: '100%', maxWidth: 800, flex: 1, backgroundColor: theme.bg }}>
          {editing !== undefined && services && <PackageEditor offer={editing} catalog={services} navigation={navigation}
            onClose={close} onDirtyChange={setDirty} onSavingChange={setBusy}
            onServicesChanged={next => { setServices(next); onServicesChanged?.(next); }}
            onSaved={rows => { setOffers(rows); setEditing(undefined); setDirty(false); setMessage('Bono guardado. Los pacientes que ya lo tenían mantienen el mismo precio y las mismas condiciones.'); }} />}
        </View>
      </View>
    </Modal>
    {assigning && <PackageAcquisition offer={assigning} onClose={() => setAssigning(undefined)} onAcquired={row => { setAssigning(undefined); setMessage(row.payment?.required ? 'Bono asignado. El paciente recibirá su factura y podrá pagar para reservar.' : 'Bono asignado. El paciente puede usarlo y recibirá la factura por correo.'); }} />}
  </View>;
}
