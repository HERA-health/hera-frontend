import React, { useState } from "react";
import { View } from "react-native";
import { SimpleDropdown } from "../../common/SimpleDropdown";
import type { EntryQuery } from "../../../services/clinicalEntriesService";
import { PatientFilters, ActivePatientFilters } from "./PatientFilters";
import { PatientSessionPicker } from "./PatientSessionPicker";
import { Copy } from "./PatientDetailPrimitives";

type Option = { value: string; label: string };
function Choice({
  label,
  value,
  options,
  onChange,
  onOpen,
}: {
  label: string;
  value?: string;
  options: Option[];
  onChange: (value: string) => void;
  onOpen?: () => void;
}) {
  return (
    <View style={{ gap: 5 }}>
      <Copy>{label}</Copy>
      <SimpleDropdown
        compact
        presentation="portal"
        keyboardNavigation
        accessibilityLabel={label}
        value={value || ""}
        onSelect={onChange}
        onOpen={onOpen}
        options={options}
      />
    </View>
  );
}
export function ClinicalEntryFilters({
  query,
  onChange,
  notes,
  types,
  authors,
  tags,
  onTagsOpen,
  clientId,
  sessionLabel,
}: {
  query: EntryQuery;
  onChange: (value: Partial<EntryQuery>) => void;
  notes: boolean;
  types: Option[];
  authors: Array<{ id: string; name: string }>;
  tags: string[];
  onTagsOpen: () => void;
  clientId: string;
  sessionLabel?: string;
}) {
  const [draft, setDraft] = useState(query);
  const keys = notes
    ? (["type", "authorId", "tag", "sessionId"] as const)
    : (["type", "authorId", "status"] as const);
  const labels: Partial<Record<keyof EntryQuery, string>> = {
    type: types.find((row) => row.value === query.type)?.label,
    authorId:
      authors.find((row) => row.id === query.authorId)?.name ||
      "Profesional seleccionado",
    tag: query.tag,
    sessionId: sessionLabel || "Sesión seleccionada",
    status: query.status === "DRAFT" ? "Borrador" : "Completa",
  };
  return (
    <View style={{ gap: 8 }}>
      <PatientFilters
        count={keys.filter((key) => query[key]).length}
        onOpen={() => setDraft(query)}
        onClear={() => setDraft({})}
        onApply={() =>
          onChange({
            type: draft.type || "",
            authorId: draft.authorId || "",
            ...(notes
              ? { tag: draft.tag || "", sessionId: draft.sessionId || "" }
              : { status: draft.status || "" }),
          })
        }
      >
        <Choice
          label="Tipo de contenido clínico"
          value={draft.type}
          onChange={(type) => setDraft((current) => ({ ...current, type }))}
          options={[{ value: "", label: "Todos los tipos" }, ...types]}
        />
        {authors.length > 1 || query.authorId ? (
          <Choice
            label="Autor clínico"
            value={draft.authorId}
            onChange={(authorId) =>
              setDraft((current) => ({ ...current, authorId }))
            }
            options={[
              { value: "", label: "Todos los profesionales" },
              ...authors.map((row) => ({ value: row.id, label: row.name })),
            ]}
          />
        ) : null}
        {notes ? (
          <>
            <Choice
              label="Etiqueta clínica"
              value={draft.tag}
              onOpen={onTagsOpen}
              onChange={(tag) => setDraft((current) => ({ ...current, tag }))}
              options={[
                { value: "", label: "Todas las etiquetas" },
                ...[
                  ...new Set([...tags, ...(query.tag ? [query.tag] : [])]),
                ].map((tag) => ({ value: tag, label: tag })),
              ]}
            />
            <PatientSessionPicker
              clientId={clientId}
              label="Sesión de las notas"
              emptyLabel="Todas las sesiones"
              value={draft.sessionId || ""}
              selectedLabel={
                draft.sessionId === query.sessionId ? sessionLabel : undefined
              }
              onSelect={(sessionId) =>
                setDraft((current) => ({ ...current, sessionId }))
              }
            />
          </>
        ) : (
          <Choice
            label="Estado de entrada clínica"
            value={draft.status}
            onChange={(value) =>
              setDraft((current) => ({
                ...current,
                status:
                  value === "DRAFT"
                    ? "DRAFT"
                    : value === "COMPLETE"
                      ? "COMPLETE"
                      : "",
              }))
            }
            options={[
              { value: "", label: "Todos los estados" },
              { value: "DRAFT", label: "Borrador" },
              { value: "COMPLETE", label: "Completa" },
            ]}
          />
        )}
      </PatientFilters>
      <ActivePatientFilters
        items={keys.flatMap((key) =>
          query[key]
            ? [
                {
                  key,
                  label: labels[key] || query[key] || "",
                  onRemove: () => onChange({ [key]: "" }),
                },
              ]
            : [],
        )}
      />
    </View>
  );
}
