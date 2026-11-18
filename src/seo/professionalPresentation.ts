import {
  professionalPages,
  marketingCaptures,
  type MarketingCapture,
  type ProfessionalPageId,
} from "./professionalContent";
import {
  publicNavigationCss,
  publicHeaderHtml,
  professionalFooterHtml,
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
        `<img class="pro-shot-${theme}" src="${capturePath(id, theme)}" srcset="${capturePath(id, theme, 960)} 960w, ${capturePath(id, theme)} 1600w" sizes="${tour ? "(max-width:1039px) 95vw, min(80vw, 1560px)" : "(max-width:760px) calc(100vw - 40px), min(60vw, 760px)"}" alt="${escape(label)} — HERA con datos de demostración" width="1600" height="1000" ${eager ? 'fetchpriority="high" loading="lazy"' : 'loading="lazy"'} decoding="async">`,
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
export const professionalCss =
  publicNavigationCss +
  tourSelectionCss +
  `
html:has(.pro-page),.pro-mounted{scrollbar-width:thin}
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

.pro-mounted .pro-page>.pub-header{visibility:hidden;pointer-events:none}.pro-page{min-height:100vh}.pro-page main{max-width:1280px;margin:auto;padding:0 32px}.pro-page h1,.pro-page h2{font-family:"HeraDisplay",Georgia,serif;font-weight:400;letter-spacing:-.035em;line-height:1.14}.pro-page h1{font-size:clamp(32px,3.1vw,42px);margin:16px 0 20px}.pro-page h2{font-size:clamp(30px,3vw,43px);margin:16px 0 22px}.pro-page h3{font:22px/1.35 "HeraSans-Bold",sans-serif;margin:0 0 16px}.pro-page p{color:var(--pub-muted);margin:0 0 20px}.pro-page ul{padding-left:21px;color:var(--pub-muted)}.pro-page li{padding:5px 0}.pro-eyebrow{font:12px/1.5 "HeraSans-Bold",sans-serif;text-transform:uppercase;letter-spacing:.12em;color:var(--pub-link)}.pro-breadcrumb{font-size:13px;display:flex;gap:10px;padding-top:24px;color:var(--pub-muted);flex-wrap:wrap}.pro-breadcrumb a{text-decoration:none}.pro-hero{display:grid;grid-template-columns:minmax(0,.8fr) minmax(0,1.2fr);gap:48px;align-items:center;padding:44px 0 52px}.pro-hero-copy{display:block;min-width:0}.pro-hero-copy>div:first-child{max-width:730px}.pro-hero-copy p{font-size:18px;line-height:1.6;max-width:480px}.pro-actions{display:flex;gap:12px;flex-wrap:wrap;margin:28px 0 12px}.pro-note{font-size:13px!important}.pro-capture{margin:0;min-width:0}.pro-capture>a{display:block;position:relative;background:var(--pub-sage);padding:14px;border:1px solid var(--pub-border);border-radius:16px;overflow:hidden}.pro-capture img{width:100%;height:auto;aspect-ratio:8/5;object-fit:contain;display:block;border-radius:7px}.pro-capture .pro-shot-dark{display:none}.pro-capture figcaption{font-size:13px;display:flex;justify-content:space-between;gap:16px;padding:12px 3px;color:var(--pub-muted)}.pro-capture figcaption span{white-space:nowrap}.pro-enlarge{position:absolute;bottom:24px;right:24px;background:var(--pub-surface);padding:7px 12px;border:1px solid var(--pub-border);border-radius:6px;font-size:12px;color:var(--pub-text)}.pro-section{display:grid;grid-template-columns:minmax(250px,.8fr) minmax(0,1.3fr);align-items:center;gap:64px;padding:76px 0;border-bottom:1px solid var(--pub-border)}.pro-section:nth-child(even){grid-template-columns:minmax(0,1.3fr) minmax(250px,.8fr)}.pro-section:nth-child(even) .pro-section-copy{order:2}.pro-section p{max-width:540px}.pro-section .pro-capture>a{padding:8px}.pro-section .pro-capture figcaption{font-size:11px}.pro-section.no-image{display:block;padding:50px;max-width:100%;background:var(--pub-sage);border:0;border-radius:16px;margin:64px 0}.pro-section.no-image p{max-width:730px}.pro-text-link{display:inline-block;min-height:44px;padding:10px 0;font-family:"HeraSans-Bold",sans-serif;color:var(--pub-link)!important;text-decoration:none}.pro-start{padding:64px 48px;background:var(--pub-warm);border-radius:18px;margin:64px 0}.pro-start>p{max-width:700px}.pro-steps{display:grid;grid-template-columns:repeat(3,1fr);gap:40px;margin-top:36px}.pro-steps strong{display:block;font:18px "HeraSans-Bold",sans-serif;margin-bottom:12px}.pro-steps span{display:block;color:var(--pub-link);font:14px "HeraSans-Bold",sans-serif;margin-bottom:14px}.pro-faq{max-width:900px;margin:70px auto}.pro-faq details{padding:22px 0;border-bottom:1px solid var(--pub-border)}.pro-faq summary{cursor:pointer;font-family:"HeraSans-Bold",sans-serif;padding-right:20px}.pro-faq details p{margin:16px 0 0}.pro-closing{padding:56px 0 80px;max-width:800px}
.pro-tour main{max-width:1840px;padding:0 32px}
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
@media(max-width:760px){.pro-page main{padding:0 20px}.pro-hero{padding:20px 0 36px;grid-template-columns:1fr;gap:24px}.pro-hero-copy{margin:0}.pro-hero-copy p{font-size:16px;line-height:1.6}.pro-page h1{margin-top:14px}.pro-section,.pro-section:nth-child(even){grid-template-columns:1fr;gap:24px;padding:44px 0}.pro-section:nth-child(even) .pro-section-copy{order:0}.pro-capture>a{padding:6px;border-radius:9px}.pro-capture figcaption{font-size:11px;flex-wrap:wrap;gap:2px}.pro-enlarge{bottom:14px;right:14px;padding:4px 8px}.pro-start{padding:32px 24px;margin:40px 0}.pro-steps{grid-template-columns:1fr;gap:16px}.pro-section.no-image{padding:30px 24px;margin:40px 0}.pro-faq{margin:44px auto}.pro-actions .pub-button{width:100%}
.pro-dialog{padding:12px}.pro-closing{padding:30px 0 56px}}
@media(prefers-reduced-motion:reduce){.public-surface *{scroll-behavior:auto!important;animation:none!important;transition:none!important}}
`;
export const professionalFrame = (body: string, pageClass = "") =>
  `<div class="public-surface pro-page ${pageClass}">${publicHeaderHtml()}<main>${body}</main>${professionalFooterHtml}</div>`;
const cta = () =>
  '<div class="pro-actions"><a class="pub-button" href="/planes">Ver planes y precios <span aria-hidden="true">→</span></a><a class="pub-button secondary" href="/profesionales/recorrido">Ver HERA por dentro</a></div>';
export const faqHtml = (
  faqs: readonly { question: string; answer: string }[],
) =>
  `<section class="pro-faq"><span class="pro-eyebrow">Antes de empezar</span><h2>Resolvemos tus dudas</h2>${faqs.map((faq) => `<details><summary>${escape(faq.question)}</summary><p>${escape(faq.answer)}</p></details>`).join("")}</section>`;
export function professionalHtml(id: ProfessionalPageId): string {
  const page = professionalPages[id];
  const body = `<section class="pro-hero"><div class="pro-hero-copy"><div><span class="pro-eyebrow">${escape(page.eyebrow)}</span><h1>${escape(page.heading)}</h1></div><div><p>${escape(page.intro)}</p>${cta()}<p class="pro-note">Puedes explorar las pantallas sin crear una cuenta.</p></div></div>${captureHtml(page.image, page.eyebrow, true)}</section>
  ${page.sections.map((section) => `<section class="pro-section${section.image ? "" : " no-image"}"><div class="pro-section-copy"><span class="pro-eyebrow">${escape(section.eyebrow)}</span><h2>${escape(section.title)}</h2><p>${escape(section.text)}</p><ul>${section.points.map((p) => `<li>${escape(p)}</li>`).join("")}</ul>${section.link ? `<a class="pro-text-link" href="${section.link.href}">${escape(section.link.label)} →</a>` : ""}</div>${section.image ? captureHtml(section.image, section.title) : ""}</section>`).join("")}
  ${id === "software" ? `<section class="pro-start"><span class="pro-eyebrow">Un comienzo acompañado</span><h2>Encuentra tu forma de trabajar con HERA</h2><p>Primero conoce el espacio. Después, elige el plan que encaja con tu consulta y solicita su activación.</p><div class="pro-steps"><div><span>01</span><strong>Explora por dentro</strong><p>Recorre las pantallas y descubre las herramientas.</p></div><div><span>02</span><strong>Consulta los planes</strong><p>Compara las prestaciones y las condiciones vigentes.</p></div><div><span>03</span><strong>Solicita tu prueba</strong><p>El equipo te contactará para confirmar el comienzo.</p></div></div><a class="pro-text-link" href="/planes">Ver planes y precios →</a></section>` : ""}
  ${faqHtml(page.faqs)}<section class="pro-closing"><span class="pro-eyebrow">Tu próximo paso</span><h2>Haz espacio para lo que te trajo hasta aquí.</h2><p>Descubre cómo puede encajar HERA en tu consulta, a tu ritmo.</p>${cta()}</section>`;
  return professionalFrame(body);
}
export const tourMetadata = {
  title: "HERA por dentro: recorrido del producto",
  description:
    "Explora HERA sin registro: agenda, pacientes, historia clínica, documentos y facturación con capturas actuales y datos de demostración.",
  canonicalPath: "/profesionales/recorrido",
};
export function professionalTourHtml(): string {
  return professionalFrame(
    `<div class="pro-tour-intro"><div><span class="pro-eyebrow">HERA por dentro</span><h1>Así se trabaja con HERA</h1></div><p>Explora tu consulta con datos de demostración y sin crear una cuenta. Elige una sección y amplía la imagen para ver los detalles.</p></div>
    <div class="pro-tour-workspace"><aside class="pro-tour-rail"><span class="pro-eyebrow">Explora tu consulta</span><nav class="pro-tour-nav" aria-label="Pantallas del recorrido">${marketingCaptures.map((shot, i) => `<a href="#tour-${shot.id}" aria-controls="tour-${shot.id}"><span class="pro-tour-number" aria-hidden="true">${String(i + 1).padStart(2, "0")}</span><span>${shot.label}</span></a>`).join("")}</nav></aside><div class="pro-tour-panels">${marketingCaptures.map((shot, i) => `<section class="pro-tour-step" id="tour-${shot.id}" aria-labelledby="tour-title-${shot.id}" tabindex="-1"><h2 id="tour-title-${shot.id}">${shot.label}</h2><p>${shot.text}</p>${captureHtml(shot.id, shot.label, i === 0, true)}</section>`).join("")}</div></div>
    <section class="pro-closing"><h2>¿Te imaginas tu consulta aquí?</h2><p>Consulta los planes y solicita una prueba para conocer HERA con acompañamiento.</p><div class="pro-actions"><a class="pub-button" href="/planes">Ver planes y solicitar prueba →</a><a class="pub-button secondary" href="/software-para-psicologos">Conocer todas las funcionalidades</a></div></section>`,
    "pro-tour",
  );
}
