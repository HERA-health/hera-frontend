import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';

export function useDiscoveryRevalidation(reload: () => void, navigationFocus = true) {
  const navigation = useNavigation();
  useEffect(() => {
    const unsubscribe = navigationFocus ? navigation.addListener('focus', reload) : () => undefined;
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') reload(); });
    if (Platform.OS === 'web' && typeof window !== 'undefined') window.addEventListener('focus', reload);
    return () => { unsubscribe(); subscription.remove(); if (Platform.OS === 'web' && typeof window !== 'undefined') window.removeEventListener('focus', reload); };
  }, [navigation, reload, navigationFocus]);
}
