import { publicAudienceTheme } from "../constants/publicAudienceTheme";
import { publicBarHtml } from "./publicBar";
import { darkTheme, lightTheme, type Theme } from "../constants/theme";
import type { CSSProperties } from "react";
export { professionalHeaderLinks } from "../constants/professionalNavigation";

export const patientNavigation = [
  { href: "/especialistas", label: "Psicólogos/as" },
  { href: "/?section=howItWorks", label: "Cómo funciona" },
  { href: "/?section=specializations", label: "Especialidades" },
  { href: "/software-para-psicologos", label: "Para profesionales" },
] as const;
export const publicThemeBoot = `<script>(function(){
  const key = 'hera_theme_mode', root = document.documentElement;
  try {
    const mode = localStorage.getItem(key);
    root.dataset.heraTheme = mode === 'dark' || mode === 'light' ? mode : matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light';
  } catch(e) {}
  document.addEventListener('readystatechange', function(){
    const bar = document.querySelector('#hera-public-html .sitebar, #pricing-first-paint .sitebar');
    if (!bar) return;
    if (bar.dataset.surface) {
      const onScroll = function(){
        if (!bar.isConnected) { window.removeEventListener('scroll', onScroll); return; }
        bar.dataset.scrolled = String(window.scrollY > (bar.dataset.surface === 'landing' ? 50 : 24));
      };
      onScroll();
      window.addEventListener('scroll', onScroll, { passive:true });
    }
    bar.addEventListener('click', function(event){
      if (!event.target.closest('.sitebar-theme')) return;
      const mode = root.dataset.heraTheme === 'dark' ? 'light' : 'dark';
      root.dataset.heraTheme = mode;
      try { localStorage.setItem(key, mode); } catch(e) {}
    });
    document.addEventListener('pointerdown', function dismiss(event){
      if (!bar.isConnected) { document.removeEventListener('pointerdown', dismiss); return; }
      if (!bar.contains(event.target)) bar.querySelectorAll('details[open]').forEach(menu => { menu.open = false; });
    });
    bar.addEventListener('keydown', function(event){
      const menu = event.target.closest('details[open]');
      if (event.key === 'Escape' && menu) { menu.open = false; menu.querySelector('summary').focus(); }
    });
  }, { once:true });
})()</script>`;
export const publicThemeStyle = (
  base: Theme,
): CSSProperties & Record<`--pub-${string}`, string> => {
  const theme = publicAudienceTheme(base, "professional");
  return {
  "--pub-bg": theme.landingCanvas,
  "--pub-warm": theme.surfaceWarm,
  "--pub-surface": theme.surface,
  "--pub-sage": theme.landingProfessional,
  "--pub-text": theme.textPrimary,
  "--pub-muted": theme.textSecondary,
  "--pub-border": theme.landingPanelBorder,
  "--pub-action": theme.actionPrimary,
  "--pub-on-action": theme.actionPrimaryText,
  "--pub-link": theme.actionPrimary,
  "--pub-focus": theme.actionPrimary,
  };
};
const variables = (theme: Theme) =>
  Object.entries(publicThemeStyle(theme))
    .map(([k, v]) => `${k}:${v}`)
    .join(";");
export const publicNavigationCss = `
.public-surface{${variables(lightTheme)};color:var(--pub-text);background:var(--pub-bg);font:16px/1.6 "HeraSans",sans-serif}
html[data-hera-theme=dark] .public-surface{${variables(darkTheme)}}
@media(prefers-color-scheme:dark){html:not([data-hera-theme=light]) .public-surface{${variables(darkTheme)}}}
.public-surface *{box-sizing:border-box}.public-surface a{color:inherit;text-underline-offset:5px}.public-surface :focus-visible{outline:3px solid var(--pub-focus);outline-offset:5px}.pub-header{height:80px;background:var(--pub-bg);position:sticky;top:0;z-index:30;overflow:auto;scrollbar-width:none}.pub-header-inner{height:100%;max-width:1500px;padding:14px 40px;margin:auto;display:flex;align-items:center;justify-content:space-between;gap:18px}.pub-brand{display:block;width:108px;height:46px;flex-shrink:0;background:var(--hera-public-logo) -175.58px -104.63px / 459.26px 258.33px no-repeat}.pub-header a{text-decoration:none}.pub-nav{display:flex;align-items:center;justify-content:center;gap:12px;margin:auto;font-size:14px;flex:1;white-space:nowrap}.pub-nav a,.pub-nav summary{padding:8px 4px;min-height:44px;display:block;white-space:nowrap}.pub-menu{position:relative}.pub-menu summary{cursor:pointer}.pub-menu summary:after{content:"⌄";margin-left:8px}.pub-menu-list{position:absolute;top:100%;left:0;background:var(--pub-surface);border:1px solid var(--pub-border);border-radius:12px;padding:16px 22px;min-width:260px;box-shadow:0 16px 40px #0001}.pub-menu-list a{padding:9px 0}.pub-actions{display:flex;align-items:center;gap:8px;font-size:14px;flex-shrink:0}.pub-button{display:inline-flex;justify-content:center;align-items:center;gap:16px;min-height:48px;padding:12px 22px;border:1px solid transparent;border-radius:8px;background:var(--pub-action);color:var(--pub-on-action)!important;text-decoration:none;font:15px/1.4 "HeraSans-Bold",sans-serif;cursor:pointer}.pub-button.secondary{background:transparent;color:var(--pub-text)!important;border-color:var(--pub-border)}.pub-theme{display:flex;align-items:center;justify-content:center;color:var(--pub-link);border:1px solid var(--pub-border);border-radius:12px;background:var(--pub-surface);width:38px;height:38px;flex-shrink:0}.pub-theme svg{width:17px;height:17px;fill:currentColor}.pub-sun{display:none}html[data-hera-theme=dark] .pub-sun{display:block}html[data-hera-theme=dark] .pub-moon{display:none}.pub-header .pub-brand{width:121.95px;height:52px;background-position:-198.47px -118.25px;background-size:519.16px 292.03px}.pub-access{min-height:44px;padding:10px 18px;font-size:14px;gap:7px}.pub-access svg{width:16px;height:16px;fill:currentColor}.pub-mobile-menu{display:none}.pub-header a:hover{text-decoration:underline}
html[data-hera-theme=dark] .pub-brand{background-image:var(--hera-public-logo-dark)}
@media(prefers-color-scheme:dark){html:not([data-hera-theme=light]) .pub-brand{background-image:var(--hera-public-logo-dark)}}
@media(max-width:1399px){.pub-header-inner{padding-left:16px;padding-right:16px;gap:12px}}
@media(max-width:1279px){.pub-header{height:124px;overflow:hidden}.pub-header-inner{height:auto;padding-bottom:0;display:grid;grid-template-columns:1fr auto;column-gap:12px}.pub-brand{grid-row:1;grid-column:1}.pub-actions{grid-row:1;grid-column:2}.pub-nav{grid-row:2;grid-column:1/-1;justify-content:flex-start;width:100%;overflow-x:auto;scrollbar-width:none;margin:14px 0 0;gap:12px}}
@media(max-width:767px){.pub-header{height:116px}.pub-header-inner{padding:14px 8px 0;column-gap:6px}.pub-header .pub-brand{width:34px;height:34px;background:var(--hera-public-mark) -362.93px -196.49px / 759.07px 426.98px no-repeat}.pub-access{padding:10px;border-radius:8px}.pub-access svg{display:none}}
@media(max-width:767px){html[data-hera-theme=dark] .pub-header .pub-brand{background-image:var(--hera-public-mark-dark);background-size:640px 360px;background-position:-303px -163px}}

`;
export function publicHeaderHtml(): string {
  return publicBarHtml("professional");
}
