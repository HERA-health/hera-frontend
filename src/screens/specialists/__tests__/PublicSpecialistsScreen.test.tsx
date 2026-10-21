jest.mock('../../../hooks/useDiscoveryRevalidation', () => ({ useDiscoveryRevalidation: jest.fn() }));
jest.mock('../../../hooks/useProfileOptions', () => ({ useProfileOptions: () => ({ options: { languages: [{ value: 'arabic', label: 'Árabe', aliases: ['arabe'] }], religions: [], religionEnabled: false }, error: false, retry: jest.fn() }) }));
import React from 'react';
import { useDiscoveryRevalidation } from '../../../hooks/useDiscoveryRevalidation';
import * as ReactNative from 'react-native';
jest.mock('../../../config/api', () => ({ __esModule: true, default: () => ({ apiUrl: 'https://fixture.invalid/api' }) }));
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../../../contexts/ThemeContext';
import { useAuth } from '../../../contexts/AuthContext';
import { lightTheme } from '../../../constants/theme';
import { PublicSpecialistsScreen } from '../PublicSpecialistsScreen';
import * as specialistsService from '../../../services/specialistsService';

jest.mock('../../../services/heraCommissionService', () => ({ directoryIntent: jest.fn().mockResolvedValue({ token: 'verified-directory-intent' }) }));

// Reanimated's native Jest host does not measure. Keep the real press/link behavior.
jest.mock('../../../components/common/AnimatedPressable', () => {
  const ReactModule = jest.requireActual<typeof React>('react');
  const actual = jest.requireActual<typeof import('../../../components/common/AnimatedPressable')>('../../../components/common/AnimatedPressable');
  return {
    ...actual,
    AnimatedPressable: ({ focusRef, ...props }: Omit<React.ComponentProps<typeof actual.AnimatedPressable>, 'focusRef'> & { focusRef?: React.Ref<unknown> }) => {
      ReactModule.useImperativeHandle(focusRef, () => ({
        measureInWindow: (callback: (x: number, y: number, width: number, height: number) => void) => callback(32, 220, 224, 44),
        focus: jest.fn(),
      }));
      return <actual.AnimatedPressable {...props} />;
    },
  };
});

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
  useRoute: jest.fn(),
  useFocusEffect: (effect: () => void | (() => void)) => {
    const ReactModule = require('react');
    ReactModule.useEffect(effect, [effect]);
  },
}));

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: jest.fn(),
}));

jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../../services/specialistsService', () => ({
  getPublicSpecialistDirectory: jest.fn(),
}));

jest.mock('../../landing/components/LandingHeader', () => ({
  LandingHeader: ({
    onLogoPress,
    onExploreProfessionals,
    onAccess,
    onScrollToSection,
  }: {
    onLogoPress: () => void;
    onExploreProfessionals?: () => void;
    onAccess: () => void;
    onScrollToSection?: (section: 'featuredSpecialists' | 'about') => void;
  }) => {
    const { Pressable, Text, View } = require('react-native');
    return (
      <View>
        <Pressable onPress={onLogoPress} accessibilityRole="link" accessibilityLabel="Ir al inicio">
          <Text>Hera</Text>
        </Pressable>
        {onScrollToSection ? <><Pressable onPress={() => onScrollToSection('featuredSpecialists')}>
          <Text>Especialistas</Text>
        </Pressable>
        <Pressable onPress={() => onScrollToSection('about')}>
          <Text>Quiénes somos</Text>
        </Pressable></> : null}
        {onExploreProfessionals ? <Pressable onPress={onExploreProfessionals}>
          <Text>Para profesionales</Text>
        </Pressable> : null}
        <Pressable onPress={onAccess}>
          <Text>Acceder</Text>
        </Pressable>
      </View>
    );
  },
}));

const mockedUseNavigation = jest.mocked(useNavigation);
const mockedUseRoute = jest.mocked(useRoute);
const mockedUseTheme = jest.mocked(useTheme);
const mockedDirectory = jest.mocked(specialistsService.getPublicSpecialistDirectory);

const specialist = {
  id: 'specialist-1',
  publicSlug: 'elena-martin',
  name: 'Dra. Elena Martín',
  avatar: 'https://res.cloudinary.com/hera/image/upload/c_fill,g_face,w_500,h_500,q_auto,f_auto/v1/specialist-1.jpg',
  specialization: 'Ansiedad y estrés',
  professionalType: 'PSYCHOLOGIST_HEALTH' as const,
  professionalTypeLabel: 'Psicóloga sanitaria',
  pricePerSession: 72,
  offersOnline: true,
  offersInPerson: false,
  yearsInPractice: 8,
  gradientId: 'salvia-lavanda',
  collegiateNumber: 'M-12345',
  rating: 4.8,
  reviewCount: 17,
  specialties: ['anxiety', 'self-esteem', 'depression', 'trauma', 'sleep'],
  officeCity: null,
  descriptionExcerpt: 'Te acompaño a comprender lo que sientes.',
};

const createDeferred = <T,>() => {
  let resolve: ((value: T) => void) | undefined;
  let reject: ((reason?: unknown) => void) | undefined;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return {
    promise,
    resolve: (value: T) => resolve?.(value),
    reject: (reason?: unknown) => reject?.(reason),
  };
};

describe('PublicSpecialistsScreen', () => {
  const navigate = jest.fn();
  const reset = jest.fn();
  const getState = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    act(() => ReactNative.Dimensions.set({ window: { width: 1536, height: 864, scale: 1, fontScale: 1 } }));
    mockedUseTheme.mockReturnValue({
      theme: lightTheme,
      mode: 'light',
      isDark: false,
      setMode: jest.fn(),
    } as unknown as ReturnType<typeof useTheme>);
    jest.mocked(useAuth).mockReturnValue({ isAuthenticated: false, user: null } as ReturnType<typeof useAuth>);
    getState.mockReturnValue({ routeNames: ['Landing', 'Welcome', 'PublicSpecialists', 'Pricing'] });
    mockedUseNavigation.mockReturnValue({
      navigate,
      reset,
      getState,
    } as ReturnType<typeof useNavigation>);
    mockedUseRoute.mockReturnValue({ params: undefined } as ReturnType<typeof useRoute>);
  });

  it.each([
    ['client', 'Home', true, true],
    ['professional', 'ProfessionalHome', true, true],
    ['professional', 'ProfessionalVerification', true, false],
    ['clinic', 'ClinicDashboard', true, true],
    ['client', 'RequiredLegalAcceptance', false, true],
  ] as const)('uses the mounted %s route %s for access and the logo', async (type, target, staleAcceptance, verificationSubmitted) => {
    jest.mocked(useAuth).mockReturnValue({
      isAuthenticated: true, user: { type }, verificationSubmitted,
      legalStatusSnapshot: { requiresAcceptance: staleAcceptance },
    } as ReturnType<typeof useAuth>);
    getState.mockReturnValue({ routeNames: [target, 'PublicSpecialists', 'Pricing'] });
    mockedDirectory.mockResolvedValue({ items: [], page: 1, pageSize: 12, total: 0, hasMore: false });
    render(<PublicSpecialistsScreen />);
    await waitFor(() => expect(mockedDirectory).toHaveBeenCalled());
    fireEvent.press(screen.getByLabelText('Ir al inicio'));
    fireEvent.press(screen.getByText('Acceder'));
    expect(navigate).toHaveBeenCalledTimes(2);
    expect(navigate).toHaveBeenNthCalledWith(1, target);
    expect(navigate).toHaveBeenNthCalledWith(2, target);
    expect(reset).not.toHaveBeenCalled();
    expect(screen.queryByText('Para profesionales')).toBeNull();
    expect(screen.queryByText('Quiénes somos')).toBeNull();
  });

  it('loads a public page and opens the public profile without authentication', async () => {
    mockedDirectory.mockResolvedValue({
      items: [specialist],
      page: 1,
      pageSize: 12,
      total: 1,
      hasMore: false,
    });

    render(<PublicSpecialistsScreen />);

    await waitFor(() => expect(screen.getByText('Dra. Elena Martín')).toBeTruthy());
    expect(screen.getByLabelText('Retrato de Dra. Elena Martín').props.resizeMode).toBe('cover');
    expect(screen.getByText('Col. M-12345')).toBeTruthy();
    expect(screen.getByText('4,8 · 17 reseñas')).toBeTruthy();
    expect(screen.getByText('Ansiedad')).toBeTruthy();
    expect(screen.getByText('Autoestima y desarrollo personal')).toBeTruthy();
    expect(screen.getByText('Depresión y estado de ánimo')).toBeTruthy();
    expect(screen.getByText('+2')).toBeTruthy();
    expect(screen.queryByText('1–1 de 1 especialista')).toBeNull();
    expect(screen.getByText(specialist.descriptionExcerpt)).toBeTruthy();
    fireEvent.press(screen.getByText('Dra. Elena Martín'));

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('PublicSpecialistProfile', { profileRef: 'elena-martin', intentToken: 'verified-directory-intent' }));
  });

  it('uses the landing header and routes its specialist link back to the landing section', async () => {
    mockedDirectory.mockResolvedValue({
      items: [specialist],
      page: 1,
      pageSize: 12,
      total: 1,
      hasMore: false,
    });

    render(<PublicSpecialistsScreen />);

    await waitFor(() => expect(screen.getByText('Dra. Elena Martín')).toBeTruthy());
    fireEvent.press(screen.getByText('Especialistas'));

    expect(navigate).toHaveBeenCalledWith('Landing', { section: 'featuredSpecialists' });
  });

  it('routes every directory anchor back to the landing and hides redundant search access', async () => {
    mockedDirectory.mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 12,
      total: 0,
      hasMore: false,
    });

    render(<PublicSpecialistsScreen />);

    await waitFor(() => expect(mockedDirectory).toHaveBeenCalled());
    expect(screen.queryByText('Busco terapia')).toBeNull();
    fireEvent.press(screen.getByText('Quiénes somos'));
    fireEvent.press(screen.getByText('Para profesionales'));

    expect(navigate).toHaveBeenCalledWith('Landing', { section: 'about' });
    expect(navigate).toHaveBeenCalledWith('Landing', { section: 'forSpecialists' });
  });

  it('applies a canonical navigation specialty to the public directory request', async () => {
    mockedUseRoute.mockReturnValue({
      params: { specialty: 'anxiety' },
    } as ReturnType<typeof useRoute>);
    mockedDirectory.mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 12,
      total: 0,
      hasMore: false,
    });

    render(<PublicSpecialistsScreen />);

    await waitFor(() => expect(mockedDirectory).toHaveBeenLastCalledWith(
      expect.objectContaining({ specialties: ['anxiety'], page: 1 })
    ));
  });

  it('ignores an unknown navigation specialty safely', async () => {
    mockedUseRoute.mockReturnValue({
      params: { specialty: 'unknown-specialty' },
    } as unknown as ReturnType<typeof useRoute>);
    mockedDirectory.mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 12,
      total: 0,
      hasMore: false,
    });

    render(<PublicSpecialistsScreen />);

    await waitFor(() => expect(mockedDirectory).toHaveBeenLastCalledWith(
      expect.objectContaining({ specialties: undefined, page: 1 })
    ));
  });

  it('returns to the landing home when the header logo is pressed', async () => {
    mockedDirectory.mockResolvedValue({
      items: [specialist],
      page: 1,
      pageSize: 12,
      total: 1,
      hasMore: false,
    });

    render(<PublicSpecialistsScreen />);

    await waitFor(() => expect(screen.getByText('Dra. Elena Martín')).toBeTruthy());
    fireEvent.press(screen.getByRole('link', { name: 'Ir al inicio' }));

    expect(reset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: 'Landing' }],
    });
  });

  it('applies a submitted text search to the next public directory request', async () => {
    mockedDirectory.mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 12,
      total: 0,
      hasMore: false,
    });

    render(<PublicSpecialistsScreen />);

    await waitFor(() => expect(mockedDirectory).toHaveBeenCalledTimes(1));
    fireEvent.changeText(screen.getByPlaceholderText('Nombre, profesión o especialidad'), 'ansiedad');
    fireEvent.press(screen.getByText('Buscar'));

    await waitFor(() => expect(mockedDirectory).toHaveBeenCalledWith(expect.objectContaining({ q: 'ansiedad', page: 1 })));
  });

  it('applies useful public filters and can clear them together', async () => {
    mockedDirectory.mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 12,
      total: 0,
      hasMore: false,
    });

    render(<PublicSpecialistsScreen />);

    await waitFor(() => expect(mockedDirectory).toHaveBeenCalledTimes(1));

    fireEvent.press(screen.getByText('Tema'));
    fireEvent.press(screen.getByText('Ansiedad'));
    fireEvent.press(screen.getByText('Depresión y estado de ánimo'));
    expect(mockedDirectory).toHaveBeenCalledTimes(1);
    fireEvent.press(screen.getByText('Aplicar'));
    await waitFor(() => expect(mockedDirectory).toHaveBeenLastCalledWith(
      expect.objectContaining({ specialties: ['anxiety', 'depression'], page: 1 })
    ));

    fireEvent.press(screen.getByText('Valoración'));
    fireEvent.press(screen.getByText('4,5 o más'));
    await waitFor(() => expect(mockedDirectory).toHaveBeenLastCalledWith(
      expect.objectContaining({ specialties: ['anxiety', 'depression'], minRating: 4.5, page: 1 })
    ));

    fireEvent.press(screen.getByText('Limpiar'));
    await waitFor(() => expect(mockedDirectory).toHaveBeenLastCalledWith(
      expect.objectContaining({ specialties: undefined, minRating: undefined, sort: 'RECENT', page: 1 })
    ));
  });

  it.each([
    ['Psiquiatra', 'PSYCHIATRIST'],
    ['Profesional de salud mental', 'MENTAL_HEALTH_PROFESSIONAL'],
  ])('allows selecting and clearing the %s profile filter', async (label, professionalType) => {
    mockedDirectory.mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 12,
      total: 0,
      hasMore: false,
    });

    render(<PublicSpecialistsScreen />);
    await waitFor(() => expect(mockedDirectory).toHaveBeenCalledTimes(1));

    fireEvent.press(screen.getByText('Perfil'));
    fireEvent.press(screen.getByRole('checkbox', { name: label }));
    await waitFor(() => expect(mockedDirectory).toHaveBeenLastCalledWith(
      expect.objectContaining({ professionalType })
    ));

    fireEvent.press(screen.getByRole('button', { name: 'Perfil' }));
    fireEvent.press(screen.getByRole('checkbox', { name: label }));
    await waitFor(() => expect(mockedDirectory).toHaveBeenLastCalledWith(
      expect.objectContaining({ professionalType: undefined })
    ));
  });

  it('ignores stale responses when a newer search finishes first', async () => {
    const firstRequest = createDeferred<specialistsService.PublicSpecialistDirectoryPage>();
    const secondRequest = createDeferred<specialistsService.PublicSpecialistDirectoryPage>();
    const newerSpecialist = {
      ...specialist,
      id: 'specialist-2',
      name: 'Dra. Lucía Nueva',
    };
    mockedDirectory
      .mockReturnValueOnce(firstRequest.promise)
      .mockReturnValueOnce(secondRequest.promise);

    render(<PublicSpecialistsScreen />);
    await waitFor(() => expect(mockedDirectory).toHaveBeenCalledTimes(1));

    fireEvent.changeText(screen.getByPlaceholderText('Nombre, profesión o especialidad'), 'lucía');
    fireEvent.press(screen.getByText('Buscar'));
    await waitFor(() => expect(mockedDirectory).toHaveBeenCalledTimes(2));

    await act(async () => {
      secondRequest.resolve({
        items: [newerSpecialist],
        page: 1,
        pageSize: 12,
        total: 1,
        hasMore: false,
      });
      await secondRequest.promise;
    });
    expect(screen.getByText('Dra. Lucía Nueva')).toBeTruthy();

    await act(async () => {
      firstRequest.resolve({
        items: [specialist],
        page: 1,
        pageSize: 12,
        total: 1,
        hasMore: false,
      });
      await firstRequest.promise;
    });

    expect(screen.getByText('Dra. Lucía Nueva')).toBeTruthy();
    expect(screen.queryByText('Dra. Elena Martín')).toBeNull();
  });
  it('opens mobile filters in a sheet and preserves criteria after viewing results or closing it', async () => {
    const previousWindow = ReactNative.Dimensions.get('window');
    act(() => ReactNative.Dimensions.set({ window: { width: 390, height: 844, scale: 1, fontScale: 1 } }));
    mockedDirectory.mockResolvedValue({ items: [specialist], page: 1, pageSize: 12, total: 1, hasMore: false });
    try {
      render(<PublicSpecialistsScreen />);
      await waitFor(() => expect(screen.getByText('Dra. Elena Martín')).toBeTruthy());
      expect(screen.queryByText('Idioma de las sesiones')).toBeNull();
      expect(screen.getByRole('button', { name: 'Filtros' }).props.accessibilityState.expanded).toBe(false);
      fireEvent.press(screen.getByRole('button', { name: 'Filtros' }));
      fireEvent.press(screen.getByText('Cualquiera ▾'));
      fireEvent.press(screen.getByRole('radio', { name: 'Árabe' }));
      await waitFor(() => expect(mockedDirectory).toHaveBeenLastCalledWith(expect.objectContaining({ language: 'arabic' })));
      fireEvent.press(screen.getByText('Ver especialistas'));
      expect(screen.queryByText('Idioma de las sesiones')).toBeNull();
      expect(screen.getByRole('button', { name: 'Filtros, 1 activos' }).props.accessibilityState.expanded).toBe(false);
      fireEvent.press(screen.getByRole('button', { name: 'Filtros, 1 activos' }));
      expect(screen.getByText('Árabe ▾')).toBeTruthy();
      fireEvent.press(screen.getByRole('button', { name: 'Cerrar filtros' }));
      fireEvent.press(screen.getByText('Limpiar filtros'));
      await waitFor(() => expect(mockedDirectory).toHaveBeenLastCalledWith(expect.objectContaining({ language: undefined })));
      expect(screen.getByRole('button', { name: 'Filtros' })).toBeTruthy();
    } finally { act(() => ReactNative.Dimensions.set({ window: previousWindow })); }
  });

  it('replaces pages and revalidates only the visible page, preserving it after a recoverable failure', async () => {
    const second = { ...specialist, id: 'specialist-2', name: 'Dra. Segunda' };
    mockedDirectory.mockImplementation(async filters => ({
      items: filters?.page === 2 ? [second] : [specialist],
      page: filters?.page ?? 1, pageSize: 12, total: 13, hasMore: filters?.page !== 2,
    }));
    render(<PublicSpecialistsScreen />);
    await screen.findByText('Dra. Elena Martín');
    fireEvent.press(screen.getByText('Siguiente'));
    await screen.findByText('Dra. Segunda');
    const request = createDeferred<specialistsService.PublicSpecialistDirectoryPage>();
    mockedDirectory.mockReturnValueOnce(request.promise);
    const reload = jest.mocked(useDiscoveryRevalidation).mock.calls.at(-1)![0];
    let pending: void | Promise<unknown>;
    act(() => { pending = reload(); });
    expect(screen.queryByText('Dra. Elena Martín')).toBeNull();
    expect(screen.getByText('Dra. Segunda')).toBeTruthy();
    await act(async () => { request.reject(new Error('Error de conexión')); await pending; });
    expect(screen.getByText('Dra. Segunda')).toBeTruthy();
    expect(screen.getByText(/Puedes seguir consultando los últimos resultados/)).toBeTruthy();
    fireEvent.press(screen.getByText('Reintentar'));
    await waitFor(() => expect(screen.queryByText(/Puedes seguir consultando los últimos resultados/)).toBeNull());
    expect(screen.getByText('Dra. Segunda')).toBeTruthy();
    expect(mockedDirectory).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }));
  });

  it('keeps the committed page after a failed page change, and retries the requested page', async () => {
    const second = { ...specialist, id: 'second', name: 'Segunda profesional' };
    mockedDirectory.mockResolvedValueOnce({ items: [specialist], page: 1, pageSize: 12, total: 13, hasMore: true })
      .mockRejectedValueOnce(new Error('Sin conexión'))
      .mockResolvedValueOnce({ items: [second], page: 2, pageSize: 12, total: 13, hasMore: false });
    render(<PublicSpecialistsScreen />);
    await screen.findByText(specialist.name);
    fireEvent.press(screen.getByText('Siguiente'));
    await screen.findByText(/Sin conexión/);
    expect(screen.getByText(specialist.name)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Página 1' }).props.accessibilityState.selected).toBe(true);
    fireEvent.press(screen.getByText('Reintentar'));
    await screen.findByText(second.name);
    expect(screen.queryByText(specialist.name)).toBeNull();
    expect(screen.getByRole('button', { name: 'Página 2' }).props.accessibilityState.selected).toBe(true);
    expect(mockedDirectory).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }));
    expect(screen.getByRole('button', { name: 'Siguiente' }).props.accessibilityState.disabled).toBe(true);
  });

  it('resets pagination on search, individual filter removal and sorting', async () => {
    mockedDirectory.mockImplementation(async filters => ({
      items: [specialist], page: filters?.page ?? 1, pageSize: 12, total: 25, hasMore: true,
    }));
    render(<PublicSpecialistsScreen />);
    await screen.findByText(specialist.name);
    fireEvent.press(screen.getByText('Siguiente'));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Página 2' }).props.accessibilityState.selected).toBe(true));
    fireEvent.changeText(screen.getByPlaceholderText('Nombre, profesión o especialidad'), 'Elena');
    fireEvent(screen.getByPlaceholderText('Nombre, profesión o especialidad'), 'submitEditing');
    await waitFor(() => expect(mockedDirectory).toHaveBeenLastCalledWith(expect.objectContaining({ q: 'Elena', page: 1 })));
    fireEvent.press(screen.getByRole('button', { name: 'Quitar filtro: «Elena»' }));
    await waitFor(() => expect(mockedDirectory).toHaveBeenLastCalledWith(expect.objectContaining({ q: undefined, page: 1 })));
    fireEvent.press(screen.getByText('Siguiente'));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Página 2' }).props.accessibilityState.selected).toBe(true));
    fireEvent.press(screen.getByRole('button', { name: 'Ordenar especialistas' }));
    fireEvent.press(screen.getByText('Precio: menor primero'));
    await waitFor(() => expect(mockedDirectory).toHaveBeenLastCalledWith(expect.objectContaining({ sort: 'PRICE_ASC', page: 1 })));
  });

  it('returns to the last valid page when publication changes remove the current page', async () => {
    mockedDirectory.mockResolvedValueOnce({ items: [specialist], page: 1, pageSize: 12, total: 25, hasMore: true })
      .mockResolvedValueOnce({ items: [], page: 3, pageSize: 12, total: 13, hasMore: false })
      .mockResolvedValueOnce({ items: [specialist], page: 2, pageSize: 12, total: 13, hasMore: false });
    render(<PublicSpecialistsScreen />);
    await screen.findByText(specialist.name);
    fireEvent.press(screen.getByRole('button', { name: 'Página 3' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Página 2' }).props.accessibilityState.selected).toBe(true));
    expect(mockedDirectory).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }));
  });

  it('adapts columns without reloading or changing the current page', async () => {
    mockedDirectory.mockImplementation(async filters => ({
      items: [specialist], page: filters?.page ?? 1, pageSize: 12, total: 13, hasMore: filters?.page !== 2,
    }));
    render(<PublicSpecialistsScreen />);
    await screen.findByText(specialist.name);
    fireEvent.press(screen.getByText('Siguiente'));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Página 2' }).props.accessibilityState.selected).toBe(true));
    act(() => ReactNative.Dimensions.set({ window: { width: 820, height: 900, scale: 1, fontScale: 1 } }));
    expect(mockedDirectory).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('button', { name: 'Página 2' }).props.accessibilityState.selected).toBe(true);
    expect(screen.getByRole('button', { name: 'Filtros' })).toBeTruthy();
  });

  it('keeps specialists in order across explicit rows and preserves the empty final column', async () => {
    const items = [specialist, { ...specialist, id: 'second', name: 'Segunda profesional' }, { ...specialist, id: 'third', name: 'Tercera profesional' }];
    mockedDirectory.mockResolvedValue({ items, page: 1, pageSize: 12, total: 3, hasMore: false });
    render(<PublicSpecialistsScreen />);
    await screen.findByText(specialist.name);
    const resizeGrid = (width: number) => fireEvent(screen.getByTestId('directory-grid'), 'layout', {
      nativeEvent: { layout: { width, height: 800, x: 0, y: 0 } },
    });
    resizeGrid(1188);
    const rows = screen.getAllByTestId('directory-row');
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText(specialist.name)).toBeTruthy();
    expect(within(rows[0]).getByText('Segunda profesional')).toBeTruthy();
    expect(within(rows[1]).getByText('Tercera profesional')).toBeTruthy();
    expect(within(rows[1]).getByTestId('directory-empty-cell')).toBeTruthy();
    resizeGrid(350);
    expect(screen.getAllByTestId('directory-row')).toHaveLength(3);
    expect(screen.queryByTestId('directory-empty-cell')).toBeNull();
    expect(mockedDirectory).toHaveBeenCalledTimes(1);
  });

});
