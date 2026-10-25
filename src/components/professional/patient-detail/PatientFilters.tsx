import React, { useState } from "react";
import { View, Text } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Button, AnimatedPressable } from "../../common";
import { useTheme } from "../../../contexts/ThemeContext";
import { DetailDialog, pd } from "./PatientDetailPrimitives";

export function PatientFilters({
  count,
  onApply,
  onClear,
  children,
  onOpen,
  title = "Filtros",
}: {
  count: number;
  onApply: () => void;
  onClear: () => void;
  onOpen: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  const [open, setOpen] = useState(false);
  const { theme } = useTheme();
  return (
    <>
      <Button
        variant="outline"
        size="small"
        style={{ alignSelf: "flex-start" }}
        accessibilityLabel={title}
        icon={
          <Ionicons name="options-outline" size={16} color={theme.primary} />
        }
        onPress={() => {
          onOpen();
          setOpen(true);
        }}
      >
        {title}
        {count ? ` (${count})` : ""}
      </Button>
      <DetailDialog
        maxWidth={480}
        title={title}
        visible={open}
        onClose={() => setOpen(false)}
        footer={
          <>
            <Button variant="outline" size="small" onPress={onClear}>
              Limpiar
            </Button>
            <Button
              variant="outline"
              size="small"
              onPress={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              size="small"
              onPress={() => {
                onApply();
                setOpen(false);
              }}
            >
              Aplicar
            </Button>
          </>
        }
      >
        {children}
      </DetailDialog>
    </>
  );
}
export function ActivePatientFilters({
  items,
}: {
  items: Array<{ key: string; label: string; onRemove: () => void }>;
}) {
  const { theme } = useTheme();
  return items.length ? (
    <View style={pd.filters}>
      {items.map((item) => (
        <AnimatedPressable
          key={item.key}
          onPress={item.onRemove}
          accessibilityLabel={`Quitar filtro ${item.label}`}
          hoverLift={false}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingVertical: 6,
            paddingHorizontal: 10,
            borderWidth: 1,
            borderRadius: 8,
            borderColor: theme.border,
            backgroundColor: theme.bgMuted,
          }}
        >
          <Text
            style={{
              fontFamily: theme.fontSans,
              fontSize: 12,
              color: theme.textPrimary,
            }}
          >
            {item.label}
          </Text>
          <Ionicons name="close" size={14} color={theme.textSecondary} />
        </AnimatedPressable>
      ))}
    </View>
  ) : null;
}
