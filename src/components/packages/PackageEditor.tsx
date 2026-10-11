import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../contexts/ThemeContext';
import type { Theme } from '../../constants/theme';
import type { AppNavigationProp } from '../../constants/types';
import { getErrorCode, getErrorMessage } from '../../constants/errors';
import { loadPrivateCatalog, type PrivateService, type PrivateServiceCatalog } from '../../services/privateCatalogService';
import { loadPackageCatalog, savePackageCatalog, packagePrice, type PackageOffer } from '../../services/packageService';
import { PRIVATE_MODALITIES, principalPrivateOption } from '../../utils/privateServiceDraft';
import { packagePublicationIssue, packageSavings, packageServiceNeedsReview, packageServiceOptions, parsePackageValues } from '../../utils/packageDraft';
import { PrivateServiceEditor } from '../../screens/professional/PrivateServiceEditor';
import { AnimatedPressable } from '../common/AnimatedPressable';
import { Button } from '../common/Button';
import { showAppAlert, useAppAlert } from '../common/alert';

export function PackageEditor({ offer, catalog, navigation, onSaved, onClose, onDirtyChange, onSavingChange, onServicesChanged }: {
  offer: PackageOffer | null; catalog: PrivateServiceCatalog; navigation: Pick<AppNavigationProp, 'navigate'>;
  onSaved: (offers: PackageOffer[]) => void; onClose: () => void;
  onDirtyChange: (dirty: boolean) => void; onSavingChange: (saving: boolean) => void;
  onServicesChanged: (catalog: PrivateServiceCatalog) => void;
}) {
  const { theme } = useTheme(); const { width } = useWindowDimensions();
  const alert = useAppAlert();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [source, setSource] = useState(catalog);
  const [name, setName] = useState(offer?.name ?? '');
  const [description, setDescription] = useState(offer?.description ?? '');
  const [serviceId, setServiceId] = useState(offer?.serviceId ?? '');
  const [serviceVersion, setServiceVersion] = useState(catalog.services.find(s => s.id === offer?.serviceId)?.version);
  const [optionIds, setOptionIds] = useState(offer?.options.map(option => option.id) ?? []);
  const [sessions, setSessions] = useState(String(offer?.sessions ?? 5));
  const [price, setPrice] = useState(offer ? (offer.totalCents / 100).toFixed(2) : '');
  const [isPublic, setPublic] = useState(offer?.isPublic ?? true);
  const [version, setVersion] = useState(offer?.version ?? 0);
  const [restoreArchived, setRestoreArchived] = useState(Boolean(offer?.archivedAt));
  const [busy, setBusy] = useState(false); const submitting = useRef(false);
  const [error, setError] = useState(''); const [conflict, setConflict] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [configuring, setConfiguring] = useState<PrivateService>();
  const [configurationDirty, setConfigurationDirty] = useState(false);
  const service = source.services.find(s => s.id === serviceId);
  const options = packageServiceOptions(service);
  const retired = optionIds.filter(id => !options.some(option => option.id === id));
  const publicationIssue = packagePublicationIssue(service, optionIds, source.restrictions);
  const values = parsePackageValues(sessions, price);
  useEffect(() => onDirtyChange(dirty || configurationDirty), [dirty, configurationDirty, onDirtyChange]);
  const change = () => { setDirty(true); setError(''); };
  const selectService = (next: PrivateService) => {
    if (next.id === serviceId) return;
    setServiceId(next.id); setServiceVersion(next.version);
    const active = packageServiceOptions(next); setOptionIds(active.map(o => o.id));
    if (active.some(o => !o.isPublic)) setPublic(false);
    change();
  };
  const refresh = async () => {
    if (submitting.current) return;
    submitting.current = true; setBusy(true); onSavingChange(true);
    try {
      const [latest, next] = await Promise.all([loadPackageCatalog(), loadPrivateCatalog()]);
      const current = latest.data.find(item => item.id === offer?.id);
      if (offer && !current) throw new Error('El bono ya no está disponible. Tu borrador se conserva.');
      setVersion(current?.version ?? 0); setRestoreArchived(Boolean(current?.archivedAt)); setSource(next);
      setServiceVersion(next.services.find(s => s.id === serviceId)?.version);
      onServicesChanged(next); setConflict(false);
      setError(current?.archivedAt
        ? 'El bono está archivado. Revisa las condiciones: Restaurar y guardar lo reactivará. Tu borrador se conserva.'
        : 'Datos actualizados. Revisa duración, precios y modalidades antes de guardar. Tu borrador se conserva.');
    } catch (e) { setError(getErrorMessage(e, 'No se pudieron actualizar los datos.')); }
    finally { submitting.current = false; setBusy(false); onSavingChange(false); }
  };
  const save = async () => {
    if (submitting.current) return;
    if (!service || service.archivedAt || packageServiceNeedsReview(service)) { setError('Selecciona un servicio activo y configurado.'); return; }
    if (!optionIds.length || retired.length) { setError('Selecciona al menos una modalidad activa y revisa las opciones retiradas.'); return; }
    if (!values) { setError('Introduce entre 1 y 1000 sesiones y un precio entre 0 y 1.000.000 €, con hasta dos decimales.'); return; }
    if (isPublic && publicationIssue) { setError(publicationIssue); return; }
    submitting.current = true; setBusy(true); onSavingChange(true); setError('');
    try {
      onSaved(await savePackageCatalog(offer?.id, { version, name, description: description.trim() || null,
        serviceId, serviceVersion, optionIds, ...values, isPublic, restore: restoreArchived }));
    } catch (e) {
      setConflict(['PACKAGE_VERSION_CONFLICT', 'PACKAGE_SERVICE_CHANGED'].includes(getErrorCode(e) ?? ''));
      setError(getErrorMessage(e, 'No se pudo guardar. Tu borrador se conserva.'));
    } finally { submitting.current = false; setBusy(false); onSavingChange(false); }
  };
  if (configuring) return <PrivateServiceEditor key={`${configuring.id}:${configuring.version}`} navigation={navigation} service={configuring} sourceCatalog={source}
    onDirtyChange={setConfigurationDirty} onSavingChange={onSavingChange}
    onClose={() => {
      if (!configurationDirty) { setConfiguring(undefined); return; }
      showAppAlert(alert, 'Cambios del servicio sin guardar', 'Puedes seguir editando el servicio o volver al bono conservando su borrador.', [
        { text: 'Seguir editando', style: 'cancel' }, { text: 'Descartar cambios del servicio', onPress: () => { setConfigurationDirty(false); setConfiguring(undefined); } },
      ]);
    }} onReload={async () => {
      const next = await loadPrivateCatalog(); const updated = next.services.find(s => s.id === configuring.id);
      if (!updated) throw new Error('El servicio ya no está disponible.');
      setSource(next); setConfiguring(updated);
    }}
    onSaved={next => {
      setSource(next); onServicesChanged(next);
      const updated = next.services.find(s => s.id === configuring.id || s.key === configuring.key);
      if (updated) {
        if (updated.id === serviceId) { setDirty(true); setServiceVersion(updated.version); setError('Servicio actualizado. Revisa las condiciones del bono antes de guardar.'); }
        else selectService(updated);
      }
      setConfigurationDirty(false); setConfiguring(undefined);
    }} />;
  return <View style={styles.root}>
    <View style={styles.header}><View style={styles.flex}><Text style={styles.eyebrow}>SERVICIOS Y BONOS</Text><Text accessibilityRole="header" style={styles.heading}>{offer ? 'Editar bono' : 'Nuevo bono'}</Text></View><Button variant="ghost" disabled={busy} accessibilityLabel="Cerrar editor de bono" onPress={onClose}>Cerrar</Button></View>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.section}><Text style={styles.label}>Nombre del bono <Text style={styles.muted}>· opcional</Text></Text><TextInput accessibilityLabel="Nombre del bono" editable={!busy} style={styles.input} value={name} onChangeText={v => { setName(v); change(); }} maxLength={120} placeholder="Se generará a partir del servicio y las sesiones" placeholderTextColor={theme.textMuted} /></View>
      <View style={styles.section}><Text style={styles.title}>Servicio</Text><View style={styles.chips}>
        {source.services.filter(s => !s.archivedAt).map(s => <Button key={s.id} size="small" variant={serviceId === s.id ? 'primary' : 'secondary'} disabled={busy || packageServiceNeedsReview(s)} onPress={() => selectService(s)}>{s.name}</Button>)}
      </View>
        {!source.services.some(s => !s.archivedAt) && <Text style={styles.muted}>Crea un servicio antes de preparar tu bono.</Text>}
        {source.services.filter(s => !s.archivedAt && packageServiceNeedsReview(s)).map(s => <View key={s.id} style={styles.notice}><Text style={[styles.muted, styles.flex]}>{s.name}: revisa y guarda el servicio para disponer de una duración y un precio por modalidad.</Text><Button disabled={busy} size="small" variant="ghost" onPress={() => setConfiguring(s)}>Revisar servicio {s.name}</Button></View>)}
      </View>
      {!!service && !packageServiceNeedsReview(service) && <View style={styles.serviceData}>
        <Text style={styles.label}>Datos de {service.name}</Text>
        {options.map(option => <View key={option.id} style={styles.dataRow}><Text style={[styles.muted, styles.flex]}>{PRIVATE_MODALITIES.find(m => m.type === option.modality)?.label}</Text><Text style={styles.label}>{option.durationMinutes} min · {packagePrice(option.priceCents)}</Text></View>)}
        <Text style={styles.small}>Se cargan del servicio. El bono tendrá un único precio total.</Text>
      </View>}
      <View style={styles.section}><Text style={styles.title}>Válido para</Text><View style={styles.chips}>
        {PRIVATE_MODALITIES.map(modality => {
          const option = principalPrivateOption(options.filter(o => o.modality === modality.type));
          if (!option || !service || packageServiceNeedsReview(service)) return null;
          const selected = optionIds.includes(option.id);
          return <AnimatedPressable key={option.id} hoverLift={false} pressScale={1} accessibilityRole="checkbox" accessibilityLabel={modality.label} accessibilityState={{ checked: selected, disabled: busy }} disabled={busy}
            onKeyDown={event => { if (event.key === ' ') { event.preventDefault(); if (!busy && !event.repeat) { setOptionIds(ids => selected ? ids.filter(id => id !== option.id) : [...ids, option.id]); change(); } } }}
            onPress={() => { setOptionIds(ids => selected ? ids.filter(id => id !== option.id) : [...ids, option.id]); change(); }}
            style={[styles.chip, selected && styles.selected]}><Ionicons name={selected ? 'checkbox' : 'square-outline'} size={18} color={theme.primary} /><Text style={styles.label}>{modality.label}</Text></AnimatedPressable>;
        })}
      </View><Text style={styles.small}>Cada cita utiliza una sesión, cualquiera que sea la modalidad incluida.</Text>
        {retired.length > 0 && <View style={styles.notice}><Text accessibilityRole="alert" style={[styles.muted, styles.flex]}>El bono incluía opciones retiradas. Elimina esas opciones y elige su cobertura actual; los bonos vendidos conservan sus condiciones.</Text><Button size="small" disabled={busy} variant="secondary" onPress={() => { setOptionIds(ids => ids.filter(id => options.some(o => o.id === id))); change(); }}>Revisar cobertura actual</Button></View>}
      </View>
      <View style={[styles.numericRow, width < 640 && styles.stack]}>
        <View style={styles.flex}><Text style={styles.label}>Nº de sesiones</Text><TextInput style={styles.input} editable={!busy} accessibilityLabel="Número de sesiones" keyboardType="number-pad" value={sessions} onChangeText={v => { setSessions(v); change(); }} /></View>
        <View style={styles.flex}><Text style={styles.label}>Precio total del bono · €</Text><TextInput style={styles.input} editable={!busy} accessibilityLabel="Precio total en euros" keyboardType="decimal-pad" value={price} onChangeText={v => { setPrice(v); change(); }} placeholder="250,00" placeholderTextColor={theme.textMuted} /></View>
      </View>
      {values && <View style={styles.summary}><Text accessibilityLiveRegion="polite" style={styles.summaryPrice}>{packagePrice(values.totalCents / values.sessions)} / sesión</Text>
        {options.filter(o => optionIds.includes(o.id)).map(option => {
          const savings = packageSavings(values.sessions, values.totalCents, option.priceCents);
          return <Text key={option.id} style={styles.small}>{PRIVATE_MODALITIES.find(m => m.type === option.modality)?.label} · {savings.differenceCents >= 0 ? 'Ahorro' : 'Sobreprecio'} de {packagePrice(Math.abs(savings.differenceCents))}{savings.percentage !== null ? ` (${Math.abs(savings.percentage).toLocaleString('es-ES', { maximumFractionDigits: 1 })} %)` : ''} en el bono</Text>;
        })}
      </View>}
      <View style={styles.section}><View style={styles.dataRow}><Text style={[styles.label, styles.flex]}>Descripción · opcional</Text><Text style={styles.small}>{description.length}/240</Text></View><TextInput accessibilityLabel="Descripción del bono" multiline maxLength={240} editable={!busy} style={[styles.input, styles.description]} value={description} onChangeText={v => { setDescription(v); change(); }} placeholder="Explica qué incluye el bono" placeholderTextColor={theme.textMuted} /></View>
      <View style={styles.section}><Text style={styles.title}>Visibilidad del bono</Text><View style={[styles.numericRow, width < 640 && styles.stack]}>
        {([{ value: true, label: 'Bono público', icon: 'globe-outline', text: 'Aparece en tu perfil y los pacientes pueden adquirirlo.' }, { value: false, label: 'Bono privado', icon: 'lock-closed-outline', text: 'No es visible. Tú lo asignas a pacientes concretos.' }] as const).map(choice => <AnimatedPressable key={choice.label} hoverLift={false} pressScale={1} accessibilityRole="radio" accessibilityLabel={choice.label} accessibilityState={{ checked: isPublic === choice.value, disabled: busy || (choice.value && !!publicationIssue) }} disabled={busy || (choice.value && !!publicationIssue)} onPress={() => { setPublic(choice.value); change(); }} onKeyDown={event => { if (event.key === ' ') { event.preventDefault(); if (!busy && !event.repeat && !(choice.value && publicationIssue)) { setPublic(choice.value); change(); } } }} style={[styles.visibility, isPublic === choice.value && styles.selected]}><View style={styles.dataRow}><Ionicons name={choice.icon} size={20} color={theme.primary} /><Text style={[styles.label, styles.flex]}>{choice.label}</Text><Ionicons name={isPublic === choice.value ? 'radio-button-on' : 'radio-button-off'} size={18} color={theme.primary} /></View><Text style={styles.small}>{choice.text}</Text></AnimatedPressable>)}
      </View>{publicationIssue && service && <Text style={styles.small}>{publicationIssue}</Text>}</View>
      <Text style={styles.small}>Los bonos ya adquiridos conservan sus condiciones. Guardar esta plantilla no asigna ni factura bonos a pacientes.</Text>
      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      {conflict && <Button variant="secondary" disabled={busy} onPress={() => void refresh()}>Actualizar datos sin borrar mi borrador</Button>}
    </ScrollView>
    <View style={styles.footer}><Button variant="ghost" disabled={busy} onPress={onClose}>Cancelar</Button><Button loading={busy} disabled={conflict} onPress={() => void save()}>{restoreArchived ? 'Restaurar y guardar' : offer ? 'Guardar bono' : 'Crear bono'}</Button></View>
  </View>;
}
const createStyles = (theme: Theme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg }, flex: { flex: 1 },
  header: { padding: 20, borderBottomWidth: 1, borderColor: theme.border, flexDirection: 'row', gap: 16, alignItems: 'center' },
  eyebrow: { color: theme.textSecondary, fontFamily: theme.fontSansSemiBold, fontSize: 11, letterSpacing: 1.2, marginBottom: 6 },
  heading: { color: theme.textPrimary, fontFamily: theme.fontHeading, fontSize: 28 },
  content: { padding: 24, gap: 18 }, section: { gap: 10 }, title: { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold, fontSize: 18 },
  label: { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold, fontSize: 14 }, muted: { color: theme.textSecondary, fontFamily: theme.fontSans, fontSize: 14, lineHeight: 21 },
  small: { color: theme.textSecondary, fontFamily: theme.fontSans, fontSize: 13, lineHeight: 20 },
  input: { color: theme.textPrimary, fontFamily: theme.fontSans, fontSize: 15, borderWidth: 1, borderColor: theme.border, borderRadius: 8, padding: 12, marginTop: 6, backgroundColor: theme.bgCard },
  description: { minHeight: 80, textAlignVertical: 'top' }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: theme.border, minHeight: 44 },
  selected: { borderColor: theme.primary, backgroundColor: theme.secondaryMuted },
  notice: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 },
  serviceData: { padding: 16, gap: 10, borderRadius: 10, backgroundColor: theme.bgMuted }, dataRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  numericRow: { flexDirection: 'row', gap: 16 }, stack: { flexDirection: 'column' },
  summary: { gap: 6, paddingVertical: 4 }, summaryPrice: { fontFamily: theme.fontSansSemiBold, fontSize: 20, color: theme.primary },
  visibility: { flex: 1, gap: 10, borderRadius: 10, borderWidth: 1, borderColor: theme.border, padding: 16 },
  error: { color: theme.error, fontFamily: theme.fontSans, lineHeight: 22 }, footer: { padding: 20, gap: 12, flexDirection: 'row', justifyContent: 'flex-end', borderTopWidth: 1, borderColor: theme.border },
});
