jest.mock('../../services/api', () => ({
  __esModule: true,
  default: {
    delete: jest.fn(),
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
  },
  initializeAuth: jest.fn(),
  registerSessionExpiredHandler: jest.fn(),
  setAuthSession: jest.fn(),
  logoutServerSession: jest.fn(),
}));

jest.mock('../../services/professionalService', () => ({
  getVerificationStatus: jest.fn(),
}));

jest.mock('../../services/analyticsService', () => ({
  identify: jest.fn(),
  reset: jest.fn(),
}));

jest.mock('../../services/secureSessionStorage', () => ({
  clearPersistedClinicalAccessSession: jest.fn(),
}));

jest.mock('../../services/specialistsService', () => ({
  invalidateSpecialistsCache: jest.fn(),
}));

import { mapAuthUser, mapBackendUserType } from '../AuthContext';
import type { AuthResponse } from '../../services/authService';

describe('AuthContext user type mapping', () => {
  it('maps backend clinic users to the clinic frontend type', () => {
    expect(mapBackendUserType('CLINIC')).toBe('clinic');
  });

  it('does not map clinic auth responses as professionals', () => {
    const user: AuthResponse['user'] = {
      id: 'clinic-user',
      email: 'clinic@example.com',
      name: 'Clinica Demo',
      userType: 'CLINIC',
      emailVerified: true,
      isAdmin: false,
    };

    expect(mapAuthUser(user).type).toBe('clinic');
  });
});
