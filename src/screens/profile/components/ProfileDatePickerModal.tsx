import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AnimatedPressable, Button, Card } from '../../../components/common';
import { borderRadius, shadows, spacing } from '../../../constants/colors';
import { useTheme } from '../../../contexts/ThemeContext';

interface ProfileDatePickerModalProps {
  visible: boolean;
  selectedDate: Date;
  onConfirm: (date: Date) => void;
  onCancel: () => void;
}

const months = [
  { value: 0, label: 'Enero' },
  { value: 1, label: 'Febrero' },
  { value: 2, label: 'Marzo' },
  { value: 3, label: 'Abril' },
  { value: 4, label: 'Mayo' },
  { value: 5, label: 'Junio' },
  { value: 6, label: 'Julio' },
  { value: 7, label: 'Agosto' },
  { value: 8, label: 'Septiembre' },
  { value: 9, label: 'Octubre' },
  { value: 10, label: 'Noviembre' },
  { value: 11, label: 'Diciembre' },
];

const days = Array.from({ length: 31 }, (_, index) => index + 1);
const currentYear = new Date().getFullYear();
const years = Array.from({ length: currentYear - 1920 - 17 }, (_, index) => currentYear - 18 - index);

export const ProfileDatePickerModal: React.FC<ProfileDatePickerModalProps> = ({
  visible,
  selectedDate,
  onConfirm,
  onCancel,
}) => {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);

  const [tempDay, setTempDay] = useState(selectedDate.getDate());
  const [tempMonth, setTempMonth] = useState(selectedDate.getMonth());
  const [tempYear, setTempYear] = useState(selectedDate.getFullYear());

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
        <Pressable onPress={(event) => event.stopPropagation()} style={styles.sheetWrap}>
          <Card style={styles.contentCard}>
            <View style={styles.header}>
              <View style={styles.headerCopy}>
                <Text style={styles.title}>Fecha de nacimiento</Text>
                <Text style={styles.subtitle}>Solo visible para tu especialista.</Text>
              </View>
            </View>

            <View style={styles.columns}>
              <View style={styles.column}>
                <Text style={styles.columnLabel}>Día</Text>
                <ScrollView style={styles.scrollColumn} showsVerticalScrollIndicator>
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
                          { color: tempDay === day ? theme.primary : theme.textPrimary },
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
                <ScrollView style={styles.scrollColumn} showsVerticalScrollIndicator>
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
                          { color: tempMonth === month.value ? theme.primary : theme.textPrimary },
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
                <ScrollView style={styles.scrollColumn} showsVerticalScrollIndicator>
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
                          { color: tempYear === year ? theme.primary : theme.textPrimary },
                        ]}
                      >
                        {year}
                      </Text>
                    </AnimatedPressable>
                  ))}
                </ScrollView>
              </View>
            </View>

            <View style={[styles.preview, { backgroundColor: isDark ? theme.surfaceMuted : theme.bgMuted }]}>
              <Text style={styles.previewLabel}>Seleccionado</Text>
              <Text style={styles.previewText}>
                {tempDay} de {months[tempMonth]?.label} de {tempYear}
              </Text>
            </View>

            <View style={styles.actions}>
              <Button onPress={onCancel} variant="ghost" size="large">
                Cancelar
              </Button>
              <Button onPress={handleConfirm} size="large">
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
  theme: ReturnType<typeof useTheme>['theme'],
  isDark: boolean
) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: isDark ? 'rgba(0, 0, 0, 0.72)' : 'rgba(16, 24, 20, 0.42)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.xl,
    },
    sheetWrap: {
      width: '100%',
      maxWidth: 760,
    },
    contentCard: {
      backgroundColor: theme.bgCard,
      borderRadius: borderRadius.xxl,
      borderWidth: 1,
      borderColor: theme.border,
      padding: spacing.xl,
      gap: spacing.lg,
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
      fontFamily: theme.fontDisplayBold,
    },
    subtitle: {
      color: theme.textSecondary,
      fontSize: 15,
      lineHeight: 22,
      fontFamily: theme.fontSansMedium,
    },
    columns: {
      flexDirection: 'row',
      gap: spacing.md,
      flexWrap: 'wrap',
    },
    column: {
      flex: 1,
      minWidth: 160,
      gap: spacing.sm,
    },
    monthColumn: {
      minWidth: 200,
    },
    columnLabel: {
      color: theme.textSecondary,
      fontSize: 13,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      fontFamily: theme.fontSansSemiBold,
    },
    scrollColumn: {
      maxHeight: 240,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: isDark ? theme.surfaceMuted : theme.bgMuted,
      padding: spacing.sm,
    },
    option: {
      minHeight: 42,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: 'transparent',
      justifyContent: 'center',
      paddingHorizontal: spacing.md,
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
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      fontFamily: theme.fontSansSemiBold,
    },
    previewText: {
      color: theme.textPrimary,
      fontSize: 18,
      fontFamily: theme.fontSansBold,
    },
    actions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: spacing.sm,
      flexWrap: 'wrap',
    },
  });

export default ProfileDatePickerModal;
