import React, { useEffect, useState } from "react";
import { View, Text } from "react-native";
import { Button, AnimatedPressable } from "../../common";
import { useTheme } from "../../../contexts/ThemeContext";
import * as clinical from "../../../services/clinicalService";
import type { Client } from "../../../services/professionalService";
import { getErrorMessage } from "../../../constants/errors";
import {
  ClinicalWorkspaceComposer,
  type ClinicalComposerDraft,
} from "../ClinicalWorkspaceComposer";
import {
  Panel,
  Copy,
  LoadState,
  DetailDialog,
  pd,
  patientDate,
} from "./PatientDetailPrimitives";
export function ClinicalExercisesWorkspace({
  client,
  token,
  writable,
  focusId,
  onError,
  onChanged,
  onDocument,
}: {
  client: Client;
  token: string;
  writable: boolean;
  focusId?: string;
  onError: (e: unknown) => void;
  onChanged: () => void;
  onDocument: (document: clinical.ClinicalDocument) => void;
}) {
  const { theme } = useTheme();
  const [items, setItems] = useState<clinical.ClinicalExercise[]>([]);
  const [legacy, setLegacy] = useState<clinical.ClinicalDocument[]>([]);
  const [page, setPage] = useState<clinical.ClinicalPageInfo | null>(null);
  const [legacyPage, setLegacyPage] =
    useState<clinical.ClinicalPageInfo | null>(null);
  const [selected, setSelected] = useState<clinical.ClinicalExercise | null>(
    null,
  );
  const [draft, setDraft] = useState<ClinicalComposerDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    void Promise.all([
      clinical.getClinicalExercises(client.id, token),
      clinical.searchClinicalDocuments(client.id, token, {
        category: "SESSION_EXERCISE",
        archived: false,
      }),
    ])
      .then(async ([next, old]) => {
        let rows = next.items;
        let info = next.pageInfo;
        while (
          focusId &&
          !rows.some((row) => row.id === focusId) &&
          info.hasMore &&
          active
        ) {
          const more = await clinical.getClinicalExercises(
            client.id,
            token,
            info.nextCursor || undefined,
          );
          rows = [...rows, ...more.items];
          info = more.pageInfo;
        }
        if (active) {
          setItems(rows);
          setPage(info);
          setLegacy(old.items);
          setLegacyPage(old.pageInfo);
          setSelected(
            (current) =>
              rows.find((row) => row.id === (focusId || current?.id)) ||
              rows[0] ||
              null,
          );
        }
      })
      .catch((e) => {
        if (active) {
          setError(getErrorMessage(e, "No se pudieron cargar los ejercicios."));
          onError(e);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [client.id, token, revision, focusId, onError]);
  const more = async (old = false) => {
    setLoading(true);
    try {
      if (old) {
        const next = await clinical.searchClinicalDocuments(client.id, token, {
          category: "SESSION_EXERCISE",
          archived: false,
          cursor: legacyPage?.nextCursor || undefined,
        });
        setLegacy((current) => [...current, ...next.items]);
        setLegacyPage(next.pageInfo);
      } else {
        const next = await clinical.getClinicalExercises(
          client.id,
          token,
          page?.nextCursor || undefined,
        );
        setItems((current) => [...current, ...next.items]);
        setPage(next.pageInfo);
      }
    } catch (e) {
      setError(getErrorMessage(e, "No se pudo cargar la siguiente página."));
      onError(e);
    } finally {
      setLoading(false);
    }
  };
  return (
    <View style={pd.stack}>
      <Panel
        title="Ejercicios"
        icon="fitness-outline"
        action={
          writable ? (
            <Button size="small" onPress={() => setDraft({ kind: "EXERCISE" })}>
              + Nuevo ejercicio
            </Button>
          ) : undefined
        }
      >
        <LoadState
          loading={loading}
          error={error}
          onRetry={() => setRevision((value) => value + 1)}
        />
        {items.map((row) => (
          <AnimatedPressable
            key={row.id}
            accessibilityRole="button"
            accessibilityState={{ selected: selected?.id === row.id }}
            hoverLift={false}
            onPress={() => setSelected(row)}
            style={[
              pd.row,
              {
                borderBottomColor: theme.borderLight,
                backgroundColor:
                  row.id === selected?.id
                    ? theme.primaryAlpha12
                    : "transparent",
              },
            ]}
          >
            <Text
              style={{
                color: theme.textPrimary,
                fontFamily: theme.fontSansSemiBold,
                fontSize: 14,
              }}
            >
              {row.title}
            </Text>
            <Copy muted>
              {patientDate(row.createdAt)} ·{" "}
              {row.sessionId ? "Vinculado a sesión" : "Ejercicio del proceso"}
            </Copy>
          </AnimatedPressable>
        ))}
        {!loading && !items.length ? (
          <Copy muted>No hay ejercicios registrados.</Copy>
        ) : null}
        {page?.hasMore ? (
          <Button variant="outline" size="small" onPress={() => void more()}>
            Ver más ejercicios
          </Button>
        ) : null}
      </Panel>
      {selected ? (
        <Panel
          title={selected.title}
          action={
            <Button
              size="small"
              variant="outline"
              onPress={() => setDraft({ kind: "EXERCISE", exercise: selected })}
            >
              {writable ? "Editar" : "Consultar historial"}
            </Button>
          }
        >
          <Copy>{selected.instructions}</Copy>
          {selected.documents.map((document) => (
            <Button
              key={document.id}
              variant="outline"
              size="small"
              onPress={() => onDocument(document)}
            >
              {document.fileName}
            </Button>
          ))}
          {writable ? (
            <Button
              variant="outline"
              size="small"
              onPress={() => setDraft({ kind: "EXERCISE", exercise: selected })}
            >
              Añadir archivos
            </Button>
          ) : null}
        </Panel>
      ) : null}
      {legacy.length ? (
        <Panel title="Archivos de ejercicios anteriores" icon="archive-outline">
          {legacy.map((document) => (
            <Button
              key={document.id}
              size="small"
              variant="outline"
              onPress={() => onDocument(document)}
            >
              {document.fileName}
            </Button>
          ))}
          {legacyPage?.hasMore ? (
            <Button
              size="small"
              variant="outline"
              onPress={() => void more(true)}
            >
              Ver más archivos anteriores
            </Button>
          ) : null}
        </Panel>
      ) : null}

      {draft ? (
        <ClinicalWorkspaceComposer
          dialog={{ title: "Ejercicio clínico", onClose: () => setDraft(null) }}
          key={draft.exercise?.id || "new"}
          client={client}
          token={token}
          readOnly={!writable}
          draft={draft}
          onError={onError}
          onBusyChange={setBusy}
          onChanged={() => {
            setRevision((value) => value + 1);
            onChanged();
          }}
          onSaved={() => {
            setBusy(false);
            setDraft(null);
            setRevision((value) => value + 1);
            onChanged();
          }}
        />
      ) : null}
    </View>
  );
}
