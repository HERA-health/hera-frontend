import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useNavigation, usePreventRemove } from '@react-navigation/native';
import { useAppAlert } from '../../components/common/alert';

export function useProfileDraftExit(dirty: boolean) {
  const navigation = useNavigation();
  const alert = useAppAlert();
  const confirming = useRef(false);
  const inBrowserTraversal = useRef(false);
  const returnOffset = useRef(1);

  useEffect(() => {
    if (Platform.OS !== 'web' || !dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    const recordDirection = (event: NavigateEvent) => {
      if (event.navigationType === 'traverse' && window.navigation.currentEntry) {
        inBrowserTraversal.current = true;
        returnOffset.current = window.navigation.currentEntry.index - event.destination.index;
      } else {
        inBrowserTraversal.current = false;
      }
    };
    const onPop = () => {
      inBrowserTraversal.current = true;
    };
    const stopListening = navigation.addListener('state', () => { inBrowserTraversal.current = false; });
    window.navigation?.addEventListener('navigate', recordDirection);
    window.addEventListener('popstate', onPop, true);
    window.addEventListener('beforeunload', warn);
    return () => {
      window.navigation?.removeEventListener('navigate', recordDirection);
      window.removeEventListener('popstate', onPop, true);
      window.removeEventListener('beforeunload', warn);
      stopListening();
      inBrowserTraversal.current = false;
    };
  }, [dirty, navigation]);

  usePreventRemove(dirty, async ({ data }) => {
    // A browser traversal has already changed the address before React Navigation asks to remove the editor.
    // Restore that entry so cancelling leaves both the draft and browser history intact.
    const restoreEntry = async () => {
      if (Platform.OS !== 'web' || data.action.type !== 'RESET') return;
      // Navigation's listener may request removal before our popstate listener runs.
      await new Promise<void>(resolve => setTimeout(resolve, 0));
      if (!inBrowserTraversal.current) return;
      inBrowserTraversal.current = false;
      await new Promise<void>(resolve => {
        window.addEventListener('popstate', () => resolve(), { once: true });
        window.history.go(returnOffset.current);
      });
    };
    const restored = restoreEntry();
    if (confirming.current) return;
    confirming.current = true;
    try {
      const discard = await alert.confirm({
        title: 'Cambios sin guardar', message: '¿Quieres seguir editando o descartar los cambios del perfil?',
        cancelLabel: 'Seguir editando', confirmLabel: 'Descartar y salir', destructive: true,
      });
      await restored;
      if (discard) navigation.dispatch(data.action);
    } finally {
      confirming.current = false;
    }
  });
}
