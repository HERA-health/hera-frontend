import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import * as WebBrowser from "expo-web-browser";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import type { AppNavigationProp, AppRouteProp } from "../../constants/types";
import { getErrorMessage } from "../../constants/errors";
import { PaymentButton as Button, paymentScreenStyles } from "../../components/payments/PaymentPresentation";
import { useAppAlert } from "../../components/common/alert";
import * as payments from "../../services/sessionPaymentService";
import { usePaymentPolling } from "../../components/payments/usePaymentPolling";

export function SessionPaymentScreen() {
  const { bookingId } = useRoute<AppRouteProp<"SessionPayment">>().params;
  const navigation = useNavigation<AppNavigationProp>();
  const { user } = useAuth();
  const [recoverAsGuest, setRecoverAsGuest] = useState(false);
  const guest = !user || recoverAsGuest;
  const professional = !guest && user?.type === "professional";
  const { theme } = useTheme();
  const alert = useAppAlert();
  const { width } = useWindowDimensions();
  const styles = paymentScreenStyles(theme, width);
  const [checking, setChecking] = useState(false);
  const [payment, setPayment] = useState<payments.SessionPayment>(),
    [busy, setBusy] = useState(true),
    [error, setError] = useState(""),
    [code, setCode] = useState(""),
    [sent, setSent] = useState(false),
    [amount, setAmount] = useState(""),
    [reason, setReason] = useState("");
  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (e) {
      setError(
        getErrorMessage(
          e,
          "No se pudo completar la operación. Puedes volver a intentarlo.",
        ),
      );
    } finally {
      setBusy(false);
    }
  };
  const currentAccess = `${bookingId}:${guest}`;
  const accessRef = useRef(currentAccess);
  accessRef.current = currentAccess;
  const inFlight = useRef<{
    key: string;
    reconcile: boolean;
    promise: Promise<void>;
  } | null>(null);
  const refresh = useCallback(
    async function refreshPayment(reconcile = false): Promise<void> {
      const key = `${bookingId}:${guest}`;
      const pending = inFlight.current;
      if (pending?.key === key) {
        if (!reconcile || pending.reconcile) return pending.promise;
        // A return from Checkout must still reconcile after an ordinary read.
        await pending.promise.catch(() => undefined);
        if (accessRef.current !== key) return;
        return refreshPayment(true);
      }
      if (reconcile) setChecking(true);
      const promise = payments
        .getPayment(bookingId, guest, reconcile)
        .then((result) => {
          if (accessRef.current === key) {
            setPayment(result);
            setError("");
          }
        });
      inFlight.current = { key, reconcile, promise };
      try {
        await promise;
      } finally {
        if (reconcile && accessRef.current === key) setChecking(false);
        if (inFlight.current?.promise === promise) inFlight.current = null;
      }
    },
    [bookingId, guest],
  );
  useEffect(() => {
    setPayment(undefined);
    void run(() => refresh());
  }, [refresh]);
  usePaymentPolling(
    Boolean(
      payment &&
      ([
        "PREPARING",
        "CHECKOUT",
        "PROCESSING",
        "CANCELLING",
        "AWAITING_ACCEPTANCE",
      ].includes(payment.status) ||
        payment.operationsPending),
    ),
    refresh,
    (e) =>
      setError(
        getErrorMessage(
          e,
          "No se pudo actualizar el pago. Volveremos a comprobarlo automáticamente.",
        ),
      ),
  );
  const textStyle = styles.body;
  const inputStyle = {
    padding: 12,
    fontFamily: theme.fontSans,
    borderWidth: 1,
    borderColor: theme.border,
    color: theme.textPrimary,
    borderRadius: 8,
  };
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={styles.page}
    >
      <View
        style={styles.container}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Button
            variant="ghost"
            onPress={() =>
              user?.type === "professional"
                ? navigation.navigate("ProfessionalPayments")
                : user
                  ? navigation.navigate("Sessions")
                  : navigation.navigate("Landing")
            }
          >
            {user?.type === "professional"
              ? "Volver a Cobros"
              : user
                ? "Volver a mis citas"
                : "Volver al inicio"}
          </Button>
          <Text style={[textStyle, { alignSelf: "center", fontSize: 13 }]}>
            Reserva y pago
          </Text>
        </View>
        <Text
          accessibilityRole="header"
          style={styles.heading}
        >
          {checking && (!payment || payment.status === "CHECKOUT")
            ? "Comprobando el pago"
            : payment
              ? payments.paymentStatus(payment.status)
              : "Tu reserva"}
        </Text>
        {(busy || checking) && <ActivityIndicator color={theme.primary} />}
        {!!error && (
          <Text accessibilityRole="alert" style={{ color: theme.error }}>
            {error}
          </Text>
        )}
        {!payment && guest && !busy && (
          <View style={{ gap: 16 }}>
            <Text style={textStyle}>
              Recupera el acceso con el correo utilizado en la reserva. No
              necesitas crear una cuenta.
            </Text>
            <Button
              disabled={busy}
              onPress={() =>
                void run(async () => {
                  await payments.requestPaymentAccess(bookingId);
                  setSent(true);
                })
              }
            >
              {sent ? "Reenviar código" : "Recibir código por correo"}
            </Button>
            {sent && (
              <>
                <TextInput
                  accessibilityLabel="Código de acceso"
                  keyboardType="number-pad"
                  maxLength={6}
                  value={code}
                  onChangeText={setCode}
                  placeholder="Código de 6 cifras"
                  placeholderTextColor={theme.textSecondary}
                  style={inputStyle}
                />
                <Button
                  disabled={busy || code.length !== 6}
                  onPress={() =>
                    void run(async () => {
                      await payments.verifyPaymentAccess(bookingId, code);
                      await refresh();
                    })
                  }
                >
                  Consultar reserva
                </Button>
              </>
            )}
          </View>
        )}
        {!payment && !guest && !busy && (
          <View style={{ gap: 12 }}>
            <Text style={textStyle}>
              Si reservaste sin cuenta o con otro correo, verifica el correo de
              esa reserva para consultar el pago.
            </Text>
            <Button onPress={() => setRecoverAsGuest(true)}>
              Recuperar con el correo de la reserva
            </Button>
          </View>
        )}
        {payment && (
          <View
            style={styles.columns}
          >
            <View
              style={styles.card}
            >
              <View
                style={styles.summary}
              >
                <Text style={[textStyle, { fontSize: 13 }]}>
                  Importe de la sesión
                </Text>
                <Text
                  style={styles.amount}
                >
                  {payments.paymentAmount(payment.totalCents)}
                </Text>
                <Text style={textStyle}>
                  {professional ? payment.patientName : payment.specialistName}
                </Text>
                <Text style={textStyle}>
                  {new Date(payment.date).toLocaleDateString("es-ES", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    timeZone: "Europe/Madrid",
                  })}{" "}
                  ·{" "}
                  {new Date(payment.date).toLocaleTimeString("es-ES", {
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: "Europe/Madrid",
                  })}
                  {" · Hora peninsular"}
                </Text>
              </View>
              {payment.status === "PREPARING" && (
                <Text style={textStyle}>
                  Estamos preparando tu pago. Si tarda, puedes actualizar esta
                  reserva sin iniciar otro cobro.
                </Text>
              )}
              {payment.checkoutUrl && !checking && (
                <>
                  <Text style={textStyle}>
                    Completa el pago antes de las{" "}
                    {new Date(payment.expiresAt).toLocaleTimeString("es-ES", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {" para continuar con tu reserva."}
                  </Text>
                  <Text style={textStyle}>
                    Te llevaremos a Stripe para pagar de forma segura. Al
                    terminar, volverás aquí para ver el estado de tu cita.
                  </Text>
                  <Button
                    disabled={busy}
                    size="medium"
                    accessibilityLabel={`Pagar ${payments.paymentAmount(payment.totalCents)}`}
                    icon={
                      <Feather
                        name="credit-card"
                        size={20}
                        color={theme.actionPrimaryText}
                      />
                    }
                    onPress={() =>
                      void run(async () => {
                        await payments.openCheckout(payment.checkoutUrl!);
                        if (Platform.OS !== "web") await refresh(true);
                      })
                    }
                  >
                    Pagar {payments.paymentAmount(payment.totalCents)}
                  </Button>
                </>
              )}
              {payment.status === "PROCESSING" && (
                <Text style={textStyle}>
                  Stripe está comprobando el pago. Conservamos tu reserva
                  mientras resolvemos el resultado.
                </Text>
              )}
              {payment.acceptanceDeadline &&
                payment.status === "AWAITING_ACCEPTANCE" && (
                  <Text style={textStyle}>
                    La aceptación vence el{" "}
                    {new Date(payment.acceptanceDeadline).toLocaleString(
                      "es-ES",
                    )}
                    . Si no se acepta a tiempo, se tramitará la devolución.
                  </Text>
                )}
              {!!payment.paidAt && (
                <Text style={textStyle}>
                  Cobro verificado ·{" "}
                  {new Date(payment.paidAt).toLocaleString("es-ES", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: "Europe/Madrid",
                  })}
                </Text>
              )}
              {professional && payment.paidAt && (
                <Text style={textStyle}>
                  Coste Stripe:{" "}
                  {payment.feeCents == null
                    ? "pendiente de conciliación"
                    : payments.paymentAmount(payment.feeCents)}{" "}
                  · Neto tras devoluciones:{" "}
                  {payment.netCents == null
                    ? payment.dispute
                      ? "no conciliado; consulta los movimientos en Stripe"
                      : "pendiente"
                    : payments.paymentAmount(payment.netCents)}
                </Text>
              )}
              {payment.dispute && (
                <View style={{ gap: 12 }}>
                  <Text style={{ color: theme.error }}>
                    Disputa: {payment.dispute.status}
                    {payment.dispute.deadline
                      ? ` · responder antes del ${new Date(payment.dispute.deadline).toLocaleString("es-ES")}`
                      : ""}
                  </Text>
                  {professional && (
                    <Button
                      variant="outline"
                      onPress={() =>
                        void WebBrowser.openBrowserAsync(
                          "https://dashboard.stripe.com/disputes",
                        )
                      }
                    >
                      Gestionar disputa en Stripe
                    </Button>
                  )}
                </View>
              )}
              {payment.issueCode && (
                <Text style={{ color: theme.error }}>
                  {professional
                    ? payment.issueCode === "REFUND_RECONCILIATION_REQUIRED"
                      ? "Los importes devueltos o disputados necesitan conciliación. Contacta con soporte antes de realizar más devoluciones."
                      : "Esta operación necesita revisión. Comprueba el estado o reintenta las operaciones pendientes."
                    : payment.issueCode === "CHECKOUT_CONFIGURATION_INVALID"
                      ? "No se pudo preparar este pago. Contacta con tu especialista antes de intentarlo de nuevo."
                      : "Estamos revisando esta operación. El estado se actualizará aquí."}
                </Text>
              )}
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
                <Button
                  disabled={busy}
                  variant="outline"
                  accessibilityLabel="Comprobar estado"
                  icon={
                    <Feather
                      name="refresh-cw"
                      size={16}
                      color={theme.primary}
                    />
                  }
                  onPress={() => void run(() => refresh(true))}
                >
                  Comprobar estado
                </Button>
                {payment.canAccept && (
                  <Button
                    disabled={busy}
                    onPress={() =>
                      void run(async () => {
                        setPayment(await payments.acceptPayment(bookingId));
                      })
                    }
                  >
                    Aceptar cita
                  </Button>
                )}
                {payment.canCancel && (
                  <Button
                    variant="ghost"
                    disabled={busy}
                    onPress={() =>
                      void run(async () => {
                        if (
                          await alert.confirm({
                            title: "Cancelar reserva",
                            message: `Se solicitará una devolución de ${payments.paymentAmount(payment.cancellationRefundCents)}. ${payment.cancellationRefundCents === 0 && payment.paidAt ? "Esta cancelación no tiene devolución automática." : ""}`,
                            confirmLabel: "Cancelar reserva",
                            destructive: true,
                          })
                        )
                          setPayment(
                            await payments.cancelPayment(
                              bookingId,
                              guest,
                              payment.cancellationRefundCents,
                            ),
                          );
                      })
                    }
                  >
                    Cancelar reserva
                  </Button>
                )}
              </View>
              {!!payment.refunds.length && (
                <View style={{ gap: 10 }}>
                  <Text
                    style={{
                      color: theme.textPrimary,
                      fontSize: 20,
                      fontFamily: theme.fontSansBold,
                    }}
                  >
                    Devoluciones
                  </Text>
                  {payment.refunds.map((r) => (
                    <Text key={r.id} style={textStyle}>
                      {payments.paymentAmount(r.amountCents)} ·{" "}
                      {{
                        SUCCEEDED: "Devuelta",
                        REQUESTED: "Solicitada",
                        PENDING: "En curso",
                        FAILED: "Fallida",
                        CANCELLED: "Anulada",
                        BLOCKED_DISPUTE: "Pendiente de resolver la disputa",
                        DISPUTE_SETTLED:
                          "Resuelta mediante disputa; no se enviará otra devolución",
                      }[r.status] ?? r.status}
                    </Text>
                  ))}
                </View>
              )}
              {payment.canRefund && (
                <View
                  style={{
                    gap: 12,
                    paddingVertical: 16,
                    borderTopWidth: 1,
                    borderColor: theme.border,
                  }}
                >
                  <Text
                    style={{
                      color: theme.textPrimary,
                      fontSize: 20,
                      fontFamily: theme.fontSansBold,
                    }}
                  >
                    Devolución voluntaria
                  </Text>
                  <Text style={textStyle}>
                    Disponible:{" "}
                    {payments.paymentAmount(payment.refundableCents)}
                  </Text>
                  <TextInput
                    accessibilityLabel="Importe a devolver en euros"
                    value={amount}
                    onChangeText={setAmount}
                    keyboardType="decimal-pad"
                    placeholder="Importe en euros"
                    placeholderTextColor={theme.textSecondary}
                    style={inputStyle}
                  />
                  <TextInput
                    accessibilityLabel="Motivo de devolución"
                    value={reason}
                    onChangeText={setReason}
                    maxLength={300}
                    placeholder="Motivo (sin información clínica)"
                    placeholderTextColor={theme.textSecondary}
                    style={inputStyle}
                  />
                  <Button
                    disabled={
                      busy ||
                      !/^\d+(?:[.,]\d{1,2})?$/.test(amount) ||
                      reason.trim().length < 3
                    }
                    onPress={() =>
                      void run(async () => {
                        const cents = Math.round(
                          Number(amount.replace(",", ".")) * 100,
                        );
                        if (cents <= 0 || cents > payment.refundableCents)
                          throw new Error("Revisa el importe disponible.");
                        if (
                          await alert.confirm({
                            title: "Confirmar devolución",
                            message: `${payments.paymentAmount(cents)} · ${reason}`,
                            confirmLabel: "Solicitar devolución",
                          })
                        ) {
                          await payments.refundPayment(
                            bookingId,
                            cents,
                            reason.trim(),
                          );
                          await refresh();
                          setAmount("");
                          setReason("");
                        }
                      })
                    }
                  >
                    Revisar devolución
                  </Button>
                </View>
              )}
            </View>
            <View
              style={styles.aside}
            >
              <View style={{ gap: 12 }}>
                <Feather name="file-text" size={22} color={theme.primary} />
                <Text
                  style={{
                    color: theme.textPrimary,
                    fontSize: 20,
                    fontFamily: theme.fontSansBold,
                  }}
                >
                  Documentos
                </Text>
                {!payment.documents.length && (
                  <Text style={textStyle}>
                    {payment.paidAt
                      ? "Te enviaremos la factura al correo de la reserva cuando esté emitida."
                      : "La factura estará disponible al verificar el cobro."}
                  </Text>
                )}
                {payment.documents.map((doc) => (
                  <Button
                    key={doc.id}
                    disabled={busy}
                    variant="outline"
                    onPress={() =>
                      void run(() =>
                        payments.downloadPaymentDocument(
                          bookingId,
                          doc.id,
                          guest,
                        ),
                      )
                    }
                  >
                    {doc.documentPurpose === "RECTIFICATION"
                      ? "Rectificativa"
                      : "Factura de anticipo"}{" "}
                    {doc.invoiceNumber} ·{" "}
                    {payments.paymentAmount(doc.totalCents)}
                  </Button>
                ))}
              </View>
              {professional &&
                payment.issueCode !== "REFUND_RECONCILIATION_REQUIRED" &&
                (payment.issueCode || payment.issues.length > 0) && (
                  <Button
                    variant="outline"
                    disabled={busy}
                    onPress={() =>
                      void run(async () => {
                        await payments.retryPayment(bookingId);
                        await refresh(true);
                      })
                    }
                  >
                    Reintentar operaciones pendientes
                  </Button>
                )}
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
