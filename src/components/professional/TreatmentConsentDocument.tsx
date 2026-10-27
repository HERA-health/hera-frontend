import React from 'react';
import { WebView } from 'react-native-webview';
export function TreatmentConsentDocument({ html }: { html: string; borderColor: string }) {
  return (
    <WebView
      source={{ html }}
      style={{ height: 520 }}
      javaScriptEnabled={false}
      domStorageEnabled={false}
      originWhitelist={['about:blank']}
      onShouldStartLoadWithRequest={(request) => request.url === 'about:blank'}
    />
  );
}
