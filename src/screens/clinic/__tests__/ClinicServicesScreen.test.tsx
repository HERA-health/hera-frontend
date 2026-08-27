import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Dimensions } from 'react-native';
import { darkTheme, lightTheme } from '../../../constants/theme';
import { useTheme } from '../../../contexts/ThemeContext';
import * as clinicService from '../../../services/clinicService';
import { ClinicServicesScreen } from '../ClinicServicesScreen';
import { useClinicWorkspace } from '../useClinicWorkspace';
import { useAppAlert } from '../../../components/common/alert';

jest.mock('../../../contexts/ThemeContext', () => ({ useTheme: jest.fn() }));
jest.mock('../useClinicWorkspace', () => ({ useClinicWorkspace: jest.fn() }));
jest.mock('../../../components/common/alert', () => ({ useAppAlert: jest.fn() }));
jest.mock('../../../config/api', () => ({
  __esModule: true,
  default: () => ({ apiUrl: 'http://localhost:3000/api' }),
  getWebAppUrl: () => 'http://localhost:8081',
}));
jest.mock('../../../services/clinicService', () => {
  const actual = jest.requireActual('../../../services/clinicService');
  return {
    ...actual,
    listClinicServices: jest.fn(),
    createClinicService: jest.fn(),
    updateClinicService: jest.fn(),
    updateClinicServiceStatus: jest.fn(),
    setDefaultClinicService: jest.fn(),
  };
});
jest.mock('../components/ClinicWorkspaceScaffold', () => ({
  ClinicWorkspaceScaffold: ({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) => {
    const ReactModule = require('react');
    const { View: NativeView } = require('react-native');
    return ReactModule.createElement(NativeView, null, action, children);
  },
}));

const mockedUseTheme = jest.mocked(useTheme);
const mockedUseWorkspace = jest.mocked(useClinicWorkspace);
const mockedUseAlert = jest.mocked(useAppAlert);
const mockedList = jest.mocked(clinicService.listClinicServices);
const mockedUpdate = jest.mocked(clinicService.updateClinicService);

const createDeferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
};

const specialistOptions: clinicService.ClinicServiceSpecialistOption[] = [{
  id: 'clinic-specialist-1',
  displayName: 'Dra. Ana Ruiz',
  status: 'ACTIVE',
}];

const serviceA: clinicService.ClinicServiceCatalogItem = {
  id: 'service-a',
  name: 'Servicio A',
  description: null,
  durationMinutes: 60,
  price: 65,
  currency: 'EUR',
  modalities: ['IN_PERSON'],
  status: 'ACTIVE',
  isDefault: true,
  clinicSpecialistIds: ['clinic-specialist-1'],
  activeSpecialistCount: 1,
  version: 1,
};

const serviceB: clinicService.ClinicServiceCatalogItem = {
  ...serviceA,
  id: 'service-b',
  name: 'Servicio B',
  isDefault: false,
};

const catalog = (
  services: clinicService.ClinicServiceCatalogItem[],
): clinicService.ClinicServiceCatalog => ({
  activatedAt: '2026-08-26T10:00:00.000Z',
  services,
  specialistOptions,
});

const membership = (clinicId: string, commercialName: string): clinicService.ClinicMembershipSummary => ({
  id: `membership-${clinicId}`,
  role: 'OWNER',
  status: 'ACTIVE',
  createdAt: '2026-08-26T10:00:00.000Z',
  updatedAt: '2026-08-26T10:00:00.000Z',
  clinic: {
    id: clinicId,
    commercialName,
    legalName: null,
    status: 'ACTIVE',
    createdAt: '2026-08-26T10:00:00.000Z',
    updatedAt: '2026-08-26T10:00:00.000Z',
  },
});

const membershipA = membership('clinic-a', 'Clínica A');
const membershipB = membership('clinic-b', 'Clínica B');
let workspace: ReturnType<typeof useClinicWorkspace>;

const renderScreen = () => render(
  <ClinicServicesScreen navigation={{ navigate: jest.fn() } as never} route={{} as never} />,
);

const setViewport = (width: number, height: number): void => {
  const viewport = { width, height, scale: 1, fontScale: 1 };
  Dimensions.set({ window: viewport, screen: viewport });
};

describe('ClinicServicesScreen interactions', () => {
  beforeEach(() => {
    setViewport(390, 844);
    mockedUseTheme.mockReturnValue({
      theme: lightTheme,
      mode: 'light',
      isDark: false,
      setMode: jest.fn(),
    });
    mockedUseAlert.mockReturnValue({
      show: jest.fn(async () => undefined),
      info: jest.fn(async () => undefined),
      success: jest.fn(async () => undefined),
      error: jest.fn(async () => undefined),
      warning: jest.fn(async () => undefined),
      confirm: jest.fn(async () => true),
      choose: jest.fn(async () => null),
    });
    workspace = {
      memberships: [membershipA, membershipB],
      selectedClinicId: 'clinic-a',
      selectedMembership: membershipA,
      loading: false,
      error: '',
      reload: jest.fn(async () => undefined),
      selectClinic: jest.fn(async () => undefined),
    };
    mockedUseWorkspace.mockImplementation(() => workspace);
    mockedList.mockResolvedValue(catalog([serviceA, serviceB]));
  });

  afterEach(() => jest.clearAllMocks());

  it('pins the edited service, locks context changes and admits only one submit', async () => {
    const deferred = createDeferred<clinicService.ClinicServiceCatalogItem>();
    mockedUpdate.mockReturnValue(deferred.promise);
    renderScreen();

    await screen.findByRole('button', { name: /Servicio A, 65,00.*60 minutos/ });
    fireEvent.press(screen.getByRole('button', { name: /Servicio A, 65,00.*60 minutos/ }));
    fireEvent.press(await screen.findByRole('button', { name: 'Editar' }));

    expect(screen.getByRole('tab', { name: 'Todos' }).props.accessibilityState.disabled).toBe(true);
    expect(screen.getByRole('button', { name: /Servicio B, 65,00.*60 minutos/ }).props.accessibilityState.disabled).toBe(true);
    fireEvent.changeText(screen.getByDisplayValue('Servicio A'), 'Servicio A revisado');
    const saveButton = screen.getByRole('button', { name: 'Guardar cambios' });
    fireEvent.press(saveButton);
    fireEvent.press(saveButton);

    expect(mockedUpdate).toHaveBeenCalledTimes(1);
    expect(mockedUpdate).toHaveBeenCalledWith('clinic-a', 'service-a', expect.objectContaining({
      name: 'Servicio A revisado',
      version: 1,
    }));

    await act(async () => {
      deferred.resolve({ ...serviceA, name: 'Servicio A revisado', version: 2 });
      await deferred.promise;
    });
  });

  it('discards the result and refresh of a mutation after the active clinic changes', async () => {
    const deferred = createDeferred<clinicService.ClinicServiceCatalogItem>();
    mockedUpdate.mockReturnValue(deferred.promise);
    mockedList.mockImplementation(async (clinicId) => (
      clinicId === 'clinic-b' ? catalog([{ ...serviceB, name: 'Servicio exclusivo B' }]) : catalog([serviceA])
    ));
    const view = renderScreen();

    fireEvent.press(await screen.findByRole('button', { name: /Servicio A, 65,00.*60 minutos/ }));
    fireEvent.press(await screen.findByRole('button', { name: 'Editar' }));
    fireEvent.changeText(screen.getByDisplayValue('Servicio A'), 'Cambio en A');
    fireEvent.press(screen.getByRole('button', { name: 'Guardar cambios' }));

    workspace = {
      ...workspace,
      selectedClinicId: 'clinic-b',
      selectedMembership: membershipB,
    };
    view.rerender(
      <ClinicServicesScreen navigation={{ navigate: jest.fn() } as never} route={{} as never} />,
    );
    expect(await screen.findByText('Servicio exclusivo B')).toBeTruthy();

    await act(async () => {
      deferred.resolve({ ...serviceA, name: 'Cambio en A', version: 2 });
      await deferred.promise;
    });
    await waitFor(() => expect(screen.queryByText('Cambio en A')).toBeNull());
    expect(mockedList.mock.calls.at(-1)?.[0]).toBe('clinic-b');
  });

  it('uses back in two stages and keeps archive choices scrollable without stacked sheets', async () => {
    const replacements = Array.from({ length: 24 }, (_, index) => ({
      ...serviceB,
      id: `replacement-${index}`,
      name: `Sustituto ${index + 1}`,
    }));
    mockedList.mockResolvedValue(catalog([serviceA, ...replacements]));
    renderScreen();

    fireEvent.press(await screen.findByRole('button', { name: /Servicio A, 65,00.*60 minutos/ }));
    fireEvent.press(await screen.findByRole('button', { name: 'Editar' }));
    act(() => screen.getByTestId('clinic-services-compact-modal').props.onRequestClose());
    expect(screen.queryByRole('button', { name: 'Guardar cambios' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Editar' })).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Archivar' }));
    expect(await screen.findByTestId('clinic-service-archive-replacements-scroll')).toBeTruthy();
    expect(screen.queryByTestId('clinic-services-compact-modal')).toBeNull();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Archivar' })).toBeTruthy();
  });

  it('keeps the editor inline on desktop and renders with dark theme tokens', async () => {
    setViewport(1280, 900);
    mockedUseTheme.mockReturnValue({
      theme: darkTheme,
      mode: 'dark',
      isDark: true,
      setMode: jest.fn(),
    });
    renderScreen();

    fireEvent.press(await screen.findByRole('button', { name: 'Editar' }));
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeTruthy();
    expect(screen.queryByTestId('clinic-services-compact-modal')).toBeNull();
  });
});
