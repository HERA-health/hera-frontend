import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '../common';
import { SimpleDropdown } from '../common/SimpleDropdown';
import { useTheme } from '../../contexts/ThemeContext';
import { spacing } from '../../constants/colors';
import { getErrorCode, getErrorMessage } from '../../constants/errors';
import type { UploadAsset } from '../../utils/multipartUpload';
import type { Client } from '../../services/professionalService';
import * as clinical from '../../services/clinicalService';
import { createSecureRandomUuid } from '../../utils/secureRandom';
import { releaseClinicalAssets } from '../../services/clinicalFileCache';
import { pickClinicalFiles } from '../../services/clinicalFilePicker';
export { pickClinicalFiles } from '../../services/clinicalFilePicker';

export interface ClinicalComposerDraft {
  kind: 'NOTE' | 'EXERCISE';
  note?: clinical.ClinicalNote;
  exercise?: clinical.ClinicalExercise;
  sessionId?: string;
}

interface Props {
  readOnly?: boolean;
  client: Client; token: string; draft: ClinicalComposerDraft; onSaved: () => void;
  onError: (error: unknown) => void; onCancel?: () => void; onChanged?: () => void; onBusyChange?: (busy: boolean) => void;
}

export function ClinicalWorkspaceComposer({ readOnly = false, client, token, draft, onSaved, onError, onCancel, onChanged, onBusyChange }: Props) {
  const { theme } = useTheme();
  const exercise = draft.kind === 'EXERCISE';
  const [content, setContent] = useState(draft.note?.content ?? draft.exercise?.instructions ?? '');
  const [title, setTitle] = useState(draft.exercise?.title ?? '');
  const [sessionId, setSessionId] = useState(draft.note?.sessionId ?? draft.exercise?.sessionId ?? draft.sessionId ?? '');
  const [savedId, setSavedId] = useState(draft.note?.id ?? draft.exercise?.id);
  const [version, setVersion] = useState(draft.note?.updatedAt ?? draft.exercise?.updatedAt);
  const [files, setFiles] = useState<UploadAsset[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [partial, setPartial] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [history, setHistory] = useState<clinical.ClinicalContentHistory | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const active = useRef(true);
  const savingRef = useRef(false);
  const selectingRef = useRef(false);
  const filesRef = useRef(files); filesRef.current = files;
  const operationKey = useRef<string | null>(null);
  const lastSavedText = useRef(draft.note || draft.exercise ? JSON.stringify([title.trim(), content.trim(), sessionId]) : null);
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; releaseClinicalAssets(filesRef.current); };
  }, []);
  const inputStyle = [styles.input, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.bgCard, fontFamily: theme.fontSans }];
  const removeFile = (file: UploadAsset) => {
    releaseClinicalAssets([file]);
    if (active.current) setFiles(current => current.filter(item => item !== file));
  };
  const pick = async () => {
    if (selectingRef.current || savingRef.current) return;
    selectingRef.current = true;
    try {
      const next = await pickClinicalFiles();
      if (active.current) setFiles(current => [...current, ...next]);
      else releaseClinicalAssets(next);
    } catch (failure) { if (active.current) setError(getErrorMessage(failure, 'No se pudieron seleccionar los archivos.')); }
    finally { selectingRef.current = false; }
  };
  const loadHistory = async (more = false) => {
    if (!savedId || historyLoading) return;
    setHistoryLoading(true);
    try {
      const next = await clinical.getClinicalContentHistory(client.id, token, draft.kind, savedId, more ? history?.nextCursor ?? undefined : undefined);
      if (active.current) setHistory(previous => more && previous ? { ...next, items: [...previous.items, ...next.items] } : next);
    } catch (failure) { if (active.current) { setError(getErrorMessage(failure, 'No se pudo cargar el historial.')); onError(failure); } }
    finally { if (active.current) setHistoryLoading(false); }
  };
  const save = async () => {
    if (readOnly || savingRef.current || selectingRef.current || conflict) return;
    savingRef.current = true;
    onBusyChange?.(true);
    setSaving(true); setError(null);
    let id = savedId;
    let textSaved = false;
    try {
      const textVersion = JSON.stringify([title.trim(), content.trim(), sessionId]);
      if (id && lastSavedText.current === textVersion) {
        textSaved = true;
      } else {
        const key = operationKey.current ?? createSecureRandomUuid();
        operationKey.current = key;
        if (id && !version) throw new Error('Vuelve a abrir el contenido para cargar su versión actual.');
        const saved = exercise
          ? await clinical.saveClinicalExercise(client.id, token, {
              title: title.trim(), instructions: content.trim(), sessionId: sessionId || null,
              ...(id ? { expectedUpdatedAt: version } : {}),
            }, id, key)
          : id
            ? await clinical.updateClinicalNote(id, content.trim(), token, version ?? '', key)
            : await clinical.createClinicalNote(client.id, content.trim(), token, sessionId || undefined, key);
        id = saved.id;
        if (!active.current) return;
        setVersion(saved.updatedAt);
        const confirmedContent = 'content' in saved ? saved.content : saved.instructions;
        const confirmedTitle = 'title' in saved ? saved.title : '';
        // A recovered receipt can return content edited afterwards in another tab.
        // Do not treat our older draft as if it were based on that newer version.
        if (confirmedContent !== content.trim() || confirmedTitle !== title.trim()) {
          setSavedId(saved.id);
          setUncertain(false);
          operationKey.current = null;
          lastSavedText.current = null;
          setConflict(true);
          setHistory({ current: { updatedAt: saved.updatedAt, title: confirmedTitle || null, content: confirmedContent }, items: [], nextCursor: null });
          setError('El guardado está confirmado, pero el contenido tiene cambios posteriores. Revisa la versión actual antes de continuar. Tus archivos pendientes se conservan.');
          onChanged?.();
          return;
        }
      }
      if (!active.current) return;
      textSaved = true;
      operationKey.current = null;
      setUncertain(false);
      lastSavedText.current = textVersion;
      setSavedId(id);
      for (const file of files) {
        if (!active.current) return;
        await clinical.uploadClinicalDocument(client.id, file, token, exercise ? 'EXERCISE_ATTACHMENT' : 'NOTE_ATTACHMENT', undefined,
          exercise ? { exerciseId: id } : { noteId: id });
        removeFile(file);
      }
      if (!active.current) return;
      setContent(''); setTitle(''); setFiles([]); setSavedId(undefined); setVersion(undefined);
      setPartial(false); setHistory(null); lastSavedText.current = null;
      onSaved();
    } catch (failure) {
      if (!active.current) return;
      const code = getErrorCode(failure);
      const versionConflict = code === 'CLINICAL_VERSION_CONFLICT';
      const unknownResult = !textSaved && clinical.isClinicalSaveUncertain(failure);
      setUncertain(unknownResult);
      if (!unknownResult) operationKey.current = null;
      setConflict(versionConflict);
      if (versionConflict) void loadHistory();
      setPartial(textSaved);
      setError(unknownResult
        ? 'No hemos podido confirmar el guardado. Reintenta para comprobar la misma operación sin duplicarla. El borrador se mantiene hasta confirmar el resultado.'
        : `${textSaved ? 'El texto está guardado. Los archivos pendientes se pueden reintentar. ' : ''}${getErrorMessage(failure, 'No se pudo guardar.')}`);
      if (textSaved) onChanged?.();
      onError(failure);
    } finally {
      savingRef.current = false;
      if (active.current) { setSaving(false); onBusyChange?.(false); }
    }
  };
  return <View style={styles.stack}>
    {exercise ? <TextInput accessibilityLabel="Título del ejercicio" placeholder="Título del ejercicio" placeholderTextColor={theme.textMuted} maxLength={200} value={title} onChangeText={setTitle} editable={!readOnly && !saving && !uncertain} style={inputStyle} /> : null}
    <TextInput accessibilityLabel={exercise ? 'Instrucciones del ejercicio' : 'Contenido de la nota'} multiline maxLength={10000}
      value={content} onChangeText={setContent} editable={!readOnly && !saving && !uncertain}
      placeholder={exercise ? 'Describe el ejercicio o añade sus instrucciones…' : 'Escribe una nota sobre el proceso…'} placeholderTextColor={theme.textMuted}
      style={[...inputStyle, styles.textarea]} />
    <SimpleDropdown value={sessionId} onSelect={setSessionId} disabled={readOnly || saving || uncertain || Boolean(savedId)} accessibilityLabel="Vincular a una sesión"
      options={[{ label: 'Sin vincular a una sesión', value: '' }, ...(client.sessions || []).map(session => ({ value: session.id, label: new Date(session.date).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) }))]} />
    {files.map((file, index) => <View key={`${file.uri}-${index}`} style={[styles.file, { backgroundColor: theme.bgMuted }]}>
      <Text numberOfLines={1} style={[styles.filename, { color: theme.textPrimary, fontFamily: theme.fontSans }]}>{file.fileName || file.name}</Text>
      <Button size="small" variant="ghost" disabled={saving} onPress={() => removeFile(file)} accessibilityLabel={`Quitar ${file.fileName || file.name}`}>Quitar</Button>
    </View>)}
    {error ? <Text accessibilityRole="alert" style={[styles.copy, { color: theme.error }]}>{error}</Text> : null}
    {savedId ? <Button variant="ghost" size="small" loading={historyLoading} onPress={() => void loadHistory()}>Ver historial de cambios</Button> : null}
    {history ? <View style={styles.stack}>
      {conflict ? <View style={[styles.input, { backgroundColor: theme.bgMuted }]}>
        <Text style={{ color: theme.textPrimary, fontFamily: theme.fontSansSemiBold }}>Versión actual guardada</Text>
        {history.current.title ? <Text style={{ color: theme.textPrimary }}>{history.current.title}</Text> : null}
        <Text selectable style={{ color: theme.textPrimary }}>{history.current.content}</Text>
        <Text style={{ color: theme.textSecondary }}>Tu borrador sigue arriba. Revísalo teniendo en cuenta esta versión antes de continuar.</Text>
        <Button variant="outline" size="small" onPress={() => { setVersion(history.current.updatedAt); setConflict(false); setError(null); }}>He revisado los cambios; continuar editando</Button>
      </View> : null}
      {!history.items.length ? <Text style={{ color: theme.textSecondary }}>No hay versiones anteriores.</Text> : history.items.map(item => <View key={item.id} style={[styles.input, { backgroundColor: theme.bgMuted }]}>
        <Text style={{ color: theme.textSecondary }}>Versión del {new Date(item.versionAt).toLocaleString('es-ES')}</Text>
        {item.title ? <Text style={{ color: theme.textPrimary }}>{item.title}</Text> : null}
        <Text selectable style={{ color: theme.textPrimary }}>{item.content}</Text>
      </View>)}
      {history.nextCursor ? <Button variant="ghost" loading={historyLoading} onPress={() => void loadHistory(true)}>Ver versiones anteriores</Button> : null}
      {!conflict ? <Button variant="ghost" size="small" onPress={() => setHistory(null)}>Ocultar historial</Button> : null}
    </View> : null}
    <View style={styles.actions}>
      {!readOnly ? <Button size="small" variant="ghost" disabled={saving || uncertain} onPress={() => void pick()}>Adjuntar archivos</Button> : null}
      {onCancel ? <Button size="small" variant="ghost" disabled={saving} onPress={onCancel}>Cerrar</Button> : null}
      {!readOnly ? <Button size="small" loading={saving} disabled={conflict || (exercise ? !title.trim() : !content.trim())} onPress={() => void save()}>
        {uncertain ? 'Comprobar y reintentar guardado' : partial ? 'Reintentar pendientes' : exercise ? 'Guardar ejercicio' : 'Guardar nota'}
      </Button> : null}
    </View>
    <Text style={[styles.hint, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>PDF e imágenes · Hasta 15 MB por archivo · Las correcciones conservan la versión anterior</Text>
  </View>;
}

const styles = StyleSheet.create({
  stack: { gap: spacing.sm }, input: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 14, lineHeight: 21 },
  textarea: { minHeight: 125, textAlignVertical: 'top' }, actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center', justifyContent: 'space-between' },
  file: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 8, paddingLeft: 10 }, filename: { flex: 1, fontSize: 12 },
  hint: { fontSize: 11, lineHeight: 17 }, copy: { fontSize: 13, lineHeight: 20 },
});
