import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useIsFocused, useNavigation } from '@react-navigation/native';
import React, { useCallback, useContext, useState } from 'react';
import type { AppNavigationProp } from '../../constants/types';
import { useAuth } from '../../contexts/AuthContext';
import { getGoogleCalendarStatus } from '../../services/googleCalendarService';
import { useAppAlertState } from '../common/alert';
import { PrivacyControlsVisibleContext } from '../common/PrivacyPreferences';
import { useOptionalProfessionalTour } from '../onboarding/professionalTourContext';
import { getProfessionalTourDefinition } from '../onboarding/professionalTourDefinitions';
import { hasSeenProfessionalTour } from '../onboarding/professionalTourStorage';
import { GoogleMeetInvitationModal } from './GoogleMeetInvitationModal';

// Survive remounts and delayed/failed device writes during this app session.
const dismissedInSession = new Set<string>();

export function GoogleMeetInvitation() {
  const { user } = useAuth();
  const navigation = useNavigation<AppNavigationProp>();
  const focused = useIsFocused();
  const { isVisible: alertVisible } = useAppAlertState();
  const privacyVisible = useContext(PrivacyControlsVisibleContext);
  const tour = useOptionalProfessionalTour();
  const tourAvailable = tour !== null;
  const tourRunning = !!(tour?.isRunning || tour?.activeTourId);
  const [invitation, setInvitation] = useState<{ userId: string; storageKey: string; connected: boolean; renewing: boolean } | null>(null);
  const userId = user?.type === 'professional' ? user.id : null;

  useFocusEffect(useCallback(() => {
    let active = true;
    setInvitation(null);
    if (userId && !tourRunning) {
      void (async () => {
        // Wait for the existing home tour, including its asynchronous start.
        if (tourAvailable && !(await hasSeenProfessionalTour(userId, getProfessionalTourDefinition('professional_home_v1')))) return;
        if (!active) return;
        const status = await getGoogleCalendarStatus();
        const connected = status.status === 'CONNECTED' && !status.privacyUpdateRequired;
        const meetActive = connected && status.meetEnabled === true && status.videoProviderPreference === 'GOOGLE_MEET';
        if (active && status.enabled && status.meetAssignmentsEnabled === true && !meetActive
          && status.status !== 'DISCONNECTING' && status.videoProviderPreference !== undefined) {
          const renewing = status.videoProviderPreference === 'GOOGLE_MEET';
          // Discovery and renewal are separate notices. A new Google disclosure
          // can require one fresh renewal without repeating the current notice.
          const storageKey = renewing
            ? `hera:meet-renewal:${status.meetDisclosureVersion ?? 'v1'}:${userId}`
            : `hera:meet-invitation:v2:${userId}`;
          if (dismissedInSession.has(storageKey)) return;
          const dismissed = await AsyncStorage.getItem(storageKey);
          if (active && dismissed !== 'hidden' && !dismissedInSession.has(storageKey)) {
            setInvitation({ userId, storageKey, connected, renewing });
          }
        }
      })().catch(() => {
        // An optional suggestion must not interrupt the professional's agenda.
      });
    }
    return () => { active = false; };
  }, [userId, tourAvailable, tourRunning]));

  if (!invitation || invitation.userId !== userId || !focused || alertVisible || privacyVisible || tourRunning) return null;
  const dismiss = () => {
    dismissedInSession.add(invitation.storageKey);
    setInvitation(null);
    void AsyncStorage.setItem(invitation.storageKey, 'hidden').catch(() => {
      // Keep it dismissed during this app session if device storage is unavailable.
    });
  };
  return <GoogleMeetInvitationModal connected={invitation.connected} renewing={invitation.renewing}
    onDismiss={dismiss} onConfigure={() => {
      dismiss();
      navigation.navigate('ProfessionalProfile', { initialTab: 'google' });
    }} />;
}
