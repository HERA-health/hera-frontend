# HERA Frontend

Read `../AGENTS.md` for shared scope, correctness, safety and completion rules when available.

The backend is `../hera-backend/`.

## 1. Architecture

The application uses Expo, React Native, React Native Web and TypeScript.

Preserve supported web and native behavior.

Do not introduce DOM-only implementations into shared native code unless the code is intentionally web-specific.

- Screens orchestrate loading, navigation and high-level state.
- Domain services in `src/services/` own API access.
- Extract reusable or meaningfully complex UI; do not split trivial markup purely for architectural purity.
- Keep rendering, transformations and side effects reasonably separated.
- Preserve the existing state-management approach unless it cannot satisfy the requirement.
- Keep navigation payloads typed.
- Reuse shared theme tokens and primitives when they are suitable.

Do not create new component systems, state architectures or abstractions without a concrete need.

---

## 2. Determine the Frontend Task Mode

Before investigating, determine whether the task is primarily:

1. visual/design work;
2. functional/product behavior;
3. mixed.

Do not automatically apply the full functional workflow to a primarily visual task.

---

## 3. Visual / Design Work

For tasks whose main purpose is visual improvement, styling, layout, UX polish or redesign:

- focus investigation on the affected screen, section or components;
- preserve existing functionality and contracts unless the request explicitly changes them;
- do not trace backend/persistence flows unless the rendered behavior genuinely depends on them;
- use the `frontend-design` skill as the primary visual design guidance when available;
- use HERA's brand, theme and product character as constraints, not as a ceiling on design quality.

Existing screens are references for:

- brand;
- product conventions;
- behavior.

They are not layouts that must be mechanically copied.

Do not preserve weak visual decisions merely because they already exist.

Within the requested scope, visual work may substantially improve:

- composition;
- hierarchy;
- layout;
- spacing;
- typography;
- density;
- grouping;
- surfaces;
- CTA prominence;
- information prioritization;
- responsive composition;
- interaction feedback.

Prefer purposeful composition over adding decoration.

Avoid generic AI-looking design patterns such as excessive:

- cards;
- pills;
- gradients;
- floating containers;
- borders;
- shadows;
- decorative icons;
- unnecessary section fragmentation.

Do not add visual novelty merely to appear creative.

### Visual Verification

Do not judge visual quality only from source code.

When an appropriate runtime/browser is available:

1. render the affected surface;
2. inspect the real result;
3. identify the most important visual or interaction weaknesses;
4. refine them;
5. inspect the changed result again.

Prefer a small number of purposeful visual iterations over extensive architectural analysis.

Check only the relevant supported viewport/theme variants for the affected surface.

Do not redesign unrelated screens.

---

## 4. Functional Frontend Work

For changes involving behavior, data, navigation or API interactions:

- start from the user's entry point;
- follow the relevant action through component/screen, domain service and server response;
- inspect the backend contract when behavior depends on backend data or rules;
- preserve navigation and state consistency;
- connect every required action to real behavior.

For affected asynchronous flows, handle relevant cases such as:

- loading;
- failure;
- retry;
- stale responses;
- duplicate submission;
- changed selections;
- refresh/invalidation;
- persisted state after reload.

Only handle cases that are relevant to the actual flow.

Do not introduce elaborate state machinery for theoretical scenarios that cannot realistically occur.

Check the primary path and the important recovery/failure path.

---

## 5. Mixed Functional + Visual Work

When a feature changes both behavior and presentation:

1. establish the correct functional flow;
2. preserve the relevant backend contract and state behavior;
3. then evaluate the rendered result as a visual product surface;
4. refine the affected experience without expanding the scope.

Functional correctness does not excuse poor presentation.

Visual polish does not excuse broken state or integration behavior.

---

## 6. Design and Interaction Quality

HERA should feel:

- calm;
- clear;
- trustworthy;
- polished;
- contemporary;
- intentionally designed.

Maintain a coherent hierarchy and make the most important action or information visually obvious.

When relevant, represent:

- loading;
- empty;
- success;
- error;
- disabled;
- retry states.

Forms should communicate submission state, prevent harmful duplicate actions and show useful safe errors.

Preserve:

- keyboard access;
- visible focus;
- accessible labels/names;
- contrast;
- usable touch targets;
- reduced-motion preferences when motion is introduced.

Maintain light/dark behavior where supported.

For responsive work, verify the layouts materially affected by the change rather than every possible viewport.

---

## 7. Performance and Public Web

Avoid without evidence or clear benefit:

- repeated API calls;
- eager heavy imports;
- unnecessary rerenders;
- continuous animation;
- large client-side payloads.

Do not micro-optimize without evidence.

For public routes, preserve relevant:

- semantic content;
- metadata;
- canonicals;
- crawlability;
- first-render performance.

Do not introduce SEO patterns copied from unrelated frameworks without checking the current Expo web architecture.

Prefer supported file/storage upload flows over Base64 for large assets.

---

## 8. Verification and Commands

Run commands from `hera-frontend/`.

`package.json` is authoritative.

Common checks:

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

For functional work, verify the affected behavior and relevant failure path.

A successful typecheck or snapshot alone does not prove a usable frontend flow.