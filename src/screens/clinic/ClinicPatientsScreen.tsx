import React from 'react';
import type { ScreenProps } from '../../constants/types';
import { ClinicPatientsWorkspace } from './patients/ClinicPatientsWorkspace';

export function ClinicPatientsScreen({
  navigation,
}: ScreenProps<'ClinicPatients'>): React.ReactElement {
  return <ClinicPatientsWorkspace navigation={navigation} />;
}

export default ClinicPatientsScreen;
