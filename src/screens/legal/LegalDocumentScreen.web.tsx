import { useEffect } from 'react';
import { Text } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import type { AppRouteProp } from '../../constants/types';
import { legalReaderUrl } from '../../services/legalReader';

export function LegalDocumentScreen() {
  const {params} = useRoute<AppRouteProp<'LegalDocument'>>();
  const {user} = useAuth();
  const audience = params.audience ?? (user?.type === 'professional' ? 'PROFESSIONAL' : user?.type === 'clinic' ? 'CLINIC' : user ? 'CLIENT' : undefined);
  const url = legalReaderUrl(params.documentKey, params.version, audience);
  useEffect(() => { window.location.replace(url); }, [url]);
  return <Text accessibilityRole="link" onPress={() => window.location.assign(url)}>Abrir documento legal</Text>;
}
