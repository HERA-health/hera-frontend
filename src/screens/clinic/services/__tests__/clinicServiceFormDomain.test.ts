import type { ClinicServiceCatalogItem } from '../../../../services/clinicService';
import {
  clinicServiceToForm,
  formatClinicServicePrice,
  parseClinicServiceForm,
} from '../clinicServiceFormDomain';

describe('clinic service form domain', () => {
  const validForm = {
    name: 'Primera consulta',
    description: 'Valoración inicial',
    durationMinutes: '60',
    price: '65,50',
    modalities: ['IN_PERSON', 'PHONE_CALL'] as const,
    clinicSpecialistIds: ['clinic-specialist-1'],
  };

  it('keeps comma input as text and converts exact valid money only on submit', () => {
    const parsed = parseClinicServiceForm({
      ...validForm,
      modalities: [...validForm.modalities],
    });
    expect(parsed).toEqual({
      success: true,
      payload: {
        name: 'Primera consulta',
        description: 'Valoración inicial',
        durationMinutes: 60,
        price: 65.5,
        modalities: ['IN_PERSON', 'PHONE_CALL'],
        clinicSpecialistIds: ['clinic-specialist-1'],
      },
    });
  });

  it.each(['', 'texto', '-1', '10,999', '1.2.3'])(
    'does not silently turn invalid price %s into zero',
    (price) => {
      const parsed = parseClinicServiceForm({
        ...validForm,
        price,
        modalities: [...validForm.modalities],
      });
      expect(parsed.success).toBe(false);
      if (!parsed.success) expect(parsed.errors.price).toBeTruthy();
    },
  );

  it('rejects prices that do not fit the backend Decimal(10,2)', () => {
    const parsed = parseClinicServiceForm({
      ...validForm,
      price: '100000000,00',
      modalities: [...validForm.modalities],
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) expect(parsed.errors.price).toBe('El importe supera el máximo admitido.');
  });

  it('validates duration, modalities and active provider selection locally', () => {
    const parsed = parseClinicServiceForm({
      ...validForm,
      durationMinutes: '181',
      modalities: [],
      clinicSpecialistIds: [],
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.errors.durationMinutes).toBeTruthy();
      expect(parsed.errors.modalities).toBeTruthy();
      expect(parsed.errors.clinicSpecialistIds).toBeTruthy();
    }
  });

  it('hydrates an edit without losing decimal or association values', () => {
    const service: ClinicServiceCatalogItem = {
      id: 'service-1',
      name: 'Seguimiento',
      description: null,
      durationMinutes: 45,
      price: 0,
      currency: 'EUR',
      modalities: ['PHONE_CALL'],
      status: 'ARCHIVED',
      isDefault: false,
      clinicSpecialistIds: ['clinic-specialist-2'],
      activeSpecialistCount: 0,
      version: 3,
    };
    expect(clinicServiceToForm(service)).toEqual({
      name: 'Seguimiento',
      description: '',
      durationMinutes: '45',
      price: '0,00',
      modalities: ['PHONE_CALL'],
      clinicSpecialistIds: ['clinic-specialist-2'],
    });
    expect(formatClinicServicePrice(65.5)).toContain('65,50');
  });
});
