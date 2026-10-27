import { ClinicalDocumentFilters } from "./ClinicalDocumentFilters";
import { PatientPagination } from "./PatientPagination";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, useWindowDimensions } from "react-native";
import { Button, AnimatedPressable } from "../../common";
import { SimpleDropdown } from "../../common/SimpleDropdown";
import { useTheme } from "../../../contexts/ThemeContext";
import * as clinical from "../../../services/clinicalService";
import {
  searchDocuments,
  type DocumentQuery,
  type EntryPage,
} from "../../../services/clinicalEntriesService";
import { pickClinicalFiles } from "../../../services/clinicalFilePicker";
import { releaseClinicalAssets } from "../../../services/clinicalFileCache";
import type { UploadAsset } from "../../../utils/multipartUpload";
import { createSecureRandomUuid } from "../../../utils/secureRandom";
import { getErrorMessage } from "../../../constants/errors";
import { ClinicalDocumentPreview } from "./ClinicalDocumentPreview";
import {
  Panel,
  Copy,
  Field,
  Input,
  Badge,
  LoadState,
  DetailDialog,
  pd,
  patientDate,
} from "./PatientDetailPrimitives";

export const classifications = [
  { value: "OTHER", label: "Otros documentos" },
  { value: "REPORT", label: "Informes" },
  { value: "ASSESSMENT", label: "Evaluación" },
  { value: "TREATMENT", label: "Tratamiento" },
  { value: "THERAPEUTIC_MATERIAL", label: "Material terapéutico" },
  { value: "TREATMENT_CONSENT", label: "Consentimiento del tratamiento" },
];
export interface ClinicalUploadTarget {
  noteId?: string;
  exerciseId?: string;
  historyEntryId?: string;
}
export interface ClinicalUploadRequest extends ClinicalUploadTarget {
  id: number;
  classification?: clinical.DocumentMetadata["classification"];
}
export function ClinicalDocumentsWorkspace({
  clientId,
  token,
  writable,
  focusDocumentId,
  uploadRequest,
  onUploadConsumed,
  onError,
  onChanged,
  onParent,
  onConsent,
}: {
  clientId: string;
  token: string;
  writable: boolean;
  focusDocumentId?: string;
  uploadRequest?: ClinicalUploadRequest;
  onUploadConsumed: () => void;
  onError: (e: unknown) => void;
  onChanged: () => void;
  onParent: (kind: "NOTE" | "HISTORY" | "EXERCISE", id: string) => void;
  onConsent?: () => void;
}) {
  const { theme } = useTheme();
  const compact = useWindowDimensions().width < 1180;
  const [query, setQuery] = useState<DocumentQuery>(
    focusDocumentId ? { documentId: focusDocumentId } : {},
  );
  const [page, setPage] = useState<EntryPage<clinical.ClinicalDocument> | null>(
    null,
  );
  const [selected, setSelected] = useState<clinical.ClinicalDocument | null>(
    null,
  );
  const [detail, setDetail] = useState(Boolean(focusDocumentId));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [cursors, setCursors] = useState<Array<string | undefined>>([
    undefined,
  ]);
  const [upload, setUpload] = useState(false);
  const [target, setTarget] = useState<ClinicalUploadTarget>({});
  const [files, setFiles] = useState<UploadAsset[]>([]);
  const filesRef = useRef(files);
  filesRef.current = files;
  const [metadata, setMetadata] = useState<clinical.DocumentMetadata>({
    classification: "OTHER",
    description: "",
  });
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [uncertain, setUncertain] = useState(false);
  const active = useRef(true);
  const handled = useRef<number | undefined>(undefined);
  const updateKey = useRef<string | null>(null);
  const report = useCallback(
    (e: unknown) => {
      setError(getErrorMessage(e, "No se pudo completar la acción."));
      onError(e);
    },
    [onError],
  );
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      releaseClinicalAssets(filesRef.current);
    };
  }, []);
  useEffect(() => {
    if (uploadRequest && handled.current !== uploadRequest.id) {
      handled.current = uploadRequest.id;
      const { id, classification, ...parent } = uploadRequest;
      if (classification === "TREATMENT_CONSENT") {
        onUploadConsumed();
        if (onConsent) onConsent();
        else report(new Error("Registra este documento desde Consentimiento informado."));
        return;
      }
      setTarget(parent);
      setMetadata({
        classification: classification || "OTHER",
        description: "",
      });
      setUpload(true);
      onUploadConsumed();
    }
  }, [uploadRequest, onUploadConsumed, onConsent, report]);
  useEffect(() => {
    let current = true;
    setPage(null);
    setLoading(true);
    setError("");
    const timer = setTimeout(
      () =>
        void searchDocuments(clientId, token, query)
          .then((value) => {
            if (current) {
              setPage(value);
              setSelected(
                (old) =>
                  value.items.find((row) => row.id === old?.id) ||
                  value.items[0] ||
                  null,
              );
            }
          })
          .catch((e) => {
            if (current) report(e);
          })
          .finally(() => {
            if (current) setLoading(false);
          }),
      200,
    );
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [clientId, token, query, revision, report]);
  const filter = (value: Partial<DocumentQuery>) => {
    setCursors([undefined]);
    setQuery((current) => ({ ...current, ...value, cursor: undefined }));
  };
  const changed = () => {
    setRevision((value) => value + 1);
    onChanged();
  };
  const pick = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      const next = await pickClinicalFiles(
        true,
        metadata.classification === "TREATMENT_CONSENT"
          ? ["application/pdf"]
          : undefined,
      );
      if (active.current) setFiles((current) => [...current, ...next]);
      else releaseClinicalAssets(next);
    } catch (e) {
      if (active.current) report(e);
    } finally {
      busyRef.current = false;
      if (active.current) setBusy(false);
    }
  };
  const uploadFiles = async () => {
    if (busyRef.current || !writable) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    let saved = false;
    try {
      for (const file of files) {
        if (!active.current) return;
        await clinical.uploadClinicalDocument(
          clientId,
          file,
          token,
          target.noteId
            ? "NOTE_ATTACHMENT"
            : target.exerciseId
              ? "EXERCISE_ATTACHMENT"
              : "GENERAL",
          undefined,
          { ...target, ...metadata },
        );
        saved = true;
        releaseClinicalAssets([file]);
        if (active.current)
          setFiles((current) => current.filter((value) => value !== file));
      }
      if (active.current) {
        setUpload(false);
        setUncertain(false);
        changed();
      }
    } catch (e) {
      if (active.current) {
        setUncertain(clinical.isClinicalSaveUncertain(e));
        report(e);
        if (saved) changed();
      }
    } finally {
      busyRef.current = false;
      if (active.current) setBusy(false);
    }
  };
  const update = async (input: {
    fileName?: string;
    archived?: boolean;
    metadata?: clinical.DocumentMetadata;
  }) => {
    if (!selected || busyRef.current || !writable) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      updateKey.current ??= createSecureRandomUuid();
      const saved = await clinical.updateClinicalDocument(
        selected.id,
        token,
        {
          ...input,
          expectedUpdatedAt: selected.updatedAt,
        },
        updateKey.current,
      );
      updateKey.current = null;
      if (active.current) {
        setUncertain(false);
        setSelected(saved);
        setEditing(false);
        changed();
      }
    } catch (e) {
      if (active.current) {
        const pending = clinical.isClinicalSaveUncertain(e);
        setUncertain(pending);
        if (!pending) updateKey.current = null;
        report(e);
      }
    } finally {
      busyRef.current = false;
      if (active.current) setBusy(false);
    }
  };
  return (
    <View style={pd.stack}>
      {compact && detail ? (
        <Button size="small" variant="outline" onPress={() => setDetail(false)}>
          ← Todos los documentos
        </Button>
      ) : null}
      <LoadState
        error={error}
        onRetry={() => setRevision((value) => value + 1)}
      />
      <View style={[pd.columns, compact && { flexDirection: "column" }]}>
        {!compact || !detail ? (
          <View style={[pd.column, compact && pd.compactColumn]}>
            <Panel
              title="Documentación clínica"
              icon="folder-open-outline"
              action={
                writable ? (
                  <Button
                    size="small"
                    onPress={() => {
                      if (!files.length) {
                        setTarget({});
                        setMetadata({
                          classification: "OTHER",
                          description: "",
                        });
                      }
                      setUpload(true);
                    }}
                  >
                    + Subir documento
                  </Button>
                ) : undefined
              }
            >
              <Input
                accessibilityLabel="Buscar documentos clínicos"
                placeholder="Buscar por nombre o descripción…"
                value={query.search || ""}
                onChangeText={(search) => filter({ search })}
              />
              <ClinicalDocumentFilters
                query={query}
                onChange={filter}
                authors={page?.filters.authors || []}
                classifications={classifications}
              />
              <View style={pd.filters}>
                <Button
                  size="small"
                  variant="outline"
                  onPress={() => filter({ archived: !query.archived })}
                >
                  {query.archived ? "Ver activos" : "Ver archivados"}
                </Button>
                {query.documentId ? (
                  <Button
                    size="small"
                    variant="outline"
                    onPress={() => filter({ documentId: "" })}
                  >
                    Ver todos
                  </Button>
                ) : null}
              </View>
              <LoadState loading={loading} />
              {page?.items.map((row) => (
                <AnimatedPressable
                  key={row.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: row.id === selected?.id }}
                  hoverLift={false}
                  onPress={() => {
                    setSelected(row);
                    setDetail(true);
                  }}
                  style={[
                    pd.row,
                    {
                      borderBottomColor: theme.borderLight,
                      backgroundColor:
                        row.id === selected?.id
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
                      numberOfLines={2}
                    >
                      {row.fileName}
                    </Text>
                    <Badge>
                      {row.mimeType === "application/pdf"
                        ? "PDF"
                        : row.mimeType.startsWith("image/")
                          ? "IMG"
                          : "DOCX"}
                    </Badge>
                  </View>
                  <Copy muted>
                    {patientDate(row.uploadedAt)} ·{" "}
                    {row.authorName || "Autor no registrado"}
                  </Copy>
                </AnimatedPressable>
              ))}
              {!loading && !page?.items.length ? (
                <Copy muted>
                  No hay documentos que coincidan con estos filtros.
                </Copy>
              ) : null}
              <PatientPagination
                page={cursors.length}
                hasNext={Boolean(page?.pageInfo.hasMore)}
                loading={loading}
                summary={
                  page
                    ? `${page.pageInfo.total} ${page.pageInfo.total === 1 ? "documento" : "documentos"}`
                    : undefined
                }
                onPrevious={() => {
                  const next = cursors.slice(0, -1);
                  setCursors(next);
                  setQuery((current) => ({
                    ...current,
                    cursor: next[next.length - 1],
                  }));
                }}
                onNext={() => {
                  const cursor = page?.pageInfo.nextCursor || undefined;
                  setCursors((current) => [...current, cursor]);
                  setQuery((current) => ({ ...current, cursor }));
                }}
              />
            </Panel>
          </View>
        ) : null}
        {(!compact || detail) && selected ? (
          <View style={[pd.column, compact && pd.compactColumn]}>
            <Panel
              title={selected.fileName}
              action={
                writable && selected.category !== "CONSENT_EVIDENCE" && selected.classification !== "TREATMENT_CONSENT" ? (
                  <Button
                    size="small"
                    variant="outline"
                    onPress={() => {
                      updateKey.current = null;
                      setName(selected.fileName);
                      setMetadata({
                        classification: selected.classification || "OTHER",
                        description: selected.description || "",
                      });
                      setEditing(true);
                    }}
                  >
                    Editar
                  </Button>
                ) : undefined
              }
            >
              <Badge>
                {selected.category === "CONSENT_EVIDENCE"
                  ? "Autorización HERA histórica"
                  : classifications.find(
                      (row) => row.value === selected.classification,
                    )?.label || "Documento clínico"}
              </Badge>
              <ClinicalDocumentPreview
                key={selected.id}
                document={selected}
                token={token}
                onError={report}
              />
              <Field
                label="Tipo"
                value={
                  selected.mimeType === "application/pdf"
                    ? "PDF"
                    : selected.mimeType.startsWith("image/")
                      ? "Imagen"
                      : "DOCX"
                }
              />
              <Field
                label="Tamaño"
                value={
                  selected.sizeBytes !== null
                    ? `${Math.ceil(selected.sizeBytes / 1024)} KB`
                    : null
                }
              />
              <Field
                label="Fecha de subida"
                value={patientDate(selected.uploadedAt, true)}
              />
              <Field label="Subido por" value={selected.authorName} />
              <Field label="Descripción" value={selected.description} />
              <Button
                size="small"
                variant="outline"
                disabled={busy}
                onPress={() =>
                  void clinical
                    .openClinicalDocument(
                      selected.id,
                      selected.fileName,
                      selected.mimeType,
                      token,
                      "download",
                    )
                    .catch(report)
                }
              >
                Descargar documento
              </Button>
              {selected.noteId ? (
                <Button
                  size="small"
                  variant="outline"
                  onPress={() => onParent("NOTE", selected.noteId!)}
                >
                  Abrir nota vinculada
                </Button>
              ) : selected.historyEntryId ? (
                <Button
                  size="small"
                  variant="outline"
                  onPress={() => onParent("HISTORY", selected.historyEntryId!)}
                >
                  Abrir entrada de historia
                </Button>
              ) : selected.exerciseId ? (
                <Button
                  size="small"
                  variant="outline"
                  onPress={() => onParent("EXERCISE", selected.exerciseId!)}
                >
                  Abrir ejercicio vinculado
                </Button>
              ) : null}
              {selected.classification === "TREATMENT_CONSENT" && onConsent ? <Button variant="outline" onPress={onConsent}>Gestionar evidencia de consentimiento</Button> : null}
              {writable && selected.category !== "CONSENT_EVIDENCE" && selected.classification !== "TREATMENT_CONSENT" ? (
                <Button
                  size="small"
                  variant="outline"
                  disabled={busy}
                  onPress={() =>
                    void update({ archived: !selected.archivedAt })
                  }
                >
                  {selected.archivedAt
                    ? "Restaurar documento"
                    : "Archivar documento"}
                </Button>
              ) : null}
            </Panel>
          </View>
        ) : null}
      </View>
      <DetailDialog
        title={editing ? "Editar documento" : "Subir documentación clínica"}
        visible={upload || editing}
        busy={busy}
        onClose={() => {
          setUpload(false);
          setEditing(false);
          if (!uncertain) {
            releaseClinicalAssets(files);
            setFiles([]);
          }
        }}
        footer={
          <>
            <Button
              variant="outline"
              disabled={busy}
              onPress={() => {
                setUpload(false);
                setEditing(false);
                if (!uncertain) {
                  releaseClinicalAssets(files);
                  setFiles([]);
                }
              }}
            >
              Cancelar
            </Button>{" "}
            <Button
              loading={busy}
              disabled={editing ? !name.trim() : !files.length}
              onPress={() =>
                void (editing
                  ? update({ fileName: name, metadata })
                  : uploadFiles())
              }
            >
              {editing
                ? uncertain
                  ? "Comprobar y reintentar cambios"
                  : "Guardar cambios"
                : uncertain
                  ? "Comprobar y reintentar subida"
                  : "Subir documentos"}
            </Button>
          </>
        }
      >
        {editing ? (
          <View style={{ gap: 5 }}>
            <Copy>Nombre del documento</Copy>
            <Input
              value={name}
              accessibilityLabel="Nombre del documento"
              maxLength={200}
              onChangeText={setName}
              editable={!busy && !uncertain}
            />
          </View>
        ) : (
          <Copy muted>
            {Object.keys(target).some((key) => key !== "id")
              ? "El archivo quedará vinculado al contenido clínico seleccionado. "
              : ""}
            {metadata.classification === "TREATMENT_CONSENT"
              ? "PDF firmado · Hasta 15 MB por archivo."
              : "PDF, DOCX e imágenes · Hasta 15 MB por archivo."}
          </Copy>
        )}
        <Copy>Categoría clínica</Copy>
        <SimpleDropdown
          compact
          highlightSelection={false}
          presentation="portal"
          keyboardNavigation
          value={metadata.classification}
          accessibilityLabel="Categoría clínica del documento"
          disabled={busy || uncertain || files.length > 0}
          onSelect={(value) => {
            const item = classifications.find((row) => row.value === value);
            if (item)
              setMetadata((current) => ({
                ...current,
                classification:
                  value === "REPORT"
                    ? "REPORT"
                    : value === "ASSESSMENT"
                      ? "ASSESSMENT"
                      : value === "TREATMENT"
                        ? "TREATMENT"
                        : value === "THERAPEUTIC_MATERIAL"
                          ? "THERAPEUTIC_MATERIAL"
                          : value === "TREATMENT_CONSENT"
                            ? "TREATMENT_CONSENT"
                            : "OTHER",
              }));
          }}
          options={classifications.filter(item => item.value !== "TREATMENT_CONSENT")}
        />
        <Copy>Descripción · Opcional</Copy>
        <Input
          multiline
          accessibilityLabel="Descripción del documento"
          placeholder="Descripción (opcional)"
          value={metadata.description}
          maxLength={4000}
          editable={!busy && !uncertain && !files.length}
          onChangeText={(description) =>
            setMetadata((current) => ({ ...current, description }))
          }
        />
        {!editing ? (
          <>
            <Copy muted>
              Completa la categoría y la descripción antes de seleccionar los
              archivos. Para cambiarlas después, retira los archivos pendientes.
            </Copy>
            <Button
              variant="outline"
              disabled={busy || uncertain}
              onPress={() => void pick()}
            >
              Seleccionar archivos
            </Button>
            {files.map((file, index) => (
              <View key={`${file.uri}:${index}`} style={pd.toolbar}>
                <Copy>{file.fileName || file.name}</Copy>
                <Button
                  size="small"
                  variant="outline"
                  disabled={busy || uncertain}
                  onPress={() => {
                    releaseClinicalAssets([file]);
                    setFiles((current) =>
                      current.filter((value) => value !== file),
                    );
                  }}
                >
                  Quitar
                </Button>
              </View>
            ))}
          </>
        ) : null}
        <LoadState error={error} />
      </DetailDialog>
    </View>
  );
}
