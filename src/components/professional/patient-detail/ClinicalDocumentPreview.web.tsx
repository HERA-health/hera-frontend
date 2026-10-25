import React, { useEffect, useState } from "react";
import { View, Image } from "react-native";
import { api } from "../../../services/api";
import { beginClinicalDownload } from "../../../services/clinicalDownloads";
import {
  ClinicalRequestError,
  type ClinicalDocument,
} from "../../../services/clinicalService";
import { LoadState, Copy } from "./PatientDetailPrimitives";

export function ClinicalDocumentPreview({
  document,
  token,
  onError,
}: {
  document: ClinicalDocument;
  token: string;
  onError: (error: unknown) => void;
}) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const compatible =
    document.mimeType === "application/pdf" ||
    document.mimeType.startsWith("image/");
  useEffect(() => {
    if (!compatible) return;
    let active = true;
    let objectUrl = "";
    setUrl("");
    setError("");
    const operation = beginClinicalDownload(token);
    void api
      .get<ArrayBuffer>(`/clinical/documents/${document.id}/download`, {
        headers: { "x-clinical-access-token": token },
        responseType: "arraybuffer",
        signal: operation.signal,
      })
      .then((response) => {
        if (!active || !operation.isActive()) return;
        objectUrl = URL.createObjectURL(
          new Blob([response.data], { type: document.mimeType }),
        );
        setUrl(objectUrl);
      })
      .catch((failure) => {
        if (active && operation.isActive()) {
          const cause = new ClinicalRequestError(
            failure,
            "No se pudo cargar la vista previa.",
          );
          setError(cause.message);
          onError(cause);
        }
      })
      .finally(() => operation.release());
    return () => {
      active = false;
      operation.release();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [document.id, document.mimeType, token, compatible, revision, onError]);
  if (!compatible)
    return (
      <Copy muted>
        Vista previa no disponible para este formato. Puedes descargar el
        archivo para abrirlo.
      </Copy>
    );
  return (
    <View style={{ minHeight: 360, borderRadius: 10, overflow: "hidden" }}>
      <LoadState
        loading={!url && !error}
        error={error}
        onRetry={() => setRevision((value) => value + 1)}
      />
      {url ? (
        document.mimeType === "application/pdf" ? (
          <iframe
            title={`Vista previa de ${document.fileName}`}
            src={url}
            referrerPolicy="no-referrer"
            style={{ width: "100%", height: 440, border: 0 }}
          />
        ) : (
          <Image
            accessibilityLabel={document.fileName}
            source={{ uri: url }}
            resizeMode="contain"
            style={{ width: "100%", height: 360 }}
          />
        )
      ) : null}
    </View>
  );
}
