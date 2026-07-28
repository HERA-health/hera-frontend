import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { lightTheme } from '../../../constants/theme';
import { useTheme } from '../../../contexts/ThemeContext';
import * as professionalService from '../../../services/professionalService';
import { PublicProfileSlugEditor } from '../PublicProfileSlugEditor';

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: jest.fn(),
}));

jest.mock('../../../services/professionalService', () => ({
  getPublicProfileSlugAvailability: jest.fn(),
  updatePublicProfileSlug: jest.fn(),
}));

jest.mock('../../common/alert', () => ({
  showAppAlert: jest.fn(),
  useAppAlert: () => ({}),
}));

const mockedUseTheme = jest.mocked(useTheme);
const mockedGetAvailability = jest.mocked(
  professionalService.getPublicProfileSlugAvailability
);
const mockedUpdateSlug = jest.mocked(professionalService.updatePublicProfileSlug);

describe('PublicProfileSlugEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockedUseTheme.mockReturnValue({
      theme: lightTheme,
      mode: 'light',
      isDark: false,
      setMode: jest.fn(),
    } as unknown as ReturnType<typeof useTheme>);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('normalizes, checks and saves a readable public URL', async () => {
    const onSaved = jest.fn();
    mockedGetAvailability.mockResolvedValue({
      slug: 'ruben-vallejo-jara',
      available: true,
      ownedByCurrentSpecialist: false,
      wouldUseChange: true,
      changeLimitReached: false,
      remainingChanges: 2,
    });
    mockedUpdateSlug.mockResolvedValue({
      publicSlug: 'ruben-vallejo-jara',
      publicProfilePath: '/especialista/ruben-vallejo-jara',
      remainingChanges: 1,
    });

    render(
      <PublicProfileSlugEditor
        initialSlug="elena-martin"
        onSaved={onSaved}
      />
    );

    const input = screen.getByLabelText('URL pública del perfil');
    fireEvent.changeText(input, 'Rubén Vallejo Jara');

    expect(input.props.value).toBe('ruben-vallejo-jara');

    await act(async () => {
      jest.advanceTimersByTime(350);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(mockedGetAvailability).toHaveBeenCalledWith('ruben-vallejo-jara');
      expect(
        screen.getByText('Esta dirección está disponible. Al guardarla te quedará 1 cambio.')
      ).toBeTruthy();
    });

    fireEvent.press(screen.getByText('Guardar URL'));

    await waitFor(() => {
      expect(mockedUpdateSlug).toHaveBeenCalledWith('ruben-vallejo-jara');
      expect(onSaved).toHaveBeenCalledWith('ruben-vallejo-jara', 1);
    });
  });

  it('uses the compact dialog presentation without repeating the modal heading', () => {
    render(
      <PublicProfileSlugEditor
        initialSlug="ruben-vallejo-jara"
        onSaved={jest.fn()}
        variant="dialog"
      />
    );

    expect(screen.getByLabelText('URL pública del perfil')).toBeTruthy();
    expect(screen.queryByText('URL del perfil público')).toBeNull();
    expect(screen.getByText('URL activa. Puedes crear 3 direcciones nuevas más.')).toBeTruthy();
  });

  it('disables saving when the three new-address changes are exhausted', async () => {
    mockedGetAvailability.mockResolvedValue({
      slug: 'cuarta-direccion',
      available: false,
      ownedByCurrentSpecialist: false,
      wouldUseChange: true,
      changeLimitReached: true,
      remainingChanges: 0,
    });

    render(
      <PublicProfileSlugEditor
        initialSlug="elena-martin"
        initialRemainingChanges={0}
        onSaved={jest.fn()}
      />
    );

    fireEvent.changeText(
      screen.getByLabelText('URL pública del perfil'),
      'cuarta-direccion'
    );

    await act(async () => {
      jest.advanceTimersByTime(350);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(
        screen.getByText(
          'Has alcanzado el límite de 3 cambios. Puedes volver a usar una de tus direcciones anteriores.'
        )
      ).toBeTruthy();
      expect(
        screen.getByRole('button', { name: 'Guardar URL' }).props.accessibilityState.disabled
      ).toBe(true);
    });
  });

  it('explains clearly when a public URL cannot be used', async () => {
    mockedGetAvailability.mockResolvedValue({
      slug: 'direccion-ocupada',
      available: false,
      ownedByCurrentSpecialist: false,
      wouldUseChange: true,
      changeLimitReached: false,
      remainingChanges: 2,
    });

    render(
      <PublicProfileSlugEditor
        initialSlug="elena-martin"
        onSaved={jest.fn()}
      />
    );

    fireEvent.changeText(
      screen.getByLabelText('URL pública del perfil'),
      'direccion-ocupada'
    );

    await act(async () => {
      jest.advanceTimersByTime(350);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(
        screen.getByText('Esta dirección no está disponible. Prueba con otra.')
      ).toBeTruthy();
    });
  });

  it('lets the specialist retry after an availability error', async () => {
    mockedGetAvailability
      .mockRejectedValueOnce(
        new Error(
          'No hemos podido comprobar la URL. Revisa tu conexión y pulsa Reintentar.'
        )
      )
      .mockResolvedValueOnce({
        slug: 'elena-martin-terapia',
        available: true,
        ownedByCurrentSpecialist: false,
        wouldUseChange: true,
        changeLimitReached: false,
        remainingChanges: 2,
      });

    render(
      <PublicProfileSlugEditor
        initialSlug="elena-martin"
        onSaved={jest.fn()}
      />
    );

    fireEvent.changeText(
      screen.getByLabelText('URL pública del perfil'),
      'elena-martin-terapia'
    );

    await act(async () => {
      jest.advanceTimersByTime(350);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(
        screen.getByText(
          'No hemos podido comprobar la URL. Revisa tu conexión y pulsa Reintentar.'
        )
      ).toBeTruthy();
    });

    fireEvent.press(screen.getByText('Reintentar'));

    await act(async () => {
      jest.advanceTimersByTime(350);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(mockedGetAvailability).toHaveBeenCalledTimes(2);
      expect(
        screen.getByText('Esta dirección está disponible. Al guardarla te quedará 1 cambio.')
      ).toBeTruthy();
    });
  });

  it('does not offer a useless retry for a non-retryable account error', async () => {
    mockedGetAvailability.mockRejectedValue(
      Object.assign(
        new Error(
          'No puedes cambiar la URL mientras tu cuenta esté desactivada. Si crees que es un error, contacta con soporte.'
        ),
        { retryable: false }
      )
    );

    render(
      <PublicProfileSlugEditor
        initialSlug="elena-martin"
        onSaved={jest.fn()}
      />
    );

    fireEvent.changeText(
      screen.getByLabelText('URL pública del perfil'),
      'elena-martin-terapia'
    );

    await act(async () => {
      jest.advanceTimersByTime(350);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(
        screen.getByText(
          'No puedes cambiar la URL mientras tu cuenta esté desactivada. Si crees que es un error, contacta con soporte.'
        )
      ).toBeTruthy();
      expect(screen.queryByText('Reintentar')).toBeNull();
      expect(
        screen.getByRole('button', { name: 'Guardar URL' }).props.accessibilityState.disabled
      ).toBe(true);
    });
  });

  it('retries saving directly after a recoverable save error', async () => {
    const onSaved = jest.fn();
    mockedGetAvailability.mockResolvedValue({
      slug: 'elena-martin-terapia',
      available: true,
      ownedByCurrentSpecialist: false,
      wouldUseChange: true,
      changeLimitReached: false,
      remainingChanges: 2,
    });
    mockedUpdateSlug
      .mockRejectedValueOnce(
        Object.assign(
          new Error(
            'No hemos podido guardar la URL. Revisa tu conexión y pulsa Volver a guardar.'
          ),
          { retryable: true }
        )
      )
      .mockResolvedValueOnce({
        publicSlug: 'elena-martin-terapia',
        publicProfilePath: '/especialista/elena-martin-terapia',
        remainingChanges: 1,
      });

    render(
      <PublicProfileSlugEditor
        initialSlug="elena-martin"
        onSaved={onSaved}
      />
    );

    fireEvent.changeText(
      screen.getByLabelText('URL pública del perfil'),
      'elena-martin-terapia'
    );

    await act(async () => {
      jest.advanceTimersByTime(350);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByText('Guardar URL')).toBeTruthy();
    });
    fireEvent.press(screen.getByText('Guardar URL'));

    await waitFor(() => {
      expect(screen.getByText('Volver a guardar')).toBeTruthy();
    });
    fireEvent.press(screen.getByText('Volver a guardar'));

    await waitFor(() => {
      expect(mockedUpdateSlug).toHaveBeenCalledTimes(2);
      expect(onSaved).toHaveBeenCalledWith('elena-martin-terapia', 1);
    });
  });
});
