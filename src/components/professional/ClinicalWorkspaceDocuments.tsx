import React, { useEffect, useRef, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button, AnimatedPressable } from '../common';
import { useTheme } from '../../contexts/ThemeContext';
import { getErrorMessage } from '../../constants/errors';
import * as clinical from '../../services/clinicalService';

export function ClinicalWorkspaceDocuments({ documents, token, onChanged, onError, compact = false, readOnly = false }: {
  documents: clinical.ClinicalDocument[]; token: string; onChanged: () => void; onError: (error: unknown) => void; compact?: boolean; readOnly?: boolean;
}) {
  const { theme } = useTheme();
  const [editing, setEditing] = useState<clinical.ClinicalDocument | null>(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const active = useRef(true);
  const busyRef = useRef(false);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const run = async (document: clinical.ClinicalDocument, action: 'OPEN' | 'RENAME' | 'ARCHIVE') => {
    if (busyRef.current || (readOnly && action !== 'OPEN')) return;
    busyRef.current = true;
    setBusy(document.id); setError(null);
    try {
      if (action === 'OPEN') await clinical.openClinicalDocument(document.id, document.fileName, document.mimeType, token);
      else {
        await clinical.updateClinicalDocument(document.id, token, action === 'RENAME' ? { fileName: name.trim() } : { archived: !document.archivedAt });
        if (!active.current) return;
        setEditing(null); onChanged();
      }
    } catch (failure) { if (active.current) { setError(getErrorMessage(failure, 'No se pudo completar la acción.')); onError(failure); } }
    finally { busyRef.current = false; if (active.current) setBusy(null); }
  };
  return <View style={styles.stack}>
    {documents.map(document => <View key={document.id} style={[styles.row, { borderBottomColor: theme.borderLight }]}>
      <AnimatedPressable accessibilityLabel={`Abrir ${document.fileName}`} disabled={Boolean(busy)} hoverLift={false} onPress={() => void run(document, 'OPEN')} style={styles.open}>
        <View style={[styles.icon, { backgroundColor: theme.bgMuted }]}><Ionicons name={document.mimeType.startsWith('image/') ? 'image-outline' : 'document-text-outline'} size={17} color={theme.primary} /></View>
        <View style={styles.meta}>
          <Text numberOfLines={compact ? 1 : 2} style={[styles.name, { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold }]}>{document.fileName}</Text>
          <Text style={[styles.caption, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>{new Date(document.uploadedAt).toLocaleDateString('es-ES')} · {Math.max(1, Math.round((document.sizeBytes || 0) / 1024))} KB{document.archivedAt ? ' · Archivado' : ''}</Text>
        </View>
      </AnimatedPressable>
      {!compact && !readOnly && document.category !== 'CONSENT_EVIDENCE' ? <View style={styles.actions}>
        <Button size="small" variant="ghost" disabled={Boolean(busy)} accessibilityLabel={`Renombrar ${document.fileName}`} onPress={() => { setEditing(document); setName(document.fileName); }}>Renombrar</Button>
        <Button size="small" variant="ghost" disabled={Boolean(busy)} accessibilityLabel={`${document.archivedAt ? 'Restaurar' : 'Archivar'} ${document.fileName}`} onPress={() => void run(document, 'ARCHIVE')}>{document.archivedAt ? 'Restaurar' : 'Archivar'}</Button>
      </View> : null}
    </View>)}
    {error ? <Text accessibilityRole="alert" style={{ color: theme.error, fontFamily: theme.fontSans }}>{error}</Text> : null}
    <Modal visible={Boolean(editing)} transparent animationType="fade" onRequestClose={() => { if (!busyRef.current) setEditing(null); }}>
      <View style={[styles.backdrop, { backgroundColor: theme.overlay }]}><ScrollView contentContainerStyle={styles.modalCenter} keyboardShouldPersistTaps="handled">
        <View style={[styles.dialog, { backgroundColor: theme.bgCard }]}>
          <Text style={[styles.heading, { color: theme.textPrimary, fontFamily: theme.fontHeading }]}>Renombrar archivo</Text>
          <TextInput accessibilityLabel="Nombre del archivo" maxLength={200} value={name} onChangeText={setName} style={[styles.input, { color: theme.textPrimary, borderColor: theme.border, fontFamily: theme.fontSans }]} />
          {error ? <Text accessibilityRole="alert" style={{ color: theme.error }}>{error}</Text> : null}
          <View style={styles.actions}><Button variant="ghost" disabled={Boolean(busy)} onPress={() => setEditing(null)}>Cancelar</Button><Button loading={Boolean(busy)} disabled={!name.trim()} onPress={() => { if (editing) void run(editing, 'RENAME'); }}>Guardar</Button></View>
        </View>
      </ScrollView></View>
    </Modal>
  </View>;
}
const styles = StyleSheet.create({
  stack: { gap: 4 }, row: { paddingVertical: 10, borderBottomWidth: 1, gap: 4 }, open: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 40 },
  meta: { flex: 1, minWidth: 0, gap: 3 }, name: { fontSize: 13, lineHeight: 19 }, caption: { fontSize: 11, lineHeight: 17 },
  icon: { width: 32, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 8 }, actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 6 },
  backdrop: { flex: 1 }, modalCenter: { flexGrow: 1, justifyContent: 'center', padding: 20 }, dialog: { padding: 24, gap: 16, borderRadius: 20, maxWidth: 520, width: '100%', alignSelf: 'center' },
  heading: { fontSize: 21 }, input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14 },
});
