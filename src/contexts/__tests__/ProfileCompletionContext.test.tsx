import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../AuthContext';
import {
  ProfileCompletionProvider,
  useProfileCompletion,
} from '../ProfileCompletionContext';
import * as profileCompletionService from '../../services/profileCompletionService';

jest.mock('../AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../services/profileCompletionService', () => ({
  getProfessionalCompletion: jest.fn(),
  getClinicCompletion: jest.fn(),
}));

const mockedUseAuth = jest.mocked(useAuth);
const mockedCompletionService = jest.mocked(profileCompletionService);

function Probe(): React.ReactElement {
  const { snapshot, refresh, setClinicScope } = useProfileCompletion();

  return (
    <View>
      <Text>{snapshot?.items[0]?.code ?? 'sin-snapshot'}</Text>
      <TouchableOpacity accessibilityLabel="Refrescar" onPress={() => { void refresh(); }}>
        <Text>Refrescar</Text>
      </TouchableOpacity>
      <TouchableOpacity accessibilityLabel="Seleccionar clínica" onPress={() => setClinicScope('clinic-1')}>
        <Text>Seleccionar clínica</Text>
      </TouchableOpacity>
    </View>
  );
}

describe('ProfileCompletionProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads professional completion and preserves the last confirmed snapshot on refresh failure', async () => {
    mockedUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: { id: 'user-1', type: 'professional' },
    } as ReturnType<typeof useAuth>);
    mockedCompletionService.getProfessionalCompletion.mockResolvedValueOnce({
      role: 'PROFESSIONAL',
      scopeId: 'specialist-1',
      items: [{ code: 'PROFILE_BIO', state: 'ACTION_REQUIRED', severity: 'WARNING' }],
    });

    const screen = render(
      <ProfileCompletionProvider>
        <Probe />
      </ProfileCompletionProvider>,
    );

    await waitFor(() => expect(screen.getByText('PROFILE_BIO')).toBeTruthy());
    mockedCompletionService.getProfessionalCompletion.mockRejectedValueOnce(new Error('offline'));
    fireEvent.press(screen.getByLabelText('Refrescar'));

    await waitFor(() => {
      expect(mockedCompletionService.getProfessionalCompletion).toHaveBeenCalledTimes(2);
      expect(screen.getByText('PROFILE_BIO')).toBeTruthy();
    });
  });

  it('waits for an active clinic scope before loading clinic completion', async () => {
    mockedUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: { id: 'user-2', type: 'clinic' },
    } as ReturnType<typeof useAuth>);
    mockedCompletionService.getClinicCompletion.mockResolvedValue({
      role: 'CLINIC',
      scopeId: 'clinic-1',
      items: [{ code: 'CLINIC_CONTACT', state: 'ACTION_REQUIRED', severity: 'WARNING' }],
    });

    const screen = render(
      <ProfileCompletionProvider>
        <Probe />
      </ProfileCompletionProvider>,
    );

    expect(mockedCompletionService.getClinicCompletion).not.toHaveBeenCalled();
    fireEvent.press(screen.getByLabelText('Seleccionar clínica'));

    await waitFor(() => {
      expect(mockedCompletionService.getClinicCompletion).toHaveBeenCalledWith('clinic-1');
      expect(screen.getByText('CLINIC_CONTACT')).toBeTruthy();
    });
  });
});
