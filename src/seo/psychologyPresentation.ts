import { lightTheme } from '../constants/theme';

// The initial document and the mounted screen use HERA's existing theme tokens.
export const psychologyThemeStyle = (theme: typeof lightTheme) => ({
  '--psychology-canvas': theme.landingCanvas,
  '--psychology-surface': theme.surface,
  '--psychology-card-surface': theme.bgCard,
  '--psychology-sage': theme.landingProfessional,
  '--psychology-blue': theme.primaryMuted,
  '--psychology-border': theme.landingPanelBorder,
  '--psychology-text': theme.textPrimary,
  '--psychology-muted': theme.textSecondary,
  '--psychology-accent': theme.primary,
  '--psychology-action': theme.actionPrimary,
  '--psychology-on-action': theme.actionPrimaryText,
});

const defaults = Object.entries(psychologyThemeStyle(lightTheme)).map(([key, value]) => `${key}:${value}`).join(';');

// Ionicons arrow-forward and shield-checkmark (MIT), the same icons used by
// PublicSpecialistCard. Inline SVG also renders in the initial document.
// License notice: public/ionicons-LICENSE.txt.
export const publicArrowIcon = '<svg class="public-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 512 512" aria-hidden="true" focusable="false"><polyline points="268 112 412 256 268 400" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="48"/><line x1="392" y1="256" x2="100" y2="256" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="48"/></svg>';
export const publicVerifiedIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 512 512" aria-hidden="true" focusable="false"><path fill="currentColor" d="M479.07,111.36a16,16,0,0,0-13.15-14.74c-86.5-15.52-122.61-26.74-203.33-63.2a16,16,0,0,0-13.18,0C168.69,69.88,132.58,81.1,46.08,96.62a16,16,0,0,0-13.15,14.74c-3.85,61.11,4.36,118.05,24.43,169.24A349.47,349.47,0,0,0,129,393.11c53.47,56.73,110.24,81.37,121.07,85.73a16,16,0,0,0,12,0c10.83-4.36,67.6-29,121.07-85.73A349.47,349.47,0,0,0,454.64,280.6C474.71,229.41,482.92,172.47,479.07,111.36Zm-131,75.11-110.8,128A16,16,0,0,1,225.86,320h-.66a16,16,0,0,1-11.2-4.57l-49.2-48.2a16,16,0,1,1,22.4-22.86l37,36.29L323.9,165.53a16,16,0,0,1,24.2,20.94Z"/></svg>';

export const psychologyPageCss = `
.psychology-page{${defaults};background:var(--psychology-canvas);color:var(--psychology-text);font:15px/1.6 "HeraSans",sans-serif;min-height:100vh}
.psychology-page *{box-sizing:border-box}
.psychology-page a{color:var(--psychology-accent);text-underline-offset:4px}
.psychology-page a:focus-visible,.psychology-page button:focus-visible,.psychology-page summary:focus-visible,.psychology-carousel:focus-visible{outline:2px solid var(--psychology-accent);outline-offset:4px}
.psychology-page h1,.psychology-page h2{font-family:"HeraDisplay",Georgia,serif;font-weight:400;letter-spacing:-.02em}
.psychology-page h1{font-size:36px;line-height:1.23;margin:10px 0 16px;max-width:680px}
.psychology-page h2{font-size:27px;line-height:1.3;margin:0 0 10px}
.psychology-page p{margin:0;color:var(--psychology-muted)}
.psychology-main{max-width:1280px;margin:auto;padding:100px 32px 56px}
.psychology-breadcrumb{display:flex;gap:10px;align-items:center;font-size:13px;margin:0 0 18px;color:var(--psychology-muted);flex-wrap:wrap}
.psychology-breadcrumb a{text-decoration:none}
.psychology-eyebrow{font:11px/1.5 "HeraSans-Bold",sans-serif;letter-spacing:1.1px;text-transform:uppercase;color:var(--psychology-accent)}
.psychology-hero{display:grid;grid-template-columns:minmax(0,2fr) minmax(220px,1fr);gap:44px;align-items:center;padding:30px 34px;background:var(--psychology-sage);border:1px solid var(--psychology-border);border-radius:20px}
.psychology-hero-intro{max-width:650px;font-size:16px;line-height:1.65}
.psychology-start{border-left:1px solid var(--psychology-border);padding-left:32px}
.psychology-start h2{font-size:22px;max-width:230px;margin-bottom:12px}
.psychology-start p{font-size:14px;margin-bottom:16px}
.psychology-start a{font-family:"HeraSans-Bold",sans-serif;text-decoration:none;display:inline-flex;gap:12px;align-items:center;min-height:44px}
.psychology-profiles{margin-top:34px;scroll-margin-top:88px}
.psychology-section-heading{display:flex;justify-content:space-between;align-items:center;gap:20px;margin-bottom:18px;min-height:44px}
.psychology-section-heading h2{margin:0}
.psychology-controls{display:flex;gap:8px;flex-shrink:0}
.psychology-controls button{border:1px solid var(--psychology-border);border-radius:50%;width:40px;height:40px;background:var(--psychology-surface);color:var(--psychology-accent);font-size:21px;cursor:pointer}
.psychology-controls button svg{width:18px;height:18px;vertical-align:middle}.psychology-controls button[data-carousel-step="-1"] svg{transform:rotate(180deg)}
.psychology-page .public-icon{flex-shrink:0;vertical-align:middle}.psychology-start .public-icon{transform:rotate(90deg)}.psychology-related .public-icon{transform:rotate(-45deg);margin-left:4px}.psychology-page .seo-button svg{width:18px;height:18px}
.psychology-controls button:disabled{opacity:.35;cursor:default}
.psychology-carousel{display:flex;gap:16px;overflow-x:auto;scroll-snap-type:x mandatory;scroll-padding:2px;padding:4px 2px 12px;scrollbar-width:thin;scrollbar-color:var(--psychology-border) transparent}
.psychology-card{position:relative;flex:0 0 232px;min-width:0;aspect-ratio:1;border-radius:16px;overflow:hidden;scroll-snap-align:start;text-decoration:none;background:${lightTheme.actionPrimary};isolation:isolate}
.psychology-card img{position:absolute;width:100%;height:100%;object-fit:cover;inset:0}
.psychology-card:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,transparent 32%,rgba(16,27,23,.38) 58%,rgba(16,27,23,.92) 100%);z-index:0}
.psychology-card .psychology-card-arrow{position:absolute;top:11px;right:11px;width:29px;height:29px;border-radius:50%;background:var(--psychology-card-surface);color:var(--psychology-accent);display:grid;place-items:center;z-index:1}
.psychology-card-verified{position:absolute;top:11px;left:11px;display:flex;align-items:center;gap:4px;padding:6px 8px;border-radius:20px;background:var(--psychology-card-surface);color:var(--psychology-accent);font:10px/1.2 "HeraSans-Bold",sans-serif;z-index:1}
.psychology-card-initials{position:absolute;inset:0;display:grid;place-items:center;font:48px "HeraDisplay",serif;color:white}
.psychology-card-copy{position:absolute;bottom:0;left:0;right:0;padding:14px;z-index:1;color:white}
.psychology-card h3{font:16px/20px "HeraSans-Bold",sans-serif;margin:0 0 4px;overflow-wrap:anywhere;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.psychology-card p{color:white;font-size:11px;line-height:16px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.psychology-card-meta{display:flex;gap:2px 8px;align-items:baseline;flex-wrap:wrap;margin-top:7px}
.psychology-card-meta strong{font:12px/17px "HeraSans-Bold",sans-serif}
.psychology-card-meta small{font:10px "HeraSans",sans-serif}.psychology-card-meta p{font-size:10px}
.psychology-actions{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:20px}
.psychology-page .seo-button{display:inline-flex;align-items:center;justify-content:center;gap:16px;min-height:46px;padding:11px 20px;border-radius:8px;font:15px/1.5 "HeraSans-Bold",sans-serif;background:var(--psychology-action);color:var(--psychology-on-action)!important;text-decoration:none}
.psychology-page .seo-button.secondary{background:var(--psychology-blue);color:var(--psychology-accent)!important}
.psychology-guidance{display:grid;grid-template-columns:1fr 1fr;gap:36px;padding:26px 30px;margin:40px 0;background:var(--psychology-blue);border-radius:16px}
.psychology-guidance article+article{border-left:1px solid var(--psychology-border);padding-left:36px}
.psychology-guidance h2{font-size:22px;line-height:1.35;margin-bottom:12px}
.psychology-guidance p{font-size:15px;line-height:1.65}
.psychology-faq{display:grid;grid-template-columns:1fr 2fr;gap:48px;padding:0 4px}
.psychology-faq h2{max-width:240px;margin:8px 0 12px}
.psychology-faq details{border-bottom:1px solid var(--psychology-border)}
.psychology-faq details:first-child{border-top:1px solid var(--psychology-border)}
.psychology-faq summary{display:flex;align-items:center;justify-content:space-between;gap:18px;list-style:none;cursor:pointer;font:15px/1.5 "HeraSans-Bold",sans-serif;padding:19px 0}
.psychology-faq summary::-webkit-details-marker{display:none}
.psychology-faq summary:after{content:"+";font:23px/1 "HeraSans",sans-serif;color:var(--psychology-accent)}
.psychology-faq details[open] summary:after{content:"−"}
.psychology-faq details p{padding:0 28px 20px 0}
.psychology-empty{padding:28px;border:1px solid var(--psychology-border);border-radius:14px;background:var(--psychology-surface)}
.psychology-related{display:flex;flex-wrap:wrap;gap:10px 24px;margin-top:36px;padding-top:20px;border-top:1px solid var(--psychology-border);font-size:14px}
.psychology-initial-header{position:fixed;inset:0 0 auto;z-index:10;background:var(--psychology-canvas)}
.psychology-initial-header-inner{max-width:1720px;min-height:74px;margin:auto;padding:16px 40px;display:flex;gap:24px;align-items:center;justify-content:space-between}
.psychology-initial-brand{width:99px;height:42px;display:block;flex-shrink:0;background-image:var(--hera-public-logo);background-size:420px 236.25px;background-position:-160.56px -95.72px;background-repeat:no-repeat}
.psychology-initial-nav{display:flex;gap:20px;align-items:center;font-size:14px}
.psychology-initial-nav a{text-decoration:none;color:var(--psychology-muted)}
.psychology-short-label{display:none}
.psychology-initial-actions{display:flex;gap:8px;align-items:center}
.psychology-initial-actions .seo-button{min-height:42px;padding:8px 18px;font-size:14px;border-radius:12px}
.psychology-initial-footer{border-top:1px solid var(--psychology-border);padding:30px 32px;max-width:1280px;margin:auto;display:flex;align-items:center;justify-content:space-between;gap:24px}
.psychology-initial-footer nav{display:flex;gap:12px 24px;flex-wrap:wrap;font-size:14px}
@media(min-width:1200px){.psychology-card{flex-basis:calc((100% - 64px)/5)}}
@media(min-width:1600px){.psychology-initial-header-inner{max-width:1720px}}
@media(max-width:1399px){.psychology-initial-nav a:not([href="/planes"]){display:none}.psychology-initial-nav{margin-left:auto}.psychology-initial-header-inner{padding:14px 24px}}
@media(max-width:1000px){.psychology-hero{gap:28px;padding:26px}.psychology-start{padding-left:24px}.psychology-faq{gap:30px}}
@media(max-width:720px){.psychology-main{padding:86px 20px 40px}.psychology-hero{grid-template-columns:1fr;padding:24px;gap:20px;border-radius:16px}.psychology-page h1{font-size:30px;line-height:1.25;margin:10px 0 14px}.psychology-hero-intro{font-size:15px}.psychology-start{padding:0;border:0}.psychology-start h2,.psychology-start p{display:none}.psychology-start a{min-height:36px}.psychology-short-label{display:inline}.psychology-long-label{display:none}.psychology-section-heading{gap:12px}.psychology-section-heading h2{font-size:24px}.psychology-profiles{margin-top:28px}.psychology-card{flex-basis:220px}.psychology-carousel{margin-right:-20px;padding-right:20px;scroll-padding-right:20px}.psychology-guidance{grid-template-columns:1fr;gap:22px;padding:24px;margin:32px 0}.psychology-guidance article+article{border-left:0;border-top:1px solid var(--psychology-border);padding:22px 0 0}.psychology-guidance h2{font-size:21px}.psychology-faq{grid-template-columns:1fr;gap:18px}.psychology-faq h2{max-width:none;font-size:25px}.psychology-faq-intro p{max-width:400px}.psychology-initial-header-inner{padding:11px 16px;gap:14px;min-height:64px}.psychology-initial-actions .secondary{display:none}.psychology-initial-footer{align-items:flex-start;padding:24px 20px}.psychology-initial-footer nav{flex-direction:column}.psychology-controls{gap:6px}.psychology-controls button{width:36px;height:36px}}
@media(max-width:440px){.psychology-actions{flex-direction:column}.psychology-actions .seo-button{width:100%}.psychology-hero{padding:22px}.psychology-section-heading h2{font-size:22px}.psychology-initial-nav{font-size:12px}}
@media(prefers-reduced-motion:no-preference){.psychology-card img{transition:transform .2s ease}.psychology-card:hover img{transform:scale(1.025)}}
`;
