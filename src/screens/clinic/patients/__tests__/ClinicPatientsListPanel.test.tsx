import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { lightTheme } from '../../../../constants/theme';
import { useTheme } from '../../../../contexts/ThemeContext';
import type { ClinicPatientSummary } from '../../../../services/clinicService';
import { ClinicPatientsListPanel } from '../ClinicPatientsListPanel';

jest.mock('../../../../contexts/ThemeContext', () => ({
  useTheme: jest.fn(),
}));

const mockedUseTheme = jest.mocked(useTheme);

const patient: ClinicPatientSummary = {
  id: 'patient-1',
  status: 'ACTIVE',
  displayName: 'Ana Martín',
  firstName: 'Ana',
  lastName: 'Martín',
  email: 'ana@example.com',
  phone: null,
  billingDataComplete: true,
  createdAt: '2026-08-01T10:00:00.000Z',
  updatedAt: '2026-08-10T10:00:00.000Z',
  archivedAt: null,
  activeAssignment: null,
};

describe('ClinicPatientsListPanel accessibility', () => {
  beforeEach(() => {
    mockedUseTheme.mockReturnValue({
      theme: lightTheme,
      mode: 'light',
      isDark: false,
      setMode: jest.fn(),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('announces the selected patient and opens the requested record', () => {
    const onSelectPatient = jest.fn();

    render(
      <ClinicPatientsListPanel
        patients={[patient]}
        pageInfo={{ page: 1, limit: 20, hasMore: false, nextPage: null }}
        selectedPatientId={patient.id}
        loading={false}
        loadingMore={false}
        error=""
        canManage
        saving={false}
        search=""
        statusFilter="ACTIVE"
        assignmentFilter="ALL"
        clinicSpecialistFilter={null}
        specialistFilterOptions={[{ label: 'Todos', value: 'ALL' }]}
        onSearchChange={jest.fn()}
        onStatusFilterChange={jest.fn()}
        onAssignmentFilterChange={jest.fn()}
        onSpecialistFilterChange={jest.fn()}
        onSelectPatient={onSelectPatient}
        onAdd={jest.fn()}
        onRetry={jest.fn()}
        onLoadMore={jest.fn()}
      />,
    );

    const item = screen.getByRole('button', {
      name: 'Ana Martín. Estado: Activo. Sin responsable asignado. Abrir ficha',
    });
    expect(item.props.accessibilityState.selected).toBe(true);

    fireEvent.press(item);
    expect(onSelectPatient).toHaveBeenCalledWith(patient.id, expect.anything());
    const origin = onSelectPatient.mock.calls[0]?.[1] as { focus?: () => void } | undefined;
    expect(origin?.focus).toEqual(expect.any(Function));
  });

  it('returns the add button as the origin when the empty state starts creation', () => {
    const onAdd = jest.fn();

    render(
      <ClinicPatientsListPanel
        patients={[]}
        pageInfo={{ page: 1, limit: 20, hasMore: false, nextPage: null }}
        selectedPatientId={null}
        loading={false}
        loadingMore={false}
        error=""
        canManage
        saving={false}
        search=""
        statusFilter="ACTIVE"
        assignmentFilter="ALL"
        clinicSpecialistFilter={null}
        specialistFilterOptions={[{ label: 'Todos', value: 'ALL' }]}
        onSearchChange={jest.fn()}
        onStatusFilterChange={jest.fn()}
        onAssignmentFilterChange={jest.fn()}
        onSpecialistFilterChange={jest.fn()}
        onSelectPatient={jest.fn()}
        onAdd={onAdd}
        onRetry={jest.fn()}
        onLoadMore={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Añadir paciente' }));

    const origin = onAdd.mock.calls[0]?.[0] as { focus?: () => void } | undefined;
    expect(origin?.focus).toEqual(expect.any(Function));
  });
});
