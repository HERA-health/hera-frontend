import { createContext, useContext, useEffect, useRef } from 'react';
import type {
  ProfessionalTourContextValue,
  ProfessionalTourId,
  ProfessionalTourStepPreparationHandler,
  ProfessionalTourTargetId,
} from './professionalTourTypes';

export const ProfessionalTourContext =
  createContext<ProfessionalTourContextValue | null>(null);

export function useProfessionalTour(): ProfessionalTourContextValue {
  const context = useContext(ProfessionalTourContext);
  if (!context) {
    throw new Error('useProfessionalTour must be used within ProfessionalTourProvider');
  }
  return context;
}

export function useOptionalProfessionalTour(): ProfessionalTourContextValue | null {
  return useContext(ProfessionalTourContext);
}

export function useProfessionalTourAutoStart(
  tourId: ProfessionalTourId,
  enabled = true,
): void {
  const tour = useOptionalProfessionalTour();
  const enabledRef = useRef(enabled);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !tour) {
      return;
    }

    let isCurrentEffect = true;

    void tour.requestAutoStart(tourId, () => isCurrentEffect && enabledRef.current);

    return () => {
      isCurrentEffect = false;
    };
  }, [enabled, tour, tourId]);
}

export function useProfessionalTourStepPreparation(
  targetId: ProfessionalTourTargetId,
  handler: ProfessionalTourStepPreparationHandler,
): void {
  const tour = useOptionalProfessionalTour();

  useEffect(() => {
    if (!tour) {
      return undefined;
    }

    return tour.registerStepPreparation(targetId, handler);
  }, [handler, targetId, tour]);
}

export function useProfessionalTourRoutePreference(
  tourId: ProfessionalTourId,
  enabled = true,
): void {
  const tour = useOptionalProfessionalTour();
  const registerCurrentRouteTourPreference = tour?.registerCurrentRouteTourPreference;

  useEffect(() => {
    if (!enabled || !registerCurrentRouteTourPreference) {
      return undefined;
    }

    return registerCurrentRouteTourPreference(tourId);
  }, [enabled, registerCurrentRouteTourPreference, tourId]);
}
