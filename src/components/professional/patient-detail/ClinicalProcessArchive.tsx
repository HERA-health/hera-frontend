import React, { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { Button } from "../../common";
import * as clinical from "../../../services/clinicalService";
import { getErrorMessage } from "../../../constants/errors";
import { Copy, Field, Panel, patientDate, pd } from "./PatientDetailPrimitives";

const eventLabels: Record<clinical.ClinicalConsentEvent["eventType"], string> = {
  REQUESTED: "Autorización solicitada",
  DELIVERY_UNKNOWN: "Entrega sin confirmar",
  ACCEPTED: "Autorización aceptada",
  REJECTED: "Solicitud rechazada",
  CANCELLED: "Solicitud cancelada",
  EXPIRED: "Solicitud caducada",
  REVOKED: "Autorización retirada",
  CONSENT_RECORDED: "Autorización registrada",
};
const methodLabels: Record<clinical.ClinicalConsentEvent["method"], string> = {
  SPECIALIST_ATTESTATION: "Registro del profesional",
  DIGITAL_SIGNATURE: "Aceptación digital",
  EMAIL_LINK_OTP: "Aceptación mediante código por correo",
};

/** Read-only evidence from the retired authorization flow; never a treatment consent. */
export function ClinicalProcessArchive({ clientId, token, record, onError }: {
  clientId: string;
  token: string;
  record: clinical.ClinicalRecord;
  onError: (error: unknown) => void;
}) {
  const [visible, setVisible] = useState(false);
  const [events, setEvents] = useState(record.consentEvents);
  const [page, setPage] = useState(record.pagination.consentEvents);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const context = useRef({ busy: false });
  useEffect(() => {
    context.current = { busy: false };
    setEvents(record.consentEvents);
    setPage(record.pagination.consentEvents);
    setVisible(false);
    setBusy(false);
    setError("");
    return () => { context.current = { busy: false }; };
  }, [clientId, token, record]);

  const loadMore = async () => {
    const current = context.current;
    if (current.busy || !page.hasMore || !page.nextCursor) return;
    current.busy = true;
    setBusy(true);
    setError("");
    try {
      const next = await clinical.listClinicalConsentEvents(clientId, token, { cursor: page.nextCursor });
      if (current !== context.current) return;
      setEvents((previous) => [...new Map([...previous, ...next.items].map((event) => [event.id, event])).values()]);
      setPage(next.pageInfo);
    } catch (e) {
      if (current !== context.current) return;
      setError(getErrorMessage(e, "No se pudo cargar el historial anterior."));
      onError(e);
    } finally {
      if (current === context.current) {
        current.busy = false;
        setBusy(false);
      }
    }
  };

  return <Panel title="Conservación del expediente" icon="archive-outline">
    <Field label="Proceso asistencial" value={record.closedAt ? `Cerrado el ${patientDate(record.closedAt)}` : "Abierto"} />
    <Field label="Conservación mínima hasta" value={record.retentionUntil ? patientDate(record.retentionUntil) : record.closedAt ? "Fecha no disponible" : "Se calculará al cerrar el proceso"} />
    {record.eligibleForManualReview ? <Copy>El expediente ha alcanzado la fecha de revisión manual de conservación.</Copy> : null}
    {events.length || page.total ? <>
      <Button size="small" variant="outline" onPress={() => setVisible((value) => !value)}>
        {visible ? "Ocultar autorizaciones anteriores" : "Consultar autorizaciones anteriores"}
      </Button>
      {visible ? <View style={pd.stack}>
        <Copy muted>Historial de la antigua autorización HERA, conservado solo para consulta. No acredita el consentimiento informado del tratamiento.</Copy>
        {events.map((event) => <View key={event.id}>
          <Copy>{eventLabels[event.eventType]} · {patientDate(event.createdAt, true)}</Copy>
          <Copy muted>Versión {event.version} · {methodLabels[event.method]}{event.requestKind === "WITHDRAWAL" ? " · Solicitud de retirada" : ""}</Copy>
        </View>)}
        {error ? <Copy>{error}</Copy> : null}
        {page.hasMore ? <Button size="small" variant="outline" loading={busy} disabled={busy} onPress={() => void loadMore()}>Ver más autorizaciones anteriores</Button> : null}
      </View> : null}
    </> : null}
  </Panel>;
}
