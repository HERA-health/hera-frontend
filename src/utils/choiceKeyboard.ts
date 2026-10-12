import {Platform} from 'react-native';
import type {KeyboardEvent} from 'react';

/** RN Web handles Enter, but custom checkbox/radio roles also need Space. */
export function choiceKeyboardProps(activate: () => void, disabled = false) {
  return Platform.OS === 'web' ? {
    onKeyDown: (event: KeyboardEvent) => {
      if (event.key !== ' ' && event.key !== 'Spacebar') return;
      event.preventDefault();
      if (!disabled && !event.repeat) activate();
    },
  } : {};
}
