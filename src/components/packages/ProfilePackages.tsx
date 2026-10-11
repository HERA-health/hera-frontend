import React from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../constants/types';
import { useAuth } from '../../contexts/AuthContext';
import { showAppAlert, useAppAlert } from '../common/alert';
import { PublicPackageOffers } from './PublicPackageOffers';

export function ProfilePackages({ specialistId, intentToken }: { specialistId: string; intentToken?: string }) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { isAuthenticated, user, legalStatusSnapshot } = useAuth();
  const alert = useAppAlert();
  return <PublicPackageOffers key={specialistId} specialistId={specialistId} anonymous={!isAuthenticated} intentToken={intentToken}
    onBeforeAcquire={() => {
      if (isAuthenticated && user?.type !== 'client') {
        showAppAlert(alert, 'Cuenta de paciente', 'Accede con una cuenta de paciente para adquirir un bono.'); return false;
      }
      if (isAuthenticated && (legalStatusSnapshot?.requiresAcceptance || !navigation.getState().routeNames.includes('Booking'))) {
        navigation.navigate('RequiredLegalAcceptance'); return false;
      }
      return true;
    }}
    onPrivacy={() => navigation.navigate('LegalDocument', { documentKey: 'PRIVACY_POLICY' })}
    onAcquired={row => {
      if (row.payment?.required || row.payment?.issueCode) navigation.navigate('PackagePayment', { patientPackageId: row.id });
      else if (isAuthenticated && user?.type === 'client') navigation.navigate('Booking', { specialistId, patientPackageId: row.id });
    }} />;
}
