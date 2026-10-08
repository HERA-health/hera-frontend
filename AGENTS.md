# HERA Frontend

Read `../AGENTS.md` for shared scope, risk, correctness, privacy and completion rules when available.

The backend is `../hera-backend/`.

## 1. Architecture

The application uses Expo, React Native, React Native Web and TypeScript. Preserve supported web and native behavior.

Do not introduce DOM-only implementations into shared native code unless intentionally web-specific.

Do not introduce NativeWind, Tailwind, a second styling system, a new state library or a new component system unless the task explicitly requires it and the architectural benefit is concrete.

Use the existing frontend shape:

- screens orchestrate loading, navigation and high-level state;
- `src/services/` owns API access;
- extract reusable or meaningfully complex UI, but do not split trivial markup for purity;
- keep rendering, transformations and side effects reasonably separated;
- preserve existing state-management patterns unless they cannot satisfy the requirement;
- keep navigation payloads typed;
- reuse theme tokens and shared primitives when suitable.

---

## 2. Determine the frontend task mode

Before investigating, classify the task as primarily:

1. visual/design;
2. functional/product behavior;
3. mixed.

Do not apply the full functional workflow to a primarily visual task.

For low-risk visual/public-product work, keep investigation narrow and delivery fast. For sensitive behavior, follow the shared high-risk rules in `../AGENTS.md`.

---

## 3. Visual and design work

For styling, layout, UX polish or redesign:

- focus on the affected screen/section/components;
- preserve functionality and contracts unless the request changes them;
- do not trace backend/persistence unless rendered behavior depends on it;
- use the `frontend-design` skill when available;
- use HERA's brand and product character as constraints, not as a ceiling on design quality.

Existing HERA screens are references for brand, behavior and strong patterns. They are not layouts that must be mechanically copied.

Do not preserve weak visual decisions merely because they already exist.

### HERA visual character

HERA should feel calm, trustworthy, contemporary, intentionally designed and premium without becoming ornamental.

Public-facing surfaces may feel more editorial; authenticated product UI should remain clear, efficient and product-focused.

Favor:

- warm neutral space;
- restrained sage/green surfaces;
- strong display typography for important public headings;
- clean sans-serif product typography;
- deliberate whitespace;
- limited, purposeful borders and shadows;
- real product UI or meaningful imagery when demonstrating HERA.

Do not interpret healthcare as sterile white-and-blue SaaS. Do not interpret premium as excessive gradients, glassmorphism or decoration.

### Composition

Prefer:

- one dominant visual idea per section;
- one clearly dominant CTA when applicable;
- strong hierarchy before decoration;
- readable content widths;
- coherent grouping without wrapping every group in a card;
- asymmetric/editorial composition when it improves hierarchy;
- large, useful product imagery when explaining value.

Avoid excessive cards, pills, gradients, floating containers, borders, shadows, decorative icons and unnecessary section fragmentation.

### Public web direction

For landing pages, the public directory, public profiles and professional/clinic marketing surfaces, desktop web is a first-class design target.

Do not design desktop as a stretched mobile layout.

On desktop:

- constrain content width instead of filling the viewport;
- keep long copy reasonably narrow;
- use whitespace as part of the composition;
- use two-column compositions when a strong visual/product preview benefits the section;
- make the primary action understandable within a few seconds;
- prefer a clear page narrative over showing every capability at once.

On mobile, preserve the same hierarchy rather than merely stacking every desktop block.

### Tokens, typography and responsive layout

Prefer existing `ThemeContext`, `spacing`, `borderRadius`, `layout`, typography and shared primitives where they express the intended design.

Do not hardcode brand colors when a suitable theme token exists.

Exact local dimensions are acceptable when they express deliberate composition and no suitable token exists. Do not create a global token for every one-off value.

When a touched area introduces another repeated responsive threshold, prefer an existing/shared breakpoint over a new magic number. Do not refactor unrelated screens solely to standardize breakpoints.

Use display typography for major editorial headings and sans-serif typography for body/product UI. Avoid arbitrary font sizes when an existing semantic scale or nearby strong HERA reference expresses the intended hierarchy.

---

## 4. Visual quality bar and verification

A visual task is not complete merely because the requested elements exist, function and use theme tokens.

For substantial visual work:

1. inspect the current rendered surface;
2. inspect 2-3 relevant high-quality HERA references;
3. identify the intended focal point and primary action;
4. identify the most important hierarchy/composition weaknesses;
5. implement the change;
6. inspect the rendered result;
7. perform at least one focused refinement pass.

Before completion, verify:

- clear visual hierarchy;
- correct HERA typography;
- balanced spacing and density;
- appropriate content width/alignment;
- obvious primary action when applicable;
- coherent grouping;
- sensible use of available screen space;
- no unnecessary empty space or excessive scrolling;
- no generic/default third-party styling when supported customization exists;
- no element noticeably weaker or inconsistent with the surrounding product.

Functional correctness and correct token usage alone are not sufficient visual acceptance criteria.

When embedding customizable third-party UI, adapt supported typography, colors, spacing, borders and controls to HERA without unsupported hacks.

---

## 5. Functional frontend work

For behavior, data, navigation or API changes:

- start from the user's entry point;
- follow the relevant action through screen/component, domain service and server response;
- inspect the backend contract when behavior depends on backend data/rules;
- preserve navigation and state consistency;
- connect every required action to real behavior.

Handle only relevant asynchronous states such as loading, failure, retry, stale responses, duplicate submission, changed selections, refresh/invalidation and persisted state after reload.

Do not introduce elaborate state machinery for theoretical scenarios.

Check the primary path and important recovery/failure path.

For mixed work, establish correct behavior first, then evaluate and refine the rendered product surface. Functional correctness does not excuse poor presentation; visual polish does not excuse broken behavior.

---

## 6. Interaction, accessibility, performance and public web

When relevant, represent loading, empty, success, error, disabled and retry states.

Forms should communicate submission state, prevent harmful duplicate actions and show useful safe errors.

Preserve keyboard access, visible focus, accessible labels/names, contrast, usable touch targets, reduced-motion preferences and light/dark behavior where supported.

Avoid without evidence or clear benefit: repeated API calls, eager heavy imports, unnecessary rerenders, continuous animation and large client-side payloads.

For public routes, preserve relevant semantic content, metadata, canonicals, crawlability and first-render performance.

Do not introduce SEO patterns copied from unrelated frameworks without checking the current Expo web architecture.

Prefer supported file/storage upload flows over Base64 for large assets.

---

## 7. Verification and commands

Run commands from `hera-frontend/`. `package.json` is authoritative.

| Purpose | Command |
| --- | --- |
| Development | `npm start` |
| Web development | `npm run web` |
| Typecheck | `npm run typecheck -- --pretty false` |
| One test file | `npm test -- --runTestsByPath <path-to-test>` |
| Agenda regression suite | `npm run test:agenda-regression` |
| Full test suite, when warranted | `npm test` |
| Web export when relevant | `npm run build:web` |

Choose checks based on the change.

For visual work, rendered inspection is more important than broad automated test execution unless behavior also changed.

For functional work, verify affected behavior and the relevant failure path.

For responsive work, verify only materially affected viewport/theme variants.

A successful typecheck or snapshot alone does not prove a usable frontend flow.
