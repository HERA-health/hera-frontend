describe('payment publication', () => {
  const originalDev = __DEV__;
  const originalFlag = process.env.EXPO_PUBLIC_SESSION_PAYMENTS_RELEASED;
  afterEach(() => {
    Object.defineProperty(global, '__DEV__', { value: originalDev, configurable: true, writable: true });
    if (originalFlag === undefined) delete process.env.EXPO_PUBLIC_SESSION_PAYMENTS_RELEASED;
    else process.env.EXPO_PUBLIC_SESSION_PAYMENTS_RELEASED = originalFlag;
    jest.resetModules();
  });
  it('hides Cobros in a production build by default while keeping billing and packages', () => {
    Object.defineProperty(global, '__DEV__', { value: false, configurable: true, writable: true });
    delete process.env.EXPO_PUBLIC_SESSION_PAYMENTS_RELEASED;
    jest.isolateModules(() => {
      expect(require('../sessionPayments').SESSION_PAYMENTS_VISIBLE).toBe(false);
      const { PROFESSIONAL_SECTIONS } = require('../../components/navigation/sidebar/navConfig');
      const ids = PROFESSIONAL_SECTIONS.flatMap((section: { items: { id: string }[] }) => section.items.map(item => item.id));
      expect(ids).not.toContain('payments');
      expect(ids).toEqual(expect.arrayContaining(['billing', 'tariffs', 'sessions']));
    });
  });
  it('requires an explicit opt-in to expose production payments', () => {
    Object.defineProperty(global, '__DEV__', { value: false, configurable: true, writable: true });
    process.env.EXPO_PUBLIC_SESSION_PAYMENTS_RELEASED = 'true';
    jest.isolateModules(() => expect(require('../sessionPayments').SESSION_PAYMENTS_VISIBLE).toBe(true));
  });
  it('can hide the feature during local testing too', () => {
    Object.defineProperty(global, '__DEV__', { value: true, configurable: true, writable: true });
    process.env.EXPO_PUBLIC_SESSION_PAYMENTS_RELEASED = 'false';
    jest.isolateModules(() => expect(require('../sessionPayments').SESSION_PAYMENTS_VISIBLE).toBe(false));
  });
});
