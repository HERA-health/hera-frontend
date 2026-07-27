import {
  getMapInteractionOptions,
  hasFiniteMapCoordinates,
} from '../locationMapOptions';

describe('locationMapOptions', () => {
  it('accepts zero as a valid coordinate', () => {
    expect(hasFiniteMapCoordinates(0, 0)).toBe(true);
    expect(hasFiniteMapCoordinates(Number.NaN, 0)).toBe(false);
    expect(hasFiniteMapCoordinates(0, Number.POSITIVE_INFINITY)).toBe(false);
  });

  it('fully disables gestures for a non-interactive map', () => {
    expect(getMapInteractionOptions(false)).toEqual({
      clickableIcons: false,
      disableDoubleClickZoom: true,
      draggable: false,
      fullscreenControl: false,
      gestureHandling: 'none',
      keyboardShortcuts: false,
      scrollwheel: false,
      zoomControl: false,
    });
  });
});
