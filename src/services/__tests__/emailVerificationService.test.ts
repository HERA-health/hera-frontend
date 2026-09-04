import * as authService from '../authService';
import { verifyEmailLinkOnce } from '../emailVerificationService';

jest.mock('../authService', () => ({
  verifyEmail: jest.fn(),
}));

const verifyEmailMock = authService.verifyEmail as jest.MockedFunction<typeof authService.verifyEmail>;

describe('verifyEmailLinkOnce', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shares one backend request when the same single-use token is processed twice', async () => {
    let resolveVerification: ((value: Awaited<ReturnType<typeof authService.verifyEmail>>) => void) | undefined;
    const pendingVerification = new Promise<Awaited<ReturnType<typeof authService.verifyEmail>>>((resolve) => {
      resolveVerification = resolve;
    });
    verifyEmailMock.mockReturnValue(pendingVerification);

    const firstAttempt = verifyEmailLinkOnce('strict-mode-token');
    const secondAttempt = verifyEmailLinkOnce('strict-mode-token');

    expect(verifyEmailMock).toHaveBeenCalledTimes(1);

    resolveVerification?.({
      success: true,
      message: 'Correo verificado correctamente',
      userType: 'PROFESSIONAL',
    });

    await expect(firstAttempt).resolves.toMatchObject({ userType: 'PROFESSIONAL' });
    await expect(secondAttempt).resolves.toMatchObject({ userType: 'PROFESSIONAL' });
  });

  it('allows a real failed request to be retried', async () => {
    verifyEmailMock
      .mockRejectedValueOnce(new Error('Error de conexión'))
      .mockResolvedValueOnce({
        success: true,
        message: 'Correo verificado correctamente',
        userType: 'PROFESSIONAL',
      });

    await expect(verifyEmailLinkOnce('retryable-token')).rejects.toThrow('Error de conexión');
    await expect(verifyEmailLinkOnce('retryable-token')).resolves.toMatchObject({
      userType: 'PROFESSIONAL',
    });

    expect(verifyEmailMock).toHaveBeenCalledTimes(2);
  });
});
