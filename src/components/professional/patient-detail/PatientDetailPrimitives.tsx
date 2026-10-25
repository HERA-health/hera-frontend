import React from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  type TextInputProps,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Button } from "../../common";
import { useTheme } from "../../../contexts/ThemeContext";

export const patientDate = (value?: string | null, time = false) =>
  value
    ? new Intl.DateTimeFormat("es-ES", {
        timeZone: "Europe/Madrid",
        day: "numeric",
        month: "short",
        year: "numeric",
        ...(time ? { hour: "2-digit", minute: "2-digit" } : {}),
      }).format(new Date(value))
    : "Sin fecha registrada";
export const patientMoney = (cents: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(
    cents / 100,
  );
export function Panel({
  title,
  icon = "document-text-outline",
  action,
  children,
}: {
  title: string;
  icon?: keyof typeof Ionicons.glyphMap;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { theme } = useTheme();
  return (
    <View
      style={[
        pd.panel,
        { backgroundColor: theme.bgCard, borderColor: theme.borderLight },
      ]}
    >
      <View style={pd.panelHeading}>
        <View style={[pd.icon, { backgroundColor: theme.primaryAlpha12 }]}>
          <Ionicons name={icon} size={18} color={theme.primary} />
        </View>
        <Text
          accessibilityRole="header"
          style={[
            pd.panelTitle,
            { color: theme.textPrimary, fontFamily: theme.fontSansBold },
          ]}
        >
          {title}
        </Text>
        {action}
      </View>
      {children}
    </View>
  );
}
export function Field({
  label,
  value,
  children,
  stacked = false,
}: {
  label: string;
  value?: string | null;
  children?: React.ReactNode;
  stacked?: boolean;
}) {
  const { theme } = useTheme();
  return (
    <View
      style={[
        pd.field,
        { borderBottomColor: theme.borderLight },
        stacked && { flexDirection: "column", gap: 2 },
      ]}
    >
      <Text
        style={[
          pd.label,
          stacked && { width: "100%", fontSize: 11, lineHeight: 16 },
          { color: theme.textSecondary, fontFamily: theme.fontSans },
        ]}
      >
        {label}
      </Text>
      {children ?? (
        <Text
          selectable
          style={[
            pd.value,
            {
              color: value ? theme.textPrimary : theme.textMuted,
              fontFamily: theme.fontSans,
            },
          ]}
        >
          {value || "Sin registrar"}
        </Text>
      )}
    </View>
  );
}
export function Copy({
  children,
  muted = false,
}: {
  children: React.ReactNode;
  muted?: boolean;
}) {
  const { theme } = useTheme();
  return (
    <Text
      style={{
        color: muted ? theme.textSecondary : theme.textPrimary,
        fontFamily: theme.fontSans,
        fontSize: 13,
        lineHeight: 21,
      }}
    >
      {children}
    </Text>
  );
}
export function Input(props: TextInputProps) {
  const { theme } = useTheme();
  return (
    <TextInput
      placeholderTextColor={theme.textMuted}
      {...props}
      style={[
        pd.input,
        {
          color: theme.textPrimary,
          borderColor: theme.border,
          backgroundColor: theme.bgCard,
          fontFamily: theme.fontSans,
        },
        props.multiline && { minHeight: 180, textAlignVertical: "top" },
        props.style,
      ]}
    />
  );
}
export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "success" | "warning";
}) {
  const { theme } = useTheme();
  return (
    <Text
      style={{
        alignSelf: "flex-start",
        fontSize: 11,
        lineHeight: 18,
        paddingHorizontal: 9,
        paddingVertical: 2,
        borderRadius: 12,
        color:
          tone === "success"
            ? theme.success
            : tone === "warning"
              ? theme.warning
              : theme.primary,
        backgroundColor:
          tone === "success"
            ? theme.successBg
            : tone === "warning"
              ? theme.warningBg
              : theme.bgMuted,
        fontFamily: theme.fontSansSemiBold,
      }}
    >
      {children}
    </Text>
  );
}
export function LoadState({
  loading,
  error,
  onRetry,
}: {
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
}) {
  const { theme } = useTheme();
  return loading ? (
    <ActivityIndicator style={{ padding: 24 }} color={theme.primary} />
  ) : error ? (
    <View style={{ gap: 8, padding: 12 }}>
      <Text
        accessibilityRole="alert"
        style={{ color: theme.error, fontFamily: theme.fontSans }}
      >
        {error}
      </Text>
      {onRetry ? (
        <Button variant="outline" size="small" onPress={onRetry}>
          Reintentar
        </Button>
      ) : null}
    </View>
  ) : null;
}
export function DetailDialog({
  title,
  visible,
  busy = false,
  onClose,
  children,
  footer,
  maxWidth = 760,
}: {
  title: string;
  visible: boolean;
  busy?: boolean;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: number;
}) {
  const { theme } = useTheme();
  const { height } = useWindowDimensions();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!busy) onClose();
      }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={[pd.backdrop, { backgroundColor: theme.overlay }]}
      >
        <View style={pd.dialogCenter}>
          <View
            style={[
              pd.dialog,
              {
                backgroundColor: theme.bgCard,
                maxHeight: height - 40,
                maxWidth,
              },
            ]}
            accessibilityViewIsModal
          >
            <View style={pd.toolbar}>
              <Text
                accessibilityRole="header"
                style={[
                  pd.dialogTitle,
                  { color: theme.textPrimary, fontFamily: theme.fontSansBold },
                ]}
              >
                {title}
              </Text>
              <Button
                size="small"
                variant="outline"
                disabled={busy}
                onPress={onClose}
                accessibilityLabel="Cerrar"
              >
                Cerrar
              </Button>
            </View>
            <ScrollView
              style={{ flexShrink: 1, minHeight: 0 }}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={pd.dialogBody}
            >
              {children}
            </ScrollView>
            {footer ? (
              <View
                style={[pd.dialogFooter, { borderTopColor: theme.borderLight }]}
              >
                {footer}
              </View>
            ) : null}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
export const pd = StyleSheet.create({
  stack: { gap: 14 },
  columns: { flexDirection: "row", alignItems: "flex-start", gap: 16 },
  column: { flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 0, gap: 16 },
  compactColumn: {
    width: "100%",
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: "auto",
  },
  panel: { borderWidth: 1, borderRadius: 12, padding: 14, gap: 6, minWidth: 0 },
  panelHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginBottom: 3,
  },
  icon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  panelTitle: { flex: 1, fontSize: 15, lineHeight: 21 },
  field: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
    paddingVertical: 5,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  label: { width: "38%", fontSize: 12, lineHeight: 20 },
  value: { flex: 1, fontSize: 13, lineHeight: 20 },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    flexWrap: "wrap",
  },
  filters: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    minHeight: 42,
    paddingHorizontal: 11,
    paddingVertical: 10,
    fontSize: 13,
  },
  row: {
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 5,
    minHeight: 65,
  },
  rowHeading: { flexDirection: "row", alignItems: "center", gap: 9 },
  rowTitle: { fontSize: 13, lineHeight: 20, flex: 1 },
  tabs: { flexDirection: "row", gap: 18, borderBottomWidth: 1 },
  tab: { paddingVertical: 12, borderBottomWidth: 2 },
  backdrop: { flex: 1 },
  dialogCenter: { flex: 1, justifyContent: "center", padding: 20 },
  dialog: {
    flexShrink: 1,
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
    padding: 20,
    borderRadius: 16,
    gap: 14,
  },
  dialogTitle: { fontSize: 20, lineHeight: 28, flex: 1 },
  dialogBody: { gap: 14, paddingBottom: 4 },
  dialogFooter: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
    flexDirection: "row",
    justifyContent: "flex-end",
    flexWrap: "wrap",
    gap: 8,
  },
});
