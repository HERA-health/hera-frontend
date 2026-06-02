import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
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
  onChange: (field: ClinicPatientField, value: string) => void;
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
  onChange,
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
        {billingFields.map((field) => (
          <Input
            key={field.key}
            label={field.label}
            value={form[field.key]}
            placeholder={field.placeholder}
            keyboardType={field.keyboardType}
            autoCapitalize={field.autoCapitalize}
            helperText={field.helperText}
            error={errors[field.key]}
            editable={!disabled}
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
