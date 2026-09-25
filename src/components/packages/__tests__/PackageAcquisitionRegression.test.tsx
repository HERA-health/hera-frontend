import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { PackageAcquisition } from '../PackageAcquisition';
import { PublicPackageOffers } from '../PublicPackageOffers';
import { acquirePackage, quotePackage, loadPublicPackages, requestPublicPackage, quotePublicPackage, acquirePublicPackage } from '../../../services/packageService';


jest.mock('expo-crypto', () => ({ randomUUID: () => 'review-command' }));
jest.mock('../../../services/professionalService', () => ({ getProfessionalClients: jest.fn().mockResolvedValue([]) }));
jest.mock('../../../services/packageService', () => ({ acquirePackage: jest.fn(), quotePackage: jest.fn(), loadPublicPackages: jest.fn(), requestPublicPackage: jest.fn(), quotePublicPackage: jest.fn(), acquirePublicPackage: jest.fn(), packagePrice: (n: number) => `${n / 100} EUR`, packageModality: () => 'Vídeo' }));

const offer = { id: 'offer', name: 'Bono', serviceId: 's', serviceName: 'Terapia', sessions: 5, totalCents: 25000, currency: 'EUR', version: 1, isPublic: true, archivedAt: null, options: [{ id: 'o', modality: 'VIDEO_CALL' as const, durationMinutes: 60 }] };
const quote = { snapshot: { ...offer, sessions: 3, totalCents: 35000, paymentConditions: null }, quoteReference: 'signed-350', expiresAt: '2030-01-01', fiscal: { invoiceKind: 'SIMPLIFIED', recipientEmail: 'review@example.invalid', recipient: { fiscalName: 'Paciente', fiscalTaxId: null, fiscalAddress: null } } };
beforeEach(() => jest.clearAllMocks());
test('confirmation displays the current signed price and session count', async () => {
  jest.mocked(quotePackage).mockResolvedValue(quote);
  render(<PackageAcquisition offer={offer} clientId="client" onClose={jest.fn()} onAcquired={jest.fn()} />);
  fireEvent.press(screen.getByText('Revisar antes de confirmar'));
  await screen.findByText('Asignar y enviar factura');
  expect(screen.getByText('Bono · 350 EUR')).toBeTruthy();
  expect(screen.getByText('Terapia · 3 sesiones')).toBeTruthy();
  expect(screen.queryByText(/250 EUR/)).toBeNull();
  fireEvent.press(screen.getByText('Asignar y enviar factura'));
  await waitFor(() => expect(acquirePackage).toHaveBeenCalledWith(expect.objectContaining({quoteReference:'signed-350'}), 'client'));
});
test.each(['PACKAGE_QUOTE_CHANGED', 'PACKAGE_QUOTE_INVALID', 'PACKAGE_PROOF_EXPIRED', 'PACKAGE_PROOF_INVALID'])('guest can recover from %s without resubmitting the expired quote', async errorCode => {
  jest.mocked(loadPublicPackages).mockResolvedValue([offer]);
  jest.mocked(requestPublicPackage).mockResolvedValue({requestId:'request',expiresAt:'2030-01-01'});
  jest.mocked(quotePublicPackage).mockResolvedValue(quote);
  jest.mocked(acquirePublicPackage).mockRejectedValue({response:{status:409,data:{code:errorCode,message:'Verificación caducada'}}});
  render(<PublicPackageOffers specialistId="specialist" anonymous onPrivacy={jest.fn()} />);
  fireEvent.press(await screen.findByText('Solicitar bono'));
  fireEvent.changeText(screen.getByLabelText('Nombre'), 'Paciente');
  fireEvent.changeText(screen.getByLabelText('Apellidos'), 'Sintético');
  fireEvent.changeText(screen.getByLabelText('Correo electrónico'), 'review@example.invalid');
  fireEvent(screen.getByLabelText('Aceptar política de privacidad'), 'valueChange', true);
  fireEvent.press(screen.getByText('Verificar mi correo'));
  fireEvent.changeText(await screen.findByLabelText('Código de verificación'), '123456');
  fireEvent.press(screen.getByText('Verificar y revisar condiciones'));
  await screen.findByText('Solicitar y recibir factura');
  expect(screen.getByText('3 sesiones · 350 EUR')).toBeTruthy();
  fireEvent.press(screen.getByText('Solicitar y recibir factura'));
  await screen.findByText('Verificar mi correo');
  expect(screen.getByLabelText('Nombre').props.value).toBe('Paciente');
  expect(screen.getByLabelText('Correo electrónico').props.value).toBe('review@example.invalid');
  expect(screen.queryByText('Solicitar y recibir factura')).toBeNull();
  fireEvent.press(screen.getByText('Verificar mi correo'));
  await screen.findByLabelText('Código de verificación');
  expect(requestPublicPackage).toHaveBeenCalledTimes(2);
  expect(acquirePublicPackage).toHaveBeenCalledTimes(1);
});
