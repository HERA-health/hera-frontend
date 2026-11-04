import React, { useContext, useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Button } from '../../components/common/Button';
import { PrivacyControlsContext } from '../../components/common/PrivacyPreferences';
import type { AppNavigationProp, AppRouteProp } from '../../constants/types';
import { legalReaderUrl } from '../../services/legalReader';
import { isLandingSectionAnchor } from '../../constants/landingNavigation';
import { useAuth } from '../../contexts/AuthContext';

export function useLegalReaderUrl() {
  const { params } = useRoute<AppRouteProp<'LegalDocument'>>();
  const { user } = useAuth();
  const audience = params.audience ?? (user?.type === 'professional' ? 'PROFESSIONAL' : user?.type === 'clinic' ? 'CLINIC' : user ? 'CLIENT' : undefined);
  return legalReaderUrl(params.documentKey, params.version, audience);
}
export function LegalDocumentScreen() {
  const uri = useLegalReaderUrl();
  const navigation = useNavigation<AppNavigationProp>();
  const openPreferences = useContext(PrivacyControlsContext);
  const [retry,setRetry] = useState(0);
  return <View style={{ flex: 1 }}>
    <Button variant="ghost" onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Landing')}>Volver a HERA</Button>
    <WebView key={retry} source={{uri}} javaScriptEnabled={false}
      onShouldStartLoadWithRequest={request => {
        if (request.url === 'about:blank') return true;
        const target = new URL(request.url);
        if (target.origin === new URL(uri).origin) {
          if (target.pathname.startsWith('/legal/')) return true;
          if (target.searchParams.get('preferencias') === 'cookies') openPreferences?.();
          else if (target.pathname === '/acceso') {
            if (navigation.getState().routeNames.includes('Welcome')) navigation.navigate('Welcome');
            else navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Landing');
          } else if (target.pathname === '/planes' && navigation.getState().routeNames.includes('Pricing')) navigation.navigate('Pricing');
          else if (target.pathname === '/' && navigation.getState().routeNames.includes('Landing')) {
            const section = target.searchParams.get('section');
            navigation.navigate('Landing', isLandingSectionAnchor(section) ? { section } : undefined);
          } else if (target.pathname === '/' || target.pathname === '/planes') {
            void Linking.openURL('https://www.health-hera.com' + target.pathname + target.search);
          }
          return false;
        }
        if (target.protocol === 'https:') void Linking.openURL(request.url);
        return false;
      }}
      renderError={() => <View><Text>No se pudo cargar el documento.</Text><Button onPress={() => setRetry(v=>v+1)}>Reintentar</Button></View>} />
  </View>;
}
