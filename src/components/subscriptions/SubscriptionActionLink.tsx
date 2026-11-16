import React from 'react';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../constants/types';
import { Button } from '../common/Button';

/** Presentation of the server's denial; never a client-side entitlement check. */
export function SubscriptionActionLink({ message, onLeave }: { message?: string | null; onLeave?: () => void }) {
  return message?.includes('Mi suscripción') ? <SubscriptionLink onLeave={onLeave} /> : null;
}
function SubscriptionLink({ onLeave }: { onLeave?: () => void }) {
  const navigation = useNavigation<AppNavigationProp>();
  return <Button variant="outline" onPress={() => { onLeave?.(); navigation.navigate('ProfessionalSubscription'); }}>Consultar mi suscripción</Button>;
}
