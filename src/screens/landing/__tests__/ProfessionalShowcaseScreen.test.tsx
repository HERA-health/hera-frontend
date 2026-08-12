import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import { darkTheme, lightTheme } from '../../../constants/theme';
import { useTheme } from '../../../contexts/ThemeContext';
import { trackProfessionalShowcaseEvent } from '../../../services/professionalShowcaseAnalytics';
import { ProfessionalShowcaseScreen } from '../ProfessionalShowcaseScreen';
import { PROFESSIONAL_SHOWCASE_STEPS } from '../professionalShowcaseContent';

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: jest.fn(),
}));

jest.mock('../../../hooks/useWebPageMetadata', () => ({
  useWebPageMetadata: jest.fn(),
}));

jest.mock('../../../services/professionalShowcaseAnalytics', () => ({
  trackProfessionalShowcaseEvent: jest.fn(() => true),
}));

jest.mock('../components/LandingHeader', () => ({
  LandingHeader: ({ onAccess }: { onAccess: () => void }) => {
    const { Pressable, Text } = require('react-native');
    return (
      <Pressable accessibilityLabel="Crear cuenta desde cabecera" onPress={onAccess}>
        <Text>Cabecera del recorrido</Text>
      </Pressable>
    );
  },
}));

jest.mock('../../../components/common/MotionView', () => ({
  MotionView: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

const mockedUseNavigation = jest.mocked(useNavigation);
const mockedUseTheme = jest.mocked(useTheme);
const mockedTrack = jest.mocked(trackProfessionalShowcaseEvent);

describe('ProfessionalShowcaseScreen', () => {
  const navigate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseNavigation.mockReturnValue({ navigate } as ReturnType<typeof useNavigation>);
    mockedUseTheme.mockReturnValue({
      theme: lightTheme,
      mode: 'light',
      isDark: false,
      setMode: jest.fn(),
    } as unknown as ReturnType<typeof useTheme>);
  });

  it('starts with a clear overview of the professional home', () => {
    render(<ProfessionalShowcaseScreen />);

    expect(screen.getByText('Tu consulta, conectada de principio a fin.')).toBeTruthy();
    expect(screen.getByText('Empieza el día con una visión clara')).toBeTruthy();
    expect(screen.getByText('Próxima cita y accesos directos')).toBeTruthy();
    expect(mockedTrack).toHaveBeenCalledWith({
      event: 'professional_showcase_step_viewed',
      properties: { step: 'home', position: 1 },
    });
  });

  it('changes the narrative when a specialist selects another area', () => {
    render(<ProfessionalShowcaseScreen />);

    fireEvent.press(screen.getByLabelText(/Ver Agenda/));

    expect(screen.getByText('Una agenda pensada para trabajar')).toBeTruthy();
    expect(screen.getByText('Vistas diaria, semanal, mensual y lista')).toBeTruthy();
    expect(mockedTrack).toHaveBeenLastCalledWith({
      event: 'professional_showcase_step_viewed',
      properties: { step: 'agenda', position: 3 },
    });
  });

  it('uses the screenshot that matches the active theme', () => {
    const { rerender } = render(<ProfessionalShowcaseScreen />);
    const imageLabel = 'Vista del inicio del espacio profesional de HERA';

    expect(screen.getByLabelText(imageLabel).props.source).toBe(
      PROFESSIONAL_SHOWCASE_STEPS[0].images.light,
    );

    mockedUseTheme.mockReturnValue({
      theme: darkTheme,
      mode: 'dark',
      isDark: true,
      setMode: jest.fn(),
    } as unknown as ReturnType<typeof useTheme>);
    rerender(<ProfessionalShowcaseScreen />);

    expect(screen.getByLabelText(imageLabel).props.source).toBe(
      PROFESSIONAL_SHOWCASE_STEPS[0].images.dark,
    );
  });

  it('routes registration from the current showcase context', () => {
    render(<ProfessionalShowcaseScreen />);

    fireEvent.press(screen.getByLabelText('Crear cuenta profesional'));

    expect(navigate).toHaveBeenCalledWith('Register', { userType: 'PROFESSIONAL' });
    expect(mockedTrack).toHaveBeenCalledWith({
      event: 'professional_showcase_register_clicked',
      properties: { step: 'home', placement: 'stage' },
    });
  });

  it('returns to the professional section of the landing', () => {
    render(<ProfessionalShowcaseScreen />);

    fireEvent.press(screen.getByLabelText('Volver a HERA para profesionales'));

    expect(navigate).toHaveBeenCalledWith('Landing', { section: 'forSpecialists' });
  });
});
