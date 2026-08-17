import React from 'react';
import { act, render, waitFor } from '@testing-library/react-native';
import { lightTheme } from '../../../constants/theme';
import type { ScreenProps } from '../../../constants/types';
import { useAuth } from '../../../contexts/AuthContext';
import { useTheme } from '../../../contexts/ThemeContext';
import * as clinicService from '../../../services/clinicService';
import { ClinicDashboardScreen } from '../ClinicDashboardScreen';
import { useClinicWorkspace } from '../useClinicWorkspace';

jest.mock('../../../contexts/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../../../contexts/ThemeContext', () => ({ useTheme: jest.fn() }));
jest.mock('../../../services/clinicService', () => ({
  getClinicDashboard: jest.fn(),
  subscribeClinicSessionChanges: jest.fn(() => jest.fn()),
}));
jest.mock('../useClinicWorkspace', () => ({ useClinicWorkspace: jest.fn() }));
jest.mock('../components/ClinicWorkspaceScaffold', () => ({
  ClinicWorkspaceScaffold: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockedUseAuth = jest.mocked(useAuth);
const mockedUseTheme = jest.mocked(useTheme);
const mockedUseClinicWorkspace = jest.mocked(useClinicWorkspace);
const mockedGetClinicDashboard = jest.mocked(clinicService.getClinicDashboard);
const mockedSubscribeClinicSessionChanges = jest.mocked(clinicService.subscribeClinicSessionChanges);
let clinicSessionChangeListener: ((change: clinicService.ClinicSessionChange) => void) | null = null;

const dashboard: clinicService.ClinicDashboard = {
  clinic: {
    id: 'clinic-1',
    commercialName: 'Clínica HERA',
    legalName: null,
    status: 'ACTIVE',
    createdAt: '2026-08-13T08:00:00.000Z',
    updatedAt: '2026-08-13T08:00:00.000Z',
  },
  metrics: [],
};

describe('ClinicDashboardScreen session invalidation', () => {
  beforeEach(() => {
    clinicSessionChangeListener = null;
    mockedUseAuth.mockReturnValue({ logout: jest.fn() } as unknown as ReturnType<typeof useAuth>);
    mockedUseTheme.mockReturnValue({
      theme: lightTheme,
      mode: 'light',
      isDark: false,
      setMode: jest.fn(),
    });
    mockedUseClinicWorkspace.mockReturnValue({
      memberships: [],
      selectedClinicId: 'clinic-1',
      selectedMembership: {
        id: 'membership-1',
        role: 'OWNER',
        status: 'ACTIVE',
        createdAt: '2026-08-13T08:00:00.000Z',
        updatedAt: '2026-08-13T08:00:00.000Z',
        clinic: dashboard.clinic,
      },
      loading: false,
      error: '',
      reload: jest.fn(),
      selectClinic: jest.fn(),
    });
    mockedGetClinicDashboard.mockResolvedValue(dashboard);
    mockedSubscribeClinicSessionChanges.mockImplementation((listener) => {
      clinicSessionChangeListener = listener;
      return () => {
        if (clinicSessionChangeListener === listener) clinicSessionChangeListener = null;
      };
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('refreshes only for the selected clinic', async () => {
    render(
      <ClinicDashboardScreen
        navigation={{ navigate: jest.fn() } as unknown as ScreenProps<'ClinicDashboard'>['navigation']}
        route={{} as ScreenProps<'ClinicDashboard'>['route']}
      />,
    );
    await waitFor(() => expect(mockedGetClinicDashboard).toHaveBeenCalledTimes(1));

    act(() => {
      clinicSessionChangeListener?.({
        clinicId: 'clinic-2',
        clinicPatientId: 'patient-1',
        clinicSpecialistId: 'specialist-1',
        sessionId: 'session-1',
        mutation: 'CREATED',
      });
    });
    expect(mockedGetClinicDashboard).toHaveBeenCalledTimes(1);

    act(() => {
      clinicSessionChangeListener?.({
        clinicId: 'clinic-1',
        clinicPatientId: 'patient-1',
        clinicSpecialistId: 'specialist-1',
        sessionId: 'session-1',
        mutation: 'CREATED',
      });
    });
    await waitFor(() => expect(mockedGetClinicDashboard).toHaveBeenCalledTimes(2));
  });
});
