import React, { useCallback } from 'react';
import { ProfessionalContactWorkspace } from '../../components/specialistContact/ProfessionalContactWorkspace';
import type { ScreenProps } from '../../constants/types';

export function ProfessionalHelpScreen({
  route,
  navigation,
}: ScreenProps<'ProfessionalHelp'>) {
  const handleRouteChange = useCallback(
    (params: { section: 'help' | 'feedback'; requestId?: string }) =>
      navigation.setParams(params),
    [navigation]
  );

  return (
    <ProfessionalContactWorkspace
      initialSection={route.params?.requestId ? 'help' : route.params?.section ?? 'feedback'}
      initialRequestId={route.params?.requestId}
      onRouteChange={handleRouteChange}
    />
  );
}

export default ProfessionalHelpScreen;
