import { useCallback, useMemo, useRef } from 'react';
import {
  ScrollView,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useOptionalProfessionalTour } from './professionalTourContext';
import type { ProfessionalTourTargetId } from './professionalTourTypes';

const MEASURE_SCROLL_VIEWPORT_TIMEOUT_MS = 80;
const MIN_SCROLL_DELTA = 1;

interface ScrollViewportLayout {
  height: number;
  y: number;
}

type MeasurableScrollRef = {
  measureInWindow: (
    callback: (x: number, y: number, width: number, height: number) => void,
  ) => void;
};

export function useProfessionalTourScrollPreparation() {
  const tour = useOptionalProfessionalTour();
  const scrollRef = useRef<ScrollView | null>(null);
  const contentHeightRef = useRef(0);
  const scrollOffsetRef = useRef(0);
  const viewportHeightRef = useRef(0);

  const measureScrollViewport = useCallback(async (): Promise<ScrollViewportLayout | null> => {
    const scrollView = scrollRef.current as unknown as MeasurableScrollRef | null;

    if (!scrollView || typeof scrollView.measureInWindow !== 'function') {
      return null;
    }

    return new Promise<ScrollViewportLayout | null>((resolve) => {
      let hasResolved = false;
      const timeout = setTimeout(() => {
        if (!hasResolved) {
          hasResolved = true;
          resolve(null);
        }
      }, MEASURE_SCROLL_VIEWPORT_TIMEOUT_MS);

      scrollView.measureInWindow((_x, y, _width, measuredHeight) => {
        if (hasResolved) {
          return;
        }

        hasResolved = true;
        clearTimeout(timeout);
        resolve({ height: measuredHeight, y });
      });
    });
  }, []);

  const scrollToOffset = useCallback(
    (nextOffset: number) => {
      const contentHeight = contentHeightRef.current;
      const viewportHeight = viewportHeightRef.current;
      const visibleHeight = viewportHeight > 0 ? viewportHeight : 0;
      const knownMaxOffset = contentHeight > visibleHeight
        ? contentHeight - visibleHeight
        : null;
      const clampedOffset = Math.max(
        0,
        knownMaxOffset === null ? nextOffset : Math.min(knownMaxOffset, nextOffset),
      );

      scrollOffsetRef.current = clampedOffset;
      scrollRef.current?.scrollTo({ animated: false, y: clampedOffset });
    },
    [],
  );

  const prepareTarget = useCallback(
    async (targetId: ProfessionalTourTargetId) => {
      const targetLayout = await tour?.measureTarget(targetId);

      if (!targetLayout) {
        return;
      }

      const scrollViewport = await measureScrollViewport();
      const viewportTop = scrollViewport?.y ?? 0;
      const visibleHeight = scrollViewport?.height || viewportHeightRef.current;

      if (visibleHeight <= 0) {
        return;
      }

      const targetCenter = targetLayout.y + targetLayout.height / 2;
      const viewportCenter = viewportTop + visibleHeight / 2;
      const scrollOffset = scrollOffsetRef.current;
      const nextOffset = scrollOffset + targetCenter - viewportCenter;

      if (Math.abs(nextOffset - scrollOffset) < MIN_SCROLL_DELTA) {
        return;
      }

      scrollToOffset(nextOffset);
    },
    [measureScrollViewport, scrollToOffset, tour],
  );

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollOffsetRef.current = event.nativeEvent.contentOffset.y;
  }, []);

  const handleContentSizeChange = useCallback((_width: number, height: number) => {
    contentHeightRef.current = height;
  }, []);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    viewportHeightRef.current = event.nativeEvent.layout.height;
  }, []);

  const scrollProps = useMemo(() => ({
    onContentSizeChange: handleContentSizeChange,
    onLayout: handleLayout,
    onScroll: handleScroll,
    scrollEventThrottle: 16,
  }), [handleContentSizeChange, handleLayout, handleScroll]);

  const scrollToTop = useCallback(() => scrollToOffset(0), [scrollToOffset]);

  return useMemo(() => ({
    prepareTarget,
    scrollProps,
    scrollRef,
    scrollToTop,
  }), [prepareTarget, scrollProps, scrollToTop]);
}
