import React, { useEffect, useRef, useState } from "react";
import { View, useWindowDimensions } from "react-native";
import { Button } from "../../common";
import type { Client } from "../../../services/professionalService";
import {
  savePatientProfile,
  type PatientProfile,
  type PatientProfileInput,
} from "../../../services/patientDetailService";
import { getErrorMessage } from "../../../constants/errors";
import {
  Copy,
  DetailDialog,
  Field,
  Input,
  LoadState,
} from "./PatientDetailPrimitives";
import { PatientDateField } from "./PatientDateField";
import { civilDateLabel, patientCountry } from "./patientPresentation";

const fields = [
  ["firstName", "Nombre", 120],
  ["lastName", "Apellidos", 160],
  ["email", "Email", 320],
  ["phone", "Teléfono", 60],
  ["birthDate", "Fecha de nacimiento", 10],
  ["occupation", "Profesión", 150],
  ["address", "Dirección", 300],
  ["postalCode", "Código postal", 30],
  ["city", "Ciudad", 100],
  ["country", "País", 100],
  ["emergencyName", "Contacto de emergencia", 200],
  ["emergencyPhone", "Teléfono de emergencia", 60],
] as const;
export function PatientPersonalEditor({
  client,
  profile,
  visible,
  onClose,
  onSaved,
}: {
  client: Client;
  profile: PatientProfile | undefined;
  visible: boolean;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const compact = useWindowDimensions().width < 720;
  const [draft, setDraft] = useState<PatientProfile | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const initialized = useRef(false);
  useEffect(() => {
    if (!visible) {
      initialized.current = false;
      setDraft(null);
      return;
    }
    if (profile && !initialized.current) {
      initialized.current = true;
      setDraft({
        ...profile,
        firstName: profile.firstName ?? client.firstName ?? null,
        lastName: profile.lastName ?? client.lastName ?? null,
        email: profile.email ?? client.primaryEmail ?? null,
        phone: profile.phone ?? client.primaryPhone ?? null,
      });
      setError("");
    }
  }, [visible, profile, client]);
  const save = async () => {
    if (!draft || !profile || saving.current) return;
    const input: PatientProfileInput = {};
    for (const [key] of fields) {
      const baseline =
        profile[key] ??
        (key === "email"
          ? client.primaryEmail
          : key === "phone"
            ? client.primaryPhone
            : key === "firstName"
              ? client.firstName
              : key === "lastName"
                ? client.lastName
                : null);
      if (
        profile.editableFields.includes(key) &&
        (draft[key] ?? "") !== (baseline ?? "")
      )
        input[key] = draft[key]?.trim() ?? null;
    }
    if (!Object.keys(input).length) {
      onClose();
      return;
    }
    saving.current = true;
    setBusy(true);
    setError("");
    try {
      await savePatientProfile(client.id, input);
      onClose();
      await onSaved();
    } catch (e) {
      setError(getErrorMessage(e, "No se pudieron guardar los datos."));
    } finally {
      saving.current = false;
      setBusy(false);
    }
  };
  return (
    <DetailDialog
      title="Editar datos personales"
      visible={visible}
      busy={busy}
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" disabled={busy} onPress={onClose}>
            Cancelar
          </Button>
          <Button loading={busy} disabled={!draft} onPress={() => void save()}>
            Guardar datos
          </Button>
        </>
      }
    >
      <Copy muted>
        Los datos gestionados desde una cuenta HERA se muestran como solo
        lectura. El contacto de emergencia pertenece a tu ficha.
      </Copy>
      <LoadState loading={!draft} error={error} />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 14 }}>
        {draft
          ? fields.map(([key, label, maxLength]) => {
              const editable = Boolean(profile?.editableFields.includes(key));
              return (
                <View
                  key={key}
                  style={{
                    flexBasis: compact || key === "address" ? "100%" : "46%",
                    flexGrow: 1,
                    minWidth: 0,
                    gap: 5,
                  }}
                >
                  {!editable ? (
                    <Field
                      label={label}
                      value={
                        key === "birthDate" && draft[key]
                          ? civilDateLabel(draft[key])
                          : key === "country"
                            ? patientCountry(draft[key])
                            : draft[key]
                      }
                    />
                  ) : key === "birthDate" ? (
                    <>
                      <PatientDateField
                        label={label}
                        value={draft.birthDate || ""}
                        birth
                        disabled={busy}
                        onChange={(value) =>
                          setDraft((current) =>
                            current ? { ...current, birthDate: value } : null,
                          )
                        }
                      />
                      {draft.birthDate ? (
                        <Button
                          size="small"
                          variant="outline"
                          disabled={busy}
                          onPress={() =>
                            setDraft((current) =>
                              current ? { ...current, birthDate: null } : null,
                            )
                          }
                        >
                          Quitar fecha
                        </Button>
                      ) : null}
                    </>
                  ) : (
                    <>
                      <Copy>{label}</Copy>
                      <Input
                        accessibilityLabel={label}
                        value={
                          (key === "country"
                            ? patientCountry(draft[key])
                            : draft[key]) || ""
                        }
                        maxLength={maxLength}
                        keyboardType={
                          key === "phone" || key === "emergencyPhone"
                            ? "phone-pad"
                            : key === "email"
                              ? "email-address"
                              : "default"
                        }
                        autoCapitalize={key === "email" ? "none" : "sentences"}
                        editable={!busy}
                        onChangeText={(value) =>
                          setDraft((current) =>
                            current ? { ...current, [key]: value } : null,
                          )
                        }
                      />
                    </>
                  )}
                </View>
              );
            })
          : null}
      </View>
    </DetailDialog>
  );
}
