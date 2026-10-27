import React from 'react';
import { GuestConsentDocumentFrame } from '../../screens/consent/GuestConsentDocumentFrame';

export function TreatmentConsentDocument(props: { html: string; borderColor: string }) {
  return (
    <GuestConsentDocumentFrame
      {...props}
      title="Documento completo de consentimiento informado"
      fitContent
    />
  );
}
