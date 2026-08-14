import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button } from '../../../components/common/Button';
import { useTheme } from '../../../contexts/ThemeContext';
import type {
  ClinicPatientErrors,
  ClinicPatientField,
  ClinicPatientForm,
  FeedbackMessage,
  PanelMode,
} from './clinicPatientDomain';
import {
  ClinicPatientBillingFields,
  ClinicPatientIdentityFields,
} from './ClinicPatientFieldGroups';
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

      <ClinicPatientIdentityFields
        form={form}
        errors={errors}
        disabled={disabled}
        onChange={onChange}
      />

      <ClinicPatientBillingFields
        form={form}
        errors={errors}
        disabled={disabled}
        sameBillingData={sameBillingData}
        onChange={onChange}
        onToggleSameBillingData={onToggleSameBillingData}
      />

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
