import { useEffect, useState } from 'react';
import { Keyboard } from 'react-native';

export function useProfileObstruction() {
  const [obstructed, setObstructed] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setObstructed(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setObstructed(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
  return obstructed;
}
