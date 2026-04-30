import { getErrorCode } from '../errors';

describe('getErrorCode', () => {
  it('reads explicit API error codes', () => {
    expect(
      getErrorCode({
        response: {
          data: {
            code: 'DATA_PROCESSING_AGREEMENT_REQUIRED',
            error: 'ignored',
          },
        },
      })
    ).toBe('DATA_PROCESSING_AGREEMENT_REQUIRED');
  });

  it('falls back to uppercase backend error identifiers', () => {
    expect(
      getErrorCode({
        response: {
          data: {
            error: 'DATA_PROCESSING_AGREEMENT_REQUIRED',
          },
        },
      })
    ).toBe('DATA_PROCESSING_AGREEMENT_REQUIRED');
  });

  it('does not treat ordinary error messages as stable codes', () => {
    expect(
      getErrorCode({
        response: {
          data: {
            error: 'Only professionals can create managed clients',
          },
        },
      })
    ).toBeUndefined();
  });
});
