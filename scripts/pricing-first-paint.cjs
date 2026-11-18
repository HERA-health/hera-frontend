// Mobile introduction shown while the application and live catalogue start.
// The normal screen owns every subscription action and all variable terms.
const previewCss = `
#pricing-first-paint{display:none}
@media(max-width:767px){
  body{margin:0}
  #pricing-first-paint{display:block;position:fixed;inset:0;overflow:hidden}
  #root{position:relative;z-index:1}
  #root:empty,#root:has([data-testid="pricing-initial-load"]){visibility:hidden;pointer-events:none}
  #pricing-first-paint .pub-header-inner{row-gap:0}
  #pricing-first-paint .pub-nav{padding-inline:8px;gap:12px;margin-top:14px;color:var(--pub-muted)}
  #pricing-first-paint .pub-nav a{display:flex;align-items:center;line-height:normal}
  #pricing-first-paint .pub-theme{width:40px}
  #pricing-first-paint .pub-theme span:not([hidden]) svg{vertical-align:middle}
  #pricing-first-paint .pub-access{padding-inline:10px;min-height:42px;border:0}
  #pricing-first-paint .pub-actions{gap:6px}
  #pricing-first-paint .price-capacity{display:flex;align-items:center;gap:8px}
  #pricing-first-paint .price-capacity>span{font:16px/21px HeraSans,sans-serif}
  #pricing-first-paint p.price-scope{margin-top:6px}
  #pricing-first-paint main{max-width:1280px;margin:auto;padding:16px 20px 0;color:var(--pub-muted);font:13px/21px HeraSans,sans-serif}
  #pricing-first-paint h1,#pricing-first-paint h2{font:30px/37px HeraDisplay,Georgia,serif;color:var(--pub-text);margin:0}
  #pricing-first-paint h2{font-size:24px;line-height:30px}
  #pricing-first-paint p{margin:0}
  #pricing-first-paint .price-copy{display:grid;gap:5px}
  #pricing-first-paint .price-intro{gap:7px;padding:0 0 20px;font-size:14px;line-height:22px}
  #pricing-first-paint strong,#pricing-first-paint b{font-family:HeraSans-Bold,sans-serif;font-weight:400;color:var(--pub-text)}
  #pricing-first-paint .price-label{color:var(--pub-link);font:10px/16px HeraSans-Bold,sans-serif;letter-spacing:1.2px}
  #pricing-first-paint .price-directory{background:var(--pub-surface);border:1px solid var(--price-border);border-radius:14px;padding:18px}
  #pricing-first-paint .price-commissions{margin-top:20px}
  #pricing-first-paint .price-rates{display:flex;padding:2px 0}
  #pricing-first-paint .price-rates>div{flex:1;padding:0 10px;display:grid;align-content:start;gap:3px;font-size:12px;line-height:19px}
  #pricing-first-paint .price-rates>div+div{border-left:1px solid var(--price-border)}
  #pricing-first-paint .price-rates b{font-size:25px;line-height:32px}
  #pricing-first-paint .price-note{font-size:12px;line-height:19px}
  #pricing-first-paint .price-includes{background:var(--pub-sage);margin-top:12px;padding:9px 12px;display:grid;gap:14px;border-radius:8px}
}
@media(min-width:720px) and (max-width:767px){
  #pricing-first-paint main{padding-inline:32px}
  #pricing-first-paint h1{font-size:36px;line-height:44px}
  #pricing-first-paint .price-includes{display:flex;align-items:center}
}
`;

module.exports = function pricingFirstPaint(shell, { apiUrls, localHostname, header, themeBoot, navigationCss, offer, copy, light, dark }) {
  const safeJson = value => JSON.stringify(value).replace(/</g, '\\u003c');
  const { startPricingCatalog } = require('../.seo-build/seo/initialPricingCatalog');
  const { storageLabel } = require('../.seo-build/seo/subscriptionCatalog');
  const preload = `<script>(()=>{const local=(${localHostname.toString()})(location.hostname);(${startPricingCatalog.toString()})((local?${safeJson(apiUrls.dev.apiUrl)}:${safeJson(apiUrls.prod.apiUrl)}).replace(/\\/$/,'')+'/subscriptions/plans')})()</script>`;
  const showTerms = `<script>window.heraInitialPricingCatalog?.result.then(response=>{
    const panel=document.getElementById('pricing-first-paint');
    if(!panel||!response.ok)return;
    const catalog=response.data;
    if(typeof catalog?.enforced!=='boolean'||!Array.isArray(catalog.plans))return;
    const plan=catalog.plans.find(plan=>plan?.id==='DIRECTORIO');
    if(!plan||!Number.isFinite(plan.storageBytes))return;
    panel.querySelector('.price-storage').textContent=(${storageLabel.toString()})(plan.storageBytes)+' de almacenamiento'+(catalog.enforced?' total':' previsto en el plan');
    panel.querySelector('.price-scope').textContent=catalog.enforced?${safeJson(copy.enforcedScope)}:${safeJson(copy.optionalScope)};
  })</script>`;
  const rates = offer.commissions.map(item => `<div><b>${item.rate}</b><span>${item.session}</span></div>`).join('');
  const preview = `<div id="pricing-first-paint" class="public-surface">${header}<main>
    <section class="price-copy price-intro"><span class="price-label">${copy.eyebrow}</span><h1>${copy.heading}</h1><p>${copy.intro}</p></section>
    <section class="price-directory"><div class="price-copy"><span class="price-label">${copy.directoryLabel}</span><h2>${copy.directoryTitle}</h2><p>${copy.directoryIntro}</p><strong>${copy.directoryTerms}</strong></div>
    <div class="price-copy price-commissions"><strong>${copy.commissionTitle}</strong><div class="price-rates">${rates}</div><p class="price-note">${copy.commissionNote}</p></div>
    <div class="price-includes"><div class="price-capacity"><span aria-hidden="true">📁</span><strong class="price-storage">Almacenamiento</strong></div><p class="price-note">${copy.includes}</p></div><p class="price-scope price-note"></p></section>
    </main></div>`;
  return shell.replace('</head>', themeBoot + preload + '<style>' + navigationCss + previewCss +
    ':root{--price-border:' + light.borderLight + '}html[data-hera-theme=dark]{--price-border:' + dark.borderLight +
    '}</style><noscript><style>#pricing-first-paint{display:none}</style></noscript></head>')
    .replace('<div id="root"></div>',preview + showTerms + '<div id="root"></div>');
};
