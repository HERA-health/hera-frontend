import { useCallback, useEffect, useMemo, useState } from 'react';

import type { AvailabilityExceptionRangeImpact } from '../../../../services/availabilityService';
import {
  MAX_EXCEPTION_RANGE_DAYS,
  formatExceptionPeriodDateRange,
  formatExceptionPeriodDayCount,
  getInclusiveDateRangeDayCount,
  getOrderedDateRange,
} from '../../utils/availabilityExceptionRanges';

export type ExceptionRangeSelectionStep = 'start' | 'end';

interface UseExceptionRangeDraftOptions {
  isOpen: boolean;
  loadImpact: (
    startDate: string,
    endDate: string
  ) => Promise<AvailabilityExceptionRangeImpact>;
}

const getDraftErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

export const useExceptionRangeDraft = ({
  isOpen,
  loadImpact,
}: UseExceptionRangeDraftOptions) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectionStep, setSelectionStep] = useState<ExceptionRangeSelectionStep>('start');
  const [impact, setImpact] = useState<AvailabilityExceptionRangeImpact | null>(null);
  const [impactLoading, setImpactLoading] = useState(false);
  const [impactError, setImpactError] = useState<string | null>(null);

  const selectedRange = useMemo(() => {
    if (!startDate || !endDate) {
      return null;
    }

    return getOrderedDateRange(startDate, endDate);
  }, [endDate, startDate]);

  const dayCount = selectedRange
    ? getInclusiveDateRangeDayCount(selectedRange.startDate, selectedRange.endDate)
    : 0;
  const isTooLong = dayCount > MAX_EXCEPTION_RANGE_DAYS;
  const rangeLabel = selectedRange
    ? `${formatExceptionPeriodDateRange({
      startDate: selectedRange.startDate,
      endDate: selectedRange.endDate,
    })} · ${formatExceptionPeriodDayCount(dayCount)}`
    : 'Selecciona el inicio del periodo.';
  const canSubmit = selectedRange !== null && dayCount > 0 && !isTooLong;

  const reset = useCallback(() => {
    setStartDate('');
    setEndDate('');
    setSelectionStep('start');
    setImpact(null);
    setImpactError(null);
    setImpactLoading(false);
  }, []);

  const handleDayPress = useCallback((day: { dateString: string }) => {
    const date = day.dateString;

    if (selectionStep === 'start' || !startDate) {
      setStartDate(date);
      setEndDate(date);
      setSelectionStep('end');
      return;
    }

    const orderedRange = getOrderedDateRange(startDate, date);
    setStartDate(orderedRange.startDate);
    setEndDate(orderedRange.endDate);
    setSelectionStep('start');
  }, [selectionStep, startDate]);

  useEffect(() => {
    if (!isOpen || !selectedRange) {
      return undefined;
    }

    if (isTooLong) {
      setImpact(null);
      setImpactError(null);
      setImpactLoading(false);
      return undefined;
    }

    let cancelled = false;
    setImpactLoading(true);
    setImpactError(null);

    loadImpact(selectedRange.startDate, selectedRange.endDate)
      .then((nextImpact) => {
        if (!cancelled) {
          setImpact(nextImpact);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setImpact(null);
          setImpactError(getDraftErrorMessage(
            error,
            'No se pudo comprobar si hay sesiones en este periodo.'
          ));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setImpactLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, isTooLong, loadImpact, selectedRange]);

  return {
    canSubmit,
    dayCount,
    handleDayPress,
    impact,
    impactError,
    impactLoading,
    isTooLong,
    rangeLabel,
    reset,
    selectedRange,
    selectionStep,
  };
};
