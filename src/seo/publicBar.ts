import { professionalHeaderLinks } from "../constants/professionalNavigation";
import { lightTheme, darkTheme } from "../constants/theme";
import { layout, spacing } from "../constants/colors";
import { publicDirectoryTheme } from "../constants/publicAudienceTheme";
import { landingIcons } from "./landingIcons";

type Audience = "patient" | "professional";
const link = (href: string, label: string, style = "") =>
  `<a class="${style}" href="${href}">${label}</a>`;
const features = professionalHeaderLinks.filter(
  (item) => item.route !== "Pricing" && item.route !== "ProfessionalShowcase",
);
const menuLinks = (all: boolean) =>
  (all ? professionalHeaderLinks : features)
    .map((item) =>
      link(
        item.href,
        item.route === "ProfessionalSoftware"
          ? "Software para psicólogos"
          : item.label,
      ),
    )
    .join("");
const group = (label: string, links: string) =>
  `<details class="sitebar-group"><summary>${label}</summary><div class="sitebar-sheet">${links}</div></details>`;

export function publicBarHtml(audience: Audience, signedIn = false, surface?: "landing" | "directory" | "profile",
  { hasLanding = true, hasQuestionnaire = true } = {},
): string {
  const pro = audience === "professional";
  const primary = pro
    ? link(
        "/register?userType=PROFESSIONAL",
        "Crear mi cuenta",
        "sitebar-primary",
      )
    : link("/especialistas", "Buscar psicólogo/a", "sitebar-primary");
  const access = link(
    "/acceso",
    signedIn ? "Mi espacio" : "Acceder",
    signedIn && pro ? "sitebar-primary" : "sitebar-access",
  );
  const theme = `<button type="button" class="sitebar-theme" aria-label="Cambiar tema"><span class="pub-moon">${landingIcons["moon-outline"]}</span><span class="pub-sun">${landingIcons["sunny-outline"]}</span></button>`;
  const proLinks =
    link("/profesionales/recorrido", "HERA por dentro") +
    link("/planes", "Planes y precios");
  const patientLinks = hasLanding ?
    link("/?section=howItWorks", "Cómo funciona") +
    link("/?section=specializations", "Especialidades") : "";
  const help = hasQuestionnaire ? link("/cuestionario", "Ayúdame a elegir") : "";
  const nav = pro
    ? group("Funcionalidades", menuLinks(false)) + proLinks
    : patientLinks + group("Para profesionales", menuLinks(true)) + help;
  const mobile = pro
    ? menuLinks(false) + proLinks
    : patientLinks + help + group("Para profesionales", menuLinks(true));
  return `<header class="sitebar ${pro ? "for-pro" : "for-patient"}"${surface ? ` data-surface="${surface}"` : ""}><div class="sitebar-inner">
    <a class="sitebar-brand" href="/" aria-label="HERA, inicio"></a><nav class="sitebar-wide" aria-label="Navegación principal">${nav}</nav>
    <div class="sitebar-actions"><div class="sitebar-wide">${theme}${signedIn && pro ? "" : access}</div>${signedIn && pro ? access : primary}
    <details class="sitebar-mobile"><summary>Menú</summary><nav class="sitebar-sheet" aria-label="Menú principal">${mobile}${signedIn && pro ? "" : access}${theme}</nav></details></div></div></header>`;
}
const barColors = (dark: boolean) => {
  const t = dark ? darkTheme : lightTheme;
  const patient = publicDirectoryTheme(t);
  return `--bar-bg:${t.surface};--bar-landing:${t.surfaceWarm};--bar-directory:${patient.bgMuted};--bar-fg:${t.textPrimary};--bar-patient-ink:${dark ? t.textPrimary : t.primaryDark};--bar-line:${t.borderLight};--bar-pro:${dark ? t.secondaryLight : t.actionPrimary};--bar-blue:${patient.actionPrimary};--bar-on:${t.actionPrimaryText};--bar-shadow:${t.shadowNeutral}`;
};
export const publicBarCss = `
:root{--hera-landing-inset:max(40px,calc((100% - 1420px)/2));--hera-profile-inset:${spacing.xxl}px}
#pricing-scroll-view{scrollbar-width:thin;scrollbar-gutter:stable}
@media(width < 768px){:root{--hera-profile-inset:${spacing.lg}px}}
@media(max-width:767px){:root{--hera-landing-inset:20px}}
.sitebar{${barColors(false)};--bar-accent:var(--bar-blue);position:relative;z-index:31;background:var(--bar-bg);color:var(--bar-fg);box-shadow:0 5px 18px -10px var(--bar-shadow),0 1px 0 var(--bar-line);font:16px/1.3 HeraSans,sans-serif}
.sitebar[data-surface]{box-shadow:none}
.sitebar[data-surface=landing]{background:var(--bar-landing)}
.sitebar[data-surface=directory]{background:var(--bar-directory)}
.sitebar[data-surface=profile],.seo-page.profile-page{background:${lightTheme.bgMuted}}
html[data-hera-theme=dark] :is(.sitebar[data-surface=profile],.seo-page.profile-page){background:${darkTheme.bgMuted}}
@media(prefers-color-scheme:dark){html:not([data-hera-theme=light]) :is(.sitebar[data-surface=profile],.seo-page.profile-page){background:${darkTheme.bgMuted}}}
[data-scrolled=true]>.sitebar[data-surface],.sitebar[data-surface][data-scrolled=true]{box-shadow:0 4px 14px -8px var(--bar-shadow),0 1px 0 var(--bar-line)}
.sitebar[data-surface] .sitebar-inner{max-width:none;padding-inline:0}
.sitebar[data-surface=landing] .sitebar-inner,.sitebar.for-pro .sitebar-inner{max-width:none;padding-inline:var(--hera-landing-inset)}
.sitebar[data-surface=directory] .sitebar-inner{width:min(calc(100% - 64px),1680px)}
.sitebar[data-surface=profile] .sitebar-inner,.profile-page>.seo-main{width:calc(100% - 2 * var(--hera-profile-inset));max-width:${layout.profileMaxWidth}px;padding-inline:0}
.profile-page>.sitebar{position:sticky;top:0}
@media(max-width:1179px){.sitebar[data-surface=directory] .sitebar-inner{width:calc(100% - 40px)}}
.sitebar.for-pro{--bar-accent:var(--bar-pro)}
.sitebar.for-patient{--bar-fg:var(--bar-patient-ink)}
html[data-hera-theme=dark] .sitebar{${barColors(true)}}
@media(prefers-color-scheme:dark){html:not([data-hera-theme=light]) .sitebar{${barColors(true)}}}
.sitebar *{box-sizing:border-box}.sitebar-inner{max-width:1280px;margin:auto;padding:0 32px;height:74px;display:flex;align-items:center;gap:28px}
.sitebar .sitebar-brand{width:111px;height:46px;flex:none;padding:0;background:var(--hera-public-logo) -176px -105px/459px 258px no-repeat}
html[data-hera-theme=dark] .sitebar .sitebar-brand{background-image:var(--hera-public-logo-dark)}
@media(prefers-color-scheme:dark){html:not([data-hera-theme=light]) .sitebar .sitebar-brand{background-image:var(--hera-public-logo-dark)}}
.sitebar.for-pro .sitebar-brand{background:var(--bar-pro);mask:var(--hera-public-logo) -176px -105px/459px 258px no-repeat}
.sitebar-wide,.sitebar-actions{display:flex;align-items:center;gap:12px}.sitebar-inner>nav{margin-left:auto}.sitebar-actions{margin-left:auto}
.sitebar a,.sitebar summary,.sitebar button{display:inline-flex;align-items:center;justify-content:center;color:var(--bar-fg);background:transparent;font:inherit;text-decoration:none;border:1px solid transparent;cursor:pointer;min-height:44px;padding:6px 9px;white-space:nowrap;border-radius:12px}
.sitebar summary{list-style:none}.sitebar summary::-webkit-details-marker{display:none}.sitebar summary::after{content:"";width:6px;height:6px;border:solid currentColor;border-width:0 1.5px 1.5px 0;transform:rotate(45deg);margin:-3px 0 0 9px}
.sitebar .sitebar-primary,.sitebar .sitebar-access{padding-inline:18px;border-radius:24px;font-family:HeraSans-Bold,sans-serif}
.sitebar .sitebar-primary{background:var(--bar-accent);color:var(--bar-on)}.sitebar .sitebar-access,.sitebar-mobile>summary{border-color:var(--bar-line)}
.sitebar-theme svg{width:18px;height:18px;fill:currentColor;display:block}.sitebar-theme .pub-sun{display:none}html[data-hera-theme=dark] .sitebar-theme .pub-sun{display:inline}html[data-hera-theme=dark] .sitebar-theme .pub-moon{display:none}
.sitebar details{position:relative}.sitebar .sitebar-sheet{position:absolute;top:calc(100% + 4px);left:0;z-index:2;display:grid;min-width:220px;padding:8px;background:var(--bar-bg);border:1px solid var(--bar-line);border-radius:14px;box-shadow:0 12px 30px var(--bar-shadow)}
.sitebar details:not([open])>.sitebar-sheet{display:none}.sitebar .sitebar-sheet a,.sitebar .sitebar-sheet button{justify-content:flex-start}.sitebar-mobile{display:none}
.sitebar :focus-visible{outline:2px solid var(--bar-accent);outline-offset:2px}
@media(hover:hover){.lh-door .lh-button:hover,[data-testid="landing-hero"] :is(a,[role=button]):hover{filter:brightness(.94);box-shadow:0 2px 8px #0001}.sitebar :is(a,summary,button):hover{background-color:color-mix(in srgb,var(--bar-accent) 8%,transparent)}.sitebar .sitebar-primary:hover{background-color:color-mix(in srgb,var(--bar-accent) 90%,black);box-shadow:0 3px 8px var(--bar-shadow)}}
.sitebar :is(a,button):active{opacity:.83}
.lh-page>.sitebar,.di-page>.sitebar,.psychology-page>.sitebar{position:fixed;inset:0 0 auto}
.lh-page>.sitebar,.di-page>.sitebar{position:sticky;inset:auto;top:0;margin-bottom:-74px}
@media(max-width:1039px){.lh-page>.sitebar,.di-page>.sitebar{margin-bottom:-64px}}
.pro-mounted .pro-page>.sitebar{visibility:hidden;pointer-events:none}
@media(max-width:1039px){.sitebar-inner{height:64px}}
@media(max-width:1199px){.sitebar-inner{padding-inline:16px;gap:8px}.sitebar .sitebar-wide{display:none}.sitebar-mobile{display:block}.sitebar.for-pro .sitebar-brand{mask-size:350px 197px;mask-position:-134px -79px}.sitebar-actions{gap:6px}.sitebar .sitebar-brand{width:84px;height:40px;background-size:350px 197px;background-position:-134px -79px}.sitebar a,.sitebar summary,.sitebar button{font-size:14px}.sitebar .sitebar-primary{padding-inline:13px}.sitebar-mobile>.sitebar-sheet{left:auto;right:0;width:min(296px,calc(100vw - 30px));max-height:calc(100dvh - 76px);overflow:auto}.sitebar-mobile .sitebar-group>.sitebar-sheet{position:static;border:0;border-left:2px solid var(--bar-line);border-radius:0;box-shadow:none;margin-left:12px}.sitebar .sitebar-sheet .sitebar-access{border:0}}
@media(max-width:374px){.sitebar .sitebar-brand{width:36px;background:var(--hera-public-mark) -363px -193px/759px 427px no-repeat}.sitebar.for-pro .sitebar-brand{background:var(--bar-pro);mask:var(--hera-public-mark) -363px -193px/759px 427px no-repeat}html[data-hera-theme=dark] .sitebar.for-patient .sitebar-brand{background-image:var(--hera-public-mark-dark);background-position:-303px -160px;background-size:640px 360px}.sitebar .sitebar-primary{padding-inline:8px}}
`;
