import React, { createContext, useContext } from 'react';
import { Button } from './Button';

export const PrivacyControlsContext = createContext<(() => void) | null>(null);
export function PrivacyPreferencesButton() {
  const open = useContext(PrivacyControlsContext);
  if (!open) return null;
  return <Button size="small" variant="ghost" onPress={open}>Preferencias de privacidad</Button>;
}
