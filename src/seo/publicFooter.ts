import { footerColumns, footerDescription, footerSocialLinks, footerTagline, type FooterLink } from '../constants/publicFooter';
import { darkTheme, lightTheme, type Theme } from '../constants/theme';
// Ionicons 7.4.0, as used by the native footer (public/ionicons-LICENSE.txt).
const socialIcons = {
  "logo-linkedin": "<svg aria-hidden=\"true\" focusable=\"false\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\"><path d=\"M444.17 32H70.28C49.85 32 32 46.7 32 66.89v374.72C32 461.91 49.85 480 70.28 480h373.78c20.54 0 35.94-18.21 35.94-38.39V66.89C480.12 46.7 464.6 32 444.17 32zm-273.3 373.43h-64.18V205.88h64.18zM141 175.54h-.46c-20.54 0-33.84-15.29-33.84-34.43 0-19.49 13.65-34.42 34.65-34.42s33.85 14.82 34.31 34.42c-.01 19.14-13.31 34.43-34.66 34.43zm264.43 229.89h-64.18V296.32c0-26.14-9.34-44-32.56-44-17.74 0-28.24 12-32.91 23.69-1.75 4.2-2.22 9.92-2.22 15.76v113.66h-64.18V205.88h64.18v27.77c9.34-13.3 23.93-32.44 57.88-32.44 42.13 0 74 27.77 74 87.64z\"/></svg>",
  "logo-instagram": "<svg aria-hidden=\"true\" focusable=\"false\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\"><path d=\"M349.33 69.33a93.62 93.62 0 0193.34 93.34v186.66a93.62 93.62 0 01-93.34 93.34H162.67a93.62 93.62 0 01-93.34-93.34V162.67a93.62 93.62 0 0193.34-93.34h186.66m0-37.33H162.67C90.8 32 32 90.8 32 162.67v186.66C32 421.2 90.8 480 162.67 480h186.66C421.2 480 480 421.2 480 349.33V162.67C480 90.8 421.2 32 349.33 32z\"/><path d=\"M377.33 162.67a28 28 0 1128-28 27.94 27.94 0 01-28 28zM256 181.33A74.67 74.67 0 11181.33 256 74.75 74.75 0 01256 181.33m0-37.33a112 112 0 10112 112 112 112 0 00-112-112z\"/></svg>",
  "logo-tiktok": "<svg aria-hidden=\"true\" focusable=\"false\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\"><path d=\"M412.19 118.66a109.27 109.27 0 01-9.45-5.5 132.87 132.87 0 01-24.27-20.62c-18.1-20.71-24.86-41.72-27.35-56.43h.1C349.14 23.9 350 16 350.13 16h-82.44v318.78c0 4.28 0 8.51-.18 12.69 0 .52-.05 1-.08 1.56 0 .23 0 .47-.05.71v.18a70 70 0 01-35.22 55.56 68.8 68.8 0 01-34.11 9c-38.41 0-69.54-31.32-69.54-70s31.13-70 69.54-70a68.9 68.9 0 0121.41 3.39l.1-83.94a153.14 153.14 0 00-118 34.52 161.79 161.79 0 00-35.3 43.53c-3.48 6-16.61 30.11-18.2 69.24-1 22.21 5.67 45.22 8.85 54.73v.2c2 5.6 9.75 24.71 22.38 40.82A167.53 167.53 0 00115 470.66v-.2l.2.2c39.91 27.12 84.16 25.34 84.16 25.34 7.66-.31 33.32 0 62.46-13.81 32.32-15.31 50.72-38.12 50.72-38.12a158.46 158.46 0 0027.64-45.93c7.46-19.61 9.95-43.13 9.95-52.53V176.49c1 .6 14.32 9.41 14.32 9.41s19.19 12.3 49.13 20.31c21.48 5.7 50.42 6.9 50.42 6.9v-81.84c-10.14 1.1-30.73-2.1-51.81-12.61z\"/></svg>"
};

interface FooterOptions {
  professionalLabel?: string;
  professionalHref?: string;
  accessHref?: string;
  showSections?: boolean;
  privacyControl?: boolean;
}

const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function linkHtml(link: FooterLink) {
  if (link.action === 'privacy') return '<button type="button" data-action="privacy">' + link.label + '</button>';
  const data = link.section ? ' data-section="' + link.section + '"' : link.action ? ' data-action="' + link.action + '"' : '';
  return '<a href="' + escape(link.href) + '"' + data + '>' + escape(link.label) + '</a>';
}

// Used for the first HTML response and the mounted footer on either landing.
export function publicFooterHtml(options: FooterOptions = {}): string {
  const groups = footerColumns(options.professionalLabel, options.professionalHref, options.accessHref).map(group => {
    const links = group.links.filter(link => (!link.section || options.showSections !== false)
      && (link.action !== 'privacy' || options.privacyControl));
    return `<nav aria-label="${group.title}"><strong>${group.title}</strong><ul>${links.map(link => '<li>' + linkHtml(link) + '</li>').join('')}</ul></nav>`;
  });
  const social = footerSocialLinks.map(item => `<a aria-label="${item.label}" href="${escape(item.href)}">${socialIcons[item.icon]}</a>`).join('');
  return `<footer class="hera-footer" aria-label="Pie de página">
    <div class="hf-grid"><div class="hf-brand"><a class="hf-logo" href="/" aria-label="HERA, inicio"></a>
      <p class="hf-tagline">${footerTagline}</p><p class="hf-description">${footerDescription}</p>
      <div class="hf-social">${social}</div>
      <small class="hf-copyright">© ${new Date().getFullYear()} HERA</small></div>${groups.join('')}</div></footer>`;
}

function palette(t: Theme, dark = false) {
  return `--hf-bg:${t.bgAlt};--hf-ink:${dark ? t.textPrimary : t.primaryDark};--hf-muted:${t.textSecondary};--hf-line:${t.border};--hf-hover:${t.primaryAlpha12}`;
}

export const publicFooterCss = `
.hera-footer{${palette(lightTheme)};box-sizing:border-box;padding:clamp(36px,4vw,60px) var(--hera-landing-inset) 24px;border-top:1px solid var(--hf-line);background:var(--hf-bg);color:var(--hf-ink);font:14px/1.55 HeraSans,sans-serif}
html[data-hera-theme=dark] .hera-footer{${palette(darkTheme, true)}}
@media(prefers-color-scheme:dark){html:not([data-hera-theme=light]) .hera-footer{${palette(darkTheme, true)}}}
.hera-footer *{box-sizing:border-box}
.hf-grid{display:grid;grid-template-columns:minmax(0,1.45fr) repeat(3,minmax(0,1fr));gap:clamp(28px,4vw,70px);align-items:start}
.hera-footer .hf-logo{width:110px;height:46px;display:block;background:var(--hf-ink);mask:var(--hera-public-logo) -176px -105px/459px 258px no-repeat}
.hera-footer .hf-tagline{margin:14px 0 10px;max-width:24ch;color:var(--hf-ink);font:24px/1.3 HeraDisplay,Georgia,serif}
.hera-footer .hf-description{margin:0;max-width:40ch;color:var(--hf-muted);line-height:1.6}
.hf-social{display:flex;gap:10px;margin-top:18px}
.hera-footer .hf-social a{display:grid;place-items:center;width:42px;height:42px;border:1px solid var(--hf-line);border-radius:9px;color:var(--hf-ink)}
.hf-social svg{width:18px;height:18px;fill:currentColor}
.hera-footer nav strong{display:block;margin-bottom:10px;letter-spacing:.06em;text-transform:uppercase;font:13px/20px HeraSans-Bold,sans-serif}
.hera-footer nav ul{display:grid;gap:4px;margin:0;padding:0;list-style:none}
.hera-footer nav li{margin:0;padding:0}
.hera-footer nav :is(a,button){display:inline-flex;align-items:center;min-height:30px;padding:4px 0;border:0;background:none;color:var(--hf-muted);text-decoration:none;text-align:left;font:inherit;line-height:22px;cursor:pointer;overflow-wrap:anywhere}
.hera-footer :focus-visible{outline:2px solid var(--hf-ink);outline-offset:3px;border-radius:3px}
@media(hover:hover){.hera-footer nav :is(a,button):hover{color:var(--hf-ink);text-decoration:underline;text-underline-offset:4px}.hera-footer .hf-social a:hover{background:var(--hf-hover)}}
.hf-copyright{display:block;margin-top:12px;color:var(--hf-muted);font-size:13px}
@media(max-width:1023px){.hf-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:26px}.hf-brand{grid-column:1/-1}}
@media(max-width:639px){.hf-grid{grid-template-columns:1fr;gap:26px}.hera-footer nav :is(a,button){min-height:40px}}
`;
