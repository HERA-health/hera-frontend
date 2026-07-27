import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { lightTheme } from '../../../../constants/theme';
import { useTheme } from '../../../../contexts/ThemeContext';
import { BookingModalitySection } from '../BookingModalitySection';

jest.mock('../../../../contexts/ThemeContext', () => ({
  useTheme: jest.fn(),
}));

const mockedUseTheme = jest.mocked(useTheme);

describe('BookingModalitySection in-person location', () => {
  beforeEach(() => {
    mockedUseTheme.mockReturnValue({
      theme: lightTheme,
      mode: 'light',
      isDark: false,
      setMode: jest.fn(),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('shows the public consultation address when in-person is selected', () => {
    render(
      <BookingModalitySection
        selectedType="IN_PERSON"
        availableSessionTypes={['VIDEO_CALL', 'IN_PERSON']}
        duration={60}
        onSessionTypeChange={jest.fn()}
        officeLocation={{
          street: 'Calle de Alcalá, 42',
          city: 'Madrid',
          postalCode: '28014',
        }}
      />
    );

    expect(screen.getByText('UBICACIÓN DE LA CONSULTA')).toBeTruthy();
    expect(screen.getByText('Calle de Alcalá, 42')).toBeTruthy();
    expect(screen.getByText('28014 Madrid')).toBeTruthy();
  });

  it('does not show a physical address for a video appointment', () => {
    render(
      <BookingModalitySection
        selectedType="VIDEO_CALL"
        availableSessionTypes={['VIDEO_CALL', 'IN_PERSON']}
        duration={60}
        onSessionTypeChange={jest.fn()}
        officeLocation={{
          street: 'Calle de Alcalá, 42',
          city: 'Madrid',
          postalCode: '28014',
        }}
      />
    );

    expect(screen.queryByText('UBICACIÓN DE LA CONSULTA')).toBeNull();
  });

  it('uses an honest fallback when an in-person profile has no address', () => {
    render(
      <BookingModalitySection
        selectedType="IN_PERSON"
        availableSessionTypes={['IN_PERSON']}
        duration={60}
        onSessionTypeChange={jest.fn()}
      />
    );

    expect(
      screen.getByText(
        'La dirección no está publicada en el perfil. Confírmala con el profesional antes de reservar.',
      ),
    ).toBeTruthy();
  });

  it('announces radio state and blocks modality changes while disabled', () => {
    const onSessionTypeChange = jest.fn();

    render(
      <BookingModalitySection
        selectedType="VIDEO_CALL"
        availableSessionTypes={['VIDEO_CALL', 'IN_PERSON']}
        duration={60}
        onSessionTypeChange={onSessionTypeChange}
        disabled
      />,
    );

    const videoOption = screen.getByLabelText(
      'Videollamada. Sesión privada desde cualquier lugar',
    );
    const inPersonOption = screen.getByLabelText(
      'Presencial. Encuentro en la consulta del profesional',
    );

    expect(videoOption.props.accessibilityState).toEqual(
      expect.objectContaining({ checked: true, disabled: true }),
    );
    expect(inPersonOption.props.accessibilityState).toEqual(
      expect.objectContaining({ checked: false, disabled: true }),
    );

    fireEvent.press(inPersonOption);
    expect(onSessionTypeChange).not.toHaveBeenCalled();
  });
});
