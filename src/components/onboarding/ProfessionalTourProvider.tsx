import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Platform, useWindowDimensions } from 'react-native';
import {
  SpotlightTourProvider,
  type SpotlightTour,
  type TourState,
  type TourStep,
} from 'react-native-spotlight-tour';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import * as analyticsService from '../../services/analyticsService';
import {
  getProfessionalTourDefinition,
  getProfessionalTourIdsForRoute,
  getProfessionalTourStepsForDisplay,
} from './professionalTourDefinitions';
import { ProfessionalTourContext } from './professionalTourContext';
import {
  hasSeenProfessionalTour,
  markProfessionalTourSeen,
} from './professionalTourStorage';
import { ProfessionalTourTooltip } from './ProfessionalTourTooltip';
import type {
  ProfessionalTourContextValue,
  ProfessionalTourAutoStartGuard,
  ProfessionalTourId,
  ProfessionalTourProviderProps,
  ProfessionalTourStartSource,
  ProfessionalTourStepDefinition,
  ProfessionalTourStepPreparationHandler,
  ProfessionalTourTargetLayout,
  ProfessionalTourTargetId,
  ProfessionalTourTargetMeasurer,
} from './professionalTourTypes';

const START_DELAY_MS = 180;

type ProfessionalTourStopReason = 'completed' | 'skipped' | 'interrupted';
type RegisteredTourTarget = {
  id: symbol;
  measureTarget?: ProfessionalTourTargetMeasurer;
};

type WebDocumentLike = {
  activeElement?: {
    blur?: () => void;
  } | null;
};

export function blurWebActiveElementForTour(
  platformOS: string = Platform.OS,
): void {
  if (platformOS !== 'web') {
    return;
  }

  const webDocument = (globalThis as typeof globalThis & { document?: WebDocumentLike }).document;
  webDocument?.activeElement?.blur?.();
}

const waitForStepPreparationSettle = (): Promise<void> =>
  new Promise((resolve) => {
    const requestFrame = globalThis.requestAnimationFrame;

    if (typeof requestFrame !== 'function') {
      setTimeout(resolve, 80);
      return;
    }

    requestFrame(() => {
      requestFrame(() => resolve());
    });
  });

const isHorizontalPlacement = (placement: TourStep['placement']): boolean =>
  typeof placement === 'string'
  && (placement === 'left'
    || placement === 'right'
    || placement.startsWith('left-')
    || placement.startsWith('right-'));

function getSafeStepPlacement(
  step: ProfessionalTourStepDefinition,
  displayMode: 'desktop' | 'mobile',
): TourStep['placement'] {
  const preferredPlacement = displayMode === 'mobile'
    ? step.mobilePlacement ?? step.placement
    : step.desktopPlacement ?? step.placement;

  if (displayMode === 'mobile' && isHorizontalPlacement(preferredPlacement)) {
    return 'bottom';
  }

  return preferredPlacement ?? (displayMode === 'mobile' ? 'bottom' : 'right');
}

function getFloatingBoundaryPadding(displayMode: 'desktop' | 'mobile'): number {
  return displayMode === 'mobile' ? 18 : 16;
}

function getFallbackPlacements(
  displayMode: 'desktop' | 'mobile',
  placement: TourStep['placement'],
): Array<NonNullable<TourStep['placement']>> {
  const placementSide = typeof placement === 'string'
    ? placement.split('-')[0]
    : null;

  if (displayMode === 'mobile') {
    return placementSide === 'top'
      ? ['bottom', 'top']
      : ['top', 'bottom'];
  }

  switch (placementSide) {
    case 'left':
      return ['right', 'left', 'top', 'bottom'];
    case 'right':
      return ['left', 'right', 'top', 'bottom'];
    case 'top':
      return ['bottom', 'top', 'right', 'left'];
    case 'bottom':
      return ['top', 'bottom', 'right', 'left'];
    default:
      return ['top', 'bottom', 'right', 'left'];
  }
}

function getFloatingFlipOptions(
  displayMode: 'desktop' | 'mobile',
  placement: TourStep['placement'] = displayMode === 'mobile' ? 'bottom' : 'right',
): NonNullable<TourStep['flip']> {
  return {
    fallbackPlacements: getFallbackPlacements(displayMode, placement),
    padding: getFloatingBoundaryPadding(displayMode),
  };
}

function getFloatingShiftOptions(
  displayMode: 'desktop' | 'mobile',
): NonNullable<TourStep['shift']> {
  return {
    crossAxis: true,
    mainAxis: true,
    padding: getFloatingBoundaryPadding(displayMode),
  };
}

export function ProfessionalTourProvider({
  children,
  currentRouteName,
}: ProfessionalTourProviderProps): React.ReactElement {
  const { width } = useWindowDimensions();
  const { user } = useAuth();
  const { theme } = useTheme();
  const displayMode = width < 768 ? 'mobile' : 'desktop';
  const professionalUser = user?.type === 'professional' ? user : null;
  const isProfessionalUser = professionalUser !== null;
  const userId = professionalUser?.id ?? null;
  const spotlightRef = useRef<SpotlightTour>(null);
  const autoStartedToursRef = useRef<Partial<Record<ProfessionalTourId, true>>>({});
  const autoStartInFlightRef = useRef<Partial<Record<ProfessionalTourId, true>>>({});
  const activeDisplayModeRef = useRef<typeof displayMode | null>(null);
  const activeRouteNameRef = useRef<string | null>(null);
  const activeStepsRef = useRef<ProfessionalTourStepDefinition[]>([]);
  const ignoreNextStopRef = useRef(false);
  const pendingStopReasonRef = useRef<ProfessionalTourStopReason | null>(null);
  const startSourceRef = useRef<ProfessionalTourStartSource>('manual');
  const preparationHandlersRef = useRef(
    new Map<ProfessionalTourTargetId, ProfessionalTourStepPreparationHandler>(),
  );
  const targetRegistryRef = useRef(
    new Map<ProfessionalTourTargetId, RegisteredTourTarget[]>(),
  );
  const routePreferenceRegistryRef = useRef(new Map<ProfessionalTourId, number>());

  const [activeTourId, setActiveTourId] = useState<ProfessionalTourId | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [startToken, setStartToken] = useState(0);
  const [targetRegistryVersion, setTargetRegistryVersion] = useState(0);
  const [routePreferenceVersion, setRoutePreferenceVersion] = useState(0);

  const activeDefinition = activeTourId
    ? getProfessionalTourDefinition(activeTourId)
    : null;

  const visibleSteps = useMemo<ProfessionalTourStepDefinition[]>(() => {
    if (!activeDefinition) {
      return [];
    }

    return getProfessionalTourStepsForDisplay(activeDefinition, displayMode);
  }, [activeDefinition, displayMode]);

  const targetIndexById = useMemo(() => {
    const nextMap = new Map<ProfessionalTourTargetId, number>();
    visibleSteps.forEach((step, index) => {
      nextMap.set(step.targetId, index);
    });
    return nextMap;
  }, [visibleSteps]);

  const currentRouteTourIds = useMemo(
    () => getProfessionalTourIdsForRoute(currentRouteName),
    [currentRouteName],
  );

  const getTargetIndex = useCallback(
    (targetId: ProfessionalTourTargetId): number | null =>
      targetIndexById.get(targetId) ?? null,
    [targetIndexById],
  );

  useEffect(() => {
    autoStartedToursRef.current = {};
    autoStartInFlightRef.current = {};
  }, [userId]);

  const isTargetRegistered = useCallback(
    (targetId: ProfessionalTourTargetId): boolean =>
      (targetRegistryRef.current.get(targetId)?.length ?? 0) > 0,
    [],
  );

  const measureTarget = useCallback(
    async (
      targetId: ProfessionalTourTargetId,
    ): Promise<ProfessionalTourTargetLayout | null> => {
      const registeredTargets = targetRegistryRef.current.get(targetId) ?? [];

      for (const registeredTarget of registeredTargets) {
        if (!registeredTarget.measureTarget) {
          continue;
        }

        try {
          const layout = await registeredTarget.measureTarget();

          if (layout && layout.width > 0 && layout.height > 0) {
            return layout;
          }
        } catch {
          continue;
        }
      }

      return null;
    },
    [],
  );

  const isTargetUsable = useCallback(
    async (targetId: ProfessionalTourTargetId): Promise<boolean> => {
      const registeredTargets = targetRegistryRef.current.get(targetId) ?? [];

      if (registeredTargets.length === 0) {
        return false;
      }

      const hasMeasurableTarget = registeredTargets.some((target) => target.measureTarget);
      if (!hasMeasurableTarget) {
        return true;
      }

      return (await measureTarget(targetId)) !== null;
    },
    [measureTarget],
  );

  const areStepTargetsUsable = useCallback(
    async (steps: ProfessionalTourStepDefinition[]): Promise<boolean> => {
      for (const step of steps) {
        const isUsable = await isTargetUsable(step.targetId);

        if (!isUsable) {
          return false;
        }
      }

      return true;
    },
    [isTargetUsable],
  );

  const getStartableSteps = useCallback(
    (tourId: ProfessionalTourId): ProfessionalTourStepDefinition[] => {
      const definition = getProfessionalTourDefinition(tourId);
      const steps = getProfessionalTourStepsForDisplay(definition, displayMode);
      const firstStep = steps[0];
      const hasAllStepTargets = steps.every((step) => isTargetRegistered(step.targetId));

      if (!firstStep || !isTargetRegistered(firstStep.targetId) || !hasAllStepTargets) {
        return [];
      }

      return steps;
    },
    [displayMode, isTargetRegistered, targetRegistryVersion],
  );

  const getPreferredCurrentRouteTourId = useCallback((): ProfessionalTourId | null => {
    const startableTourIds = currentRouteTourIds.filter(
      (tourId) => getStartableSteps(tourId).length > 0,
    );

    return startableTourIds.find(
      (tourId) => (routePreferenceRegistryRef.current.get(tourId) ?? 0) > 0,
    )
      ?? startableTourIds[0]
      ?? null;
  }, [currentRouteTourIds, getStartableSteps, routePreferenceVersion]);

  const preferredCurrentRouteTourId = getPreferredCurrentRouteTourId();
  const hasTourForCurrentRoute = preferredCurrentRouteTourId !== null;

  const canStartCurrentRouteTour = useMemo(() => (
    isProfessionalUser
    && !isRunning
    && !activeTourId
    && preferredCurrentRouteTourId !== null
  ), [
    activeTourId,
    isProfessionalUser,
    isRunning,
    preferredCurrentRouteTourId,
  ]);

  const registerTarget = useCallback((
    targetId: ProfessionalTourTargetId,
    targetMeasurer?: ProfessionalTourTargetMeasurer,
  ): (() => void) => {
    const registrationId = Symbol(targetId);
    const currentTargets = targetRegistryRef.current.get(targetId) ?? [];
    targetRegistryRef.current.set(targetId, [
      ...currentTargets,
      { id: registrationId, measureTarget: targetMeasurer },
    ]);
    setTargetRegistryVersion((current) => current + 1);

    return () => {
      const remainingTargets = (targetRegistryRef.current.get(targetId) ?? [])
        .filter((target) => target.id !== registrationId);

      if (remainingTargets.length === 0) {
        targetRegistryRef.current.delete(targetId);
      } else {
        targetRegistryRef.current.set(targetId, remainingTargets);
      }

      setTargetRegistryVersion((current) => current + 1);
    };
  }, []);

  const registerCurrentRouteTourPreference = useCallback(
    (tourId: ProfessionalTourId): (() => void) => {
      const currentCount = routePreferenceRegistryRef.current.get(tourId) ?? 0;
      routePreferenceRegistryRef.current.set(tourId, currentCount + 1);
      setRoutePreferenceVersion((current) => current + 1);

      return () => {
        const nextCount = (routePreferenceRegistryRef.current.get(tourId) ?? 1) - 1;

        if (nextCount <= 0) {
          routePreferenceRegistryRef.current.delete(tourId);
        } else {
          routePreferenceRegistryRef.current.set(tourId, nextCount);
        }

        setRoutePreferenceVersion((current) => current + 1);
      };
    },
    [],
  );

  const registerStepPreparation = useCallback(
    (
      targetId: ProfessionalTourTargetId,
      handler: ProfessionalTourStepPreparationHandler,
    ): (() => void) => {
      preparationHandlersRef.current.set(targetId, handler);

      return () => {
        if (preparationHandlersRef.current.get(targetId) === handler) {
          preparationHandlersRef.current.delete(targetId);
        }
      };
    },
    [],
  );

  const prepareStep = useCallback(
    async (targetId: ProfessionalTourTargetId): Promise<void> => {
      blurWebActiveElementForTour();
      const handler = preparationHandlersRef.current.get(targetId);

      if (handler) {
        await handler();
      }

      await waitForStepPreparationSettle();
      blurWebActiveElementForTour();
    },
    [],
  );

  const startTour = useCallback(
    async (
      tourId: ProfessionalTourId,
      source: ProfessionalTourStartSource = 'manual',
    ): Promise<boolean> => {
      if (!isProfessionalUser) {
        return false;
      }

      const definition = getProfessionalTourDefinition(tourId);
      const steps = getStartableSteps(tourId);

      if (steps.length === 0) {
        return false;
      }

      if (!(await areStepTargetsUsable(steps))) {
        return false;
      }

      ignoreNextStopRef.current = false;
      activeDisplayModeRef.current = displayMode;
      activeRouteNameRef.current = definition.routeName;
      activeStepsRef.current = steps;
      pendingStopReasonRef.current = null;
      startSourceRef.current = source;
      setActiveTourId(tourId);
      setIsRunning(true);
      setStartToken((current) => current + 1);
      return true;
    },
    [areStepTargetsUsable, displayMode, getStartableSteps, isProfessionalUser],
  );

  const requestAutoStart = useCallback(
    async (
      tourId: ProfessionalTourId,
      shouldStart: ProfessionalTourAutoStartGuard = () => true,
    ): Promise<boolean> => {
      if (!userId || isRunning || activeTourId || autoStartedToursRef.current[tourId]) {
        return false;
      }

      const definition = getProfessionalTourDefinition(tourId);
      if (!definition.autoStart) {
        return false;
      }

      if (
        !shouldStart()
        || definition.routeName !== currentRouteName
        || getStartableSteps(tourId).length === 0
        || autoStartInFlightRef.current[tourId]
      ) {
        return false;
      }

      autoStartInFlightRef.current[tourId] = true;

      try {
        let hasSeen = true;
        try {
          hasSeen = await hasSeenProfessionalTour(userId, definition);
        } catch {
          autoStartedToursRef.current[tourId] = true;
          return false;
        }

        if (hasSeen) {
          autoStartedToursRef.current[tourId] = true;
          return false;
        }

        if (
          !shouldStart()
          || definition.routeName !== currentRouteName
          || getStartableSteps(tourId).length === 0
        ) {
          return false;
        }

        const didStart = await startTour(tourId, 'auto');
        if (didStart) {
          autoStartedToursRef.current[tourId] = true;
        }

        return didStart;
      } finally {
        delete autoStartInFlightRef.current[tourId];
      }
    },
    [activeTourId, currentRouteName, getStartableSteps, isRunning, startTour, userId],
  );

  const startCurrentRouteTour = useCallback(
    async (source: ProfessionalTourStartSource = 'manual'): Promise<boolean> => {
      const startableTourIds = currentRouteTourIds.filter(
        (tourId) => getStartableSteps(tourId).length > 0,
      );
      const preferredTourIds = [
        ...startableTourIds.filter(
          (tourId) => (routePreferenceRegistryRef.current.get(tourId) ?? 0) > 0,
        ),
        ...startableTourIds.filter(
          (tourId) => (routePreferenceRegistryRef.current.get(tourId) ?? 0) <= 0,
        ),
      ];

      for (const tourId of preferredTourIds) {
        const didStart = await startTour(tourId, source);

        if (didStart) {
          return true;
        }
      }

      return false;
    },
    [currentRouteTourIds, getStartableSteps, startTour],
  );

  const handleStop = useCallback(
    (state: TourState) => {
      blurWebActiveElementForTour();

      if (ignoreNextStopRef.current) {
        ignoreNextStopRef.current = false;
        return;
      }

      if (!activeDefinition || !activeTourId) {
        return;
      }

      const reason = pendingStopReasonRef.current
        ?? (state.isLast ? 'completed' : 'skipped');
      const currentStep = activeStepsRef.current[state.index];
      const eventRoute = activeRouteNameRef.current ?? currentRouteName;
      pendingStopReasonRef.current = null;

      if (reason === 'interrupted') {
        delete autoStartedToursRef.current[activeTourId];
        analyticsService.track('professional_tour_interrupted', {
          route: eventRoute,
          source: startSourceRef.current,
          stepId: currentStep?.id,
          tourId: activeTourId,
        });
      } else {
        if (userId) {
          void markProfessionalTourSeen(userId, activeDefinition, reason)
            .catch(() => undefined);
        }

        analyticsService.track(
          reason === 'completed'
            ? 'professional_tour_completed'
            : 'professional_tour_skipped',
          {
            route: eventRoute,
            source: startSourceRef.current,
            stepId: currentStep?.id,
            tourId: activeTourId,
          },
        );
      }

      activeDisplayModeRef.current = null;
      activeRouteNameRef.current = null;
      activeStepsRef.current = [];
      setIsRunning(false);
      setActiveTourId(null);
    },
    [activeDefinition, activeTourId, currentRouteName, userId],
  );

  const interruptRunningTour = useCallback(() => {
    if (!activeTourId || !activeDefinition) {
      return;
    }

    const eventRoute = activeRouteNameRef.current ?? currentRouteName;
    const currentStep = activeStepsRef.current[0];
    pendingStopReasonRef.current = 'interrupted';
    ignoreNextStopRef.current = true;
    spotlightRef.current?.stop();
    delete autoStartedToursRef.current[activeTourId];
    analyticsService.track('professional_tour_interrupted', {
      route: eventRoute,
      source: startSourceRef.current,
      stepId: currentStep?.id,
      tourId: activeTourId,
    });
    pendingStopReasonRef.current = null;
    activeDisplayModeRef.current = null;
    activeRouteNameRef.current = null;
    activeStepsRef.current = [];
    setIsRunning(false);
    setActiveTourId(null);
  }, [activeDefinition, activeTourId, currentRouteName]);

  useEffect(() => {
    if (!activeTourId || !isRunning) {
      return;
    }

    const routeChanged = activeRouteNameRef.current
      ? currentRouteName !== activeRouteNameRef.current
      : false;
    const displayModeChanged = activeDisplayModeRef.current
      ? displayMode !== activeDisplayModeRef.current
      : false;

    if (routeChanged || displayModeChanged) {
      interruptRunningTour();
    }
  }, [activeTourId, currentRouteName, displayMode, interruptRunningTour, isRunning]);

  useEffect(() => {
    if (!activeTourId || !isRunning || activeStepsRef.current.length === 0) {
      return;
    }

    const hasAllActiveTargetsMounted = activeStepsRef.current.every((step) =>
      isTargetRegistered(step.targetId),
    );

    if (!hasAllActiveTargetsMounted) {
      interruptRunningTour();
    }
  }, [
    activeTourId,
    interruptRunningTour,
    isRunning,
    isTargetRegistered,
    targetRegistryVersion,
  ]);

  const spotlightSteps = useMemo<TourStep[]>(
    () =>
      visibleSteps.map((step) => {
        const placement = getSafeStepPlacement(step, displayMode);

        return {
          arrow: { color: theme.bgElevated, size: 14 },
          motion: 'fade',
          offset: 12,
          placement,
          before: async () => {
            await prepareStep(step.targetId);

            if (!(await isTargetUsable(step.targetId))) {
              interruptRunningTour();
            }
          },
          flip: getFloatingFlipOptions(displayMode, placement),
          render: (renderProps) => (
            <ProfessionalTourTooltip
              {...renderProps}
              onNext={() => {
                if (renderProps.isLast) {
                  pendingStopReasonRef.current = 'completed';
                }
                renderProps.next();
              }}
              onSkip={() => {
                pendingStopReasonRef.current = 'skipped';
                renderProps.stop();
              }}
              routeName={currentRouteName}
              step={step}
              totalSteps={visibleSteps.length}
              tourId={activeTourId ?? 'unknown'}
            />
          ),
          shape: step.shape ?? { padding: 8, type: 'rectangle' },
          shift: getFloatingShiftOptions(displayMode),
        };
      }),
    [
      activeTourId,
      currentRouteName,
      displayMode,
      interruptRunningTour,
      isTargetUsable,
      prepareStep,
      theme.bgElevated,
      visibleSteps,
    ],
  );

  useEffect(() => {
    if (!activeTourId || startToken === 0 || spotlightSteps.length === 0) {
      return undefined;
    }

    const timeout = setTimeout(() => {
      blurWebActiveElementForTour();
      spotlightRef.current?.start();
      analyticsService.track('professional_tour_started', {
        route: currentRouteName,
        source: startSourceRef.current,
        tourId: activeTourId,
      });
    }, START_DELAY_MS);

    return () => clearTimeout(timeout);
  }, [activeTourId, currentRouteName, spotlightSteps.length, startToken]);

  const contextValue = useMemo<ProfessionalTourContextValue>(
    () => ({
      activeTourId,
      canStartCurrentRouteTour,
      currentRouteName,
      getTargetIndex,
      hasTourForCurrentRoute,
      isRunning,
      measureTarget,
      registerCurrentRouteTourPreference,
      registerStepPreparation,
      registerTarget,
      requestAutoStart,
      startCurrentRouteTour,
      startTour,
      targetRegistryVersion,
    }),
    [
      activeTourId,
      canStartCurrentRouteTour,
      currentRouteName,
      getTargetIndex,
      hasTourForCurrentRoute,
      isRunning,
      measureTarget,
      registerCurrentRouteTourPreference,
      registerStepPreparation,
      registerTarget,
      requestAutoStart,
      startCurrentRouteTour,
      startTour,
      targetRegistryVersion,
    ],
  );

  return (
    <ProfessionalTourContext.Provider value={contextValue}>
      <SpotlightTourProvider
        ref={spotlightRef}
        arrow={{ color: theme.bgElevated, size: 14 }}
        motion="fade"
        nativeDriver={{ android: true, ios: true, web: false }}
        offset={12}
        onStop={handleStop}
        overlayColor={theme.overlay}
        overlayOpacity={0.62}
        shape={{ padding: 8, type: 'rectangle' }}
        flip={getFloatingFlipOptions(displayMode)}
        shift={getFloatingShiftOptions(displayMode)}
        steps={spotlightSteps}
      >
        {children}
      </SpotlightTourProvider>
    </ProfessionalTourContext.Provider>
  );
}
