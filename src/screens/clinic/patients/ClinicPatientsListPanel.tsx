import React, { useMemo } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AnimatedPressable } from '../../../components/common/AnimatedPressable';
import { Button } from '../../../components/common/Button';
import { Input } from '../../../components/common/Input';
import { SimpleDropdown, type DropdownOption } from '../../../components/common/SimpleDropdown';
import { useTheme } from '../../../contexts/ThemeContext';
import type {
  ClinicPatientAssignmentFilter,
  ClinicPatientListPageInfo,
  ClinicPatientStatusFilter,
  ClinicPatientSummary,
} from '../../../services/clinicService';
import { AssignmentBadge, StatusBadge } from './ClinicPatientBadges';
import {
  ASSIGNMENT_FILTERS,
  getAssignmentSubtitle,
  getPatientSubtitle,
  STATUS_FILTERS,
} from './clinicPatientDomain';
import {
  createListItemStyles,
  createListPanelStyles,
} from './clinicPatientStyles';

interface ClinicPatientsListPanelProps {
  patients: ClinicPatientSummary[];
  pageInfo: ClinicPatientListPageInfo;
  selectedPatientId: string | null;
  loading: boolean;
  loadingMore: boolean;
  error: string;
  canManage: boolean;
  saving: boolean;
  search: string;
  statusFilter: ClinicPatientStatusFilter;
  assignmentFilter: ClinicPatientAssignmentFilter;
  clinicSpecialistFilter: string | null;
  specialistFilterOptions: DropdownOption<string>[];
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: ClinicPatientStatusFilter) => void;
  onAssignmentFilterChange: (value: ClinicPatientAssignmentFilter) => void;
  onSpecialistFilterChange: (value: string) => void;
  onSelectPatient: (patientId: string) => void;
  onAdd: () => void;
  onRetry: () => void;
  onLoadMore: () => void;
}

export function ClinicPatientsListPanel({
  patients,
  pageInfo,
  selectedPatientId,
  loading,
  loadingMore,
  error,
  canManage,
  saving,
  search,
  statusFilter,
  assignmentFilter,
  clinicSpecialistFilter,
  specialistFilterOptions,
  onSearchChange,
  onStatusFilterChange,
  onAssignmentFilterChange,
  onSpecialistFilterChange,
  onSelectPatient,
  onAdd,
  onRetry,
  onLoadMore,
}: ClinicPatientsListPanelProps): React.ReactElement {
  const { theme } = useTheme();
  const styles = useMemo(() => createListPanelStyles(theme), [theme]);

  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Pacientes</Text>
          <Text style={styles.text}>
            {loading ? 'Actualizando listado' : `${patients.length} fichas visibles`}
          </Text>
        </View>
        {loading ? <ActivityIndicator color={theme.primary} size="small" /> : null}
      </View>

      <Input
        value={search}
        label="Buscar"
        placeholder="Nombre, email, teléfono, NIF..."
        autoCapitalize="none"
        editable={!saving}
        leftIcon={<Ionicons name="search-outline" size={18} color={theme.textMuted} />}
        onChangeText={onSearchChange}
      />

      <View style={styles.filtersRow}>
        <View style={[styles.filterField, styles.filterFieldCompact]}>
          <Text style={styles.filterLabel}>Estado</Text>
          <SimpleDropdown
            options={STATUS_FILTERS}
            value={statusFilter}
            onSelect={onStatusFilterChange}
            placeholder="Estado"
            maxHeight={180}
          />
        </View>

        <View style={[styles.filterField, styles.filterFieldCompact]}>
          <Text style={styles.filterLabel}>Asignación</Text>
          <SimpleDropdown
            options={ASSIGNMENT_FILTERS}
            value={assignmentFilter}
            onSelect={onAssignmentFilterChange}
            placeholder="Asignación"
            maxHeight={180}
          />
        </View>

        <View style={[styles.filterField, styles.filterFieldWide]}>
          <Text style={styles.filterLabel}>Responsable</Text>
          <SimpleDropdown
            options={specialistFilterOptions}
            value={clinicSpecialistFilter ?? 'ALL'}
            onSelect={onSpecialistFilterChange}
            placeholder="Filtrar por especialista"
          />
        </View>
      </View>

      {error ? (
        <View style={styles.statePanel}>
          <Ionicons name="alert-circle-outline" size={24} color={theme.warning} />
          <Text style={styles.stateTitle}>No se pudo cargar el listado</Text>
          <Text style={styles.stateText}>{error}</Text>
          <Button variant="outline" size="medium" onPress={onRetry}>
            Reintentar
          </Button>
        </View>
      ) : patients.length === 0 && !loading ? (
        <View style={styles.statePanel}>
          <Ionicons name="medical-outline" size={26} color={theme.textMuted} />
          <Text style={styles.stateTitle}>Aún no hay pacientes aquí</Text>
          <Text style={styles.stateText}>
            Crea fichas administrativas separadas de pacientes privados y de identidades registradas.
          </Text>
          <Button
            variant="primary"
            size="medium"
            onPress={onAdd}
            disabled={!canManage}
            icon={<Ionicons name="person-add-outline" size={18} color={theme.actionPrimaryText} />}
          >
            Añadir paciente
          </Button>
        </View>
      ) : (
        <View style={styles.list}>
          {patients.map((patient) => (
            <PatientListItem
              key={patient.id}
              patient={patient}
              selected={patient.id === selectedPatientId}
              onPress={() => onSelectPatient(patient.id)}
            />
          ))}
          {pageInfo.hasMore ? (
            <View style={styles.loadMore}>
              <Button
                variant="outline"
                size="medium"
                onPress={onLoadMore}
                loading={loadingMore}
                disabled={loading || loadingMore}
              >
                Cargar más pacientes
              </Button>
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}

interface PatientListItemProps {
  patient: ClinicPatientSummary;
  selected: boolean;
  onPress: () => void;
}

function PatientListItem({
  patient,
  selected,
  onPress,
}: PatientListItemProps): React.ReactElement {
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
        <Text style={styles.avatarText}>{patient.displayName.slice(0, 1).toUpperCase()}</Text>
      </View>
      <View style={styles.itemContent}>
        <View style={styles.itemTop}>
          <Text style={styles.itemTitle} numberOfLines={1}>{patient.displayName}</Text>
          <StatusBadge status={patient.status} />
        </View>
        <Text style={styles.itemMeta} numberOfLines={1}>
          {getPatientSubtitle(patient)}
        </Text>
        <View style={styles.itemFooter}>
          <Text style={styles.itemSubMeta} numberOfLines={1}>
            {getAssignmentSubtitle(patient)}
          </Text>
          <AssignmentBadge assigned={Boolean(patient.activeAssignment)} />
        </View>
      </View>
    </AnimatedPressable>
  );
}
