describe('resource library publication', () => {
  const originalDev = __DEV__;
  const originalFlag = process.env.EXPO_PUBLIC_RESOURCES_RELEASED;

  afterEach(() => {
    Object.defineProperty(global, '__DEV__', { value: originalDev, configurable: true, writable: true });
    if (originalFlag === undefined) delete process.env.EXPO_PUBLIC_RESOURCES_RELEASED;
    else process.env.EXPO_PUBLIC_RESOURCES_RELEASED = originalFlag;
    jest.resetModules();
  });

  it.each([
    [false, undefined, false],
    [false, 'false', false],
    [false, 'true', true],
    [false, 'invalid', false],
    [true, undefined, true],
    [true, 'false', false],
  ])('development=%s, flag=%s yields visible=%s', (development, flag, visible) => {
    Object.defineProperty(global, '__DEV__', { value: development, configurable: true, writable: true });
    if (flag === undefined) delete process.env.EXPO_PUBLIC_RESOURCES_RELEASED;
    else process.env.EXPO_PUBLIC_RESOURCES_RELEASED = flag;

    jest.isolateModules(() => {
      expect(require('../resources').RESOURCES_VISIBLE).toBe(visible);
      const { PROFESSIONAL_SECTIONS } = require('../../components/navigation/sidebar/navConfig');
      const ids = PROFESSIONAL_SECTIONS.flatMap((section: { items: { id: string }[] }) => section.items.map(item => item.id));
      expect(ids.includes('resources')).toBe(visible);
      expect(ids).toEqual(expect.arrayContaining(['billing', 'tariffs', 'sessions']));
    });
  });
});
