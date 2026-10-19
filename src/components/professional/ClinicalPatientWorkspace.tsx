import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button, Card, AnimatedPressable } from '../common';
import { SimpleDropdown } from '../common/SimpleDropdown';
import { TourTarget } from '../onboarding/TourTarget';
import { ClinicalQuestionnairePanel } from './ClinicalQuestionnairePanel';
import { ClinicalWorkspaceComposer, ClinicalComposerDraft, pickClinicalFiles } from './ClinicalWorkspaceComposer';
import { ClinicalWorkspaceDocuments } from './ClinicalWorkspaceDocuments';
import { useTheme } from '../../contexts/ThemeContext';
import { getErrorMessage } from '../../constants/errors';
import type { Client } from '../../services/professionalService';
import * as clinical from '../../services/clinicalService';
import { releaseClinicalAssets } from '../../services/clinicalFileCache';
import { cancelClinicalDownloads } from '../../services/clinicalDownloads';

export type ClinicalPatientSection = 'summary' | 'history' | 'notes' | 'exercises' | 'documents' | 'packages';
export type ClinicalPatientAction = { id: number; kind: 'NOTE' | 'UPLOAD' | 'CONSENT' };
interface Props {
  client: Client; record: clinical.ClinicalRecord; token: string; section: ClinicalPatientSection;
  action?: ClinicalPatientAction; focusSessionId?: string;
  consentPanel: React.ReactNode; onError: (error: unknown) => void;
  onRefresh: () => Promise<unknown>; onRequestRefreshClient?: () => Promise<void>;
  onLock: () => void;
  onCounters?: (counters: clinical.ClinicalTimelinePage['counters']) => void;
  onSection: (section: ClinicalPatientSection) => void;
  tourTargetsActive?: boolean;
  sessionPanel?: (compose: (draft: ClinicalComposerDraft) => void) => React.ReactNode;
}
const FILTERS: Array<{ key: clinical.ClinicalTimelineFilter; label: string }> = [
  { key: 'ALL', label: 'Todo' }, { key: 'WITH_NOTES', label: 'Con notas' },
  { key: 'WITHOUT_NOTES', label: 'Sin notas' }, { key: 'WITH_FILES', label: 'Con archivos' }, { key: 'GENERAL_NOTES', label: 'Notas generales' },
];
const date = (value: string) => new Date(value).toLocaleString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const sessionType = (type: string) => ({ VIDEO_CALL: 'Videollamada', IN_PERSON: 'Presencial', PHONE_CALL: 'Llamada', CHAT: 'Chat' }[type] || type);
const mergeItems = <T extends { id: string }>(current: T[], incoming: T[]): T[] =>
  Array.from(new Map([...current, ...incoming].map(item => [item.id, item])).values());

export function ClinicalPatientWorkspace({ client, record, token, section, action, focusSessionId, consentPanel, onError, onRefresh, onRequestRefreshClient, onCounters, onLock, onSection, tourTargetsActive = true, sessionPanel }: Props) {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const [availableWidth, setAvailableWidth] = useState(0);
  const wide = (availableWidth || width) >= 920;
  const [filter, setFilter] = useState<clinical.ClinicalTimelineFilter>('ALL');
  const [timeline, setTimeline] = useState<clinical.ClinicalTimelinePage | null>(null);
  const [notes, setNotes] = useState<clinical.ClinicalNote[]>(record.notes);
  const [notePage, setNotePage] = useState(record.pagination.notes);
  const [exercises, setExercises] = useState<clinical.ClinicalExercise[]>([]);
  const [exercisePage, setExercisePage] = useState<clinical.ClinicalPageInfo | null>(null);
  const [documents, setDocuments] = useState<clinical.ClinicalDocument[]>([]);
  const [docPage, setDocPage] = useState<clinical.ClinicalPageInfo | null>(null);
  const [legacy, setLegacy] = useState<clinical.ClinicalDocument[]>([]);
  const [legacyPage, setLegacyPage] = useState<clinical.ClinicalPageInfo | null>(null);
  const [category, setCategory] = useState<clinical.ClinicalDocumentCategory | ''>('');
  const [archived, setArchived] = useState(false);
  const [search, setSearch] = useState('');
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(false);
  const [moreLoading, setMoreLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<ClinicalComposerDraft | null>(null);
  const [composerVersion, setComposerVersion] = useState(0);
  const [composerBusy, setComposerBusy] = useState(false);
  const [quickVersion, setQuickVersion] = useState(0);
  const [consentVisible, setConsentVisible] = useState(false);
  const [uploadVisible, setUploadVisible] = useState(false);
  const [uploadCategory, setUploadCategory] = useState<'GENERAL' | 'MEDICAL_REPORT'>('GENERAL');
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<Awaited<ReturnType<typeof pickClinicalFiles>>>([]);
  const [uncertainUpload, setUncertainUpload] = useState<Awaited<ReturnType<typeof pickClinicalFiles>>[number] | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const granted = record.consentStatus === 'GRANTED';
  const writable = granted && !record.closedAt;
  const uploadBusyRef = useRef(false);
  const errorRef = useRef(onError); errorRef.current = onError;
  const countersRef = useRef(onCounters); countersRef.current = onCounters;
  const requestScope = JSON.stringify([client.id, token, section, filter, category, archived, search, revision]);
  const requestScopeRef = useRef(requestScope); requestScopeRef.current = requestScope;
  const uploadFilesRef = useRef(uploadFiles); uploadFilesRef.current = uploadFiles;
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; releaseClinicalAssets(uploadFilesRef.current); cancelClinicalDownloads(token); }; }, [token]);
  const report = useCallback((failure: unknown) => {
    if (!alive.current) return;
    setError(getErrorMessage(failure, 'No se pudo cargar el expediente.')); errorRef.current(failure);
  }, []);
  const changed = useCallback(() => {
    if (!alive.current) return;
    setRevision(value => value + 1);
    void onRefresh().catch(report);
  }, [onRefresh, report]);
  useEffect(() => {
    if (!action) return;
    if (action.kind === 'CONSENT') setConsentVisible(true);
    else if (writable && action.kind === 'NOTE') { setDraft({ kind: 'NOTE' }); setComposerVersion(v => v + 1); }
    else if (writable) setUploadVisible(true);
  }, [action, writable]);
  useEffect(() => { setNotes(record.notes); setNotePage(record.pagination.notes); }, [record.notes, record.pagination.notes]);
  useEffect(() => {
    if (!granted) { setTimeline(null); return; }
    let cancelled = false;
    setTimeline(null);
    setError(null);
    void clinical.getClinicalTimeline(client.id, token, filter).then(value => {
      if (!cancelled) { setTimeline(value); countersRef.current?.(value.counters); }
    }).catch(failure => { if (!cancelled) report(failure); });
    return () => { cancelled = true; };
  }, [client.id, token, filter, revision, granted, report]);
  useEffect(() => {
    if (!granted || section !== 'exercises') return;
    let cancelled = false; setLoading(true); setError(null);
    void Promise.all([clinical.getClinicalExercises(client.id, token), clinical.searchClinicalDocuments(client.id, token, { category: 'SESSION_EXERCISE', archived: false })])
      .then(([page, previous]) => { if (!cancelled) { setExercises(page.items); setExercisePage(page.pageInfo); setLegacy(previous.items); setLegacyPage(previous.pageInfo); } })
      .catch(failure => { if (!cancelled) report(failure); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [client.id, token, section, revision, granted, report]);
  useEffect(() => {
    if (!granted || section !== 'documents') return;
    let cancelled = false;
    setLoading(true); setError(null); setDocuments([]); setDocPage(null);
    const timer = setTimeout(() => {
      void clinical.searchClinicalDocuments(client.id, token, { category: category || undefined, archived, search })
        .then(page => { if (!cancelled) { setDocuments(page.items.filter(doc => doc.category !== 'CONSENT_EVIDENCE')); setDocPage(page.pageInfo); } })
        .catch(failure => { if (!cancelled) report(failure); }).finally(() => { if (!cancelled) setLoading(false); });
    }, 200);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [client.id, token, section, revision, category, archived, search, granted, report]);

  const more = async (kind: 'TIMELINE' | 'NOTES' | 'EXERCISES' | 'DOCUMENTS' | 'LEGACY') => {
    if (moreLoading) return;
    setMoreLoading(true);
    const scope = requestScope;
    const isCurrent = () => alive.current && requestScopeRef.current === scope;
    try {
      if (kind === 'TIMELINE' && timeline?.pageInfo.nextCursor) {
        const next = await clinical.getClinicalTimeline(client.id, token, filter, timeline.pageInfo.nextCursor);
        if (isCurrent()) setTimeline(current => current ? { ...next, items: mergeItems(current.items, next.items) } : next);
      } else if (kind === 'NOTES' && notePage.nextCursor) {
        const next = await clinical.listClinicalNotes(client.id, token, { cursor: notePage.nextCursor });
        if (isCurrent()) { setNotes(current => mergeItems(current, next.items)); setNotePage(next.pageInfo); }
      } else if (kind === 'EXERCISES' && exercisePage?.nextCursor) {
        const next = await clinical.getClinicalExercises(client.id, token, exercisePage.nextCursor);
        if (isCurrent()) { setExercises(current => mergeItems(current, next.items)); setExercisePage(next.pageInfo); }
      } else if (kind === 'LEGACY' && legacyPage?.nextCursor) {
        const next = await clinical.searchClinicalDocuments(client.id, token, { category: 'SESSION_EXERCISE', archived: false, cursor: legacyPage.nextCursor });
        if (isCurrent()) { setLegacy(current => mergeItems(current, next.items)); setLegacyPage(next.pageInfo); }
      } else if (kind === 'DOCUMENTS' && docPage?.nextCursor) {
        const next = await clinical.searchClinicalDocuments(client.id, token, { category: category || undefined, archived, search, cursor: docPage.nextCursor });
        if (isCurrent()) { setDocuments(current => mergeItems(current, next.items.filter(doc => doc.category !== 'CONSENT_EVIDENCE'))); setDocPage(next.pageInfo); }
      }
    } catch (failure) { if (isCurrent()) report(failure); } finally { if (alive.current) setMoreLoading(false); }
  };
  const upload = async () => {
    if (uploadBusyRef.current || !writable) return;
    uploadBusyRef.current = true;
    setUploadBusy(true); setUploadError(null);
    let uploaded = 0;
    let attempted: Awaited<ReturnType<typeof pickClinicalFiles>>[number] | null = null;
    try {
      const files = uploadFiles.length ? uploadFiles : await pickClinicalFiles();
      if (!alive.current) { releaseClinicalAssets(files); return; }
      if (!files.length) return;
      setUploadFiles(files);
      for (const file of files) {
        if (!alive.current) return;
        attempted = file;
        await clinical.uploadClinicalDocument(client.id, file, token, uploadCategory);
        setUncertainUpload(null);
        uploaded += 1;
        releaseClinicalAssets([file]);
        if (!alive.current) return;
        setUploadFiles(current => current.filter(item => item !== file));
      }
      if (alive.current) { setUploadVisible(false); changed(); }
    } catch (failure) {
      if (alive.current) {
        const uncertain = attempted !== null && clinical.isClinicalSaveUncertain(failure);
        setUncertainUpload(uncertain ? attempted : null);
        setUploadError(`${uploaded ? `${uploaded} archivo(s) guardado(s). ` : ''}${getErrorMessage(failure, 'No se pudieron subir los archivos.')} ${uncertain ? 'No se pudo confirmar el resultado. Reintenta para comprobar el mismo archivo sin duplicarlo.' : 'Puedes quitar el archivo rechazado o reintentar los pendientes.'}`);
        if (uploaded) changed();
        report(failure);
      }
    }
    finally { uploadBusyRef.current = false; if (alive.current) setUploadBusy(false); }
  };
  const compose = (next: ClinicalComposerDraft) => { if (writable || (granted && Boolean(next.note || next.exercise))) { setDraft(next); setComposerVersion(value => value + 1); } };
  const heading = (title: string, description?: string, actionNode?: React.ReactNode) => <View style={styles.headingRow}>
    <View style={styles.headingCopy}><Text accessibilityRole="header" style={[styles.title, { color: theme.textPrimary, fontFamily: theme.fontHeading }]}>{title}</Text>{description ? <Text style={[styles.description, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>{description}</Text> : null}</View>{actionNode}
  </View>;
  const empty = (text: string) => <Text style={[styles.empty, { color: theme.textSecondary, fontFamily: theme.fontSans }]}>{text}</Text>;
  const docs = (items: clinical.ClinicalDocument[], compact = true, showArchived = false) => <ClinicalWorkspaceDocuments documents={items.filter(doc => showArchived || !doc.archivedAt)} token={token} onChanged={changed} onError={report} compact={compact} readOnly={!writable} />;
  const noteEntry = (note: clinical.ClinicalNote, compact = false) => <View key={note.id} style={[styles.note, { backgroundColor: theme.bgMuted }]}>
    <View style={styles.headingRow}><Text style={[styles.eyebrow, { color: theme.textSecondary, fontFamily: theme.fontSansSemiBold }]}>{note.sessionId ? 'NOTA DE SESIÓN' : 'NOTA GENERAL'} · {date(note.createdAt)}</Text>
      <Button size="small" variant="ghost" onPress={() => compose({ kind: 'NOTE', note })}>{writable ? 'Editar' : 'Consultar historial'}</Button></View>
    <Text numberOfLines={compact ? 4 : undefined} style={[styles.body, { color: theme.textPrimary, fontFamily: theme.fontSans }]}>{note.content}</Text>
    {note.createdAt !== note.updatedAt ? <Text style={[styles.caption, { color: theme.textSecondary }]}>Editada {date(note.updatedAt)}</Text> : null}
    {docs(note.documents || [], compact)}
    {!compact && writable ? <Button size="small" variant="ghost" onPress={() => compose({ kind: 'NOTE', note })}>Añadir archivos</Button> : null}
  </View>;
  const sessionEntry = (folder: clinical.ClinicalSessionFolder, upcoming = false) => <View key={folder.session.id} style={styles.timelineRow}>
    <View style={[styles.line, { backgroundColor: theme.borderLight }]} /><View style={[styles.dot, { borderColor: upcoming ? theme.info : folder.notes.length ? theme.success : theme.warning, backgroundColor: theme.bgCard }]} />
    <View style={[styles.session, { borderColor: upcoming ? theme.primaryAlpha20 : theme.borderLight, backgroundColor: upcoming ? theme.primaryAlpha12 : theme.bgCard }, !upcoming && !folder.notes.length && { paddingVertical: 11 }]}>
      <View style={styles.headingRow}><Text style={[styles.sessionTitle, { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold }]}>{date(folder.session.date)}</Text>
        <Text style={[styles.eyebrow, { color: upcoming ? theme.info : folder.notes.length ? theme.success : theme.warning, fontFamily: theme.fontSansSemiBold }]}>{upcoming ? 'PRÓXIMA SESIÓN' : folder.session.status === 'CANCELLED' ? 'CANCELADA' : folder.notes.length ? 'CON NOTAS' : 'SIN NOTAS'}</Text></View>
      <Text style={[styles.caption, { color: theme.textSecondary }]}>{sessionType(folder.session.type)} · {folder.session.duration} min</Text>
      {folder.notes[0] ? <Text numberOfLines={4} style={[styles.body, { color: theme.textPrimary, fontFamily: theme.fontSans }]}>{folder.notes[0].content}</Text> : upcoming ? <Text style={[styles.description, { color: theme.textSecondary }]}>Prepara la sesión con notas, ejercicios y material.</Text> : null}
      {docs(folder.documents)}
      {folder.exercises?.map(exercise => <Text key={exercise.id} style={[styles.description, { color: theme.primary }]}>Ejercicio · {exercise.title}</Text>)}
      {writable ? <View style={styles.actions}><Button variant="outline" size="small" onPress={() => compose({ kind: 'NOTE', sessionId: folder.session.id })}>{folder.notes.length ? 'Añadir nota' : 'Escribir nota'}</Button>
        <Button variant="ghost" size="small" onPress={() => compose({ kind: 'EXERCISE', sessionId: folder.session.id })}>Añadir ejercicio</Button>
        {folder.notes[0] ? <Button variant="ghost" size="small" onPress={() => compose({ kind: 'NOTE', note: folder.notes[0] })}>Abrir nota</Button> : null}</View> : null}
    </View>
  </View>;
  const consentSummary = <View style={[styles.consentBar, { backgroundColor: theme.bgMuted }]}>
    <View style={styles.consentStatus}>
      <Ionicons name="shield-checkmark-outline" size={17} color={theme.primary} />
      <Text style={[styles.description, styles.flex, { color: theme.textPrimary, fontFamily: theme.fontSans }]}>{record.closedAt ? 'Proceso cerrado. El expediente se conserva para consulta.' : granted ? 'Consentimiento vigente' : record.consentStatus === 'REVOKED' ? 'Consentimiento retirado' : 'Consentimiento pendiente. Puedes continuar con la gestión del paciente.'}</Text>
    </View>
    <View style={styles.actions}>
      <Button variant="ghost" size="small" onPress={() => setConsentVisible(true)}>Gestionar consentimiento</Button>
      <Button variant="ghost" size="small" onPress={onLock}>Bloquear</Button>
    </View>
  </View>;
  const modal = (visible: boolean, close: () => void, title: string, children: React.ReactNode, busy = false) => <Modal visible={visible} transparent animationType="fade" onRequestClose={() => { if (!busy) close(); }}>
    <View style={[styles.backdrop, { backgroundColor: theme.overlay }]}><ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">
      <View style={[styles.dialog, { backgroundColor: theme.bgCard }]}>{heading(title, undefined, <Button size="small" variant="ghost" disabled={busy} onPress={close}>Cerrar</Button>)}{children}</View>
    </ScrollView></View>
  </Modal>;
  return <View style={styles.stack} onLayout={event => setAvailableWidth(event.nativeEvent.layout.width)}>
    <TourTarget id="professional.clinical.hero" fill active={tourTargetsActive}>{consentSummary}</TourTarget>
    {error ? <View style={[styles.error, { backgroundColor: theme.errorBg }]}><Text accessibilityRole="alert" style={{ color: theme.error, flex: 1, fontFamily: theme.fontSans }}>{error}</Text><Button variant="ghost" size="small" onPress={() => { setError(null); changed(); }}>Reintentar</Button></View> : null}
    {!granted ? <Card padding="large">{heading('Completa la autorización clínica', 'Las notas, ejercicios y documentos clínicos estarán disponibles cuando el consentimiento esté registrado.')}<Button onPress={() => setConsentVisible(true)}>Gestionar consentimiento</Button></Card> : null}
    {granted ? <View style={section === 'summary' ? styles.stack : styles.hidden}>
      <View style={[styles.overview, !wide && styles.column]}>
        <Card padding="large" style={styles.timelineColumn}>
          <TourTarget id="professional.clinical.timeline" fill active={tourTargetsActive}>{heading('Timeline del proceso', 'Sesiones y notas generales en orden cronológico.', <Button variant="outline" size="small" onPress={() => onSection('history')}>Todas las sesiones</Button>)}</TourTarget>
          <View style={styles.filters}>{FILTERS.map(item => <AnimatedPressable key={item.key} hoverLift={false} accessibilityRole="button" accessibilityState={{ selected: filter === item.key }} onPress={() => setFilter(item.key)} style={[styles.filter, { backgroundColor: filter === item.key ? theme.actionPrimary : theme.bgCard, borderColor: filter === item.key ? theme.actionPrimary : theme.borderLight }]}>
            <Text style={[styles.filterText, { color: filter === item.key ? theme.textOnPrimary : theme.textSecondary, fontFamily: theme.fontSansSemiBold }]}>{item.label}{timeline && item.key !== 'ALL' ? ` · ${item.key === 'WITH_NOTES' ? timeline.counters.withNotes : item.key === 'WITHOUT_NOTES' ? timeline.counters.withoutNotes : item.key === 'WITH_FILES' ? timeline.counters.withFiles : timeline.counters.generalNotes}` : ''}</Text>
          </AnimatedPressable>)}</View>
          {!timeline ? <ActivityIndicator color={theme.primary} /> : <View style={styles.timeline}>
            {filter === 'ALL' && timeline.nextSession ? sessionEntry(timeline.nextSession, true) : null}
            {timeline.items.map(item => item.kind === 'SESSION' ? sessionEntry(item.folder) : <View key={item.id} style={styles.generalEntry}>{noteEntry(item.note, true)}</View>)}
            {!timeline.items.length && !(filter === 'ALL' && timeline.nextSession) ? empty('Todavía no hay actividad en esta vista.') : null}
            {timeline.pageInfo.hasMore ? <Button variant="ghost" size="small" loading={moreLoading} onPress={() => void more('TIMELINE')}>Mostrar actividad anterior</Button> : null}
          </View>}
        </Card>
        <View style={[styles.sideColumn, !wide && styles.sideColumnStack]}>
          <Card padding="large"><TourTarget id="professional.clinical.notes" fill active={tourTargetsActive}>{heading('Notas generales', 'Contexto, acuerdos e hitos del proceso.')}</TourTarget>
            {writable ? <ClinicalWorkspaceComposer key={`quick-${quickVersion}`} client={client} token={token} draft={{ kind: 'NOTE' }} onError={report} onChanged={changed} onSaved={() => { setQuickVersion(v => v + 1); changed(); }} /> : empty('El proceso está cerrado. Puedes consultar las notas registradas.')}
            <View style={styles.preview}>{record.notes.filter(note => !note.sessionId).slice(0, 3).map(note => <AnimatedPressable key={note.id} hoverLift={false} onPress={() => compose({ kind: 'NOTE', note })} style={[styles.previewRow, { borderTopColor: theme.borderLight }]}><Ionicons name="document-text-outline" size={15} color={theme.textMuted} /><Text numberOfLines={2} style={[styles.description, styles.flex, { color: theme.textPrimary, fontFamily: theme.fontSans }]}>{note.content}</Text></AnimatedPressable>)}</View>
            <Button variant="ghost" size="small" onPress={() => onSection('notes')}>Ver todas las notas</Button>
          </Card>
          <ClinicalQuestionnairePanel isTablet={false} completedQuestionnaire={record.client.completedQuestionnaire} questionnaireAvailability={record.client.questionnaireAvailability} summary={record.client.questionnaireSummary} answers={record.client.questionnaireAnswers} tourTargetId="professional.clinical.questionnaire" tourTargetsActive={tourTargetsActive} />
        </View>
      </View>
      <View style={[styles.documentsBand, !wide && styles.column]}>{(['MEDICAL_REPORT', 'GENERAL'] as const).map(kind => <Card key={kind} padding="large" style={styles.flex}>
        <TourTarget id={kind === 'MEDICAL_REPORT' ? 'professional.clinical.reports' : 'professional.clinical.documents'} fill active={tourTargetsActive}>
          {heading(kind === 'MEDICAL_REPORT' ? 'Informes médicos' : 'Documentación general', kind === 'MEDICAL_REPORT' ? 'Informes de derivación, pruebas y documentación clínica de apoyo.' : 'Documentos del paciente que no dependen de una sesión.')}
        </TourTarget>
        {writable ? <Button variant="outline" size="small" onPress={() => { if (!uploadFiles.length && !uploadBusyRef.current) setUploadCategory(kind); setUploadVisible(true); }}>{kind === 'MEDICAL_REPORT' ? 'Subir informe' : 'Subir documento'}</Button> : null}
        {docs(record.documents.filter(doc => doc.category === kind && !doc.archivedAt).slice(0, 3))}
        <Button variant="ghost" size="small" onPress={() => { setCategory(kind); onSection('documents'); }}>Ver todos</Button>
      </Card>)}</View>
    </View> : null}
    {granted && section === 'history' ? sessionPanel?.(compose) : null}
    {granted && section === 'notes' ? <Card padding="large">{heading('Notas del expediente', `${notePage.total} notas registradas`, writable ? <Button size="small" onPress={() => compose({ kind: 'NOTE' })}>Nueva nota</Button> : undefined)}
      <View style={styles.stack}>{notes.map(note => noteEntry(note))}{!notes.length ? empty('Añade la primera nota del proceso.') : null}</View>
      {notePage.hasMore ? <Button variant="ghost" loading={moreLoading} onPress={() => void more('NOTES')}>Ver más notas</Button> : null}
    </Card> : null}
    {granted && section === 'exercises' ? <Card padding="large">{heading('Ejercicios', 'Registra ejercicios del proceso o vincúlalos a una sesión.', writable ? <Button size="small" onPress={() => compose({ kind: 'EXERCISE' })}>Nuevo ejercicio</Button> : undefined)}
      {loading ? <ActivityIndicator color={theme.primary} /> : exercises.map(exercise => <View key={exercise.id} style={[styles.note, { backgroundColor: theme.bgMuted }]}>
        {heading(exercise.title, `${date(exercise.createdAt)}${exercise.sessionId ? ' · Vinculado a sesión' : ' · Ejercicio del proceso'}`, <Button variant="ghost" size="small" onPress={() => compose({ kind: 'EXERCISE', exercise })}>{writable ? 'Editar' : 'Consultar historial'}</Button>)}
        <Text style={[styles.body, { color: theme.textPrimary, fontFamily: theme.fontSans }]}>{exercise.instructions}</Text>{docs(exercise.documents, false)}
        {writable ? <Button variant="ghost" size="small" onPress={() => compose({ kind: 'EXERCISE', exercise })}>Añadir archivos</Button> : null}
      </View>)}
      {!loading && !exercises.length ? empty('Todavía no has registrado ejercicios.') : null}
      {exercisePage?.hasMore ? <Button variant="ghost" loading={moreLoading} onPress={() => void more('EXERCISES')}>Ver más ejercicios</Button> : null}
      {legacy.length ? <View style={styles.preview}>{heading('Ejercicios anteriores', 'Archivos adjuntos a sesiones que ya formaban parte del expediente.')}{docs(legacy, false)}{legacyPage?.hasMore ? <Button variant="ghost" loading={moreLoading} onPress={() => void more('LEGACY')}>Ver más archivos anteriores</Button> : null}</View> : null}
    </Card> : null}
    {granted && section === 'documents' ? <Card padding="large">{heading('Documentación', 'Consulta y organiza los archivos del expediente.', writable ? <Button size="small" onPress={() => setUploadVisible(true)}>Subir archivo</Button> : undefined)}
      <View style={styles.documentFilters}>
        <TextInput accessibilityLabel="Buscar archivos" placeholder="Buscar por nombre…" placeholderTextColor={theme.textMuted} maxLength={200} value={search} onChangeText={setSearch} style={[styles.search, { color: theme.textPrimary, borderColor: theme.border, fontFamily: theme.fontSans }]} />
        <SimpleDropdown value={category} onSelect={setCategory} accessibilityLabel="Tipo de documento" options={[{ label: 'Todos los archivos', value: '' }, { label: 'Informes médicos', value: 'MEDICAL_REPORT' }, { label: 'Documentación general', value: 'GENERAL' }, { label: 'Adjuntos de notas', value: 'NOTE_ATTACHMENT' }, { label: 'Adjuntos de ejercicios', value: 'EXERCISE_ATTACHMENT' }, { label: 'Archivos de sesión', value: 'SESSION_ATTACHMENT' }, { label: 'Ejercicios anteriores', value: 'SESSION_EXERCISE' }]} />
        <Button variant={archived ? 'secondary' : 'outline'} size="small" onPress={() => setArchived(value => !value)}>{archived ? 'Archivados' : 'Ver archivados'}</Button>
      </View>
      {loading ? <ActivityIndicator color={theme.primary} /> : docs(documents, false, archived)}
      {!loading && !documents.length ? empty(archived ? 'No hay archivos archivados con estos filtros.' : 'No hay archivos con estos filtros.') : null}
      {docPage?.hasMore ? <Button variant="ghost" loading={moreLoading} onPress={() => void more('DOCUMENTS')}>Ver más archivos</Button> : null}
    </Card> : null}
    {modal(consentVisible, () => setConsentVisible(false), 'Consentimiento informado', consentPanel)}
    {modal(Boolean(draft), () => setDraft(null), draft?.kind === 'EXERCISE' ? 'Ejercicio' : 'Nota del expediente', draft ? <ClinicalWorkspaceComposer readOnly={!writable} key={composerVersion} client={client} token={token} draft={draft} onError={report} onChanged={changed} onBusyChange={setComposerBusy} onSaved={() => { setDraft(null); changed(); }} onCancel={() => setDraft(null)} /> : null, composerBusy)}
    {modal(uploadVisible, () => { if (!uploadBusy) setUploadVisible(false); }, 'Subir archivos', <View style={styles.stack}>
      <SimpleDropdown value={uploadCategory} onSelect={setUploadCategory} disabled={uploadBusy || Boolean(uploadFiles.length)} accessibilityLabel="Ubicación del archivo" options={[{ label: 'Documentación general', value: 'GENERAL' }, { label: 'Informes médicos', value: 'MEDICAL_REPORT' }]} />
      <Text style={[styles.body, { color: theme.textSecondary }]}>PDF e imágenes · Hasta 15 MB por archivo</Text>
      {uploadFiles.length > 0 ? <Text style={[styles.body, { color: theme.textSecondary }]}>Hay archivos pendientes en {uploadCategory === 'GENERAL' ? 'Documentación general' : 'Informes médicos'}. Reinténtalos o quita los que no quieras subir antes de iniciar otra subida.</Text> : null}
      {uploadFiles.map((file, index) => <View key={index} style={styles.headingRow}>
        <Text style={{ color: theme.textPrimary }}>{file.fileName || file.name} · {uncertainUpload === file ? 'Resultado sin confirmar' : 'Pendiente'}</Text>
        <Button size="small" variant="ghost" accessibilityLabel={`Quitar ${file.fileName || file.name}`} disabled={uploadBusy || uncertainUpload === file} onPress={() => {
          releaseClinicalAssets([file]);
          setUploadFiles(current => current.filter(item => item !== file));
          setUploadError(null);
        }}>Quitar</Button>
      </View>)}
      {uploadError ? <Text accessibilityRole="alert" style={{ color: theme.error }}>{uploadError}</Text> : null}
      <Button loading={uploadBusy} onPress={() => void upload()}>{uploadFiles.length ? 'Reintentar archivos pendientes' : 'Seleccionar y subir archivos'}</Button>
    </View>, uploadBusy)}
  </View>;
}

const styles = StyleSheet.create({
  hidden: { display: 'none' }, stack: { gap: 18 }, overview: { flexDirection: 'row', gap: 22, alignItems: 'flex-start' }, column: { flexDirection: 'column' },
  timelineColumn: { flex: 1.7, minWidth: 0, width: '100%' }, sideColumn: { flex: 1, minWidth: 0, gap: 18 }, sideColumnStack: { width: '100%' },
  headingRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 10 }, headingCopy: { flex: 1, minWidth: 140, gap: 5 },
  title: { fontSize: 21, lineHeight: 28 }, description: { fontSize: 13, lineHeight: 20 }, body: { fontSize: 14, lineHeight: 22 }, caption: { fontSize: 12, lineHeight: 18 },
  eyebrow: { fontSize: 10, lineHeight: 17, letterSpacing: 0.5 }, flex: { flex: 1, minWidth: 0 }, filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 22 },
  filter: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 7 }, filterText: { fontSize: 11, lineHeight: 16 },
  timeline: { gap: 15 }, timelineRow: { position: 'relative', paddingLeft: 24 }, line: { position: 'absolute', left: 5, top: 12, bottom: -22, width: 1 }, dot: { position: 'absolute', left: 0, top: 15, width: 11, height: 11, borderRadius: 8, borderWidth: 2 },
  session: { borderWidth: 1, borderRadius: 14, padding: 16, gap: 8 }, sessionTitle: { fontSize: 14, lineHeight: 21 }, generalEntry: { paddingLeft: 24 }, note: { borderRadius: 12, padding: 16, gap: 8, marginBottom: 10 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 3 }, preview: { marginTop: 18, gap: 8 }, previewRow: { borderTopWidth: 1, paddingVertical: 10, flexDirection: 'row', gap: 10, alignItems: 'center' },
  consentStatus: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 200 },
  documentsBand: { flexDirection: 'row', alignItems: 'stretch', gap: 22 }, consentBar: { borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 },
  empty: { fontSize: 14, lineHeight: 23, paddingVertical: 24 }, error: { padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12 },
  documentFilters: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 15 }, search: { flex: 1, minWidth: 180, borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14 },
  backdrop: { flex: 1 }, modalScroll: { flexGrow: 1, justifyContent: 'center', padding: 20 }, dialog: { maxWidth: 960, width: '100%', alignSelf: 'center', padding: 24, borderRadius: 20, gap: 14 },
});
