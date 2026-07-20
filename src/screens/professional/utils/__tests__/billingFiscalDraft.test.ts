import { createFiscalEditDraft } from '../billingFiscalDraft';

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
