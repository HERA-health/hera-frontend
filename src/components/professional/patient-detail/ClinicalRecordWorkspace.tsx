import { ClinicalEntryFilters } from "./ClinicalListFilters";
import { PatientPagination } from "./PatientPagination";
import { TourTarget } from "../../onboarding/TourTarget";
import type { ProfessionalTourTargetId } from "../../onboarding/professionalTourTypes";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ScrollView, View, Text, useWindowDimensions } from "react-native";
import type { ClinicalPatientWorkspaceProps } from "../clinicalPatientTypes";
import { Button, AnimatedPressable } from "../../common";
import { useTheme } from "../../../contexts/ThemeContext";
import * as clinical from "../../../services/clinicalService";
import {
  searchNotes,
  searchHistory,
  getNoteTags,
  type EntryQuery,
  type EntryPage,
  type HistoryEntry,
} from "../../../services/clinicalEntriesService";
import { getErrorMessage } from "../../../constants/errors";
import {
  ClinicalWorkspaceComposer,
  type ClinicalComposerDraft,
} from "../ClinicalWorkspaceComposer";
import { ClinicalQuestionnairePanel } from "../ClinicalQuestionnairePanel";
import {
  ClinicalDocumentsWorkspace,
  type ClinicalUploadTarget,
  type ClinicalUploadRequest,
} from "./ClinicalDocumentsWorkspace";
import { ClinicalExercisesWorkspace } from "./ClinicalExercisesWorkspace";
import { ClinicalProcessArchive } from "./ClinicalProcessArchive";
import {
  HistoryEntryEditor,
  historyTypes as currentHistoryTypes,
} from "./HistoryEntryEditor";
import {
  Panel,
  Copy,
  Field,
  Input,
  Badge,
  DetailDialog,
  LoadState,
  pd,
  patientDate,
} from "./PatientDetailPrimitives";

import {
  noteTypes as currentNoteTypes,
  legacyNoteType,
  legacyHistoryType,
  notePurpose,
  historyPurpose,
} from "../clinicalEntryTypes";

type Props = Omit<
  ClinicalPatientWorkspaceProps,
  "sessionPanel"
> & {
  focusDocumentId?: string;
  tourTarget?: ProfessionalTourTargetId;
};
const noteTypes = [...currentNoteTypes, legacyNoteType];
const historyTypes = [...currentHistoryTypes, legacyHistoryType];
type Tab = "notes" | "history" | "documents";
export function ClinicalRecordWorkspace({
  client,
  record,
  token,
  section,
  action,
  onActionConsumed,
  consentPanel,
  onError,
  onRefresh,
  onRequestRefreshClient,
  onLock,
  focusSessionId,
  focusDocumentId,
  tourTarget,
  tourTargetsActive = true,
}: Props) {
  const { theme } = useTheme();
  const compact = useWindowDimensions().width < 1180;
  const [closedLocally, setClosedLocally] = useState(false);
  const writable = record.access?.canWriteClinicalContent === true && !closedLocally;
  const granted = record.access?.canReadClinicalContent === true;
  const [tab, setTab] = useState<Tab>(
    focusDocumentId || section === "documents"
      ? "documents"
      : section === "exercises"
        ? "history"
        : "notes",
  );
  const [exercises, setExercises] = useState(section === "exercises");
  const [exerciseId, setExerciseId] = useState<string>();
  const [noteQuery, setNoteQuery] = useState<EntryQuery>(
    focusSessionId ? { sessionId: focusSessionId } : {},
  );
  const [historyQuery, setHistoryQuery] = useState<EntryQuery>({});
  const query = tab === "notes" ? noteQuery : historyQuery;
  const [notes, setNotes] = useState<EntryPage<clinical.ClinicalNote> | null>(
    null,
  );
  const [tagOptions, setTagOptions] = useState<string[] | null>(null);
  const [tagRequest, setTagRequest] = useState(0);
  const [history, setHistory] = useState<EntryPage<HistoryEntry> | null>(null);
  const [note, setNote] = useState<clinical.ClinicalNote | null>(null);
  const [entry, setEntry] = useState<HistoryEntry | null>(null);
  const [noteTarget, setNoteTarget] = useState("");
  const [historyTarget, setHistoryTarget] = useState("");
  const [documentTarget, setDocumentTarget] = useState(focusDocumentId);
  const [detail, setDetail] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [cursors, setCursors] = useState<Array<string | undefined>>([
    undefined,
  ]);
  const [draft, setDraft] = useState<ClinicalComposerDraft | null>(null);
  const [historyDraft, setHistoryDraft] = useState<
    HistoryEntry | null | undefined
  >(undefined);
  const [busy, setBusy] = useState(false);
  const [consent, setConsent] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [closing, setClosing] = useState(false);
  const [closeError, setCloseError] = useState("");
  const closeContext = useRef({ busy: false });
  useEffect(() => {
    closeContext.current = { busy: false };
    setClosedLocally(false);
    setConfirmClose(false);
    setClosing(false);
    setCloseError("");
    return () => { closeContext.current = { busy: false }; };
  }, [client.id, token]);
  const [uploadRequest, setUploadRequest] = useState<ClinicalUploadRequest>();
  const handled = useRef<number | undefined>(undefined);
  const consumeUpload = useCallback(() => setUploadRequest(undefined), []);
  useEffect(() => {
    if (focusSessionId) {
      setNoteQuery({ sessionId: focusSessionId });
      setNoteTarget("");
      setTab("notes");
      setDetail(false);
      setCursors([undefined]);
    }
  }, [focusSessionId]);
  const report = useCallback(
    (e: unknown) => {
      setError(getErrorMessage(e, "No se pudo cargar el contenido clínico."));
      onError(e);
    },
    [onError],
  );
  useEffect(() => {
    setTagOptions(null);
    setTagRequest(0);
  }, [client.id, token, revision]);
  useEffect(() => {
    if (!granted || !tagRequest || tagOptions) return;
    let active = true;
    void getNoteTags(client.id, token)
      .then((tags) => {
        if (active) setTagOptions(tags);
      })
      .catch((e: unknown) => {
        if (active) report(e);
      });
    return () => {
      active = false;
    };
  }, [client.id, token, tagRequest, tagOptions, granted, revision, report]);
  const changed = useCallback(() => {
    setRevision((value) => value + 1);
    void onRefresh().catch(report);
    void onRequestRefreshClient?.().catch(report);
  }, [onRefresh, onRequestRefreshClient, report]);
  const closeProcess = async () => {
    const context = closeContext.current;
    if (context.busy || record.closedAt || closedLocally || !granted) return;
    context.busy = true;
    setClosing(true);
    setCloseError("");
    try {
      await clinical.closeClinicalProcess(client.id, token);
      if (context !== closeContext.current) return;
      // Keep this view read-only even if the following refresh fails.
      setClosedLocally(true);
      setConfirmClose(false);
      changed();
    } catch (e) {
      if (context !== closeContext.current) return;
      setCloseError(getErrorMessage(e, "No se pudo cerrar el proceso asistencial."));
      onError(e);
    } finally {
      if (context === closeContext.current) {
        context.busy = false;
        setClosing(false);
      }
    }
  };
  useEffect(() => {
    if (!action || handled.current === action.id) return;
    handled.current = action.id;
    if (action.kind === "CONSENT") setConsent(true);
    else if (writable && action.kind === "NOTE") {
      setTab("notes");
      setDraft({ kind: "NOTE" });
    } else if (writable) {
      setTab("documents");
      setUploadRequest({
        id: action.id,
        classification: action.classification,
      });
    }
    onActionConsumed?.(action.id);
  }, [action, writable, onActionConsumed]);
  useEffect(() => {
    if (!granted || tab === "documents" || (exercises && tab === "history"))
      return;
    let active = true;
    setLoading(true);
    setError("");
    const timer = setTimeout(() => {
      void (async () => {
        if (tab === "notes") {
          const next = await searchNotes(client.id, token, {
            ...noteQuery,
            resourceId: noteTarget || undefined,
          });
          if (active) {
            setNotes(next);
            setNote(
              (current) =>
                next.items.find((row) => row.id === current?.id) ||
                next.items[0] ||
                null,
            );
          }
        } else {
          const next = await searchHistory(client.id, token, {
            ...historyQuery,
            resourceId: historyTarget || undefined,
          });
          if (active) {
            setHistory(next);
            setEntry(
              (current) =>
                next.items.find((row) => row.id === current?.id) ||
                next.items[0] ||
                null,
            );
          }
        }
      })()
        .catch((e) => {
          if (active) report(e);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 200);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [
    client.id,
    token,
    tab,
    exercises,
    noteQuery,
    historyQuery,
    noteTarget,
    historyTarget,
    granted,
    revision,
    report,
  ]);
  useEffect(() => {
    if (!tourTarget) return;
    if (tourTarget !== "professional.clinical.consent") setConsent(false);
    setDetail(false);
    if (tourTarget === "professional.clinical.timeline") {
      setTab("history");
      setExercises(false);
    } else if (
      tourTarget === "professional.clinical.documents" ||
      tourTarget === "professional.clinical.reports"
    )
      setTab("documents");
    else if (tourTarget === "professional.clinical.notes") setTab("notes");
  }, [tourTarget]);
  const filter = (value: Partial<EntryQuery>) => {
    setCursors([undefined]);
    if (tab === "notes")
      setNoteQuery((current) => ({ ...current, ...value, cursor: undefined }));
    else
      setHistoryQuery((current) => ({
        ...current,
        ...value,
        cursor: undefined,
      }));
  };
  const changeTab = (value: Tab) => {
    if (busy) return;
    setTab(value);
    setDetail(false);
    setCursors([undefined]);
    if (value === "notes")
      setNoteQuery((current) => ({ ...current, cursor: undefined }));
    else if (value === "history")
      setHistoryQuery((current) => ({ ...current, cursor: undefined }));
  };
  const document = (item: clinical.ClinicalDocument) => {
    setDocumentTarget(item.id);
    setTab("documents");
  };
  const uploadTo = (target: ClinicalUploadTarget) => {
    setDocumentTarget(undefined);
    setUploadRequest({ ...target, id: Date.now() });
    setTab("documents");
  };
  const page = tab === "notes" ? notes : history;
  const noteSession = client.sessions?.find(
    (session) => session.id === noteQuery.sessionId,
  );
  const selected = tab === "notes" ? note : entry;
  return (
    <View style={pd.stack}>
      <TourTarget
        id="professional.clinical.hero"
        active={tourTargetsActive}
        fill
      >
        <View style={pd.toolbar}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[
              pd.tabs,
              { borderBottomColor: theme.borderLight },
            ]}
          >
            {(
              [
                { key: "notes", label: "Notas clínicas" },
                { key: "history", label: "Historia clínica" },
                { key: "documents", label: "Documentación clínica" },
              ] as const
            ).map((item) => (
              <AnimatedPressable
                key={item.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: tab === item.key }}
                hoverLift={false}
                onPress={() => changeTab(item.key)}
                style={[
                  pd.tab,
                  {
                    borderBottomColor:
                      tab === item.key ? theme.primary : "transparent",
                  },
                ]}
              >
                <Text
                  style={{
                    color:
                      tab === item.key
                        ? theme.textPrimary
                        : theme.textSecondary,
                    fontFamily:
                      tab === item.key
                        ? theme.fontSansSemiBold
                        : theme.fontSans,
                    fontSize: 13,
                  }}
                >
                  {item.label}
                </Text>
              </AnimatedPressable>
            ))}
          </ScrollView>
          <View style={pd.filters}>
            <Button
              size="small"
              variant="outline"
              onPress={() => setConsent(true)}
            >
              Consentimiento informado
            </Button>
            {granted && !record.closedAt && !closedLocally ? (
              <Button size="small" variant="outline" disabled={busy} onPress={() => {
                setCloseError("");
                setConfirmClose(true);
              }}>
                Cerrar proceso asistencial
              </Button>
            ) : null}
            <Button size="small" variant="outline" onPress={onLock}>
              Bloquear área
            </Button>
          </View>
        </View>
      </TourTarget>
      {record.closedAt || closedLocally ? (
        <Badge tone="warning">Proceso cerrado · Consulta disponible</Badge>
      ) : null}
      {record.informedConsent ? <Badge tone={record.informedConsent.status === "WITHDRAWN" ? "warning" : undefined}>Consentimiento informado · {{ PENDING: "Pendiente", SENT: "Enviado", SIGNED: "Firmado", WITHDRAWN: "Retirado" }[record.informedConsent.status]}</Badge> : null}
      {!record.closedAt && !closedLocally && (record.informedConsent?.status === 'PENDING' || record.informedConsent?.status === 'SENT') ? <Copy muted>El consentimiento está pendiente de registro. Puedes continuar trabajando; el profesional debe informar al paciente sobre su privacidad.</Copy> : null}
      {!record.closedAt && !closedLocally && record.informedConsent?.status === 'WITHDRAWN' ? <Copy muted>El consentimiento está retirado. Puedes consultar la documentación conservada; para nuevas actuaciones, registra una nueva evidencia de consentimiento.</Copy> : null}
      {!granted ? (
        <Panel
          title="Acceso clínico no disponible"
          icon="shield-checkmark-outline"
        >
          <Copy muted>
            Actualiza la ficha para comprobar los permisos de acceso clínico.
          </Copy>
          <Button size="small" onPress={() => void onRefresh()}>
            Actualizar ficha
          </Button>
        </Panel>
      ) : (
        <>
          {tab === "history" ? (
            <View style={pd.filters}>
              <Button
                size="small"
                variant={exercises ? "outline" : "secondary"}
                onPress={() => setExercises(false)}
              >
                Entradas
              </Button>
              <Button
                size="small"
                variant={exercises ? "secondary" : "outline"}
                onPress={() => setExercises(true)}
              >
                Ejercicios
              </Button>
            </View>
          ) : null}
          {tab === "documents" ? (
            <TourTarget
              id="professional.clinical.documents"
              active={tourTargetsActive}
              fill
            >
              <ClinicalDocumentsWorkspace
                key={documentTarget || "documents"}
                clientId={client.id}
                token={token}
                writable={writable}
                focusDocumentId={documentTarget}
                uploadRequest={uploadRequest}
                onUploadConsumed={consumeUpload}
                onError={report}
                onChanged={changed}
                onConsent={() => setConsent(true)}
                onParent={(kind, id) => {
                  if (kind === "NOTE") {
                    setNoteTarget(id);
                    setNoteQuery({});
                    setTab("notes");
                  } else if (kind === "HISTORY") {
                    setHistoryTarget(id);
                    setHistoryQuery({});
                    setExercises(false);
                    setTab("history");
                  } else {
                    setExerciseId(id);
                    setExercises(true);
                    setTab("history");
                  }
                  setDetail(true);
                }}
              />
            </TourTarget>
          ) : tab === "history" && exercises ? (
            <ClinicalExercisesWorkspace
              client={client}
              token={token}
              writable={writable}
              focusId={exerciseId}
              onError={report}
              onChanged={changed}
              onDocument={document}
            />
          ) : (
            <>
              <TourTarget
                id={
                  tab === "notes"
                    ? "professional.clinical.notes"
                    : "professional.clinical.timeline"
                }
                active={tourTargetsActive}
                fill
              >
                <View style={pd.stack}>
                  {compact && detail ? (
                    <Button
                      size="small"
                      variant="outline"
                      onPress={() => setDetail(false)}
                    >
                      ← Volver al listado
                    </Button>
                  ) : null}
                  <LoadState
                    error={error}
                    onRetry={() => setRevision((value) => value + 1)}
                  />
                  <View
                    style={[pd.columns, compact && { flexDirection: "column" }]}
                  >
                    {!compact || !detail ? (
                      <View style={[pd.column, compact && pd.compactColumn]}>
                        <Panel
                          title={
                            tab === "notes"
                              ? "Notas clínicas"
                              : "Historia clínica"
                          }
                          icon="document-text-outline"
                          action={
                            writable ? (
                              <Button
                                size="small"
                                onPress={() =>
                                  tab === "notes"
                                    ? setDraft({
                                        kind: "NOTE",
                                        sessionId: noteQuery.sessionId,
                                      })
                                    : setHistoryDraft(null)
                                }
                              >
                                {tab === "notes"
                                  ? "+ Nueva nota"
                                  : "+ Nueva entrada"}
                              </Button>
                            ) : undefined
                          }
                        >
                          <Copy muted>
                            {tab === "notes" ? notePurpose : historyPurpose}
                          </Copy>
                          <Input
                            accessibilityLabel={
                              tab === "notes"
                                ? "Buscar notas clínicas"
                                : "Buscar historia clínica"
                            }
                            placeholder="Buscar por título o contenido…"
                            value={query.search || ""}
                            onChangeText={(search) => filter({ search })}
                          />
                          <ClinicalEntryFilters
                            query={query}
                            onChange={filter}
                            notes={tab === "notes"}
                            types={tab === "notes" ? noteTypes : historyTypes}
                            authors={page?.filters.authors || []}
                            tags={tagOptions || []}
                            onTagsOpen={() =>
                              setTagRequest((value) => value + 1)
                            }
                            clientId={client.id}
                            sessionLabel={
                              noteSession
                                ? patientDate(noteSession.date, true)
                                : undefined
                            }
                          />
                          {(noteTarget && tab === "notes") ||
                          (historyTarget && tab === "history") ? (
                            <Button
                              size="small"
                              variant="outline"
                              onPress={() => {
                                setNoteTarget("");
                                setHistoryTarget("");
                              }}
                            >
                              Ver todos los registros
                            </Button>
                          ) : null}
                          <LoadState loading={loading} />
                          {(tab === "notes"
                            ? notes?.items
                            : history?.items
                          )?.map((row) => (
                            <AnimatedPressable
                              key={row.id}
                              accessibilityRole="button"
                              accessibilityState={{
                                selected: selected?.id === row.id,
                              }}
                              hoverLift={false}
                              onPress={() => {
                                if (tab === "notes" && "sessionId" in row)
                                  setNote(row);
                                else if ("occurredAt" in row) setEntry(row);
                                setDetail(true);
                              }}
                              style={[
                                pd.row,
                                {
                                  borderBottomColor: theme.borderLight,
                                  backgroundColor:
                                    selected?.id === row.id
                                      ? theme.primaryAlpha12
                                      : "transparent",
                                  borderRadius: 8,
                                },
                              ]}
                            >
                              <View style={pd.rowHeading}>
                                <Text
                                  style={[
                                    pd.rowTitle,
                                    {
                                      fontFamily: theme.fontSansSemiBold,
                                      color: theme.textPrimary,
                                    },
                                  ]}
                                >
                                  {row.title || "Nota clínica"}
                                </Text>
                                <Badge>
                                  {(tab === "notes"
                                    ? noteTypes
                                    : historyTypes
                                  ).find((item) => item.value === row.type)
                                    ?.label || "Nota"}
                                </Badge>
                              </View>
                              <Text
                                numberOfLines={1}
                                style={{
                                  color: theme.textSecondary,
                                  fontFamily: theme.fontSans,
                                  fontSize: 12,
                                }}
                              >
                                {row.content}
                              </Text>
                              <Copy muted>
                                {patientDate(
                                  "occurredAt" in row
                                    ? row.occurredAt
                                    : row.createdAt,
                                )}{" "}
                                · {row.authorName || "Autor no registrado"}
                              </Copy>
                            </AnimatedPressable>
                          ))}
                          {!loading && !page?.items.length ? (
                            <Copy muted>
                              No hay registros que coincidan con estos filtros.
                            </Copy>
                          ) : null}
                          <PatientPagination
                            page={cursors.length}
                            hasNext={Boolean(page?.pageInfo.hasMore)}
                            loading={loading}
                            summary={
                              page
                                ? `${page.pageInfo.total} ${tab === "notes" ? (page.pageInfo.total === 1 ? "nota" : "notas") : page.pageInfo.total === 1 ? "entrada" : "entradas"}`
                                : undefined
                            }
                            onPrevious={() => {
                              const next = cursors.slice(0, -1);
                              setCursors(next);
                              if (tab === "notes")
                                setNoteQuery((current) => ({
                                  ...current,
                                  cursor: next[next.length - 1],
                                }));
                              else
                                setHistoryQuery((current) => ({
                                  ...current,
                                  cursor: next[next.length - 1],
                                }));
                            }}
                            onNext={() => {
                              const cursor =
                                page?.pageInfo.nextCursor || undefined;
                              setCursors((current) => [...current, cursor]);
                              if (tab === "notes")
                                setNoteQuery((current) => ({
                                  ...current,
                                  cursor,
                                }));
                              else
                                setHistoryQuery((current) => ({
                                  ...current,
                                  cursor,
                                }));
                            }}
                          />
                        </Panel>
                      </View>
                    ) : null}
                    {(!compact || detail) && selected ? (
                      <View style={[pd.column, compact && pd.compactColumn]}>
                        <Panel
                          title={selected.title || "Nota clínica"}
                          action={
                            <Button
                              size="small"
                              variant="outline"
                              onPress={() =>
                                tab === "notes" && note
                                  ? setDraft({ kind: "NOTE", note })
                                  : entry
                                    ? setHistoryDraft(entry)
                                    : undefined
                              }
                            >
                              {writable ? "Editar" : "Consultar historial"}
                            </Button>
                          }
                        >
                          <Copy muted>
                            {patientDate(
                              "occurredAt" in selected
                                ? selected.occurredAt
                                : selected.createdAt,
                              true,
                            )}{" "}
                            · {selected.authorName || "Autor no registrado"}
                          </Copy>
                          {"status" in selected ? (
                            <Badge
                              tone={
                                selected.status === "COMPLETE"
                                  ? "success"
                                  : "neutral"
                              }
                            >
                              {selected.status === "COMPLETE"
                                ? "Completa"
                                : "Borrador"}
                            </Badge>
                          ) : null}
                          <Field
                            label="Tipo"
                            value={
                              (tab === "notes" ? noteTypes : historyTypes).find(
                                (row) => row.value === selected.type,
                              )?.label
                            }
                          />
                          <Panel title="Contenido">
                            <Copy>{selected.content}</Copy>
                          </Panel>
                          {"tags" in selected && selected.tags?.length ? (
                            <View style={pd.filters}>
                              {selected.tags.map((tag) => (
                                <Badge key={tag}>{tag}</Badge>
                              ))}
                            </View>
                          ) : null}
                          <View style={pd.stack}>
                            <Copy>
                              Documentos adjuntos (
                              {selected.documents?.filter(
                                (row) => !row.archivedAt,
                              ).length || 0}
                              )
                            </Copy>
                            {selected.documents
                              ?.filter((row) => !row.archivedAt)
                              .map((row) => (
                                <Button
                                  key={row.id}
                                  size="small"
                                  variant="outline"
                                  onPress={() => document(row)}
                                >
                                  {row.fileName}
                                </Button>
                              ))}
                            {writable ? (
                              <Button
                                size="small"
                                variant="outline"
                                onPress={() =>
                                  uploadTo(
                                    tab === "notes"
                                      ? { noteId: selected.id }
                                      : { historyEntryId: selected.id },
                                  )
                                }
                              >
                                + Añadir documento
                              </Button>
                            ) : null}
                          </View>
                          {"sessions" in selected ? (
                            <>
                              <Copy>Sesiones relacionadas</Copy>
                              {selected.sessions.map((row) => (
                                <Copy key={row.id}>
                                  {patientDate(row.date, true)} · {row.duration}{" "}
                                  min
                                </Copy>
                              ))}
                            </>
                          ) : selected.sessionId ? (
                            <Field
                              label="Sesión vinculada"
                              value={patientDate(
                                selected.sessionDate ?? client.sessions?.find(
                                  (row) => row.id === selected.sessionId,
                                )?.date,
                                true,
                              )}
                            />
                          ) : null}
                          <Field
                            label="Creación"
                            value={patientDate(selected.createdAt, true)}
                          />
                          <Field
                            label="Última modificación"
                            value={patientDate(selected.updatedAt, true)}
                          />
                          <Button
                            size="small"
                            variant="outline"
                            onPress={() =>
                              tab === "notes" && note
                                ? setDraft({ kind: "NOTE", note })
                                : entry
                                  ? setHistoryDraft(entry)
                                  : undefined
                            }
                          >
                            Ver historial de cambios
                          </Button>
                        </Panel>
                      </View>
                    ) : null}
                  </View>
                </View>
              </TourTarget>
              {tab === "history" ? (
                <ClinicalQuestionnairePanel
                  isTablet={!compact}
                  completedQuestionnaire={record.client.completedQuestionnaire}
                  questionnaireAvailability={
                    record.client.questionnaireAvailability
                  }
                  summary={record.client.questionnaireSummary}
                  answers={record.client.questionnaireAnswers}
                  tourTargetsActive={false}
                />
              ) : null}
            </>
          )}
        </>
      )}
      <DetailDialog
        title="Cerrar el proceso asistencial"
        visible={confirmClose}
        busy={closing}
        onClose={() => setConfirmClose(false)}
        footer={<>
          <Button variant="outline" disabled={closing} onPress={() => setConfirmClose(false)}>Cancelar</Button>
          <Button loading={closing} disabled={closing} onPress={() => void closeProcess()}>Confirmar cierre</Button>
        </>}
      >
        <Copy>El expediente quedará disponible para consulta, sin permitir nuevas actuaciones clínicas. Se cancelarán las solicitudes de consentimiento pendientes y se conservará la documentación existente.</Copy>
        {closeError ? <Text accessibilityRole="alert" style={{ color: theme.error }}>{closeError}</Text> : null}
      </DetailDialog>
      <DetailDialog
        title="Consentimiento informado"
        visible={consent}
        onClose={() => setConsent(false)}
      >
        {consentPanel}
        {granted ? <ClinicalProcessArchive clientId={client.id} token={token} record={record} onError={onError} /> : null}
      </DetailDialog>

      {draft ? (
        <ClinicalWorkspaceComposer
          dialog={{ title: "Nota clínica", onClose: () => setDraft(null) }}
          key={draft.note?.id || "new"}
          client={client}
          token={token}
          readOnly={!writable}
          draft={draft}
          onError={report}
          onChanged={changed}
          onBusyChange={setBusy}
          onSaved={() => {
            setBusy(false);
            setDraft(null);
            changed();
          }}
        />
      ) : null}

      {historyDraft !== undefined ? (
        <HistoryEntryEditor
          dialog={{
            title: "Entrada de historia clínica",
            onClose: () => setHistoryDraft(undefined),
          }}
          key={historyDraft?.id || "new"}
          client={client}
          token={token}
          entry={historyDraft || undefined}
          readOnly={!writable}
          onError={report}
          onBusy={setBusy}
          onSaved={() => {
            setBusy(false);
            setHistoryDraft(undefined);
            changed();
          }}
        />
      ) : null}
    </View>
  );
}
