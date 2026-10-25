import { patientCountry } from "./patientPresentation";
import { PatientPagination } from "./PatientPagination";
import React, { useEffect, useRef, useState } from "react";
import { View, Text, useWindowDimensions } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { AppNavigationProp } from "../../../constants/types";
import { Button, AnimatedPressable } from "../../common";
import { useTheme } from "../../../contexts/ThemeContext";
import {
  billingService,
  type PaginatedInvoices,
  type Invoice,
} from "../../../services/billingService";
import {
  getPatientMovements,
  type PatientMovementPage,
  type PatientSummary,
} from "../../../services/patientDetailService";
import type { Client } from "../../../services/professionalService";
import type { PatientPackage } from "../../../services/packageService";
import { getErrorMessage } from "../../../constants/errors";
import { PatientPackages } from "../../packages/PatientPackages";
import { PatientCommission } from "../../../screens/commissions/CommissionLinks";
import {
  Panel,
  Field,
  Copy,
  Badge,
  LoadState,
  pd,
  patientDate,
  patientMoney,
} from "./PatientDetailPrimitives";

export function PatientFinancialPanel({
  client,
  summary,
  onEditBilling,
  onReserve,
  onRefresh,
}: {
  client: Client;
  summary: PatientSummary | null;
  onEditBilling: () => void;
  onReserve: (row: PatientPackage) => void;
  onRefresh: () => Promise<void>;
}) {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const navigation = useNavigation<AppNavigationProp>();
  const [invoicePage, setInvoicePage] = useState(1);
  const [movementPage, setMovementPage] = useState(1);
  const [invoices, setInvoices] = useState<PaginatedInvoices | null>(null);
  const [movements, setMovements] = useState<PatientMovementPage | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    void Promise.all([
      billingService.getInvoices({
        clientId: client.id,
        page: invoicePage,
        limit: 10,
      }),
      getPatientMovements(client.id, movementPage),
    ])
      .then(([nextInvoices, nextMovements]) => {
        if (active) {
          setInvoices(nextInvoices);
          setMovements(nextMovements);
        }
      })
      .catch((e) => {
        if (active) {
          setInvoices(null);
          setMovements(null);
          setError(
            getErrorMessage(e, "No se pudo cargar la información económica."),
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [client.id, invoicePage, movementPage, revision]);
  const run = async (action: () => Promise<unknown>) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      await action();
      setRevision((value) => value + 1);
      await onRefresh();
    } catch (e) {
      setError(getErrorMessage(e, "No se pudo completar la acción."));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };
  const register = (invoice: Invoice) =>
    void run(() => billingService.markInvoiceAsPaid(invoice.id));
  return (
    <View style={pd.stack}>
      <LoadState
        loading={loading}
        error={error}
        onRetry={() => setRevision((value) => value + 1)}
      />
      <View style={[pd.columns, width < 1180 && { flexDirection: "column" }]}>
        <View style={[pd.column, width < 1180 && pd.compactColumn]}>
          <Panel
            title="Datos económicos y facturación"
            icon="wallet-outline"
            action={
              <Button size="small" variant="outline" onPress={onEditBilling}>
                Editar
              </Button>
            }
          >
            <Field
              label="Importe pendiente"
              value={summary ? patientMoney(summary.pendingAmountCents) : null}
            />
            <Field
              label="Facturas pendientes"
              value={summary ? String(summary.pendingInvoiceCount) : null}
            />
            <Field
              label="Nombre / Razón social"
              value={client.billingFullName}
            />
            <Field label="NIF / NIE" value={client.billingTaxId} />
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
            <Field label="Email de facturación" value={client.primaryEmail} />
            <Copy muted>
              El importe de cada sesión y bono corresponde a las condiciones
              reservadas.
            </Copy>
          </Panel>
          <Panel
            title="Información administrativa"
            icon="information-circle-outline"
          >
            <Field
              label="Profesional responsable"
              value={summary?.professionalName}
            />
            <Field
              label="Fecha de incorporación"
              value={
                summary?.relationshipSince
                  ? patientDate(summary.relationshipSince)
                  : null
              }
            />
            <Field
              label="Estado"
              value={
                client.archivedAt
                  ? "Archivado"
                  : summary?.closedAt
                    ? "Proceso cerrado"
                    : "En seguimiento"
              }
            />
            <Field
              label="Procedencia"
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
          </Panel>
          <PatientCommission clientId={client.id} />
        </View>
        <View style={[pd.column, width < 1180 && pd.compactColumn]}>
          <Panel title="Bonos y paquetes" icon="gift-outline">
            <PatientPackages clientId={client.id} dense onReserve={onReserve} />
          </Panel>
          <Panel title="Historial de pagos" icon="card-outline">
            {movements?.items.map((row) => (
              <AnimatedPressable
                key={row.id}
                hoverLift={false}
                accessibilityRole={row.reference ? "button" : undefined}
                accessibilityLabel={`${row.refund ? "Devolución" : "Cobro"} del ${patientDate(row.date)}`}
                disabled={!row.reference || busy}
                onPress={() => {
                  if (!row.reference) return;
                  if (row.source === "ONLINE_SESSION")
                    navigation.navigate("SessionPayment", {
                      bookingId: row.reference,
                    });
                  else if (row.source === "ONLINE_PACKAGE")
                    navigation.navigate("PackagePayment", {
                      patientPackageId: row.reference,
                    });
                  else
                    void run(() =>
                      billingService.downloadInvoice(row.reference!),
                    );
                }}
                style={[pd.row, { borderBottomColor: theme.borderLight }]}
              >
                <View style={pd.toolbar}>
                  <Copy>{patientDate(row.date)}</Copy>
                  <Text
                    style={{
                      fontFamily: theme.fontSansSemiBold,
                      color: theme.textPrimary,
                      fontSize: 14,
                    }}
                  >
                    {patientMoney(row.cents)}
                  </Text>
                </View>
                <View style={pd.toolbar}>
                  <Copy muted>
                    {row.refund ? "Devolución" : "Cobro registrado"} ·{" "}
                    {row.source.startsWith("ONLINE")
                      ? "Pago online"
                      : "Método no registrado"}
                  </Copy>
                  <Badge tone={row.refund ? "warning" : "success"}>
                    {row.refund ? "Devuelto" : "Cobrado"}
                  </Badge>
                </View>
              </AnimatedPressable>
            ))}
            {!loading && !movements?.items.length ? (
              <Copy muted>No hay movimientos registrados.</Copy>
            ) : null}
            <PatientPagination
              page={movementPage}
              hasNext={Boolean(movements?.hasMore)}
              loading={loading}
              summary={
                movements
                  ? `${movements.items.length} ${movements.items.length === 1 ? "movimiento" : "movimientos"}${movementPage > 1 || movements.hasMore ? " en esta página" : ""}`
                  : undefined
              }
              onPrevious={() => setMovementPage((value) => value - 1)}
              onNext={() => setMovementPage((value) => value + 1)}
            />
          </Panel>
          <Panel
            title="Facturación"
            icon="receipt-outline"
            action={
              <Button
                size="small"
                variant="outline"
                onPress={() =>
                  navigation.navigate("CreateInvoice", {
                    clientId: client.id,
                    returnToClientId: client.id,
                  })
                }
              >
                + Crear factura
              </Button>
            }
          >
            {invoices?.invoices.map((row) => (
              <View
                key={row.id}
                style={[pd.row, { borderBottomColor: theme.borderLight }]}
              >
                <View style={pd.toolbar}>
                  <Button
                    size="small"
                    variant="outline"
                    onPress={() =>
                      void run(() =>
                        billingService.downloadInvoice(
                          row.id,
                          row.invoiceNumber,
                        ),
                      )
                    }
                  >
                    {row.invoiceNumber}
                  </Button>
                  <Copy>{patientMoney(Math.round(row.total * 100))}</Copy>
                </View>
                <View style={pd.toolbar}>
                  <Copy muted>
                    {patientDate(row.createdAt)} · {row.concept}
                  </Copy>
                  <Badge tone={row.status === "PAID" ? "success" : "neutral"}>
                    {
                      {
                        PAID: "Pagada",
                        DRAFT: "Borrador",
                        SENT: "Emitida",
                        CANCELLED: "Anulada",
                      }[row.status]
                    }
                  </Badge>
                </View>
                <View style={pd.filters}>
                  {row.status !== "PAID" &&
                  row.status !== "CANCELLED" &&
                  !row.paymentBookingId ? (
                    <Button
                      size="small"
                      variant="outline"
                      disabled={busy}
                      onPress={() => register(row)}
                    >
                      Registrar pago
                    </Button>
                  ) : null}
                  <Button
                    size="small"
                    variant="outline"
                    onPress={() =>
                      navigation.navigate("CreateInvoice", {
                        invoiceId: row.id,
                        returnToClientId: client.id,
                      })
                    }
                  >
                    Ver detalle
                  </Button>
                </View>
              </View>
            ))}
            {!loading && !invoices?.invoices.length ? (
              <Copy muted>No hay facturas registradas.</Copy>
            ) : null}
            <PatientPagination
              page={invoicePage}
              totalPages={invoices?.totalPages}
              hasNext={Boolean(invoices && invoicePage < invoices.totalPages)}
              loading={loading}
              summary={
                invoices
                  ? `${invoices.total} ${invoices.total === 1 ? "factura" : "facturas"}`
                  : undefined
              }
              onPrevious={() => setInvoicePage((value) => value - 1)}
              onNext={() => setInvoicePage((value) => value + 1)}
            />
          </Panel>
        </View>
      </View>
    </View>
  );
}
