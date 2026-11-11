import React, { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../contexts/ThemeContext';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { SimpleDropdown } from '../common/SimpleDropdown';
import { getErrorMessage } from '../../constants/errors';
import { publishResource, resourceMetadataSchema, saveResource, uploadResourceFile, type HeraResource, type ResourceMetadata } from '../../services/resourceService';
import { resourceCategories, resourcePlans, fileSizeLabel } from './resourcePresentation';
import { ResourceActions } from './ResourceActions';
import { useAppAlert } from '../common/alert';

export function ResourceEditor({ initial, onClose }: { initial: HeraResource | null; onClose: () => void }) {
  const { theme } = useTheme();
  const alert = useAppAlert();
  const [resource, setResource] = useState(initial);
  const [metadata, setMetadata] = useState<ResourceMetadata>(initial ?? { title: '', description: '', category: 'LEGAL', minimumPlan: 'CALMA' });
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const text = { color: theme.textSecondary, fontFamily: theme.fontSans, lineHeight: 21 };
  const heading = { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold, fontSize: 18 };
  const dirty = !resource || (['title', 'description', 'category', 'minimumPlan'] as const).some(key => metadata[key] !== resource[key]);
  async function run(action: () => Promise<void>) {
    if (pending.current) return;
    pending.current = true; setBusy(true); setError(''); setMessage('');
    try { await action(); } catch (failure) { setError(getErrorMessage(failure)); }
    finally { pending.current = false; setBusy(false); }
  }
  async function save() {
    const input = resourceMetadataSchema.safeParse(metadata);
    if (!input.success) { setError('Completa el título y la descripción antes de guardar.'); return; }
    await run(async () => {
      const saved = await saveResource(resource?.id, input.data);
      setResource(saved); setMetadata(saved); setMessage('Ficha guardada.');
    });
  }
  async function pick() {
    if (!resource) return;
    await run(async () => {
      const selected = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'], multiple: false, copyToCacheDirectory: true });
      if (selected.canceled) return;
      const file = selected.assets[0];
      if (file.size !== undefined && file.size > 15 * 1024 * 1024) throw new Error('El archivo no puede superar 15 MiB.');
      const uploaded = await uploadResourceFile(resource.id, { ...file, mimeType: file.mimeType || (file.name.toLowerCase().endsWith('.docx') ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/pdf') });
      setResource(uploaded.resource);
      setMessage(uploaded.cleanupPending ? 'Archivo guardado. La limpieza del archivo anterior queda pendiente de mantenimiento.' : 'Archivo guardado correctamente.');
    });
  }
  async function publication() {
    if (!resource) return;
    await run(async () => {
      const saved = await publishResource(resource.id, resource.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED');
      setResource(saved); setMessage(saved.status === 'PUBLISHED' ? 'Recurso publicado y disponible en el catálogo.' : 'Publicación retirada. El recurso se conserva como borrador.');
    });
  }
  async function close() {
    if (dirty && (metadata.title || metadata.description) && !await alert.confirm({
      title: 'Cambios sin guardar', message: 'Los cambios de la ficha se perderán. Los archivos ya subidos se conservarán.',
      confirmLabel: 'Salir sin guardar', cancelLabel: 'Seguir editando',
    })) return;
    onClose();
  }
  return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.container}>
    <View style={styles.content}>
      <View style={styles.header}>
        <Button accessibilityLabel="Volver al catálogo" variant="ghost" size="small" disabled={busy} onPress={() => void close()} icon={<Ionicons name="arrow-back" size={18} color={theme.primary} />}>Volver al catálogo</Button>
        <Text style={text}>{resource?.status === 'PUBLISHED' ? 'Publicado' : 'Borrador'}</Text>
      </View>
      <Text accessibilityRole="header" style={{ color: theme.textPrimary, fontFamily: theme.fontDisplay, fontSize: 30 }}>{resource ? 'Editar recurso' : 'Nuevo recurso'}</Text>
      <Text style={text}>Prepara la ficha, añade sus archivos y revisa el resultado antes de publicarlo.</Text>
      <View style={[styles.section, { borderColor: theme.border, backgroundColor: theme.bgCard }]}>
        <Text style={heading}>Información del recurso</Text>
        <Input label="Título" accessibilityLabel="Título del recurso" value={metadata.title} maxLength={160} editable={!busy} onChangeText={title => setMetadata(value => ({ ...value, title }))} />
        <Input label="Descripción" accessibilityLabel="Descripción del recurso" value={metadata.description} maxLength={2000} multiline numberOfLines={4} style={{ minHeight: 100, textAlignVertical: 'top' }} editable={!busy} onChangeText={description => setMetadata(value => ({ ...value, description }))} />
        <View style={styles.fields}>
          <View style={styles.field}><Text style={text}>Categoría</Text><SimpleDropdown value={metadata.category} options={resourceCategories} accessibilityLabel="Categoría del recurso" disabled={busy} presentation="portal" onSelect={category => setMetadata(value => ({ ...value, category }))} /></View>
          <View style={styles.field}><Text style={text}>Plan mínimo previsto</Text><SimpleDropdown value={metadata.minimumPlan} options={resourcePlans} accessibilityLabel="Plan mínimo del recurso" disabled={busy} presentation="portal" onSelect={minimumPlan => setMetadata(value => ({ ...value, minimumPlan }))} /></View>
        </View>
        <Text style={text}>El plan clasifica el recurso para las futuras suscripciones. Durante el acceso inicial, todos los recursos publicados están disponibles.</Text>
        <View style={styles.actions}><Button disabled={busy || !dirty} onPress={() => void save()}>Guardar ficha</Button></View>
      </View>
      <View style={[styles.section, { borderColor: theme.border, backgroundColor: theme.bgCard }]}>
        <Text style={heading}>Archivos</Text>
        <Text style={text}>Un PDF, un DOCX o ambos. Hasta 15 MiB por archivo. Sube únicamente materiales de HERA sin datos de pacientes y con derechos de uso.</Text>
        {!resource && <Text style={text}>Guarda primero la ficha para añadir los archivos.</Text>}
        {resource?.files.map(file => <View key={file.id} style={[styles.file, { borderColor: theme.border }]}>
          <Ionicons name="document-text-outline" size={22} color={theme.primary} />
          <View style={{ flex: 1, gap: 3 }}><Text style={{ ...text, color: theme.textPrimary }}>{file.fileName}</Text><Text style={text}>{file.format} · {fileSizeLabel(file.sizeBytes)}</Text></View>
        </View>)}
        <View style={styles.actions}><Button variant="outline" disabled={busy || !resource} onPress={() => void pick()}>Añadir o sustituir archivo</Button></View>
        {!!resource?.files.length && <>
          <Text style={text}>Subir el mismo formato sustituye su archivo actual. La versión anterior se conserva si la subida falla.</Text>
          <ResourceActions resource={resource} admin enabled={!busy} />
        </>}
      </View>
      {!!error && <Text accessibilityRole="alert" style={{ ...text, color: theme.error }}>{error}</Text>}
      {!!message && <Text accessibilityLiveRegion="polite" style={{ ...text, color: theme.primary }}>{message}</Text>}
      {busy && <Text accessibilityLiveRegion="polite" style={text}>Guardando cambios…</Text>}
      <View style={styles.footer}>
        <Text style={[text, { flex: 1 }]}>{dirty ? 'Guarda los cambios de la ficha antes de publicar.' : resource?.status === 'PUBLISHED' ? 'Retirar oculta el recurso a especialistas y conserva sus archivos.' : 'Los borradores solo son visibles para administración.'}</Text>
        <Button variant={resource?.status === 'PUBLISHED' ? 'outline' : 'primary'} disabled={busy || dirty || !resource?.files.length} onPress={() => void publication()}>{resource?.status === 'PUBLISHED' ? 'Retirar publicación' : 'Publicar recurso'}</Button>
      </View>
    </View>
  </ScrollView>;
}
const styles = StyleSheet.create({
  container: { padding: 24, flexGrow: 1 }, content: { width: '100%', maxWidth: 920, alignSelf: 'center', gap: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 },
  section: { borderWidth: 1, borderRadius: 14, padding: 22, gap: 16 },
  fields: { flexDirection: 'row', gap: 18, flexWrap: 'wrap' }, field: { flex: 1, minWidth: 220, gap: 8 },
  actions: { alignItems: 'flex-start' }, file: { flexDirection: 'row', gap: 14, alignItems: 'center', borderBottomWidth: 1, paddingBottom: 14 },
  footer: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 20, paddingVertical: 8 },
});
