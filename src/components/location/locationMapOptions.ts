export interface MapInteractionOptions {
  clickableIcons: boolean;
  disableDoubleClickZoom: boolean;
  draggable: boolean;
  fullscreenControl: boolean;
  gestureHandling: 'auto' | 'none';
  keyboardShortcuts: boolean;
  scrollwheel: boolean;
  zoomControl: boolean;
}

export const hasFiniteMapCoordinates = (
  latitude: unknown,
  longitude: unknown,
): boolean =>
  typeof latitude === 'number'
  && Number.isFinite(latitude)
  && typeof longitude === 'number'
  && Number.isFinite(longitude);

export const getMapInteractionOptions = (
  interactive: boolean,
): MapInteractionOptions => ({
  clickableIcons: interactive,
  disableDoubleClickZoom: !interactive,
  draggable: interactive,
  fullscreenControl: interactive,
  gestureHandling: interactive ? 'auto' : 'none',
  keyboardShortcuts: interactive,
  scrollwheel: interactive,
  zoomControl: interactive,
});
