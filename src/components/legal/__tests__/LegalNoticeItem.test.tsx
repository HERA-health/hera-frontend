import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { LegalNoticeItem } from '../LegalNoticeItem';
import { dismissLegalNotice, type LegalNotice } from '../../../services/legalService';
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ navigate: mockNavigate }) }));
jest.mock('../../../services/legalService', () => ({ dismissLegalNotice: jest.fn() }));
jest.mock('../../../contexts/ThemeContext', () => ({ useTheme: () => ({ theme: require('../../../constants/theme').lightTheme }) }));
const notice: LegalNotice = { id: 'own-notice', documentKey: 'PRIVACY_POLICY', version: 'next', title: 'Privacidad', summary: 'Información sobre proveedores', kind: 'PRIVACY_INFORMATION', requiresExplicitAcceptance: false, notifiedAt: '2026-11-01T12:00:00Z', appliesAt: '2026-11-17T12:00:00Z' };
beforeEach(() => jest.clearAllMocks());
test('opens the announced version and persists dismissal without accepting a document', async () => {
  jest.mocked(dismissLegalNotice).mockResolvedValue();
  const onDismissed = jest.fn();
  const onDocumentOpened = jest.fn();
  const view = render(<LegalNoticeItem notice={notice} onDismissed={onDismissed} onDocumentOpened={onDocumentOpened} />);
  expect(view.getByText('Esta actualización no requiere una nueva aceptación.')).toBeTruthy();
  fireEvent.press(view.getByText('Leer documento'));
  expect(mockNavigate).toHaveBeenCalledWith('LegalDocument', { documentKey: 'PRIVACY_POLICY', version: 'next' });
  expect(onDocumentOpened).toHaveBeenCalledTimes(1);
  fireEvent.press(view.getByText('Cerrar aviso'));
  await waitFor(() => expect(onDismissed).toHaveBeenCalledWith('own-notice'));
  expect(dismissLegalNotice).toHaveBeenCalledWith('own-notice');
});
test('a failed dismissal keeps the notice and can be retried', async () => {
  jest.mocked(dismissLegalNotice).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce();
  const onDismissed = jest.fn();
  const view = render(<LegalNoticeItem notice={{ ...notice, kind: 'EXPLICIT', requiresExplicitAcceptance: true }} onDismissed={onDismissed} onDocumentOpened={jest.fn()} />);
  fireEvent.press(view.getByText('Cerrar aviso'));
  await view.findByText('No se pudo cerrar el aviso. Puedes reintentar.');
  expect(onDismissed).not.toHaveBeenCalled();
  fireEvent.press(view.getByText('Cerrar aviso'));
  await waitFor(() => expect(onDismissed).toHaveBeenCalledTimes(1));
});

test('prevents duplicate dismissal while the server is saving it', async () => {
  let complete!: () => void;
  jest.mocked(dismissLegalNotice).mockImplementationOnce(() => new Promise(resolve => { complete = resolve; }));
  const onDismissed = jest.fn();
  const view = render(<LegalNoticeItem notice={notice} onDismissed={onDismissed} onDocumentOpened={jest.fn()} />);
  const close = view.getByText('Cerrar aviso');
  fireEvent.press(close);
  fireEvent.press(close);
  expect(dismissLegalNotice).toHaveBeenCalledTimes(1);
  complete();
  await waitFor(() => expect(onDismissed).toHaveBeenCalledWith(notice.id));
});
