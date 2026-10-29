import React, { useState } from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Modal } from 'react-native';
import { ProfessionalTopBar } from '../ProfessionalTopBar';
import { ProfessionalWorkspaceProvider } from '../../../contexts/ProfessionalWorkspaceContext';
import { acceptLegalDocuments, dismissLegalNotice, type LegalNotice } from '../../../services/legalService';

const mockNavigate = jest.fn();
const mockRefreshAttention = jest.fn();
const mockRefreshProfile = jest.fn();
let mockWorkspace = {
  homeData: { pendingRequests: { total: 0 }, draftInvoices: 0, automation: null },
  homeStatus: 'ready', supportStatus: 'ready', unreadSupport: 0,
  refreshAttention: mockRefreshAttention,
  legalNotices: { items: [] as LegalNotice[], onDismissed: (_id: string) => {} },
};
const sentNotice: LegalNotice = {
  id: 'terms-update', documentKey: 'TERMS_OF_SERVICE', version: '2026-10-29',
  title: 'Términos y condiciones de HERA', summary: 'Un procedimiento más sencillo para futuras actualizaciones.',
  kind: 'EXPLICIT', requiresExplicitAcceptance: true,
  notifiedAt: '2026-11-01T12:00:00Z', appliesAt: '2026-11-17T12:00:00Z',
};

jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ navigate: mockNavigate }) }));
jest.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { type: 'professional', name: 'Profesional Prueba' }, logout: jest.fn() }) }));
jest.mock('../../../contexts/ThemeContext', () => ({ useTheme: () => ({ theme: require('../../../constants/theme').lightTheme, mode: 'light', setMode: jest.fn() }) }));
jest.mock('../../../contexts/ProfessionalWorkspaceContext', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const Context = React.createContext<typeof mockWorkspace | undefined>(undefined);
  return {
    useProfessionalWorkspace: () => React.useContext(Context) ?? mockWorkspace,
    ProfessionalWorkspaceProvider: ({ children, legalNotices }: { children: React.ReactNode; legalNotices: typeof mockWorkspace.legalNotices }) => (
      <Context.Provider value={{ ...mockWorkspace, legalNotices }}>{children}</Context.Provider>
    ),
  };
});
jest.mock('../../../contexts/ProfileCompletionContext', () => ({ useProfileCompletion: () => ({ snapshot: { role: 'PROFESSIONAL', items: [] }, status: 'ready', refresh: mockRefreshProfile }) }));
jest.mock('../../../services/legalService', () => ({ dismissLegalNotice: jest.fn(), acceptLegalDocuments: jest.fn() }));
jest.mock('../../../services/professionalWorkspaceAnalytics', () => ({ trackProfessionalWorkspaceEvent: jest.fn() }));
jest.mock('../../onboarding/professionalTourContext', () => ({ useOptionalProfessionalTour: () => null }));
jest.mock('../../onboarding/TourTarget', () => ({ TourTarget: ({ children }: { children: React.ReactNode }) => children }));
jest.mock('../ProfessionalQuickSearch', () => ({ ProfessionalQuickSearch: () => null }));

beforeEach(() => {
  jest.clearAllMocks();
  mockWorkspace = {
    ...mockWorkspace,
    legalNotices: { items: [], onDismissed: jest.fn() },
    homeData: { ...mockWorkspace.homeData, pendingRequests: { total: 0 } },
    unreadSupport: 0,
  };
});

test('shows sent legal notices only inside the bell and combines their count with existing pending items', () => {
  mockWorkspace.legalNotices.items = [sentNotice];
  mockWorkspace.homeData.pendingRequests.total = 2;
  mockWorkspace.unreadSupport = 1;
  const view = render(<ProfessionalTopBar currentRoute="ProfessionalHome" onOpenMobileSidebar={jest.fn()} />);
  expect(view.queryByText(sentNotice.summary)).toBeNull();
  expect(view.UNSAFE_queryAllByType(Modal)).toHaveLength(0);
  expect(view.getByText('4')).toBeTruthy();
  fireEvent.press(view.getByLabelText('Centro de atención'));
  expect(view.getByText('4 elementos pendientes')).toBeTruthy();
  expect(view.getByText(sentNotice.summary)).toBeTruthy();
  expect(view.getByText('2 solicitudes de cita')).toBeTruthy();
  expect(view.getByText('1 respuesta nueva de soporte')).toBeTruthy();
});

test('keeps pending emails and editorial changes out of the bell', () => {
  mockWorkspace.legalNotices.items = [{ ...sentNotice, notifiedAt: null }, { ...sentNotice, id: 'editorial', kind: 'EDITORIAL' }];
  const view = render(<ProfessionalTopBar currentRoute="ProfessionalHome" onOpenMobileSidebar={jest.fn()} />);
  fireEvent.press(view.getByLabelText('Centro de atención'));
  expect(view.queryByText(sentNotice.summary)).toBeNull();
  expect(view.queryByText('Cerrar aviso')).toBeNull();
  expect(view.getAllByText('Todo al día')).toHaveLength(2);
});

test('opens the announced document and closes the popover without accepting', () => {
  mockWorkspace.legalNotices.items = [sentNotice];
  const view = render(<ProfessionalTopBar currentRoute="LegalDocument" onOpenMobileSidebar={jest.fn()} />);
  fireEvent.press(view.getByLabelText('Centro de atención'));
  fireEvent.press(view.getByText('Leer documento'));
  expect(mockNavigate).toHaveBeenCalledWith('LegalDocument', { documentKey: sentNotice.documentKey, version: sentNotice.version });
  expect(view.queryByText('Leer documento')).toBeNull();
  expect(acceptLegalDocuments).not.toHaveBeenCalled();
});

test('removes a successfully dismissed notice from the menu and counter without accepting', async () => {
  jest.mocked(dismissLegalNotice).mockResolvedValue();
  function WorkspaceBar() {
    const [items, setItems] = useState([sentNotice]);
    return <ProfessionalWorkspaceProvider currentRoute="ProfessionalHome" legalNotices={{
      items, onDismissed: id => setItems(current => current.filter(notice => notice.id !== id)),
    }}><ProfessionalTopBar currentRoute="ProfessionalHome" onOpenMobileSidebar={jest.fn()} /></ProfessionalWorkspaceProvider>;
  }
  const view = render(<WorkspaceBar />);
  fireEvent.press(view.getByLabelText('Centro de atención'));
  fireEvent.press(view.getByText('Cerrar aviso'));
  await waitFor(() => expect(dismissLegalNotice).toHaveBeenCalledWith(sentNotice.id));
  expect(view.queryByRole('alert')).toBeNull();
  await waitFor(() => expect(view.queryByText(sentNotice.summary)).toBeNull());
  expect(view.queryByText('1')).toBeNull();
  expect(view.getAllByText('Todo al día')).toHaveLength(2);
  expect(dismissLegalNotice).toHaveBeenCalledWith(sentNotice.id);
  expect(acceptLegalDocuments).not.toHaveBeenCalled();
});
