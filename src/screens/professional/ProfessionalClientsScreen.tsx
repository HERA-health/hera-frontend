import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { z } from 'zod';
import { AnimatedPressable, Button, Card } from '../../components/common';
import { borderRadius, shadows, spacing, typography } from '../../constants/colors';
import type { RootStackParamList } from '../../constants/types';
import type { Theme } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { getErrorCode, getErrorMessage } from '../../constants/errors';
import * as professionalService from '../../services/professionalService';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'ProfessionalClients'>;
type SourceFilter = professionalService.ClientSource | 'ALL';
type LifecycleFilter = professionalService.ClientLifecycleFilter;

const managedClientSchema = z.object({
  firstName: z.string().trim().min(2, 'Introduce el nombre'),
  lastName: z.string().trim().min(2, 'Introduce los apellidos'),
  email: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || '')
    .refine((value) => value.length === 0 || z.string().email().safeParse(value).success, {
      message: 'Introduce un email válido',
    }),
  phone: z.string().trim().optional().transform((value) => value || ''),
  billingFullName: z.string().trim().optional().transform((value) => value || ''),
  billingTaxId: z.string().trim().optional().transform((value) => value || ''),
  billingAddress: z.string().trim().optional().transform((value) => value || ''),
  billingPostalCode: z.string().trim().optional().transform((value) => value || ''),
  billingCity: z.string().trim().optional().transform((value) => value || ''),
  billingCountry: z.string().trim().optional().transform((value) => value || 'Spain'),
  consentOnFile: z.boolean().refine((value) => value === true, {
    message: 'Debes confirmar que dispones del consentimiento informado',
  }),
});

type ManagedClientForm = z.infer<typeof managedClientSchema>;

const FILTERS: Array<{ label: string; value: SourceFilter }> = [
  { label: 'Todos', value: 'ALL' },
  { label: 'Registrados', value: 'REGISTERED' },
  { label: 'Gestionados', value: 'MANAGED' },
];

const LIFECYCLE_FILTERS: Array<{ label: string; value: LifecycleFilter }> = [
  { label: 'Activos', value: 'ACTIVE' },
  { label: 'Archivados', value: 'ARCHIVED' },
  { label: 'Todos', value: 'ALL' },
];

const emptyForm: ManagedClientForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  billingFullName: '',
  billingTaxId: '',
  billingAddress: '',
  billingPostalCode: '',
  billingCity: '',
  billingCountry: 'Spain',
  consentOnFile: false,
};

const textStyles = {
  caption: { fontSize: typography.fontSizes.xs, lineHeight: 18 },
  bodySmall: { fontSize: typography.fontSizes.sm, lineHeight: 21 },
  body: { fontSize: typography.fontSizes.md, lineHeight: 24 },
  h4: { fontSize: typography.fontSizes.xl, lineHeight: 28 },
  h3: { fontSize: typography.fontSizes.xxl, lineHeight: 32 },
  h1: { fontSize: typography.fontSizes.xxxxl, lineHeight: 40 },
};

const formatDate = (date?: string | Date | null, options?: Intl.DateTimeFormatOptions) => {
  if (!date) {
    return 'Sin fecha';
  }

  return new Date(date).toLocaleDateString('es-ES', options || {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const getConsentLabel = (client: professionalService.Client): string => {
  if (client.consentOnFile) {
    return 'Consentimiento vigente';
  }

  return 'Pendiente de consentimiento';
};

const getConsentTone = (
  client: professionalService.Client,
  theme: Theme
): { backgroundColor: string; color: string } =>
  client.consentOnFile
    ? { backgroundColor: theme.success + '18', color: theme.success }
    : { backgroundColor: theme.warning + '18', color: theme.warning };

function SegmentedFilterGroup<T extends string>({
  label,
  options,
  activeValue,
  onChange,
  theme,
}: {
  label: string;
  options: Array<{ label: string; value: T }>;
  activeValue: T;
  onChange: (value: T) => void;
  theme: Theme;
}) {
  return (
    <View style={styles.segmentedGroup}>
      <Text style={[styles.segmentedLabel, { color: theme.textMuted }]}>{label}</Text>
      <View
        style={[
          styles.segmentedTrack,
          {
            backgroundColor: theme.bgMuted,
            borderColor: theme.border,
          },
        ]}
      >
        {options.map((option) => {
          const active = option.value === activeValue;

          return (
            <AnimatedPressable
              key={option.value}
              onPress={() => onChange(option.value)}
              hoverLift={false}
              pressScale={0.98}
              style={[
                styles.segmentedOption,
                active && {
                  backgroundColor: theme.bgCard,
                  borderColor: theme.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.segmentedOptionText,
                  { color: active ? theme.textPrimary : theme.textSecondary },
                ]}
              >
                {option.label}
              </Text>
            </AnimatedPressable>
          );
        })}
      </View>
    </View>
  );
}

function MetricCard({
  icon,
  label,
  value,
  theme,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  theme: Theme;
}) {
  return (
    <Card variant="default" padding="large" style={styles.metricCard}>
      <View style={[styles.metricIconWrap, { backgroundColor: theme.primary + '16' }]}>
        <Ionicons name={icon} size={18} color={theme.primary} />
      </View>
      <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>{label}</Text>
      <Text style={[styles.metricValue, { color: theme.textPrimary }]}>{value}</Text>
    </Card>
  );
}

export function ProfessionalClientsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { width } = useWindowDimensions();
  const { theme, isDark } = useTheme();
  const stylesForTheme = useMemo(() => createStyles(theme, isDark), [theme, isDark]);
  const isDesktop = width >= 1180;
  const isTablet = width >= 768 && width < 1180;
  const isMobile = width < 768;

  const [clients, setClients] = useState<professionalService.Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('ALL');
  const [lifecycleFilter, setLifecycleFilter] = useState<LifecycleFilter>('ACTIVE');
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState<ManagedClientForm>(emptyForm);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof ManagedClientForm, string>>>({});

  const gridColumns = isDesktop ? 3 : isTablet ? 2 : 1;
  const gridItemWidth = isDesktop ? '31.8%' : isTablet ? '48.8%' : '100%';

  const loadClients = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await professionalService.getProfessionalClients(sourceFilter, lifecycleFilter);
      setClients(data);
    } catch (loadError: unknown) {
      setError(getErrorMessage(loadError, 'No se pudo cargar tu base de pacientes'));
    } finally {
      setLoading(false);
    }
  }, [lifecycleFilter, sourceFilter]);

  useEffect(() => {
    void loadClients();
  }, [loadClients]);

  const filteredClients = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return clients.filter((client) => {
      if (!query) {
        return true;
      }

      const haystacks = [
        client.displayName,
        client.primaryEmail,
        client.primaryPhone,
        client.user?.email,
      ]
        .filter(Boolean)
        .map((value) => value!.toLowerCase());

      return haystacks.some((value) => value.includes(query));
    });
  }, [clients, searchQuery]);

  const resetForm = () => {
    setForm(emptyForm);
    setFormErrors({});
  };

  const updateFormField = <K extends keyof ManagedClientForm>(field: K, value: ManagedClientForm[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
    setFormErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleCreateManagedClient = async () => {
    try {
      setSaving(true);
      setFormErrors({});

      const parsed = managedClientSchema.parse(form);
      const created = await professionalService.createManagedClient({
        ...parsed,
        consentOnFile: true,
        consentVersion: 'v1',
      });

      setClients((current) => [created, ...current]);
      setModalVisible(false);
      resetForm();
    } catch (createError: unknown) {
      if (createError instanceof z.ZodError) {
        const nextErrors: Partial<Record<keyof ManagedClientForm, string>> = {};
        createError.issues.forEach((issue) => {
          const field = issue.path[0] as keyof ManagedClientForm | undefined;
          if (field) {
            nextErrors[field] = issue.message;
          }
        });
        setFormErrors(nextErrors);
        return;
      }

      const errorCode = getErrorCode(createError);
      if (errorCode === 'DATA_PROCESSING_AGREEMENT_REQUIRED') {
        setError('Debes aceptar el encargo de tratamiento desde el Área clínica antes de crear pacientes gestionados.');
        setModalVisible(false);
        return;
      }

      setError(getErrorMessage(createError, 'No se pudo crear el paciente gestionado'));
    } finally {
      setSaving(false);
    }
  };

  const renderClientCard = (client: professionalService.Client) => {
    const consentTone = getConsentTone(client, theme);
    const nextSession = client.sessions
      ?.filter((session) => new Date(session.date).getTime() > Date.now())
      .sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime())[0];

    return (
      <Card
        key={client.id}
        variant="default"
        padding="large"
        hoverLift
        style={stylesForTheme.clientCard}
        onPress={() => navigation.navigate('ClientProfile', { clientId: client.id })}
      >
        <View style={stylesForTheme.clientHeader}>
          <View style={[stylesForTheme.avatar, { backgroundColor: theme.primary + '14' }]}>
            {client.user?.avatar ? (
              <Image
                source={{ uri: client.user.avatar }}
                style={{ width: '100%', height: '100%', borderRadius: 18 }}
              />
            ) : (
              <Text style={[stylesForTheme.avatarText, { color: theme.primary }]}>
                {client.initials || client.displayName?.slice(0, 1) || 'P'}
              </Text>
            )}
          </View>

          <View style={stylesForTheme.clientHeaderInfo}>
            <View style={stylesForTheme.badgeRow}>
              <View
                style={[
                  stylesForTheme.sourceBadge,
                  {
                    backgroundColor:
                      client.source === 'MANAGED' ? theme.secondary + '16' : theme.primary + '12',
                  },
                ]}
              >
                <Text
                  style={[
                    stylesForTheme.sourceBadgeText,
                    { color: client.source === 'MANAGED' ? theme.secondary : theme.primary },
                  ]}
                >
                  {client.source === 'MANAGED' ? 'Gestionado' : 'Registrado'}
                </Text>
                </View>
              {client.archivedAt ? (
                <View
                  style={[
                    stylesForTheme.sourceBadge,
                    { backgroundColor: theme.textMuted + '14' },
                  ]}
                >
                  <Text style={[stylesForTheme.sourceBadgeText, { color: theme.textMuted }]}>
                    Archivado
                  </Text>
                </View>
              ) : null}
              <View style={[stylesForTheme.consentBadge, { backgroundColor: consentTone.backgroundColor }]}>
                <Text style={[stylesForTheme.consentBadgeText, { color: consentTone.color }]}>
                  {getConsentLabel(client)}
                </Text>
              </View>
            </View>

            <Text style={[stylesForTheme.clientName, { color: theme.textPrimary }]}>
              {client.displayName || client.user?.name || 'Paciente'}
            </Text>
            <Text style={[stylesForTheme.clientMeta, { color: theme.textSecondary }]}>
              {client.primaryEmail || 'Sin email registrado'}
            </Text>
          </View>
        </View>

        <View style={stylesForTheme.statRow}>
          <View style={stylesForTheme.statBlock}>
            <Text style={[stylesForTheme.statLabel, { color: theme.textMuted }]}>Sesiones</Text>
            <Text style={[stylesForTheme.statValue, { color: theme.textPrimary }]}>
              {client.sessions?.length || 0}
            </Text>
          </View>
          <View style={stylesForTheme.statBlock}>
            <Text style={[stylesForTheme.statLabel, { color: theme.textMuted }]}>Próxima</Text>
            <Text style={[stylesForTheme.statValue, { color: theme.textPrimary }]}>
              {nextSession ? formatDate(nextSession.date, { day: 'numeric', month: 'short' }) : 'Sin cita'}
            </Text>
          </View>
        </View>

        <View style={stylesForTheme.infoRow}>
          <Ionicons name="call-outline" size={16} color={theme.textMuted} />
          <Text style={[stylesForTheme.infoText, { color: theme.textSecondary }]}>
            {client.primaryPhone || 'Sin teléfono'}
          </Text>
        </View>
      </Card>
    );
  };

  const renderClientGrid = () => {
    const rows = [];

    for (let i = 0; i < filteredClients.length; i += gridColumns) {
      const rowItems = filteredClients.slice(i, i + gridColumns);
      rows.push(
        <View key={`row-${i}`} style={stylesForTheme.gridRow}>
          {rowItems.map((client) => (
            <View key={client.id} style={[stylesForTheme.gridItem, { width: gridItemWidth }]}>
              {renderClientCard(client)}
            </View>
          ))}
        </View>
      );
    }

    return rows;
  };

  return (
    <>
      <ScrollView
        style={[stylesForTheme.screen, { backgroundColor: theme.bg }]}
        contentContainerStyle={[
          stylesForTheme.content,
          width < 720 ? stylesForTheme.contentCompact : null,
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={stylesForTheme.hero}>
          <View style={stylesForTheme.heroTextBlock}>
            <Text style={[stylesForTheme.eyebrow, { color: theme.primary }]}>CRM clínico</Text>
            <Text style={[stylesForTheme.title, { color: theme.textPrimary }]}>Mis pacientes</Text>
          </View>

          <Button
            variant="primary"
            size="large"
            onPress={() => {
              resetForm();
              setModalVisible(true);
            }}
            icon={<Ionicons name="add" size={18} color={theme.textOnPrimary} />}
          >
            Nuevo paciente
          </Button>
        </View>

        <Card variant="default" padding="large" style={stylesForTheme.toolbarCard}>
          <View style={stylesForTheme.searchRow}>
            <View style={[stylesForTheme.searchField, { borderColor: theme.border, backgroundColor: theme.bgMuted }]}>
              <Ionicons name="search-outline" size={18} color={theme.textMuted} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Buscar por nombre, email o teléfono"
                placeholderTextColor={theme.textMuted}
                style={[stylesForTheme.searchInput, { color: theme.textPrimary }]}
              />
            </View>
          </View>

          <View style={stylesForTheme.filtersBar}>
            <SegmentedFilterGroup
              label="Tipo"
              options={FILTERS}
              activeValue={sourceFilter}
              onChange={setSourceFilter}
              theme={theme}
            />
            <SegmentedFilterGroup
              label="Estado"
              options={LIFECYCLE_FILTERS}
              activeValue={lifecycleFilter}
              onChange={setLifecycleFilter}
              theme={theme}
            />
          </View>
        </Card>

        {error ? (
          <Card variant="outlined" padding="large" style={stylesForTheme.errorCard}>
            <View style={stylesForTheme.errorRow}>
              <Ionicons name="alert-circle-outline" size={20} color={theme.warning} />
              <Text style={[stylesForTheme.errorText, { color: theme.textSecondary }]}>{error}</Text>
            </View>
          </Card>
        ) : null}

        {loading ? (
          <View style={stylesForTheme.loadingState}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[stylesForTheme.loadingText, { color: theme.textSecondary }]}>
              Cargando pacientes...
            </Text>
          </View>
        ) : filteredClients.length === 0 ? (
          <Card variant="outlined" padding="large" style={stylesForTheme.emptyCard}>
              <Ionicons name="people-outline" size={28} color={theme.textMuted} />
            <Text style={[stylesForTheme.emptyTitle, { color: theme.textPrimary }]}>
              No hay pacientes para este filtro
            </Text>
            <Text style={[stylesForTheme.emptyText, { color: theme.textSecondary }]}>
              {lifecycleFilter === 'ARCHIVED'
                ? 'Todavía no tienes pacientes archivados con este filtro.'
                : 'Puedes crear un paciente gestionado o cambiar los filtros para ver tu base completa.'}
            </Text>
          </Card>
        ) : (
          <View style={stylesForTheme.clientsGrid}>{renderClientGrid()}</View>
        )}
      </ScrollView>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={stylesForTheme.modalBackdrop}>
          <Card
            variant="default"
            padding="none"
            style={isMobile ? [stylesForTheme.modalCard, stylesForTheme.modalCardMobile] : stylesForTheme.modalCard}
          >
            <ScrollView
              contentContainerStyle={stylesForTheme.modalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={stylesForTheme.modalHeader}>
                <View style={stylesForTheme.modalHeaderCopy}>
                  <Text style={[stylesForTheme.modalTitle, { color: theme.textPrimary }]}>Nuevo paciente gestionado</Text>
                  <Text style={[stylesForTheme.modalSubtitle, { color: theme.textSecondary }]}>
                    Crea una ficha administrativa mínima. El expediente clínico permanecerá pendiente hasta adjuntar el consentimiento firmado y desbloquear el área clínica.
                  </Text>
                </View>
                <AnimatedPressable
                  onPress={() => setModalVisible(false)}
                  hoverLift={false}
                  pressScale={0.96}
                  style={[stylesForTheme.closeButton, { backgroundColor: theme.bgMuted }]}
                >
                  <Ionicons name="close" size={18} color={theme.textSecondary} />
                </AnimatedPressable>
              </View>

              <View style={[stylesForTheme.formGrid, isMobile ? stylesForTheme.formGridMobile : null]}>
                <View style={stylesForTheme.field}>
                  <Text style={[stylesForTheme.fieldLabel, { color: theme.textSecondary }]}>Nombre</Text>
                  <TextInput
                    value={form.firstName}
                    onChangeText={(value) => updateFormField('firstName', value)}
                    style={[stylesForTheme.input, { color: theme.textPrimary, borderColor: formErrors.firstName ? theme.error : theme.border }]}
                    placeholder="Nombre"
                    placeholderTextColor={theme.textMuted}
                  />
                  {formErrors.firstName ? (
                    <Text style={[stylesForTheme.fieldError, { color: theme.error }]}>{formErrors.firstName}</Text>
                  ) : null}
                </View>

                <View style={stylesForTheme.field}>
                  <Text style={[stylesForTheme.fieldLabel, { color: theme.textSecondary }]}>Apellidos</Text>
                  <TextInput
                    value={form.lastName}
                    onChangeText={(value) => updateFormField('lastName', value)}
                    style={[stylesForTheme.input, { color: theme.textPrimary, borderColor: formErrors.lastName ? theme.error : theme.border }]}
                    placeholder="Apellidos"
                    placeholderTextColor={theme.textMuted}
                  />
                  {formErrors.lastName ? (
                    <Text style={[stylesForTheme.fieldError, { color: theme.error }]}>{formErrors.lastName}</Text>
                  ) : null}
                </View>

                <View style={stylesForTheme.field}>
                  <Text style={[stylesForTheme.fieldLabel, { color: theme.textSecondary }]}>Email</Text>
                  <TextInput
                    value={form.email}
                    onChangeText={(value) => updateFormField('email', value)}
                    style={[stylesForTheme.input, { color: theme.textPrimary, borderColor: formErrors.email ? theme.error : theme.border }]}
                    placeholder="Email opcional"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    placeholderTextColor={theme.textMuted}
                  />
                  {formErrors.email ? (
                    <Text style={[stylesForTheme.fieldError, { color: theme.error }]}>{formErrors.email}</Text>
                  ) : null}
                </View>

                <View style={stylesForTheme.field}>
                  <Text style={[stylesForTheme.fieldLabel, { color: theme.textSecondary }]}>Teléfono</Text>
                  <TextInput
                    value={form.phone}
                    onChangeText={(value) => updateFormField('phone', value)}
                    style={[stylesForTheme.input, { color: theme.textPrimary, borderColor: formErrors.phone ? theme.error : theme.border }]}
                    placeholder="Teléfono opcional"
                    keyboardType="phone-pad"
                    placeholderTextColor={theme.textMuted}
                  />
                  {formErrors.phone ? (
                    <Text style={[stylesForTheme.fieldError, { color: theme.error }]}>{formErrors.phone}</Text>
                  ) : null}
                </View>

                <View style={[stylesForTheme.field, { flexBasis: '100%' }]}>
                  <Text style={[stylesForTheme.fieldLabel, { color: theme.textSecondary }]}>
                    Datos fiscales para factura completa
                  </Text>
                  <Text style={[stylesForTheme.fieldHint, { color: theme.textMuted }]}>
                    Opcional. Puedes dejarlo preparado ahora o completarlo más adelante desde la ficha del paciente.
                  </Text>
                </View>

                <View style={stylesForTheme.field}>
                  <Text style={[stylesForTheme.fieldLabel, { color: theme.textSecondary }]}>Nombre fiscal</Text>
                  <TextInput
                    value={form.billingFullName}
                    onChangeText={(value) => updateFormField('billingFullName', value)}
                    style={[stylesForTheme.input, { color: theme.textPrimary, borderColor: theme.border }]}
                    placeholder="Nombre y apellidos"
                    placeholderTextColor={theme.textMuted}
                  />
                </View>

                <View style={stylesForTheme.field}>
                  <Text style={[stylesForTheme.fieldLabel, { color: theme.textSecondary }]}>NIF/NIE</Text>
                  <TextInput
                    value={form.billingTaxId}
                    onChangeText={(value) => updateFormField('billingTaxId', value)}
                    style={[stylesForTheme.input, { color: theme.textPrimary, borderColor: theme.border }]}
                    placeholder="12345678A"
                    autoCapitalize="characters"
                    placeholderTextColor={theme.textMuted}
                  />
                </View>

                <View style={[stylesForTheme.field, { flexBasis: '100%' }]}>
                  <Text style={[stylesForTheme.fieldLabel, { color: theme.textSecondary }]}>Dirección fiscal</Text>
                  <TextInput
                    value={form.billingAddress}
                    onChangeText={(value) => updateFormField('billingAddress', value)}
                    style={[stylesForTheme.input, { color: theme.textPrimary, borderColor: theme.border }]}
                    placeholder="Calle, número, piso..."
                    placeholderTextColor={theme.textMuted}
                  />
                </View>

                <View style={stylesForTheme.field}>
                  <Text style={[stylesForTheme.fieldLabel, { color: theme.textSecondary }]}>Código postal</Text>
                  <TextInput
                    value={form.billingPostalCode}
                    onChangeText={(value) => updateFormField('billingPostalCode', value)}
                    style={[stylesForTheme.input, { color: theme.textPrimary, borderColor: theme.border }]}
                    placeholder="28001"
                    placeholderTextColor={theme.textMuted}
                  />
                </View>

                <View style={stylesForTheme.field}>
                  <Text style={[stylesForTheme.fieldLabel, { color: theme.textSecondary }]}>Ciudad</Text>
                  <TextInput
                    value={form.billingCity}
                    onChangeText={(value) => updateFormField('billingCity', value)}
                    style={[stylesForTheme.input, { color: theme.textPrimary, borderColor: theme.border }]}
                    placeholder="Madrid"
                    placeholderTextColor={theme.textMuted}
                  />
                </View>

                <View style={stylesForTheme.field}>
                  <Text style={[stylesForTheme.fieldLabel, { color: theme.textSecondary }]}>País</Text>
                  <TextInput
                    value={form.billingCountry}
                    onChangeText={(value) => updateFormField('billingCountry', value)}
                    style={[stylesForTheme.input, { color: theme.textPrimary, borderColor: theme.border }]}
                    placeholder="Spain"
                    placeholderTextColor={theme.textMuted}
                  />
                </View>
              </View>

              <View style={[stylesForTheme.consentPanel, { backgroundColor: theme.bgMuted, borderColor: theme.border }]}>
                <View style={stylesForTheme.consentPanelCopy}>
                  <Text style={[stylesForTheme.consentPanelTitle, { color: theme.textPrimary }]}>
                    Declaración previa del profesional
                  </Text>
                  <Text style={[stylesForTheme.consentPanelText, { color: theme.textSecondary }]}>
                    Confirmas que cuentas con el consentimiento informado y que adjuntarás el documento firmado en el área clínica antes de activar el expediente.
                  </Text>
                </View>
                <Switch
                  value={form.consentOnFile}
                  onValueChange={(value) => updateFormField('consentOnFile', value)}
                  trackColor={{ false: theme.border, true: theme.primary }}
                  thumbColor={theme.textOnPrimary}
                />
              </View>
              {formErrors.consentOnFile ? (
                <Text style={[stylesForTheme.fieldError, { color: theme.error }]}>{formErrors.consentOnFile}</Text>
              ) : null}

              <View style={[stylesForTheme.modalActions, isMobile ? stylesForTheme.modalActionsMobile : null]}>
                <Button variant="ghost" size="medium" onPress={() => setModalVisible(false)} fullWidth={isMobile}>
                  Cancelar
                </Button>
                <Button variant="primary" size="medium" onPress={handleCreateManagedClient} loading={saving} fullWidth={isMobile}>
                  Crear paciente
                </Button>
              </View>
            </ScrollView>
          </Card>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  segmentedGroup: {
    gap: 6,
    minWidth: 220,
  },
  segmentedLabel: {
    ...textStyles.caption,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  segmentedTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  segmentedOption: {
    minHeight: 34,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentedOptionText: {
    ...textStyles.bodySmall,
    fontWeight: '700',
  },
  metricCard: {
    flex: 1,
    minWidth: 170,
  },
  metricIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  metricLabel: {
    ...textStyles.caption,
    marginBottom: 6,
  },
  metricValue: {
    ...textStyles.h3,
    fontWeight: '700',
  },
});

const createStyles = (theme: Theme, isDark: boolean) =>
  StyleSheet.create({
    screen: {
      flex: 1,
    },
    content: {
      padding: spacing.lg,
      gap: spacing.lg,
      paddingBottom: spacing.xxl,
      maxWidth: 1320,
      width: '100%',
      alignSelf: 'center',
    },
    contentCompact: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
    },
    hero: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: spacing.lg,
      alignItems: 'flex-end',
      flexWrap: 'wrap',
    },
    heroTextBlock: {
      flex: 1,
      minWidth: 280,
      gap: 8,
    },
    eyebrow: {
      ...textStyles.caption,
      textTransform: 'uppercase',
      letterSpacing: 1.2,
      fontWeight: '700',
    },
    title: {
      ...textStyles.h1,
      fontWeight: '700',
    },
    toolbarCard: {
      gap: spacing.md,
    },
    compactStatsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    compactStat: {
      borderRadius: borderRadius.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      minWidth: 110,
      gap: 2,
    },
    compactStatLabel: {
      ...textStyles.caption,
      fontWeight: '700',
    },
    compactStatValue: {
      ...textStyles.body,
      fontWeight: '700',
    },
    searchRow: {
      flexDirection: 'row',
      gap: spacing.md,
      flexWrap: 'wrap',
    },
    searchField: {
      minHeight: 52,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      paddingHorizontal: spacing.md,
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.sm,
      flex: 1,
      minWidth: 260,
    },
    searchInput: {
      flex: 1,
      ...textStyles.body,
      minHeight: 44,
    },
    filterRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    filtersBar: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
      alignItems: 'flex-start',
    },
    errorCard: {
      borderColor: theme.warning + '35',
      backgroundColor: isDark ? theme.bgMuted : '#FFF7EC',
    },
    errorRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      alignItems: 'center',
    },
    errorText: {
      ...textStyles.body,
      flex: 1,
    },
    loadingState: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.md,
      paddingVertical: spacing.xxl,
    },
    loadingText: {
      ...textStyles.body,
    },
    emptyCard: {
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.xxl,
    },
    emptyTitle: {
      ...textStyles.h4,
      fontWeight: '700',
    },
    emptyText: {
      ...textStyles.body,
      maxWidth: 520,
      textAlign: 'center',
    },
    clientsGrid: {
      gap: spacing.md,
    },
    gridRow: {
      flexDirection: 'row',
      gap: spacing.md,
      alignItems: 'stretch',
    },
    gridItem: {
      alignSelf: 'stretch',
    },
    clientCard: {
      gap: spacing.md,
      minWidth: 0,
      height: '100%',
    },
    clientHeader: {
      flexDirection: 'row',
      gap: spacing.md,
      alignItems: 'flex-start',
    },
    avatar: {
      width: 52,
      height: 52,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    avatarImage: {
      width: '100%',
      height: '100%',
      borderRadius: 18,
    },
    avatarText: {
      ...textStyles.body,
      fontWeight: '700',
    },
    clientHeaderInfo: {
      flex: 1,
      gap: 6,
    },
    badgeRow: {
      flexDirection: 'row',
      gap: spacing.xs,
      flexWrap: 'wrap',
    },
    sourceBadge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 6,
      borderRadius: 999,
    },
    sourceBadgeText: {
      ...textStyles.caption,
      fontWeight: '700',
    },
    consentBadge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 6,
      borderRadius: 999,
    },
    consentBadgeText: {
      ...textStyles.caption,
      fontWeight: '700',
    },
    clientName: {
      ...textStyles.h4,
      fontWeight: '700',
    },
    clientMeta: {
      ...textStyles.bodySmall,
    },
    statRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    statBlock: {
      flex: 1,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      backgroundColor: theme.bgMuted,
    },
    statLabel: {
      ...textStyles.caption,
      marginBottom: 4,
    },
    statValue: {
      ...textStyles.body,
      fontWeight: '700',
    },
    infoRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      alignItems: 'center',
    },
    infoText: {
      ...textStyles.bodySmall,
      flex: 1,
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(15, 23, 42, 0.42)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.lg,
    },
    modalCard: {
      width: '100%',
      maxWidth: 760,
      maxHeight: '92%',
    },
    modalCardMobile: {
      alignSelf: 'stretch',
      marginTop: 'auto',
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
      maxWidth: '100%',
      maxHeight: '88%',
    },
    modalScrollContent: {
      padding: spacing.lg,
      gap: spacing.lg,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: spacing.md,
      alignItems: 'flex-start',
    },
    modalHeaderCopy: {
      flex: 1,
      minWidth: 0,
    },
    modalTitle: {
      ...textStyles.h3,
      fontWeight: '700',
      marginBottom: 6,
    },
    modalSubtitle: {
      ...textStyles.bodySmall,
      lineHeight: 22,
      maxWidth: 560,
    },
    closeButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    formGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
    },
    formGridMobile: {
      flexDirection: 'column',
    },
    field: {
      minWidth: 220,
      flex: 1,
      gap: 8,
    },
    fieldLabel: {
      ...textStyles.caption,
      fontWeight: '700',
    },
    fieldHint: {
      ...textStyles.bodySmall,
      lineHeight: 20,
    },
    input: {
      minHeight: 50,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      paddingHorizontal: spacing.md,
      backgroundColor: theme.bgMuted,
      ...textStyles.body,
    },
    fieldError: {
      ...textStyles.caption,
      fontWeight: '600',
    },
    consentPanel: {
      borderRadius: borderRadius.xl,
      borderWidth: 1,
      padding: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    consentPanelCopy: {
      flex: 1,
      gap: 6,
    },
    consentPanelTitle: {
      ...textStyles.body,
      fontWeight: '700',
    },
    consentPanelText: {
      ...textStyles.bodySmall,
      lineHeight: 22,
    },
    modalActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: spacing.sm,
      flexWrap: 'wrap',
    },
    modalActionsMobile: {
      justifyContent: 'flex-start',
      flexDirection: 'column-reverse',
    },
  });
