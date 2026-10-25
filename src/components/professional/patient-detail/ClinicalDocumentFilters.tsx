import React, { useState } from "react";
import { View } from "react-native";
import { SimpleDropdown } from "../../common/SimpleDropdown";
import type { DocumentQuery } from "../../../services/clinicalEntriesService";
import { PatientFilters, ActivePatientFilters } from "./PatientFilters";
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
export function ClinicalDocumentFilters({
  query,
  onChange,
  authors,
  classifications,
}: {
  query: DocumentQuery;
  onChange: (value: Partial<DocumentQuery>) => void;
  authors: Array<{ id: string; name: string }>;
  classifications: Option[];
}) {
  const [draft, setDraft] = useState(query);
  const formats = [
    { value: "", label: "Todos los formatos" },
    { value: "PDF", label: "PDF" },
    { value: "IMAGE", label: "Imágenes" },
    { value: "DOCX", label: "DOCX" },
  ];
  const active = [
    {
      key: "format",
      label: formats.find((row) => row.value === query.format)?.label,
    },
    {
      key: "classification",
      label: classifications.find((row) => row.value === query.classification)
        ?.label,
    },
    {
      key: "authorId",
      label:
        authors.find((row) => row.id === query.authorId)?.name ||
        "Profesional seleccionado",
    },
  ] as const;
  return (
    <View style={{ gap: 8 }}>
      <PatientFilters
        count={active.filter((row) => query[row.key]).length}
        onOpen={() => setDraft(query)}
        onClear={() => setDraft({})}
        onApply={() =>
          onChange({
            format: draft.format || "",
            classification: draft.classification || "",
            authorId: draft.authorId || "",
          })
        }
      >
        <Choice
          label="Formato de documento"
          value={draft.format}
          options={formats}
          onChange={(value) =>
            setDraft((current) => ({
              ...current,
              format:
                value === "PDF"
                  ? "PDF"
                  : value === "IMAGE"
                    ? "IMAGE"
                    : value === "DOCX"
                      ? "DOCX"
                      : "",
            }))
          }
        />
        <Choice
          label="Clasificación de documento"
          value={draft.classification}
          options={[
            { value: "", label: "Todas las categorías" },
            ...classifications,
          ]}
          onChange={(classification) =>
            setDraft((current) => ({ ...current, classification }))
          }
        />
        {authors.length > 1 || query.authorId ? (
          <Choice
            label="Autor del documento"
            value={draft.authorId}
            options={[
              { value: "", label: "Todos los profesionales" },
              ...authors.map((row) => ({ value: row.id, label: row.name })),
            ]}
            onChange={(authorId) =>
              setDraft((current) => ({ ...current, authorId }))
            }
          />
        ) : null}
      </PatientFilters>
      <ActivePatientFilters
        items={active.flatMap((row) =>
          query[row.key]
            ? [
                {
                  key: row.key,
                  label: row.label || query[row.key] || "",
                  onRemove: () => onChange({ [row.key]: "" }),
                },
              ]
            : [],
        )}
      />
    </View>
  );
}
