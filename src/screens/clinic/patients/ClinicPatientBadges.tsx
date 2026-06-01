import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '../../../contexts/ThemeContext';
import type { ClinicPatientStatus } from '../../../services/clinicService';
import { createBadgeStyles } from './clinicPatientStyles';

interface StatusBadgeProps {
  status: ClinicPatientStatus;
}

export function StatusBadge({ status }: StatusBadgeProps): React.ReactElement {
  const { theme } = useTheme();
  const styles = useMemo(() => createBadgeStyles(theme), [theme]);
  const active = status === 'ACTIVE';

  return (
    <View style={[styles.badge, active ? styles.badgeActive : styles.badgeArchived]}>
      <Text style={[styles.badgeText, active ? styles.badgeTextActive : styles.badgeTextArchived]}>
        {active ? 'Activo' : 'Archivado'}
      </Text>
    </View>
  );
}

interface AssignmentBadgeProps {
  assigned: boolean;
}

export function AssignmentBadge({ assigned }: AssignmentBadgeProps): React.ReactElement {
  const { theme } = useTheme();
  const styles = useMemo(() => createBadgeStyles(theme), [theme]);

  return (
    <View style={[styles.badge, assigned ? styles.badgeAssigned : styles.badgeNeutral]}>
      <Text style={[styles.badgeText, assigned ? styles.badgeTextAssigned : styles.badgeTextNeutral]}>
        {assigned ? 'Asignado' : 'Sin asignar'}
      </Text>
    </View>
  );
}
