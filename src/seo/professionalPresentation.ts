import { landingIcons } from "./landingIcons";
import {
  professionalPages,
  marketingCaptures,
  type MarketingCapture,
  type ProfessionalPageId,
} from "./professionalContent";
import {
  publicNavigationCss,
  publicHeaderHtml,
} from "./publicNavigation";

const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ] || c,
  );
export const capturePath = (
  id: MarketingCapture,
  theme: "light" | "dark",
  size: 960 | 1600 = 1600,
) => `/marketing/product/${id}-${theme}-${size}.webp`;
export function captureHtml(
  id: MarketingCapture,
  label: string,
  eager = false,
  tour = false,
): string {
  const images = (["light", "dark"] as const)
    .map(
      (theme) =>
        `<img class="pro-shot-${theme}" src="${capturePath(id, theme)}" srcset="${capturePath(id, theme, 960)} 960w, ${capturePath(id, theme)} 1600w" sizes="${tour ? "(max-width:1039px) 95vw, min(80vw, 1196px)" : "(max-width:760px) calc(100vw - 40px), min(60vw, 760px)"}" alt="${escape(label)} — HERA con datos de demostración" width="1600" height="1000" ${eager ? 'fetchpriority="high" loading="lazy"' : 'loading="lazy"'} decoding="async">`,
    )
    .join("");
  return `<figure class="pro-capture"><a href="${capturePath(id, "light")}" data-capture="${id}" aria-label="Ampliar: ${escape(label)}">${images}<span class="pro-enlarge" aria-hidden="true">↗ Ampliar</span></a><figcaption>${escape(label)} <span>Datos de demostración</span></figcaption></figure>`;
}
const tourSelectionCss = marketingCaptures
  .map(
    (shot) =>
      `.pro-page[data-tour-selection="tour-${shot.id}"] #tour-${shot.id}{display:block}.pro-page:not([data-tour-selection]):has(#tour-${shot.id}:target) .pro-tour-nav a[href="#tour-${shot.id}"],.pro-page[data-tour-selection="tour-${shot.id}"] .pro-tour-nav a[href="#tour-${shot.id}"]{background:var(--pub-sage);border-color:var(--pub-link);font-family:"HeraSans-Bold",sans-serif}`,
  )
  .join("");
export const directoryCapturePath = (layout: "desktop" | "mobile" | "detail", theme: "light" | "dark") =>
  `/marketing/product/directory-${layout}-${theme}.webp`;

const directoryImages = (theme: "light" | "dark") => (["desktop", "mobile", "detail"] as const)
  .map(layout => `--directory-${layout}:url('${directoryCapturePath(layout, theme)}')`).join(";");

export const professionalCss =
  publicNavigationCss +
  tourSelectionCss +
  `
html:has(#hera-public-html .pro-page),.pro-mounted{scrollbar-width:thin;scrollbar-gutter:stable}
.pro-hero + .pro-section{
  background:var(--pub-warm);
  box-shadow:0 0 0 100vmax var(--pub-warm);
  clip-path:inset(0 -100vmax);
}
.pro-page:not(.pro-tour) .pro-closing{max-width:none;background:var(--pub-sage);padding:40px 48px;margin:40px 0 64px;border-radius:18px}
.pro-page:not(.pro-tour) .pro-closing h2,.pro-page:not(.pro-tour) .pro-closing>p{max-width:720px}
@media(max-width:760px){.pro-page:not(.pro-tour) .pro-closing{padding:28px 24px;margin:28px 0 40px;border-radius:16px}}
.pro-page[data-tour-selection] .pro-tour-panels .pro-tour-step[id]{display:none}
.pro-page:not([data-tour-selection]):not(:has(.pro-tour-step:target)) .pro-tour-nav a:first-child{background:var(--pub-sage);border-color:var(--pub-link);font-family:"HeraSans-Bold",sans-serif}

.pro-mounted .pro-page>.pub-header{visibility:hidden;pointer-events:none}.pro-page{min-height:100vh}.pro-page main{padding:0 var(--hera-landing-inset)}.pro-page h1,.pro-page h2{font-family:"HeraDisplay",Georgia,serif;font-weight:400;letter-spacing:-.035em;line-height:1.14}.pro-page h1{font-size:clamp(32px,3.1vw,42px);margin:16px 0 20px}.pro-page h2{font-size:clamp(30px,3vw,43px);margin:16px 0 22px}.pro-page h3{font:22px/1.35 "HeraSans-Bold",sans-serif;margin:0 0 16px}.pro-page p{color:var(--pub-muted);margin:0 0 20px}.pro-page ul{padding-left:21px;color:var(--pub-muted)}.pro-page li{padding:5px 0}.pro-eyebrow{font:12px/1.5 "HeraSans-Bold",sans-serif;text-transform:uppercase;letter-spacing:.12em;color:var(--pub-link)}.pro-breadcrumb{font-size:13px;display:flex;gap:10px;padding-top:24px;color:var(--pub-muted);flex-wrap:wrap}.pro-breadcrumb a{text-decoration:none}.pro-hero{display:grid;grid-template-columns:minmax(0,.8fr) minmax(0,1.2fr);gap:48px;align-items:center;padding:44px 0 52px}.pro-hero-copy{display:block;min-width:0}.pro-hero-copy>div:first-child{max-width:730px}.pro-hero-copy p{font-size:18px;line-height:1.6;max-width:480px}.pro-actions{display:flex;gap:12px;flex-wrap:wrap;margin:28px 0 12px}.pro-note{font-size:13px!important}.pro-capture{margin:0;min-width:0}.pro-capture>a{display:block;position:relative;background:var(--pub-sage);padding:14px;border:1px solid var(--pub-border);border-radius:16px;overflow:hidden}.pro-capture img{width:100%;height:auto;aspect-ratio:8/5;object-fit:contain;display:block;border-radius:7px}.pro-capture .pro-shot-dark{display:none}.pro-capture figcaption{font-size:13px;display:flex;justify-content:space-between;gap:16px;padding:12px 3px;color:var(--pub-muted)}.pro-capture figcaption span{white-space:nowrap}.pro-enlarge{position:absolute;bottom:24px;right:24px;background:var(--pub-surface);padding:7px 12px;border:1px solid var(--pub-border);border-radius:6px;font-size:12px;color:var(--pub-text)}.pro-section{display:grid;grid-template-columns:minmax(250px,.8fr) minmax(0,1.3fr);align-items:center;gap:64px;padding:76px 0;border-bottom:1px solid var(--pub-border)}.pro-section:nth-child(even){grid-template-columns:minmax(0,1.3fr) minmax(250px,.8fr)}.pro-section:nth-child(even) .pro-section-copy{order:2}.pro-section p{max-width:540px}.pro-section .pro-capture>a{padding:8px}.pro-section .pro-capture figcaption{font-size:11px}.pro-section.no-image{display:block;padding:50px;max-width:100%;background:var(--pub-sage);border:0;border-radius:16px;margin:64px 0}.pro-section.no-image p{max-width:730px}.pro-text-link{display:inline-block;min-height:44px;padding:10px 0;font-family:"HeraSans-Bold",sans-serif;color:var(--pub-link)!important;text-decoration:none}.pro-faq{max-width:900px;margin:70px auto}.pro-faq details{padding:22px 0;border-bottom:1px solid var(--pub-border)}.pro-faq summary{cursor:pointer;font-family:"HeraSans-Bold",sans-serif;padding-right:20px}.pro-faq details p{margin:16px 0 0}.pro-closing{padding:56px 0 80px;max-width:800px}
.pro-tour-intro{display:flex;align-items:center;justify-content:space-between;gap:32px;margin:16px 0 18px}
.pro-tour-intro h1{font-size:clamp(28px,2.6vw,36px);margin:6px 0 0}
.pro-tour-intro p{max-width:510px;font-size:15px;line-height:1.6;margin:0}
.pro-tour-workspace{display:grid;grid-template-columns:224px minmax(0,1fr);border:1px solid var(--pub-border);border-radius:18px;overflow:hidden;background:var(--pub-surface)}
.pro-tour-rail{background:var(--pub-sage);padding:16px 14px;border-right:1px solid var(--pub-border)}
.pro-tour-rail>.pro-eyebrow{display:block;margin:0 12px 14px;font-size:10px;color:var(--pub-muted)}
.pro-tour-nav{display:flex;flex-direction:column;gap:5px}
.pro-tour-nav a{min-height:48px;display:flex;align-items:center;gap:12px;padding:10px 12px;border:1px solid transparent;border-radius:9px;text-decoration:none;font-size:14px;line-height:1.35}
.pro-tour-nav a:hover{background:var(--pub-surface)}
.pro-tour-number{font:11px/1.4 "HeraSans-Bold",sans-serif;color:var(--pub-link);opacity:.75}
.pro-tour-panels{min-width:0;padding:18px 22px 6px}
.pro-tour-panels .pro-tour-step{display:none}
.pro-tour-panels .pro-tour-step:first-child{display:block}
.pro-page:not([data-tour-selection]) .pro-tour-panels:has(.pro-tour-step:target) .pro-tour-step{display:none}
.pro-page:not([data-tour-selection]) .pro-tour-panels:has(.pro-tour-step:target) .pro-tour-step:target{display:block}
.pro-tour-step{scroll-margin-top:104px}
.pro-tour-step h2{font-size:26px;line-height:1.2;margin:0 0 5px}
.pro-tour-step>p{font-size:14px;line-height:1.5;margin:0 0 14px;min-height:21px}
.pro-tour-step .pro-capture>a{padding:8px;border-radius:10px}
.pro-tour-step .pro-capture img{width:100%;height:auto;aspect-ratio:8/5}
.pro-tour-step .pro-capture figcaption{display:none}
.pro-tour-step .pro-enlarge{bottom:18px;right:18px}
.pro-tour .pro-closing{padding:36px 0 56px}
.pro-dialog{max-width:min(96vw,1600px);width:96vw;padding:20px;border:1px solid var(--pub-border);border-radius:12px;background:var(--pub-bg);color:var(--pub-text)}.pro-dialog::backdrop{background:#101c19d9}.pro-dialog img{display:block;width:100%;height:auto;max-height:80vh;object-fit:contain}.pro-dialog button{display:block;margin:0 0 14px auto}.pro-dialog p{margin:8px 0 0;font-size:13px}
html[data-hera-theme=dark] .pro-capture .pro-shot-light{display:none}html[data-hera-theme=dark] .pro-capture .pro-shot-dark{display:block}
@media(prefers-color-scheme:dark){html:not([data-hera-theme=light]) .pro-capture .pro-shot-light{display:none}html:not([data-hera-theme=light]) .pro-capture .pro-shot-dark{display:block}}

@media(min-width:1040px){
  .pro-tour-step .pro-capture>a{width:fit-content;max-width:100%;margin-inline:auto}
  .pro-tour-step .pro-capture img{width:auto;max-width:100%;max-height:clamp(260px,calc(100svh - 310px),1000px)}
}
@media(max-width:1279px){.pro-tour-step{scroll-margin-top:148px}}
@media(max-width:1039px){.pro-tour-intro{display:block;margin:18px 0 20px}.pro-tour-intro h1{margin:6px 0 10px}.pro-tour-intro p{font-size:14px}
.pro-tour-workspace{display:block;border-radius:12px}.pro-tour-rail{padding:10px;border-right:0;border-bottom:1px solid var(--pub-border)}.pro-tour-rail>.pro-eyebrow,.pro-tour-rail>p{display:none}
.pro-tour-nav{flex-direction:row;overflow-x:auto;gap:5px;scrollbar-width:thin}.pro-tour-nav a{flex:none;white-space:nowrap;min-height:44px;padding:8px 10px;font-size:13px;gap:7px}
.pro-tour-panels{padding:16px 10px 4px}.pro-tour-step{scroll-margin-top:132px}.pro-tour-step h2{font-size:24px}.pro-tour-step>p{min-height:42px}.pro-tour-step .pro-capture img{height:auto;aspect-ratio:8/5}.pro-tour-step .pro-capture>a{padding:4px}.pro-tour-step .pro-enlarge{bottom:10px;right:10px}
}
@media(max-width:1000px){.pro-hero{gap:28px}.pro-section,.pro-section:nth-child(even){gap:32px;grid-template-columns:1fr 1.2fr}}
@media(max-width:760px){.pro-hero{padding:20px 0 36px;grid-template-columns:1fr;gap:24px}.pro-hero-copy{margin:0}.pro-hero-copy p{font-size:16px;line-height:1.6}.pro-page h1{margin-top:14px}.pro-section,.pro-section:nth-child(even){grid-template-columns:1fr;gap:24px;padding:44px 0}.pro-section:nth-child(even) .pro-section-copy{order:0}.pro-capture>a{padding:6px;border-radius:9px}.pro-capture figcaption{font-size:11px;flex-wrap:wrap;gap:2px}.pro-enlarge{bottom:14px;right:14px;padding:4px 8px}.pro-section.no-image{padding:30px 24px;margin:40px 0}.pro-faq{margin:44px auto}.pro-actions .pub-button{width:100%}
.pro-dialog{padding:12px}.pro-closing{padding:30px 0 56px}}

.pro-hero{grid-template-columns:repeat(2,minmax(0,1fr));gap:clamp(30px,5vw,82px);align-items:start;padding:32px 0 clamp(32px,4vw,56px)}
.pro-hero h1{font-size:clamp(36px,3.25vw,46px);max-width:23ch;line-height:1.12;letter-spacing:-.045em;text-wrap:balance}
.pro-hero-copy strong{color:var(--pub-text);font-family:HeraSans-Bold,sans-serif;font-weight:400}
.pro-hero-copy .pro-terms{display:inline-flex;align-items:center;min-height:40px;font-size:14px;color:var(--pub-link)}
.pro-hero .pro-actions{margin:22px 0 0;gap:10px}
.pro-page .pro-actions .pub-button{border-radius:12px;padding-inline:18px}
.pro-actions .pub-button:hover,.pro-text-link:hover{text-decoration:underline}
.pro-preview{margin:0;min-width:0;width:min(100%,640px);justify-self:end}
.pro-profile{background:var(--pub-surface);border:1px solid var(--pub-border);border-radius:16px;box-shadow:0 10px 26px rgb(24 49 35 / 9%);overflow:hidden}
.pro-profile-heading,.pro-window-title{display:flex;align-items:center;gap:10px;padding:12px 20px;color:var(--pub-muted);font-size:14px;border-bottom:1px solid var(--pub-border)}
.pro-wordmark{font:25px/1.2 HeraDisplay,Georgia,serif;color:var(--pub-link);padding-right:12px;border-right:1px solid var(--pub-border)}
.pro-profile-body{display:flex;gap:clamp(12px,2vw,24px);align-items:center;padding:18px}
.pro-profile-body img{display:block;width:32%;height:auto;aspect-ratio:4/5;object-fit:cover;border-radius:9px}
.pro-profile-body strong,.pro-invoice strong{display:block;font:clamp(24px,2.4vw,36px)/1.15 HeraDisplay,Georgia,serif;letter-spacing:-.035em}
.pro-profile-body p{margin:4px 0 16px}
.pro-modality,.pro-window-title{display:flex;align-items:center;gap:8px;color:var(--pub-text)}
.pro-modality,.pro-specialties{font-size:14px}.pro-specialties{display:block;margin-top:5px;color:var(--pub-muted)}
.pro-preview svg,.pro-path-icon svg{flex:none;width:18px;height:18px;fill:currentColor;color:var(--pub-link)}
.pro-detail{display:block;background-image:var(--shot-light);background-size:100% 100%;background-repeat:no-repeat;cursor:zoom-in}
html[data-hera-theme=dark] .pro-detail{background-image:var(--shot-dark)}
@media(prefers-color-scheme:dark){html:not([data-hera-theme=light]) .pro-detail{background-image:var(--shot-dark)}}
.pro-preview .pro-detail:focus-visible{outline-offset:-4px}
.pro-preview figcaption{display:flex;justify-content:space-between;flex-wrap:wrap;gap:4px 12px;padding:9px 4px 0;color:var(--pub-muted);font-size:12px}
.pro-window-title{font-family:HeraSans-Bold,sans-serif}.pro-preview .pro-detail{margin:10px}.pro-preview figcaption a{color:var(--pub-link);text-underline-offset:3px}
.pro-invoice{margin:16px;padding:20px;border:1px solid var(--pub-border);border-radius:10px}.pro-invoice>span{font-size:14px;color:var(--pub-muted)}
.pro-invoice strong{font-size:28px;margin:6px 0 10px}.pro-invoice>div{display:flex;align-items:center;justify-content:space-between;gap:8px}.pro-invoice b{font:13px HeraSans-Bold,sans-serif;color:var(--pub-text);background:var(--pub-warm);padding:6px 10px;border-radius:6px}
@media(max-width:760px){
  .pro-hero{grid-template-columns:minmax(0,1fr);gap:18px;padding:20px 0 32px}
  .pro-hero h1{font-size:32px;margin:8px 0 12px}
  .pro-hero-copy p{margin-bottom:6px;line-height:1.45}.pro-hero .pro-actions{margin-top:14px}
  .pro-hero .pro-actions .secondary{background:none;border-color:transparent;text-decoration:underline;min-height:40px}

  .pro-hero-copy{display:grid;grid-template-columns:auto auto;align-items:center;justify-content:start;column-gap:16px}
  .pro-hero-copy>:is(.pro-eyebrow,h1,p),.pro-hero-copy .pub-button:first-child{grid-column:1/-1}
  .pro-hero-copy .pro-actions{display:contents}.pro-hero-copy .pub-button:first-child{margin-top:8px}
  .pro-hero-copy .pro-actions .secondary{font-size:14px;padding:8px 0;justify-content:flex-start;width:auto}
  .pro-hero-copy .pro-terms{min-height:44px}
  .pro-preview{justify-self:start}.pro-profile-heading,.pro-window-title{padding:9px 12px}
  .pro-profile-body{padding:12px;gap:12px}.pro-profile-body p{font-size:14px;margin-bottom:8px}
  .pro-profile-body strong{font-size:24px}.pro-modality,.pro-specialties{font-size:13px}
  .pro-preview figcaption{font-size:11px}
}

.product-demo{min-width:0;margin:0;color:var(--pub-text)}
.product-demo figcaption{margin-top:14px;color:var(--pub-muted);font-size:12px;text-align:right}
.demo-controls{visibility:hidden;display:flex;align-items:center;gap:6px;margin-bottom:14px}
.product-demo[data-ready] .demo-controls{visibility:visible}
.demo-controls button{cursor:pointer;color:var(--pub-text);background:var(--pub-surface);border:1px solid var(--pub-border);border-radius:24px;padding:8px 15px;font:14px HeraSans-Bold,sans-serif;min-height:38px}
.demo-controls button[aria-pressed=true]{background:var(--pub-action);color:var(--pub-on-action);border-color:transparent}
.demo-controls .demo-play{margin-left:auto;width:40px;padding:0;font:16px/1 sans-serif}
.demo-window,.choice-card{border:1px solid var(--pub-border);background:var(--pub-surface);border-radius:18px;box-shadow:0 16px 30px -18px rgb(26 52 39 / 32%),0 2px 7px rgb(26 52 39 / 6%);overflow:hidden}
.demo-bar{display:flex;align-items:center;gap:12px;border-bottom:1px solid var(--pub-border);padding:13px 21px;font:14px HeraSans,sans-serif;color:var(--pub-muted)}
.demo-bar svg{width:17px;height:17px;fill:currentColor}.window-dots{letter-spacing:2px;color:var(--pub-border);font-size:10px}.demo-example{margin-left:auto}
.demo-frame{display:grid}.demo-frame>[data-panel]{grid-area:1/1;align-self:center}.demo-frame>[hidden]{display:block;visibility:hidden;pointer-events:none}
.demo-frame>[hidden] .pro-detail{background-image:none}
@media(prefers-reduced-motion:no-preference){
  .product-demo[data-changing] [data-panel]:not([hidden]){animation:demo-reveal .2s ease-out}
  @keyframes demo-reveal{from{opacity:.86;transform:translateY(2px)}to{opacity:1;transform:none}}
}
.profile-demo,.demo-agenda{padding:clamp(18px,2.5vw,34px)}
.profile-person{display:flex;align-items:center;gap:20px}.profile-person img{width:84px;height:94px;border-radius:14px;object-fit:cover;object-position:50% 28%}
.profile-person strong{font:26px/1.2 HeraSans-Bold,sans-serif}.pro-page .profile-person p{margin:3px 0}.profile-person small{color:var(--pub-muted);font-size:14px}.pro-page .profile-demo>p{margin:16px 0}
.profile-foot{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:center;font-size:14px}.profile-foot span{background:var(--pub-sage);border-radius:8px;padding:5px 10px}
.demo-agenda>strong{display:block;margin-bottom:10px}.demo-agenda .pro-detail{max-width:430px;border-radius:10px}.demo-agenda p{margin:10px 0 0;font-size:14px}
.pro-choices{display:grid;grid-template-columns:1fr 1fr;gap:24px;padding:0 0 44px}.choice-card{display:flex;flex-direction:column;text-decoration:none!important;transition:transform .15s,box-shadow .15s}
.choice-art{height:144px;display:grid;place-items:center;overflow:hidden;background:var(--pub-sage);padding:12px 9%}
.directory-shot,.choice-directory{display:block;background-position:center;background-repeat:no-repeat;background-size:cover}
.directory-shot{position:relative;aspect-ratio:1440/526;background-image:var(--directory-desktop);border:1px solid var(--pub-border);border-radius:15px;box-shadow:0 12px 26px -16px rgb(26 52 39 / 30%);cursor:zoom-in}
.directory-demo{position:relative}.directory-zoom{display:block;text-decoration:none}.directory-demo figcaption{text-align:left;padding-right:80px}
.directory-zoom-label{position:absolute;right:0;bottom:0;color:var(--pub-link);font:14px HeraSans-Bold,sans-serif;text-decoration:underline;text-underline-offset:3px}
.directory-zoom:hover .directory-shot{border-color:var(--pub-link)}
.pro-page{${directoryImages("light")}}
html[data-hera-theme=dark] .pro-page{${directoryImages("dark")}}
@media(prefers-color-scheme:dark){html:not([data-hera-theme=light]) .pro-page{${directoryImages("dark")}}}
.choice-directory{height:124px;width:min(100%,410px);background-image:var(--directory-detail);background-position:left top;border-radius:10px;box-shadow:0 3px 12px #0001}
@media(min-width:761px){.pro-directory .pro-hero{grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr)}}
@media(min-width:761px) and (max-width:1000px){.pro-directory .pro-hero{grid-template-columns:minmax(0,1fr);gap:20px}}
@media(max-width:760px){.directory-demo{width:min(100%,360px);margin-inline:auto}.directory-shot{aspect-ratio:340/874;background-image:var(--directory-mobile)}.choice-directory{height:105px}}
.choice-calendar{height:136px;width:min(100%,340px);border-radius:10px;background:var(--pub-surface) url('/marketing/product/weekly-agenda-light.webp') center top/cover no-repeat;box-shadow:0 3px 12px #0001;transform:rotate(1deg)}
html[data-hera-theme=dark] .choice-calendar{background-image:url('/marketing/product/weekly-agenda-dark.webp')}
.choice-copy{padding:22px 26px;flex:1;display:flex;flex-direction:column}.choice-copy h2{font:24px/1.2 HeraSans-Bold,sans-serif;margin:0 0 8px}.choice-copy p{flex:1;margin:0 0 16px}.choice-copy>span{font-family:HeraSans-Bold,sans-serif;color:var(--pub-link)}.choice-copy b{margin-left:6px}
.directory-steps{padding-block:clamp(32px,3.5vw,52px)}
.directory-steps h2{margin:0 0 clamp(18px,2vw,26px);font-size:clamp(28px,2.6vw,36px)}
.directory-steps ol{list-style:none;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(12px,1.4vw,22px);margin:0;padding:0}
.directory-steps li{padding:clamp(18px,2vw,28px);background:var(--pub-surface);border:1px solid var(--pub-border);border-radius:16px;box-shadow:0 8px 18px -14px rgb(26 52 39 / 28%)}
.directory-steps h3{display:flex;align-items:center;gap:12px;margin:0 0 12px;font-size:clamp(18px,1.4vw,21px);line-height:1.3}
.directory-steps h3 span{flex:none;display:grid;place-items:center;width:34px;height:34px;border-radius:50%;background:var(--pub-sage);color:var(--pub-link);font:16px/1 HeraSans-Bold,sans-serif}
.directory-steps p{margin:0;line-height:1.55}
.directory-steps + .pro-faq{margin-top:0}
@media(hover:hover){.choice-card:hover{transform:translateY(-2px);box-shadow:0 18px 32px -14px rgb(26 52 39 / 30%)}.pro-page .pub-button:not(.secondary):hover{filter:brightness(.92);text-decoration:none}.demo-controls button:hover{box-shadow:0 2px 7px #0002}}
.choice-card:active,.pub-button:active{opacity:.86}
@media(prefers-reduced-motion:reduce){.choice-card:hover{transform:none}}
@media(max-width:760px){
.pro-choices,.directory-steps ol{grid-template-columns:minmax(0,1fr);gap:16px}.choice-copy{padding:17px 20px}.choice-art{height:120px}.demo-bar{padding:10px 14px}.profile-person{gap:12px}.profile-person img{width:65px;height:74px}}
@media(prefers-reduced-motion:reduce){.public-surface *{scroll-behavior:auto!important;animation:none!important;transition:none!important}}
`;
export const professionalFrame = (body: string, pageClass = "") =>
  `<div class="public-surface pro-page ${pageClass}">${publicHeaderHtml()}<main>${body}</main></div>`;
export const professionalRegisterHref = "/register?userType=PROFESSIONAL";
const primaryLink = (guest: boolean, className = "pub-button") =>
  `<a class="${className}" href="${guest ? professionalRegisterHref : "/planes"}">${guest ? "Crear mi cuenta profesional" : "Ver planes y precios"} <span aria-hidden="true">→</span></a>`;
const tourLinks = {
  directory: { href: "/especialistas", label: "Ver el directorio de HERA" },
  software: { href: "/profesionales/recorrido", label: "Ver HERA por dentro" },
  agenda: { href: "/profesionales/recorrido#tour-agenda", label: "Explorar la agenda" },
  patients: { href: "/profesionales/recorrido#tour-record", label: "Explorar la historia clínica" },
  billing: { href: "/profesionales/recorrido#tour-billing", label: "Explorar la facturación" },
} as const;
const cta = (id: ProfessionalPageId, guest: boolean) =>
  `<div class="pro-actions">${primaryLink(guest)}<a class="pub-button secondary" href="${tourLinks[id].href}">${tourLinks[id].label}</a></div>`;

// Pre-cropped WebPs keep details legible without fetching the full dialog image.
function captureDetail(id: MarketingCapture, detail: string, label: string, width: number, height: number): string {
  const asset = `/marketing/product/${detail}`;
  const style = `aspect-ratio:${width}/${height};--shot-light:url('${asset}-light.webp');--shot-dark:url('${asset}-dark.webp')`;
  return `<a class="pro-detail" href="${capturePath(id, "light")}" data-capture="${id}" aria-label="Ampliar: ${escape(label)}" style="${style}"></a>`;
}
const nextAppointment = () => captureDetail("home", "next-appointment", "Próxima cita, a las 09:00 con Clara Moreno Vidal, presencial", 648, 220);
function heroPreview(id: ProfessionalPageId, photo: string): string {
  if (id === "software") return productDemo(photo);
  if (id === "directory") return directoryPreview();
  const capture = id === "patients" ? "record" : id;
  let body: string;
  if (id === "agenda") {
    body = `<div class="pro-window-title">${landingIcons["calendar-outline"]} Agenda semanal</div>${captureDetail("agenda", "weekly-agenda", "Agenda semanal con citas y horarios", 613, 368)}`;
  } else if (id === "patients") {
    body = `<div class="pro-window-title">${landingIcons["people-outline"]} Ficha del paciente</div>${captureDetail("record", "patient-file", "Ficha de Laura Martín Soler, próxima sesión y sesiones realizadas", 650, 173)}<div class="pro-window-title">Última entrada de historia clínica</div>${captureDetail("record", "last-entry", "Revisión del plan de trabajo, 31 de octubre", 641, 92)}`;
  } else {
    body = `<div class="pro-window-title">${landingIcons["receipt-outline"]} Facturación de noviembre</div>${captureDetail("billing", "payment-summary", "Importes cobrados y pendientes de cobro", 653, 120)}<div class="pro-invoice"><span>Factura F-2026-065</span><strong>65,00 €</strong><div>Lucía Romero Díaz <b>Pendiente</b></div></div>`;
  }
  return `<figure class="pro-preview"><div class="demo-window">${body}</div><figcaption><span>Datos de demostración</span><a href="${capturePath(capture, "light")}" data-capture="${capture}">Ampliar captura</a></figcaption></figure>`;
}

function sampleProfile(photo: string): string {
  return `<div class="profile-demo"><div class="profile-person"><img src="${escape(photo)}" width="96" height="108" alt=""><div><strong>Elena García</strong><p>Psicóloga sanitaria</p><small>Online y presencial</small></div></div><p>Acompaño a personas adultas que quieren trabajar la ansiedad y la autoestima.</p><div class="profile-foot"><span>Ansiedad · Autoestima</span><b>60 € / sesión</b></div></div>`;
}
function productDemo(photo: string): string {
  return `<figure class="product-demo"><div class="demo-controls" aria-label="Vistas del producto"><button type="button" data-view="profile" aria-pressed="true">Tu perfil</button><button type="button" data-view="agenda" aria-pressed="false">Tu agenda</button><button class="demo-play" type="button" aria-label="Pausar demostración">Ⅱ</button></div>
    <div class="demo-window"><div class="demo-bar"><span class="window-dots" aria-hidden="true">● ● ●</span><span>HERA · <span data-demo-title>Perfil profesional</span></span><span class="demo-example">Ejemplo</span></div>
    <div class="demo-frame"><div data-panel="profile">${sampleProfile(photo)}</div><div data-panel="agenda" hidden><div class="demo-agenda"><strong>Próxima cita</strong>${nextAppointment()}<p>Consulta la hora, la modalidad y el paciente de tu siguiente sesión.</p></div></div></div></div>
    <figcaption>Datos de demostración</figcaption></figure>`;
}
function directoryPreview(): string {
  return `<figure class="product-demo directory-demo"><a class="directory-zoom" data-capture="directory" href="${directoryCapturePath("desktop", "light")}" aria-label="Ampliar el directorio con dos perfiles de ejemplo"><span class="directory-shot"></span><span class="directory-zoom-label" aria-hidden="true">↗ Ampliar</span></a><figcaption>Directorio de HERA · Datos de demostración</figcaption></figure>`;
}
function directoryExplanation(photo: string): string {
  return `<section class="pro-section directory-profile"><div><span class="pro-eyebrow">Del buscador a tu ficha</span><h2>Un espacio para presentar tu práctica</h2><p>Al abrir tu ficha, el paciente puede conocer tu forma de trabajar, consultar tus especialidades y ver la modalidad y la tarifa de las sesiones.</p></div><div class="demo-window"><div class="demo-bar">Ficha profesional · Ejemplo</div>${sampleProfile(photo)}</div></section>
    <section class="directory-steps"><h2>Cómo aparecer en el directorio de psicólogos de HERA</h2>
      <ol role="list">
        <li><h3><span aria-hidden="true">1</span>Crea tu cuenta profesional</h3><p>Empieza sin contratar una suscripción.</p></li>
        <li><h3><span aria-hidden="true">2</span>Completa tu perfil</h3><p>Presenta tu experiencia, especialidades, modalidades y tarifas.</p></li>
        <li><h3><span aria-hidden="true">3</span>Publica tu ficha</h3><p>HERA verifica tu acreditación y tú aceptas las condiciones del directorio antes de la publicación.</p></li>
      </ol>
    </section>`;
}
const professionalPaths = `<div class="pro-choices">
  <a class="choice-card" href="${professionalPages.directory.path}"><div class="choice-art" aria-hidden="true"><div class="choice-directory"></div></div><div class="choice-copy"><h2>Tu perfil en el directorio</h2><p>Muestra tus especialidades y cómo atiendes a quienes buscan psicólogo.</p><span>Así verán tu perfil <b aria-hidden="true">→</b></span></div></a>
  <a class="choice-card" href="/profesionales/recorrido#tour-agenda"><div class="choice-art" aria-hidden="true"><div class="choice-calendar"></div></div><div class="choice-copy"><h2>Las herramientas de tu consulta</h2><p>Prepara tus sesiones, retoma las notas y lleva el seguimiento de tus facturas.</p><span>Explorar la consulta <b aria-hidden="true">→</b></span></div></a></div>`;
export const faqHtml = (
  faqs: readonly { question: string; answer: string }[],
) =>
  `<section class="pro-faq"><span class="pro-eyebrow">Antes de empezar</span><h2>Resolvemos tus dudas</h2>${faqs.map((faq) => `<details><summary>${escape(faq.question)}</summary><p>${escape(faq.answer)}</p></details>`).join("")}</section>`;
export function professionalHtml(id: ProfessionalPageId, photo: string, guest = true): string {
  const page = professionalPages[id];
  const body = `<section class="pro-hero"><div class="pro-hero-copy"><span class="pro-eyebrow">${escape(page.eyebrow)}</span><h1>${escape(page.heading)}</h1><p>${id === "software" ? "<strong>Crear tu perfil profesional es gratis.</strong> " : ""}${escape(page.intro)}</p>${cta(id, guest)}<a class="pro-terms" href="/planes">Ver planes y condiciones</a></div>${heroPreview(id, photo)}</section>
  ${id === "software" ? professionalPaths : id === "directory" ? directoryExplanation(photo) : ""}
  ${page.sections.map((section) => `<section class="pro-section${section.image ? "" : " no-image"}"><div class="pro-section-copy"><span class="pro-eyebrow">${escape(section.eyebrow)}</span><h2>${escape(section.title)}</h2><p>${escape(section.text)}</p><ul>${section.points.map((p) => `<li>${escape(p)}</li>`).join("")}</ul>${section.link ? `<a class="pro-text-link" href="${section.link.href}">${escape(section.link.label)} →</a>` : ""}</div>${section.image ? captureHtml(section.image, section.title) : ""}</section>`).join("")}
  ${faqHtml(page.faqs)}<section class="pro-closing"><h2>${guest ? "Crea tu perfil profesional en HERA" : "Elige cómo gestionar tu consulta"}</h2>${cta(id, guest)}</section>`;
  return professionalFrame(body, `pro-${id}`);
}
export const tourMetadata = {
  title: "HERA por dentro: recorrido del producto",
  description:
    "Explora HERA sin registro: agenda, pacientes, historia clínica, documentos y facturación con capturas actuales y datos de demostración.",
  canonicalPath: "/profesionales/recorrido",
};
export function professionalTourHtml(guest = true): string {
  return professionalFrame(
    `<div class="pro-tour-intro"><div><span class="pro-eyebrow">HERA por dentro</span><h1>Así se trabaja con HERA</h1></div><p>Explora tu consulta con datos de demostración y sin crear una cuenta. Elige una sección y amplía la imagen para ver los detalles.</p></div>
    <div class="pro-tour-workspace"><aside class="pro-tour-rail"><span class="pro-eyebrow">Explora tu consulta</span><nav class="pro-tour-nav" aria-label="Pantallas del recorrido">${marketingCaptures.map((shot, i) => `<a href="#tour-${shot.id}" aria-controls="tour-${shot.id}"><span class="pro-tour-number" aria-hidden="true">${String(i + 1).padStart(2, "0")}</span><span>${shot.label}</span></a>`).join("")}</nav></aside><div class="pro-tour-panels">${marketingCaptures.map((shot, i) => `<section class="pro-tour-step" id="tour-${shot.id}" aria-labelledby="tour-title-${shot.id}" tabindex="-1"><h2 id="tour-title-${shot.id}">${shot.label}</h2><p>${shot.text}</p>${captureHtml(shot.id, shot.label, i === 0, true)}</section>`).join("")}</div></div>
    <section class="pro-closing"><h2>${guest ? "Empieza con tu perfil profesional" : "Tu consulta en HERA"}</h2><div class="pro-actions">${primaryLink(guest)}<a class="pub-button secondary" href="/software-para-psicologos">Conocer las funcionalidades</a></div></section>`,
    "pro-tour",
  );
}
