import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { showAppAlert, useAppAlert } from '../components/common/alert';
import type { AppNavigationProp } from '../constants/types';
import { directoryIntent } from '../services/heraCommissionService';

export function useDirectoryNavigation() {
  const navigation = useNavigation<AppNavigationProp>();
  const alert = useAppAlert();
  return useCallback(async (profileRef: string, publicProfile = false) => {
    try {
      const { token } = await directoryIntent(profileRef);
      if (publicProfile) navigation.navigate('PublicSpecialistProfile', { profileRef, intentToken: token });
      else navigation.navigate('SpecialistDetail', { specialistId: profileRef, intentToken: token });
    } catch {
      showAppAlert(alert, 'No se pudo abrir el perfil', 'Inténtalo de nuevo.');
    }
  }, [navigation, alert]);
}
