import * as ExpoCrypto from 'expo-crypto';

export const createSecureRandomUuid = (): string => ExpoCrypto.randomUUID();
