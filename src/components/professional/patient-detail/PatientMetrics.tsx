import React from "react";
import { View, Text, useWindowDimensions } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "../../../contexts/ThemeContext";
import type { PatientSummary } from "../../../services/patientDetailService";
import {
  LoadState,
  patientDate,
  patientMoney,
} from "./PatientDetailPrimitives";
export function PatientMetrics({
  summary,
  loading,
  error,
  onRetry,
}: {
  summary: PatientSummary | null;
  loading: boolean;
  error: string;
  onRetry: () => void;
}) {
  const { theme } = useTheme();
  const width = useWindowDimensions().width;
  const metrics: Array<{
    label: string;
    value: string;
    hint: string;
    icon: keyof typeof Ionicons.glyphMap;
  }> = [
    {
      label: "Próxima sesión",
      value: summary
        ? summary.nextSession
          ? patientDate(summary.nextSession.date, true)
          : "Sin cita programada"
        : "…",
      hint: summary?.nextSession
        ? `${summary.nextSession.duration} minutos`
        : "",
      icon: "calendar-outline",
    },
    {
      label: "Sesiones realizadas",
      value: summary ? String(summary.completed) : "…",
      hint: "",
      icon: "bar-chart-outline",
    },
    {
      label: "Última sesión",
      value: summary
        ? summary.lastSession
          ? patientDate(summary.lastSession.date)
          : "Sin sesiones realizadas"
        : "…",
      hint: "",
      icon: "time-outline",
    },
    {
      label: "Importe pendiente",
      value: summary ? patientMoney(summary.pendingAmountCents) : "…",
      hint: summary
        ? summary.pendingInvoiceCount
          ? `${summary.pendingInvoiceCount} ${summary.pendingInvoiceCount === 1 ? "factura pendiente" : "facturas pendientes"}`
          : ""
        : "Consultando facturación",
      icon: "receipt-outline",
    },
  ];
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {metrics.map((item) => (
          <View
            key={item.label}
            style={{
              flexBasis: width < 720 ? "46%" : "21%",
              flexGrow: 1,
              minWidth: 140,
              flexDirection: "row",
              alignItems: "center",
              minHeight: 66,
              gap: 9,
              paddingHorizontal: 12,
              paddingVertical: 7,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: theme.borderLight,
              backgroundColor: theme.bgCard,
            }}
          >
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 9,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: theme.primaryAlpha12,
              }}
            >
              <Ionicons name={item.icon} size={18} color={theme.primary} />
            </View>
            <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
              <Text
                style={{
                  fontFamily: theme.fontSans,
                  fontSize: 11,
                  lineHeight: 16,
                  color: theme.textSecondary,
                }}
              >
                {item.label}
              </Text>
              <Text
                style={{
                  fontFamily: theme.fontSansBold,
                  fontSize: 15,
                  lineHeight: 21,
                  color: theme.textPrimary,
                }}
              >
                {error ? "No disponible" : item.value}
              </Text>
              {item.hint && !error ? (
                <Text
                  style={{
                    fontFamily: theme.fontSans,
                    fontSize: 11,
                    lineHeight: 16,
                    color: theme.textSecondary,
                  }}
                >
                  {error ? "Reintenta la consulta" : item.hint}
                </Text>
              ) : null}
            </View>
          </View>
        ))}
      </View>
      <LoadState
        loading={loading && !summary && !error}
        error={error}
        onRetry={onRetry}
      />
    </View>
  );
}
