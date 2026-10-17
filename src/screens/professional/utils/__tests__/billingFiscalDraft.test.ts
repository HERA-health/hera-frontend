import { createFiscalEditDraft, createFiscalAddressUpdate } from '../billingFiscalDraft';

describe('createFiscalEditDraft', () => {
  it('prefills the fiscal name from the user name only when the fiscal name is empty', () => {
    const draft = createFiscalEditDraft(
      {
        fiscalName: '',
        fiscalNif: '',
        fiscalAddress: '',
      },
      '  Dra. Elena Martin  ',
    );

    expect(draft.fiscalName).toBe('Dra. Elena Martin');
  });

  it('does not overwrite an existing fiscal name', () => {
    const draft = createFiscalEditDraft(
      {
        fiscalName: 'Consulta Salud SL',
        fiscalNif: '',
        fiscalAddress: '',
      },
      'Dra. Elena Martin',
    );

    expect(draft.fiscalName).toBe('Consulta Salud SL');
  });
});

describe('structured fiscal address updates', () => {
  it('does not resend or split legacy free text when editing other details', () => {
    const saved = { fiscalAddress: 'Madrid', fiscalName: 'QA' };
    expect(createFiscalEditDraft(saved).fiscalCity).toBeUndefined();
    expect(createFiscalAddressUpdate({ ...saved, fiscalName: 'Nuevo nombre' }, saved)).toEqual({});
  });
  it('sends all components and never sends a second editable full address', () => {
    const fields = { fiscalStreetAddress: 'C/ Ejemplo 12', fiscalPostalCode: '08008', fiscalCity: 'Barcelona', fiscalCountry: 'España' };
    expect(createFiscalAddressUpdate({ ...fields, fiscalAddress: 'Madrid' }, {})).toEqual(fields);
  });
  it('does not silently discard a partial edit or clearing an existing structured address', () => {
    expect(createFiscalAddressUpdate({ fiscalCity: 'Madrid' }, {})).toEqual({ fiscalStreetAddress: '', fiscalPostalCode: '', fiscalCity: 'Madrid', fiscalCountry: '' });
    expect(createFiscalAddressUpdate({}, { fiscalStreetAddress: 'C/ Ejemplo' })).toEqual({ fiscalStreetAddress: '', fiscalPostalCode: '', fiscalCity: '', fiscalCountry: '' });
  });
});
