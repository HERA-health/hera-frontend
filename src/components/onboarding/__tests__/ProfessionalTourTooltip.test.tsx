import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import * as ReactNative from 'react-native';
import { lightTheme, darkTheme } from '../../../constants/theme';
import { useTheme } from '../../../contexts/ThemeContext';
import { ProfessionalTourTooltip } from '../ProfessionalTourTooltip';
import * as analyticsService from '../../../services/analyticsService';

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: jest.fn(),
}));

jest.mock('../../../services/analyticsService', () => ({
  track: jest.fn(),
}));

const mockedUseTheme = jest.mocked(useTheme);
const mockedAnalytics = jest.mocked(analyticsService);

const baseProps = {
  current: 0,
  goTo: jest.fn(),
  isFirst: true,
  isLast: false,
  next: jest.fn(),
  onNext: jest.fn(),
  onSkip: jest.fn(),
  pause: jest.fn(),
  previous: jest.fn(),
  resume: jest.fn(),
  routeName: 'ProfessionalHome',
  step: {
    body: 'Aqui puedes revisar el mes o la semana.',
    id: 'calendar',
    targetId: 'professional.home.calendar' as const,
    title: 'Agenda de trabajo',
  },
  stop: jest.fn(),
  totalSteps: 3,
  tourId: 'professional_home_v1',
};

describe('ProfessionalTourTooltip', () => {
  let dimensionsSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    dimensionsSpy = jest.spyOn(ReactNative, 'useWindowDimensions').mockReturnValue({
      fontScale: 1,
      height: 900,
      scale: 1,
      width: 1440,
    });
    mockedUseTheme.mockReturnValue({
      theme: lightTheme,
      mode: 'light',
      isDark: false,
      setMode: jest.fn(),
    });
  });

  afterEach(() => {
    dimensionsSpy.mockRestore();
  });

  it('renders the HERA tooltip copy and tracks a safe step view', () => {
    const { getByText } = render(<ProfessionalTourTooltip {...baseProps} />);

    expect(getByText('Agenda de trabajo')).toBeTruthy();
    expect(getByText('1/3')).toBeTruthy();
    expect(mockedAnalytics.track).toHaveBeenCalledWith(
      'professional_tour_step_viewed',
      {
        route: 'ProfessionalHome',
        stepId: 'calendar',
        tourId: 'professional_home_v1',
      },
    );
  });

  it('calls navigation controls from tooltip actions', () => {
    const onNext = jest.fn();
    const onSkip = jest.fn();
    const { getByText } = render(
      <ProfessionalTourTooltip {...baseProps} onNext={onNext} onSkip={onSkip} />,
    );

    fireEvent.press(getByText('Siguiente'));
    fireEvent.press(getByText('Omitir'));

    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it('renders against dark theme tokens', () => {
    mockedUseTheme.mockReturnValue({
      theme: darkTheme,
      mode: 'dark',
      isDark: true,
      setMode: jest.fn(),
    });

    const { getByText } = render(
      <ProfessionalTourTooltip {...baseProps} isLast current={2} totalSteps={3} />,
    );

    expect(getByText('Terminar')).toBeTruthy();
    expect(getByText('3/3')).toBeTruthy();
  });

  it('keeps the card inside compact mobile width', () => {
    dimensionsSpy.mockReturnValue({
      fontScale: 1,
      height: 740,
      scale: 1,
      width: 360,
    });

    const { getByTestId } = render(
      <ProfessionalTourTooltip
        {...baseProps}
        step={{
          ...baseProps.step,
          body: 'Texto suficientemente largo para comprobar que la tarjeta usa scroll interno y no desborda en móvil.',
        }}
      />,
    );

    const style = StyleSheet.flatten(getByTestId('professional-tour-tooltip').props.style);

    expect(style.width).toBeLessThanOrEqual(336);
    expect(style.maxHeight).toBeLessThanOrEqual(420);
  });
});
