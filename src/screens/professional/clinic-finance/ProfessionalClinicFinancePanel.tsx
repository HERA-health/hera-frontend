import Ionicons from "@expo/vector-icons/Ionicons";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Button } from "../../../components/common/Button";
import { Input } from "../../../components/common/Input";
import { SimpleDropdown } from "../../../components/common/SimpleDropdown";
import { useAppAlert } from "../../../components/common";
import { FinanceSectionNavigation, FinanceSummaryStrip, FocusedActionSheet } from "../../../components/finance";
import { borderRadius, spacing } from "../../../constants/colors";
import type { Theme } from "../../../constants/theme";
import { useTheme } from "../../../contexts/ThemeContext";
import * as clinicService from "../../../services/clinicService";
import type {
  ProfessionalClinicFinance,
  ProfessionalStatementDetail,
  ProfessionalStatementPage,
} from "../../../services/clinicService";
import {
  formatMadridInstant,
  getMadridDateKey,
} from "../../../utils/madridTime";
import { normalizeSeries, sanitizePercentageInput } from "../../../utils/financialFormValidation";

const euro = (cents: number): string =>
  (cents / 100).toLocaleString("es-ES", { style: "currency", currency: "EUR" });
const parseBasisPoints = (value: string): number | null => {
  const percentage = Number(value.replace(",", "."));
  const basisPoints = Math.round(percentage * 100);
  return Number.isFinite(percentage) &&
    Number.isSafeInteger(basisPoints) &&
    basisPoints >= 0 &&
    basisPoints <= 10_000
    ? basisPoints
    : null;
};

const statusLabels: Record<string, string> = {
  READY_FOR_REVIEW: "Listo para revisar",
  ACKNOWLEDGED: "Cierre confirmado",
  DISPUTED: "Revisión solicitada",
  INVOICE_PENDING: "Factura pendiente",
  INVOICE_ISSUED: "Factura emitida",
  INVOICE_ACCEPTED: "Factura aceptada",
  REPLACEMENT_PENDING: "Prepara la factura sustitutiva",
  PAYMENT_PENDING: "Pago pendiente",
  PARTIALLY_PAID: "Pago parcial",
  PAID: "Pagado",
  NO_PAYMENT_DUE: "Sin pago necesario",
  CREDIT_CARRY_FORWARD: "Crédito para el siguiente cierre",
  PENDING_ACCEPTANCE: "Pendiente de aceptación",
  ACTIVE: "Activo",
  SUPERSEDED: "Sustituido",
  PENDING: "Pendiente de revisión",
  ACCEPTED: "Aceptada",
  CORRECTION_REQUESTED: "Corrección solicitada",
  DRAFT: "Borrador",
  ISSUED: "Emitida",
  RECTIFIED: "Rectificada",
};

const scopeLabels: Record<clinicService.ClinicAgreementScope, string> = {
  CLINIC: "Acuerdo general con la clínica",
  SPECIALIST: "Acuerdo específico para ti",
  SPECIALIST_SERVICE: "Acuerdo para un servicio concreto",
  SPECIALIST_PATIENT: "Acuerdo para una atención concreta",
};

type ProfessionalSection = "overview" | "activity" | "agreement" | "closings";
const PROFESSIONAL_SECTIONS = [
  { value: "overview", label: "Resumen" },
  { value: "activity", label: "Actividad" },
  { value: "closings", label: "Cierres y facturas" },
] as const;

interface ProfessionalClinicFinancePanelProps {
  clinicId: string;
}

export function ProfessionalClinicFinancePanel({
  clinicId,
}: ProfessionalClinicFinancePanelProps): React.ReactElement {
  const appAlert = useAppAlert();
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const compact = width < 760;
  const styles = useMemo(() => createStyles(theme, compact), [compact, theme]);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const [year, month] = getMadridDateKey().split("-").map(Number);
    return { year, month };
  });
  const [finance, setFinance] = useState<ProfessionalClinicFinance | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [loadingMoreSessions, setLoadingMoreSessions] = useState(false);
  const [statementPage, setStatementPage] = useState<ProfessionalStatementPage | null>(null);
  const [statementDetail, setStatementDetail] = useState<ProfessionalStatementDetail | null>(null);
  const [loadingStatementId, setLoadingStatementId] = useState<string | null>(null);
  const [loadingMoreStatements, setLoadingMoreStatements] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [series, setSeries] = useState("PC");
  const [vatRate, setVatRate] = useState("0");
  const [irpfRate, setIrpfRate] = useState("15");
  const [vatExemptReason, setVatExemptReason] = useState("");
  const [activeSection, setActiveSection] = useState<ProfessionalSection>("overview");
  const [invoiceEditorStatementId, setInvoiceEditorStatementId] = useState<string | null>(null);
  const requestGeneration = useRef(0);
  const commandKeys = useRef(new Map<string, string>());

  const loadFinance = useCallback(async () => {
    const generation = requestGeneration.current + 1;
    requestGeneration.current = generation;
    if (!clinicId) {
      setFinance(null);
      return;
    }
    setFinance(null);
    setStatementPage(null);
    setStatementDetail(null);
    setLoadingMoreSessions(false);
    setLoading(true);
    setError(null);
    try {
      const query = {
          year: selectedMonth.year,
          month: selectedMonth.month,
          page: 1,
          limit: 25,
      };
      const [nextFinance, nextStatementPage] = await Promise.all([
        clinicService.getProfessionalClinicFinanceOverview(clinicId, query),
        activeSection === "closings"
          ? clinicService.listProfessionalClinicFinanceStatements(clinicId, query)
          : Promise.resolve(null),
      ]);
      if (requestGeneration.current !== generation) return;
      setFinance(nextFinance);
      setStatementPage(nextStatementPage);
    } catch (loadError: unknown) {
      if (requestGeneration.current !== generation) return;
      setError(
        loadError instanceof Error
          ? loadError.message
          : "No se pudo cargar la actividad de esta clínica.",
      );
    } finally {
      if (requestGeneration.current === generation) setLoading(false);
    }
  }, [activeSection, clinicId, selectedMonth.month, selectedMonth.year]);

  const loadMoreSessions = useCallback(async (): Promise<void> => {
    if (!clinicId || !finance?.sessionPageInfo.hasMore || loadingMoreSessions) return;
    const generation = requestGeneration.current;
    const requestedClinicId = clinicId;
    const requestedMonth = selectedMonth;
    setLoadingMoreSessions(true);
    try {
      const nextPage = await clinicService.getProfessionalClinicFinanceOverview(
        requestedClinicId,
        {
          year: requestedMonth.year,
          month: requestedMonth.month,
          page: finance.sessionPageInfo.page + 1,
          limit: finance.sessionPageInfo.limit,
        },
      );
      if (
        requestGeneration.current !== generation ||
        clinicId !== requestedClinicId
      ) return;
      setFinance((current) =>
        current
          ? {
              ...current,
              sessions: [...current.sessions, ...nextPage.sessions],
              sessionPageInfo: nextPage.sessionPageInfo,
            }
          : current,
      );
    } catch (loadError: unknown) {
      if (requestGeneration.current !== generation) return;
      setError(
        loadError instanceof Error
          ? loadError.message
          : "No se pudieron cargar más sesiones.",
      );
    } finally {
      if (requestGeneration.current === generation) {
        setLoadingMoreSessions(false);
      }
    }
  }, [clinicId, finance, loadingMoreSessions, selectedMonth]);

  const openStatement = useCallback(async (statementId: string): Promise<void> => {
    const generation = requestGeneration.current;
    const requestedClinicId = clinicId;
    setLoadingStatementId(statementId);
    setError(null);
    try {
      const detail = await clinicService.getProfessionalClinicFinanceStatementDetail(
        requestedClinicId,
        statementId,
      );
      if (requestGeneration.current !== generation || clinicId !== requestedClinicId) return;
      setStatementDetail(detail);
    } catch (loadError: unknown) {
      if (requestGeneration.current !== generation) return;
      setError(loadError instanceof Error ? loadError.message : "No se pudo abrir el cierre.");
    } finally {
      if (requestGeneration.current === generation) setLoadingStatementId(null);
    }
  }, [clinicId]);

  const loadMoreStatements = useCallback(async (): Promise<void> => {
    if (!statementPage?.pageInfo.hasMore || loadingMoreStatements) return;
    const generation = requestGeneration.current;
    const requestedClinicId = clinicId;
    setLoadingMoreStatements(true);
    try {
      const nextPage = await clinicService.listProfessionalClinicFinanceStatements(requestedClinicId, {
        year: selectedMonth.year,
        month: selectedMonth.month,
        page: statementPage.pageInfo.page + 1,
        limit: statementPage.pageInfo.limit,
      });
      if (requestGeneration.current !== generation || clinicId !== requestedClinicId) return;
      setStatementPage((current) => current ? {
        items: [...current.items, ...nextPage.items],
        pageInfo: nextPage.pageInfo,
      } : nextPage);
    } catch (loadError: unknown) {
      if (requestGeneration.current !== generation) return;
      setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar más cierres.");
    } finally {
      if (requestGeneration.current === generation) setLoadingMoreStatements(false);
    }
  }, [clinicId, loadingMoreStatements, selectedMonth.month, selectedMonth.year, statementPage]);

  useEffect(() => {
    void loadFinance();
  }, [loadFinance]);

  const run = useCallback(
    async (action: () => Promise<unknown>) => {
      setSaving(true);
      setError(null);
      try {
        await action();
        await loadFinance();
      } catch (actionError: unknown) {
        setError(
          actionError instanceof Error
            ? actionError.message
            : "No se pudo completar la acción.",
        );
      } finally {
        setSaving(false);
      }
    },
    [loadFinance],
  );

  const confirmAndRun = useCallback(
    async (
      title: string,
      message: string,
      confirmLabel: string,
      action: () => Promise<unknown>,
      destructive = false,
    ): Promise<void> => {
      const confirmed = await appAlert.confirm({
        title,
        message,
        confirmLabel,
        cancelLabel: "Volver",
        destructive,
      });
      if (confirmed) await run(action);
    },
    [appAlert, run],
  );

  const issueInvoice = useCallback(
    async (invoiceId: string, version: number): Promise<void> => {
      if (!clinicId) return;
      const fingerprint = `issue-professional-invoice:${invoiceId}:${version}`;
      const key =
        commandKeys.current.get(fingerprint) ??
        clinicService.createFinancialCommandKey();
      commandKeys.current.set(fingerprint, key);
      await clinicService.issueProfessionalInvoice(
        clinicId,
        invoiceId,
        version,
        key,
      );
      commandKeys.current.delete(fingerprint);
    },
    [clinicId],
  );

  const runIdempotent = useCallback(
    async (
      fingerprint: string,
      action: (idempotencyKey: string) => Promise<unknown>,
    ): Promise<unknown> => {
      const key =
        commandKeys.current.get(fingerprint) ??
        clinicService.createFinancialCommandKey();
      commandKeys.current.set(fingerprint, key);
      const result = await action(key);
      commandKeys.current.delete(fingerprint);
      return result;
    },
    [],
  );

  if (loading && !finance)
    return (
      <View style={styles.state}>
        <ActivityIndicator color={theme.primary} />
        <Text style={styles.muted}>Cargando información…</Text>
      </View>
    );
  const totals = finance?.liveSummary ?? {
    generatedCents: 0,
    liquidableCents: 0,
    closedCents: 0,
    invoicedCents: 0,
    pendingTransferCents: 0,
    paidCents: 0,
  };
  const [currentMadridYear, currentMadridMonth] = getMadridDateKey()
    .split("-")
    .map(Number);
  const monthOptions = Array.from({ length: 24 }, (_, index) => {
    const date = new Date(
      Date.UTC(currentMadridYear, currentMadridMonth - 1 - index, 1, 12),
    );
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    return {
      value: `${year}-${month}`,
      label: date.toLocaleDateString("es-ES", {
        month: "long",
        year: "numeric",
        timeZone: "Europe/Madrid",
      }),
    };
  });
  const vatRateBasisPoints = parseBasisPoints(vatRate);
  const irpfRateBasisPoints = parseBasisPoints(irpfRate);
  const validProfessionalDraft =
    /^[A-Z0-9._/-]{1,20}$/.test(series.trim().toUpperCase()) &&
    vatRateBasisPoints !== null &&
    irpfRateBasisPoints !== null &&
    (vatRateBasisPoints !== 0 || vatExemptReason.trim().length >= 3);

  return (
    <View style={styles.root}>
      <View style={styles.hero}>
        <View style={styles.flex}>
          <Text style={styles.kicker}>CLÍNICAS</Text>
          <Text style={styles.heroTitle}>Tu actividad con clínicas</Text>
          <Text style={styles.heroText}>
            Consulta tus acuerdos, cierres, facturas y pagos.
          </Text>
        </View>
        <View style={styles.selector}>
          <Text style={styles.selectorLabel}>Mes</Text>
          <SimpleDropdown
            options={monthOptions}
            value={`${selectedMonth.year}-${selectedMonth.month}`}
            onSelect={(value) => {
              const [year, month] = value.split("-").map(Number);
              requestGeneration.current += 1;
              setFinance(null);
              setLoadingMoreSessions(false);
              setError(null);
              setSelectedMonth({ year, month });
            }}
            presentation="portal"
          />
        </View>
      </View>
      {error ? (
        <View style={styles.error}>
          <Ionicons name="alert-circle-outline" size={18} color={theme.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
      {finance ? (
        <>
          <FinanceSectionNavigation value={activeSection} options={PROFESSIONAL_SECTIONS} onChange={setActiveSection} accessibilityLabel="Sección de clínicas" />
          {activeSection === "overview" ? <FinanceSummaryStrip items={[
            { key: "generated", label: "Generado por tus sesiones", value: euro(totals.generatedCents) },
            { key: "liquidable", label: "Listo para el próximo cierre", value: euro(totals.liquidableCents) },
            { key: "closed", label: "Incluido en cierres", value: euro(totals.closedCents) },
            { key: "invoiced", label: "Facturado a la clínica", value: euro(totals.invoicedCents) },
            { key: "pending", label: "Pendiente de recibir", value: euro(totals.pendingTransferCents) },
            { key: "paid", label: "Pagos registrados", value: euro(totals.paidCents), tone: "success" },
          ]} /> : null}
          {activeSection === "activity" ? <View style={styles.section}>
            <Text style={styles.kicker}>ACTIVIDAD DEL MES</Text>
            {finance.sessions.length === 0 ? (
              <Empty text="No hay sesiones este mes." styles={styles} />
            ) : (
              finance.sessions.map((session) => {
                const snapshot = session.snapshot;
                const formula = snapshot?.shareMethod === "PERCENTAGE"
                  ? `${(snapshot.professionalShareBps ?? 0) / 100} % de ${euro(snapshot.priceCents)}`
                  : snapshot?.shareMethod === "FIXED_AMOUNT"
                    ? `${euro(snapshot.professionalFixedCents ?? 0)} fijo`
                    : "Configuración pendiente";
                return (
                  <View key={session.id} style={styles.card}>
                    <View style={styles.flex}>
                      <Text style={styles.cardTitle}>
                        {session.serviceName ?? "Sesión clínica"}
                      </Text>
                      <Text style={styles.muted}>
                        {formatMadridInstant(session.date, {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })} · {formula}
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.cardValue}>
                        {euro(session.professionalAmountCents)} generado
                      </Text>
                      <Text style={styles.muted}>
                        {euro(session.liquidableAvailableCents)} listo para el cierre
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
            {finance.sessionPageInfo.hasMore ? (
              <Button
                variant="secondary"
                disabled={loadingMoreSessions}
                loading={loadingMoreSessions}
                onPress={() => void loadMoreSessions()}
              >
                Ver más sesiones
              </Button>
            ) : null}
          </View> : null}
          {activeSection === "agreement" ? <View style={styles.section}>
            <Text style={styles.kicker}>ACUERDO VIGENTE</Text>
            {finance.agreements.length === 0 ? (
              <Empty
                text="La clínica todavía no ha preparado un acuerdo para ti."
                styles={styles}
              />
            ) : (
              finance.agreements.map((agreement) => {
                const accepted = agreement.acceptances.length > 0;
                const value =
                  agreement.shareMethod === "PERCENTAGE"
                    ? `${(agreement.professionalShareBps ?? 0) / 100} %`
                    : euro(agreement.professionalFixedCents ?? 0);
                return (
                  <View key={agreement.id} style={styles.card}>
                    <View style={styles.cardHeader}>
                      <View style={styles.flex}>
                        <Text style={styles.cardTitle}>
                          {scopeLabels[agreement.agreement.scope]}
                        </Text>
                        <Text style={styles.cardValue}>{value} para ti</Text>
                        <Text style={styles.muted}>
                          {agreement.settlementCondition ===
                          "PATIENT_COLLECTION"
                            ? "Se incorpora al cierre según los cobros registrados."
                            : "Queda listo para el cierre al completar la sesión."}
                        </Text>
                      </View>
                      <Status
                        label={
                          accepted
                            ? agreement.status
                            : "PENDING_ACCEPTANCE"
                        }
                        styles={styles}
                      />
                    </View>
                    {!accepted && agreement.status === "PENDING_ACCEPTANCE" ? (
                      <Button
                        loading={saving}
                        onPress={() =>
                          void confirmAndRun(
                            "Aceptar acuerdo",
                            "Confirma que has revisado el acuerdo. Solo afectará a sesiones futuras.",
                            "Aceptar",
                            () => runIdempotent(
                              `accept-agreement:${agreement.id}:${agreement.version}`,
                              (idempotencyKey) =>
                                clinicService.acceptProfessionalClinicAgreement(
                                  clinicId!,
                                  agreement.id,
                                  agreement.version,
                                  idempotencyKey,
                                ),
                            ),
                          )
                        }
                      >
                        Aceptar versión {agreement.version}
                      </Button>
                    ) : null}
                  </View>
                );
              })
            )}
            {statementPage?.pageInfo.hasMore ? (
              <Button
                variant="outline"
                loading={loadingMoreStatements}
                disabled={loadingMoreStatements}
                onPress={() => void loadMoreStatements()}
              >
                Cargar más cierres
              </Button>
            ) : null}
          </View> : null}
          {activeSection === "closings" ? <View style={styles.section}>
            <Text style={styles.kicker}>CIERRES Y FACTURAS</Text>
            {!statementPage || statementPage.items.length === 0 ? (
              <Empty
                text="No hay cierres para este mes."
                styles={styles}
              />
            ) : (
              statementPage.items.map((summary) => {
                const detail = statementDetail?.statement.id === summary.id ? statementDetail : null;
                if (!detail) {
                  return (
                    <View key={summary.id} style={styles.card}>
                      <View style={styles.cardHeader}>
                        <View style={styles.flex}>
                          <Text style={styles.cardTitle}>
                            {String(summary.period.month).padStart(2, "0")}/{summary.period.year}
                          </Text>
                          <Text style={styles.cardValue}>{euro(summary.closedBaseCents)}</Text>
                          <Text style={styles.muted}>
                            {summary._count.lines} {summary._count.lines === 1 ? "sesión" : "sesiones"} ·{" "}
                            {summary.relationship === "EMPLOYEE" ? "informe laboral" : "factura a la clínica"}
                            {summary._count.professionalInvoices > 1
                              ? ` · ${summary._count.professionalInvoices} versiones`
                              : ""}
                          </Text>
                        </View>
                        <Status label={summary.status} styles={styles} />
                      </View>
                      <Button
                        size="small"
                        variant="outline"
                        loading={loadingStatementId === summary.id}
                        disabled={loadingStatementId !== null}
                        onPress={() => void openStatement(summary.id)}
                      >
                        Abrir detalle
                      </Button>
                    </View>
                  );
                }
                const statement = detail.statement;
                const invoiceHistory = detail.invoices;
                const invoice = detail.invoices.find(
                  (item) => item.id === statement.latestProfessionalInvoiceId,
                );
                const paid = invoiceHistory.reduce(
                  (sum, historicalInvoice) =>
                    sum +
                    historicalInvoice.payments.reduce(
                      (paymentSum, payment) =>
                        paymentSum + payment.transferredAmountCents,
                      0,
                    ),
                  0,
                );
                const statementDocuments = detail.documents.filter(
                  (document) => document.resourceId === statement.id,
                );
                const invoiceDocuments = detail.documents.filter((document) =>
                  invoiceHistory.some(
                    (item) => item.id === document.resourceId,
                  ),
                );
                const canCreateReplacement =
                  !invoice ||
                  (invoice.documentKind === "RECTIFICATION" &&
                    invoice.status === "ISSUED" &&
                    invoice.reviewStatus === "ACCEPTED");
                const estimatedVat = Math.round(statement.closedBaseCents * (vatRateBasisPoints ?? 0) / 10_000);
                const estimatedIrpf = Math.round(statement.closedBaseCents * (irpfRateBasisPoints ?? 0) / 10_000);
                const estimatedGross = statement.closedBaseCents + estimatedVat;
                const estimatedNet = estimatedGross - estimatedIrpf;
                return (
                  <View key={statement.id} style={styles.card}>
                    <View style={styles.cardHeader}>
                      <View style={styles.flex}>
                        <Text style={styles.cardTitle}>
                          {String(statement.period.month).padStart(2, "0")}/
                          {statement.period.year}
                        </Text>
                        <Text style={styles.cardValue}>
                          {euro(statement.closedBaseCents)}
                        </Text>
                        <Text style={styles.muted}>
                          {statement.lines.length} {statement.lines.length === 1 ? "sesión" : "sesiones"} ·{" "}
                          {statement.relationship === "EMPLOYEE"
                            ? "informe laboral"
                            : "factura a la clínica"}
                          {invoiceHistory.length > 1
                            ? ` · ${invoiceHistory.length} versiones`
                            : ""}
                        </Text>
                      </View>
                      <Status label={statement.status} styles={styles} />
                    </View>
                    <Button size="small" variant="ghost" onPress={() => setStatementDetail(null)}>
                      Cerrar detalle
                    </Button>
                    {statement.status === "NO_PAYMENT_DUE" ? (
                      <Text style={styles.muted}>
                        Este cierre no requiere factura ni pago.
                      </Text>
                    ) : statement.status === "CREDIT_CARRY_FORWARD" ? (
                      <Text style={styles.muted}>
                        Este saldo se descontará del próximo cierre.
                      </Text>
                    ) : null}
                    {statementDocuments.length > 0 ? (
                      <View style={styles.actions}>
                        {statementDocuments.map((document) => (
                          <Button
                            key={document.id}
                            size="small"
                            variant="outline"
                            onPress={() =>
                              void run(() =>
                                clinicService.openProfessionalClinicFinancialDocument(
                                  clinicId!,
                                  document.id,
                                ),
                              )
                            }
                          >
                            {document.kind.endsWith("CSV")
                              ? "Descargar CSV"
                              : "Abrir resumen del cierre"}
                          </Button>
                        ))}
                      </View>
                    ) : null}
                    {statement.lines.map((line) => (
                      <View key={line.id} style={styles.line}>
                        <View style={styles.flex}>
                          <Text style={styles.lineTitle}>
                            {line.serviceNameSnapshot ?? "Sesión clínica"}
                          </Text>
                          <Text style={styles.muted}>
                            {line.sessionDate
                              ? new Date(line.sessionDate).toLocaleDateString(
                                  "es-ES",
                                )
                              : "Sin fecha"}{" "}
                            · listo para el cierre desde{" "}
                            {new Date(line.liquidableAt).toLocaleDateString(
                              "es-ES",
                            )}
                          </Text>
                        </View>
                        <Text style={styles.lineAmount}>
                          {euro(line.professionalAmountCents)}
                        </Text>
                      </View>
                    ))}
                    {statement.status === "READY_FOR_REVIEW" ? (
                      <View style={styles.actions}>
                        <Button
                          loading={saving}
                          onPress={() =>
                            void run(() => runIdempotent(
                              `acknowledge-statement:${statement.id}:${statement.status}`,
                              (idempotencyKey) =>
                                clinicService.acknowledgeProfessionalStatement(
                                  clinicId!,
                                  statement.id,
                                  statement.status,
                                  idempotencyKey,
                                ),
                              ),
                            )
                          }
                        >
                          Confirmar cierre
                        </Button>
                        <Button
                          variant="outline"
                          onPress={() =>
                            void confirmAndRun(
                              "Comunicar discrepancia",
                              "La clínica verá que este cierre requiere revisión y el motivo quedará registrado.",
                              "Comunicar",
                              () => runIdempotent(
                                `dispute-statement:${statement.id}:${statement.status}`,
                                (idempotencyKey) =>
                                  clinicService.disputeProfessionalStatement(
                                    clinicId!,
                                    statement.id,
                                    statement.status,
                                    "El profesional solicita revisar las líneas del cierre",
                                    idempotencyKey,
                                  ),
                              ),
                            )
                          }
                        >
                          Hay una discrepancia
                        </Button>
                      </View>
                    ) : null}
                    {statement.relationship === "SELF_EMPLOYED_COLLABORATOR" &&
                    ["INVOICE_PENDING", "REPLACEMENT_PENDING"].includes(
                      statement.status,
                    ) &&
                    canCreateReplacement ? (
                      <>
                      <Button variant="outline" onPress={() => setInvoiceEditorStatementId(statement.id)}>
                        {statement.status === "REPLACEMENT_PENDING" ? "Preparar factura sustitutiva" : "Preparar factura para la clínica"}
                      </Button>
                      <FocusedActionSheet
                        visible={invoiceEditorStatementId === statement.id}
                        title={statement.status === "REPLACEMENT_PENDING" ? "Factura sustitutiva" : "Factura para la clínica"}
                        description="Revisa los impuestos y el neto antes de continuar."
                        onClose={() => setInvoiceEditorStatementId(null)}
                      >
                        <Text style={styles.cardTitle}>
                          {statement.status === "REPLACEMENT_PENDING"
                            ? "Crear factura sustitutiva"
                            : "Crear factura profesional"}
                        </Text>
                        <View style={styles.formRow}>
                          <Input
                            label="Serie"
                            value={series}
                            onChangeText={(value) => setSeries(normalizeSeries(value, 20))}
                            maxLength={20}
                            autoCapitalize="characters"
                            containerStyle={styles.formField}
                          />
                          <Input
                            label="IVA (%)"
                            value={vatRate}
                            onChangeText={(value) => setVatRate(sanitizePercentageInput(value))}
                            keyboardType="decimal-pad"
                            maxLength={6}
                            containerStyle={styles.formField}
                          />
                          <Input
                            label="IRPF (%)"
                            value={irpfRate}
                            onChangeText={(value) => setIrpfRate(sanitizePercentageInput(value))}
                            keyboardType="decimal-pad"
                            maxLength={6}
                            containerStyle={styles.formField}
                          />
                        </View>
                        {vatRateBasisPoints === 0 ? (
                          <Input
                            label="Motivo de exención o no sujeción"
                            value={vatExemptReason}
                            onChangeText={setVatExemptReason}
                            maxLength={240}
                            helperText="Este texto aparecerá en la factura."
                          />
                        ) : null}
                        <View style={styles.invoiceCalculation}>
                          <Text style={styles.muted}>Base del cierre <Text style={styles.lineTitle}>{euro(statement.closedBaseCents)}</Text></Text>
                          <Text style={styles.muted}>IVA <Text style={styles.lineTitle}>{euro(estimatedVat)}</Text> · IRPF <Text style={styles.lineTitle}>{euro(estimatedIrpf)}</Text></Text>
                          <Text style={styles.cardValue}>Neto a recibir {euro(estimatedNet)}</Text>
                        </View>
                        {!validProfessionalDraft ? (
                          <Text style={styles.correction}>
                            Revisa serie, IVA, IRPF y, si procede, el motivo de
                            exención.
                          </Text>
                        ) : null}
                        <Button
                          disabled={!validProfessionalDraft}
                          loading={saving}
                          onPress={() =>
                            validProfessionalDraft &&
                            vatRateBasisPoints !== null &&
                            irpfRateBasisPoints !== null
                              ? void run(() => {
                                  const payload = {
                                    series: series.trim().toUpperCase(),
                                    vatRateBasisPoints,
                                    irpfRateBasisPoints,
                                    vatExemptReason:
                                      vatRateBasisPoints === 0
                                        ? vatExemptReason.trim()
                                        : null,
                                  };
                                  return runIdempotent(
                                    `create-professional-invoice:${statement.id}:${JSON.stringify(payload)}`,
                                    (idempotencyKey) =>
                                      clinicService.createProfessionalInvoiceDraft(
                                        clinicId!,
                                        statement.id,
                                        payload,
                                        idempotencyKey,
                                      ),
                                  );
                                }).then(() => setInvoiceEditorStatementId(null))
                              : undefined
                          }
                        >
                          Preparar borrador
                        </Button>
                      </FocusedActionSheet>
                      </>
                    ) : null}
                    {invoice ? (
                      <View style={styles.invoiceSummary}>
                        <View style={styles.flex}>
                          <Text style={styles.lineTitle}>
                            {invoice.invoiceNumber ?? "Borrador sin número"} · v
                            {invoice.documentVersion}
                          </Text>
                          <Text style={styles.muted}>
                            Bruto {euro(invoice.grossTotalCents)} · IRPF{" "}
                            {euro(invoice.irpfAmountCents)} · neto{" "}
                            {euro(invoice.netTransferCents)}
                          </Text>
                          <Text style={styles.muted}>
                            Revisión: {statusLabels[invoice.reviewStatus] ?? "Pendiente"} · pago registrado
                            por la clínica: {euro(paid)}
                          </Text>
                          {invoice.reviewCorrectionReason || invoice.correctionReason ? (
                            <Text style={styles.correction}>
                              {invoice.reviewCorrectionReason ?? invoice.correctionReason}
                            </Text>
                          ) : null}
                        </View>
                        <View style={styles.actions}>
                          {invoice.status === "DRAFT" ? (
                            <Button
                              loading={saving}
                              onPress={() =>
                                void confirmAndRun(
                                  invoice.rectifiesInvoiceId
                                    ? "Emitir rectificativa"
                                    : "Emitir factura a la clínica",
                                  "Recibirá número y ya no podrá editarse.",
                                  "Emitir",
                                  () =>
                                    issueInvoice(invoice.id, invoice.version),
                                )
                              }
                            >
                              Emitir
                            </Button>
                          ) : null}
                          {invoice.status === "ISSUED" &&
                          invoice.reviewStatus === "CORRECTION_REQUESTED" ? (
                            <Button
                              disabled={!validProfessionalDraft}
                              loading={saving}
                              variant="outline"
                              onPress={() =>
                                void confirmAndRun(
                                  "Preparar rectificativa",
                                  "Se creará una rectificativa y después podrás preparar la factura corregida.",
                                  "Preparar",
                                  () => {
                                    const payload = {
                                      expectedVersion: invoice.version,
                                      series: `${series.trim().toUpperCase().slice(0, 19)}R`,
                                      reason:
                                        invoice.reviewCorrectionReason ??
                                        invoice.correctionReason ??
                                        "Corrección solicitada por la clínica",
                                    };
                                    return runIdempotent(
                                      `create-professional-rectification:${invoice.id}:${JSON.stringify(payload)}`,
                                      (idempotencyKey) =>
                                        clinicService.createProfessionalInvoiceRectification(
                                          clinicId!,
                                          invoice.id,
                                          payload,
                                          idempotencyKey,
                                        ),
                                    );
                                  },
                                )
                              }
                            >
                              Crear rectificativa
                            </Button>
                          ) : null}
                          {invoiceDocuments.map((document) => (
                            <Button
                              key={document.id}
                              size="small"
                              variant="outline"
                              onPress={() =>
                                void run(() =>
                                  clinicService.openProfessionalClinicFinancialDocument(
                                    clinicId!,
                                    document.id,
                                  ),
                                )
                              }
                            >
                              {document.kind.endsWith("PDF")
                                ? "Abrir factura PDF"
                                : "Exportación estructurada"}
                            </Button>
                          ))}
                        </View>
                      </View>
                    ) : null}
                  </View>
                );
              })
            )}
          </View> : null}
        </>
      ) : null}
    </View>
  );
}

function Status({
  label,
  styles,
}: {
  label: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.status}>
      <Text style={styles.statusText}>
        {statusLabels[label] ?? "Pendiente"}
      </Text>
    </View>
  );
}
function Empty({
  text,
  styles,
}: {
  text: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.empty}>
      <Ionicons name="file-tray-outline" size={24} color={styles.muted.color} />
      <Text style={styles.muted}>{text}</Text>
    </View>
  );
}

const createStyles = (theme: Theme, compact: boolean) =>
  StyleSheet.create({
    root: { gap: spacing.xl },
    flex: { flex: 1 },
    state: {
      minHeight: 280,
      alignItems: "center",
      justifyContent: "center",
      padding: spacing.xl,
      gap: spacing.md,
    },
    hero: {
      flexDirection: compact ? "column" : "row",
      gap: spacing.xl,
      backgroundColor: theme.textPrimary,
      borderRadius: borderRadius.xl,
      padding: compact ? spacing.lg : spacing.xl,
      alignItems: compact ? "stretch" : "center",
    },
    kicker: {
      fontFamily: theme.fontSansBold,
      fontSize: 11,
      letterSpacing: 1.7,
      color: theme.primary,
    },
    heroTitle: {
      fontFamily: theme.fontDisplay,
      fontSize: compact ? 27 : 34,
      color: theme.bgCard,
      maxWidth: 620,
      marginTop: spacing.xs,
    },
    heroText: {
      fontFamily: theme.fontBody,
      color: theme.secondaryLight,
      lineHeight: 21,
      marginTop: spacing.sm,
      maxWidth: 670,
    },
    selector: { minWidth: compact ? undefined : 260, gap: spacing.xs },
    selectorLabel: {
      fontFamily: theme.fontSansBold,
      color: theme.bgCard,
      fontSize: 12,
    },
    error: {
      flexDirection: "row",
      gap: spacing.sm,
      padding: spacing.md,
      borderRadius: borderRadius.lg,
      backgroundColor: theme.errorBg,
    },
    errorText: { flex: 1, fontFamily: theme.fontBody, color: theme.error },
    metricRow: { flexDirection: compact ? "column" : "row", gap: spacing.md },
    metric: {
      flex: 1,
      padding: spacing.lg,
      borderRadius: borderRadius.xl,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.bgCard,
    },
    metricLabel: {
      fontFamily: theme.fontSansBold,
      fontSize: 11,
      letterSpacing: 1.1,
      textTransform: "uppercase",
      color: theme.textMuted,
    },
    metricValue: {
      fontFamily: theme.fontDisplay,
      fontSize: 29,
      color: theme.textPrimary,
      marginTop: spacing.xs,
    },
    section: { gap: spacing.md },
    title: {
      fontFamily: theme.fontHeading,
      fontSize: 20,
      color: theme.textPrimary,
    },
    muted: {
      fontFamily: theme.fontBody,
      color: theme.textSecondary,
      fontSize: 13,
      lineHeight: 19,
      textAlign: "left",
    },
    card: {
      padding: compact ? spacing.md : spacing.lg,
      borderRadius: borderRadius.xl,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.bgCard,
      gap: spacing.md,
    },
    cardHeader: {
      flexDirection: compact ? "column" : "row",
      gap: spacing.md,
      alignItems: compact ? "stretch" : "flex-start",
    },
    cardTitle: {
      fontFamily: theme.fontHeading,
      fontSize: 16,
      color: theme.textPrimary,
    },
    cardValue: {
      fontFamily: theme.fontDisplay,
      fontSize: 26,
      color: theme.primary,
      marginVertical: 2,
    },
    status: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 5,
      borderRadius: 999,
      backgroundColor: theme.primaryMuted,
      alignSelf: "flex-start",
    },
    statusText: {
      fontFamily: theme.fontSansBold,
      fontSize: 10,
      color: theme.textPrimary,
      textTransform: "capitalize",
    },
    line: {
      flexDirection: "row",
      gap: spacing.md,
      paddingTop: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: theme.borderLight,
    },
    lineTitle: { fontFamily: theme.fontBodyStrong, color: theme.textPrimary },
    lineAmount: { fontFamily: theme.fontHeading, color: theme.textPrimary },
    actions: { flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" },
    invoiceForm: {
      padding: spacing.md,
      borderRadius: borderRadius.lg,
      backgroundColor: theme.surfaceWarm,
      gap: spacing.md,
    },
    invoiceCalculation: {
      gap: spacing.xs,
      padding: spacing.md,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surfaceMuted,
    },
    formRow: { flexDirection: compact ? "column" : "row", gap: spacing.sm },
    formField: { flex: 1 },
    invoiceSummary: {
      flexDirection: compact ? "column" : "row",
      gap: spacing.md,
      padding: spacing.md,
      borderRadius: borderRadius.lg,
      backgroundColor: theme.primaryMuted,
      alignItems: compact ? "stretch" : "center",
    },
    correction: {
      fontFamily: theme.fontBodyStrong,
      color: theme.warning,
      marginTop: spacing.xs,
    },
    empty: {
      padding: spacing.xl,
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor: theme.border,
      borderRadius: borderRadius.xl,
      alignItems: "center",
      gap: spacing.sm,
      backgroundColor: theme.surfaceMuted,
    },
  });
