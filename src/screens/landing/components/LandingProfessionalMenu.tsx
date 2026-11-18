import React, { useEffect, useLayoutEffect, useRef } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { professionalMenuCss, professionalMenuLabel, professionalMenuLinks } from '../../../seo/landingProfessionalMenu';

export type ProfessionalMenuRoute = (typeof professionalMenuLinks)[number]['route'];

/** Used by the web landing. Native links remain in the HTML for modified clicks and direct visits. */
export function LandingProfessionalMenu({ onSelect }: { onSelect: (route: ProfessionalMenuRoute) => void }) {
  const { theme } = useTheme();
  const menu = useRef<HTMLDetailsElement>(null);
  const panel = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const node = menu.current;
    const initial = document.querySelector<HTMLDetailsElement>('#hera-public-html .hera-pro-menu[open]');
    if (!node || !initial) return;
    const scroll = node.closest('#landing-header-scroll');
    const oldScroll = initial.closest('.lh-header');
    if (scroll && oldScroll) scroll.scrollLeft = oldScroll.scrollLeft;
    node.open = true;
    const focusedHref = initial.querySelector('a:focus')?.getAttribute('href');
    (focusedHref ? node.querySelector<HTMLElement>(`a[href="${focusedHref}"]`) : node.querySelector('summary'))?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const node = menu.current;
    const links = panel.current;
    const trigger = node?.querySelector('summary');
    if (!node || !links || !trigger) return;
    function position() {
      if (!node?.open || !trigger || !links) return;
      const rect = trigger.getBoundingClientRect();
      const x = Math.max(8, Math.min(rect.left, document.documentElement.clientWidth - links.offsetWidth - 8));
      links.style.setProperty('--menu-top', (rect.bottom + 4) + 'px');
      links.style.setProperty('--menu-left', x + 'px');
    }
    function toggle() {
      if (!node || !links) return;
      // The browser's top layer escapes the horizontally scrolling mobile header.
      if (typeof links.showPopover === 'function') {
        links.popover = 'manual';
        if (node.open) links.showPopover();
        else links.hidePopover();
      }
      position();
    }
    const outside = (e: Event) => {
      if (node.open && e.target instanceof Node && !node.contains(e.target)) node.open = false;
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || !node.open) return;
      node.open = false;
      trigger.focus({ preventScroll: true });
    };
    node.addEventListener('toggle', toggle);
    document.addEventListener('pointerdown', outside);
    document.addEventListener('focusin', outside);
    document.addEventListener('keydown', escape);
    window.addEventListener('resize', position);
    document.addEventListener('scroll', position, true);
    if (node.open) toggle();
    return () => {
      node.removeEventListener('toggle', toggle);
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('focusin', outside);
      document.removeEventListener('keydown', escape);
      window.removeEventListener('resize', position);
      document.removeEventListener('scroll', position, true);
    };
  }, []);

  const colors = {
    '--lh-muted': theme.textSecondary, '--lh-text': theme.textPrimary, '--lh-card': theme.bgCard,
    '--lh-border': theme.border, '--lh-sage': theme.secondaryMuted, '--lh-primary': theme.primary,
  } satisfies Record<string, string>;
  return <>
    <style>{professionalMenuCss}</style>
    <details className="hera-pro-menu" ref={menu} style={colors as React.CSSProperties}>
      <summary>{professionalMenuLabel}</summary>
      <nav className="hera-pro-links" aria-label="Menú para profesionales" ref={panel}>
        {professionalMenuLinks.map(item => <a href={item.href} key={item.href} onClick={event => {
          if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
          event.preventDefault();
          if (menu.current) menu.current.open = false;
          onSelect(item.route);
        }}>{item.label}</a>)}
      </nav>
    </details>
  </>;
}
