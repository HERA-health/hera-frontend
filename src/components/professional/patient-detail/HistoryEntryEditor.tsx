import { PatientDateField } from "./PatientDateField";
import React, { useRef, useState } from "react";
import { View, useWindowDimensions } from "react-native";
import { Button } from "../../common";
import { SimpleDropdown } from "../../common/SimpleDropdown";
import { PatientSessionPicker } from "./PatientSessionPicker";
import {
  historyTypes,
  legacyHistoryType,
  historyPurpose,
} from "../clinicalEntryTypes";
import type { Client } from "../../../services/professionalService";
import {
  saveHistory,
  getHistoryRevisions,
  type HistoryEntry,
  type HistoryInput,
  type HistoryRevisions,
} from "../../../services/clinicalEntriesService";
import { isClinicalSaveUncertain } from "../../../services/clinicalService";
import { getErrorCode, getErrorMessage } from "../../../constants/errors";
import {
  getMadridDateKey,
  parseMadridDateTime,
} from "../../../utils/madridTime";
import { createSecureRandomUuid } from "../../../utils/secureRandom";
import {
  Input,
  DetailDialog,
  Copy,
  LoadState,
  pd,
  patientDate,
} from "./PatientDetailPrimitives";

export { historyTypes } from "../clinicalEntryTypes";
export function HistoryEntryEditor({
  client,
  token,
  entry,
  readOnly = false,
  onSaved,
  onError,
  onBusy,
  dialog,
}: {
  client: Client;
  token: string;
  entry?: HistoryEntry;
  readOnly?: boolean;
  onSaved: () => void;
  onError: (error: unknown) => void;
  onBusy: (busy: boolean) => void;
  dialog?: { title: string; onClose: () => void };
}) {
  const compactForm = useWindowDimensions().width < 600;
  const [input, setInput] = useState<HistoryInput>({
    title: entry?.title || "",
    content: entry?.content || "",
    type: entry?.type || "ASSESSMENT",
    status: entry?.status || "DRAFT",
    occurredAt: entry?.occurredAt || new Date().toISOString(),
    sessionIds: entry?.sessionIds || [],
    expectedUpdatedAt: entry?.updatedAt,
  });
  const [day, setDay] = useState(getMadridDateKey(new Date(input.occurredAt)));
  const [knownSessions, setKnownSessions] = useState<
    Array<{ id: string; date: string }>
  >([...(entry?.sessions || []), ...(client.sessions || [])]);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState("");
  const [uncertain, setUncertain] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [history, setHistory] = useState<HistoryRevisions | null>(null);
  const key = useRef<string | null>(null);
  const active = useRef(true);
  React.useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  const revisions = async (more = false) => {
    if (!entry || busy) return;
    setBusy(true);
    try {
      const next = await getHistoryRevisions(
        client.id,
        token,
        entry.id,
        more ? history?.nextCursor || undefined : undefined,
      );
      if (active.current)
        setHistory((current) =>
          more && current
            ? { ...next, items: [...current.items, ...next.items] }
            : next,
        );
    } catch (e) {
      if (active.current) {
        setError(getErrorMessage(e, "No se pudo cargar el historial."));
        onError(e);
      }
    } finally {
      if (active.current) setBusy(false);
    }
  };
  const save = async () => {
    if (readOnly || busyRef.current || conflict) return;
    const date = parseMadridDateTime(day, "12:00");
    if (!date) {
      setError("Selecciona una fecha válida.");
      return;
    }
    busyRef.current = true;
    setBusy(true);
    onBusy(true);
    setError("");
    try {
      key.current ??= createSecureRandomUuid();
      const occurredAt =
        day === getMadridDateKey(new Date(input.occurredAt))
          ? input.occurredAt
          : date.iso;
      const saved = await saveHistory(
        client.id,
        token,
        {
          ...input,
          title: input.title.trim(),
          content: input.content.trim(),
          occurredAt,
        },
        entry?.id,
        key.current,
      );
      if (active.current) {
        if (
          saved.title !== input.title.trim() ||
          saved.content !== input.content.trim() ||
          saved.type !== input.type ||
          saved.status !== input.status ||
          new Date(saved.occurredAt).getTime() !==
            new Date(occurredAt).getTime() ||
          JSON.stringify([...saved.sessionIds].sort()) !==
            JSON.stringify([...input.sessionIds].sort())
        ) {
          setConflict(true);
          setError(
            "El guardado está confirmado, pero existe una versión posterior. Reabre la entrada para revisarla.",
          );
          return;
        }
        onSaved();
      }
    } catch (e) {
      if (active.current) {
        setUncertain(isClinicalSaveUncertain(e));
        if (!isClinicalSaveUncertain(e)) key.current = null;
        setConflict(getErrorCode(e) === "CLINICAL_VERSION_CONFLICT");
        setError(getErrorMessage(e, "No se pudo guardar."));
        onError(e);
      }
    } finally {
      busyRef.current = false;
      if (active.current) {
        setBusy(false);
        onBusy(false);
      }
    }
  };
  const actions = (
    <>
      <Button
        variant="outline"
        disabled={busy}
        onPress={() => dialog?.onClose()}
      >
        Cancelar
      </Button>{" "}
      {!readOnly ? (
        <Button
          loading={busy}
          disabled={!input.title.trim() || !input.content.trim() || conflict}
          onPress={() => void save()}
        >
          {uncertain ? "Comprobar y reintentar guardado" : "Guardar entrada"}
        </Button>
      ) : null}
    </>
  );
  const form = (
    <View style={pd.stack}>
      <Copy muted>{historyPurpose}</Copy>
      <Copy>Título de la entrada · Obligatorio</Copy>
      <Input
        accessibilityLabel="Título de la entrada"
        placeholder="Título"
        maxLength={200}
        value={input.title}
        editable={!readOnly && !busy && !uncertain}
        onChangeText={(title) => setInput((current) => ({ ...current, title }))}
      />
      <View style={[pd.filters, compactForm && { flexDirection: "column" }]}>
        <View
          style={{ flex: compactForm ? undefined : 1, minWidth: 150, gap: 5 }}
        >
          <Copy>Tipo de entrada</Copy>
          <SimpleDropdown
            compact
            highlightSelection={false}
            presentation="portal"
            keyboardNavigation
            accessibilityLabel="Tipo de entrada"
            value={input.type}
            disabled={readOnly || busy || uncertain}
            onSelect={(value) =>
              setInput((current) => ({
                ...current,
                type:
                  value === "BACKGROUND"
                    ? "BACKGROUND"
                    : value === "EVOLUTION"
                      ? "EVOLUTION"
                      : value === "OBJECTIVES"
                        ? "OBJECTIVES"
                        : value === "TREATMENT_PLAN"
                          ? "TREATMENT_PLAN"
                          : "ASSESSMENT",
              }))
            }
            options={
              entry?.type === "EVOLUTION"
                ? [...historyTypes, legacyHistoryType]
                : historyTypes
            }
          />
        </View>
        <View
          style={{ flex: compactForm ? undefined : 1, minWidth: 130, gap: 5 }}
        >
          <Copy>Estado</Copy>
          <SimpleDropdown
            compact
            highlightSelection={false}
            presentation="portal"
            keyboardNavigation
            accessibilityLabel="Estado de la entrada"
            value={input.status}
            disabled={readOnly || busy || uncertain}
            onSelect={(value) =>
              setInput((current) => ({
                ...current,
                status: value === "COMPLETE" ? "COMPLETE" : "DRAFT",
              }))
            }
            options={[
              { value: "DRAFT", label: "Borrador" },
              { value: "COMPLETE", label: "Completa" },
            ]}
          />
        </View>
      </View>
      <PatientDateField
        label="Fecha de la entrada"
        value={day}
        onChange={setDay}
        disabled={readOnly || busy || uncertain}
      />
      <Copy>Contenido · Obligatorio</Copy>
      <Input
        accessibilityLabel="Contenido de historia clínica"
        placeholder="Evaluación del proceso, antecedentes, objetivos o plan de tratamiento…"
        multiline
        maxLength={20000}
        value={input.content}
        editable={!readOnly && !busy && !uncertain}
        onChangeText={(content) =>
          setInput((current) => ({ ...current, content }))
        }
      />
      <PatientSessionPicker
        clientId={client.id}
        label="Añadir sesión relacionada"
        emptyLabel="Añadir sesión relacionada"
        value=""
        disabled={readOnly || busy || uncertain}
        onSelect={(id, session) => {
          if (!id) return;
          setInput((current) => ({
            ...current,
            sessionIds: [...new Set([...current.sessionIds, id])],
          }));
          if (session)
            setKnownSessions((current) => [
              ...current.filter((row) => row.id !== id),
              session,
            ]);
        }}
      />
      {input.sessionIds.map((id) => (
        <View key={id} style={pd.toolbar}>
          <Copy>
            {patientDate(
              knownSessions.find((row) => row.id === id)?.date,
              true,
            )}
          </Copy>
          <Button
            size="small"
            variant="outline"
            disabled={readOnly || busy || uncertain}
            onPress={() =>
              setInput((current) => ({
                ...current,
                sessionIds: current.sessionIds.filter((value) => value !== id),
              }))
            }
          >
            Quitar sesión
          </Button>
        </View>
      ))}
      <LoadState error={error} />
      {entry ? (
        <Button
          variant="outline"
          size="small"
          disabled={busy}
          onPress={() => void revisions()}
        >
          Ver historial de cambios
        </Button>
      ) : null}
      {history ? (
        <>
          <Copy>
            Versión actual: {history.current.title} ·{" "}
            {patientDate(history.current.updatedAt, true)}
          </Copy>
          {conflict ? (
            <>
              <Copy>{history.current.content}</Copy>
              <Button
                variant="outline"
                onPress={() => {
                  setInput((current) => ({
                    ...current,
                    expectedUpdatedAt: history.current.updatedAt,
                  }));
                  setConflict(false);
                  setError("");
                }}
              >
                He revisado la versión actual; continuar
              </Button>
            </>
          ) : null}
          {history.items.map((row) => (
            <View key={row.id} style={pd.panel}>
              <Copy>
                {patientDate(row.versionAt, true)} · {row.title}
              </Copy>
              {row.revisedByName ? (
                <Copy muted>Reemplazada por {row.revisedByName}</Copy>
              ) : null}
              <Copy>{row.content}</Copy>
            </View>
          ))}
          {history.nextCursor ? (
            <Button
              size="small"
              variant="outline"
              onPress={() => void revisions(true)}
            >
              Ver versiones anteriores
            </Button>
          ) : null}
        </>
      ) : null}
    </View>
  );
  return dialog ? (
    <DetailDialog
      title={dialog.title}
      visible
      busy={busy}
      onClose={dialog.onClose}
      footer={actions}
    >
      {form}
    </DetailDialog>
  ) : (
    <>
      {form}{" "}
      {!readOnly ? (
        <Button
          loading={busy}
          disabled={!input.title.trim() || !input.content.trim() || conflict}
          onPress={() => void save()}
        >
          {uncertain ? "Comprobar y reintentar guardado" : "Guardar entrada"}
        </Button>
      ) : null}
    </>
  );
}
