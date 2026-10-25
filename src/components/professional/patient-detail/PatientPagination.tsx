import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { AnimatedPressable } from "../../common";
import { useTheme } from "../../../contexts/ThemeContext";

export function PatientPagination({
  page,
  totalPages,
  hasNext,
  loading = false,
  summary,
  onPrevious,
  onNext,
}: {
  page: number;
  totalPages?: number;
  hasNext: boolean;
  loading?: boolean;
  summary?: string;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const { theme } = useTheme();
  const multiple = page > 1 || hasNext || (totalPages ?? 0) > 1;
  if (!multiple && !summary && !loading) return null;
  const label = totalPages
    ? `Página ${page} de ${totalPages}`
    : `Página ${page}`;
  return (
    <View style={[styles.footer, { borderTopColor: theme.borderLight }]}>
      <Text
        style={[
          styles.summary,
          { color: theme.textSecondary, fontFamily: theme.fontSans },
        ]}
      >
        {summary || (loading ? "Cargando…" : "")}
      </Text>
      {multiple ? (
        <View
          style={[
            styles.controls,
            { borderColor: theme.border, backgroundColor: theme.bgCard },
          ]}
        >
          {(
            [
              {
                label: "Página anterior",
                icon: "chevron-back",
                disabled: page <= 1 || loading,
                action: onPrevious,
              },
              {
                label: "Página siguiente",
                icon: "chevron-forward",
                disabled: !hasNext || loading,
                action: onNext,
              },
            ] as const
          ).map((control, index) => (
            <React.Fragment key={control.label}>
              {index === 1 ? (
                <Text
                  accessibilityLabel={label}
                  accessibilityLiveRegion="polite"
                  style={[
                    styles.page,
                    {
                      color: theme.textSecondary,
                      backgroundColor: theme.primaryAlpha12,
                      fontFamily: theme.fontSans,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: theme.textPrimary,
                      fontFamily: theme.fontSansBold,
                    }}
                  >
                    {page}
                  </Text>
                  {totalPages ? ` / ${totalPages}` : ""}
                </Text>
              ) : null}
              <AnimatedPressable
                accessibilityLabel={control.label}
                accessibilityState={{
                  disabled: control.disabled,
                  busy: loading,
                }}
                disabled={control.disabled}
                onPress={control.action}
                hoverLift={false}
                style={styles.arrow}
              >
                <Ionicons
                  name={control.icon}
                  size={17}
                  color={control.disabled ? theme.textMuted : theme.primary}
                />
              </AnimatedPressable>
            </React.Fragment>
          ))}
        </View>
      ) : !loading && summary ? (
        <Text
          style={[
            styles.single,
            { color: theme.textSecondary, fontFamily: theme.fontSans },
          ]}
        >
          Página única
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "flex-end",
    columnGap: 12,
    rowGap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    marginTop: 4,
  },
  summary: { flexGrow: 1, flexShrink: 1, fontSize: 12, lineHeight: 18 },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    padding: 2,
  },
  arrow: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  page: {
    minWidth: 52,
    paddingHorizontal: 10,
    paddingVertical: 6,
    textAlign: "center",
    borderRadius: 6,
    fontSize: 13,
    lineHeight: 20,
  },
  single: { fontSize: 12, lineHeight: 18 },
});
