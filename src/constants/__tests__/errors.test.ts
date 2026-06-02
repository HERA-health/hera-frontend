import {
  CONTACT_METHOD_REQUIRED_MESSAGE,
  getErrorCode,
  getErrorMessage,
} from '../errors';

const buildApiError = (code: string, error = 'Texto técnico') => ({
  response: {
    data: {
      success: false,
      code,
      error,
    },
  },
});

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

describe('getErrorMessage contact method codes', () => {
  it('maps patient contact backend codes to the shared user-facing copy', () => {
    expect(getErrorMessage(buildApiError('CLIENT_CONTACT_METHOD_REQUIRED'))).toBe(
      CONTACT_METHOD_REQUIRED_MESSAGE
    );
    expect(getErrorMessage(buildApiError('CLINIC_PATIENT_CONTACT_METHOD_REQUIRED'))).toBe(
      CONTACT_METHOD_REQUIRED_MESSAGE
    );
  });
});
