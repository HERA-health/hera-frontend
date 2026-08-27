import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AnimatedPressable, Button, Input } from '../../../components/common';
import { borderRadius, spacing } from '../../../constants/colors';
import type { Theme } from '../../../constants/theme';
import { useTheme } from '../../../contexts/ThemeContext';
import type {
  ClinicServiceModality,
  ClinicServiceSpecialistOption,
} from '../../../services/clinicService';
import type {
  ClinicServiceFormErrors,
  ClinicServiceFormValues,
} from './clinicServiceFormDomain';

export type ClinicServiceEditorMode = 'create' | 'edit' | 'reactivate';

interface ClinicServiceEditorPanelProps {
  mode: ClinicServiceEditorMode;
  values: ClinicServiceFormValues;
  errors: ClinicServiceFormErrors;
  specialistOptions: ClinicServiceSpecialistOption[];
  busy: boolean;
  stale: boolean;
  conflictLoading: boolean;
  conflictRecoveryError: string;
  onChange: <TField extends keyof ClinicServiceFormValues>(
    field: TField,
    value: ClinicServiceFormValues[TField],
  ) => void;
  onSubmit: () => void;
  onCancel: () => void;
  onLoadCurrent: () => void;
}

const MODE_COPY: Record<ClinicServiceEditorMode, { eyebrow: string; title: string; action: string }> = {
  create: { eyebrow: 'Nuevo servicio', title: 'Configura una propuesta clara', action: 'Crear servicio' },
  edit: { eyebrow: 'Edición', title: 'Actualiza el servicio', action: 'Guardar cambios' },
  reactivate: { eyebrow: 'Reactivación', title: 'Prepara de nuevo el servicio', action: 'Reactivar servicio' },
};

const MODALITIES: Array<{ value: ClinicServiceModality; label: string; icon: 'location-outline' | 'call-outline' }> = [
  { value: 'IN_PERSON', label: 'Presencial', icon: 'location-outline' },
  { value: 'PHONE_CALL', label: 'Teléfono', icon: 'call-outline' },
];

export function ClinicServiceEditorPanel({
  mode,
  values,
  errors,
  specialistOptions,
  busy,
  stale,
  conflictLoading,
  conflictRecoveryError,
  onChange,
  onSubmit,
  onCancel,
  onLoadCurrent,
}: ClinicServiceEditorPanelProps): React.ReactElement {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [specialistSearch, setSpecialistSearch] = useState('');
  const copy = MODE_COPY[mode];
  const coreFieldsEditable = mode !== 'reactivate' && !busy && !stale;
  const normalizedSearch = specialistSearch.trim().toLocaleLowerCase('es-ES');
  const visibleSpecialists = specialistOptions.filter((specialist) => {
    const alreadySelected = values.clinicSpecialistIds.includes(specialist.id);
    return alreadySelected || specialist.displayName.toLocaleLowerCase('es-ES').includes(normalizedSearch);
  });

  const toggleModality = (modality: ClinicServiceModality): void => {
    const selected = values.modalities.includes(modality);
    onChange(
      'modalities',
      selected
        ? values.modalities.filter((value) => value !== modality)
        : [...values.modalities, modality],
    );
  };

  const toggleSpecialist = (specialist: ClinicServiceSpecialistOption): void => {
    const selected = values.clinicSpecialistIds.includes(specialist.id);
    if (!selected && specialist.status !== 'ACTIVE') return;
    onChange(
      'clinicSpecialistIds',
      selected
        ? values.clinicSpecialistIds.filter((id) => id !== specialist.id)
        : [...values.clinicSpecialistIds, specialist.id],
    );
  };

  return (
    <View style={styles.container} testID="clinic-service-editor">
      <View style={styles.heading}>
        <Text style={styles.eyebrow}>{copy.eyebrow}</Text>
        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.subtitle}>
          {mode === 'reactivate'
            ? 'Revisa los datos y ajusta el equipo disponible. Podrás editar el resto después de reactivarlo.'
            : 'Define lo que necesita el equipo para reservarlo de forma consistente.'}
        </Text>
      </View>

      {stale ? (
        <View style={styles.conflict} accessibilityRole="alert">
          <Ionicons name="sync-outline" size={20} color={theme.warning} />
          <View style={styles.conflictCopy}>
            <Text style={styles.conflictTitle}>Hay una versión más reciente</Text>
            <Text style={styles.conflictText}>
              {conflictRecoveryError
                ? `Conservamos tu borrador. ${conflictRecoveryError}`
                : 'Conservamos tu borrador. Carga la versión actual antes de volver a guardar.'}
            </Text>
          </View>
          <Button
            variant="outline"
            size="small"
            onPress={onLoadCurrent}
            disabled={busy}
            loading={conflictLoading}
          >
            {conflictRecoveryError ? 'Reintentar carga' : 'Cargar versión actual'}
          </Button>
        </View>
      ) : null}

      <Input
        label="Nombre"
        value={values.name}
        placeholder="Ej. Primera consulta"
        maxLength={120}
        editable={coreFieldsEditable}
        error={errors.name}
        onChangeText={(value) => onChange('name', value)}
      />
      <Input
        label="Descripción (opcional)"
        value={values.description}
        placeholder="Qué incluye o para quién está pensado"
        multiline
        numberOfLines={3}
        maxLength={500}
        editable={coreFieldsEditable}
        error={errors.description}
        style={styles.descriptionInput}
        onChangeText={(value) => onChange('description', value)}
      />

      <View style={styles.twoColumns}>
        <Input
          label="Duración (minutos)"
          value={values.durationMinutes}
          placeholder="50"
          keyboardType="number-pad"
          inputMode="numeric"
          editable={coreFieldsEditable}
          error={errors.durationMinutes}
          containerStyle={styles.column}
          onChangeText={(value) => onChange('durationMinutes', value)}
        />
        <Input
          label="Precio final (EUR)"
          value={values.price}
          placeholder="65,00"
          keyboardType="decimal-pad"
          inputMode="decimal"
          editable={coreFieldsEditable}
          error={errors.price}
          helperText="Puedes usar coma o punto decimal."
          containerStyle={styles.column}
          onChangeText={(value) => onChange('price', value)}
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Modalidades</Text>
        <View style={styles.choiceRow}>
          {MODALITIES.map((option) => {
            const selected = values.modalities.includes(option.value);
            return (
              <AnimatedPressable
                key={option.value}
                style={[styles.choice, selected ? styles.choiceSelected : null]}
                onPress={() => toggleModality(option.value)}
                disabled={!coreFieldsEditable}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected, disabled: !coreFieldsEditable }}
              >
                <Ionicons
                  name={option.icon}
                  size={17}
                  color={selected ? theme.primary : theme.textMuted}
                />
                <Text style={[styles.choiceText, selected ? styles.choiceTextSelected : null]}>
                  {option.label}
                </Text>
              </AnimatedPressable>
            );
          })}
        </View>
        {errors.modalities ? <Text style={styles.error}>{errors.modalities}</Text> : null}
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Profesionales que pueden prestarlo</Text>
        <Text style={styles.help}>
          Los profesionales inactivos ya asociados permanecen visibles, pero no pueden añadirse.
        </Text>
        <Input
          value={specialistSearch}
          placeholder="Buscar profesional"
          autoCapitalize="none"
          editable={!busy && !stale}
          leftIcon={<Ionicons name="search-outline" size={17} color={theme.textMuted} />}
          onChangeText={setSpecialistSearch}
        />
        <View style={styles.specialistList}>
          {visibleSpecialists.length === 0 ? (
            <Text style={styles.emptyText}>No hay profesionales que coincidan con la búsqueda.</Text>
          ) : visibleSpecialists.map((specialist) => {
            const selected = values.clinicSpecialistIds.includes(specialist.id);
            const disabled = busy || stale || (!selected && specialist.status !== 'ACTIVE');
            return (
              <AnimatedPressable
                key={specialist.id}
                style={[styles.specialistRow, selected ? styles.specialistRowSelected : null]}
                onPress={() => toggleSpecialist(specialist)}
                disabled={disabled}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected, disabled }}
                accessibilityLabel={`${specialist.displayName}${specialist.status === 'INACTIVE' ? ', inactivo' : ''}`}
              >
                <View style={[styles.check, selected ? styles.checkSelected : null]}>
                  {selected ? <Ionicons name="checkmark" size={15} color={theme.textOnPrimary} /> : null}
                </View>
                <View style={styles.specialistCopy}>
                  <Text style={styles.specialistName}>{specialist.displayName}</Text>
                  {specialist.status === 'INACTIVE' ? (
                    <Text style={styles.inactiveLabel}>Inactivo · solo se conserva si ya estaba asociado</Text>
                  ) : null}
                </View>
              </AnimatedPressable>
            );
          })}
        </View>
        {errors.clinicSpecialistIds ? <Text style={styles.error}>{errors.clinicSpecialistIds}</Text> : null}
      </View>

      <View style={styles.actions}>
        <Button variant="ghost" size="medium" onPress={onCancel} disabled={busy}>Cancelar</Button>
        <Button
          variant="primary"
          size="medium"
          onPress={onSubmit}
          loading={busy}
          disabled={stale}
          icon={<Ionicons name="checkmark-circle-outline" size={18} color={theme.actionPrimaryText} />}
        >
          {copy.action}
        </Button>
      </View>
    </View>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: { gap: spacing.md },
  heading: { gap: spacing.xs, marginBottom: spacing.sm },
  eyebrow: { color: theme.primary, fontFamily: theme.fontSansSemiBold, fontSize: 12, textTransform: 'uppercase' },
  title: { color: theme.textPrimary, fontFamily: theme.fontDisplay, fontSize: 28, lineHeight: 34 },
  subtitle: { color: theme.textSecondary, fontFamily: theme.fontSans, fontSize: 14, lineHeight: 21 },
  conflict: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: theme.warning, backgroundColor: theme.warningBg },
  conflictCopy: { flex: 1, minWidth: 200 },
  conflictTitle: { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold, fontSize: 14 },
  conflictText: { color: theme.textSecondary, fontFamily: theme.fontSans, fontSize: 13, lineHeight: 19 },
  descriptionInput: { minHeight: 78, textAlignVertical: 'top' },
  twoColumns: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  column: { flex: 1, minWidth: 190 },
  fieldGroup: { gap: spacing.sm },
  label: { color: theme.textSecondary, fontFamily: theme.fontSansMedium, fontSize: 14 },
  help: { color: theme.textMuted, fontFamily: theme.fontSans, fontSize: 12, lineHeight: 18 },
  choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  choice: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 44, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: theme.border, borderRadius: borderRadius.lg, backgroundColor: theme.bgCard },
  choiceSelected: { borderColor: theme.primary, backgroundColor: theme.primaryMuted },
  choiceText: { color: theme.textSecondary, fontFamily: theme.fontSansMedium, fontSize: 14 },
  choiceTextSelected: { color: theme.textPrimary, fontFamily: theme.fontSansSemiBold },
  specialistList: { borderWidth: 1, borderColor: theme.border, borderRadius: borderRadius.lg, overflow: 'hidden' },
  specialistRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 54, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border, backgroundColor: theme.bgCard },
  specialistRowSelected: { backgroundColor: theme.primaryMuted },
  check: { width: 23, height: 23, borderRadius: 7, borderWidth: 1.5, borderColor: theme.borderStrong, alignItems: 'center', justifyContent: 'center' },
  checkSelected: { backgroundColor: theme.primary, borderColor: theme.primary },
  specialistCopy: { flex: 1, minWidth: 0 },
  specialistName: { color: theme.textPrimary, fontFamily: theme.fontSansMedium, fontSize: 14 },
  inactiveLabel: { color: theme.warning, fontFamily: theme.fontSans, fontSize: 11, marginTop: 2 },
  emptyText: { color: theme.textMuted, fontFamily: theme.fontSans, fontSize: 13, padding: spacing.md },
  error: { color: theme.error, fontFamily: theme.fontSans, fontSize: 12 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: spacing.sm, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: theme.border },
});
