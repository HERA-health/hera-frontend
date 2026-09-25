import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { PackageAcquisition } from '../PackageAcquisition';
import { acquirePackage, quotePackage, type PackageOffer, type PackageQuote } from '../../../services/packageService';

jest.mock('expo-crypto', () => ({ randomUUID: jest.fn(() => 'synthetic-command-key') }));
jest.mock('../../../services/professionalService', () => ({ getProfessionalClients: jest.fn().mockResolvedValue([]) }));
jest.mock('../../../services/packageService', () => ({ acquirePackage: jest.fn(), quotePackage: jest.fn(), packagePrice: () => '250,00 €', packageModality: () => 'Vídeo' }));
const offer: PackageOffer={id:'offer',name:'Bono',serviceId:'service',serviceName:'Terapia',sessions:5,totalCents:25000,currency:'EUR',version:1,isPublic:true,archivedAt:null,options:[{id:'option',modality:'VIDEO_CALL',durationMinutes:60}]};
const quote: PackageQuote={snapshot:{...offer,paymentConditions:null},quoteReference:'signed-quote',expiresAt:'2030-01-01',fiscal:{invoiceKind:'SIMPLIFIED',recipientEmail:'synthetic@example.invalid',recipient:{fiscalName:'Paciente',fiscalTaxId:null,fiscalAddress:null}}};
test('a lost response retries the same acquisition command and signed conditions', async () => {
  jest.mocked(quotePackage).mockResolvedValue(quote);
  jest.mocked(acquirePackage).mockRejectedValueOnce(new Error('Timeout sintético')).mockResolvedValueOnce({ id: 'acquired', specialistId: 'specialist', clientId: 'client', createdAt: '2026-09-25', snapshot: quote.snapshot, balance: { total: 5, available: 5, reserved: 0, consumed: 0 }, invoice: null, uses: [], notifications: [] });
  const done=jest.fn(); render(<PackageAcquisition offer={offer} clientId="client" onClose={jest.fn()} onAcquired={done} />);
  fireEvent.press(screen.getByText('Revisar antes de confirmar'));
  await screen.findByText('Asignar y enviar factura'); fireEvent.press(screen.getByText('Asignar y enviar factura'));
  await screen.findByText('Error de conexión. Verifica tu internet e intenta de nuevo.'); fireEvent.press(screen.getByText('Asignar y enviar factura'));
  await waitFor(() => expect(done).toHaveBeenCalledTimes(1));
  const calls=jest.mocked(acquirePackage).mock.calls; expect(calls).toHaveLength(2); expect(calls[1]).toEqual(calls[0]);
});
