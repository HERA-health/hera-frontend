import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

import { AnimatedPressable, Button, Card } from "../../../components/common";
import { borderRadius, shadows, spacing } from "../../../constants/colors";
import { useTheme } from "../../../contexts/ThemeContext";

interface ProfileDatePickerModalProps {
  visible: boolean;
  selectedDate: Date;
  onConfirm: (date: Date) => void;
  onCancel: () => void;
  minimumYear?: number;
  maximumYear?: number;
  maxDate?: Date;
  description?: string;
}

const months = [
  { value: 0, label: "Enero" },
  { value: 1, label: "Febrero" },
  { value: 2, label: "Marzo" },
  { value: 3, label: "Abril" },
  { value: 4, label: "Mayo" },
  { value: 5, label: "Junio" },
  { value: 6, label: "Julio" },
  { value: 7, label: "Agosto" },
  { value: 8, label: "Septiembre" },
  { value: 9, label: "Octubre" },
  { value: 10, label: "Noviembre" },
  { value: 11, label: "Diciembre" },
];

const days = Array.from({ length: 31 }, (_, index) => index + 1);
const currentYear = new Date().getFullYear();

export const ProfileDatePickerModal: React.FC<ProfileDatePickerModalProps> = ({
  visible,
  selectedDate,
  onConfirm,
  onCancel,
  minimumYear = 1920,
  maximumYear = currentYear - 18,
  maxDate,
  description = "Solo visible para tu especialista.",
}) => {
  const { theme, isDark } = useTheme();
  const { width, height } = useWindowDimensions();
  const compact = width < 600;
  const styles = useMemo(
    () => createStyles(theme, isDark, compact, height),
    [theme, isDark, compact, height],
  );

  const [tempDay, setTempDay] = useState(selectedDate.getDate());
  const [tempMonth, setTempMonth] = useState(selectedDate.getMonth());
  const [tempYear, setTempYear] = useState(selectedDate.getFullYear());
  const years = useMemo(
    () =>
      Array.from(
        { length: Math.max(0, maximumYear - minimumYear + 1) },
        (_, index) => maximumYear - index,
      ),
    [minimumYear, maximumYear],
  );
  const selected = new Date(
    tempYear,
    tempMonth,
    Math.min(tempDay, new Date(tempYear, tempMonth + 1, 0).getDate()),
  );
  const dateAllowed = !maxDate || selected <= maxDate;

  useEffect(() => {
    if (visible) {
      setTempDay(selectedDate.getDate());
      setTempMonth(selectedDate.getMonth());
      setTempYear(selectedDate.getFullYear());
    }
  }, [visible, selectedDate]);

  const handleConfirm = () => {
    const daysInMonth = new Date(tempYear, tempMonth + 1, 0).getDate();
    const validDay = Math.min(tempDay, daysInMonth);
    onConfirm(new Date(tempYear, tempMonth, validDay));
  };

  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <Pressable style={styles.overlay} onPress={onCancel}>
        <Pressable
          onPress={(event) => event.stopPropagation()}
          style={styles.sheetWrap}
        >
          <Card style={styles.contentCard}>
            <View style={styles.header}>
              <View style={styles.headerCopy}>
                <Text accessibilityRole="header" style={styles.title}>
                  Fecha de nacimiento
                </Text>
                <Text style={styles.subtitle}>{description}</Text>
              </View>
            </View>

            <ScrollView
              style={styles.body}
              contentContainerStyle={styles.bodyContent}
              nestedScrollEnabled
            >
              <View style={styles.columns}>
                <View style={styles.column}>
                  <Text style={styles.columnLabel}>Día</Text>
                  <ScrollView
                    style={styles.scrollColumn}
                    showsVerticalScrollIndicator
                  >
                    {days.map((day) => (
                      <AnimatedPressable
                        key={day}
                        style={[
                          styles.option,
                          tempDay === day && {
                            backgroundColor: theme.primaryAlpha12,
                            borderColor: theme.primary,
                          },
                        ]}
                        onPress={() => setTempDay(day)}
                      >
                        <Text
                          style={[
                            styles.optionText,
                            {
                              color:
                                tempDay === day
                                  ? theme.primary
                                  : theme.textPrimary,
                            },
                          ]}
                        >
                          {day}
                        </Text>
                      </AnimatedPressable>
                    ))}
                  </ScrollView>
                </View>

                <View style={[styles.column, styles.monthColumn]}>
                  <Text style={styles.columnLabel}>Mes</Text>
                  <ScrollView
                    style={styles.scrollColumn}
                    showsVerticalScrollIndicator
                  >
                    {months.map((month) => (
                      <AnimatedPressable
                        key={month.value}
                        style={[
                          styles.option,
                          tempMonth === month.value && {
                            backgroundColor: theme.primaryAlpha12,
                            borderColor: theme.primary,
                          },
                        ]}
                        onPress={() => setTempMonth(month.value)}
                      >
                        <Text
                          style={[
                            styles.optionText,
                            {
                              color:
                                tempMonth === month.value
                                  ? theme.primary
                                  : theme.textPrimary,
                            },
                          ]}
                        >
                          {month.label}
                        </Text>
                      </AnimatedPressable>
                    ))}
                  </ScrollView>
                </View>

                <View style={styles.column}>
                  <Text style={styles.columnLabel}>Año</Text>
                  <ScrollView
                    style={styles.scrollColumn}
                    showsVerticalScrollIndicator
                  >
                    {years.map((year) => (
                      <AnimatedPressable
                        key={year}
                        style={[
                          styles.option,
                          tempYear === year && {
                            backgroundColor: theme.primaryAlpha12,
                            borderColor: theme.primary,
                          },
                        ]}
                        onPress={() => setTempYear(year)}
                      >
                        <Text
                          style={[
                            styles.optionText,
                            {
                              color:
                                tempYear === year
                                  ? theme.primary
                                  : theme.textPrimary,
                            },
                          ]}
                        >
                          {year}
                        </Text>
                      </AnimatedPressable>
                    ))}
                  </ScrollView>
                </View>
              </View>

              <View
                style={[
                  styles.preview,
                  {
                    backgroundColor: isDark
                      ? theme.surfaceMuted
                      : theme.bgMuted,
                  },
                ]}
              >
                <Text style={styles.previewLabel}>Seleccionado</Text>
                <Text style={styles.previewText}>
                  {selected.getDate()} de {months[tempMonth]?.label} de{" "}
                  {tempYear}
                </Text>
              </View>
            </ScrollView>

            <View style={styles.actions}>
              <Button onPress={onCancel} variant="outline" size="large">
                Cancelar
              </Button>
              <Button
                onPress={handleConfirm}
                size="large"
                disabled={!dateAllowed}
              >
                Confirmar
              </Button>
            </View>
          </Card>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const createStyles = (
  theme: ReturnType<typeof useTheme>["theme"],
  isDark: boolean,
  compact: boolean,
  height: number,
) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: isDark
        ? "rgba(0, 0, 0, 0.72)"
        : "rgba(16, 24, 20, 0.42)",
      justifyContent: "center",
      alignItems: "center",
      padding: compact ? spacing.md : spacing.xl,
    },
    sheetWrap: {
      width: "100%",
      maxWidth: 760,
      maxHeight: height - (compact ? spacing.md : spacing.xl) * 2,
      flexShrink: 1,
    },
    contentCard: {
      backgroundColor: theme.bgCard,
      borderRadius: borderRadius.xxl,
      borderWidth: 1,
      borderColor: theme.border,
      padding: compact ? spacing.md : spacing.xl,
      gap: spacing.lg,
      maxHeight: height - (compact ? spacing.md : spacing.xl) * 2,
      flexShrink: 1,
      ...shadows.lg,
    },
    header: {
      gap: spacing.xs,
    },
    headerCopy: {
      gap: spacing.xs,
    },
    title: {
      color: theme.textPrimary,
      fontSize: 24,
      fontFamily: theme.fontHeading,
    },
    subtitle: {
      color: theme.textSecondary,
      fontSize: 15,
      lineHeight: 22,
      fontFamily: theme.fontSansMedium,
    },
    columns: {
      flexDirection: "row",
      gap: compact ? spacing.sm : spacing.md,
    },
    column: {
      flex: 1,
      minWidth: 0,
      gap: spacing.sm,
    },
    monthColumn: {
      flex: compact ? 1.65 : 1,
    },
    columnLabel: {
      color: theme.textSecondary,
      fontSize: 13,
      textTransform: "uppercase",
      letterSpacing: 0.8,
      fontFamily: theme.fontSansSemiBold,
    },
    scrollColumn: {
      height: 240,
      maxHeight: 240,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: isDark ? theme.surfaceMuted : theme.bgMuted,
      padding: compact ? spacing.xs : spacing.sm,
    },
    option: {
      minHeight: 42,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: "transparent",
      justifyContent: "center",
      paddingHorizontal: compact ? spacing.xs : spacing.md,
      marginBottom: spacing.xs,
    },
    optionText: {
      fontSize: 15,
      fontFamily: theme.fontSansSemiBold,
    },
    preview: {
      borderRadius: borderRadius.xl,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      gap: spacing.xs,
    },
    previewLabel: {
      color: theme.textSecondary,
      fontSize: 12,
      textTransform: "uppercase",
      letterSpacing: 0.8,
      fontFamily: theme.fontSansSemiBold,
    },
    previewText: {
      color: theme.textPrimary,
      fontSize: 18,
      fontFamily: theme.fontSansBold,
    },
    actions: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: spacing.sm,
      flexWrap: "wrap",
    },
    body: { flexShrink: 1, minHeight: 0 },
    bodyContent: { gap: spacing.lg },
  });

export default ProfileDatePickerModal;
