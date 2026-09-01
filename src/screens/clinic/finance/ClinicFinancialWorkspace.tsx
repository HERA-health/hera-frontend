import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Button } from "../../../components/common/Button";
import { Input } from "../../../components/common/Input";
import { SimpleDropdown } from "../../../components/common/SimpleDropdown";
import { useAppAlert } from "../../../components/common";
import { MadridDateField } from "../../../components/finance";
import { borderRadius, spacing, typography } from "../../../constants/colors";
import type { Theme } from "../../../constants/theme";
import { useTheme } from "../../../contexts/ThemeContext";
import type {
  ClinicAgreementScope,
  ClinicMembershipRole,
  ClinicPaymentMethod,
} from "../../../services/clinicService";
import {
  getMadridDateKey,
  parseMadridDateTime,
} from "../../../utils/madridTime";
import { normalizeSingleLine, sanitizeMoneyInput, sanitizePercentageInput } from "../../../utils/financialFormValidation";
import { useClinicFinancialWorkspace } from "./useClinicFinancialWorkspace";

export type ClinicFinancialSection =
  "overview" | "agreements" | "patient-documents" | "periods" | "ledger";

interface Props {
  clinicId: string;
  role: ClinicMembershipRole;
  section: ClinicFinancialSection;
}

const euro = (cents: number | null | undefined): string =>
  ((cents ?? 0) / 100).toLocaleString("es-ES", {
    style: "currency",
    currency: "EUR",
  });

const shortDate = (value: string | null): string =>
  value
    ? new Date(value).toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "Pendiente";

const eventLabels: Record<string, string> = {
  SESSION_GENERATED: "Sesión generada",
  PROFESSIONAL_AMOUNT_LIQUIDABLE: "Importe listo para el cierre",
  PATIENT_COLLECTION_RECORDED: "Cobro registrado",
  PATIENT_REFUND_RECORDED: "Devolución registrada",
  PERIOD_CLOSED: "Periodo cerrado",
  PROFESSIONAL_INVOICE_ISSUED: "Factura profesional emitida",
  PROFESSIONAL_PAYMENT_RECORDED: "Transferencia registrada",
  ADJUSTMENT_RECORDED: "Ajuste",
  RECTIFICATION_ISSUED: "Rectificativa emitida",
};

const productLabels: Record<string, string> = {
  DRAFT: "Borrador",
  PENDING_ACCEPTANCE: "Pendiente de aceptación",
  ACTIVE: "Activo",
  SUPERSEDED: "Sustituido",
  ENDED: "Finalizado",
  ISSUED: "Emitida",
  RECTIFIED: "Rectificada",
  DISCARDED: "Borrador descartado",
  NOT_SENT: "No entregada",
  PENDING: "Pendiente",
  SENT: "Entregada",
  FAILED: "Entrega fallida",
  ACCEPTED: "Aceptada",
  CORRECTION_REQUESTED: "Corrección solicitada",
  OPEN: "Abierto",
  REVIEW_REQUIRED: "Revisión necesaria",
  CLOSED: "Cerrado",
  NO_PAYMENT_DUE: "Sin pago necesario",
  CREDIT_CARRY_FORWARD: "Crédito para el siguiente cierre",
  REPLACEMENT_PENDING: "Sustitutiva pendiente",
};

const productLabel = (value: string | null | undefined): string =>
  value
    ? (productLabels[value] ?? "Pendiente")
    : "—";

const scopeLabels: Record<string, string> = {
  CLINIC: "Toda la clínica",
  SPECIALIST: "Un profesional",
  SPECIALIST_SERVICE: "Un profesional y servicio",
  SPECIALIST_PATIENT: "Un profesional y paciente",
};

const blockedReasonLabels: Record<string, string> = {
  NO_VALID_AGREEMENT: "no existe un acuerdo válido para la fecha de la sesión",
  AGREEMENT_NOT_ACCEPTED: "el acuerdo todavía no ha sido aceptado",
  FIXED_AMOUNT_EXCEEDS_BASE: "el importe fijo supera el precio de la sesión",
  MISSING_PRICE: "falta el precio de la sesión",
  INVALID_CONFIGURATION: "la configuración del reparto no es válida",
};

export function ClinicFinancialWorkspace({
  clinicId,
  role,
  section,
}: Props): React.ReactElement {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const compact = width < 760;
  const styles = useMemo(() => createStyles(theme, compact), [compact, theme]);
  const controller = useClinicFinancialWorkspace(clinicId, role, section);

  if (controller.loading) {
    return (
      <View style={styles.state}>
        <ActivityIndicator color={theme.primary} />
        <Text style={styles.stateText}>
          Cargando información…
        </Text>
      </View>
    );
  }
  if (!controller.overview) {
    return (
      <View style={styles.state}>
        <Ionicons name="cloud-offline-outline" size={28} color={theme.error} />
        <Text style={styles.stateTitle}>No se pudo abrir la facturación</Text>
        <Text style={styles.stateText}>{controller.error}</Text>
        <Button variant="outline" onPress={() => void controller.retry()}>
          Reintentar
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {controller.error ? (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle-outline" size={18} color={theme.error} />
          <Text style={styles.errorText}>{controller.error}</Text>
        </View>
      ) : null}

      {section === "overview" ? (
        <Overview controller={controller} styles={styles} />
      ) : null}
      {section === "agreements" ? (
        <Agreements controller={controller} styles={styles} />
      ) : null}
      {section === "patient-documents" ? (
        <Documents controller={controller} styles={styles} />
      ) : null}
      {section === "periods" ? (
        <Periods controller={controller} styles={styles} />
      ) : null}
      {section === "ledger" ? (
        <Ledger controller={controller} styles={styles} />
      ) : null}
    </View>
  );
}

type Controller = ReturnType<typeof useClinicFinancialWorkspace>;
type Styles = ReturnType<typeof createStyles>;

function Overview({
  controller,
  styles,
}: {
  controller: Controller;
  styles: Styles;
}) {
  const totals = controller.overview!.totals;
  return (
    <View style={styles.stack}>
      <View style={styles.metricGrid}>
        <Metric
          label="Generado para profesionales"
          value={euro(totals.generated.amountCents)}
          hint="Parte profesional de sesiones completadas"
          styles={styles}
        />
        <Metric
          label="Listo para el próximo cierre"
          value={euro(totals.liquidable.amountCents)}
          hint="Listo para un cierre"
          styles={styles}
        />
        <Metric
          label="Bloqueos"
          value={String(totals.blockedSnapshots)}
          hint="Sin acuerdo válido"
          warning={totals.blockedSnapshots > 0}
          styles={styles}
        />
      </View>
      <View style={styles.flowCard}>
        <Text style={styles.cardKicker}>CÓMO FUNCIONA</Text>
        <Text style={styles.cardTitle}>
          De la sesión al pago del profesional
        </Text>
        <View style={styles.flowRow}>
          {[
            "Sesión",
            "Factura al paciente",
            "Cobro externo",
            "Cierre",
            "Factura profesional",
            "Transferencia",
          ].map((label, index) => (
            <React.Fragment key={label}>
              <View style={styles.flowStep}>
                <Text style={styles.flowIndex}>
                  {String(index + 1).padStart(2, "0")}
                </Text>
                <Text style={styles.flowLabel}>{label}</Text>
              </View>
              {index < 5 ? (
                <Ionicons
                  name="arrow-forward"
                  size={14}
                  color={styles.flowArrow.color}
                />
              ) : null}
            </React.Fragment>
          ))}
        </View>
        <Text style={styles.explainer}>
          Los cobros y pagos se registran manualmente. HERA no mueve el dinero.
        </Text>
      </View>
      {totals.blockedSnapshots > 0 ? (
        <View style={styles.blockerCard}>
          <Ionicons
            name="construct-outline"
            size={22}
            color={styles.blockerTitle.color}
          />
          <View style={styles.flex}>
            <Text style={styles.blockerTitle}>
              Hay sesiones que impiden cerrar el mes
            </Text>
            <Text style={styles.blockerText}>
              Revisa los acuerdos pendientes antes de cerrar.
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function Metric({
  label,
  value,
  hint,
  warning,
  styles,
}: {
  label: string;
  value: string;
  hint: string;
  warning?: boolean;
  styles: Styles;
}) {
  return (
    <View style={[styles.metric, warning ? styles.metricWarning : null]}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricHint}>{hint}</Text>
    </View>
  );
}

function Agreements({
  controller,
  styles,
}: {
  controller: Controller;
  styles: Styles;
}) {
  const appAlert = useAppAlert();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [patientQuery, setPatientQuery] = useState("");
  const form = controller.agreementForm;
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    controller.setAgreementForm((current) => ({ ...current, [key]: value }));
  const scopeOptions = [
    { label: "Clínica", value: "CLINIC" },
    { label: "Profesional", value: "SPECIALIST" },
    { label: "Profesional + servicio", value: "SPECIALIST_SERVICE" },
    { label: "Profesional + paciente", value: "SPECIALIST_PATIENT" },
  ] as const;
  const specialistOptions = controller.specialists.map((item) => ({
    label: item.displayName,
    value: item.id,
    subtitle: item.professionalTitle ?? undefined,
  }));
  const serviceOptions = controller.services.map((item) => ({
    label: item.name,
    value: item.id,
    subtitle: `${euro(Math.round(item.price * 100))} · ${item.durationMinutes} min`,
  }));
  const patientOptions = controller.patients.map((item) => ({
    label: item.displayName,
    value: item.id,
  }));
  const examples =
    form.shareMethod === "PERCENTAGE"
      ? `En una sesión de 100 €, el profesional recibe ${euro(Math.round(Number(form.shareValue || 0) * 100))} y la clínica conserva ${euro(10_000 - Math.round(Number(form.shareValue || 0) * 100))}.`
      : `En una sesión de 100 €, el profesional recibe ${euro(Math.round(Number(form.shareValue || 0) * 100))}; si el fijo supera el precio, la sesión quedará bloqueada.`;

  return (
    <View style={styles.stack}>
      <View style={styles.sectionHeading}>
        <View>
          <Text style={styles.cardKicker}>REPARTO CON PROFESIONALES</Text>
          <Text style={styles.sectionTitle}>
            Acuerdos de reparto
          </Text>
        </View>
        <Button
          onPress={() => setWizardOpen((value) => !value)}
          icon={
            <Ionicons
              name={wizardOpen ? "close" : "add"}
              size={17}
              color={styles.buttonIcon.color}
            />
          }
        >
          {wizardOpen ? "Cerrar" : "Crear acuerdo"}
        </Button>
      </View>
      {wizardOpen ? (
        <View style={styles.wizard}>
          <View style={styles.stepRail}>
            {[
              "Alcance",
              "Relación",
              "Reparto",
              "Condición",
              "Vigencia",
              "Revisión",
            ].map((label, index) => (
              <Pressable
                key={label}
                onPress={() => setStep(index)}
                accessibilityRole="tab"
                accessibilityState={{ selected: step === index }}
                style={[styles.step, step === index ? styles.stepActive : null]}
              >
                <Text style={styles.stepNumber}>{index + 1}</Text>
                <Text style={styles.stepText}>{label}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.wizardBody}>
            {step === 0 ? (
              <Field label="¿Dónde se aplica?">
                <SimpleDropdown
                  options={scopeOptions}
                  value={form.scope}
                  onSelect={(value) => set("scope", value)}
                  selectionIndicator="radio"
                  presentation="portal"
                />
                {form.scope !== "CLINIC" ? (
                  <SimpleDropdown
                    options={specialistOptions}
                    value={form.clinicSpecialistId}
                    onSelect={(value) => set("clinicSpecialistId", value)}
                    placeholder="Selecciona profesional"
                    presentation="portal"
                  />
                ) : null}
                {form.scope === "SPECIALIST_SERVICE" ? (
                  <SimpleDropdown
                    options={serviceOptions}
                    value={form.clinicServiceId}
                    onSelect={(value) => set("clinicServiceId", value)}
                    placeholder="Selecciona servicio"
                    presentation="portal"
                  />
                ) : null}
                {form.scope === "SPECIALIST_PATIENT" ? (
                  <View style={styles.stackSmall}>
                    <View style={styles.compactForm}>
                      <Input
                        label="Buscar paciente"
                        value={patientQuery}
                        onChangeText={setPatientQuery}
                        onSubmitEditing={() =>
                          void controller.searchPatients(patientQuery)
                        }
                      />
                      <Button
                        size="small"
                        variant="outline"
                        loading={controller.patientsLoading}
                        onPress={() =>
                          void controller.searchPatients(patientQuery)
                        }
                      >
                        Buscar
                      </Button>
                    </View>
                    <SimpleDropdown
                      options={patientOptions}
                      value={form.clinicPatientId}
                      onSelect={(value) => set("clinicPatientId", value)}
                      placeholder="Selecciona paciente"
                      presentation="portal"
                    />
                    {controller.patientPageInfo.hasMore ? (
                      <Button
                        size="small"
                        variant="ghost"
                        loading={controller.patientsLoading}
                        onPress={() => void controller.loadMorePatients()}
                      >
                        Cargar más resultados
                      </Button>
                    ) : null}
                  </View>
                ) : null}
              </Field>
            ) : null}
            {step === 1 ? (
              <Field label="Relación con la clínica">
                <SimpleDropdown
                  options={[
                    {
                      label: "Colaborador autónomo",
                      value: "SELF_EMPLOYED_COLLABORATOR",
                    },
                    { label: "Relación laboral", value: "EMPLOYEE" },
                  ]}
                  value={form.relationship}
                  onSelect={(value) => set("relationship", value)}
                  selectionIndicator="radio"
                  presentation="portal"
                />
                <Text style={styles.helper}>
                  {form.relationship === "EMPLOYEE"
                    ? "El cierre generará un informe de variable, nunca una factura ni una nómina."
                    : "El profesional emitirá desde HERA su factura a la clínica."}
                </Text>
              </Field>
            ) : null}
            {step === 2 ? (
              <Field label="Parte del profesional">
                <SimpleDropdown
                  options={[
                    { label: "Porcentaje", value: "PERCENTAGE" },
                    { label: "Importe fijo", value: "FIXED_AMOUNT" },
                  ]}
                  value={form.shareMethod}
                  onSelect={(value) => set("shareMethod", value)}
                  presentation="portal"
                />
                <Input
                  label={
                    form.shareMethod === "PERCENTAGE"
                      ? "Porcentaje (%)"
                      : "Importe fijo (€)"
                  }
                  value={form.shareValue}
                  onChangeText={(value) => set("shareValue", form.shareMethod === "PERCENTAGE" ? sanitizePercentageInput(value) : sanitizeMoneyInput(value))}
                  maxLength={12}
                  keyboardType="decimal-pad"
                />
                <View style={styles.example}>
                  <Ionicons
                    name="calculator-outline"
                    size={18}
                    color={styles.exampleText.color}
                  />
                  <Text style={styles.exampleText}>{examples}</Text>
                </View>
              </Field>
            ) : null}
            {step === 3 ? (
              <Field label="¿Cuándo queda listo para el cierre?">
                <SimpleDropdown
                  options={[
                    {
                      label: "Al completar la sesión",
                      value: "SESSION_COMPLETED",
                    },
                    {
                      label: "A medida que paga el paciente",
                      value: "PATIENT_COLLECTION",
                    },
                  ]}
                  value={form.settlementCondition}
                  onSelect={(value) => set("settlementCondition", value)}
                  selectionIndicator="radio"
                  presentation="portal"
                />
                <Text style={styles.helper}>
                  {form.settlementCondition === "PATIENT_COLLECTION"
                    ? "El importe se incorpora según los cobros registrados."
                    : "El importe se incorpora al completar la sesión."}
                </Text>
              </Field>
            ) : null}
            {step === 4 ? (
              <Field label="Vigencia del acuerdo">
                <MadridDateField label="Fecha de inicio" value={form.validFrom} onChange={(value) => set("validFrom", value)} />
                <MadridDateField label="Fecha de fin" value={form.validUntil} onChange={(value) => set("validUntil", value)} minDate={form.validFrom || undefined} optional />
                <Input
                  label="Motivo"
                  value={form.replacementReason}
                  onChangeText={(value) => set("replacementReason", value)}
                  maxLength={500}
                  helperText="Los cambios solo afectan a sesiones futuras."
                />
              </Field>
            ) : null}
            {step === 5 ? (
              <Field label="Revisa antes de solicitar aceptación">
                <View style={styles.reviewBox}>
                  <Text style={styles.reviewTitle}>
                    {
                      scopeOptions.find((item) => item.value === form.scope)
                        ?.label
                    }{" "}
                    ·{" "}
                    {form.relationship === "EMPLOYEE" ? "Laboral" : "Autónomo"}
                  </Text>
                  <Text style={styles.reviewValue}>
                    {form.shareMethod === "PERCENTAGE"
                      ? `${form.shareValue} %`
                      : `${form.shareValue} €`}{" "}
                    para el profesional
                  </Text>
                  <Text style={styles.helper}>{examples}</Text>
                </View>
                <Button
                  fullWidth
                  loading={controller.saving}
                  onPress={() => void controller.createAgreement()}
                >
                  Enviar a aceptación
                </Button>
              </Field>
            ) : null}
            <View style={styles.wizardActions}>
              <Button
                variant="ghost"
                disabled={step === 0}
                onPress={() => setStep((value) => Math.max(0, value - 1))}
              >
                Anterior
              </Button>
              {step < 5 ? (
                <Button
                  variant="outline"
                  onPress={() => setStep((value) => Math.min(5, value + 1))}
                >
                  Continuar
                </Button>
              ) : null}
            </View>
          </View>
        </View>
      ) : null}
      {controller.agreements.length === 0 ? (
        <Empty
          title="Todavía no hay acuerdos"
          text="Crea el primer acuerdo y envíalo al profesional para que lo acepte."
          styles={styles}
        />
      ) : (
        controller.agreements.map((agreement) => {
          const version = agreement.versions[0];
          if (!version) return null;
          const value =
            version.shareMethod === "PERCENTAGE"
              ? `${(version.professionalShareBps ?? 0) / 100} %`
              : euro(version.professionalFixedCents);
          const accepted = version.acceptances.length > 0;
          return (
            <View key={agreement.id} style={styles.listCard}>
              <View style={styles.listTop}>
                <View style={styles.flex}>
                  <Text style={styles.listTitle}>
                    {
                      scopeOptions.find(
                        (item) => item.value === agreement.scope,
                      )?.label
                    }{" "}
                    · versión {version.version}
                  </Text>
                  <Text style={styles.listMeta}>
                    {value} para el profesional ·{" "}
                    {version.settlementCondition === "PATIENT_COLLECTION"
                      ? "según cobro"
                      : "al completar"}
                  </Text>
                </View>
                <Pill
                  label={version.status}
                  tone={
                    version.status === "ACTIVE"
                      ? "success"
                      : accepted
                        ? "info"
                        : "warning"
                  }
                  styles={styles}
                />
              </View>
              <View style={styles.listBottom}>
                <Text style={styles.helper}>
                  {accepted
                    ? `${version.acceptances.length} ${version.acceptances.length === 1 ? "aceptación registrada" : "aceptaciones registradas"}`
                    : "Pendiente de aceptación profesional"}{" "}
                  · desde {shortDate(version.validFrom)}
                </Text>
                {controller.role === "OWNER" &&
                accepted &&
                version.status === "PENDING_ACCEPTANCE" ? (
                  <Button
                    size="small"
                    loading={controller.saving}
                    onPress={() =>
                      void appAlert
                        .confirm({
                          title: "Activar acuerdo",
                          message:
                            "Solo afectará a sesiones futuras. Los cálculos anteriores se conservarán sin cambios.",
                          confirmLabel: "Activar",
                          cancelLabel: "Volver",
                        })
                        .then((confirmed) =>
                          confirmed
                            ? controller.activateAgreement(
                                version.id,
                                version.version,
                                version.replacementReason ??
                                  "Activación confirmada",
                              )
                            : undefined,
                        )
                    }
                  >
                    Activar
                  </Button>
                ) : null}
              </View>
            </View>
          );
        })
      )}
    </View>
  );
}

function Documents({
  controller,
  styles,
}: {
  controller: Controller;
  styles: Styles;
}) {
  const appAlert = useAppAlert();
  const overview = controller.overview!;
  const [invoiceKind, setInvoiceKind] = useState<"FULL" | "SIMPLIFIED">(
    "SIMPLIFIED",
  );
  const [vatPercent, setVatPercent] = useState("0");
  const [vatExemptReason, setVatExemptReason] = useState("");
  const vatRateBasisPoints = Math.round(
    Number(vatPercent.replace(",", ".")) * 100,
  );
  const validVat =
    Number.isSafeInteger(vatRateBasisPoints) &&
    vatRateBasisPoints >= 0 &&
    vatRateBasisPoints <= 10_000;
  return (
    <View style={styles.stack}>
      <View>
        <Text style={styles.cardKicker}>FACTURACIÓN</Text>
        <Text style={styles.sectionTitle}>Facturas y cobros</Text>
        <Text style={styles.sectionIntro}>
          Prepara facturas, registra cobros y revisa los pagos a profesionales.
        </Text>
      </View>
      <View style={styles.listCard}>
        <View style={styles.listTop}>
          <View style={styles.flex}>
            <Text style={styles.listTitle}>
              Sesiones listas para preparar factura
            </Text>
            <Text style={styles.helper}>
              Revisa los impuestos antes de crear cada factura.
            </Text>
          </View>
          <Pill
            label={`${overview.invoiceableSessions.length} ${overview.invoiceableSessions.length === 1 ? "pendiente" : "pendientes"}`}
            tone={overview.invoiceableSessions.length > 0 ? "info" : "success"}
            styles={styles}
            translate={false}
          />
        </View>
        {overview.invoiceableSessions.length > 0 ? (
          <View style={styles.compactForm}>
            <SimpleDropdown
              options={[
                { label: "Factura simplificada", value: "SIMPLIFIED" },
                { label: "Factura completa", value: "FULL" },
              ]}
              value={invoiceKind}
              onSelect={setInvoiceKind}
              presentation="portal"
            />
            <Input
              label="IVA (%)"
              value={vatPercent}
              onChangeText={(value) => setVatPercent(sanitizePercentageInput(value))}
              keyboardType="decimal-pad"
              maxLength={6}
            />
            <Input
              label="Motivo de exención, si aplica"
              value={vatExemptReason}
              onChangeText={setVatExemptReason}
              maxLength={240}
            />
          </View>
        ) : null}
        {!validVat ? (
          <Text style={styles.validationText}>
            El IVA debe estar entre 0 % y 100 %.
          </Text>
        ) : null}
        {overview.invoiceableSessions.map((session) => (
          <View key={session.id} style={styles.statementLine}>
            <View style={styles.flex}>
              <Text style={styles.statementName}>
                {session.patientDisplayName} ·{" "}
                {session.serviceName ?? "Sesión clínica"}
              </Text>
              <Text style={styles.helper}>
                {shortDate(session.date)} · base {euro(session.priceCents)}
              </Text>
            </View>
            <Button
              size="small"
              disabled={
                !validVat ||
                (vatRateBasisPoints === 0 && vatExemptReason.trim().length < 3)
              }
              loading={controller.saving}
              onPress={() =>
                void controller.createPatientInvoice(
                  session.id,
                  invoiceKind,
                  vatRateBasisPoints,
                  vatRateBasisPoints === 0
                    ? vatExemptReason.trim() || null
                    : null,
                )
              }
            >
              Preparar factura
            </Button>
          </View>
        ))}
        {overview.invoiceableSessions.length === 0 ? (
          <Text style={styles.helper}>
            No hay sesiones pendientes de facturar.
          </Text>
        ) : null}
      </View>
      <View style={styles.twoColumns}>
        <View style={styles.column}>
          <Text style={styles.columnTitle}>Facturas a pacientes</Text>
          {overview.patientInvoices.length === 0 ? (
            <Empty
              title="Sin facturas nuevas"
              text="Las nuevas facturas aparecerán aquí."
              styles={styles}
            />
          ) : (
            overview.patientInvoices.map((invoice) => (
              <View key={invoice.id} style={styles.documentCard}>
                <View style={styles.documentRow}>
                  <View style={styles.flex}>
                    <Text style={styles.listTitle}>
                      {invoice.fiscalInvoiceNumber ?? "Borrador sin número"}
                    </Text>
                    <Text style={styles.listMeta}>
                      {invoice.patientDisplayName} · por cobrar {euro(invoice.obligation.collectableCents)}
                    </Text>
                    <Text style={styles.helper}>
                      Estado: {productLabel(invoice.fiscalStatus)} · Entrega:{" "}
                      {productLabel(invoice.deliveryStatus)}
                    </Text>
                  </View>
                  <View style={styles.inlineActions}>
                    {invoice.fiscalStatus === "DRAFT" ? (
                      <>
                        <Button
                          size="small"
                          variant="outline"
                          disabled={controller.saving}
                          onPress={() =>
                            void appAlert
                              .confirm({
                                title: "Descartar borrador",
                                message:
                                  "Se conservará la trazabilidad, pero la sesión volverá a estar disponible para preparar una factura correcta.",
                                confirmLabel: "Descartar",
                                cancelLabel: "Volver",
                              })
                              .then((confirmed) =>
                                confirmed
                                  ? controller.discardPatientInvoiceDraft(invoice.id)
                                  : undefined,
                              )
                          }
                        >
                          Descartar
                        </Button>
                        <Button
                          size="small"
                          loading={controller.saving}
                          onPress={() =>
                            void appAlert
                              .confirm({
                                title: "Emitir factura al paciente",
                                message:
                                  "La factura recibirá número y ya no podrá editarse ni eliminarse.",
                                confirmLabel: "Emitir",
                                cancelLabel: "Volver",
                              })
                              .then((confirmed) =>
                                confirmed
                                  ? controller.issuePatientInvoice(invoice.id)
                                  : undefined,
                              )
                          }
                        >
                          Emitir
                        </Button>
                      </>
                    ) : null}
                    {invoice.fiscalStatus === "ISSUED" &&
                    invoice.deliveryStatus !== "SENT" ? (
                      <Button
                        size="small"
                        variant="outline"
                        loading={controller.saving}
                        onPress={() =>
                          void controller.deliverPatientInvoice(invoice.id)
                        }
                      >
                        Enviar al paciente
                      </Button>
                    ) : null}
                  </View>
                </View>
                {invoice.obligation.needsRefund ? (
                  <Text style={styles.blockerTitle}>
                    Hay {euro(invoice.obligation.refundableCents)} cobrados por encima de la obligación vigente. Registra la devolución correspondiente.
                  </Text>
                ) : null}
                {invoice.chainDocuments.length > 1 ? (
                  <View style={styles.movementBox}>
                    <Text style={styles.listTitle}>Documentos relacionados</Text>
                    {invoice.chainDocuments.map((document) => (
                      <View key={document.id} style={styles.documentRow}>
                        <View style={styles.flex}>
                          <Text style={styles.helper}>
                            {document.fiscalInvoiceNumber ?? "Borrador"} · {euro(document.totalCents)} · {productLabel(document.fiscalStatus)}
                          </Text>
                        </View>
                        {document.fiscalStatus === "ISSUED" && document.deliveryStatus !== "SENT" ? (
                          <Button
                            size="small"
                            variant="outline"
                            loading={controller.saving}
                            onPress={() => void controller.deliverPatientInvoice(document.id)}
                          >
                            Enviar
                          </Button>
                        ) : null}
                      </View>
                    ))}
                  </View>
                ) : null}
                {invoice.id === (invoice.rootClinicInvoiceId ?? invoice.id) &&
                (invoice.fiscalStatus === "ISSUED" ||
                  invoice.fiscalStatus === "RECTIFIED") ? (
                  <PatientMovementEditor
                    invoice={invoice}
                    controller={controller}
                    styles={styles}
                  />
                ) : null}
                {invoice.id === (invoice.rootClinicInvoiceId ?? invoice.id) &&
                invoice.fiscalStatus === "ISSUED" ? (
                  <PatientRectificationEditor
                    invoice={invoice}
                    controller={controller}
                    styles={styles}
                  />
                ) : null}
              </View>
            ))
          )}
        </View>
        <View style={styles.column}>
          <Text style={styles.columnTitle}>Facturas de profesionales</Text>
          {overview.professionalInvoices.length === 0 ? (
            <Empty
              title="Sin facturas de profesionales"
              text="Aparecerán cuando un profesional facture un cierre."
              styles={styles}
            />
          ) : (
            overview.professionalInvoices.map((invoice) => {
              const paid = invoice.payments.reduce(
                (sum, payment) => sum + payment.transferredAmountCents,
                0,
              );
              return (
                <View key={invoice.id} style={styles.documentCard}>
                  <View style={styles.documentRow}>
                    <View style={styles.flex}>
                      <Text style={styles.listTitle}>
                        {invoice.invoiceNumber ?? "Borrador profesional"}
                      </Text>
                      <Text style={styles.listMeta}>
                        Base {euro(invoice.baseCents)} · neto{" "}
                        {euro(invoice.netTransferCents)}
                      </Text>
                      <Text style={styles.helper}>
                        {productLabel(invoice.reviewStatus)} · transferido{" "}
                        {euro(paid)}
                      </Text>
                    </View>
                    {invoice.status === "ISSUED" &&
                    invoice.reviewStatus === "PENDING" ? (
                      <View style={styles.inlineActions}>
                        <Button
                          size="small"
                          onPress={() =>
                            void controller.reviewProfessionalInvoice(
                              invoice.id,
                              invoice.version,
                              "ACCEPT",
                            )
                          }
                        >
                          Aceptar
                        </Button>
                        <Button
                          size="small"
                          variant="outline"
                          onPress={() =>
                            void appAlert
                              .confirm({
                                title: "Solicitar corrección",
                                message:
                                  "La factura quedará marcada para revisión. El documento emitido se conservará.",
                                confirmLabel: "Solicitar",
                                cancelLabel: "Volver",
                              })
                              .then((confirmed) =>
                                confirmed
                                  ? controller.reviewProfessionalInvoice(
                                      invoice.id,
                                      invoice.version,
                                      "REQUEST_CORRECTION",
                                      "Revisión requerida por la clínica",
                                    )
                                  : undefined,
                              )
                          }
                        >
                          Corregir
                        </Button>
                      </View>
                    ) : null}
                  </View>
                  {invoice.status === "ISSUED" &&
                  invoice.reviewStatus === "ACCEPTED" &&
                  controller.role === "OWNER" ? (
                    <ProfessionalPaymentEditor
                      invoice={invoice}
                      controller={controller}
                      styles={styles}
                    />
                  ) : null}
                </View>
              );
            })
          )}
        </View>
      </View>
      <View style={styles.listCard}>
        <Text style={styles.columnTitle}>Documentos disponibles</Text>
        <Text style={styles.helper}>
          Descarga los documentos generados para esta clínica.
        </Text>
        {overview.documents.length === 0 ? (
          <Text style={styles.helper}>
            Aún no hay documentos disponibles.
          </Text>
        ) : (
          <View style={styles.inlineActions}>
            {overview.documents.map((document) => (
              <Button
                key={document.id}
                size="small"
                variant="outline"
                onPress={() => void controller.openDocument(document.id)}
              >
                {document.kind.endsWith("PDF")
                  ? "Descargar PDF"
                  : document.kind.endsWith("CSV")
                    ? "Descargar CSV"
                    : "Descargar exportación"}
              </Button>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const paymentMethods: Array<{ label: string; value: ClinicPaymentMethod }> = [
  { label: "Transferencia bancaria", value: "BANK_TRANSFER" },
  { label: "Tarjeta externa", value: "EXTERNAL_CARD" },
  { label: "Efectivo", value: "CASH" },
  { label: "Bizum", value: "BIZUM" },
  { label: "Bono", value: "VOUCHER" },
  { label: "Otro", value: "OTHER" },
];

const parseEuroCents = (value: string): number | null => {
  const amount = Number(value.replace(",", "."));
  return Number.isFinite(amount) && amount > 0
    ? Math.round(amount * 100)
    : null;
};

function PatientMovementEditor({
  invoice,
  controller,
  styles,
}: {
  invoice: NonNullable<Controller["overview"]>["patientInvoices"][number];
  controller: Controller;
  styles: Styles;
}) {
  const appAlert = useAppAlert();
  const collected = invoice.obligation.collectedCents;
  const outstanding = invoice.obligation.collectableCents;
  const [amount, setAmount] = useState(
    outstanding > 0 ? String(outstanding / 100) : "",
  );
  const [method, setMethod] = useState<ClinicPaymentMethod>("BANK_TRANSFER");
  const [reference, setReference] = useState("");
  const [administrativeNote, setAdministrativeNote] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(getMadridDateKey);
  const effectiveAt = parseMadridDateTime(effectiveDate, "12:00")?.iso ?? null;
  const amountCents = parseEuroCents(amount);
  const lastCollection = [...invoice.movements]
    .reverse()
    .find(
      (movement) =>
        movement.movementType === "COLLECTION" &&
        invoice.movements
          .filter(
            (candidate) =>
              candidate.movementType === "REFUND" &&
              candidate.originalMovementId === movement.id,
          )
          .reduce((sum, candidate) => sum + candidate.amountCents, 0) <
          movement.amountCents,
    );
  const lastCollectionRefunded = lastCollection
    ? invoice.movements
        .filter(
          (movement) =>
            movement.movementType === "REFUND" &&
            movement.originalMovementId === lastCollection.id,
        )
        .reduce((sum, movement) => sum + movement.amountCents, 0)
    : 0;
  const lastCollectionRefundable = lastCollection
    ? Math.max(0, lastCollection.amountCents - lastCollectionRefunded)
    : 0;
  return (
    <View style={styles.movementBox}>
      <Text style={styles.helper}>
        Cobrado {euro(collected)} · pendiente {euro(outstanding)}
      </Text>
      <View style={styles.compactForm}>
        <Input
          label="Importe (€)"
          value={amount}
          onChangeText={(value) => setAmount(sanitizeMoneyInput(value))}
          keyboardType="decimal-pad"
          maxLength={12}
        />
        <SimpleDropdown
          options={paymentMethods}
          value={method}
          onSelect={setMethod}
          presentation="portal"
        />
        <Input
          label="Referencia opcional"
          value={reference}
          onChangeText={(value) => setReference(normalizeSingleLine(value, 200))}
          maxLength={200}
        />
        <MadridDateField label="Fecha efectiva" value={effectiveDate} onChange={setEffectiveDate} />
        <Input
          label="Nota interna (opcional)"
          value={administrativeNote}
          onChangeText={setAdministrativeNote}
          maxLength={500}
        />
      </View>
      <View style={styles.inlineActions}>
        <Button
          size="small"
          disabled={!amountCents || !effectiveAt || amountCents > outstanding || !invoice.obligation.canCollect}
          loading={controller.saving}
          onPress={() =>
            amountCents
              ? void appAlert
                  .confirm({
                    title: "Registrar cobro recibido fuera de HERA",
                    message: `Se registrarán ${euro(amountCents)} como cobro externo.`,
                    confirmLabel: "Registrar cobro",
                    cancelLabel: "Volver",
                  })
                  .then((confirmed) =>
                    confirmed
                      ? controller.recordPatientCollection(
                          invoice.id,
                          amountCents,
                          method,
                          reference.trim() || null,
                          effectiveAt!,
                          administrativeNote.trim() || null,
                        )
                      : undefined,
                  )
              : undefined
          }
        >
          Registrar cobro
        </Button>
        {lastCollection && lastCollectionRefundable > 0 ? (
          <Button
            size="small"
            variant="outline"
            disabled={!amountCents || !effectiveAt || amountCents > lastCollectionRefundable || !invoice.obligation.canRefund}
            loading={controller.saving}
            onPress={() =>
              amountCents
                ? void appAlert
                    .confirm({
                      title: "Registrar devolución",
                      message: `Se registrará una devolución de ${euro(amountCents)}.`,
                      confirmLabel: "Registrar devolución",
                      cancelLabel: "Volver",
                      destructive: true,
                    })
                    .then((confirmed) =>
                      confirmed
                        ? controller.recordPatientRefund(
                            invoice.id,
                            lastCollection.id,
                            amountCents,
                            method,
                            reference.trim() || null,
                            effectiveAt!,
                            administrativeNote.trim() || null,
                          )
                        : undefined,
                    )
                : undefined
            }
          >
            Registrar devolución
          </Button>
        ) : null}
      </View>
    </View>
  );
}

function PatientRectificationEditor({
  invoice,
  controller,
  styles,
}: {
  invoice: NonNullable<Controller["overview"]>["patientInvoices"][number];
  controller: Controller;
  styles: Styles;
}) {
  const appAlert = useAppAlert();
  const [reason, setReason] = useState("");
  const prepare = async (): Promise<void> => {
    if (reason.trim().length < 3) return;
    const confirmed = await appAlert.confirm({
      title: "Preparar factura rectificativa",
      message:
        "Se creará una rectificativa vinculada a la factura original.",
      confirmLabel: "Preparar rectificativa",
      cancelLabel: "Volver",
    });
    if (confirmed) {
      await controller.createPatientRectification(invoice.id, reason.trim());
    }
  };
  return (
    <View style={styles.movementBox}>
      <Text style={styles.listTitle}>Corregir documento emitido</Text>
      <Input
        label="Motivo de rectificación"
        value={reason}
        onChangeText={setReason}
        maxLength={500}
      />
      <Button
        size="small"
        variant="outline"
        disabled={reason.trim().length < 3}
        loading={controller.saving}
        onPress={() => void prepare()}
      >
        Preparar rectificativa
      </Button>
    </View>
  );
}

function ProfessionalPaymentEditor({
  invoice,
  controller,
  styles,
}: {
  invoice: NonNullable<Controller["overview"]>["professionalInvoices"][number];
  controller: Controller;
  styles: Styles;
}) {
  const appAlert = useAppAlert();
  const paid = invoice.payments.reduce(
    (sum, payment) => sum + payment.transferredAmountCents,
    0,
  );
  const withheld = invoice.payments.reduce(
    (sum, payment) => sum + payment.withheldAmountCents,
    0,
  );
  const pending = Math.max(0, invoice.netTransferCents - paid);
  const pendingWithholding = Math.max(0, invoice.irpfAmountCents - withheld);
  const [amount, setAmount] = useState(
    pending > 0 ? String(pending / 100) : "",
  );
  const [retention, setRetention] = useState(
    pendingWithholding > 0 ? String(pendingWithholding / 100) : "0",
  );
  const [method, setMethod] = useState<ClinicPaymentMethod>("BANK_TRANSFER");
  const [reference, setReference] = useState("");
  const [administrativeNote, setAdministrativeNote] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(getMadridDateKey);
  const effectiveAt = parseMadridDateTime(effectiveDate, "12:00")?.iso ?? null;
  const amountCents = parseEuroCents(amount);
  const withholdingCents =
    retention.trim() === "0" ? 0 : parseEuroCents(retention);
  const valid =
    amountCents !== null &&
    withholdingCents !== null &&
    amountCents <= pending &&
    withholdingCents <= pendingWithholding;
  return (
    <View style={styles.movementBox}>
      <Text style={styles.helper}>
        Pendiente de transferir {euro(pending)} · retención pendiente{" "}
        {euro(pendingWithholding)}
      </Text>
      <View style={styles.compactForm}>
        <Input
          label="Transferido (€)"
          value={amount}
          onChangeText={(value) => setAmount(sanitizeMoneyInput(value))}
          maxLength={12}
          keyboardType="decimal-pad"
        />
        <Input
          label="Retención practicada (€)"
          value={retention}
          onChangeText={(value) => setRetention(sanitizeMoneyInput(value))}
          maxLength={12}
          keyboardType="decimal-pad"
        />
        <SimpleDropdown
          options={paymentMethods}
          value={method}
          onSelect={setMethod}
          presentation="portal"
        />
        <Input
          label="Referencia"
          value={reference}
          onChangeText={(value) => setReference(normalizeSingleLine(value, 200))}
          maxLength={200}
        />
        <MadridDateField label="Fecha efectiva" value={effectiveDate} onChange={setEffectiveDate} />
        <Input
          label="Nota interna (opcional)"
          value={administrativeNote}
          onChangeText={setAdministrativeNote}
          maxLength={500}
        />
      </View>
      <Button
        size="small"
        disabled={!valid || !effectiveAt || pending === 0}
        loading={controller.saving}
        onPress={() =>
          valid && amountCents !== null && withholdingCents !== null
            ? void appAlert
                .confirm({
                  title: "Registrar transferencia al profesional",
                  message: `Transferencia ${euro(amountCents)} · retención ${euro(withholdingCents)}.`,
                  confirmLabel: "Registrar",
                  cancelLabel: "Volver",
                })
                .then((confirmed) =>
                  confirmed
                    ? controller.recordProfessionalPayment(
                        invoice.professionalStatementId,
                        amountCents,
                        withholdingCents,
                        method,
                        reference.trim() || null,
                        effectiveAt!,
                        administrativeNote.trim() || null,
                      )
                    : undefined,
                )
            : undefined
        }
      >
        Registrar transferencia
      </Button>
    </View>
  );
}

function Periods({
  controller,
  styles,
}: {
  controller: Controller;
  styles: Styles;
}) {
  const appAlert = useAppAlert();
  const preview = controller.periodPreview;
  const overview = controller.overview!;
  const [madridYear, madridMonth] = getMadridDateKey().split("-").map(Number);
  const monthOptions = Array.from({ length: 24 }, (_, index) => {
    const date = new Date(Date.UTC(madridYear, madridMonth - 1 - index, 1, 12));
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    const value = `${year}-${month}`;
    return {
      label: date.toLocaleDateString("es-ES", {
        month: "long",
        year: "numeric",
        timeZone: "Europe/Madrid",
      }),
      value,
    };
  });
  const selectedMonth = `${controller.selectedPeriod.year}-${controller.selectedPeriod.month}`;
  return (
    <View style={styles.stack}>
      <View>
        <Text style={styles.cardKicker}>CIERRES MENSUALES</Text>
        <Text style={styles.sectionTitle}>Revisa y cierra cada mes</Text>
      </View>
      <View style={styles.monthSelector}>
        <Text style={styles.helper}>Mes contable</Text>
        <SimpleDropdown
          options={monthOptions}
          value={selectedMonth}
          onSelect={(value) => {
            const [year, month] = value.split("-").map(Number);
            if (year && month) controller.setSelectedPeriod({ year, month });
          }}
          presentation="portal"
        />
      </View>
      {preview ? (
        <View style={styles.periodHero}>
          <View>
            <Text style={styles.periodMonth}>
              {new Date(preview.year, preview.month - 1, 1).toLocaleDateString(
                "es-ES",
                { month: "long", year: "numeric" },
              )}
            </Text>
            <Text style={styles.sectionIntro}>
              {preview.lineCount} {preview.lineCount === 1 ? "movimiento" : "movimientos"}
            </Text>
          </View>
          <View style={styles.periodAmount}>
            <Text style={styles.metricLabel}>Listo para cerrar</Text>
            <Text style={styles.periodValue}>
              {euro(preview.liquidableCents)}
            </Text>
          </View>
          <View style={styles.periodAction}>
            {preview.blockedLineCount > 0 ? (
              <Text style={styles.blockerTitle}>
                {preview.blockedLineCount} {preview.blockedLineCount === 1 ? "bloqueo" : "bloqueos"}
              </Text>
            ) : null}
            <Button
              disabled={!preview.canClose || controller.role !== "OWNER"}
              loading={controller.saving}
              onPress={() =>
                void appAlert
                  .confirm({
                    title: "Cerrar periodo",
                    message:
                      "Después de cerrar, las correcciones se registrarán en el mes siguiente.",
                    confirmLabel: "Cerrar periodo",
                    cancelLabel: "Volver",
                  })
                  .then((confirmed) =>
                    confirmed ? controller.closePeriod() : undefined,
                  )
              }
            >
              Cerrar periodo
            </Button>
            {controller.role !== "OWNER" ? (
              <Text style={styles.helper}>Solo la persona propietaria de la clínica puede cerrar el mes.</Text>
            ) : !preview.canClose ? (
              <Text style={styles.helper}>
                El mes actual puede revisarse, pero solo se cierran meses
                terminados.
              </Text>
            ) : null}
          </View>
        </View>
      ) : null}
      {preview?.blockedSessions.map((blocked) => (
        <BlockedSessionResolver
          key={blocked.sessionId}
          blocked={blocked}
          controller={controller}
          styles={styles}
        />
      ))}
      {overview.periods.map((period) => (
        <View key={period.id} style={styles.listCard}>
          <View style={styles.listTop}>
            <View>
              <Text style={styles.listTitle}>
                {String(period.month).padStart(2, "0")}/{period.year}
              </Text>
              <Text style={styles.listMeta}>
                {period.statements.length} {period.statements.length === 1 ? "documento profesional" : "documentos profesionales"} ·{" "}
                {euro(period.liquidableCents)}
              </Text>
            </View>
            <Pill label={period.status} tone="success" styles={styles} />
          </View>
          {period.statements.map((statement) => (
            <View key={statement.id} style={styles.statementLine}>
              <Text style={styles.statementName}>
                {statement.specialistNameSnapshot}
              </Text>
              <Text style={styles.helper}>
                {statement.relationship === "EMPLOYEE"
                  ? "Informe laboral"
                  : "Factura profesional"}{" "}
                · {productLabel(statement.status)}
              </Text>
              <Text style={styles.statementAmount}>
                {euro(statement.closedBaseCents)}
              </Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

function BlockedSessionResolver({
  blocked,
  controller,
  styles,
}: {
  blocked: NonNullable<Controller["periodPreview"]>["blockedSessions"][number];
  controller: Controller;
  styles: Styles;
}) {
  const appAlert = useAppAlert();
  const [reason, setReason] = useState("");
  const [agreementVersionId, setAgreementVersionId] = useState<string | null>(
    null,
  );
  const agreementOptions = controller.agreements.flatMap((agreement) =>
    agreement.versions
      .filter((version) => ["ACTIVE", "SUPERSEDED"].includes(version.status))
      .map((version) => ({
        label: `${scopeLabels[agreement.scope] ?? "Acuerdo"} · versión ${version.version}`,
        value: version.id,
      })),
  );
  const resolve = async (): Promise<void> => {
    if (!agreementVersionId || reason.trim().length < 3) return;
    const payload = {
      expectedRevision: blocked.latestRevision,
      agreementVersionId,
      reason: reason.trim(),
      allowCompletedResolution: true,
    };
    try {
      const economicPreview = await controller.previewBlockedSession(
        blocked.sessionId,
        payload,
      );
      if (economicPreview.resolution.status !== "RESOLVED") {
        await appAlert.warning({
          title: "La sesión sigue bloqueada",
          message:
            "El acuerdo elegido no resuelve la configuración para la fecha económica de esta sesión.",
        });
        return;
      }
      const confirmed = await appAlert.confirm({
        title: "Aplicar revisión administrativa",
        message: `Se creará la revisión ${economicPreview.nextRevision}. Profesional ${euro(economicPreview.resolution.professionalAmountCents)} · clínica ${euro(economicPreview.resolution.clinicAmountCents)}. La evidencia anterior se conserva.`,
        confirmLabel: "Resolver bloqueo",
        cancelLabel: "Volver",
      });
      if (confirmed) {
        await controller.resolveBlockedSession(blocked.sessionId, payload);
      }
    } catch (previewError: unknown) {
      await appAlert.error({
        title: "No se pudo previsualizar",
        message:
          previewError instanceof Error
            ? previewError.message
            : "Revisa el acuerdo y vuelve a intentarlo.",
      });
    }
  };
  return (
    <View style={styles.blockedSessionCard}>
      <View style={styles.flex}>
        <Text style={styles.listTitle}>
          {blocked.serviceName ?? "Sesión clínica"} ·{" "}
          {shortDate(blocked.sessionDate)}
        </Text>
        <Text style={styles.helper}>
          Motivo: {blockedReasonLabels[blocked.reasonCode] ?? "la sesión necesita una revisión administrativa"}
        </Text>
      </View>
      {controller.role === "OWNER" ? (
        <View style={styles.blockedSessionForm}>
          <SimpleDropdown
            options={agreementOptions}
            value={agreementVersionId}
            onSelect={setAgreementVersionId}
            placeholder="Selecciona un acuerdo vigente"
            presentation="portal"
          />
          <Input
            label="Motivo de la revisión excepcional"
            value={reason}
            onChangeText={setReason}
            maxLength={500}
          />
          <Button
            size="small"
            disabled={!agreementVersionId || reason.trim().length < 3}
            loading={controller.saving}
            onPress={() => void resolve()}
          >
            Previsualizar y resolver
          </Button>
        </View>
      ) : (
        <Text style={styles.helper}>
          Solo la persona propietaria de la clínica puede resolver este bloqueo.
        </Text>
      )}
    </View>
  );
}

function Ledger({
  controller,
  styles,
}: {
  controller: Controller;
  styles: Styles;
}) {
  const appAlert = useAppAlert();
  const ledger = controller.ledger;
  const [adjustmentAmount, setAdjustmentAmount] = useState("");
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [adjustmentEffectiveDate, setAdjustmentEffectiveDate] = useState(
    getMadridDateKey,
  );
  const [adjustmentKind, setAdjustmentKind] = useState<
    | "SESSION_CORRECTION"
    | "COLLECTION_CORRECTION"
    | "REFUND_CORRECTION"
    | "PERIOD_CORRECTION"
    | "OTHER"
  >("OTHER");
  const [referenceEventId, setReferenceEventId] = useState<string | null>(null);
  const adjustmentEffectiveAt =
    parseMadridDateTime(adjustmentEffectiveDate, "12:00")?.iso ?? null;
  const signedAmountCents = Math.round(
    Number(adjustmentAmount.replace(",", ".")) * 100,
  );
  const validAdjustment =
    Number.isSafeInteger(signedAmountCents) &&
    signedAmountCents !== 0 &&
    adjustmentReason.trim().length >= 3 &&
    referenceEventId !== null &&
    adjustmentEffectiveAt !== null;
  const createAdjustment = async (): Promise<void> => {
    if (!validAdjustment || !referenceEventId || !adjustmentEffectiveAt) return;
    const confirmed = await appAlert.confirm({
      title: "Crear ajuste financiero",
      message: `Se añadirá una línea de ${euro(signedAmountCents)} al primer periodo abierto. El evento original no se modifica.`,
      confirmLabel: "Crear ajuste",
      cancelLabel: "Volver",
    });
    if (!confirmed) return;
    const saved = await controller.createAdjustment({
      kind: adjustmentKind,
      amountCents: signedAmountCents,
      reason: adjustmentReason.trim(),
      referenceEventId,
      targetPeriodId: null,
      effectiveAt: adjustmentEffectiveAt,
    });
    if (saved) {
      setAdjustmentAmount("");
      setAdjustmentReason("");
      setReferenceEventId(null);
    }
  };
  return (
    <View style={styles.stack}>
      <View>
        <Text style={styles.cardKicker}>MOVIMIENTOS</Text>
        <Text style={styles.sectionTitle}>Actividad financiera</Text>
        <Text style={styles.sectionIntro}>
          Consulta sesiones, cobros, devoluciones, cierres y ajustes.
        </Text>
      </View>
      {controller.role === "OWNER" && ledger.length > 0 ? (
        <View style={styles.listCard}>
          <Text style={styles.listTitle}>Crear ajuste</Text>
          <Text style={styles.helper}>
            Usa importe positivo para incrementar la parte profesional y
            negativo para reducirla.
          </Text>
          <View style={styles.compactForm}>
            <SimpleDropdown
              options={[
                { label: "Corrección de sesión", value: "SESSION_CORRECTION" },
                {
                  label: "Corrección de cobro",
                  value: "COLLECTION_CORRECTION",
                },
                {
                  label: "Corrección de devolución",
                  value: "REFUND_CORRECTION",
                },
                { label: "Corrección de periodo", value: "PERIOD_CORRECTION" },
                { label: "Otro ajuste", value: "OTHER" },
              ]}
              value={adjustmentKind}
              onSelect={setAdjustmentKind}
              presentation="portal"
            />
            <SimpleDropdown
              options={ledger.map((line) => ({
                label: `${eventLabels[line.eventType] ?? "Movimiento financiero"} · ${shortDate(line.effectiveAt)}`,
                value: line.id,
              }))}
              value={referenceEventId}
              onSelect={setReferenceEventId}
              placeholder="Movimiento relacionado"
              presentation="portal"
            />
            <Input
              label="Importe del ajuste (€)"
              value={adjustmentAmount}
              onChangeText={(value) => setAdjustmentAmount(sanitizeMoneyInput(value, true))}
              keyboardType="numbers-and-punctuation"
              maxLength={13}
            />
            <Input
              label="Motivo"
              value={adjustmentReason}
              onChangeText={setAdjustmentReason}
              maxLength={500}
            />
            <MadridDateField label="Fecha efectiva" value={adjustmentEffectiveDate} onChange={setAdjustmentEffectiveDate} />
            <Button
              size="small"
              disabled={!validAdjustment}
              loading={controller.saving}
              onPress={() => void createAdjustment()}
            >
              Revisar ajuste
            </Button>
          </View>
        </View>
      ) : null}
      {ledger.length === 0 ? (
        <Empty
          title="Aún no hay movimientos"
          text="Aparecerán al registrar sesiones, cobros o cierres."
          styles={styles}
        />
      ) : (
        ledger.map((line) => {
          const base =
            typeof line.payload.economicBaseCents === "number"
              ? line.payload.economicBaseCents
              : null;
          const professional =
            typeof line.payload.professionalAmountCents === "number"
              ? line.payload.professionalAmountCents
              : null;
          const clinic =
            typeof line.payload.clinicAmountCents === "number"
              ? line.payload.clinicAmountCents
              : null;
          const scope =
            typeof line.payload.agreementScope === "string"
              ? line.payload.agreementScope
              : null;
          return (
            <View key={line.id} style={styles.ledgerRow}>
              <View style={styles.ledgerMark} />
              <View style={styles.flex}>
                <Text style={styles.listTitle}>
                  {eventLabels[line.eventType] ?? "Movimiento financiero"}
                </Text>
                <Text style={styles.helper}>
                  {new Date(line.effectiveAt).toLocaleString("es-ES")}
                </Text>
                {base !== null && professional !== null && clinic !== null ? (
                  <Text style={styles.helper}>
                    Base {euro(base)} = profesional {euro(professional)} +
                    clínica {euro(clinic)}
                    {scope
                      ? ` · ${scopeLabels[scope] ?? "regla del acuerdo"}`
                      : ""}
                  </Text>
                ) : null}
              </View>
              <Text
                style={[
                  styles.ledgerAmount,
                  line.amountCents < 0 ? styles.negative : null,
                ]}
              >
                {line.amountCents > 0 ? "+" : ""}
                {euro(line.amountCents)}
              </Text>
            </View>
          );
        })
      )}
      {controller.ledgerNextCursor ? (
        <Button
          variant="outline"
          loading={controller.loading}
          onPress={() => void controller.loadMoreLedger()}
        >
          Cargar más movimientos
        </Button>
      ) : null}
    </View>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const { theme } = useTheme();
  return (
    <View style={{ gap: spacing.md }}>
      <Text
        style={{
          fontFamily: theme.fontDisplay,
          fontSize: 24,
          color: theme.textPrimary,
        }}
      >
        {label}
      </Text>
      {children}
    </View>
  );
}
function Empty({
  title,
  text,
  styles,
}: {
  title: string;
  text: string;
  styles: Styles;
}) {
  return (
    <View style={styles.empty}>
      <Ionicons
        name="file-tray-outline"
        size={24}
        color={styles.emptyText.color}
      />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}
function Pill({
  label,
  tone,
  styles,
  translate = true,
}: {
  label: string;
  tone: "success" | "warning" | "info";
  styles: Styles;
  translate?: boolean;
}) {
  return (
    <View
      style={[
        styles.pill,
        tone === "success"
          ? styles.pillSuccess
          : tone === "warning"
            ? styles.pillWarning
            : styles.pillInfo,
      ]}
    >
      <Text style={styles.pillText}>{translate ? productLabel(label) : label}</Text>
    </View>
  );
}

const createStyles = (theme: Theme, compact: boolean) =>
  StyleSheet.create({
    root: { gap: spacing.lg },
    stack: { gap: spacing.lg },
    stackSmall: { gap: spacing.sm },
    flex: { flex: 1 },
    errorBanner: {
      flexDirection: "row",
      gap: spacing.sm,
      alignItems: "center",
      padding: spacing.md,
      borderRadius: borderRadius.lg,
      backgroundColor: theme.errorBg,
    },
    errorText: { flex: 1, color: theme.error, fontFamily: theme.fontSans },
    state: {
      minHeight: 260,
      justifyContent: "center",
      alignItems: "center",
      gap: spacing.md,
      padding: spacing.xl,
    },
    stateTitle: {
      fontFamily: theme.fontHeading,
      fontSize: 20,
      color: theme.textPrimary,
    },
    stateText: {
      fontFamily: theme.fontBody,
      color: theme.textSecondary,
      textAlign: "center",
    },
    metricGrid: { flexDirection: compact ? "column" : "row", gap: spacing.md },
    metric: {
      flex: 1,
      padding: spacing.lg,
      borderRadius: borderRadius.xl,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.bgCard,
    },
    metricWarning: {
      borderColor: theme.warning,
      backgroundColor: theme.warningBg,
    },
    metricLabel: {
      fontFamily: theme.fontSansBold,
      fontSize: 11,
      letterSpacing: 1.2,
      textTransform: "uppercase",
      color: theme.textMuted,
    },
    metricValue: {
      fontFamily: theme.fontDisplay,
      fontSize: 31,
      color: theme.textPrimary,
      marginVertical: spacing.xs,
    },
    metricHint: {
      fontFamily: theme.fontBody,
      fontSize: 13,
      color: theme.textSecondary,
    },
    flowCard: {
      padding: compact ? spacing.lg : spacing.xl,
      borderRadius: borderRadius.xl,
      backgroundColor: theme.surfaceWarm,
      borderWidth: 1,
      borderColor: theme.borderLight,
      gap: spacing.md,
    },
    cardKicker: {
      fontFamily: theme.fontSansBold,
      fontSize: 11,
      letterSpacing: 1.6,
      color: theme.primary,
    },
    cardTitle: {
      fontFamily: theme.fontDisplay,
      fontSize: compact ? 23 : 28,
      color: theme.textPrimary,
    },
    flowRow: {
      flexDirection: compact ? "column" : "row",
      alignItems: compact ? "stretch" : "center",
      gap: spacing.sm,
      marginVertical: spacing.md,
    },
    flowStep: {
      flex: 1,
      minHeight: 68,
      borderTopWidth: 2,
      borderTopColor: theme.primary,
      paddingTop: spacing.sm,
    },
    flowIndex: {
      fontFamily: theme.fontSansBold,
      color: theme.primary,
      fontSize: 11,
    },
    flowLabel: {
      fontFamily: theme.fontBodyStrong,
      color: theme.textPrimary,
      fontSize: 13,
      marginTop: spacing.xs,
    },
    flowArrow: { color: theme.textMuted },
    explainer: {
      fontFamily: theme.fontBody,
      color: theme.textSecondary,
      lineHeight: 21,
    },
    blockerCard: {
      flexDirection: "row",
      gap: spacing.md,
      padding: spacing.lg,
      borderRadius: borderRadius.xl,
      backgroundColor: theme.warningBg,
      borderWidth: 1,
      borderColor: theme.warning,
    },
    blockerTitle: {
      fontFamily: theme.fontHeading,
      color: theme.warning,
      fontSize: 15,
    },
    blockerText: {
      fontFamily: theme.fontBody,
      color: theme.textSecondary,
      lineHeight: 20,
      marginTop: 3,
    },
    sectionHeading: {
      flexDirection: compact ? "column" : "row",
      justifyContent: "space-between",
      alignItems: compact ? "stretch" : "center",
      gap: spacing.md,
    },
    sectionTitle: {
      fontFamily: theme.fontDisplay,
      fontSize: compact ? 25 : 30,
      color: theme.textPrimary,
      marginTop: 3,
    },
    sectionIntro: {
      fontFamily: theme.fontBody,
      color: theme.textSecondary,
      lineHeight: 21,
      marginTop: spacing.xs,
      maxWidth: 720,
    },
    buttonIcon: { color: theme.actionPrimaryText },
    wizard: {
      borderRadius: borderRadius.xl,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.bgCard,
      overflow: "hidden",
      flexDirection: compact ? "column" : "row",
    },
    stepRail: {
      width: compact ? "100%" : 210,
      backgroundColor: theme.surfaceWarm,
      padding: spacing.md,
      gap: spacing.xs,
      flexDirection: compact ? "row" : "column",
      flexWrap: compact ? "wrap" : "nowrap",
    },
    step: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      padding: spacing.sm,
      borderRadius: borderRadius.md,
      opacity: 0.62,
    },
    stepActive: { backgroundColor: theme.primaryMuted, opacity: 1 },
    stepNumber: {
      width: 22,
      height: 22,
      borderRadius: 11,
      textAlign: "center",
      textAlignVertical: "center",
      fontFamily: theme.fontSansBold,
      color: theme.primary,
      backgroundColor: theme.bgCard,
    },
    stepText: {
      fontFamily: theme.fontBodyStrong,
      color: theme.textPrimary,
      fontSize: 13,
    },
    wizardBody: {
      flex: 1,
      padding: compact ? spacing.lg : spacing.xl,
      gap: spacing.lg,
      minHeight: 330,
    },
    helper: {
      fontFamily: theme.fontBody,
      color: theme.textSecondary,
      fontSize: 13,
      lineHeight: 19,
    },
    example: {
      flexDirection: "row",
      gap: spacing.sm,
      backgroundColor: theme.primaryMuted,
      padding: spacing.md,
      borderRadius: borderRadius.lg,
    },
    exampleText: {
      flex: 1,
      fontFamily: theme.fontBody,
      color: theme.primary,
      lineHeight: 20,
    },
    reviewBox: {
      padding: spacing.lg,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.border,
      gap: spacing.xs,
    },
    reviewTitle: { fontFamily: theme.fontHeading, color: theme.textPrimary },
    reviewValue: {
      fontFamily: theme.fontDisplay,
      fontSize: 26,
      color: theme.primary,
    },
    wizardActions: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: "auto",
    },
    listCard: {
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: borderRadius.xl,
      backgroundColor: theme.bgCard,
      gap: spacing.md,
    },
    listTop: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: spacing.md,
    },
    listTitle: {
      fontFamily: theme.fontHeading,
      color: theme.textPrimary,
      fontSize: 15,
    },
    listMeta: {
      fontFamily: theme.fontBody,
      color: theme.textSecondary,
      marginTop: 3,
    },
    listBottom: {
      flexDirection: compact ? "column" : "row",
      justifyContent: "space-between",
      alignItems: compact ? "stretch" : "center",
      gap: spacing.md,
    },
    pill: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 5,
      borderRadius: 999,
    },
    pillSuccess: { backgroundColor: theme.successBg },
    pillWarning: { backgroundColor: theme.warningBg },
    pillInfo: { backgroundColor: theme.primaryMuted },
    pillText: {
      fontFamily: theme.fontSansBold,
      fontSize: 10,
      color: theme.textPrimary,
      textTransform: "capitalize",
    },
    twoColumns: {
      flexDirection: compact ? "column" : "row",
      gap: spacing.lg,
      alignItems: "flex-start",
    },
    column: { flex: 1, width: compact ? "100%" : undefined, gap: spacing.md },
    columnTitle: {
      fontFamily: theme.fontHeading,
      fontSize: 17,
      color: theme.textPrimary,
    },
    documentCard: {
      backgroundColor: theme.bgCard,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: borderRadius.lg,
      overflow: "hidden",
    },
    documentRow: {
      flexDirection: compact ? "column" : "row",
      alignItems: compact ? "stretch" : "center",
      gap: spacing.md,
      backgroundColor: theme.bgCard,
      padding: spacing.md,
    },
    inlineActions: { flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" },
    movementBox: {
      gap: spacing.sm,
      padding: spacing.md,
      borderTopWidth: 1,
      borderTopColor: theme.borderLight,
      backgroundColor: theme.surfaceMuted,
    },
    compactForm: {
      flexDirection: compact ? "column" : "row",
      gap: spacing.sm,
      alignItems: compact ? "stretch" : "flex-end",
      flexWrap: "wrap",
    },
    validationText: {
      fontFamily: theme.fontBody,
      color: theme.error,
      fontSize: 13,
    },
    periodHero: {
      flexDirection: compact ? "column" : "row",
      gap: spacing.lg,
      alignItems: compact ? "stretch" : "center",
      backgroundColor: theme.textPrimary,
      borderRadius: borderRadius.xl,
      padding: compact ? spacing.lg : spacing.xl,
    },
    periodMonth: {
      fontFamily: theme.fontDisplay,
      color: theme.bgCard,
      fontSize: 27,
      textTransform: "capitalize",
    },
    periodAmount: { flex: 1, alignItems: compact ? "flex-start" : "center" },
    periodValue: {
      fontFamily: theme.fontDisplay,
      fontSize: 32,
      color: theme.bgCard,
    },
    periodAction: {
      gap: spacing.xs,
      alignItems: compact ? "stretch" : "flex-end",
    },
    statementLine: {
      display: "flex",
      flexDirection: compact ? "column" : "row",
      gap: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: theme.borderLight,
      paddingTop: spacing.sm,
    },
    statementName: {
      flex: 1,
      fontFamily: theme.fontBodyStrong,
      color: theme.textPrimary,
    },
    statementAmount: {
      fontFamily: theme.fontHeading,
      color: theme.textPrimary,
    },
    monthSelector: { width: compact ? "100%" : 320, gap: spacing.xs },
    blockedSessionCard: {
      gap: spacing.md,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: theme.warning,
      borderRadius: borderRadius.xl,
      backgroundColor: theme.warningBg,
    },
    blockedSessionForm: {
      gap: spacing.sm,
      width: compact ? "100%" : 520,
    },
    ledgerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
    },
    ledgerMark: {
      width: 9,
      height: 9,
      borderRadius: 5,
      backgroundColor: theme.primary,
    },
    ledgerAmount: { fontFamily: theme.fontHeading, color: theme.success },
    negative: { color: theme.error },
    empty: {
      alignItems: "center",
      justifyContent: "center",
      padding: spacing.xl,
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor: theme.border,
      borderRadius: borderRadius.xl,
      backgroundColor: theme.surfaceMuted,
    },
    emptyTitle: {
      fontFamily: theme.fontHeading,
      color: theme.textPrimary,
      marginTop: spacing.sm,
    },
    emptyText: {
      fontFamily: theme.fontBody,
      color: theme.textMuted,
      textAlign: "center",
      marginTop: spacing.xs,
      lineHeight: 19,
    },
  });
