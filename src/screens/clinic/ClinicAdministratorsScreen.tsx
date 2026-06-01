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
import { useAppAlert } from '../../components/common/alert/AppAlertContext';
import { spacing } from '../../constants/colors';
import { Theme } from '../../constants/theme';
import type { ScreenProps } from '../../constants/types';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import * as clinicService from '../../services/clinicService';
import { ClinicWorkspaceScaffold } from './components/ClinicWorkspaceScaffold';
import { useClinicWorkspace } from './useClinicWorkspace';

type FeedbackMessage = { type: 'success' | 'error'; text: string };
type SavingAction = {
  membershipId: string;
  action: 'role' | 'status';
} | null;
type ClinicAdministratorAccountStatus = clinicService.ClinicAdministrator['user']['accountStatus'];
type ClinicAdministratorLinkedSpecialistStatus =
  NonNullable<clinicService.ClinicAdministrator['linkedSpecialist']>['status'];

const administratorEmailSchema = z.object({
  email: z.string().trim().email('Introduce un email válido'),
});

const ROLE_LABELS: Record<Extract<clinicService.ClinicMembershipRole, 'OWNER' | 'ADMIN'>, string> = {
  OWNER: 'Propietario',
  ADMIN: 'Administrador',
};

const STATUS_LABELS: Record<clinicService.ClinicMembershipStatus, string> = {
  ACTIVE: 'Activo',
  INACTIVE: 'Inactivo',
};

const USER_TYPE_LABELS: Record<clinicService.ClinicAdministratorUserType, string> = {
  PROFESSIONAL: 'Profesional',
  CLINIC: 'Clínica',
};

const ACCOUNT_STATUS_LABELS: Record<ClinicAdministratorAccountStatus, string> = {
  ACTIVE: 'Activa',
  SUSPENDED: 'Suspendida',
  DELETED: 'Eliminada',
};

const LINKED_SPECIALIST_STATUS_LABELS: Record<ClinicAdministratorLinkedSpecialistStatus, string> = {
  ACTIVE: 'activa',
  INACTIVE: 'inactiva',
};

const formatDate = (value: string): string =>
  new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));

const getInitials = (name: string): string => {
  const [first, second] = name.trim().split(/\s+/);
  return `${first?.[0] ?? 'A'}${second?.[0] ?? ''}`.toUpperCase();
};

const mergeAdministrator = (
  administrators: clinicService.ClinicAdministrator[],
  updatedAdministrator: clinicService.ClinicAdministrator,
): clinicService.ClinicAdministrator[] => administrators.map((administrator) => (
  administrator.id === updatedAdministrator.id ? updatedAdministrator : administrator
));

export function ClinicAdministratorsScreen({
  navigation,
}: ScreenProps<'ClinicAdministrators'>): React.ReactElement {
  const { logout, user } = useAuth();
  const { theme } = useTheme();
  const alert = useAppAlert();
  const { width } = useWindowDimensions();
  const isCompact = width < 940;
  const styles = useMemo(() => createStyles(theme, isCompact), [isCompact, theme]);
  const workspace = useClinicWorkspace();
  const mountedRef = useRef(true);
  const administratorsRequestSeq = useRef(0);
  const selectedClinicIdRef = useRef<string | null>(workspace.selectedClinicId);

  const [administrators, setAdministrators] = useState<clinicService.ClinicAdministrator[]>([]);
  const [administratorsLoading, setAdministratorsLoading] = useState(false);
  const [administratorsError, setAdministratorsError] = useState('');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [message, setMessage] = useState<FeedbackMessage | null>(null);
  const [adding, setAdding] = useState(false);
  const [savingAction, setSavingAction] = useState<SavingAction>(null);

  const canManage = user?.type === 'clinic' && workspace.selectedMembership?.role === 'OWNER';
  const clinicName = workspace.selectedMembership?.clinic.commercialName;

  const activeOwnerCount = useMemo(
    () => administrators.filter((administrator) => (
      administrator.role === 'OWNER'
      && administrator.status === 'ACTIVE'
      && administrator.user.userType === 'CLINIC'
      && administrator.user.accountStatus === 'ACTIVE'
    )).length,
    [administrators],
  );

  const isCurrentClinic = useCallback((clinicId: string) => (
    mountedRef.current && selectedClinicIdRef.current === clinicId
  ), []);

  const loadAdministrators = useCallback(async (clinicId: string) => {
    const requestId = administratorsRequestSeq.current + 1;
    administratorsRequestSeq.current = requestId;
    setAdministratorsLoading(true);
    setAdministratorsError('');

    try {
      const nextAdministrators = await clinicService.listClinicAdministrators(clinicId);
      if (!mountedRef.current || administratorsRequestSeq.current !== requestId) return;
      setAdministrators(nextAdministrators);
    } catch (error: unknown) {
      if (!mountedRef.current || administratorsRequestSeq.current !== requestId) return;
      setAdministrators([]);
      setAdministratorsError(
        error instanceof Error ? error.message : 'No se pudieron cargar los administradores',
      );
    } finally {
      if (mountedRef.current && administratorsRequestSeq.current === requestId) {
        setAdministratorsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      administratorsRequestSeq.current += 1;
    };
  }, []);

  useEffect(() => {
    selectedClinicIdRef.current = workspace.selectedClinicId;
  }, [workspace.selectedClinicId]);

  useEffect(() => {
    if (!workspace.selectedClinicId) {
      administratorsRequestSeq.current += 1;
      setAdministrators([]);
      setAdministratorsError('');
      setAdministratorsLoading(false);
      setEmail('');
      setEmailError('');
      setMessage(null);
      return;
    }

    administratorsRequestSeq.current += 1;
    setAdministrators([]);
    setAdministratorsError('');
    setAdministratorsLoading(false);
    setEmail('');
    setEmailError('');
    setMessage(null);
    void loadAdministrators(workspace.selectedClinicId);
  }, [loadAdministrators, workspace.selectedClinicId]);

  const handleSelectClinic = useCallback((clinicId: string) => {
    void workspace.selectClinic(clinicId);
  }, [workspace]);

  const handleRetry = useCallback(() => {
    if (workspace.error) {
      void workspace.reload();
      return;
    }

    if (workspace.selectedClinicId) {
      void loadAdministrators(workspace.selectedClinicId);
    }
  }, [loadAdministrators, workspace]);

  const handleEmailChange = useCallback((value: string) => {
    setEmail(value);
    setEmailError('');
    setMessage(null);
  }, []);

  const handleAddAdministrator = useCallback(async () => {
    const clinicIdAtSubmit = workspace.selectedClinicId;
    if (!clinicIdAtSubmit || !canManage) {
      return;
    }

    const parsed = administratorEmailSchema.safeParse({ email });
    if (!parsed.success) {
      setEmailError(parsed.error.issues[0]?.message ?? 'Introduce un email válido');
      setMessage(null);
      return;
    }

    const administratorEmail = parsed.data.email.trim();
    const confirmed = await alert.confirm({
      title: 'Añadir administrador',
      message: `${administratorEmail} tendrá acceso administrativo a esta clínica si la cuenta cumple los requisitos. Si ya existía una pertenencia inactiva, se reactivará.`,
      confirmLabel: 'Añadir administrador',
      destructive: false,
    });

    if (!confirmed || !isCurrentClinic(clinicIdAtSubmit)) {
      return;
    }

    setAdding(true);
    setEmailError('');
    setMessage(null);

    try {
      const administrator = await clinicService.addClinicAdministrator(
        clinicIdAtSubmit,
        { email: administratorEmail },
      );
      if (!isCurrentClinic(clinicIdAtSubmit)) return;
      setAdministrators((current) => {
        const exists = current.some((item) => item.id === administrator.id);
        return exists ? mergeAdministrator(current, administrator) : [...current, administrator];
      });
      setEmail('');
      setMessage({
        type: 'success',
        text: 'Administrador añadido a la clínica.',
      });
    } catch (error: unknown) {
      if (!isCurrentClinic(clinicIdAtSubmit)) return;
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'No se pudo añadir el administrador',
      });
    } finally {
      if (mountedRef.current) {
        setAdding(false);
      }
    }
  }, [alert, canManage, email, isCurrentClinic, workspace.selectedClinicId]);

  const handleChangeRole = useCallback(async (
    administrator: clinicService.ClinicAdministrator,
  ) => {
    const clinicIdAtSubmit = workspace.selectedClinicId;
    if (
      !clinicIdAtSubmit
      || !canManage
      || administrator.status !== 'ACTIVE'
      || administrator.user.accountStatus !== 'ACTIVE'
    ) {
      return;
    }

    const nextRole: Extract<clinicService.ClinicMembershipRole, 'OWNER' | 'ADMIN'> =
      administrator.role === 'OWNER' ? 'ADMIN' : 'OWNER';
    if (nextRole === 'OWNER' && administrator.user.userType !== 'CLINIC') {
      return;
    }

    const confirmed = await alert.confirm({
      title: nextRole === 'OWNER' ? 'Convertir en propietario' : 'Cambiar a administrador',
      message: nextRole === 'OWNER'
        ? `${administrator.user.name} podrá gestionar administradores y cambios sensibles de la clínica.`
        : `${administrator.user.name} conservará acceso administrativo, pero no podrá gestionar propietarios.`,
      confirmLabel: nextRole === 'OWNER' ? 'Hacer propietario' : 'Cambiar rol',
      destructive: false,
    });

    if (!confirmed || !isCurrentClinic(clinicIdAtSubmit)) {
      return;
    }

    setSavingAction({ membershipId: administrator.id, action: 'role' });
    setMessage(null);

    try {
      const updatedAdministrator = await clinicService.updateClinicAdministratorRole(
        clinicIdAtSubmit,
        administrator.id,
        { role: nextRole },
      );
      if (!isCurrentClinic(clinicIdAtSubmit)) return;
      setAdministrators((current) => mergeAdministrator(current, updatedAdministrator));
      setMessage({
        type: 'success',
        text: 'Rol actualizado.',
      });
    } catch (error: unknown) {
      if (!isCurrentClinic(clinicIdAtSubmit)) return;
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'No se pudo cambiar el rol',
      });
    } finally {
      if (mountedRef.current) {
        setSavingAction(null);
      }
    }
  }, [alert, canManage, isCurrentClinic, workspace.selectedClinicId]);

  const handleChangeStatus = useCallback(async (
    administrator: clinicService.ClinicAdministrator,
  ) => {
    const clinicIdAtSubmit = workspace.selectedClinicId;
    if (!clinicIdAtSubmit || !canManage) {
      return;
    }

    const nextStatus: clinicService.ClinicMembershipStatus =
      administrator.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    if (nextStatus === 'ACTIVE' && administrator.user.accountStatus !== 'ACTIVE') {
      return;
    }
    const confirmed = await alert.confirm({
      title: nextStatus === 'ACTIVE' ? 'Reactivar administrador' : 'Desactivar administrador',
      message: nextStatus === 'ACTIVE'
        ? `${administrator.user.name} recuperará acceso administrativo a esta clínica.`
        : `${administrator.user.name} dejará de acceder a la consola administrativa de esta clínica.`,
      confirmLabel: nextStatus === 'ACTIVE' ? 'Reactivar' : 'Desactivar',
      destructive: nextStatus === 'INACTIVE',
    });

    if (!confirmed || !isCurrentClinic(clinicIdAtSubmit)) {
      return;
    }

    setSavingAction({ membershipId: administrator.id, action: 'status' });
    setMessage(null);

    try {
      const updatedAdministrator = await clinicService.updateClinicAdministratorStatus(
        clinicIdAtSubmit,
        administrator.id,
        { status: nextStatus },
      );
      if (!isCurrentClinic(clinicIdAtSubmit)) return;
      setAdministrators((current) => mergeAdministrator(current, updatedAdministrator));
      setMessage({
        type: 'success',
        text: nextStatus === 'ACTIVE' ? 'Administrador reactivado.' : 'Administrador desactivado.',
      });
    } catch (error: unknown) {
      if (!isCurrentClinic(clinicIdAtSubmit)) return;
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'No se pudo cambiar el estado',
      });
    } finally {
      if (mountedRef.current) {
        setSavingAction(null);
      }
    }
  }, [alert, canManage, isCurrentClinic, workspace.selectedClinicId]);

  const renderContent = () => {
    if (!workspace.selectedMembership) {
      return (
        <View style={styles.emptyPanel}>
          <Ionicons name="business-outline" size={30} color={theme.textMuted} />
          <Text style={styles.emptyTitle}>No hay clínica administrable</Text>
          <Text style={styles.emptyText}>
            Esta cuenta no tiene una pertenencia activa como propietario o administrador de clínica.
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
      );
    }

    if (administratorsLoading) {
      return (
        <View style={styles.statePanel}>
          <ActivityIndicator color={theme.primary} size="small" />
          <Text style={styles.stateText}>Cargando administradores</Text>
        </View>
      );
    }

    if (administratorsError) {
      return (
        <View style={styles.statePanel}>
          <Ionicons name="alert-circle-outline" size={26} color={theme.warning} />
          <Text style={styles.stateTitle}>No se pudo cargar la administración</Text>
          <Text style={styles.stateText}>{administratorsError}</Text>
          <Button variant="outline" size="medium" onPress={handleRetry}>
            Reintentar
          </Button>
        </View>
      );
    }

    return (
      <View style={styles.workspace}>
        {!canManage ? (
          <View style={styles.notice}>
            <Ionicons name="lock-closed-outline" size={18} color={theme.warning} />
            <Text style={styles.noticeText}>
              Puedes consultar quién administra la clínica, pero solo propietarios activos pueden cambiar roles o accesos.
            </Text>
          </View>
        ) : null}

        {message ? (
          <View style={[
            styles.messagePanel,
            {
              borderColor: message.type === 'error' ? theme.error : theme.status.confirmed.border,
              backgroundColor: message.type === 'error' ? theme.errorBg : theme.successBg,
            },
          ]}>
            <Ionicons
              name={message.type === 'error' ? 'alert-circle-outline' : 'checkmark-circle-outline'}
              size={18}
              color={message.type === 'error' ? theme.error : theme.success}
            />
            <Text style={[
              styles.messageText,
              { color: message.type === 'error' ? theme.error : theme.success },
            ]}>
              {message.text}
            </Text>
          </View>
        ) : null}

        <View style={styles.contentGrid}>
          <View style={styles.listPanel}>
            <View style={styles.panelHeader}>
              <View>
                <Text style={styles.panelTitle}>Administradores</Text>
                <Text style={styles.panelText}>
                  Usuarios con acceso real a la consola operativa de clínica.
                </Text>
              </View>
              <View style={styles.counterBadge}>
                <Text style={styles.counterText}>{administrators.length}</Text>
              </View>
            </View>

            {administrators.length === 0 ? (
              <View style={styles.emptyList}>
                <Ionicons name="shield-outline" size={26} color={theme.textMuted} />
                <Text style={styles.emptyTitle}>Sin administradores visibles</Text>
                <Text style={styles.emptyText}>
                  Añade al menos un usuario real para operar la clínica sin usar una cuenta compartida.
                </Text>
              </View>
            ) : (
              <View style={styles.adminList}>
                {administrators.map((administrator) => {
                  const isLastActiveOwner = administrator.role === 'OWNER'
                    && administrator.status === 'ACTIVE'
                    && administrator.user.userType === 'CLINIC'
                    && activeOwnerCount <= 1;
                  const roleSaving = savingAction?.membershipId === administrator.id
                    && savingAction.action === 'role';
                  const statusSaving = savingAction?.membershipId === administrator.id
                    && savingAction.action === 'status';

                  return (
                    <AdministratorCard
                      key={administrator.id}
                      administrator={administrator}
                      canManage={canManage}
                      isLastActiveOwner={isLastActiveOwner}
                      roleSaving={roleSaving}
                      statusSaving={statusSaving}
                      disabled={adding || savingAction !== null}
                      onChangeRole={handleChangeRole}
                      onChangeStatus={handleChangeStatus}
                    />
                  );
                })}
              </View>
            )}
          </View>

          <AddAdministratorPanel
            email={email}
            error={emailError}
            adding={adding}
            canManage={canManage}
            onEmailChange={handleEmailChange}
            onAdd={handleAddAdministrator}
          />
        </View>
      </View>
    );
  };

  return (
    <ClinicWorkspaceScaffold
      title="Administradores"
      contextLabel={clinicName}
      subtitle="Gestiona propietarios y administradores como usuarios reales, separados del equipo asistencial."
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
      {renderContent()}
    </ClinicWorkspaceScaffold>
  );
}

interface AdministratorCardProps {
  administrator: clinicService.ClinicAdministrator;
  canManage: boolean;
  isLastActiveOwner: boolean;
  roleSaving: boolean;
  statusSaving: boolean;
  disabled: boolean;
  onChangeRole: (administrator: clinicService.ClinicAdministrator) => void;
  onChangeStatus: (administrator: clinicService.ClinicAdministrator) => void;
}

function AdministratorCard({
  administrator,
  canManage,
  isLastActiveOwner,
  roleSaving,
  statusSaving,
  disabled,
  onChangeRole,
  onChangeStatus,
}: AdministratorCardProps): React.ReactElement {
  const { theme } = useTheme();
  const styles = useMemo(() => createAdministratorStyles(theme), [theme]);
  const roleActionLabel = administrator.role === 'OWNER' ? 'Pasar a admin' : 'Hacer owner';
  const statusActionLabel = administrator.status === 'ACTIVE' ? 'Desactivar' : 'Reactivar';
  const accountIsActive = administrator.user.accountStatus === 'ACTIVE';
  const canChangeRole = administrator.role === 'OWNER' || administrator.user.userType === 'CLINIC';
  const linkedSpecialistStatus = administrator.linkedSpecialist
    ? LINKED_SPECIALIST_STATUS_LABELS[administrator.linkedSpecialist.status]
    : null;
  const roleDisabled = !canManage
    || !canChangeRole
    || disabled
    || administrator.status !== 'ACTIVE'
    || !accountIsActive
    || isLastActiveOwner;
  const statusDisabled = !canManage
    || disabled
    || isLastActiveOwner
    || (administrator.status === 'INACTIVE' && !accountIsActive);

  return (
    <View style={[
      styles.card,
      administrator.status === 'INACTIVE' ? styles.cardInactive : null,
    ]}>
      <View style={styles.identityRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials(administrator.user.name)}</Text>
        </View>
        <View style={styles.identityCopy}>
          <Text style={styles.name}>{administrator.user.name}</Text>
          <Text style={styles.email}>{administrator.user.email}</Text>
        </View>
        <StatusPill status={administrator.status} />
      </View>

      <View style={styles.metaGrid}>
        <MetaItem label="Tipo" value={USER_TYPE_LABELS[administrator.user.userType]} />
        <MetaItem label="Cuenta" value={ACCOUNT_STATUS_LABELS[administrator.user.accountStatus]} />
        <MetaItem label="Rol" value={ROLE_LABELS[administrator.role]} />
        <MetaItem label="Alta" value={formatDate(administrator.createdAt)} />
        <MetaItem label="Actualizado" value={formatDate(administrator.updatedAt)} />
      </View>

      <View style={styles.specialistNote}>
        <Ionicons
          name={administrator.linkedSpecialist ? 'link-outline' : 'unlink-outline'}
          size={16}
          color={administrator.linkedSpecialist
            ? administrator.linkedSpecialist.status === 'ACTIVE'
              ? theme.success
              : theme.warning
            : theme.textMuted}
        />
        <Text style={styles.specialistText}>
          {administrator.linkedSpecialist
            ? `También vinculado como ${administrator.linkedSpecialist.displayName} (${linkedSpecialistStatus})`
            : 'Sin ficha asistencial vinculada'}
        </Text>
      </View>

      {!accountIsActive ? (
        <Text style={styles.accountHint}>
          La cuenta no está activa; no puede recibir nuevos permisos ni reactivarse hasta resolver su estado.
        </Text>
      ) : null}

      {isLastActiveOwner ? (
        <Text style={styles.lockHint}>
          Es el último propietario activo; no se puede demitir ni desactivar.
        </Text>
      ) : null}

      <View style={styles.actions}>
        {canChangeRole ? (
          <Button
            variant="outline"
            size="small"
            onPress={() => onChangeRole(administrator)}
            disabled={roleDisabled}
            loading={roleSaving}
            icon={<Ionicons name="swap-horizontal-outline" size={16} color={theme.primary} />}
          >
            {roleActionLabel}
          </Button>
        ) : null}
        <Button
          variant={administrator.status === 'ACTIVE' ? 'danger' : 'secondary'}
          size="small"
          onPress={() => onChangeStatus(administrator)}
          disabled={statusDisabled}
          loading={statusSaving}
          icon={<Ionicons
            name={administrator.status === 'ACTIVE' ? 'pause-circle-outline' : 'play-circle-outline'}
            size={16}
            color={administrator.status === 'ACTIVE' ? theme.textOnPrimary : theme.primary}
          />}
        >
          {statusActionLabel}
        </Button>
      </View>
    </View>
  );
}

interface MetaItemProps {
  label: string;
  value: string;
}

function MetaItem({ label, value }: MetaItemProps): React.ReactElement {
  const { theme } = useTheme();
  const styles = useMemo(() => createAdministratorStyles(theme), [theme]);

  return (
    <View style={styles.metaItem}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

interface StatusPillProps {
  status: clinicService.ClinicMembershipStatus;
}

function StatusPill({ status }: StatusPillProps): React.ReactElement {
  const { theme } = useTheme();
  const styles = useMemo(() => createAdministratorStyles(theme), [theme]);
  const active = status === 'ACTIVE';

  return (
    <View style={[
      styles.statusPill,
      {
        backgroundColor: active ? theme.successBg : theme.bgMuted,
        borderColor: active ? theme.status.confirmed.border : theme.border,
      },
    ]}>
      <Text style={[
        styles.statusText,
        { color: active ? theme.success : theme.textMuted },
      ]}>
        {STATUS_LABELS[status]}
      </Text>
    </View>
  );
}

interface AddAdministratorPanelProps {
  email: string;
  error: string;
  adding: boolean;
  canManage: boolean;
  onEmailChange: (value: string) => void;
  onAdd: () => void;
}

function AddAdministratorPanel({
  email,
  error,
  adding,
  canManage,
  onEmailChange,
  onAdd,
}: AddAdministratorPanelProps): React.ReactElement {
  const { theme } = useTheme();
  const styles = useMemo(() => createInviteStyles(theme), [theme]);

  return (
    <View style={styles.panel}>
      <View style={styles.iconShell}>
        <Ionicons name="shield-checkmark-outline" size={22} color={theme.primary} />
      </View>
      <View>
        <Text style={styles.title}>Añadir administrador</Text>
        <Text style={styles.text}>
          Usa el email de una cuenta profesional o de clínica ya registrada en HERA.
        </Text>
      </View>
      <Input
        label="Email de usuario"
        value={email}
        placeholder="admin@clinica.com"
        keyboardType="email-address"
        autoCapitalize="none"
        error={error}
        editable={canManage && !adding}
        onChangeText={onEmailChange}
      />
      {!canManage ? (
        <Text style={styles.lockedText}>
          Solo propietarios activos pueden añadir o reactivar administradores.
        </Text>
      ) : null}
      <Button
        variant="primary"
        size="medium"
        onPress={onAdd}
        loading={adding}
        disabled={!canManage || adding || !email.trim()}
        icon={<Ionicons name="add-circle-outline" size={18} color={theme.actionPrimaryText} />}
      >
        Añadir
      </Button>
    </View>
  );
}

const createStyles = (theme: Theme, isCompact: boolean) =>
  StyleSheet.create({
    workspace: {
      gap: spacing.lg,
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
    panelHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
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
    counterBadge: {
      minWidth: 36,
      height: 32,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.bgMuted,
      paddingHorizontal: spacing.sm,
    },
    counterText: {
      color: theme.textPrimary,
      fontFamily: theme.fontSansBold,
      fontSize: 14,
      lineHeight: 18,
    },
    adminList: {
      gap: spacing.sm,
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
    messagePanel: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderWidth: 1,
      borderRadius: 8,
      padding: spacing.md,
    },
    messageText: {
      flex: 1,
      fontFamily: theme.fontSansSemiBold,
      fontSize: 13,
      lineHeight: 19,
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
    emptyList: {
      minHeight: 260,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      backgroundColor: theme.bgMuted,
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

const createAdministratorStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      backgroundColor: theme.bgElevated,
      padding: spacing.md,
      gap: spacing.md,
    },
    cardInactive: {
      backgroundColor: theme.bgMuted,
    },
    identityRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.borderLight,
      backgroundColor: theme.primaryAlpha12,
    },
    avatarText: {
      color: theme.textPrimary,
      fontFamily: theme.fontSansBold,
      fontSize: 15,
      lineHeight: 20,
    },
    identityCopy: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    name: {
      color: theme.textPrimary,
      fontFamily: theme.fontSansBold,
      fontSize: 16,
      lineHeight: 22,
    },
    email: {
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
      fontSize: 13,
      lineHeight: 18,
    },
    statusPill: {
      minHeight: 26,
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: spacing.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statusText: {
      fontFamily: theme.fontSansSemiBold,
      fontSize: 12,
      lineHeight: 16,
    },
    metaGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    metaItem: {
      flexGrow: 1,
      flexBasis: 132,
      minHeight: 54,
      borderWidth: 1,
      borderColor: theme.borderLight,
      borderRadius: 8,
      backgroundColor: theme.bgCard,
      padding: spacing.sm,
      gap: 2,
    },
    metaLabel: {
      color: theme.textMuted,
      fontFamily: theme.fontSansSemiBold,
      fontSize: 11,
      lineHeight: 15,
      textTransform: 'uppercase',
    },
    metaValue: {
      color: theme.textPrimary,
      fontFamily: theme.fontSans,
      fontSize: 13,
      lineHeight: 18,
    },
    specialistNote: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: theme.borderLight,
      borderRadius: 8,
      backgroundColor: theme.bgCard,
      padding: spacing.sm,
    },
    specialistText: {
      flex: 1,
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
      fontSize: 13,
      lineHeight: 18,
    },
    accountHint: {
      color: theme.warning,
      fontFamily: theme.fontSansSemiBold,
      fontSize: 12,
      lineHeight: 17,
    },
    lockHint: {
      color: theme.warning,
      fontFamily: theme.fontSansSemiBold,
      fontSize: 12,
      lineHeight: 17,
    },
    actions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'flex-end',
      gap: spacing.sm,
    },
  });

const createInviteStyles = (theme: Theme) =>
  StyleSheet.create({
    panel: {
      width: '100%',
      maxWidth: 360,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      backgroundColor: theme.bgCard,
      padding: spacing.lg,
      gap: spacing.md,
    },
    iconShell: {
      width: 44,
      height: 44,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.borderLight,
      backgroundColor: theme.primaryAlpha12,
    },
    title: {
      color: theme.textPrimary,
      fontFamily: theme.fontSansBold,
      fontSize: 18,
      lineHeight: 24,
      marginBottom: spacing.xs,
    },
    text: {
      color: theme.textSecondary,
      fontFamily: theme.fontSans,
      fontSize: 13,
      lineHeight: 19,
    },
    lockedText: {
      color: theme.textMuted,
      fontFamily: theme.fontSans,
      fontSize: 12,
      lineHeight: 17,
    },
  });

export default ClinicAdministratorsScreen;
