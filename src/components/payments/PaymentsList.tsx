import React, { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../../contexts/ThemeContext";
import type { AppNavigationProp } from "../../constants/types";
import { getErrorMessage } from "../../constants/errors";
import {
  listPayments,
  paymentAmount,
  paymentStatus,
  type SessionPayment,
} from "../../services/sessionPaymentService";
import { AnimatedPressable } from "../common/AnimatedPressable";
import { Feather } from "@expo/vector-icons";
import { Button } from "../common/Button";

export function PaymentsList({ action }: { action?: React.ReactNode }) {
  const { theme } = useTheme();
  const navigation = useNavigation<AppNavigationProp>();
  const [rows, setRows] = useState<SessionPayment[]>([]),
    [page, setPage] = useState(0),
    [more, setMore] = useState(false),
    [busy, setBusy] = useState(true),
    [error, setError] = useState("");
  const load = async (next: number) => {
    setBusy(true);
    setError("");
    try {
      const result = await listPayments(next);
      setRows(result.items);
      setMore(result.hasMore);
      setPage(next);
    } catch (e) {
      setError(getErrorMessage(e, "No se pudieron cargar los pagos."));
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    void load(0);
  }, []);
  return (
    <View style={{ gap: 16 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <Text
          style={{
            color: theme.textPrimary,
            fontSize: 22,
            fontFamily: theme.fontSansBold,
          }}
        >
          Pagos de sesiones
        </Text>
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 8,
            alignItems: "center",
          }}
        >
          {action}
          <Button
            variant="ghost"
            size="small"
            style={{ minHeight: 44 }}
            disabled={busy}
            onPress={() => void load(page)}
          >
            Actualizar
          </Button>
        </View>
      </View>
      <Text
        style={{
          color: theme.textSecondary,
          fontFamily: theme.fontSans,
          fontSize: 15,
          lineHeight: 22,
        }}
      >
        Reservas pagadas en HERA, devoluciones y facturas.
      </Text>
      {busy && <ActivityIndicator color={theme.primary} />}
      {!!error && (
        <Text
          accessibilityRole="alert"
          style={{ color: theme.error, fontFamily: theme.fontSans }}
        >
          {error}
        </Text>
      )}
      {!busy && !error && !rows.length && (
        <View
          style={{ paddingVertical: 28, gap: 10, alignItems: "flex-start" }}
        >
          <Feather name="inbox" size={24} color={theme.textSecondary} />
          <Text
            style={{
              fontFamily: theme.fontSansBold,
              color: theme.textPrimary,
              fontSize: 17,
            }}
          >
            Tus pagos aparecerán aquí
          </Text>
          <Text
            style={{
              fontFamily: theme.fontSans,
              color: theme.textSecondary,
              fontSize: 15,
            }}
          >
            Cuando recibas un pago, podrás consultar su estado, la factura y las
            devoluciones.
          </Text>
        </View>
      )}
      {rows.map((row) => (
        <AnimatedPressable
          hoverLift={false}
          pressScale={1}
          key={row.id}
          accessibilityRole="button"
          onPress={() =>
            navigation.navigate("SessionPayment", { bookingId: row.id })
          }
          style={{
            paddingVertical: 18,
            borderBottomWidth: 1,
            borderColor: theme.border,
            gap: 7,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              gap: 16,
            }}
          >
            <Text
              style={{
                color: theme.textPrimary,
                fontFamily: theme.fontSansBold,
                flex: 1,
              }}
            >
              {row.patientName ?? row.specialistName}
            </Text>
            <Text
              style={{
                color: theme.textPrimary,
                fontFamily: theme.fontSansBold,
              }}
            >
              {paymentAmount(row.totalCents)}
            </Text>
          </View>
          <Text
            style={{
              color: theme.textSecondary,
              fontFamily: theme.fontSans,
              fontSize: 15,
              lineHeight: 22,
            }}
          >
            {new Date(row.date).toLocaleString("es-ES")} ·{" "}
            {paymentStatus(row.status)}
          </Text>
          {row.refundedCents > 0 && (
            <Text
              style={{
                color: theme.textSecondary,
                fontFamily: theme.fontSans,
                fontSize: 15,
                lineHeight: 22,
              }}
            >
              Devuelto: {paymentAmount(row.refundedCents)}
            </Text>
          )}
          {(row.issueCode || row.dispute) && (
            <Text style={{ color: theme.error }}>Necesita revisión</Text>
          )}
        </AnimatedPressable>
      ))}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        {page > 0 && (
          <Button
            disabled={busy}
            variant="outline"
            onPress={() => void load(page - 1)}
          >
            Anterior
          </Button>
        )}
        {more && (
          <Button
            disabled={busy}
            variant="outline"
            onPress={() => void load(page + 1)}
          >
            Siguiente
          </Button>
        )}
      </View>
    </View>
  );
}
