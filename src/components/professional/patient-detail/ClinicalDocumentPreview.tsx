import React, { useEffect, useState } from "react";
import { Image, View } from "react-native";
import type { File } from "expo-file-system";
import { Button } from "../../common";
import { api } from "../../../services/api";
import { beginClinicalDownload } from "../../../services/clinicalDownloads";
import {
  ClinicalRequestError,
  openClinicalDocument,
  type ClinicalDocument,
} from "../../../services/clinicalService";
import { createClinicalPreview, releaseClinicalPreview } from "../../../services/clinicalPreviewCache";
import { Copy, LoadState } from "./PatientDetailPrimitives";

export function ClinicalDocumentPreview({
  document,
  token,
  onError,
}: {
  document: ClinicalDocument;
  token: string;
  onError: (error: unknown) => void;
}) {
  const [uri, setUri] = useState("");
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!document.mimeType.startsWith("image/")) return;
    let active = true;
    let file: File | undefined;
    const operation = beginClinicalDownload(token);
    setUri("");
    setError("");
    void api
      .get<ArrayBuffer>(`/clinical/documents/${document.id}/download`, {
        headers: { "x-clinical-access-token": token },
        responseType: "arraybuffer",
        signal: operation.signal,
        timeout: 30000,
      })
      .then((response) => {
        if (!active || !operation.isActive()) return;
        file = createClinicalPreview(new Uint8Array(response.data));
        setUri(file.uri);
      })
      .catch((cause) => {
        if (active && operation.isActive()) {
          const failure = new ClinicalRequestError(
            cause,
            "No se pudo cargar la imagen.",
          );
          setError(failure.message);
          onError(failure);
        }
      })
      .finally(() => operation.release());
    return () => {
      active = false;
      operation.release();
      if (file) releaseClinicalPreview(file);
    };
  }, [document.id, document.mimeType, token, onError, revision]);
  return (
    <View style={{ gap: 12 }}>
      {document.mimeType.startsWith("image/") ? (
        <>
          <LoadState
            loading={!uri && !error}
            error={error}
            onRetry={() => setRevision((value) => value + 1)}
          />
          {uri ? (
            <Image
              source={{ uri }}
              accessibilityLabel={document.fileName}
              resizeMode="contain"
              style={{ width: "100%", height: 320 }}
            />
          ) : null}
        </>
      ) : (
        <Copy muted>
          {document.mimeType === "application/pdf"
            ? "Abre el PDF en el visor disponible de tu dispositivo."
            : "Descarga el archivo para abrirlo en una aplicación compatible."}
        </Copy>
      )}
      <Button
        variant="outline"
        size="small"
        onPress={() =>
          void openClinicalDocument(
            document.id,
            document.fileName,
            document.mimeType,
            token,
          ).catch(onError)
        }
      >
        Abrir archivo
      </Button>
    </View>
  );
}
