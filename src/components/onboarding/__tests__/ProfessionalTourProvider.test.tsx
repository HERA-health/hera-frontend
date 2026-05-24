let mockWindowDimensions = {
  fontScale: 1,
  height: 900,
  scale: 1,
  width: 1440,
};
const mockUseWindowDimensions = jest.fn(() => mockWindowDimensions);

jest.mock('react-native', () => {
  const actual = jest.requireActual('react-native');
  return new Proxy(actual, {
    get(target, property, receiver) {
      if (property === 'useWindowDimensions') {
        return mockUseWindowDimensions;
      }

      return Reflect.get(target, property, receiver);
    },
  });
});

import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { lightTheme } from '../../../constants/theme';
import { useAuth } from '../../../contexts/AuthContext';
import { useTheme } from '../../../contexts/ThemeContext';
import * as analyticsService from '../../../services/analyticsService';
import {
  ProfessionalTourProvider,
  blurWebActiveElementForTour,
} from '../ProfessionalTourProvider';
import {
  useProfessionalTour,
  useProfessionalTourAutoStart,
  useProfessionalTourRoutePreference,
  useProfessionalTourStepPreparation,
} from '../professionalTourContext';
import { TourTarget } from '../TourTarget';
import {
  hasSeenProfessionalTour,
  markProfessionalTourSeen,
} from '../professionalTourStorage';

jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: jest.fn(),
}));

jest.mock('../../../services/analyticsService', () => ({
  track: jest.fn(),
}));

jest.mock('../professionalTourStorage', () => ({
  hasSeenProfessionalTour: jest.fn(),
  markProfessionalTourSeen: jest.fn(),
}));

type MockTourStep = {
  before?: () => Promise<void> | void;
  flip?: { fallbackPlacements?: string[]; padding?: number };
  onBackdropPress?: unknown;
  placement?: string;
  shift?: { crossAxis?: boolean; padding?: number };
};

type MockSpotlightProviderProps = {
  onBackdropPress?: unknown;
  onStop?: (state: { index: number; isLast: boolean }) => void;
  steps: MockTourStep[];
};

type MockSpotlightControls = {
  start: jest.Mock;
  stop: jest.Mock;
};

const mockedUseAuth = jest.mocked(useAuth);
const mockedUseTheme = jest.mocked(useTheme);
const mockedAnalytics = jest.mocked(analyticsService);
const mockedHasSeenProfessionalTour = jest.mocked(hasSeenProfessionalTour);
const mockedMarkProfessionalTourSeen = jest.mocked(markProfessionalTourSeen);

const getSpotlightTourTestState = (): {
  controls: MockSpotlightControls;
  props: MockSpotlightProviderProps | null;
} => {
  const spotlightMock = jest.requireMock('react-native-spotlight-tour') as {
    __getSpotlightTourTestState: () => {
      controls: MockSpotlightControls;
      props: MockSpotlightProviderProps | null;
    };
  };

  return spotlightMock.__getSpotlightTourTestState();
};

function ProfessionalHomeTargets({
  includeFirst = true,
}: {
  includeFirst?: boolean;
}): React.ReactElement {
  return (
    <View>
      {includeFirst ? (
        <>
          <TourTarget id="professional.nav.home" fill>
            <View testID="professional-nav-home-target" />
          </TourTarget>
          <TourTarget id="professional.nav.mobile-menu" fill>
            <View testID="professional-nav-mobile-menu-target" />
          </TourTarget>
        </>
      ) : null}
      <TourTarget id="professional.home.calendar" fill>
        <View testID="professional-home-calendar-target" />
      </TourTarget>
      <TourTarget id="professional.home.pending-requests" fill>
        <View testID="professional-home-pending-target" />
      </TourTarget>
      <TourTarget id="professional.home.upcoming-sessions" fill>
        <View testID="professional-home-upcoming-target" />
      </TourTarget>
    </View>
  );
}

function ManualTourHarness({
  onPrepare,
}: {
  onPrepare: jest.Mock;
}): React.ReactElement {
  const tour = useProfessionalTour();

  useProfessionalTourStepPreparation('professional.home.calendar', onPrepare);

  return (
    <View>
      <ProfessionalHomeTargets />
      <Text testID="tour-ready">
        {tour.canStartCurrentRouteTour ? 'ready' : 'not-ready'}
      </Text>
      <Pressable
        onPress={() => {
          void tour.startTour('professional_home_v1', 'manual');
        }}
      >
        <Text>start tour</Text>
      </Pressable>
    </View>
  );
}

function SpotlightStyleHarness(): React.ReactElement {
  const tour = useProfessionalTour();

  return (
    <View>
      <TourTarget
        id="professional.nav.home"
        fill
        spotlightStyle={{ flex: 1, width: '100%' }}
      >
        <View testID="professional-nav-home-target" />
      </TourTarget>
      <TourTarget id="professional.nav.mobile-menu" fill>
        <View testID="professional-nav-mobile-menu-target" />
      </TourTarget>
      <TourTarget id="professional.home.calendar" fill>
        <View testID="professional-home-calendar-target" />
      </TourTarget>
      <TourTarget id="professional.home.pending-requests" fill>
        <View testID="professional-home-pending-target" />
      </TourTarget>
      <TourTarget id="professional.home.upcoming-sessions" fill>
        <View testID="professional-home-upcoming-target" />
      </TourTarget>
      <Pressable
        onPress={() => {
          void tour.startTour('professional_home_v1', 'manual');
        }}
      >
        <Text>start styled tour</Text>
      </Pressable>
    </View>
  );
}

function UnmeasurableFirstTargetHarness(): React.ReactElement {
  const tour = useProfessionalTour();

  return (
    <View>
      <TourTarget id="professional.nav.home" fill style={{ width: '100%' }}>
        <View testID="professional-nav-home-target" />
      </TourTarget>
      <TourTarget id="professional.home.calendar" fill>
        <View testID="professional-home-calendar-target" />
      </TourTarget>
      <TourTarget id="professional.home.pending-requests" fill>
        <View testID="professional-home-pending-target" />
      </TourTarget>
      <TourTarget id="professional.home.upcoming-sessions" fill>
        <View testID="professional-home-upcoming-target" />
      </TourTarget>
      <Pressable
        onPress={() => {
          void tour.startTour('professional_home_v1', 'manual');
        }}
      >
        <Text>start unmeasurable tour</Text>
      </Pressable>
    </View>
  );
}

function UnmeasurableLaterTargetHarness(): React.ReactElement {
  const tour = useProfessionalTour();

  return (
    <View>
      <TourTarget id="professional.nav.home" fill>
        <View testID="professional-nav-home-target" />
      </TourTarget>
      <TourTarget id="professional.home.calendar" fill style={{ width: '100%' }}>
        <View testID="professional-home-calendar-target" />
      </TourTarget>
      <TourTarget id="professional.home.pending-requests" fill>
        <View testID="professional-home-pending-target" />
      </TourTarget>
      <TourTarget id="professional.home.upcoming-sessions" fill>
        <View testID="professional-home-upcoming-target" />
      </TourTarget>
      <Pressable
        onPress={() => {
          void tour.startTour('professional_home_v1', 'manual');
        }}
      >
        <Text>start later unmeasurable tour</Text>
      </Pressable>
    </View>
  );
}

function DeferredAutoStartHarness(): React.ReactElement {
  const [includeFirst, setIncludeFirst] = useState(false);
  const tour = useProfessionalTour();
  useProfessionalTourAutoStart('professional_home_v1');

  return (
    <View>
      <Text testID="tour-ready">
        {tour.canStartCurrentRouteTour ? 'ready' : 'not-ready'}
      </Text>
      <Pressable onPress={() => setIncludeFirst(true)}>
        <Text>mount first target</Text>
      </Pressable>
      <ProfessionalHomeTargets includeFirst={includeFirst} />
    </View>
  );
}

function AutoStartGateHarness({ enabled }: { enabled: boolean }): React.ReactElement {
  useProfessionalTourAutoStart('professional_home_v1', enabled);

  return <ProfessionalHomeTargets />;
}

function ProfessionalProfileMobileTargets(): React.ReactElement {
  const tour = useProfessionalTour();

  return (
    <View>
      <TourTarget id="professional.profile.tabs" fill>
        <View testID="professional-profile-tabs-target" />
      </TourTarget>
      <TourTarget id="professional.profile.visibility" fill>
        <View testID="professional-profile-visibility-target" />
      </TourTarget>
      <TourTarget id="professional.profile.preview" fill>
        <View testID="professional-profile-preview-target" />
      </TourTarget>
      <TourTarget id="professional.profile.save" fill>
        <View testID="professional-profile-save-target" />
      </TourTarget>
      <Pressable
        onPress={() => {
          void tour.startTour('professional_profile_v1', 'manual');
        }}
      >
        <Text>start profile tour</Text>
      </Pressable>
    </View>
  );
}

function ProfessionalDashboardMobileTargets(): React.ReactElement {
  const tour = useProfessionalTour();

  return (
    <View>
      <TourTarget id="professional.dashboard.income-chart" fill>
        <View testID="professional-dashboard-income-target" />
      </TourTarget>
      <TourTarget id="professional.dashboard.kpis" fill>
        <View testID="professional-dashboard-kpis-target" />
      </TourTarget>
      <TourTarget id="professional.dashboard.detail-charts" fill>
        <View testID="professional-dashboard-detail-target" />
      </TourTarget>
      <Pressable
        onPress={() => {
          void tour.startTour('professional_dashboard_v1', 'manual');
        }}
      >
        <Text>start dashboard tour</Text>
      </Pressable>
    </View>
  );
}

function ProfessionalClinicalAreaTargets({
  active = true,
}: {
  active?: boolean;
}): React.ReactElement {
  useProfessionalTourAutoStart('professional_clinical_area_v1', active);

  return (
    <View>
      <TourTarget id="professional.clinical.hero" active={active} fill>
        <View testID="professional-clinical-hero-target" />
      </TourTarget>
      <TourTarget id="professional.clinical.workspace-tabs" active={active} fill>
        <View testID="professional-clinical-workspace-tabs-target" />
      </TourTarget>
      <TourTarget id="professional.clinical.notes" active={active} fill>
        <View testID="professional-clinical-notes-target" />
      </TourTarget>
      <TourTarget id="professional.clinical.timeline" active={active} fill>
        <View testID="professional-clinical-timeline-target" />
      </TourTarget>
      <TourTarget id="professional.clinical.questionnaire" active={active} fill>
        <View testID="professional-clinical-questionnaire-target" />
      </TourTarget>
      <TourTarget id="professional.clinical.consent" active={active} fill>
        <View testID="professional-clinical-consent-target" />
      </TourTarget>
      <TourTarget id="professional.clinical.consent-documents" active={active} fill>
        <View testID="professional-clinical-consent-documents-target" />
      </TourTarget>
      <TourTarget id="professional.clinical.reports" active={active} fill>
        <View testID="professional-clinical-reports-target" />
      </TourTarget>
      <TourTarget id="professional.clinical.documents" active={active} fill>
        <View testID="professional-clinical-documents-target" />
      </TourTarget>
    </View>
  );
}

function ClientProfileManualGuideHarness({
  clinicalActive = true,
  preferClinical = false,
}: {
  clinicalActive?: boolean;
  preferClinical?: boolean;
}): React.ReactElement {
  const tour = useProfessionalTour();
  useProfessionalTourRoutePreference('professional_clinical_area_v1', preferClinical);

  return (
    <View>
      <TourTarget id="professional.client-profile.hero" fill>
        <View testID="professional-client-profile-hero-target" />
      </TourTarget>
      <TourTarget id="professional.client-profile.actions" fill>
        <View testID="professional-client-profile-actions-target" />
      </TourTarget>
      <TourTarget id="professional.client-profile.tabs" fill>
        <View testID="professional-client-profile-tabs-target" />
      </TourTarget>
      <TourTarget id="professional.clinical.hero" active={clinicalActive} fill>
        <View testID="professional-clinical-hero-target" />
      </TourTarget>
      <TourTarget id="professional.clinical.workspace-tabs" active={clinicalActive} fill>
        <View testID="professional-clinical-workspace-tabs-target" />
      </TourTarget>
      <TourTarget id="professional.clinical.notes" active={clinicalActive} fill>
        <View testID="professional-clinical-notes-target" />
      </TourTarget>
      <TourTarget id="professional.clinical.timeline" active={clinicalActive} fill>
        <View testID="professional-clinical-timeline-target" />
      </TourTarget>
      <TourTarget id="professional.clinical.questionnaire" active={clinicalActive} fill>
        <View testID="professional-clinical-questionnaire-target" />
      </TourTarget>
      <TourTarget id="professional.clinical.consent" active={clinicalActive} fill>
        <View testID="professional-clinical-consent-target" />
      </TourTarget>
      <TourTarget id="professional.clinical.consent-documents" active={clinicalActive} fill>
        <View testID="professional-clinical-consent-documents-target" />
      </TourTarget>
      <TourTarget id="professional.clinical.reports" active={clinicalActive} fill>
        <View testID="professional-clinical-reports-target" />
      </TourTarget>
      <TourTarget id="professional.clinical.documents" active={clinicalActive} fill>
        <View testID="professional-clinical-documents-target" />
      </TourTarget>
      <Pressable
        onPress={() => {
          void tour.startCurrentRouteTour('manual');
        }}
      >
        <Text>start current route tour</Text>
      </Pressable>
    </View>
  );
}

describe('ProfessionalTourProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWindowDimensions = {
      fontScale: 1,
      height: 900,
      scale: 1,
      width: 1440,
    };
    mockedUseAuth.mockReturnValue({
      user: { id: 'professional-1', type: 'professional' },
    } as unknown as ReturnType<typeof useAuth>);
    mockedUseTheme.mockReturnValue({
      theme: lightTheme,
      mode: 'light',
      isDark: false,
      setMode: jest.fn(),
    });
    mockedHasSeenProfessionalTour.mockResolvedValue(false);
    mockedMarkProfessionalTourSeen.mockResolvedValue(undefined);
  });

  it('runs registered step preparation before measuring a step and keeps backdrop taps inert', async () => {
    const onPrepare = jest.fn();
    const screen = render(
      <ProfessionalTourProvider currentRouteName="ProfessionalHome">
        <ManualTourHarness onPrepare={onPrepare} />
      </ProfessionalTourProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('tour-ready')).toHaveTextContent('ready');
    });

    fireEvent.press(screen.getByText('start tour'));

    await waitFor(() => {
      expect(getSpotlightTourTestState().props?.steps.length).toBeGreaterThan(1);
    });

    const state = getSpotlightTourTestState();
    const calendarStep = state.props?.steps[1];
    await Promise.resolve(calendarStep?.before?.());

    expect(onPrepare).toHaveBeenCalledTimes(1);
    expect(state.props?.onBackdropPress).toBeUndefined();
    expect(state.props?.steps[0].onBackdropPress).toBeUndefined();
  });

  it('passes explicit spotlight layout styles to the measured tour wrapper', async () => {
    const screen = render(
      <ProfessionalTourProvider currentRouteName="ProfessionalHome">
        <SpotlightStyleHarness />
      </ProfessionalTourProvider>,
    );

    fireEvent.press(screen.getByText('start styled tour'));

    await waitFor(() => {
      expect(screen.getAllByTestId('mock-tour-target').length).toBeGreaterThan(0);
    });

    expect(screen.getAllByTestId('mock-tour-target')[0]).toHaveStyle({
      flex: 1,
      width: '100%',
    });
  });

  it('does not start when the first measurable target reports no usable layout', async () => {
    const screen = render(
      <ProfessionalTourProvider currentRouteName="ProfessionalHome">
        <UnmeasurableFirstTargetHarness />
      </ProfessionalTourProvider>,
    );

    fireEvent.press(screen.getByText('start unmeasurable tour'));

    await new Promise((resolve) => {
      setTimeout(resolve, 240);
    });

    expect(getSpotlightTourTestState().controls.start).not.toHaveBeenCalled();
    expect(mockedMarkProfessionalTourSeen).not.toHaveBeenCalled();
  });

  it('does not start when a later measurable target reports no usable layout', async () => {
    const screen = render(
      <ProfessionalTourProvider currentRouteName="ProfessionalHome">
        <UnmeasurableLaterTargetHarness />
      </ProfessionalTourProvider>,
    );

    fireEvent.press(screen.getByText('start later unmeasurable tour'));

    await new Promise((resolve) => {
      setTimeout(resolve, 240);
    });

    expect(getSpotlightTourTestState().controls.start).not.toHaveBeenCalled();
    expect(mockedMarkProfessionalTourSeen).not.toHaveBeenCalled();
  });

  it('does not attempt auto-start until the first target is registered', () => {
    render(
      <ProfessionalTourProvider currentRouteName="ProfessionalHome">
        <DeferredAutoStartHarness />
      </ProfessionalTourProvider>,
    );

    expect(mockedHasSeenProfessionalTour).not.toHaveBeenCalled();
    expect(getSpotlightTourTestState().controls.start).not.toHaveBeenCalled();
  });

  it('retries auto-start when the first target appears', async () => {
    const screen = render(
      <ProfessionalTourProvider currentRouteName="ProfessionalHome">
        <DeferredAutoStartHarness />
      </ProfessionalTourProvider>,
    );

    fireEvent.press(screen.getByText('mount first target'));

    await waitFor(() => {
      expect(screen.getByTestId('tour-ready')).toHaveTextContent('ready');
    });
    await waitFor(() => {
      expect(mockedHasSeenProfessionalTour).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(getSpotlightTourTestState().controls.start).toHaveBeenCalledTimes(1);
    });
  });

  it('does not auto-start when the screen gate closes while storage is pending', async () => {
    let resolveHasSeen: (hasSeen: boolean) => void = () => undefined;
    mockedHasSeenProfessionalTour.mockReturnValue(
      new Promise((resolve) => {
        resolveHasSeen = resolve;
      }),
    );

    const { rerender } = render(
      <ProfessionalTourProvider currentRouteName="ProfessionalHome">
        <AutoStartGateHarness enabled />
      </ProfessionalTourProvider>,
    );

    await waitFor(() => {
      expect(mockedHasSeenProfessionalTour).toHaveBeenCalled();
    });

    rerender(
      <ProfessionalTourProvider currentRouteName="ProfessionalHome">
        <AutoStartGateHarness enabled={false} />
      </ProfessionalTourProvider>,
    );

    await act(async () => {
      resolveHasSeen(false);
    });

    await new Promise((resolve) => {
      setTimeout(resolve, 240);
    });

    expect(getSpotlightTourTestState().controls.start).not.toHaveBeenCalled();
  });

  it('does not auto-start when storage cannot be read', async () => {
    mockedHasSeenProfessionalTour.mockRejectedValue(new Error('storage unavailable'));

    render(
      <ProfessionalTourProvider currentRouteName="ProfessionalHome">
        <AutoStartGateHarness enabled />
      </ProfessionalTourProvider>,
    );

    await waitFor(() => {
      expect(mockedHasSeenProfessionalTour).toHaveBeenCalled();
    });

    await new Promise((resolve) => {
      setTimeout(resolve, 240);
    });

    expect(getSpotlightTourTestState().controls.start).not.toHaveBeenCalled();
  });

  it('does not persist a tour interrupted by route changes', async () => {
    const onPrepare = jest.fn();
    const { getByText, rerender } = render(
      <ProfessionalTourProvider currentRouteName="ProfessionalHome">
        <ManualTourHarness onPrepare={onPrepare} />
      </ProfessionalTourProvider>,
    );

    await waitFor(() => {
      expect(getByText('ready')).toBeTruthy();
    });
    fireEvent.press(getByText('start tour'));

    await waitFor(() => {
      expect(getSpotlightTourTestState().controls.start).toHaveBeenCalledTimes(1);
    });

    rerender(
      <ProfessionalTourProvider currentRouteName="ProfessionalClients">
        <ManualTourHarness onPrepare={onPrepare} />
      </ProfessionalTourProvider>,
    );

    await waitFor(() => {
      expect(getSpotlightTourTestState().controls.stop).toHaveBeenCalledTimes(1);
    });
    expect(mockedMarkProfessionalTourSeen).not.toHaveBeenCalled();
    expect(mockedAnalytics.track).toHaveBeenCalledWith(
      'professional_tour_interrupted',
      expect.objectContaining({
        route: 'ProfessionalHome',
        tourId: 'professional_home_v1',
      }),
    );
  });

  it('does not let an interrupted pre-overlay tour suppress the next explicit stop', async () => {
    const onPrepare = jest.fn();
    const { getByText, rerender } = render(
      <ProfessionalTourProvider currentRouteName="ProfessionalHome">
        <ManualTourHarness onPrepare={onPrepare} />
      </ProfessionalTourProvider>,
    );

    await waitFor(() => {
      expect(getByText('ready')).toBeTruthy();
    });
    fireEvent.press(getByText('start tour'));

    rerender(
      <ProfessionalTourProvider currentRouteName="ProfessionalClients">
        <ManualTourHarness onPrepare={onPrepare} />
      </ProfessionalTourProvider>,
    );

    expect(mockedMarkProfessionalTourSeen).not.toHaveBeenCalled();

    rerender(
      <ProfessionalTourProvider currentRouteName="ProfessionalHome">
        <ManualTourHarness onPrepare={onPrepare} />
      </ProfessionalTourProvider>,
    );

    await waitFor(() => {
      expect(getByText('ready')).toBeTruthy();
    });
    fireEvent.press(getByText('start tour'));

    await waitFor(() => {
      expect(getSpotlightTourTestState().controls.start).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      getSpotlightTourTestState().props?.onStop?.({ index: 1, isLast: false });
    });

    await waitFor(() => {
      expect(mockedMarkProfessionalTourSeen).toHaveBeenCalledWith(
        'professional-1',
        expect.objectContaining({ id: 'professional_home_v1' }),
        'skipped',
      );
    });
  });

  it('does not persist a tour interrupted by breakpoint changes', async () => {
    const onPrepare = jest.fn();
    const { getByText, rerender } = render(
      <ProfessionalTourProvider currentRouteName="ProfessionalHome">
        <ManualTourHarness onPrepare={onPrepare} />
      </ProfessionalTourProvider>,
    );

    await waitFor(() => {
      expect(getByText('ready')).toBeTruthy();
    });
    fireEvent.press(getByText('start tour'));

    await waitFor(() => {
      expect(getSpotlightTourTestState().controls.start).toHaveBeenCalledTimes(1);
    });

    mockWindowDimensions = {
      fontScale: 1,
      height: 740,
      scale: 1,
      width: 360,
    };

    rerender(
      <ProfessionalTourProvider currentRouteName="ProfessionalHome">
        <ManualTourHarness onPrepare={onPrepare} />
      </ProfessionalTourProvider>,
    );

    await waitFor(() => {
      expect(getSpotlightTourTestState().controls.stop).toHaveBeenCalledTimes(1);
    });
    expect(mockedMarkProfessionalTourSeen).not.toHaveBeenCalled();
  });

  it('avoids horizontal tooltip placements on mobile', async () => {
    mockWindowDimensions = {
      fontScale: 1,
      height: 740,
      scale: 1,
      width: 360,
    };

    const screen = render(
      <ProfessionalTourProvider currentRouteName="ProfessionalProfile">
        <ProfessionalProfileMobileTargets />
      </ProfessionalTourProvider>,
    );

    fireEvent.press(screen.getByText('start profile tour'));

    await waitFor(() => {
      expect(getSpotlightTourTestState().props?.steps.length).toBe(4);
    });

    const placements = getSpotlightTourTestState().props?.steps.map((step) => step.placement);

    expect(placements).toEqual(['bottom', 'bottom', 'bottom', 'bottom']);
    expect(getSpotlightTourTestState().props?.steps[0].flip).toEqual({
      fallbackPlacements: ['top', 'bottom'],
      padding: 18,
    });
    expect(getSpotlightTourTestState().props?.steps[3].flip).toEqual({
      fallbackPlacements: ['top', 'bottom'],
      padding: 18,
    });
    expect(getSpotlightTourTestState().props?.steps[0].shift).toEqual({
      crossAxis: true,
      mainAxis: true,
      padding: 18,
    });
  });

  it('keeps the lower dashboard tour step usable on mobile', async () => {
    mockWindowDimensions = {
      fontScale: 1,
      height: 740,
      scale: 1,
      width: 360,
    };

    const screen = render(
      <ProfessionalTourProvider currentRouteName="ProfessionalDashboard">
        <ProfessionalDashboardMobileTargets />
      </ProfessionalTourProvider>,
    );

    fireEvent.press(screen.getByText('start dashboard tour'));

    await waitFor(() => {
      expect(getSpotlightTourTestState().props?.steps.length).toBe(3);
    });

    const dashboardSteps = getSpotlightTourTestState().props?.steps;

    expect(dashboardSteps?.map((step) => step.placement)).toEqual([
      'bottom',
      'bottom',
      'bottom',
    ]);
    expect(dashboardSteps?.[2].flip).toEqual({
      fallbackPlacements: ['top', 'bottom'],
      padding: 18,
    });
  });

  it('auto-starts a secondary clinical tour on ClientProfile when its targets are ready', async () => {
    render(
      <ProfessionalTourProvider currentRouteName="ClientProfile">
        <ProfessionalClinicalAreaTargets />
      </ProfessionalTourProvider>,
    );

    await waitFor(() => {
      expect(mockedHasSeenProfessionalTour).toHaveBeenCalledWith(
        'professional-1',
        expect.objectContaining({ id: 'professional_clinical_area_v1' }),
      );
    });
    await waitFor(() => {
      expect(getSpotlightTourTestState().controls.start).toHaveBeenCalledTimes(1);
    });
  });

  it('does not auto-start the clinical tour while its mounted targets are inactive', async () => {
    render(
      <ProfessionalTourProvider currentRouteName="ClientProfile">
        <ProfessionalClinicalAreaTargets active={false} />
      </ProfessionalTourProvider>,
    );

    await new Promise((resolve) => {
      setTimeout(resolve, 240);
    });

    expect(mockedHasSeenProfessionalTour).not.toHaveBeenCalled();
    expect(getSpotlightTourTestState().controls.start).not.toHaveBeenCalled();
  });

  it('uses the client profile tour for manual guide starts when clinical targets are mounted but hidden', async () => {
    const screen = render(
      <ProfessionalTourProvider currentRouteName="ClientProfile">
        <ClientProfileManualGuideHarness clinicalActive={false} />
      </ProfessionalTourProvider>,
    );

    fireEvent.press(screen.getByText('start current route tour'));

    await waitFor(() => {
      expect(getSpotlightTourTestState().controls.start).toHaveBeenCalledTimes(1);
    });

    expect(getSpotlightTourTestState().props?.steps).toHaveLength(3);
  });

  it('prefers the clinical area tour for manual guide starts when the clinical tab is active', async () => {
    const screen = render(
      <ProfessionalTourProvider currentRouteName="ClientProfile">
        <ClientProfileManualGuideHarness preferClinical />
      </ProfessionalTourProvider>,
    );

    fireEvent.press(screen.getByText('start current route tour'));

    await waitFor(() => {
      expect(getSpotlightTourTestState().controls.start).toHaveBeenCalledTimes(1);
    });

    expect(getSpotlightTourTestState().props?.steps).toHaveLength(9);
  });

  it('persists skipped and completed stops as seen', async () => {
    const onPrepare = jest.fn();
    const { getByText, rerender } = render(
      <ProfessionalTourProvider currentRouteName="ProfessionalHome">
        <ManualTourHarness onPrepare={onPrepare} />
      </ProfessionalTourProvider>,
    );

    await waitFor(() => {
      expect(getByText('ready')).toBeTruthy();
    });
    fireEvent.press(getByText('start tour'));

    await waitFor(() => {
      expect(getSpotlightTourTestState().controls.start).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      getSpotlightTourTestState().props?.onStop?.({ index: 1, isLast: false });
    });

    await waitFor(() => {
      expect(mockedMarkProfessionalTourSeen).toHaveBeenCalledWith(
        'professional-1',
        expect.objectContaining({ id: 'professional_home_v1' }),
        'skipped',
      );
    });

    rerender(
      <ProfessionalTourProvider currentRouteName="ProfessionalHome">
        <ManualTourHarness onPrepare={onPrepare} />
      </ProfessionalTourProvider>,
    );
    await waitFor(() => {
      expect(getByText('ready')).toBeTruthy();
    });
    fireEvent.press(getByText('start tour'));

    await waitFor(() => {
      expect(getSpotlightTourTestState().controls.start).toHaveBeenCalledTimes(2);
    });

    await act(async () => {
      getSpotlightTourTestState().props?.onStop?.({ index: 4, isLast: true });
    });

    await waitFor(() => {
      expect(mockedMarkProfessionalTourSeen).toHaveBeenCalledWith(
        'professional-1',
        expect.objectContaining({ id: 'professional_home_v1' }),
        'completed',
      );
    });
  });

  it('blurs the active web element safely', () => {
    const blur = jest.fn();
    const previousDocument = (globalThis as typeof globalThis & { document?: unknown }).document;

    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: { activeElement: { blur } },
    });

    blurWebActiveElementForTour('web');

    expect(blur).toHaveBeenCalledTimes(1);

    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: previousDocument,
    });
  });
});
