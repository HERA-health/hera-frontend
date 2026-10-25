import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { Button } from "../common";
import { SimpleDropdown } from "../common/SimpleDropdown";
import { useTheme } from "../../contexts/ThemeContext";
import { spacing } from "../../constants/colors";
import { getErrorCode, getErrorMessage } from "../../constants/errors";
import type { UploadAsset } from "../../utils/multipartUpload";
import type { Client } from "../../services/professionalService";
import * as clinical from "../../services/clinicalService";
import { createSecureRandomUuid } from "../../utils/secureRandom";
import { releaseClinicalAssets } from "../../services/clinicalFileCache";
import { pickClinicalFiles } from "../../services/clinicalFilePicker";
export { pickClinicalFiles } from "../../services/clinicalFilePicker";

import { PatientSessionPicker } from "./patient-detail/PatientSessionPicker";
import {
  DetailDialog,
  patientDate,
} from "./patient-detail/PatientDetailPrimitives";
import { noteTypes, legacyNoteType, notePurpose } from "./clinicalEntryTypes";

export interface ClinicalComposerDraft {
  kind: "NOTE" | "EXERCISE";
  note?: clinical.ClinicalNote;
  exercise?: clinical.ClinicalExercise;
  sessionId?: string;
}

interface Props {
  readOnly?: boolean;
  client: Client;
  token: string;
  draft: ClinicalComposerDraft;
  onSaved: () => void;
  onError: (error: unknown) => void;
  onCancel?: () => void;
  onChanged?: () => void;
  onBusyChange?: (busy: boolean) => void;
  dialog?: { title: string; onClose: () => void };
}

const noteTypeLabels: Record<string, string> = {
  EVOLUTION: "Evolución",
  FOLLOW_UP: "Seguimiento",
  INCIDENT: "Incidencia",
  ASSESSMENT: "Evaluación",
  EXERCISE_REVIEW: "Revisión de ejercicio",
};

export function ClinicalWorkspaceComposer({
  readOnly = false,
  client,
  token,
  draft,
  onSaved,
  onError,
  onCancel,
  onChanged,
  onBusyChange,
  dialog,
}: Props) {
  const { theme } = useTheme();
  const exercise = draft.kind === "EXERCISE";
  const [content, setContent] = useState(
    draft.note?.content ?? draft.exercise?.instructions ?? "",
  );
  const [title, setTitle] = useState(
    draft.exercise?.title ?? draft.note?.title ?? "",
  );
  const [noteType, setNoteType] = useState<clinical.NoteMetadata["type"]>(
    draft.note?.type ?? "EVOLUTION",
  );
  const [tags, setTags] = useState((draft.note?.tags ?? []).join(", "));
  const [sessionId, setSessionId] = useState(
    draft.note?.sessionId ?? draft.exercise?.sessionId ?? draft.sessionId ?? "",
  );
  const linkedSession = client.sessions?.find(
    (session) => session.id === sessionId,
  );
  const [savedId, setSavedId] = useState(draft.note?.id ?? draft.exercise?.id);
  const [version, setVersion] = useState(
    draft.note?.updatedAt ?? draft.exercise?.updatedAt,
  );
  const [files, setFiles] = useState<UploadAsset[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [partial, setPartial] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [history, setHistory] =
    useState<clinical.ClinicalContentHistory | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const active = useRef(true);
  const savingRef = useRef(false);
  const selectingRef = useRef(false);
  const filesRef = useRef(files);
  filesRef.current = files;
  const operationKey = useRef<string | null>(null);
  const lastSavedText = useRef(
    draft.note || draft.exercise
      ? JSON.stringify([
          title.trim(),
          content.trim(),
          sessionId,
          noteType,
          tags,
        ])
      : null,
  );
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      releaseClinicalAssets(filesRef.current);
    };
  }, []);
  const inputStyle = [
    styles.input,
    {
      color: theme.textPrimary,
      borderColor: theme.border,
      backgroundColor: theme.bgCard,
      fontFamily: theme.fontSans,
    },
  ];
  const removeFile = (file: UploadAsset) => {
    releaseClinicalAssets([file]);
    if (active.current)
      setFiles((current) => current.filter((item) => item !== file));
  };
  const pick = async () => {
    if (selectingRef.current || savingRef.current) return;
    selectingRef.current = true;
    try {
      const next = await pickClinicalFiles();
      if (active.current) setFiles((current) => [...current, ...next]);
      else releaseClinicalAssets(next);
    } catch (failure) {
      if (active.current)
        setError(
          getErrorMessage(failure, "No se pudieron seleccionar los archivos."),
        );
    } finally {
      selectingRef.current = false;
    }
  };
  const loadHistory = async (more = false) => {
    if (!savedId || historyLoading) return;
    setHistoryLoading(true);
    try {
      const next = await clinical.getClinicalContentHistory(
        client.id,
        token,
        draft.kind,
        savedId,
        more ? (history?.nextCursor ?? undefined) : undefined,
      );
      if (active.current)
        setHistory((previous) =>
          more && previous
            ? { ...next, items: [...previous.items, ...next.items] }
            : next,
        );
    } catch (failure) {
      if (active.current) {
        setError(getErrorMessage(failure, "No se pudo cargar el historial."));
        onError(failure);
      }
    } finally {
      if (active.current) setHistoryLoading(false);
    }
  };
  const save = async () => {
    if (readOnly || savingRef.current || selectingRef.current || conflict)
      return;
    savingRef.current = true;
    onBusyChange?.(true);
    setSaving(true);
    setError(null);
    let id = savedId;
    let textSaved = false;
    try {
      const textVersion = JSON.stringify([
        title.trim(),
        content.trim(),
        sessionId,
        noteType,
        tags,
      ]);
      if (id && lastSavedText.current === textVersion) {
        textSaved = true;
      } else {
        const key = operationKey.current ?? createSecureRandomUuid();
        operationKey.current = key;
        if (id && !version)
          throw new Error(
            "Vuelve a abrir el contenido para cargar su versión actual.",
          );
        const saved = exercise
          ? await clinical.saveClinicalExercise(
              client.id,
              token,
              {
                title: title.trim(),
                instructions: content.trim(),
                sessionId: sessionId || null,
                ...(id ? { expectedUpdatedAt: version } : {}),
              },
              id,
              key,
            )
          : id
            ? await clinical.updateClinicalNote(
                id,
                content.trim(),
                token,
                version ?? "",
                key,
                {
                  title: title.trim(),
                  type: noteType,
                  tags: tags
                    .split(",")
                    .map((value) => value.trim())
                    .filter(Boolean),
                },
              )
            : await clinical.createClinicalNote(
                client.id,
                content.trim(),
                token,
                sessionId || undefined,
                key,
                {
                  title: title.trim(),
                  type: noteType,
                  tags: tags
                    .split(",")
                    .map((value) => value.trim())
                    .filter(Boolean),
                },
              );
        id = saved.id;
        if (!active.current) return;
        setVersion(saved.updatedAt);
        const confirmedContent =
          "content" in saved ? saved.content : saved.instructions;
        const confirmedTitle = "title" in saved ? (saved.title ?? "") : "";
        // A recovered receipt can return content edited afterwards in another tab.
        // Do not treat our older draft as if it were based on that newer version.
        if (
          confirmedContent !== content.trim() ||
          confirmedTitle !== title.trim() ||
          ("content" in saved &&
            ((saved.type && saved.type !== noteType) ||
              (saved.tags &&
                JSON.stringify([...saved.tags].sort()) !==
                  JSON.stringify(
                    tags
                      .split(",")
                      .map((value) => value.trim())
                      .filter(Boolean)
                      .sort(),
                  ))))
        ) {
          setSavedId(saved.id);
          setUncertain(false);
          operationKey.current = null;
          lastSavedText.current = null;
          setConflict(true);
          setHistory({
            current: {
              updatedAt: saved.updatedAt,
              title: confirmedTitle || null,
              content: confirmedContent,
            },
            items: [],
            nextCursor: null,
          });
          setError(
            "El guardado está confirmado, pero el contenido tiene cambios posteriores. Revisa la versión actual antes de continuar. Tus archivos pendientes se conservan.",
          );
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
        await clinical.uploadClinicalDocument(
          client.id,
          file,
          token,
          exercise ? "EXERCISE_ATTACHMENT" : "NOTE_ATTACHMENT",
          undefined,
          exercise ? { exerciseId: id } : { noteId: id },
        );
        removeFile(file);
      }
      if (!active.current) return;
      setContent("");
      setTitle("");
      setFiles([]);
      setSavedId(undefined);
      setVersion(undefined);
      setPartial(false);
      setHistory(null);
      lastSavedText.current = null;
      onSaved();
    } catch (failure) {
      if (!active.current) return;
      const code = getErrorCode(failure);
      const versionConflict = code === "CLINICAL_VERSION_CONFLICT";
      const unknownResult =
        !textSaved && clinical.isClinicalSaveUncertain(failure);
      setUncertain(unknownResult);
      if (!unknownResult) operationKey.current = null;
      setConflict(versionConflict);
      if (versionConflict) void loadHistory();
      setPartial(textSaved);
      setError(
        unknownResult
          ? "No hemos podido confirmar el guardado. Reintenta para comprobar la misma operación sin duplicarla. El borrador se mantiene hasta confirmar el resultado."
          : `${textSaved ? "El texto está guardado. Los archivos pendientes se pueden reintentar. " : ""}${getErrorMessage(failure, "No se pudo guardar.")}`,
      );
      if (textSaved) onChanged?.();
      onError(failure);
    } finally {
      savingRef.current = false;
      if (active.current) {
        setSaving(false);
        onBusyChange?.(false);
      }
    }
  };
  const actions = (
    <View style={styles.actions}>
      {!readOnly ? (
        <Button
          size="small"
          variant="outline"
          disabled={saving || uncertain}
          onPress={() => void pick()}
        >
          Adjuntar archivos
        </Button>
      ) : null}
      {onCancel || dialog ? (
        <Button
          size="small"
          variant="outline"
          disabled={saving}
          onPress={() => {
            if (onCancel) onCancel();
            else dialog?.onClose();
          }}
        >
          Cancelar
        </Button>
      ) : null}
      {!readOnly ? (
        <Button
          size="small"
          loading={saving}
          disabled={conflict || (exercise ? !title.trim() : !content.trim())}
          onPress={() => void save()}
        >
          {uncertain
            ? "Comprobar y reintentar guardado"
            : partial
              ? "Reintentar pendientes"
              : exercise
                ? "Guardar ejercicio"
                : "Guardar nota"}
        </Button>
      ) : null}
    </View>
  );
  const form = (
    <View style={styles.stack}>
      {!exercise ? (
        <Text style={[styles.copy, { color: theme.textSecondary }]}>
          {notePurpose}
        </Text>
      ) : null}
      <Text style={[styles.copy, { color: theme.textSecondary }]}>
        {exercise
          ? "Título del ejercicio · Obligatorio"
          : "Título de la nota · Opcional"}
      </Text>
      <TextInput
        accessibilityLabel={
          exercise ? "Título del ejercicio" : "Título de la nota"
        }
        placeholder={
          exercise ? "Título del ejercicio" : "Título de la nota (opcional)"
        }
        placeholderTextColor={theme.textMuted}
        maxLength={200}
        value={title}
        onChangeText={setTitle}
        editable={!readOnly && !saving && !uncertain}
        style={inputStyle}
      />
      {!exercise ? (
        <>
          <Text style={[styles.copy, { color: theme.textSecondary }]}>
            Tipo de nota
          </Text>
          <SimpleDropdown
            accessibilityLabel="Tipo de nota clínica"
            value={noteType}
            disabled={readOnly || saving || uncertain}
            onSelect={(value) => {
              if (
                [
                  "EVOLUTION",
                  "FOLLOW_UP",
                  "INCIDENT",
                  "ASSESSMENT",
                  "EXERCISE_REVIEW",
                ].includes(value)
              )
                setNoteType(
                  value === "FOLLOW_UP"
                    ? "FOLLOW_UP"
                    : value === "INCIDENT"
                      ? "INCIDENT"
                      : value === "ASSESSMENT"
                        ? "ASSESSMENT"
                        : value === "EXERCISE_REVIEW"
                          ? "EXERCISE_REVIEW"
                          : "EVOLUTION",
                );
            }}
            options={
              draft.note?.type === "ASSESSMENT"
                ? [...noteTypes, legacyNoteType]
                : noteTypes
            }
          />
          <Text style={[styles.copy, { color: theme.textSecondary }]}>
            Etiquetas · Opcionales, separadas por comas
          </Text>
          <TextInput
            accessibilityLabel="Etiquetas de la nota"
            placeholder="Etiquetas separadas por comas"
            value={tags}
            onChangeText={setTags}
            editable={!readOnly && !saving && !uncertain}
            style={inputStyle}
          />
        </>
      ) : null}
      <Text style={[styles.copy, { color: theme.textSecondary }]}>
        {exercise
          ? "Instrucciones del ejercicio · Opcionales"
          : "Contenido de la nota · Obligatorio"}
      </Text>
      <TextInput
        accessibilityLabel={
          exercise ? "Instrucciones del ejercicio" : "Contenido de la nota"
        }
        multiline
        maxLength={10000}
        value={content}
        onChangeText={setContent}
        editable={!readOnly && !saving && !uncertain}
        placeholder={
          exercise
            ? "Describe el ejercicio o añade sus instrucciones…"
            : "Registra el seguimiento de la sesión o una incidencia…"
        }
        placeholderTextColor={theme.textMuted}
        style={[...inputStyle, styles.textarea]}
      />
      <PatientSessionPicker
        clientId={client.id}
        value={sessionId}
        selectedLabel={
            draft.note?.sessionDate
              ? patientDate(draft.note.sessionDate, true)
              : linkedSession ? patientDate(linkedSession.date, true) : undefined
        }
        onSelect={setSessionId}
        disabled={readOnly || saving || uncertain || Boolean(savedId)}
        label="Vincular a una sesión"
        emptyLabel="Sin vincular a una sesión"
      />
      {files.map((file, index) => (
        <View
          key={`${file.uri}-${index}`}
          style={[styles.file, { backgroundColor: theme.bgMuted }]}
        >
          <Text
            numberOfLines={1}
            style={[
              styles.filename,
              { color: theme.textPrimary, fontFamily: theme.fontSans },
            ]}
          >
            {file.fileName || file.name}
          </Text>
          <Button
            size="small"
            variant="outline"
            disabled={saving}
            onPress={() => removeFile(file)}
            accessibilityLabel={`Quitar ${file.fileName || file.name}`}
          >
            Quitar
          </Button>
        </View>
      ))}
      {error ? (
        <Text
          accessibilityRole="alert"
          style={[styles.copy, { color: theme.error }]}
        >
          {error}
        </Text>
      ) : null}
      {savedId ? (
        <Button
          variant="outline"
          size="small"
          loading={historyLoading}
          onPress={() => void loadHistory()}
        >
          Ver historial de cambios
        </Button>
      ) : null}
      {history ? (
        <View style={styles.stack}>
          {conflict ? (
            <View style={[styles.input, { backgroundColor: theme.bgMuted }]}>
              <Text
                style={{
                  color: theme.textPrimary,
                  fontFamily: theme.fontSansSemiBold,
                }}
              >
                Versión actual guardada
              </Text>
              {history.current.metadata ? (
                <Text style={{ color: theme.textPrimary }}>
                  {history.current.metadata.title || "Nota clínica"} ·{" "}
                  {noteTypeLabels[history.current.metadata.type] ||
                    "Nota clínica"}{" "}
                  · {history.current.metadata.tags.join(", ")}
                </Text>
              ) : null}
              {history.current.title ? (
                <Text style={{ color: theme.textPrimary }}>
                  {history.current.title}
                </Text>
              ) : null}
              <Text selectable style={{ color: theme.textPrimary }}>
                {history.current.content}
              </Text>
              <Text style={{ color: theme.textSecondary }}>
                Tu borrador sigue arriba. Revísalo teniendo en cuenta esta
                versión antes de continuar.
              </Text>
              <Button
                variant="outline"
                size="small"
                onPress={() => {
                  setVersion(history.current.updatedAt);
                  setConflict(false);
                  setError(null);
                }}
              >
                He revisado los cambios; continuar editando
              </Button>
            </View>
          ) : null}
          {!history.items.length ? (
            <Text style={{ color: theme.textSecondary }}>
              No hay versiones anteriores.
            </Text>
          ) : (
            history.items.map((item) => (
              <View
                key={item.id}
                style={[styles.input, { backgroundColor: theme.bgMuted }]}
              >
                <Text style={{ color: theme.textSecondary }}>
                  Versión del {new Date(item.versionAt).toLocaleString("es-ES")}
                </Text>
                {item.revisedByName ? (
                  <Text style={{ color: theme.textSecondary }}>
                    Reemplazada por {item.revisedByName}
                  </Text>
                ) : null}
                {item.metadata ? (
                  <Text style={{ color: theme.textPrimary }}>
                    {item.metadata.title || "Nota clínica"} ·{" "}
                    {noteTypeLabels[item.metadata.type] || "Nota clínica"} ·{" "}
                    {item.metadata.tags.join(", ")}
                  </Text>
                ) : null}
                {item.title ? (
                  <Text style={{ color: theme.textPrimary }}>{item.title}</Text>
                ) : null}
                <Text selectable style={{ color: theme.textPrimary }}>
                  {item.content}
                </Text>
              </View>
            ))
          )}
          {history.nextCursor ? (
            <Button
              variant="outline"
              loading={historyLoading}
              onPress={() => void loadHistory(true)}
            >
              Ver versiones anteriores
            </Button>
          ) : null}
          {!conflict ? (
            <Button
              variant="outline"
              size="small"
              onPress={() => setHistory(null)}
            >
              Ocultar historial
            </Button>
          ) : null}
        </View>
      ) : null}

      <Text
        style={[
          styles.hint,
          { color: theme.textSecondary, fontFamily: theme.fontSans },
        ]}
      >
        PDF, DOCX e imágenes · Hasta 15 MB por archivo · Las correcciones
        conservan la versión anterior
      </Text>
    </View>
  );
  return dialog ? (
    <DetailDialog
      title={dialog.title}
      visible
      busy={saving}
      onClose={dialog.onClose}
      footer={actions}
    >
      {form}
    </DetailDialog>
  ) : (
    <>
      {form}
      {actions}
    </>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.sm },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    lineHeight: 21,
  },
  textarea: { minHeight: 125, textAlignVertical: "top" },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    alignItems: "center",
    justifyContent: "space-between",
  },
  file: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 8,
    paddingLeft: 10,
  },
  filename: { flex: 1, fontSize: 12 },
  hint: { fontSize: 11, lineHeight: 17 },
  copy: { fontSize: 13, lineHeight: 20 },
});
