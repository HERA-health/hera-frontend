import { professionalHeaderLinks } from '../constants/professionalNavigation';

export const professionalMenuLabel = 'Para profesionales';
export const professionalMenuLinks = professionalHeaderLinks.map(item => ({
  ...item, label: item.route === 'ProfessionalSoftware' ? 'Software para psicólogos' : item.label,
}));

export const professionalMenuCss = `
@supports not selector(:popover-open){#landing-header-scroll{transform:none}}
.hera-pro-menu{font:14px/1.4 HeraSans,sans-serif;color:var(--lh-muted);flex:none}
.hera-pro-menu summary{display:flex;align-items:center;gap:6px;padding:8px 4px;min-height:44px;box-sizing:border-box;cursor:pointer;list-style:none;white-space:nowrap;anchor-name:--hera-pro-trigger}
.hera-pro-menu summary::-webkit-details-marker{display:none}
.hera-pro-menu summary::after{content:'';width:6px;height:6px;border:solid currentColor;border-width:0 1.5px 1.5px 0;transform:translateY(-2px) rotate(45deg)}
.hera-pro-menu[open] summary::after{transform:translateY(2px) rotate(225deg)}
.hera-pro-menu summary:hover,.hera-pro-menu[open] summary{color:var(--lh-primary)}
.hera-pro-menu .hera-pro-links{position:fixed;inset:auto;top:var(--menu-top,66px);left:var(--menu-left,clamp(8px,50vw,calc(100vw - 272px)));z-index:3;margin:0;padding:6px;box-sizing:border-box;width:min(264px,calc(100vw - 16px));max-height:calc(100dvh - var(--menu-top,66px) - 8px);overflow:auto;background:var(--lh-card);color:var(--lh-text);border:1px solid var(--lh-border);border-radius:12px;box-shadow:0 8px 24px rgb(30 42 35 / 12%)}
@supports (top:anchor(bottom)){.hera-pro-menu .hera-pro-links{position-anchor:--hera-pro-trigger;top:var(--menu-top,anchor(bottom));left:var(--menu-left,clamp(8px,anchor(left),calc(100vw - 272px)))}}
.hera-pro-menu .hera-pro-links a{display:flex;align-items:center;min-height:44px;box-sizing:border-box;padding:8px 12px;color:inherit;text-decoration:none;border-radius:7px;white-space:normal}
.hera-pro-menu .hera-pro-links a:first-child{font-family:HeraSans-Bold,sans-serif}
.hera-pro-menu .hera-pro-links a:hover,.hera-pro-menu .hera-pro-links a:focus-visible{background:var(--lh-sage);color:var(--lh-text)}
.hera-pro-menu :focus-visible{outline:2px solid var(--lh-primary);outline-offset:-2px}
`;

export function professionalMenuHtml() {
  const links = professionalMenuLinks.map(link => `<a href="${link.href}">${link.label}</a>`).join('');
  return `<details class="hera-pro-menu"><summary>${professionalMenuLabel}</summary><nav class="hera-pro-links" aria-label="Menú para profesionales">${links}</nav></details>`;
}
