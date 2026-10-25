import { PatientSessionFilters as SessionFilterControls } from "./PatientSessionFilters";
import { PatientPagination } from "./PatientPagination";
import {
  PatientSessionListSkeleton,
  PatientSessionDetailSkeleton,
} from "./PatientSessionSkeletons";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  View,
  Text,
  useWindowDimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { AnimatedPressable, Button } from "../../common";
import { showAppAlert, useAppAlert } from "../../common/alert";
import { useTheme } from "../../../contexts/ThemeContext";
import type { AppNavigationProp } from "../../../constants/types";
import * as professional from "../../../services/professionalService";
import {
  getPatientSessions,
  type PatientSessionPage,
  type PatientSessionFilters,
  type PatientSession,
} from "../../../services/patientDetailService";
import {
  billingService,
  type AttachableInvoiceSummary,
} from "../../../services/billingService";
import {
  getPayment,
  cancelPayment,
  paymentAmount,
} from "../../../services/sessionPaymentService";
import { getErrorMessage } from "../../../constants/errors";
import { openSessionMeeting } from "../../../utils/openSessionMeeting";
import { ManagedSessionSchedulerModal } from "../ManagedSessionSchedulerModal";
import { ClinicalSessionInvoiceSheet } from "../ClinicalSessionInvoiceSheet";
import { SessionMeetingControls } from "../SessionMeetingControls";
import {
  Panel,
  Field,
  Copy,
  Badge,
  Input,
  LoadState,
  pd,
  patientDate,
  patientMoney,
} from "./PatientDetailPrimitives";

const statusLabels: Record<string, string> = {
  COMPLETED: "Realizada",
  CONFIRMED: "Confirmada",
  PENDING: "Pendiente",
  CANCELLED: "Cancelada",
};
const typeLabels: Record<string, string> = {
  VIDEO_CALL: "Videollamada",
  IN_PERSON: "Presencial",
  PHONE_CALL: "Llamada",
};
const paymentLabel = (
  row: Partial<
    Pick<
      PatientSession,
      "collectionState" | "packageUses" | "invoice" | "paymentBooking" | "price"
    >
  > & { status: string },
) =>
  row.collectionState
    ? {
        PACKAGE: "Bono",
        PAID: "Pagada",
        NOT_APPLICABLE: "No aplica",
        PENDING: "Pendiente",
        UNRECORDED: "Sin registrar",
      }[row.collectionState]
    : row.packageUses?.length
      ? "Bono"
      : row.invoice?.status === "PAID" || row.paymentBooking?.paidAt
        ? "Pagada"
        : row.status === "CANCELLED" || row.price?.amount === 0
          ? "No aplica"
          : row.invoice?.status === "SENT" || row.paymentBooking
            ? "Pendiente"
            : "Sin registrar";
export function PatientSessionsPanel({
  client,
  focusSessionId,
  onClinical,
  onSchedule,
  onRefresh,
  refreshVersion = 0,
}: {
  client: professional.Client;
  focusSessionId?: string;
  onClinical: (sessionId: string) => void;
  onSchedule: () => void;
  onRefresh: () => Promise<void>;
  refreshVersion?: number;
}) {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const compact = width < 1180;
  const navigation = useNavigation<AppNavigationProp>();
  const appAlert = useAppAlert();
  const [query, setQuery] = useState<PatientSessionFilters>({ page: 1 });
  const [data, setData] = useState<PatientSessionPage | null>(null);
  const [selectedRecord, setSelected] = useState<PatientSession | null>(null);
  const [selectedId, setSelectedId] = useState(focusSessionId || "");
  const selected = selectedRecord?.id === selectedId ? selectedRecord : null;
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(Boolean(focusSessionId));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [editing, setEditing] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [invoices, setInvoices] = useState<AttachableInvoiceSummary[]>([]);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const invoiceRequest = useRef(0);
  const waitingForDetail =
    !selected &&
    (detailLoading || (!error && (loading || Boolean(selectedId))));
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    const timer = setTimeout(() => {
      void getPatientSessions(client.id, query)
        .then((page) => {
          if (!active) return;
          setData(page);
          setSelectedId(
            (current) =>
              page.items.find((row) => row.id === current)?.id ||
              (focusSessionId === current &&
              !Object.entries(query).some(
                ([key, value]) => key !== "page" && value,
              )
                ? current
                : "") ||
              page.items[0]?.id ||
              "",
          );
        })
        .catch((e) => {
          if (active) {
            setData(null);
            setError(getErrorMessage(e, "No se pudieron cargar las sesiones."));
          }
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 200);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [client.id, query, revision, focusSessionId, refreshVersion]);
  useEffect(() => {
    if (focusSessionId) {
      setSelectedId(focusSessionId);
      setDetailOpen(true);
    }
  }, [focusSessionId]);
  useEffect(() => {
    setSelected(null);
    setInvoiceOpen(false);
    setInvoices([]);
    setInvoiceLoading(false);
    invoiceRequest.current += 1;
    if (!selectedId) {
      setDetailLoading(false);
      return;
    }
    let active = true;
    setDetailLoading(true);
    void professional
      .getProfessionalSessionDetail(selectedId)
      .then((row) => {
        if (!active) return;
        if (row.clientId !== client.id)
          throw new Error("La sesión no pertenece a esta ficha.");
        setSelected(row);
      })
      .catch((e) => {
        if (active) setError(getErrorMessage(e, "No se pudo abrir la sesión."));
      })
      .finally(() => {
        if (active) setDetailLoading(false);
      });
    return () => {
      active = false;
      invoiceRequest.current += 1;
    };
  }, [client.id, selectedId, revision, refreshVersion]);
  const changed = async () => {
    await onRefresh();
  };
  const run = async (action: () => Promise<unknown>) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      await action();
      await changed();
    } catch (e) {
      setError(getErrorMessage(e, "No se pudo completar la acción."));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };
  const filter = (value: Partial<PatientSessionFilters>) =>
    setQuery((current) => ({ ...current, ...value, page: 1 }));
  const cancel = async () => {
    if (!selected || busy) return;
    const row = selected;
    try {
      const payment = row.paymentBooking
        ? await getPayment(row.paymentBooking.id, false)
        : null;
      showAppAlert(
        appAlert,
        "Cancelar sesión",
        `Se cancelará la cita del ${patientDate(row.date, true)}.${payment ? ` Devolución: ${paymentAmount(payment.cancellationRefundCents)}.` : ""}`,
        [
          { text: "Volver", style: "cancel" },
          {
            text: "Cancelar sesión",
            style: "destructive",
            onPress: () => {
              void run(() =>
                payment
                  ? cancelPayment(
                      payment.id,
                      false,
                      payment.cancellationRefundCents,
                    )
                  : professional.updateSessionStatus(row.id, "CANCELLED"),
              );
            },
          },
        ],
      );
    } catch (e) {
      setError(getErrorMessage(e, "No se pudo comprobar el cobro."));
    }
  };
  const invoice = async () => {
    if (!selected) return;
    if (selected.invoice) {
      await run(() =>
        billingService.downloadInvoice(
          selected.invoice!.id,
          selected.invoice!.invoiceNumber,
        ),
      );
      return;
    }
    setInvoiceOpen(true);
    setInvoiceLoading(true);
    const request = ++invoiceRequest.current;
    try {
      const available = await billingService.getAttachableInvoicesForSession(
        selected.id,
      );
      if (request === invoiceRequest.current) setInvoices(available);
    } catch (e) {
      if (request !== invoiceRequest.current) return;
      setInvoiceOpen(false);
      setError(getErrorMessage(e, "No se pudieron cargar las facturas."));
    } finally {
      if (request === invoiceRequest.current) setInvoiceLoading(false);
    }
  };
  return (
    <View style={pd.stack}>
      <View style={pd.toolbar}>
        {compact && detailOpen ? (
          <Button
            variant="outline"
            size="small"
            onPress={() => setDetailOpen(false)}
          >
            ← Todas las sesiones
          </Button>
        ) : null}
        <LoadState
          error={error}
          onRetry={() => setRevision((value) => value + 1)}
        />
      </View>
      <View style={[pd.columns, compact && { flexDirection: "column" }]}>
        {!compact || !detailOpen ? (
          <View
            testID="patient-session-list-column"
            style={[pd.column, compact && pd.compactColumn]}
          >
            <Panel
              title="Sesiones"
              icon="calendar-outline"
              action={
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                >
                  <View style={{ width: 16 }}>
                    {loading && data ? (
                      <ActivityIndicator
                        size="small"
                        color={theme.primary}
                        accessibilityLabel="Actualizando sesiones"
                      />
                    ) : null}
                  </View>
                  <Button size="small" onPress={onSchedule}>
                    + Nueva sesión
                  </Button>
                </View>
              }
            >
              <Input
                accessibilityLabel="Buscar sesiones"
                placeholder="Buscar por servicio o tarifa…"
                value={query.search || ""}
                onChangeText={(search) => filter({ search })}
              />
              <SessionFilterControls query={query} onChange={filter} />
              <View>
                {!data && loading ? <PatientSessionListSkeleton /> : null}
                <View
                  style={{ opacity: loading && data ? 0.55 : 1 }}
                  pointerEvents={loading ? "none" : "auto"}
                >
                  {data?.items.map((row) => (
                    <AnimatedPressable
                      key={row.id}
                      accessibilityRole="button"
                      accessibilityState={{ selected: row.id === selectedId }}
                      hoverLift={false}
                      onPress={() => {
                        setSelectedId(row.id);
                        setDetailOpen(true);
                      }}
                      style={[
                        pd.row,
                        {
                          borderBottomColor: theme.borderLight,
                          backgroundColor:
                            row.id === selectedId
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
                        >
                          {patientDate(row.date, true)}
                        </Text>
                        <Badge
                          tone={
                            row.status === "COMPLETED" ? "success" : "neutral"
                          }
                        >
                          {statusLabels[row.status] || row.status}
                        </Badge>
                      </View>
                      <View style={pd.toolbar}>
                        <Copy muted>
                          {typeLabels[row.type] || row.type} · {row.duration}{" "}
                          min
                        </Copy>
                        <Badge
                          tone={
                            paymentLabel(row) === "Pagada"
                              ? "success"
                              : "neutral"
                          }
                        >
                          {paymentLabel(row)}
                        </Badge>
                      </View>
                    </AnimatedPressable>
                  ))}
                </View>
              </View>
              {!loading && data && !data.items.length ? (
                <Copy muted>
                  No hay sesiones que coincidan con estos filtros.
                </Copy>
              ) : null}
              {data ? (
                <PatientPagination
                  page={query.page || 1}
                  totalPages={data?.totalPages}
                  hasNext={Boolean(data && (query.page || 1) < data.totalPages)}
                  loading={loading}
                  summary={
                    data
                      ? `${data.total} ${data.total === 1 ? "sesión" : "sesiones"}`
                      : undefined
                  }
                  onPrevious={() =>
                    setQuery((current) => ({
                      ...current,
                      page: (current.page || 1) - 1,
                    }))
                  }
                  onNext={() =>
                    setQuery((current) => ({
                      ...current,
                      page: (current.page || 1) + 1,
                    }))
                  }
                />
              ) : null}
            </Panel>
          </View>
        ) : null}
        {!compact || detailOpen ? (
          <View
            testID="patient-session-detail-column"
            style={[pd.column, compact && pd.compactColumn]}
          >
            {waitingForDetail ? (
              <PatientSessionDetailSkeleton />
            ) : selected ? (
              <>
                <Panel
                  title={`Sesión del ${patientDate(selected.date)}`}
                  action={
                    selected.actions?.canModifySchedule ? (
                      <Button
                        size="small"
                        variant="outline"
                        disabled={busy}
                        onPress={() => setEditing(true)}
                      >
                        Editar
                      </Button>
                    ) : undefined
                  }
                >
                  <View
                    style={{
                      flexDirection: "row",
                      flexWrap: "wrap",
                      columnGap: 16,
                      rowGap: 4,
                    }}
                  >
                    {[
                      {
                        label: "Fecha y hora",
                        value: patientDate(selected.date, true),
                      },
                      {
                        label: "Duración",
                        value: `${selected.duration} minutos`,
                      },
                      {
                        label: "Modalidad",
                        value: typeLabels[selected.type] || selected.type,
                      },
                      {
                        label: "Profesional",
                        value: selected.professional.displayName,
                      },
                      {
                        label: "Tarifa / Servicio",
                        value:
                          selected.bookedServiceName ||
                          selected.price.tariffName,
                      },
                      {
                        label: "Importe",
                        value:
                          selected.price.amount === null
                            ? "Sin precio registrado"
                            : patientMoney(
                                Math.round(selected.price.amount * 100),
                              ),
                      },
                      {
                        label: "Estado",
                        value: statusLabels[selected.status] || selected.status,
                      },
                      { label: "Pago", value: paymentLabel(selected) },
                    ].map((item) => (
                      <View
                        key={item.label}
                        style={{
                          flexBasis: width >= 720 ? "46%" : "100%",
                          flexGrow: 1,
                          minWidth: 0,
                        }}
                      >
                        <Field
                          stacked={width >= 720}
                          label={item.label}
                          value={item.value}
                        />
                      </View>
                    ))}
                  </View>
                  {selected.type === "VIDEO_CALL" ? (
                    <>
                      <SessionMeetingControls
                        compact
                        key={selected.id}
                        sessionId={selected.id}
                      />
                      {selected.actions?.canJoinVideo ? (
                        <Button
                          size="small"
                          variant="outline"
                          disabled={busy}
                          onPress={() =>
                            void run(() =>
                              openSessionMeeting(selected.id, () =>
                                professional.getMeetingLink(selected.id),
                              ),
                            )
                          }
                        >
                          Unirse a la sesión
                        </Button>
                      ) : null}
                    </>
                  ) : null}
                  <View style={pd.filters}>
                    {selected.actions?.canConfirm ? (
                      <Button
                        size="small"
                        disabled={busy}
                        onPress={() =>
                          void run(() =>
                            professional.updateSessionStatus(
                              selected.id,
                              "CONFIRMED",
                            ),
                          )
                        }
                      >
                        Confirmar
                      </Button>
                    ) : null}
                    {selected.actions?.canComplete ? (
                      <Button
                        size="small"
                        disabled={busy}
                        onPress={() =>
                          void run(() =>
                            professional.updateSessionStatus(
                              selected.id,
                              "COMPLETED",
                            ),
                          )
                        }
                      >
                        Marcar realizada
                      </Button>
                    ) : null}
                    {selected.actions?.canCancel ? (
                      <Button
                        size="small"
                        variant="outline"
                        disabled={busy}
                        onPress={() => void cancel()}
                      >
                        Cancelar sesión
                      </Button>
                    ) : null}
                  </View>
                  <View
                    style={{
                      borderTopWidth: 1,
                      borderTopColor: theme.borderLight,
                      marginTop: 8,
                      paddingTop: 12,
                      gap: 6,
                    }}
                  >
                    <Text
                      accessibilityRole="header"
                      style={{
                        color: theme.textPrimary,
                        fontFamily: theme.fontSansSemiBold,
                        fontSize: 14,
                      }}
                    >
                      Facturación de esta sesión
                    </Text>
                    <Field
                      label="Factura"
                      value={
                        selected.invoice?.invoiceNumber ||
                        "Esta sesión no tiene factura vinculada"
                      }
                    />
                    <Button
                      size="small"
                      variant="outline"
                      disabled={busy}
                      onPress={() => void invoice()}
                    >
                      {selected.invoice ? "Ver factura" : "Gestionar factura"}
                    </Button>
                    {selected.invoice ? (
                      <>
                        <Field
                          label="Estado de factura"
                          value={
                            {
                              PAID: "Pagada",
                              SENT: "Emitida",
                              DRAFT: "Borrador",
                              CANCELLED: "Anulada",
                            }[selected.invoice.status] ||
                            selected.invoice.status
                          }
                        />
                        {selected.invoice.total !== undefined ? (
                          <Field
                            label="Importe de factura"
                            value={patientMoney(
                              Math.round(selected.invoice.total * 100),
                            )}
                          />
                        ) : null}
                      </>
                    ) : null}
                    <Text
                      accessibilityRole="header"
                      style={{
                        color: theme.textPrimary,
                        fontFamily: theme.fontSansSemiBold,
                        fontSize: 14,
                        marginTop: 8,
                      }}
                    >
                      Actividad de la sesión
                    </Text>
                    <Field
                      label="Creada"
                      value={
                        selected.createdAt
                          ? patientDate(selected.createdAt, true)
                          : null
                      }
                    />
                    <Field
                      label="Última actualización"
                      value={
                        selected.updatedAt
                          ? patientDate(selected.updatedAt, true)
                          : null
                      }
                    />
                  </View>
                </Panel>
                <Panel title="Información clínica" icon="lock-closed-outline">
                  <Copy muted>
                    Las notas, documentos y ejercicios de esta sesión se
                    consultan en el área clínica protegida.
                  </Copy>
                  <Button
                    size="small"
                    variant="outline"
                    onPress={() => onClinical(selected.id)}
                  >
                    Ver notas clínicas de esta sesión
                  </Button>
                </Panel>
              </>
            ) : (
              <Panel title="Detalle de la sesión" icon="document-text-outline">
                <Copy muted>
                  Selecciona una sesión del listado para consultar sus datos y
                  facturación.
                </Copy>
              </Panel>
            )}
          </View>
        ) : null}
      </View>
      <ManagedSessionSchedulerModal
        visible={editing}
        clients={[client]}
        mode="edit"
        editingSessionId={selected?.id}
        initialClientId={client.id}
        initialValues={
          selected &&
          ["VIDEO_CALL", "PHONE_CALL", "IN_PERSON"].includes(selected.type)
            ? {
                clientId: client.id,
                date: selected.date,
                duration: selected.duration,
                type:
                  selected.type === "VIDEO_CALL"
                    ? "VIDEO_CALL"
                    : selected.type === "PHONE_CALL"
                      ? "PHONE_CALL"
                      : "IN_PERSON",
                optionId: selected.privateOptionId,
                paidOnline: Boolean(selected.paymentBooking),
              }
            : null
        }
        saving={busy}
        onClose={() => {
          if (!busy) setEditing(false);
        }}
        onSubmit={async (input) => {
          if (!selected) return;
          await run(async () => {
            await professional.updateManagedSessionSchedule(selected.id, input);
            setEditing(false);
          });
        }}
      />
      <ClinicalSessionInvoiceSheet
        visible={invoiceOpen}
        session={selected}
        invoices={invoices}
        loading={invoiceLoading}
        attaching={busy}
        onClose={() => {
          if (!busy) setInvoiceOpen(false);
        }}
        onCreateNew={() =>
          void run(async () => {
            if (!selected) return;
            const row = await billingService.generateInvoiceFromSession(
              selected.id,
            );
            setInvoiceOpen(false);
            navigation.navigate("CreateInvoice", {
              invoiceId: row.id,
              returnToClientId: client.id,
            });
          })
        }
        onAttachInvoice={(id, send) =>
          void run(async () => {
            if (selected)
              await billingService.attachInvoiceToSession(
                selected.id,
                id,
                send,
              );
            setInvoiceOpen(false);
          })
        }
      />
    </View>
  );
}
