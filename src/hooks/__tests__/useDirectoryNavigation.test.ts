import { act, renderHook } from '@testing-library/react-native';
import { useDirectoryNavigation } from '../useDirectoryNavigation';
import { directoryIntent } from '../../services/heraCommissionService';
import { directoryEntryHref } from '../../services/directoryBookingService';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ navigate: mockNavigate }) }));
jest.mock('../../services/heraCommissionService', () => ({ directoryIntent: jest.fn() }));
beforeEach(() => jest.clearAllMocks());

it('opens public and authenticated profiles immediately without an attribution request', () => {
  jest.mocked(directoryIntent).mockImplementation(() => { throw new Error('Auxiliary service unavailable'); });
  const { result } = renderHook(useDirectoryNavigation);
  act(() => result.current('specialist-id'));
  expect(mockNavigate).toHaveBeenCalledWith('SpecialistDetail', { specialistId: 'specialist-id' });
  act(() => result.current('public-slug', true));
  expect(mockNavigate).toHaveBeenCalledWith('PublicSpecialistProfile', { profileRef: 'public-slug' });
  expect(directoryIntent).not.toHaveBeenCalled();
});

it('uses a direct profile link for new tabs, without a token, cookie or server redirect', () => {
  expect(directoryEntryHref('profile / slug')).toBe('/especialista/profile%20%2F%20slug');
  expect(directoryEntryHref('public-slug', 'option / 1')).toBe('/especialista/public-slug?optionId=option%20%2F%201');
});
