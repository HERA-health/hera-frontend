import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { z } from 'zod';
import { AnimatedPressable } from '../../components/common/AnimatedPressable';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { useAppAlert } from '../../components/common/alert/AppAlertContext';
import { spacing } from '../../constants/colors';
import { Theme } from '../../constants/theme';
import type { ScreenProps } from '../../constants/types';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import * as clinicService from '../../services/clinicService';
import { ClinicWorkspaceScaffold } from './components/ClinicWorkspaceScaffold';
import { useClinicWorkspace } from './useClinicWorkspace';

interface ClinicTeamForm {
  displayName: string;
  email: string;
  phone: string;
  professionalTitle: string;
  licenseNumber: string;
  specialization: string;
  baseSessionPrice: string;
  revenueSharePercentage: string;
}

type ClinicTeamField = keyof ClinicTeamForm;
type ClinicTeamErrors = Partial<Record<ClinicTeamField, string>>;
type PanelMode = 'detail' | 'create' | 'edit';

interface TeamLoadFilters {
  status: clinicService.ClinicSpecialistStatusFilter;
  search: string;
}

interface FieldConfig {
  key: ClinicTeamField;
  label: string;
  placeholder: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'numeric';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  helperText?: string;
}

const EMPTY_FORM: ClinicTeamForm = {
  displayName: '',
  email: '',
  phone: '',
  professionalTitle: '',
  licenseNumber: '',
  specialization: '',
  baseSessionPrice: '',
  revenueSharePercentage: '',
};

const STATUS_FILTERS: Array<{
  value: clinicService.ClinicSpecialistStatusFilter;
  label: string;
}> = [
  { value: 'ACTIVE', label: 'Activos' },
  { value: 'ALL', label: 'Todos' },
  { value: 'INACTIVE', label: 'Inactivos' },
];

const formFields: FieldConfig[] = [
  {
    key: 'displayName',
    label: 'Nombre visible',
    placeholder: 'Dra. Ana Ruiz',
    autoCapitalize: 'words',
  },
  {
    key: 'email',
    label: 'Email de contacto',
    placeholder: 'ana@clinica.com',
    keyboardType: 'email-address',
    autoCapitalize: 'none',
  },
  {
    key: 'phone',
    label: 'Teléfono',
    placeholder: '+34 600 000 000',
    keyboardType: 'phone-pad',
  },
  {
    key: 'professionalTitle',
    label: 'Título profesional',
    placeholder: 'Psicóloga sanitaria',
    autoCapitalize: 'sentences',
  },
  {
    key: 'licenseNumber',
    label: 'Número colegiado',
    placeholder: 'M-00000',
    autoCapitalize: 'characters',
  },
  {
    key: 'specialization',
    label: 'Especialidad principal',
    placeholder: 'Ansiedad, terapia familiar...',
    autoCapitalize: 'sentences',
  },
  {
    key: 'baseSessionPrice',
    label: 'Tarifa base',
    placeholder: '60',
    keyboardType: 'numeric',
    helperText: 'Importe orientativo por sesión. No genera facturas todavía.',
  },
  {
    key: 'revenueSharePercentage',
    label: 'Porcentaje especialista',
    placeholder: '60',
    keyboardType: 'numeric',
    helperText: 'Porcentaje que correspondería al especialista en el reparto futuro.',
  },
];

const parseOptionalDecimal = (value: string): number | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = Number(trimmed.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
};

const optionalNumberString = (
  min: number,
  max: number | null,
  message: string
) => z.string().trim().refine((value) => {
  if (!value) return true;
  const parsed = parseOptionalDecimal(value);
  if (parsed === null) return false;
  return parsed >= min && (max === null || parsed <= max);
}, message);

const clinicTeamFormSchema = z.object({
  displayName: z.string().trim().min(2, 'Indica el nombre del especialista').max(160, 'Máximo 160 caracteres'),
  email: z.string().trim().max(180, 'Máximo 180 caracteres'),
  phone: z.string().trim().max(40, 'Máximo 40 caracteres'),
  professionalTitle: z.string().trim().max(160, 'Máximo 160 caracteres'),
  licenseNumber: z.string().trim().max(80, 'Máximo 80 caracteres'),
  specialization: z.string().trim().max(160, 'Máximo 160 caracteres'),
  baseSessionPrice: optionalNumberString(0, null, 'Introduce un importe válido'),
  revenueSharePercentage: optionalNumberString(0, 100, 'Introduce un porcentaje entre 0 y 100'),
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
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const mapSpecialistToForm = (
  specialist: clinicService.ClinicSpecialist
): ClinicTeamForm => ({
  displayName: specialist.displayName,
  email: specialist.email ?? '',
  phone: specialist.phone ?? '',
  professionalTitle: specialist.professionalTitle ?? '',
  licenseNumber: specialist.licenseNumber ?? '',
  specialization: specialist.specialization ?? '',
  baseSessionPrice: specialist.baseSessionPrice !== null ? String(specialist.baseSessionPrice) : '',
  revenueSharePercentage: specialist.revenueSharePercentage !== null
    ? String(specialist.revenueSharePercentage)
    : '',
});

const mapFormToPayload = (form: ClinicTeamForm): clinicService.ClinicSpecialistPayload => ({
  displayName: form.displayName.trim(),
  email: getEmptyToNull(form.email),
  phone: getEmptyToNull(form.phone),
  professionalTitle: getEmptyToNull(form.professionalTitle),
  licenseNumber: getEmptyToNull(form.licenseNumber),
  specialization: getEmptyToNull(form.specialization),
  baseSessionPrice: parseOptionalDecimal(form.baseSessionPrice),
  revenueSharePercentage: parseOptionalDecimal(form.revenueSharePercentage),
});

const getValidationErrors = (error: z.ZodError<ClinicTeamForm>): ClinicTeamErrors => {
  const nextErrors: ClinicTeamErrors = {};

  error.issues.forEach((issue) => {
    const field = issue.path[0];
    if (typeof field === 'string' && field in EMPTY_FORM) {
      nextErrors[field as ClinicTeamField] = issue.message;
    }
  });

  return nextErrors;
};

const formatMoney = (value: number | null): string =>
  value === null ? 'Sin tarifa' : `${value.toLocaleString('es-ES')} EUR`;

const formatPercentage = (value: number | null): string =>
  value === null ? 'Sin reparto' : `${value.toLocaleString('es-ES')}%`;

export function ClinicTeamScreen({
  navigation,
}: ScreenProps<'ClinicTeam'>): React.ReactElement {
  const { logout } = useAuth();
  const { theme } = useTheme();
  const alert = useAppAlert();
  const { width } = useWindowDimensions();
  const isCompact = width < 940;
  const styles = useMemo(() => createStyles(theme, isCompact), [isCompact, theme]);
  const workspace = useClinicWorkspace();

  const [specialists, setSpecialists] = useState<clinicService.ClinicSpecialist[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [teamError, setTeamError] = useState('');
  const [statusFilter, setStatusFilter] = useState<clinicService.ClinicSpecialistStatusFilter>('ACTIVE');
  const [search, setSearch] = useState('');
  const [selectedSpecialistId, setSelectedSpecialistId] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>('detail');
  const [form, setForm] = useState<ClinicTeamForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<ClinicTeamErrors>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const canManage = workspace.selectedMembership?.role === 'OWNER'
    || workspace.selectedMembership?.role === 'ADMIN';

  const selectedSpecialist = useMemo(
    () => specialists.find((specialist) => specialist.id === selectedSpecialistId) ?? null,
    [selectedSpecialistId, specialists],
  );

  const loadTeam = useCallback(async (clinicId: string, filters?: TeamLoadFilters) => {
    setTeamLoading(true);
    setTeamError('');

    const effectiveFilters = filters ?? {
      status: statusFilter,
      search,
    };

    try {
      const nextSpecialists = await clinicService.listClinicSpecialists(clinicId, {
        status: effectiveFilters.status,
        search: effectiveFilters.search.trim() || undefined,
      });
      setSpecialists(nextSpecialists);
      setSelectedSpecialistId((currentId) => (
        currentId && nextSpecialists.some((specialist) => specialist.id === currentId)
          ? currentId
          : nextSpecialists[0]?.id ?? null
      ));
    } catch (error: unknown) {
      setSpecialists([]);
      setSelectedSpecialistId(null);
      setTeamError(error instanceof Error ? error.message : 'No se pudo cargar el equipo');
    } finally {
      setTeamLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    const clinicId = workspace.selectedClinicId;
    if (!clinicId) {
      setSpecialists([]);
      setSelectedSpecialistId(null);
      setTeamError('');
      setTeamLoading(false);
      return undefined;
    }

    const timeoutId = setTimeout(() => {
      void loadTeam(clinicId);
    }, search.trim() ? 250 : 0);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [loadTeam, search, workspace.selectedClinicId]);

  const handleSelectClinic = useCallback((clinicId: string) => {
    setPanelMode('detail');
    setForm(EMPTY_FORM);
    setErrors({});
    setMessage('');
    void workspace.selectClinic(clinicId);
  }, [workspace]);

  const handleRetry = useCallback(() => {
    if (workspace.error) {
      void workspace.reload();
      return;
    }

    if (workspace.selectedClinicId) {
      void loadTeam(workspace.selectedClinicId);
    }
  }, [loadTeam, workspace]);

  const handleAdd = useCallback(() => {
    setSelectedSpecialistId(null);
    setPanelMode('create');
    setForm(EMPTY_FORM);
    setErrors({});
    setMessage('');
  }, []);

  const handleSelectSpecialist = useCallback((specialistId: string) => {
    setSelectedSpecialistId(specialistId);
    setPanelMode('detail');
    setErrors({});
    setMessage('');
  }, []);

  const handleEdit = useCallback(() => {
    if (!selectedSpecialist) return;
    setForm(mapSpecialistToForm(selectedSpecialist));
    setPanelMode('edit');
    setErrors({});
    setMessage('');
  }, [selectedSpecialist]);

  const handleChange = useCallback((field: ClinicTeamField, value: string) => {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
    setErrors((currentErrors) => ({ ...currentErrors, [field]: undefined }));
    setMessage('');
  }, []);

  const handleCancelForm = useCallback(() => {
    setPanelMode('detail');
    setForm(EMPTY_FORM);
    setErrors({});
    setMessage('');
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!workspace.selectedClinicId || !canManage) {
      return;
    }

    const parsedForm = clinicTeamFormSchema.safeParse(form);
    if (!parsedForm.success) {
      setErrors(getValidationErrors(parsedForm.error));
      setMessage('');
      return;
    }

    setSaving(true);
    setErrors({});
    setMessage('');

    try {
      const payload = mapFormToPayload(parsedForm.data);
      const savedSpecialist = panelMode === 'edit' && selectedSpecialist
        ? await clinicService.updateClinicSpecialist(
          workspace.selectedClinicId,
          selectedSpecialist.id,
          payload,
        )
        : await clinicService.createClinicSpecialist(workspace.selectedClinicId, payload);

      setSelectedSpecialistId(savedSpecialist.id);
      setPanelMode('detail');
      setForm(EMPTY_FORM);
      setMessage(panelMode === 'edit' ? 'Ficha actualizada.' : 'Especialista añadido al equipo.');

      if (panelMode === 'create') {
        setStatusFilter('ACTIVE');
        setSearch('');
        await loadTeam(workspace.selectedClinicId, {
          status: 'ACTIVE',
          search: '',
        });
        return;
      }

      await loadTeam(workspace.selectedClinicId);
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : 'No se pudo guardar la ficha');
    } finally {
      setSaving(false);
    }
  }, [canManage, form, loadTeam, panelMode, selectedSpecialist, workspace.selectedClinicId]);

  const handleStatusChange = useCallback(async () => {
    if (!workspace.selectedClinicId || !selectedSpecialist || !canManage) {
      return;
    }

    const nextStatus: clinicService.ClinicSpecialistStatus = selectedSpecialist.status === 'ACTIVE'
      ? 'INACTIVE'
      : 'ACTIVE';
    const confirmed = await alert.confirm({
      title: nextStatus === 'INACTIVE' ? 'Desactivar especialista' : 'Reactivar especialista',
      message: nextStatus === 'INACTIVE'
        ? 'La ficha dejará de aparecer como activa, pero se conservará para futuras asignaciones e histórico.'
        : 'La ficha volverá a estar disponible para el equipo de clínica.',
      confirmLabel: nextStatus === 'INACTIVE' ? 'Desactivar' : 'Reactivar',
      destructive: nextStatus === 'INACTIVE',
    });

    if (!confirmed) {
      return;
    }

    setSaving(true);
    setMessage('');

    try {
      const updatedSpecialist = await clinicService.updateClinicSpecialistStatus(
        workspace.selectedClinicId,
        selectedSpecialist.id,
        nextStatus,
      );
      setSelectedSpecialistId(updatedSpecialist.id);
      setMessage(nextStatus === 'INACTIVE' ? 'Especialista desactivado.' : 'Especialista reactivado.');
      await loadTeam(workspace.selectedClinicId);
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : 'No se pudo actualizar el estado');
    } finally {
      setSaving(false);
    }
  }, [alert, canManage, loadTeam, selectedSpecialist, workspace.selectedClinicId]);

  const clinicName = workspace.selectedMembership?.clinic.commercialName ?? 'Equipo de clínica';

  return (
    <ClinicWorkspaceScaffold
      title={clinicName}
      subtitle="Gestiona especialistas internos de la clínica sin publicar perfiles ni crear accesos profesionales todavía."
      memberships={workspace.memberships}
      selectedClinicId={workspace.selectedClinicId}
      loading={workspace.loading}
      error={workspace.error}
      onSelectClinic={handleSelectClinic}
      onRetry={handleRetry}
      action={workspace.selectedClinicId ? (
        <View style={styles.headerActions}>
          <Button
            variant="ghost"
            size="medium"
            onPress={() => navigation.navigate('ClinicDashboard')}
            icon={<Ionicons name="business-outline" size={18} color={theme.primary} />}
          >
            Panel
          </Button>
          <Button
            variant="primary"
            size="medium"
            onPress={handleAdd}
            disabled={!canManage || saving}
            icon={<Ionicons name="person-add-outline" size={18} color={theme.actionPrimaryText} />}
          >
            Añadir
          </Button>
        </View>
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
      ) : (
        <View style={styles.workspace}>
          {!canManage ? (
            <View style={styles.notice}>
              <Ionicons name="lock-closed-outline" size={18} color={theme.warning} />
              <Text style={styles.noticeText}>
                Tu rol puede pertenecer a una clínica, pero la gestión de equipo queda reservada a propietarios y administradores.
              </Text>
            </View>
          ) : null}

          <View style={styles.contentGrid}>
            <View style={styles.listPanel}>
              <View style={styles.listHeader}>
                <View>
                  <Text style={styles.panelTitle}>Especialistas</Text>
                  <Text style={styles.panelText}>
                    {teamLoading ? 'Actualizando listado' : `${specialists.length} fichas visibles`}
                  </Text>
                </View>
                {teamLoading ? <ActivityIndicator color={theme.primary} size="small" /> : null}
              </View>

              <Input
                value={search}
                label="Buscar"
                placeholder="Nombre, email, colegiado..."
                autoCapitalize="none"
                editable={!saving}
                leftIcon={<Ionicons name="search-outline" size={18} color={theme.textMuted} />}
                onChangeText={setSearch}
              />

              <StatusFilter
                value={statusFilter}
                onChange={setStatusFilter}
              />

              {teamError ? (
                <View style={styles.statePanel}>
                  <Ionicons name="alert-circle-outline" size={24} color={theme.warning} />
                  <Text style={styles.stateTitle}>No se pudo cargar el equipo</Text>
                  <Text style={styles.stateText}>{teamError}</Text>
                  <Button variant="outline" size="medium" onPress={handleRetry}>
                    Reintentar
                  </Button>
                </View>
              ) : specialists.length === 0 && !teamLoading ? (
                <View style={styles.statePanel}>
                  <Ionicons name="people-outline" size={26} color={theme.textMuted} />
                  <Text style={styles.stateTitle}>Aún no hay especialistas aquí</Text>
                  <Text style={styles.stateText}>
                    Añade fichas internas para preparar asignaciones, agenda y reparto económico en fases posteriores.
                  </Text>
                  <Button
                    variant="primary"
                    size="medium"
                    onPress={handleAdd}
                    disabled={!canManage}
                    icon={<Ionicons name="person-add-outline" size={18} color={theme.actionPrimaryText} />}
                  >
                    Añadir especialista
                  </Button>
                </View>
              ) : (
                <View style={styles.list}>
                  {specialists.map((specialist) => (
                    <SpecialistListItem
                      key={specialist.id}
                      specialist={specialist}
                      selected={specialist.id === selectedSpecialistId}
                      onPress={() => handleSelectSpecialist(specialist.id)}
                    />
                  ))}
                </View>
              )}
            </View>

            <View style={styles.detailPanel}>
              {panelMode === 'create' || panelMode === 'edit' ? (
                <TeamFormPanel
                  mode={panelMode}
                  form={form}
                  errors={errors}
                  saving={saving}
                  message={message}
                  canManage={canManage}
                  onChange={handleChange}
                  onSubmit={handleSubmit}
                  onCancel={handleCancelForm}
                />
              ) : selectedSpecialist ? (
                <SpecialistDetailPanel
                  specialist={selectedSpecialist}
                  saving={saving}
                  message={message}
                  canManage={canManage}
                  onEdit={handleEdit}
                  onStatusChange={handleStatusChange}
                />
              ) : (
                <View style={styles.statePanel}>
                  <Ionicons name="person-circle-outline" size={30} color={theme.textMuted} />
                  <Text style={styles.stateTitle}>Selecciona una ficha</Text>
                  <Text style={styles.stateText}>
                    Aquí verás los datos internos del especialista seleccionado.
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      )}
    </ClinicWorkspaceScaffold>
  );
}

interface StatusFilterProps {
  value: clinicService.ClinicSpecialistStatusFilter;
  onChange: (value: clinicService.ClinicSpecialistStatusFilter) => void;
}

function StatusFilter({ value, onChange }: StatusFilterProps): React.ReactElement {
  const { theme } = useTheme();
  const styles = useMemo(() => createStatusFilterStyles(theme), [theme]);

  return (
    <View style={styles.shell}>
      {STATUS_FILTERS.map((filter) => {
        const selected = filter.value === value;
        return (
          <AnimatedPressable
            key={filter.value}
            onPress={() => onChange(filter.value)}
            hoverLift={false}
            pressScale={0.98}
            style={[styles.option, selected ? styles.optionSelected : null]}
          >
            <Text style={[styles.optionText, selected ? styles.optionTextSelected : null]}>
              {filter.label}
            </Text>
          </AnimatedPressable>
        );
      })}
    </View>
  );
}

interface SpecialistListItemProps {
  specialist: clinicService.ClinicSpecialist;
  selected: boolean;
  onPress: () => void;
}

function SpecialistListItem({
  specialist,
  selected,
  onPress,
}: SpecialistListItemProps): React.ReactElement {
  const { theme } = useTheme();
  const styles = useMemo(() => createListItemStyles(theme), [theme]);

  return (
    <AnimatedPressable
      onPress={onPress}
      hoverLift={false}
      pressScale={0.99}
      style={[styles.item, selected ? styles.itemSelected : null]}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{specialist.displayName.slice(0, 1).toUpperCase()}</Text>
      </View>
      <View style={styles.itemContent}>
        <View style={styles.itemTop}>
          <Text style={styles.itemTitle} numberOfLines={1}>{specialist.displayName}</Text>
          <StatusBadge status={specialist.status} />
        </View>
        <Text style={styles.itemMeta} numberOfLines={1}>
          {specialist.professionalTitle ?? specialist.specialization ?? 'Ficha interna de clínica'}
        </Text>
        <Text style={styles.itemSubMeta} numberOfLines={1}>
          {formatMoney(specialist.baseSessionPrice)} / {formatPercentage(specialist.revenueSharePercentage)}
        </Text>
      </View>
    </AnimatedPressable>
  );
}

interface StatusBadgeProps {
  status: clinicService.ClinicSpecialistStatus;
}

function StatusBadge({ status }: StatusBadgeProps): React.ReactElement {
  const { theme } = useTheme();
  const styles = useMemo(() => createBadgeStyles(theme), [theme]);
  const active = status === 'ACTIVE';

  return (
    <View style={[styles.badge, active ? styles.badgeActive : styles.badgeInactive]}>
      <Text style={[styles.badgeText, active ? styles.badgeTextActive : styles.badgeTextInactive]}>
        {active ? 'Activo' : 'Inactivo'}
      </Text>
    </View>
  );
}

interface SpecialistDetailPanelProps {
  specialist: clinicService.ClinicSpecialist;
  saving: boolean;
  message: string;
  canManage: boolean;
  onEdit: () => void;
  onStatusChange: () => void;
}

function SpecialistDetailPanel({
  specialist,
  saving,
  message,
  canManage,
  onEdit,
  onStatusChange,
}: SpecialistDetailPanelProps): React.ReactElement {
  const { theme } = useTheme();
  const styles = useMemo(() => createDetailStyles(theme), [theme]);
  const nextStatusLabel = specialist.status === 'ACTIVE' ? 'Desactivar' : 'Reactivar';
  const nextStatusIcon = specialist.status === 'ACTIVE' ? 'pause-circle-outline' : 'play-circle-outline';

  const rows = [
    ['Email', specialist.email ?? 'Sin email'],
    ['Teléfono', specialist.phone ?? 'Sin teléfono'],
    ['Título', specialist.professionalTitle ?? 'Sin título'],
    ['Colegiado', specialist.licenseNumber ?? 'Sin colegiado'],
    ['Especialidad', specialist.specialization ?? 'Sin especialidad'],
    ['Tarifa base', formatMoney(specialist.baseSessionPrice)],
    ['Reparto especialista', formatPercentage(specialist.revenueSharePercentage)],
  ] as const;

  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="person-outline" size={22} color={theme.primary} />
        </View>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>{specialist.displayName}</Text>
          <Text style={styles.subtitle}>
            Ficha interna. No se publica en el marketplace de HERA.
          </Text>
        </View>
        <StatusBadge status={specialist.status} />
      </View>

      <View style={styles.rows}>
        {rows.map(([label, value]) => (
          <View key={label} style={styles.row}>
            <Text style={styles.rowLabel}>{label}</Text>
            <Text style={styles.rowValue}>{value}</Text>
          </View>
        ))}
      </View>

      {message ? (
        <Text style={[
          styles.message,
          { color: message.includes('No se') ? theme.error : theme.success },
        ]}>
          {message}
        </Text>
      ) : (
        <Text style={styles.hint}>
          Esta ficha servirá para asignaciones, agenda y reparto cuando esas fases estén activas.
        </Text>
      )}

      <View style={styles.actions}>
        <Button
          variant="outline"
          size="medium"
          onPress={onEdit}
          disabled={!canManage || saving}
          icon={<Ionicons name="create-outline" size={18} color={theme.primary} />}
        >
          Editar ficha
        </Button>
        <Button
          variant={specialist.status === 'ACTIVE' ? 'danger' : 'secondary'}
          size="medium"
          onPress={onStatusChange}
          disabled={!canManage || saving}
          loading={saving}
          icon={<Ionicons name={nextStatusIcon} size={18} color={specialist.status === 'ACTIVE' ? theme.textOnPrimary : theme.primary} />}
        >
          {nextStatusLabel}
        </Button>
      </View>
    </View>
  );
}

interface TeamFormPanelProps {
  mode: 'create' | 'edit';
  form: ClinicTeamForm;
  errors: ClinicTeamErrors;
  saving: boolean;
  message: string;
  canManage: boolean;
  onChange: (field: ClinicTeamField, value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

function TeamFormPanel({
  mode,
  form,
  errors,
  saving,
  message,
  canManage,
  onChange,
  onSubmit,
  onCancel,
}: TeamFormPanelProps): React.ReactElement {
  const { theme } = useTheme();
  const styles = useMemo(() => createFormStyles(theme), [theme]);
  const disabled = !canManage || saving;

  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>
            {mode === 'create' ? 'Nuevo especialista' : 'Editar especialista'}
          </Text>
          <Text style={styles.subtitle}>
            Datos internos de clínica. El especialista no recibirá acceso en esta fase.
          </Text>
        </View>
      </View>

      <View style={styles.fields}>
        {formFields.map((field) => (
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

      {message ? (
        <Text style={[
          styles.message,
          { color: message.includes('No se') ? theme.error : theme.success },
        ]}>
          {message}
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
          {mode === 'create' ? 'Crear ficha' : 'Guardar'}
        </Button>
      </View>
    </View>
  );
}

const createStyles = (theme: Theme, isCompact: boolean) =>
  StyleSheet.create({
    workspace: {
      gap: spacing.lg,
    },
    headerActions: {
      flexDirection: 'row',
      gap: spacing.sm,
      alignItems: 'center',
      justifyContent: 'flex-end',
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
    contentGrid: {
      flexDirection: isCompact ? 'column' : 'row',
      alignItems: 'flex-start',
      gap: spacing.lg,
    },
    listPanel: {
      width: '100%',
      flex: isCompact ? undefined : 1,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      backgroundColor: theme.bgCard,
      padding: spacing.lg,
      gap: spacing.md,
    },
    detailPanel: {
      width: '100%',
      maxWidth: isCompact ? undefined : 430,
    },
    listHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: spacing.md,
    },
    panelTitle: {
      color: theme.textPrimary,
      fontFamily: theme.fontSansBold,
      fontSize: 20,
      lineHeight: 26,
    },
    panelText: {
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
      fontSize: 13,
      lineHeight: 19,
      marginTop: spacing.xs,
    },
    list: {
      gap: spacing.sm,
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
      minHeight: 220,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      backgroundColor: theme.bgMuted,
      padding: spacing.lg,
      gap: spacing.md,
    },
    stateTitle: {
      color: theme.textPrimary,
      fontFamily: theme.fontSansBold,
      fontSize: 17,
      lineHeight: 23,
      textAlign: 'center',
    },
    stateText: {
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
      fontSize: 14,
      lineHeight: 21,
      textAlign: 'center',
      maxWidth: 420,
    },
  });

const createStatusFilterStyles = (theme: Theme) =>
  StyleSheet.create({
    shell: {
      flexDirection: 'row',
      gap: spacing.xs,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      padding: spacing.xs,
      backgroundColor: theme.bgMuted,
    },
    option: {
      flex: 1,
      minHeight: 38,
      borderRadius: 6,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.sm,
    },
    optionSelected: {
      backgroundColor: theme.bgCard,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    optionText: {
      color: theme.textMuted,
      fontFamily: theme.fontSansSemiBold,
      fontSize: 13,
      lineHeight: 18,
    },
    optionTextSelected: {
      color: theme.textPrimary,
    },
  });

const createListItemStyles = (theme: Theme) =>
  StyleSheet.create({
    item: {
      minHeight: 92,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      backgroundColor: theme.bgElevated,
      padding: spacing.md,
    },
    itemSelected: {
      borderColor: theme.focus,
      backgroundColor: theme.primaryAlpha12,
    },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.secondaryMuted,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    avatarText: {
      color: theme.textPrimary,
      fontFamily: theme.fontSansBold,
      fontSize: 18,
      lineHeight: 22,
    },
    itemContent: {
      flex: 1,
      minWidth: 0,
      gap: 3,
    },
    itemTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    itemTitle: {
      flex: 1,
      color: theme.textPrimary,
      fontFamily: theme.fontSansBold,
      fontSize: 15,
      lineHeight: 21,
    },
    itemMeta: {
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
      fontSize: 13,
      lineHeight: 18,
    },
    itemSubMeta: {
      color: theme.textMuted,
      fontFamily: theme.fontSans,
      fontSize: 12,
      lineHeight: 17,
    },
  });

const createBadgeStyles = (theme: Theme) =>
  StyleSheet.create({
    badge: {
      minHeight: 26,
      borderRadius: 999,
      paddingHorizontal: spacing.sm,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
    },
    badgeActive: {
      backgroundColor: theme.successBg,
      borderColor: theme.status.confirmed.border,
    },
    badgeInactive: {
      backgroundColor: theme.bgMuted,
      borderColor: theme.border,
    },
    badgeText: {
      fontFamily: theme.fontSansSemiBold,
      fontSize: 12,
      lineHeight: 16,
    },
    badgeTextActive: {
      color: theme.success,
    },
    badgeTextInactive: {
      color: theme.textMuted,
    },
  });

const createDetailStyles = (theme: Theme) =>
  StyleSheet.create({
    panel: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      backgroundColor: theme.bgCard,
      padding: spacing.lg,
      gap: spacing.lg,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.md,
    },
    headerIcon: {
      width: 42,
      height: 42,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primaryAlpha12,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    headerCopy: {
      flex: 1,
      minWidth: 0,
      gap: spacing.xs,
    },
    title: {
      color: theme.textPrimary,
      fontFamily: theme.fontSansBold,
      fontSize: 20,
      lineHeight: 26,
    },
    subtitle: {
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
      fontSize: 13,
      lineHeight: 19,
    },
    rows: {
      gap: spacing.xs,
    },
    row: {
      minHeight: 42,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
      paddingVertical: spacing.sm,
    },
    rowLabel: {
      color: theme.textMuted,
      fontFamily: theme.fontSansSemiBold,
      fontSize: 12,
      lineHeight: 17,
    },
    rowValue: {
      flex: 1,
      color: theme.textPrimary,
      fontFamily: theme.fontSans,
      fontSize: 13,
      lineHeight: 19,
      textAlign: 'right',
    },
    hint: {
      color: theme.textMuted,
      fontFamily: theme.fontSans,
      fontSize: 13,
      lineHeight: 19,
    },
    message: {
      fontFamily: theme.fontSansSemiBold,
      fontSize: 13,
      lineHeight: 19,
    },
    actions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      justifyContent: 'flex-end',
    },
  });

const createFormStyles = (theme: Theme) =>
  StyleSheet.create({
    panel: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      backgroundColor: theme.bgCard,
      padding: spacing.lg,
      gap: spacing.lg,
    },
    header: {
      gap: spacing.xs,
    },
    title: {
      color: theme.textPrimary,
      fontFamily: theme.fontSansBold,
      fontSize: 20,
      lineHeight: 26,
    },
    subtitle: {
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
      fontSize: 13,
      lineHeight: 19,
    },
    fields: {
      gap: spacing.xs,
    },
    message: {
      fontFamily: theme.fontSansSemiBold,
      fontSize: 13,
      lineHeight: 19,
    },
    actions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'flex-end',
      gap: spacing.sm,
    },
  });

export default ClinicTeamScreen;
