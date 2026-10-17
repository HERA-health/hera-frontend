import React from 'react';
import { render } from '@testing-library/react-native';
import { CustomDrawerContent } from '../CustomDrawerContent';
import { Sidebar } from '../sidebar';
import { useOptionalProfessionalClinicWorkspace } from '../../../contexts/ProfessionalClinicWorkspaceContext';

jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ navigate: jest.fn() }) }));
jest.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { type: 'professional', isAdmin: false }, logout: jest.fn() }) }));
jest.mock('../../../contexts/ProfileCompletionContext', () => ({ useProfileCompletion: () => ({ snapshot: null }) }));
jest.mock('../../../contexts/ProfessionalWorkspaceContext', () => ({ useOptionalProfessionalWorkspace: () => null }));
jest.mock('../../../contexts/ProfessionalClinicWorkspaceContext', () => ({ useOptionalProfessionalClinicWorkspace: jest.fn() }));
jest.mock('../../../screens/clinic/useClinicWorkspace', () => ({ useClinicWorkspace: () => ({ memberships: [] }) }));
jest.mock('../ProfessionalQuickSearch', () => ({ ProfessionalQuickSearch: () => null }));
jest.mock('../sidebar', () => ({ Sidebar: jest.fn(() => null) }));

describe('drawer clinic visibility', () => {
  it.each([
    { status: 'ready', hasActiveCareLink: false, visible: false },
    { status: 'loading', hasActiveCareLink: null, visible: false },
    { status: 'error', hasActiveCareLink: null, visible: false },
    { status: 'error', hasActiveCareLink: true, visible: true },
    { status: 'ready', hasActiveCareLink: true, visible: true },
  ] as const)('uses confirmed access with $status and access $hasActiveCareLink', ({ status, hasActiveCareLink, visible }) => {
    jest.mocked(useOptionalProfessionalClinicWorkspace).mockReturnValue({
      contexts: [], hasActiveCareLink, status, selectedClinicId: null, selectedContext: null,
      error: null, totalPendingTasks: null, selectClinic: jest.fn(), refreshContexts: jest.fn(),
    });
    render(<CustomDrawerContent />);
    expect(jest.mocked(Sidebar).mock.lastCall?.[0]).toMatchObject({
      hasProfessionalClinicAccess: visible, hasClinicAdminAccess: false, isAdmin: false,
    });
  });
});
