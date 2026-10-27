import React, { useEffect, useRef, useState } from "react";
import { View, Text, useWindowDimensions } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Button, AnimatedPressable } from "../../common";
import { useTheme } from "../../../contexts/ThemeContext";
import type { Client } from "../../../services/professionalService";
import type { PatientSummary } from "../../../services/patientDetailService";
import {
  Panel,
  Field,
  Copy,
  Badge,
  LoadState,
  pd,
  patientDate,
} from "./PatientDetailPrimitives";
import { PatientPersonalEditor } from "./PatientPersonalEditor";
import {
  civilDate,
  civilDateLabel,
  patientCountry,
} from "./patientPresentation";

export function PatientGeneralPanel({
  client,
  summary,
  loading,
  error,
  onRetry,
  onRefresh,
  onEditBilling,
  onConsent,
  onSession,
  onPayments,
  editRequest,
  onPersonalSaved,
  onActivity,
  onEditRequestConsumed,
}: {
  client: Client;
  summary: PatientSummary | null;
  loading: boolean;
  error: string;
  onRetry: () => void;
  onRefresh: () => Promise<void>;
  onEditBilling: () => void;
  onConsent: () => void;
  onSession: (id: string) => void;
  onPayments: () => void;
  editRequest?: number;
  onEditRequestConsumed?: (id: number) => void;
  onPersonalSaved?: () => Promise<void>;
  onActivity?: (
    item: NonNullable<PatientSummary["recentActivity"]>[number],
  ) => void;
}) {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const [editing, setEditing] = useState(false);
  const handledRequest = useRef<number | undefined>(undefined);
  const profile = summary?.profile;
  useEffect(() => {
    if (editRequest && profile && editRequest !== handledRequest.current) {
      handledRequest.current = editRequest;
      setEditing(true);
      onEditRequestConsumed?.(editRequest);
    }
  }, [editRequest, profile, onEditRequestConsumed]);
  const canEditPersonalData = Boolean(
    profile?.editableFields.includes("birthDate"),
  );
  const unavailable = loading ? "Consultando…" : "No disponible";
  const birth = profile?.birthDate;
  const age = birth
    ? (() => {
        const d = civilDate(birth);
        const now = new Date();
        let age = now.getFullYear() - d.getFullYear();
        if (
          now.getMonth() < d.getMonth() ||
          (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())
        )
          age--;
        return age >= 0 ? age : null;
      })()
    : null;
  const missing = [
    (
      client.source === "MANAGED" && client.accountLinkStatus !== "CONFIRMED"
        ? !client.firstName?.trim()
        : !client.user.name?.trim()
    )
      ? "nombre"
      : null,
    summary && !profile?.taxId ? "identificación fiscal" : null,
    !client.primaryEmail ? "email" : null,
  ].filter(Boolean);
  return (
    <View style={pd.stack}>
      <LoadState loading={loading && !error} error={error} onRetry={onRetry} />
      <View style={[pd.columns, width < 1180 && { flexDirection: "column" }]}>
        <View style={[pd.column, width < 1180 && pd.compactColumn]}>
          <Panel
            title="Datos personales"
            icon="person-outline"
            action={
              <Button
                size="small"
                variant="outline"
                disabled={!profile || Boolean(client.archivedAt)}
                onPress={() => setEditing(true)}
              >
                Editar
              </Button>
            }
          >
            <Field
              label="Nombre completo"
              value={client.displayName || client.user.name}
            />
            <Field
              label="Fecha de nacimiento"
              value={
                birth
                  ? `${civilDateLabel(birth)}${age !== null ? ` (${age} años)` : ""}`
                  : profile
                    ? null
                    : unavailable
              }
            />
            <Field
              label="DNI / NIE o NIF fiscal"
              value={profile ? profile.taxId : unavailable}
            />
            <Copy muted>
              Identificación del perfil de facturación; puede corresponder al
              pagador.
            </Copy>
            <Field label="Correo electrónico" value={client.primaryEmail} />
            <Field label="Teléfono" value={client.primaryPhone} />
            <Field
              label="Dirección"
              value={
                profile
                  ? [
                      profile?.address,
                      profile?.postalCode,
                      profile?.city,
                      patientCountry(profile?.country),
                    ]
                      .filter(Boolean)
                      .join(", ")
                  : unavailable
              }
            />
            <Field
              label="Profesión"
              value={profile ? profile.occupation : unavailable}
            />
            <Field
              label="Contacto de emergencia"
              value={
                profile
                  ? [profile.emergencyName, profile.emergencyPhone]
                      .filter(Boolean)
                      .join(" · ")
                  : unavailable
              }
            />
            {profile ? (
              <Copy muted>
                {canEditPersonalData
                  ? "Puedes completar aquí nacimiento, profesión, domicilio y contacto de emergencia."
                  : "Nacimiento, profesión y domicilio los actualiza el paciente desde su perfil de HERA. Aquí puedes registrar su contacto de emergencia."}
              </Copy>
            ) : null}
            {missing.length ? (
              <Copy muted>Pendiente de completar: {missing.join(", ")}.</Copy>
            ) : null}
          </Panel>
          <Panel
            title="Dirección de facturación"
            icon="home-outline"
            action={
              <Button
                size="small"
                variant="outline"
                disabled={Boolean(client.archivedAt)}
                onPress={onEditBilling}
              >
                Editar
              </Button>
            }
          >
            <Field
              label="Nombre / Razón social"
              value={client.billingFullName}
            />
            <Field label="Identificación fiscal" value={client.billingTaxId} />
            <Field
              label="Dirección fiscal"
              value={[
                client.billingAddress,
                client.billingPostalCode,
                client.billingCity,
                patientCountry(client.billingCountry),
              ]
                .filter(Boolean)
                .join(", ")}
            />
            <Field label="Email de contacto" value={client.primaryEmail} />
          </Panel>
        </View>
        <View style={[pd.column, width < 1180 && pd.compactColumn]}>
          <Panel title="Estado y configuración" icon="shield-checkmark-outline">
            <Field label="Estado del paciente">
              <Badge tone={client.archivedAt ? "warning" : "success"}>
                {client.archivedAt
                  ? "Archivado"
                  : summary?.closedAt
                    ? "Proceso cerrado"
                    : "En seguimiento"}
              </Badge>
            </Field>
            <Field label="Consentimiento informado">
              <Badge tone={summary?.informedConsent?.status === 'SIGNED' ? 'success' : 'warning'}>
                {summary?.informedConsent ? { PENDING: 'Pendiente', SENT: 'Enviado', SIGNED: 'Firmado', WITHDRAWN: 'Retirado' }[summary.informedConsent.status] : 'No disponible'}
              </Badge>
            </Field>
            {summary?.informedConsent?.recordedAt ? <Field
              label={summary.informedConsent.method === 'UPLOADED_PDF' ? 'PDF aportado por el profesional' : 'Aceptación digital'}
              value={`Registrado el ${patientDate(summary.informedConsent.recordedAt)}`}
            /> : null}
            <Button size="small" variant="outline" onPress={onConsent}>Gestionar consentimiento informado</Button>
            <Field
              label="Procedencia / Origen"
              value={
                summary
                  ? {
                      DIRECTORY: "Directorio HERA",
                      OWN: "Cartera propia",
                      UNDETERMINED: "Sin determinar",
                    }[summary.provenance]
                  : null
              }
            />
            <Field
              label="Profesional responsable"
              value={summary?.professionalName}
            />
          </Panel>
          <Panel title="Actividad reciente" icon="time-outline">
            {!summary ? (
              <Copy muted>{unavailable}</Copy>
            ) : !summary.recentActivity?.length ? (
              <Copy muted>No hay actividad reciente registrada.</Copy>
            ) : (
              summary.recentActivity.map((item) => (
                <AnimatedPressable
                  key={item.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Ver ${item.title}`}
                  hoverLift={false}
                  onPress={() =>
                    onActivity
                      ? onActivity(item)
                      : item.target === "SESSION" && item.targetId
                        ? onSession(item.targetId)
                        : onPayments()
                  }
                  style={[
                    pd.row,
                    {
                      borderBottomColor: theme.borderLight,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                    },
                  ]}
                >
                  <Ionicons
                    name={
                      item.kind === "SESSION"
                        ? "calendar-outline"
                        : item.kind === "REFUND"
                          ? "return-down-back-outline"
                          : "wallet-outline"
                    }
                    size={19}
                    color={theme.primary}
                  />
                  <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                    <Text
                      style={{
                        fontFamily: theme.fontSansSemiBold,
                        color: theme.textPrimary,
                        fontSize: 13,
                      }}
                    >
                      {item.title}
                    </Text>
                    {item.detail ? <Copy muted>{item.detail}</Copy> : null}
                    <Copy muted>{patientDate(item.date, true)}</Copy>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={theme.textSecondary}
                  />
                </AnimatedPressable>
              ))
            )}
          </Panel>
        </View>
      </View>
      <PatientPersonalEditor
        client={client}
        profile={profile}
        visible={editing}
        onClose={() => setEditing(false)}
        onSaved={onPersonalSaved || onRefresh}
      />
    </View>
  );
}
