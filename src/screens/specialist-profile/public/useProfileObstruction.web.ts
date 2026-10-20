import { useEffect, useState } from 'react';

/** Also covers gallery, tag, review and global dialogs owned by reused components. */
export function useProfileObstruction() {
  const [obstructed, setObstructed] = useState(false);
  useEffect(() => {
    const update = () => {
      const focused = document.activeElement;
      const typing = focused instanceof HTMLInputElement || focused instanceof HTMLTextAreaElement
        || (focused instanceof HTMLElement && focused.isContentEditable);
      // RN Web assigns role="dialog" after a modal's opening animation.
      const modal = Array.from(document.querySelectorAll('[role="dialog"], [aria-modal="true"]')).some(node => node.getClientRects().length > 0);
      setObstructed(typing || modal);
    };
    const observer = new MutationObserver(update);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-hidden', 'aria-modal', 'role', 'style'] });
    document.addEventListener('focusin', update);
    document.addEventListener('focusout', update);
    update();
    return () => {
      observer.disconnect();
      document.removeEventListener('focusin', update);
      document.removeEventListener('focusout', update);
    };
  }, []);
  return obstructed;
}
