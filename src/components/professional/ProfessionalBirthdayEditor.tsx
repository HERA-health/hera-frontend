import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../contexts/ThemeContext';
import { ProfileDatePickerModal } from '../../screens/profile/components/ProfileDatePickerModal';
import { borderRadius, spacing } from '../../constants/colors';

export const birthdayPreviewAge = (date: string, today: string): number | null => {
  if (!date || date > today) return null;
  return Number(today.slice(0, 4)) - Number(date.slice(0, 4)) - (today.slice(5) < date.slice(5) ? 1 : 0);
};

const localDate = (date: string): Date => {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day);
};

interface Props {
  birthDate: string | null;
  showAge: boolean;
  onChange: (birthDate: string | null, showAge: boolean) => void;
}

export const ProfessionalBirthdayEditor: React.FC<Props> = ({ birthDate, showAge, onChange }) => {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const age = birthDate ? birthdayPreviewAge(birthDate, today) : null;
  const text = { color: theme.textPrimary, fontFamily: theme.fontSans };
  const helper = { color: theme.textSecondary, fontFamily: theme.fontSans, fontSize: 13, lineHeight: 19 };

  return (
    <View style={styles.row}>
      <View style={styles.column}>
        <Text style={[text, styles.label, { fontFamily: theme.fontSansSemiBold }]}>Fecha de nacimiento (opcional)</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Elegir fecha de nacimiento" onPress={() => setOpen(true)}
          style={[styles.date, { borderColor: theme.border, backgroundColor: theme.bgCard }]}>
          <Text style={[text, { flex: 1 }]}>{birthDate ? birthDate.split('-').reverse().join('/') : 'Seleccionar fecha'}</Text>
          <Ionicons name="calendar-outline" size={20} color={theme.primary} />
        </Pressable>
        {birthDate ? <View style={styles.dateFooter}>
          <Text style={helper}>{age !== null ? `${age} años` : ''}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Borrar fecha de nacimiento" onPress={() => onChange(null, false)} style={styles.clear}>
            <Text style={[helper, { color: theme.primary }]}>Borrar fecha</Text>
          </Pressable>
        </View> : null}
      </View>
      <View style={[styles.column, styles.publication]}>
        <Pressable accessibilityRole="checkbox" accessibilityLabel="Mostrar mi edad en el perfil"
          accessibilityState={{ checked: showAge, disabled: !birthDate }} disabled={!birthDate}
          onPress={() => onChange(birthDate, !showAge)} style={styles.checkbox}>
          <Ionicons name={showAge ? 'checkbox' : 'square-outline'} size={24} color={birthDate ? theme.primary : theme.textMuted} />
          <Text style={[text, { flex: 1, fontFamily: theme.fontSansSemiBold }]}>Mostrar mi edad en el perfil</Text>
        </Pressable>
        <Text style={helper}>Tu fecha completa es privada. Si publicas tu edad, aparecerá junto a tu nombre y permitirá encontrarte mediante el filtro de edad del directorio.</Text>
      </View>
      <ProfileDatePickerModal visible={open} selectedDate={birthDate ? localDate(birthDate) : new Date(Number(today.slice(0, 4)) - 30, 0, 1)}
        minimumYear={Math.min(1900, birthDate ? Number(birthDate.slice(0, 4)) : 1900)} maximumYear={Number(today.slice(0, 4))} maxDate={localDate(today)}
        description="Tu fecha completa es privada. Tú eliges si publicas tu edad."
        onCancel={() => setOpen(false)} onConfirm={date => {
          const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
          onChange(value, showAge);
          setOpen(false);
        }} />
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg, marginTop: spacing.sm },
  column: { flex: 1, flexBasis: 250, minWidth: 0 },
  label: { fontSize: 14, lineHeight: 20, marginBottom: spacing.sm },
  date: { minHeight: 48, borderWidth: 1, borderRadius: borderRadius.md, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dateFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  clear: { paddingVertical: spacing.sm, paddingLeft: spacing.sm, minHeight: 40, justifyContent: 'center' },
  publication: { justifyContent: 'center', gap: spacing.xs },
  checkbox: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 44 },
});
