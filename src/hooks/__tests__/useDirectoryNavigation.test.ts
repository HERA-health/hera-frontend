import { act, renderHook } from '@testing-library/react-native';
import { useDirectoryNavigation } from '../useDirectoryNavigation';
import { directoryIntent } from '../../services/heraCommissionService';
import { showAppAlert } from '../../components/common/alert';
import { directoryEntryHref } from '../../services/directoryBookingService';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ navigate: mockNavigate }) }));
jest.mock('../../services/heraCommissionService', () => ({ directoryIntent: jest.fn() }));
jest.mock('../../components/common/alert', () => ({ useAppAlert: () => ({}), showAppAlert: jest.fn() }));
jest.mock('../../config/api', () => ({ __esModule: true, default: () => ({ apiUrl: 'https://fixture.invalid/api/' }) }));
beforeEach(() => jest.clearAllMocks());

it('carries the server intent from recommendations to both profile routes', async () => {
 jest.mocked(directoryIntent).mockResolvedValue({ token: 'server-proof' });
 const { result } = renderHook(useDirectoryNavigation);
 await act(async () => result.current('specialist-id'));
 expect(mockNavigate).toHaveBeenCalledWith('SpecialistDetail', { specialistId: 'specialist-id', intentToken: 'server-proof' });
 await act(async () => result.current('public-slug', true));
 expect(mockNavigate).toHaveBeenCalledWith('PublicSpecialistProfile', { profileRef: 'public-slug', intentToken: 'server-proof' });
});
it('shows a recoverable error when attribution cannot be created', async () => {
 jest.mocked(directoryIntent).mockRejectedValue(new Error('connection unavailable'));
 const { result } = renderHook(useDirectoryNavigation);
 await act(async () => result.current('specialist-id'));
 expect(mockNavigate).not.toHaveBeenCalled();
 expect(showAppAlert).toHaveBeenCalledWith(expect.anything(), 'No se pudo abrir el perfil', 'Inténtalo de nuevo.');
});
it('uses the server entry for browser link navigation and encodes the profile reference', () => {
 expect(directoryEntryHref('profile / slug')).toBe('https://fixture.invalid/api/hera-commissions/directory-entry/profile%20%2F%20slug');
});
