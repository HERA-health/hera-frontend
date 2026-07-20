import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { z } from 'zod';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { spacing } from '../../constants/colors';
import { Theme } from '../../constants/theme';
import type { ScreenProps } from '../../constants/types';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useProfileCompletion } from '../../contexts/ProfileCompletionContext';
import * as clinicService from '../../services/clinicService';
import { ClinicWorkspaceScaffold } from './components/ClinicWorkspaceScaffold';
import { useClinicWorkspace } from './useClinicWorkspace';

interface ClinicSettingsForm {
  commercialName: string;
  email: string;
  phone: string;
}

type ClinicSettingsField = keyof ClinicSettingsForm;
type ClinicSettingsErrors = Partial<Record<ClinicSettingsField, string>>;

interface FieldConfig {
  key: ClinicSettingsField;
  label: string;
  placeholder: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  helperText?: string;
  multiline?: boolean;
}

const EMPTY_FORM: ClinicSettingsForm = {
  commercialName: '',
  email: '',
  phone: '',
};

const identityFields: FieldConfig[] = [
  {
    key: 'commercialName',
    label: 'Nombre comercial',
    placeholder: 'HERA Clínica Centro',
    autoCapitalize: 'words',
    helperText: 'Nombre visible para el equipo de la clínica.',
  },
  {
    key: 'email',
    label: 'Email administrativo',
    placeholder: 'administracion@clinica.com',
    keyboardType: 'email-address',
    autoCapitalize: 'none',
  },
  {
    key: 'phone',
    label: 'Teléfono',
    placeholder: '+34 600 000 000',
    keyboardType: 'phone-pad',
  },
];

const clinicSettingsSchema = z.object({
  commercialName: z.string().trim().min(2, 'Indica un nombre comercial').max(160, 'Máximo 160 caracteres'),
  email: z.string().trim().max(180, 'Máximo 180 caracteres'),
  phone: z.string().trim().max(40, 'Máximo 40 caracteres'),
}).superRefine((form, context) => {
  if (form.email && !z.string().email().safeParse(form.email).success) {
    context.addIssue({
      code: 'custom',
      path: ['email'],
      message: 'Introduce un email válido',
    });
  }
});

const getEmptyToNull = (value: string): string | null => {
  const trimmedValue = value.trim();
  return trimmedValue ? trimmedValue : null;
};

const mapDetailToForm = (detail: clinicService.ClinicDetail): ClinicSettingsForm => ({
  commercialName: detail.commercialName,
  email: detail.email ?? '',
  phone: detail.phone ?? '',
});

const mapFormToPayload = (form: ClinicSettingsForm): clinicService.UpdateClinicPayload => ({
  commercialName: form.commercialName.trim(),
  email: getEmptyToNull(form.email),
  phone: getEmptyToNull(form.phone),
});

const hasText = (value: string | null | undefined): value is string => Boolean(value?.trim());

const formatFiscalValue = (value: string | null | undefined): string =>
  hasText(value) ? value.trim() : 'Pendiente';

const isClinicFiscalComplete = (clinic: clinicService.ClinicDetail | null): boolean => (
  hasText(clinic?.legalName)
  && hasText(clinic?.taxId)
  && hasText(clinic?.fiscalAddress)
  && hasText(clinic?.fiscalPostalCode)
  && hasText(clinic?.fiscalCity)
  && hasText(clinic?.fiscalCountry)
);

const getValidationErrors = (error: z.ZodError<ClinicSettingsForm>): ClinicSettingsErrors => {
  const nextErrors: ClinicSettingsErrors = {};

  error.issues.forEach((issue) => {
    const field = issue.path[0];
    if (typeof field === 'string' && field in EMPTY_FORM) {
      nextErrors[field as ClinicSettingsField] = issue.message;
    }
  });

  return nextErrors;
};

export function ClinicSettingsScreen({
  navigation,
  route,
}: ScreenProps<'ClinicSettings'>): React.ReactElement {
  const { logout } = useAuth();
  const { refresh: refreshCompletion } = useProfileCompletion();
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const isCompact = width < 900;
  const styles = useMemo(() => createStyles(theme, isCompact), [isCompact, theme]);
  const workspace = useClinicWorkspace();
  const mountedRef = useRef(true);
  const detailRequestSeq = useRef(0);
  const [detail, setDetail] = useState<clinicService.ClinicDetail | null>(null);
  const [form, setForm] = useState<ClinicSettingsForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<ClinicSettingsErrors>({});
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [highlightContact, setHighlightContact] = useState(false);

  const canEdit = workspace.selectedMembership?.role === 'OWNER'
    || workspace.selectedMembership?.role === 'ADMIN';

  const loadClinicDetail = useCallback(async (clinicId: string) => {
    const requestId = detailRequestSeq.current + 1;
    detailRequestSeq.current = requestId;
    setDetailLoading(true);
    setDetailError('');
    setSaveMessage('');

    try {
      const nextDetail = await clinicService.getClinic(clinicId);
      if (!mountedRef.current || detailRequestSeq.current !== requestId) return;
      setDetail(nextDetail);
      setForm(mapDetailToForm(nextDetail));
      setErrors({});
    } catch (error: unknown) {
      if (!mountedRef.current || detailRequestSeq.current !== requestId) return;
      setDetail(null);
      setForm(EMPTY_FORM);
      setDetailError(error instanceof Error ? error.message : 'No se pudo cargar la clínica');
    } finally {
      if (mountedRef.current && detailRequestSeq.current === requestId) {
        setDetailLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      detailRequestSeq.current += 1;
    };
  }, []);

  useEffect(() => {
    if (!workspace.selectedClinicId) {
      detailRequestSeq.current += 1;
      setDetail(null);
      setForm(EMPTY_FORM);
      setErrors({});
      setDetailError('');
      setSaveMessage('');
      return;
    }

    detailRequestSeq.current += 1;
    setDetail(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setDetailError('');
    setSaveMessage('');
    setDetailLoading(false);
    void loadClinicDetail(workspace.selectedClinicId);
  }, [loadClinicDetail, workspace.selectedClinicId]);

  useEffect(() => {
    if (route.params?.initialSection !== 'contact' || detailLoading || !detail) {
      return undefined;
    }

    setHighlightContact(true);
    navigation.setParams({ initialSection: undefined });
    return undefined;
  }, [detail, detailLoading, navigation, route.params?.initialSection]);

  useEffect(() => {
    if (!highlightContact) return undefined;
    const timeout = setTimeout(() => setHighlightContact(false), 1800);
    return () => clearTimeout(timeout);
  }, [highlightContact]);

  const handleSelectClinic = useCallback((clinicId: string) => {
    void workspace.selectClinic(clinicId);
  }, [workspace]);

  const handleRetry = useCallback(() => {
    if (workspace.error) {
      void workspace.reload();
      return;
    }

    if (workspace.selectedClinicId) {
      void loadClinicDetail(workspace.selectedClinicId);
    }
  }, [loadClinicDetail, workspace]);

  const handleChange = useCallback((field: ClinicSettingsField, value: string) => {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
    setErrors((currentErrors) => ({ ...currentErrors, [field]: undefined }));
    setSaveMessage('');
  }, []);

  const handleOpenBillingConfig = useCallback(() => {
    navigation.navigate('ClinicBilling', { initialSection: 'config' });
  }, [navigation]);

  const handleSubmit = useCallback(async () => {
    if (!workspace.selectedClinicId || !canEdit) {
      return;
    }

    const parsedForm = clinicSettingsSchema.safeParse(form);
    if (!parsedForm.success) {
      setErrors(getValidationErrors(parsedForm.error));
      setSaveMessage('');
      return;
    }

    setSaving(true);
    setErrors({});
    setSaveMessage('');

    try {
      const updatedClinic = await clinicService.updateClinic(
        workspace.selectedClinicId,
        mapFormToPayload(parsedForm.data),
      );
      setDetail(updatedClinic);
      setForm(mapDetailToForm(updatedClinic));
      setSaveMessage('Datos de clínica guardados.');
      await workspace.reload();
      await refreshCompletion();
    } catch (error: unknown) {
      setSaveMessage(error instanceof Error ? error.message : 'No se pudieron guardar los datos');
    } finally {
      setSaving(false);
    }
  }, [canEdit, form, refreshCompletion, workspace]);

  const clinicName = detail?.commercialName
    ?? workspace.selectedMembership?.clinic.commercialName;

  return (
    <ClinicWorkspaceScaffold
      title="Configuración"
      contextLabel={clinicName}
      subtitle="Mantén actualizados los datos básicos y fiscales que usaremos en fases posteriores de facturación."
      memberships={workspace.memberships}
      selectedClinicId={workspace.selectedClinicId}
      loading={workspace.loading}
      error={workspace.error}
      onSelectClinic={handleSelectClinic}
      onRetry={handleRetry}
      action={workspace.selectedClinicId ? (
        <Button
          variant="ghost"
          size="medium"
          onPress={() => navigation.navigate('ClinicDashboard')}
          icon={<Ionicons name="business-outline" size={18} color={theme.primary} />}
        >
          Volver al panel
        </Button>
      ) : undefined}
    >
      {!workspace.selectedMembership ? (
        <View style={styles.emptyPanel}>
          <Ionicons name="business-outline" size={30} color={theme.textMuted} />
          <Text style={styles.emptyTitle}>No hay clínica vinculada</Text>
          <Text style={styles.emptyText}>
            Esta cuenta existe, pero aún no tiene una clínica activa asociada por el equipo de HERA.
          </Text>
          <Button
            variant="outline"
            size="medium"
            onPress={() => { void logout(); }}
            icon={<Ionicons name="log-out-outline" size={18} color={theme.primary} />}
          >
            Cerrar sesión
          </Button>
        </View>
      ) : detailLoading ? (
        <View style={styles.statePanel}>
          <ActivityIndicator color={theme.primary} size="small" />
          <Text style={styles.stateText}>Cargando datos editables</Text>
        </View>
      ) : detailError ? (
        <View style={styles.statePanel}>
          <Ionicons name="alert-circle-outline" size={26} color={theme.warning} />
          <Text style={styles.stateTitle}>No se pudo cargar la configuración</Text>
          <Text style={styles.stateText}>{detailError}</Text>
          <Button variant="outline" size="medium" onPress={handleRetry}>
            Reintentar
          </Button>
        </View>
      ) : (
        <View style={styles.formShell}>
          {!canEdit ? (
            <View style={styles.notice}>
              <Ionicons name="lock-closed-outline" size={18} color={theme.warning} />
              <Text style={styles.noticeText}>
                Tu rol puede consultar estos datos, pero solo propietarios y administradores pueden editarlos.
              </Text>
            </View>
          ) : null}

          <View style={styles.formGrid}>
            <FormSection
              title="Datos básicos"
              text="Información de contacto y nombre visible de la clínica."
              fields={identityFields}
              form={form}
              errors={errors}
              disabled={!canEdit || saving}
              onChange={handleChange}
              highlighted={highlightContact}
            />
            <FiscalSummarySection
              clinic={detail}
              canEdit={canEdit}
              onManage={handleOpenBillingConfig}
            />
          </View>

          <View style={styles.footer}>
            {saveMessage ? (
              <Text
                style={[
                  styles.saveMessage,
                  { color: saveMessage.includes('guardados') ? theme.success : theme.error },
                ]}
              >
                {saveMessage}
              </Text>
            ) : (
              <Text style={styles.footerHint}>
                La actualización guarda solo datos administrativos y de contacto.
              </Text>
            )}
            <Button
              variant="primary"
              size="medium"
              onPress={handleSubmit}
              loading={saving}
              disabled={!canEdit || saving}
              icon={<Ionicons name="save-outline" size={18} color={theme.actionPrimaryText} />}
            >
              Guardar cambios
            </Button>
          </View>
        </View>
      )}
    </ClinicWorkspaceScaffold>
  );
}

interface FormSectionProps {
  title: string;
  text: string;
  fields: FieldConfig[];
  form: ClinicSettingsForm;
  errors: ClinicSettingsErrors;
  disabled: boolean;
  onChange: (field: ClinicSettingsField, value: string) => void;
  highlighted?: boolean;
}

function FormSection({
  title,
  text,
  fields,
  form,
  errors,
  disabled,
  onChange,
  highlighted = false,
}: FormSectionProps): React.ReactElement {
  const { theme } = useTheme();
  const styles = useMemo(() => createSectionStyles(theme), [theme]);

  return (
    <View style={[styles.section, highlighted ? styles.sectionHighlighted : null]}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionText}>{text}</Text>
      <View style={styles.fields}>
        {fields.map((field) => (
          <Input
            key={field.key}
            label={field.label}
            value={form[field.key]}
            placeholder={field.placeholder}
            helperText={field.helperText}
            error={errors[field.key]}
            editable={!disabled}
            keyboardType={field.keyboardType}
            autoCapitalize={field.autoCapitalize}
            multiline={field.multiline}
            numberOfLines={field.multiline ? 3 : 1}
            textAlignVertical={field.multiline ? 'top' : 'center'}
            onChangeText={(value) => onChange(field.key, value)}
            style={field.multiline ? styles.multilineInput : undefined}
          />
        ))}
      </View>
    </View>
  );
}

interface FiscalSummarySectionProps {
  clinic: clinicService.ClinicDetail | null;
  canEdit: boolean;
  onManage: () => void;
}

function FiscalSummarySection({
  clinic,
  canEdit,
  onManage,
}: FiscalSummarySectionProps): React.ReactElement {
  const { theme } = useTheme();
  const styles = useMemo(() => createSectionStyles(theme), [theme]);
  const fiscalComplete = isClinicFiscalComplete(clinic);
  const rows = [
    { label: 'Razón social', value: clinic?.legalName },
    { label: 'NIF/CIF', value: clinic?.taxId },
    { label: 'Dirección fiscal', value: clinic?.fiscalAddress },
    { label: 'Código postal', value: clinic?.fiscalPostalCode },
    { label: 'Ciudad', value: clinic?.fiscalCity },
    { label: 'País', value: clinic?.fiscalCountry },
  ];

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Datos fiscales</Text>
      <Text style={styles.sectionText}>
        La facturación de clínica usa estos datos para emitir facturas completas.
      </Text>

      <View style={styles.statusRow}>
        <Ionicons
          name={fiscalComplete ? 'checkmark-circle' : 'alert-circle-outline'}
          size={18}
          color={fiscalComplete ? theme.success : theme.warningAmber}
        />
        <Text
          style={[
            styles.statusText,
            { color: fiscalComplete ? theme.success : theme.warningAmber },
          ]}
        >
          {fiscalComplete ? 'Datos fiscales completos' : 'Faltan datos fiscales'}
        </Text>
      </View>

      <View style={styles.summaryRows}>
        {rows.map((row) => {
          const hasValue = hasText(row.value);
          return (
            <View key={row.label} style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{row.label}</Text>
              <Text style={[styles.summaryValue, !hasValue ? styles.summaryValueMuted : null]}>
                {formatFiscalValue(row.value)}
              </Text>
            </View>
          );
        })}
      </View>

      {canEdit ? (
        <Button
          variant="outline"
          size="medium"
          onPress={onManage}
          icon={<Ionicons name="receipt-outline" size={18} color={theme.primary} />}
          style={styles.manageButton}
        >
          Gestionar en Facturación
        </Button>
      ) : (
        <View style={styles.permissionNote}>
          <Ionicons name="lock-closed-outline" size={16} color={theme.warning} />
          <Text style={styles.permissionText}>
            Solo propietarios y administradores pueden modificar estos datos desde Facturación.
          </Text>
        </View>
      )}
    </View>
  );
}

const createStyles = (theme: Theme, isCompact: boolean) =>
  StyleSheet.create({
    formShell: {
      gap: spacing.lg,
    },
    formGrid: {
      flexDirection: isCompact ? 'column' : 'row',
      gap: spacing.lg,
      alignItems: 'flex-start',
    },
    footer: {
      flexDirection: isCompact ? 'column' : 'row',
      alignItems: isCompact ? 'stretch' : 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
      paddingTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    footerHint: {
      color: theme.textMuted,
      fontFamily: theme.fontSans,
      fontSize: 13,
      lineHeight: 19,
      flex: 1,
    },
    saveMessage: {
      fontFamily: theme.fontSansSemiBold,
      fontSize: 13,
      lineHeight: 19,
      flex: 1,
    },
    notice: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      backgroundColor: theme.warningBg,
      padding: spacing.md,
    },
    noticeText: {
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
      fontSize: 13,
      lineHeight: 19,
      flex: 1,
    },
    emptyPanel: {
      minHeight: 320,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      backgroundColor: theme.bgCard,
      padding: spacing.xl,
      gap: spacing.md,
    },
    emptyTitle: {
      color: theme.textPrimary,
      fontFamily: theme.fontSansBold,
      fontSize: 20,
      lineHeight: 26,
      textAlign: 'center',
    },
    emptyText: {
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
      fontSize: 14,
      lineHeight: 21,
      textAlign: 'center',
      maxWidth: 560,
    },
    statePanel: {
      minHeight: 260,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      backgroundColor: theme.bgCard,
      padding: spacing.xl,
      gap: spacing.md,
    },
    stateTitle: {
      color: theme.textPrimary,
      fontFamily: theme.fontSansBold,
      fontSize: 18,
      lineHeight: 24,
      textAlign: 'center',
    },
    stateText: {
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
      fontSize: 14,
      lineHeight: 21,
      textAlign: 'center',
    },
  });

const createSectionStyles = (theme: Theme) =>
  StyleSheet.create({
    section: {
      flex: 1,
      width: '100%',
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      backgroundColor: theme.bgCard,
      padding: spacing.lg,
    },
    sectionHighlighted: {
      borderColor: theme.primary,
      backgroundColor: theme.primaryAlpha12,
    },
    sectionTitle: {
      color: theme.textPrimary,
      fontFamily: theme.fontSansBold,
      fontSize: 18,
      lineHeight: 24,
      marginBottom: spacing.xs,
    },
    sectionText: {
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
      fontSize: 13,
      lineHeight: 19,
      marginBottom: spacing.lg,
    },
    fields: {
      gap: spacing.xs,
    },
    multilineInput: {
      minHeight: 86,
      paddingTop: spacing.sm,
    },
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginBottom: spacing.md,
    },
    statusText: {
      fontFamily: theme.fontSansSemiBold,
      fontSize: 13,
      lineHeight: 18,
    },
    summaryRows: {
      borderTopWidth: 1,
      borderTopColor: theme.border,
      marginBottom: spacing.lg,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      paddingVertical: spacing.sm,
    },
    summaryLabel: {
      color: theme.textMuted,
      fontFamily: theme.fontSans,
      fontSize: 13,
      lineHeight: 19,
      flex: 1,
    },
    summaryValue: {
      color: theme.textPrimary,
      fontFamily: theme.fontSansSemiBold,
      fontSize: 13,
      lineHeight: 19,
      flex: 1.25,
      textAlign: 'right',
    },
    summaryValueMuted: {
      color: theme.textMuted,
      fontFamily: theme.fontSans,
    },
    manageButton: {
      alignSelf: 'flex-start',
    },
    permissionNote: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      borderRadius: 8,
      backgroundColor: theme.warningBg,
      padding: spacing.sm,
    },
    permissionText: {
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
      fontSize: 12,
      lineHeight: 17,
      flex: 1,
    },
  });

export default ClinicSettingsScreen;
