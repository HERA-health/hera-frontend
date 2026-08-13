import { useCallback, useEffect, useRef, useState } from 'react';
import type { PanelMode } from './clinicPatientDomain';

interface UseClinicPatientAdaptiveNavigationOptions {
  isCompact: boolean;
  panelMode: PanelMode;
  selectedPatientId: string | null;
  busy: boolean;
  onCancelForm: () => void;
  onRestoreOriginFocus: () => void;
}

interface ClinicPatientAdaptiveNavigation {
  panelOpen: boolean;
  openPanel: () => void;
  closePanel: () => void;
  handleBack: () => void;
  handleCancelForm: () => void;
}

export function useClinicPatientAdaptiveNavigation({
  isCompact,
  panelMode,
  selectedPatientId,
  busy,
  onCancelForm,
  onRestoreOriginFocus,
}: UseClinicPatientAdaptiveNavigationOptions): ClinicPatientAdaptiveNavigation {
  const [panelOpen, setPanelOpen] = useState(false);
  const previousCompactRef = useRef(isCompact);

  const openPanel = useCallback(() => {
    setPanelOpen(true);
  }, []);

  const closePanel = useCallback(() => {
    setPanelOpen(false);
    requestAnimationFrame(onRestoreOriginFocus);
  }, [onRestoreOriginFocus]);

  const handleCancelForm = useCallback(() => {
    const wasCreating = panelMode === 'create';
    onCancelForm();

    if (wasCreating) {
      if (isCompact) {
        closePanel();
      } else {
        setPanelOpen(false);
      }
    }
  }, [closePanel, isCompact, onCancelForm, panelMode]);

  const handleBack = useCallback(() => {
    if (busy) return;

    if (panelMode === 'edit') {
      onCancelForm();
      return;
    }

    if (panelMode === 'create') {
      onCancelForm();
    }

    closePanel();
  }, [busy, closePanel, onCancelForm, panelMode]);

  useEffect(() => {
    const wasCompact = previousCompactRef.current;
    previousCompactRef.current = isCompact;

    if (isCompact && !wasCompact && (panelMode !== 'detail' || Boolean(selectedPatientId))) {
      setPanelOpen(true);
      return;
    }

    if (!isCompact && wasCompact) {
      setPanelOpen(false);
      requestAnimationFrame(onRestoreOriginFocus);
    }
  }, [isCompact, onRestoreOriginFocus, panelMode, selectedPatientId]);

  useEffect(() => {
    if (panelOpen && panelMode === 'detail' && !selectedPatientId) {
      closePanel();
    }
  }, [closePanel, panelMode, panelOpen, selectedPatientId]);

  return {
    panelOpen,
    openPanel,
    closePanel,
    handleBack,
    handleCancelForm,
  };
}
