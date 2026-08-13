import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AnimatedPressable } from '../../../components/common/AnimatedPressable';
import { Button } from '../../../components/common/Button';
import { Input } from '../../../components/common/Input';
import { CONTACT_METHOD_REQUIRED_MESSAGE } from '../../../constants/errors';
import { useTheme } from '../../../contexts/ThemeContext';
import type {
  ClinicPatientErrors,
  ClinicPatientField,
  ClinicPatientForm,
  FeedbackMessage,
  PanelMode,
} from './clinicPatientDomain';
import {
  billingFields,
  identityFields,
} from './clinicPatientDomain';
import { createFormStyles } from './clinicPatientStyles';

interface ClinicPatientFormPanelProps {
  mode: Extract<PanelMode, 'create' | 'edit'>;
  form: ClinicPatientForm;
  errors: ClinicPatientErrors;
  saving: boolean;
  feedback: FeedbackMessage | null;
  canManage: boolean;
  sameBillingData: boolean;
  onChange: (field: ClinicPatientField, value: string) => void;
  onToggleSameBillingData: () => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export function ClinicPatientFormPanel({
  mode,
  form,
  errors,
  saving,
  feedback,
  canManage,
  sameBillingData,
  onChange,
  onToggleSameBillingData,
  onSubmit,
  onCancel,
}: ClinicPatientFormPanelProps): React.ReactElement {
  const { theme } = useTheme();
  const styles = useMemo(() => createFormStyles(theme), [theme]);
  const disabled = !canManage || saving;
  const contactMethodError =
    errors.email === CONTACT_METHOD_REQUIRED_MESSAGE
      ? errors.email
      : undefined;

  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>
            {mode === 'create' ? 'Nuevo paciente' : 'Editar paciente'}
          </Text>
          <Text style={styles.subtitle}>
            Datos administrativos para identificación, contacto y facturación.
          </Text>
        </View>
      </View>

      <View style={styles.fields}>
        <Text style={styles.groupTitle}>Identidad y contacto</Text>
        {identityFields.map((field) => (
          <Input
            key={field.key}
            label={field.label}
            value={form[field.key]}
            placeholder={field.placeholder}
            keyboardType={field.keyboardType}
            autoCapitalize={field.autoCapitalize}
            helperText={field.helperText}
            error={field.key === 'email' && contactMethodError ? undefined : errors[field.key]}
            editable={!disabled}
            onChangeText={(value) => onChange(field.key, value)}
          />
        ))}
        {contactMethodError ? (
          <Text style={[styles.message, { color: theme.error }]}>
            {contactMethodError}
          </Text>
        ) : null}
      </View>

      <View style={styles.fields}>
        <Text style={styles.groupTitle}>Facturación</Text>
        <AnimatedPressable
          onPress={onToggleSameBillingData}
          disabled={disabled}
          hoverLift={false}
          pressScale={0.99}
          accessibilityRole="checkbox"
          accessibilityLabel="Usar los mismos datos para facturación"
          accessibilityHint="Copia nombre y apellidos al nombre fiscal"
          accessibilityState={{ checked: sameBillingData, disabled }}
          style={[
            styles.billingCopyControl,
            sameBillingData ? styles.billingCopyControlSelected : null,
            disabled ? styles.billingCopyControlDisabled : null,
          ]}
        >
          <View style={[
            styles.billingCopyCheckbox,
            sameBillingData ? styles.billingCopyCheckboxSelected : null,
          ]}>
            {sameBillingData ? (
              <Ionicons name="checkmark" size={15} color={theme.textOnPrimary} />
            ) : null}
          </View>
          <View style={styles.billingCopyText}>
            <Text style={styles.billingCopyLabel}>
              Usar los mismos datos para facturación
            </Text>
            <Text style={styles.billingCopyDescription}>
              Nombre y apellidos → Nombre fiscal. NIF y dirección fiscal se completan por separado.
            </Text>
          </View>
        </AnimatedPressable>
        {billingFields.map((field) => (
          <Input
            key={field.key}
            label={field.label}
            value={form[field.key]}
            placeholder={field.placeholder}
            keyboardType={field.keyboardType}
            autoCapitalize={field.autoCapitalize}
            helperText={
              sameBillingData && field.key === 'billingFullName'
                ? 'Sincronizado con el nombre y los apellidos administrativos.'
                : field.helperText
            }
            error={errors[field.key]}
            editable={!disabled && !(sameBillingData && field.key === 'billingFullName')}
            onChangeText={(value) => onChange(field.key, value)}
          />
        ))}
      </View>

      {feedback ? (
        <Text style={[
          styles.message,
          { color: feedback.type === 'error' ? theme.error : theme.success },
        ]}>
          {feedback.text}
        </Text>
      ) : null}

      <View style={styles.actions}>
        <Button
          variant="ghost"
          size="medium"
          onPress={onCancel}
          disabled={saving}
        >
          Cancelar
        </Button>
        <Button
          variant="primary"
          size="medium"
          onPress={onSubmit}
          loading={saving}
          disabled={disabled}
          icon={<Ionicons name="save-outline" size={18} color={theme.actionPrimaryText} />}
        >
          {mode === 'create' ? 'Crear paciente' : 'Guardar'}
        </Button>
      </View>
    </View>
  );
}
