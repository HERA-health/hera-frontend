import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { ClinicalPinForm } from '../ClinicalPinForm';
import { lightTheme as mockTheme } from '../../../constants/theme';
import { LEGAL_DOCUMENT_VERSION } from '../../../constants/legal';

const mockStatus = jest.fn();
const mockLegal = jest.fn();
const mockRotate = jest.fn();
const mockSetup = jest.fn();
const mockRequest = jest.fn();
const mockConfirm = jest.fn();
const mockNotify = jest.fn();
const mockAccept = jest.fn();
const mockDpa = jest.fn();
jest.mock('../../../contexts/ThemeContext', () => ({ useTheme: () => ({ theme: mockTheme }) }));
jest.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { email: 'specialist@example.test' } }) }));
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ navigate: jest.fn() }) }));
jest.mock('../../../services/clinicalService', () => ({
  getClinicalAccessStatus: () => mockStatus(),
  rotateClinicalPin: (...args: unknown[]) => mockRotate(...args),
  setupClinicalPin: (...args: unknown[]) => mockSetup(...args),
  hasAcceptedCurrentDataProcessingAgreement: (status: { requiresDataProcessingAgreementAcceptance: boolean }) => !status.requiresDataProcessingAgreementAcceptance,
  acceptDataProcessingAgreement: () => mockDpa(),
}));
jest.mock('../../../services/legalService', () => ({ getLegalStatus: () => mockLegal(), acceptLegalDocuments: () => mockAccept() }));
jest.mock('../../../services/clinicalPinService', () => ({
  requestClinicalPinReset: () => mockRequest(), confirmClinicalPinReset: (...args: unknown[]) => mockConfirm(...args),
  notifyClinicalPinChange: () => mockNotify(), maskClinicalEmail: () => 's***@example.test',
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockStatus.mockResolvedValue({ requiresDataProcessingAgreementAcceptance: false });
  mockLegal.mockResolvedValue({ acceptedDocuments: [{ documentKey: 'CLINICAL_MODULE_TERMS', version: LEGAL_DOCUMENT_VERSION }] });
  mockRotate.mockResolvedValue(undefined); mockNotify.mockResolvedValue(undefined);
  mockRequest.mockResolvedValue({ resendAfterSeconds: 60 }); mockConfirm.mockResolvedValue(undefined);
});

async function fillChange() {
  await screen.findByLabelText('PIN actual');
  fireEvent.changeText(screen.getByLabelText('PIN actual'), '123456');
  fireEvent.changeText(screen.getByLabelText('Nuevo PIN'), '654321');
  fireEvent.changeText(screen.getByLabelText('Repite el nuevo PIN'), '654321');
}

test('validates confirmation and submits a known PIN change, clearing clinical access', async () => {
  const done = jest.fn();
  render(<ClinicalPinForm mode="change" onForgot={jest.fn()} onCompleted={done} />);
  await fillChange();
  fireEvent.changeText(screen.getByLabelText('Repite el nuevo PIN'), '111111');
  fireEvent.press(screen.getByText('Guardar nuevo PIN'));
  expect(await screen.findByText('Los dos PIN no coinciden. Revísalos antes de guardar.')).toBeTruthy();
  expect(mockRotate).not.toHaveBeenCalled();
  fireEvent.changeText(screen.getByLabelText('Repite el nuevo PIN'), '654321');
  fireEvent.press(screen.getByText('Guardar nuevo PIN'));
  await waitFor(() => expect(done).toHaveBeenCalledWith('Tu PIN se ha cambiado. Usa el nuevo PIN para volver a abrir el área clínica.'));
  expect(mockRotate).toHaveBeenCalledWith('123456', '654321');
  expect(mockNotify).toHaveBeenCalledTimes(1);
  expect(screen.getByLabelText('PIN actual').props.value).toBe('');
});

test('retains input after rejected PIN and offers recovery', async () => {
  const forgot = jest.fn();
  mockRotate.mockRejectedValue(new Error('El PIN clínico no es correcto.'));
  render(<ClinicalPinForm mode="change" onForgot={forgot} onCompleted={jest.fn()} />);
  await fillChange(); fireEvent.press(screen.getByText('Guardar nuevo PIN'));
  expect(await screen.findByText('El PIN clínico no es correcto.')).toBeTruthy();
  expect(screen.getByLabelText('Nuevo PIN').props.value).toBe('654321');
  fireEvent.press(screen.getByText('He olvidado mi PIN'));
  expect(forgot).toHaveBeenCalledTimes(1);
});

test('recovery does not claim delivery until accepted and prevents duplicate requests', async () => {
  let resolve: () => void = () => {};
  mockRequest.mockReturnValue(new Promise<void>((done) => { resolve = done; }));
  render(<ClinicalPinForm mode="request" onForgot={jest.fn()} onCompleted={jest.fn()} />);
  fireEvent.press(screen.getByText('Enviar enlace'));
  expect(screen.queryByText(/Hemos enviado un enlace/)).toBeNull();
  expect(mockRequest).toHaveBeenCalledTimes(1);
  await act(async () => resolve());
  expect(await screen.findByText(/Hemos enviado un enlace a s\*\*\*@example.test/)).toBeTruthy();
  expect(screen.getByText(/Podrás reenviar en/)).toBeTruthy();
});

test('failed email remains a recoverable error without a success message', async () => {
  mockRequest.mockRejectedValue(new Error('No hemos podido enviar el enlace. Inténtalo de nuevo.'));
  render(<ClinicalPinForm mode="request" onForgot={jest.fn()} onCompleted={jest.fn()} />);
  fireEvent.press(screen.getByText('Enviar enlace'));
  expect(await screen.findByText('No hemos podido enviar el enlace. Inténtalo de nuevo.')).toBeTruthy();
  expect(screen.queryByText(/Hemos enviado un enlace/)).toBeNull();
});

test('requires legal acceptance before showing PIN fields and resumes after accepting', async () => {
  mockLegal.mockResolvedValueOnce({ acceptedDocuments: [] });
  mockAccept.mockResolvedValue(undefined);
  render(<ClinicalPinForm mode="setup" onForgot={jest.fn()} onCompleted={jest.fn()} />);
  await screen.findByText('Aceptar condiciones clínicas');
  expect(screen.queryByLabelText('Crea tu PIN')).toBeNull();
  fireEvent.press(screen.getByText('Aceptar condiciones clínicas'));
  expect(await screen.findByLabelText('Crea tu PIN')).toBeTruthy();
});

test('reset uses only the link and new PIN; it never unlocks automatically', async () => {
  const done = jest.fn();
  render(<ClinicalPinForm mode="reset" resetToken={'a'.repeat(64)} onForgot={jest.fn()} onCompleted={done} />);
  await screen.findByLabelText('Nuevo PIN');
  expect(screen.queryByLabelText('PIN actual')).toBeNull();
  fireEvent.changeText(screen.getByLabelText('Nuevo PIN'), '654321');
  fireEvent.changeText(screen.getByLabelText('Repite el nuevo PIN'), '654321');
  fireEvent.press(screen.getByText('Guardar nuevo PIN'));
  await waitFor(() => expect(done).toHaveBeenCalled());
  expect(mockConfirm).toHaveBeenCalledWith('a'.repeat(64), '654321');
  expect(mockRotate).not.toHaveBeenCalled();
});
