import { darkTheme, lightTheme, type Theme } from "../constants/theme";
import type { CSSProperties } from "react";
import { landingIcons } from "./landingIcons";
import { professionalHeaderLinks } from "../constants/professionalNavigation";
export { professionalHeaderLinks } from "../constants/professionalNavigation";

export const professionalNavigation = professionalHeaderLinks.slice(1, 4);
export const patientNavigation = [
  { href: "/especialistas", label: "Psicólogos/as" },
  { href: "/?section=howItWorks", label: "Cómo funciona" },
  { href: "/?section=specializations", label: "Especialidades" },
  { href: "/software-para-psicologos", label: "Para profesionales" },
] as const;
export const publicThemeBoot = `<script>try{var m=localStorage.getItem('hera_theme_mode');document.documentElement.setAttribute('data-hera-theme',m==='dark'||m==='light'?m:matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light')}catch(e){}</script>`;
export const publicThemeStyle = (
  theme: Theme,
): CSSProperties & Record<`--pub-${string}`, string> => ({
  "--pub-bg": theme.landingCanvas,
  "--pub-warm": theme.surfaceWarm,
  "--pub-surface": theme.surface,
  "--pub-sage": theme.landingProfessional,
  "--pub-text": theme.textPrimary,
  "--pub-muted": theme.textSecondary,
  "--pub-border": theme.landingPanelBorder,
  "--pub-action": theme.actionPrimary,
  "--pub-on-action": theme.actionPrimaryText,
  "--pub-link": theme.primary,
  "--pub-focus": theme.focus,
});
const variables = (theme: Theme) =>
  Object.entries(publicThemeStyle(theme))
    .map(([k, v]) => `${k}:${v}`)
    .join(";");
export const publicNavigationCss = `
.public-surface{${variables(lightTheme)};color:var(--pub-text);background:var(--pub-bg);font:16px/1.6 "HeraSans",sans-serif}
html[data-hera-theme=dark] .public-surface{${variables(darkTheme)}}
@media(prefers-color-scheme:dark){html:not([data-hera-theme=light]) .public-surface{${variables(darkTheme)}}}
.public-surface *{box-sizing:border-box}.public-surface a{color:inherit;text-underline-offset:5px}.public-surface :focus-visible{outline:3px solid var(--pub-focus);outline-offset:5px}.pub-header{height:80px;background:var(--pub-bg);position:sticky;top:0;z-index:30;overflow:auto;scrollbar-width:none}.pub-header-inner{height:100%;max-width:1500px;padding:14px 40px;margin:auto;display:flex;align-items:center;justify-content:space-between;gap:18px}.pub-brand{display:block;width:108px;height:46px;flex-shrink:0;background:var(--hera-public-logo) -175.58px -104.63px / 459.26px 258.33px no-repeat}.pub-header a{text-decoration:none}.pub-nav{display:flex;align-items:center;justify-content:center;gap:12px;margin:auto;font-size:14px;flex:1;white-space:nowrap}.pub-nav a,.pub-nav summary{padding:8px 4px;min-height:44px;display:block;white-space:nowrap}.pub-menu{position:relative}.pub-menu summary{cursor:pointer}.pub-menu summary:after{content:"⌄";margin-left:8px}.pub-menu-list{position:absolute;top:100%;left:0;background:var(--pub-surface);border:1px solid var(--pub-border);border-radius:12px;padding:16px 22px;min-width:260px;box-shadow:0 16px 40px #0001}.pub-menu-list a{padding:9px 0}.pub-actions{display:flex;align-items:center;gap:8px;font-size:14px;flex-shrink:0}.pub-button{display:inline-flex;justify-content:center;align-items:center;gap:16px;min-height:48px;padding:12px 22px;border:1px solid transparent;border-radius:8px;background:var(--pub-action);color:var(--pub-on-action)!important;text-decoration:none;font:15px/1.4 "HeraSans-Bold",sans-serif;cursor:pointer}.pub-button.secondary{background:transparent;color:var(--pub-text)!important;border-color:var(--pub-border)}.pub-theme{display:flex;align-items:center;justify-content:center;color:var(--pub-link);border:1px solid var(--pub-border);border-radius:12px;background:var(--pub-surface);width:38px;height:38px;flex-shrink:0}.pub-theme svg{width:17px;height:17px;fill:currentColor}.pub-sun{display:none}html[data-hera-theme=dark] .pub-sun{display:block}html[data-hera-theme=dark] .pub-moon{display:none}.pub-header .pub-brand{width:121.95px;height:52px;background-position:-198.47px -118.25px;background-size:519.16px 292.03px}.pub-access{min-height:44px;padding:10px 18px;font-size:14px;gap:7px}.pub-access svg{width:16px;height:16px;fill:currentColor}.pub-mobile-menu{display:none}.pub-header a:hover,.pub-footer a:hover{text-decoration:underline}.pub-footer{border-top:1px solid var(--pub-border);padding:48px max(24px,calc((100% - 1240px)/2));display:grid;grid-template-columns:1.4fr 1fr 1fr;gap:40px;background:var(--pub-warm);font-size:14px}.pub-footer p{max-width:300px;color:var(--pub-muted)}.pub-footer nav{display:flex;flex-direction:column;gap:12px}.pub-footer strong{font-family:"HeraSans-Bold",sans-serif}.pub-footer a{text-decoration:none}.pub-footer .pub-legal{grid-column:1/-1;flex-direction:row;flex-wrap:wrap;padding-top:24px;border-top:1px solid var(--pub-border);gap:24px}
html[data-hera-theme=dark] .pub-brand{background-image:var(--hera-public-logo-dark)}
@media(prefers-color-scheme:dark){html:not([data-hera-theme=light]) .pub-brand{background-image:var(--hera-public-logo-dark)}}
@media(max-width:1399px){.pub-header-inner{padding-left:16px;padding-right:16px;gap:12px}}
@media(max-width:1279px){.pub-header{height:124px;overflow:hidden}.pub-header-inner{height:auto;padding-bottom:0;display:grid;grid-template-columns:1fr auto;column-gap:12px}.pub-brand{grid-row:1;grid-column:1}.pub-actions{grid-row:1;grid-column:2}.pub-nav{grid-row:2;grid-column:1/-1;justify-content:flex-start;width:100%;overflow-x:auto;scrollbar-width:none;margin:14px 0 0;gap:12px}}
@media(max-width:767px){.pub-header{height:116px}.pub-header-inner{padding:14px 8px 0;column-gap:6px}.pub-header .pub-brand{width:34px;height:34px;background:var(--hera-public-mark) -362.93px -196.49px / 759.07px 426.98px no-repeat}.pub-access{padding:10px;border-radius:8px}.pub-access svg{display:none}.pub-footer{grid-template-columns:1fr;gap:28px;padding:36px 24px}.pub-footer .pub-legal{grid-column:auto}}
@media(max-width:767px){html[data-hera-theme=dark] .pub-header .pub-brand{background-image:var(--hera-public-mark-dark);background-size:640px 360px;background-position:-303px -163px}}

`;
export function publicHeaderHtml(): string {
  return `<header class="pub-header public-surface"><div class="pub-header-inner"><a class="pub-brand" href="/" aria-label="HERA, inicio"></a><nav class="pub-nav" aria-label="Navegación principal">${professionalHeaderLinks.map((item) => '<a href="' + item.href + '">' + item.label + "</a>").join("")}</nav><div class="pub-actions"><span class="pub-theme" aria-hidden="true"><span class="pub-moon">${landingIcons["moon-outline"]}</span><span class="pub-sun">${landingIcons["sunny-outline"]}</span></span><a class="pub-button pub-access" href="/acceso">Acceder ${landingIcons["arrow-forward"]}</a></div></div></header>`;
}
export const professionalFooterHtml = `<footer class="pub-footer"><div><a class="pub-brand" href="/" aria-label="HERA, inicio"></a><p>Un espacio para cuidar de las personas y de tu forma de trabajar.</p></div><nav aria-label="Para profesionales"><strong>Tu consulta</strong><a href="/software-para-psicologos">Software para psicólogos</a>${professionalNavigation.map((item) => `<a href="${item.href}">${item.label}</a>`).join("")}</nav><nav aria-label="Conoce HERA"><strong>Conoce HERA</strong><a href="/profesionales/recorrido">HERA por dentro</a><a href="/planes">Planes y precios</a><a href="/especialistas">Buscar psicólogo/a</a><a href="/acceso">Acceder a mi cuenta</a></nav><nav class="pub-legal" aria-label="Información legal"><a href="/legal/privacidad">Privacidad</a><a href="/legal/terminos">Condiciones de uso</a><a href="/legal/cookies">Cookies</a><span>HERA · Psicología y consulta</span></nav></footer>`;
