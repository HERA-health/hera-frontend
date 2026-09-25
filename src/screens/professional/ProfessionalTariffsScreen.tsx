import { PackageCatalog } from '../../components/packages/PackageCatalog';
import { CatalogStatusFilter } from '../../components/common/CatalogStatusFilter';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { usePreventRemove } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import type { Theme } from '../../constants/theme';
import type { ScreenProps } from '../../constants/types';
import { Button } from '../../components/common/Button';
import { showAppAlert, useAppAlert } from '../../components/common/alert';
import { getErrorMessage } from '../../constants/errors';
import { loadPrivateCatalog, archivePrivateService, savePrivateCatalogSettings, type PrivateServiceCatalog, type PrivateService } from '../../services/privateCatalogService';
import { formatPrivatePrice } from '../../utils/privateTariff';
import { ServiceOptionDetails } from './ServiceOptionDetails';
import { PrivateServiceEditor } from './PrivateServiceEditor';

const modalities = [{ type: 'VIDEO_CALL', label: 'Videollamada' }, { type: 'IN_PERSON', label: 'Presencial' }, { type: 'PHONE_CALL', label: 'Teléfono' }] as const;
export function ProfessionalTariffsScreen({ navigation, route }: ScreenProps<'ProfessionalTariffs'>) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const alert = useAppAlert();
  const [catalogTab, setCatalogTab] = useState<'services' | 'packages'>('services');
  const [width, setWidth] = useState(0);
  const [catalog, setCatalog] = useState<PrivateServiceCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [archived, setArchived] = useState(false);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<PrivateService | null | undefined>(undefined);
  const [editorSaving, setEditorSaving] = useState(false);
  const [editorRevision, setEditorRevision] = useState(0);
  const [editorDirty, setEditorDirty] = useState(false);
  const [free, setFree] = useState(false);
  const [busy, setBusy] = useState(false);
  const trigger = useRef<HTMLElement | null>(null);
  const dirty = editorDirty || (!!catalog && free !== catalog.firstVisitFree);
  const apply = useCallback((next: PrivateServiceCatalog) => { setCatalog(next); setFree(next.firstVisitFree); }, []);
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { apply(await loadPrivateCatalog()); } catch (e) { setError(getErrorMessage(e, 'No se pudieron cargar los servicios.')); }
    finally { setLoading(false); }
  }, [apply]);
  useEffect(() => { void load(); }, [load]);
  usePreventRemove(dirty, ({ data }) => showAppAlert(alert, 'Cambios sin guardar', 'Puedes seguir editando o descartar tus cambios.', [
    { text: 'Seguir editando', style: 'cancel' }, { text: 'Descartar y salir', style: 'destructive', onPress: () => navigation.dispatch(data.action) },
  ]));
  useEffect(() => {
    if (Platform.OS !== 'web' || !dirty) return;
    const handler = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);
  const returnFocus = () => { if (Platform.OS === 'web') requestAnimationFrame(() => trigger.current?.focus()); };
  const close = () => {
    if (editorSaving) return;
    const discard = () => { setEditing(undefined); setEditorDirty(false); };
    if (!editorDirty) discard();
    else showAppAlert(alert, 'Cambios sin guardar', 'Tu borrador aún no está guardado.', [{ text: 'Seguir editando', style: 'cancel' }, { text: 'Descartar cambios', style: 'destructive', onPress: discard }]);
  };
  const open = useCallback((service: PrivateService | null) => {
    if (Platform.OS === 'web' && document.activeElement instanceof HTMLElement) trigger.current = document.activeElement;
    setEditing(service); setEditorDirty(false); setMessage('');
  }, []);
  useEffect(() => {
    if (!route.params?.openCreateService || !catalog || loading || editing !== undefined) return;
    navigation.setParams({ openCreateService: undefined });
    open(null);
  }, [route.params?.openCreateService, catalog, loading, editing, navigation, open]);
  const archive = (service: PrivateService) => showAppAlert(alert, 'Archivar servicio', 'Dejará de estar disponible para nuevas reservas. Sus citas y facturas se conservarán.', [
    { text: 'Cancelar', style: 'cancel' }, { text: 'Archivar', onPress: () => {
      setBusy(true); setError('');
      void archivePrivateService(service).then(next => { setCatalog(next); setMessage('Servicio archivado. Puedes restaurarlo desde Archivados.'); })
        .catch(e => setError(getErrorMessage(e, 'No se pudo archivar el servicio.'))).finally(() => setBusy(false));
    } },
  ]);
  const services = catalog?.services ?? [];
  const visible = services.filter(s => !!s.archivedAt === archived && s.name.toLocaleLowerCase('es').includes(query.trim().toLocaleLowerCase('es')));
  const wide = width >= 1120;
  const compact = width < 720;
  const serviceActions = (service: PrivateService) => <View style={[styles.actions, styles.row]}>
    <Button variant="secondary" style={{ borderRadius: 8, paddingHorizontal: 12, alignSelf: 'flex-start' }} size="small" disabled={busy} onPress={() => open(service)}>{archived ? 'Restaurar' : 'Editar'}</Button>
    {!archived && service.key !== 'base' && <Button variant="ghost" size="small" accessibilityLabel={`Más acciones de ${service.name}`} disabled={busy} onPress={() => archive(service)}>···</Button>}
  </View>;
  return <View style={styles.root} onLayout={event => setWidth(event.nativeEvent.layout.width)}>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.catalogTabs}>{([{ key: 'services', label: 'Servicios' }, { key: 'packages', label: 'Bonos' }] as const).map(tab => <Pressable key={tab.key} accessibilityRole="tab" accessibilityState={{ selected: catalogTab === tab.key }} onPress={() => setCatalogTab(tab.key)} style={({ pressed }) => [styles.catalogTab, catalogTab === tab.key && styles.selectedCatalogTab, pressed && { opacity: 0.75 }]}><Text style={[styles.catalogTabText, catalogTab === tab.key && styles.selectedCatalogTabText]}>{tab.label}</Text></Pressable>)}</View>
      <View style={catalogTab === 'packages' ? undefined : { display: 'none' }}><PackageCatalog navigation={navigation} /></View>
      <View style={catalogTab === 'services' ? { gap: 24 } : { display: 'none' }}>
      {!!error && <View accessibilityRole="alert" style={styles.feedback}><Text style={styles.error}>{error}</Text><Button variant="ghost" onPress={() => void load()}>Actualizar catálogo</Button></View>}
      {!!message && <Text accessibilityLiveRegion="polite" style={styles.success}>{message}</Text>}
      {loading ? <ActivityIndicator accessibilityLabel="Cargando servicios" color={theme.primary} /> : catalog && <>
        <View style={[styles.filters, compact && styles.stack]}>
          <CatalogStatusFilter archived={archived} onChange={setArchived} />
        <View style={styles.policy}><View style={styles.policyText}><Text style={styles.policyTitle}>Primera sesión gratuita</Text><Text style={styles.small}>Una por paciente · todos tus servicios</Text></View>
          <Switch accessibilityLabel="Ofrecer primera sesión gratuita" value={free} onValueChange={setFree} disabled={busy} trackColor={{ false: theme.textMuted, true: theme.primary }} thumbColor={theme.textOnPrimary} />
          <Button size="small" variant="secondary" style={{ borderRadius: 8, paddingHorizontal: 12 }} accessibilityLabel="Guardar política de primera sesión gratuita" disabled={free === catalog.firstVisitFree} loading={busy} onPress={() => {
            setBusy(true); setError('');
            void savePrivateCatalogSettings(free, catalog.firstVisitFree).then(next => { apply(next); setMessage('Política de primera sesión guardada.'); })
              .catch(e => setError(getErrorMessage(e, 'No se pudo guardar la política.'))).finally(() => setBusy(false));
          }}>Guardar</Button>
        </View>

        </View>
          {services.length > 8 && <TextInput accessibilityLabel="Buscar servicio" placeholder="Buscar por nombre" placeholderTextColor={theme.textSecondary} value={query} onChangeText={setQuery} style={styles.search} />}
        <View style={styles.list}>
          {wide && <View style={styles.columns}><Text style={[styles.overline, styles.nameColumn]}>SERVICIO</Text><View style={[styles.offers, styles.offerColumns]}>{modalities.map(m => <Text key={m.type} style={[styles.overline, styles.modality]}>{m.label.toUpperCase()}</Text>)}</View><Text style={[styles.overline, styles.actions]}>ACCIONES</Text></View>}
          {visible.map(service => <View key={service.id} style={[styles.service, wide && styles.serviceRow]}>
            <View style={wide ? styles.nameColumn : [styles.serviceHeader, compact && styles.stack]}>
              <View style={wide || compact ? styles.mobileIdentity : styles.identity}><Text style={styles.name}>{service.name}</Text>{!!service.description && <Text numberOfLines={2} style={styles.secondary}>{service.description}</Text>}</View>
              {!wide && serviceActions(service)}
            </View>
            <View style={[styles.offers, wide && styles.offerColumns, compact && styles.stack]}>
              {modalities.map(modality => {
                const options = service.options.filter(o => o.modality === modality.type && o.isActive);
                const main = options.find(o => o.isPreferred) ?? options[0];
                const publicCount = options.filter(o => o.isPublic && !catalog.restrictions[o.modality]).length;
                return <View key={modality.type} style={compact ? styles.mobileModality : styles.modality}>
                  {!wide && <Text style={styles.small}>{modality.label}</Text>}
                  {main ? <View style={{ gap: 4 }}><Text style={styles.price}>{main.durationMinutes} min · {formatPrivatePrice(main.priceCents)}</Text>
                    {options.length > 1 && <ServiceOptionDetails options={options} title={`${service.name} · ${modality.label}`} restricted={!!catalog.restrictions[modality.type]} />}
                    {options.length === 1 && <Text style={styles.small}>{archived ? 'Al restaurar: ' : ''}{!publicCount ? 'Solo agenda' : publicCount === options.length ? 'Agenda + reserva online' : `${publicCount} con reserva online`}</Text>}
                  </View> : <Text style={styles.small}>No disponible</Text>}
                </View>;
              })}
            </View>
            {wide && serviceActions(service)}
          </View>)}
          {!visible.length && <View style={styles.empty}><Text style={styles.name}>{query ? 'No hay servicios con ese nombre' : 'No hay servicios archivados'}</Text><Text style={styles.secondary}>Los servicios archivados conservan sus citas y se pueden restaurar.</Text></View>}
        </View>
        <Text style={styles.small}>Los cambios se aplican a nuevas reservas. Las citas anteriores conservan sus condiciones.</Text>
      </>}
      </View>
    </ScrollView>
    <Modal visible={editing !== undefined && !!catalog} transparent animationType="fade" onRequestClose={close} onDismiss={returnFocus}>
      <View style={styles.overlay}><View accessibilityViewIsModal style={[styles.panel, compact && { width: '100%' }]}>
        <View style={styles.panelHeader}><View style={styles.grow}><Text accessibilityRole="header" style={styles.name}>{editing ? editing.archivedAt ? 'Restaurar servicio' : 'Editar servicio' : 'Nuevo servicio'}</Text></View><Button variant="secondary" style={{ borderRadius: 8, paddingHorizontal: 12, alignSelf: 'flex-start' }} size="small" accessibilityLabel="Cerrar editor" disabled={editorSaving} onPress={close}>Cerrar</Button></View>
        {catalog && editing !== undefined && <PrivateServiceEditor key={editorRevision} navigation={navigation} service={editing} sourceCatalog={catalog} onSavingChange={setEditorSaving} onDirtyChange={setEditorDirty} onClose={close}
          onReload={async () => { const next = await loadPrivateCatalog(); const current = next.services.find(s => s.id === editing?.id); if (editing && !current) throw new Error('El servicio ya no está disponible. Tu borrador se conserva.'); setCatalog(next); setEditing(current ?? null); setEditorDirty(false); setEditorRevision(v => v + 1); }}
          onSaved={next => { setCatalog(next); setEditing(undefined); setEditorDirty(false); setMessage('Servicio guardado. Las citas anteriores conservan sus condiciones.'); }} />}
      </View></View>
    </Modal>
  </View>;
}
const createStyles = (t: Theme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: t.bg }, grow: { flex: 1 }, row: { flexDirection: 'row', alignItems: 'center' }, stack: { flexDirection: 'column', alignItems: 'stretch' },
  secondary: { fontFamily: t.fontSans, fontSize: 14, lineHeight: 21, color: t.textSecondary },
  content: { padding: 24, gap: 24, width: '100%', maxWidth: 1600, alignSelf: 'center', paddingBottom: 48 }, filters: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 },
  catalogTabs: { flexDirection: 'row', gap: 24, borderBottomWidth: 1, borderBottomColor: t.border },
  catalogTab: { minHeight: 52, paddingHorizontal: 4, justifyContent: 'center', alignItems: 'center', borderBottomWidth: 3, borderBottomColor: 'transparent', marginBottom: -1 },
  selectedCatalogTab: { borderBottomColor: t.primary },
  catalogTabText: { fontFamily: t.fontSansSemiBold, fontSize: 17, color: t.textSecondary },
  selectedCatalogTabText: { color: t.textPrimary },
  search: { color: t.textPrimary, fontFamily: t.fontSans, fontSize: 14, borderBottomWidth: 1, borderBottomColor: t.border, padding: 12, minWidth: 240 },
  list: { backgroundColor: t.bgCard, borderWidth: 1, borderColor: t.border, borderRadius: 16, overflow: 'hidden' }, columns: { flexDirection: 'row', backgroundColor: t.surface, padding: 20, gap: 16 },
  nameColumn: { width: 220, flexShrink: 0, gap: 5 }, offerColumns: { flex: 1, minWidth: 0 },
  overline: { color: t.textSecondary, fontFamily: t.fontSansSemiBold, fontSize: 10, letterSpacing: 0.8 }, identity: { flex: 1.4, minWidth: 0, gap: 5 }, mobileIdentity: { gap: 5 }, serviceHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 }, modality: { flex: 1, minWidth: 0, gap: 8 },
  service: { padding: 20, borderTopWidth: 1, borderTopColor: t.borderLight, gap: 16 }, offers: { flexDirection: 'row', gap: 16 }, mobileModality: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  name: { fontFamily: t.fontSansSemiBold, fontSize: 17, lineHeight: 24, color: t.textPrimary }, price: { fontFamily: t.fontSansSemiBold, fontSize: 14, color: t.textPrimary }, small: { fontFamily: t.fontSans, fontSize: 12, lineHeight: 18, color: t.textSecondary },
  serviceRow: { flexDirection: 'row', alignItems: 'flex-start' },
  optionDetail: { borderTopWidth: 1, borderTopColor: t.borderLight, paddingVertical: 8, gap: 4 },
  actions: { width: 126, gap: 2 }, policy: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap', maxWidth: '100%' }, policyText: { gap: 2 }, policyTitle: { fontFamily: t.fontSansSemiBold, fontSize: 14, color: t.textPrimary }, empty: { padding: 32, gap: 8 },
  feedback: { gap: 8, padding: 16, borderWidth: 1, borderColor: t.error, borderRadius: 12 }, error: { color: t.error }, success: { color: t.success, fontFamily: t.fontSans },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.32)', alignItems: 'flex-end' }, panel: { flex: 1, width: '94%', maxWidth: 1120, backgroundColor: t.bg }, panelHeader: { padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16, borderBottomWidth: 1, borderBottomColor: t.border },
});
