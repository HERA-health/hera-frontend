import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  View,
  Text,
  useWindowDimensions,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { AnimatedPressable, Button } from "../../common";
import type { AnimatedPressableHandle } from "../../common/AnimatedPressable";
import { useTheme } from "../../../contexts/ThemeContext";

interface PatientAction {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  destructive?: boolean;
  hint?: string;
  onPress: () => void;
}
export function PatientActionsMenu({ items }: { items: PatientAction[] }) {
  const { theme } = useTheme();
  const { width, height } = useWindowDimensions();
  const trigger = useRef<AnimatedPressableHandle>(null);
  const rows = useRef<Array<AnimatedPressableHandle | null>>([]);
  const [anchor, setAnchor] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const close = useCallback(() => {
    setAnchor(null);
    requestAnimationFrame(() => trigger.current?.focus());
  }, []);
  useEffect(() => {
    setAnchor(null);
  }, [width, height]);
  useEffect(() => {
    if (!anchor || Platform.OS !== "web") return;
    const timer = setTimeout(
      () => rows.current[items.findIndex((item) => !item.disabled)]?.focus(),
      50,
    );
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape" || event.key === "Tab") {
        if (event.key === "Escape") event.preventDefault();
        close();
      }
      if (
        event.key === "ArrowDown" ||
        event.key === "ArrowUp" ||
        event.key === "Home" ||
        event.key === "End"
      ) {
        event.preventDefault();
        const enabled = rows.current.filter(
          (row, i) => row && !items[i].disabled,
        );
        const current = enabled.findIndex(
          (row) => row === document.activeElement,
        );
        const next =
          event.key === "Home"
            ? 0
            : event.key === "End"
              ? enabled.length - 1
              : (current +
                  (event.key === "ArrowDown" ? 1 : -1) +
                  enabled.length) %
                enabled.length;
        enabled[next]?.focus();
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", key);
    };
  }, [anchor, close, items]);
  const menuWidth = Math.min(280, width - 32);
  return (
    <>
      <Button
        variant="outline"
        size="small"
        focusRef={trigger}
        accessibilityLabel="Más acciones del paciente"
        accessibilityState={{ expanded: !!anchor }}
        icon={<Ionicons name="chevron-down" size={14} color={theme.primary} />}
        iconPosition="right"
        onPress={() =>
          anchor
            ? close()
            : trigger.current?.measureInWindow((x, y, w, h) =>
                setAnchor({ x, y, width: w, height: h }),
              )
        }
      >
        Más
      </Button>
      <Modal
        visible={!!anchor}
        transparent
        animationType="fade"
        onRequestClose={close}
      >
        <Pressable
          style={{ flex: 1 }}
          onPress={close}
          accessibilityLabel="Cerrar menú de acciones"
        >
          {anchor ? (
            <Pressable
              accessibilityRole="menu"
              accessibilityLabel="Acciones del paciente"
              onPress={(event) => event.stopPropagation()}
              style={{
                position: "absolute",
                width: menuWidth,
                left: Math.max(
                  16,
                  Math.min(
                    anchor.x + anchor.width - menuWidth,
                    width - menuWidth - 16,
                  ),
                ),
                top: Math.max(
                  16,
                  Math.min(
                    anchor.y + anchor.height + 6,
                    height - items.length * 56 - 24,
                  ),
                ),
                backgroundColor: theme.bgCard,
                borderColor: theme.border,
                borderWidth: 1,
                borderRadius: 12,
                padding: 6,
                shadowColor: theme.textPrimary,
                shadowOpacity: 0.14,
                shadowRadius: 15,
                shadowOffset: { width: 0, height: 6 },
                elevation: 8,
              }}
            >
              {items.map((item, i) => (
                <AnimatedPressable
                  key={item.label}
                  focusRef={(row) => {
                    rows.current[i] = row;
                  }}
                  hoverLift={false}
                  accessibilityRole="menuitem"
                  accessibilityLabel={item.label}
                  accessibilityHint={item.hint}
                  disabled={item.disabled}
                  onPress={() => {
                    close();
                    item.onPress();
                  }}
                  style={{
                    minHeight: 44,
                    padding: 10,
                    borderRadius: 7,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    opacity: item.disabled ? 0.45 : 1,
                  }}
                >
                  <Ionicons
                    name={item.icon}
                    size={17}
                    color={item.destructive ? theme.error : theme.primary}
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontFamily: theme.fontSansSemiBold,
                        fontSize: 13,
                        color: item.destructive
                          ? theme.error
                          : theme.textPrimary,
                      }}
                    >
                      {item.label}
                    </Text>
                    {item.disabled && item.hint ? (
                      <Text
                        style={{
                          fontFamily: theme.fontSans,
                          fontSize: 11,
                          color: theme.textSecondary,
                        }}
                      >
                        {item.hint}
                      </Text>
                    ) : null}
                  </View>
                </AnimatedPressable>
              ))}
            </Pressable>
          ) : null}
        </Pressable>
      </Modal>
    </>
  );
}
