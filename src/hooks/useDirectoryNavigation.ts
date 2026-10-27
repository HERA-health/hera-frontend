import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../constants/types';

export function useDirectoryNavigation() {
  const navigation = useNavigation<AppNavigationProp>();
  return useCallback((profileRef: string, publicProfile = false) => {
    // Origin is established by the verified booking channel, not a view write.
    if (publicProfile) navigation.navigate('PublicSpecialistProfile', { profileRef });
    else navigation.navigate('SpecialistDetail', { specialistId: profileRef });
  }, [navigation]);
}
