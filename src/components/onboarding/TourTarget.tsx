import React, { useCallback, useEffect, useRef } from 'react';
import { View, type ViewStyle } from 'react-native';
import { AttachStep, type ChildProps } from 'react-native-spotlight-tour';
import { useOptionalProfessionalTour } from './professionalTourContext';
import type { TourTargetProps } from './professionalTourTypes';

const MEASURE_TARGET_TIMEOUT_MS = 80;

export function TourTarget({
  active = true,
  children,
  fill = false,
  id,
  pointerEvents,
  spotlightStyle,
  style,
}: TourTargetProps): React.ReactElement {
  const tour = useOptionalProfessionalTour();
  const index = tour?.getTargetIndex(id) ?? null;
  const registerTarget = tour?.registerTarget;
  const targetRef = useRef<React.ElementRef<typeof View>>(null);
  const wrapperStyle = pointerEvents
    ? [style, { pointerEvents } as ViewStyle]
    : style;
  const hasWrapper = Boolean(wrapperStyle);

  const measureTarget = useCallback(async () => {
    const target = targetRef.current;

    if (!target || typeof target.measureInWindow !== 'function') {
      return null;
    }

    return new Promise<{
      height: number;
      width: number;
      x: number;
      y: number;
    } | null>((resolve) => {
      let hasResolved = false;
      const timeout = setTimeout(() => {
        if (!hasResolved) {
          hasResolved = true;
          resolve(null);
        }
      }, MEASURE_TARGET_TIMEOUT_MS);

      target.measureInWindow((x, y, width, height) => {
        if (hasResolved) {
          return;
        }

        hasResolved = true;
        clearTimeout(timeout);
        resolve({ height, width, x, y });
      });
    });
  }, []);

  useEffect(() => {
    if (!active || !registerTarget) {
      return undefined;
    }

    return registerTarget(id, hasWrapper ? measureTarget : undefined);
  }, [active, hasWrapper, id, measureTarget, registerTarget]);

  if (!active || index === null) {
    if (wrapperStyle) {
      return (
        <View ref={targetRef} collapsable={false} focusable={false} style={wrapperStyle}>
          {children}
        </View>
      );
    }

    return children;
  }

  if (wrapperStyle) {
    return (
      <View ref={targetRef} collapsable={false} focusable={false} style={wrapperStyle}>
        <AttachStep
          fill={fill}
          index={index}
          style={spotlightStyle}
        >
          {children as React.ReactElement<ChildProps>}
        </AttachStep>
      </View>
    );
  }

  return (
    <AttachStep
      fill={fill}
      index={index}
      style={spotlightStyle}
    >
      {children as React.ReactElement<ChildProps>}
    </AttachStep>
  );
}
