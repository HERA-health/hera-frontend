# HERA Frontend: Agent Guidelines & UI Architecture

## 1. Repository Context

HERA consists of two sibling applications:

- `c:\Users\ruben\Desktop\HERA\hera-frontend`
- `c:\Users\ruben\Desktop\HERA\hera-backend`

Features may affect both repositories.

Do not assume that a task is frontend-only because the visible change is in the UI.

When a feature depends on persisted data, permissions, business rules or API behavior, inspect the relevant backend contract when necessary.

The frontend should present and orchestrate product behavior, not become the source of truth for backend business rules.

---

## 2. Frontend Mission

The frontend should feel:

- premium;
- calm;
- trustworthy;
- clear;
- modern without unnecessary visual complexity.

Optimize for:

- usability;
- visual consistency;
- maintainability;
- honest product behavior.

Prefer clarity and simplicity over decorative complexity.

---

## 3. Frontend Architecture

### Core Rules

- **Screens as Containers**: Screens orchestrate data loading, navigation and high-level state.
- **UI in Components**: Extract reusable or meaningfully complex visual sections into components.
- **Services Own API Access**: Screens and components should use domain services in `src/services/` instead of scattering raw API calls.
- **Single Responsibility**: Keep rendering, data transformation and side effects reasonably separated.
- **Strict TypeScript**: Avoid `any`, `@ts-ignore`, unsafe casting and untyped navigation payloads.
- **Existing Patterns First**: Reuse existing project patterns and primitives when they already solve the problem correctly.

Do not create new architectural layers, component systems or state-management abstractions without a concrete need.

Do not extract trivial components purely for architectural purity.

---

## 4. Implementation Principles

Prefer the simplest correct solution that fits the existing architecture.

When implementing or fixing something:

1. understand the relevant existing flow before modifying it;
2. preserve working behavior unless the task intentionally changes it;
3. reuse existing components, services and patterns where appropriate;
4. change the smallest reasonable surface of code;
5. keep the resulting implementation easy to understand and maintain.

Avoid:

- unnecessary abstractions;
- speculative future-proofing;
- broad unrelated refactors;
- generic systems for one isolated use case;
- redesigning healthy code merely because another approach is possible;
- unnecessary visual complexity.

If multiple approaches are valid, prefer the simplest one that fully satisfies the current requirement.

Do not expand the task scope without a concrete reason.

---

## 5. Proportional Investigation

Investigation and verification must be proportional to the complexity and risk of the task.

For substantial changes:

- inspect the relevant user flow;
- identify affected screens, components and services;
- inspect backend contracts when relevant;
- identify existing patterns to reuse;
- consider important UX states and edge cases;
- define clear acceptance criteria.

For small and localized changes, keep the process lightweight.

Do not turn simple UI changes into full-application audits.

Once enough context exists to implement the task safely, stop exploring unrelated areas and proceed.

---

## 6. Design System

Use the shared theme and existing design primitives as the primary source of truth for:

- colors;
- spacing;
- typography;
- reusable interaction patterns.

Prefer shared primitives such as existing buttons, cards, dropdowns, loaders and interaction components when appropriate.

Do not introduce:

- new legacy styling;
- duplicated color systems;
- arbitrary design tokens;
- one-off visual systems without a clear reason.

Avoid introducing new dependencies on legacy styling such as `heraLanding` when modern shared theme primitives already exist.

---

## 7. Visual & UX Principles

Maintain clear hierarchy between primary and secondary actions.

Interfaces should represent their real state honestly.

When relevant, handle:

- loading;
- empty;
- success;
- error;
- disabled;
- retry states.

Do not make unavailable or demo functionality appear fully operational.

Avoid unnecessary:

- gradients;
- excessive borders;
- excessive cards;
- decorative pills;
- shadows;
- animations;
- visual elements that do not improve hierarchy or usability.

The interface should not become visually more complex merely to appear more polished.

---

## 8. Responsive & Theme Behavior

Touched functionality should continue to behave correctly across the form factors it supports.

For web-facing changes, consider:

- desktop;
- tablet;
- mobile.

Preserve:

- readability;
- hierarchy;
- navigation;
- CTA visibility;
- scroll behavior;
- usable touch targets.

When modifying screens or components that support dark mode, preserve correct behavior in both light and dark themes.

Do not perform unrelated responsive or dark-mode redesigns outside the scope of the requested change.

---

## 9. Navigation

Respect existing navigation context.

Do not unintentionally break:

- sidebars;
- back navigation;
- modal escape routes;
- redirects;
- deep links;
- expected post-action navigation.

Users should not become trapped in a newly modified flow.

---

## 10. Data, Privacy & Authorization

Render only the information required for the current screen or action.

Do not expose unnecessary:

- patient data;
- specialist data;
- clinical information;
- internal identifiers;
- debugging information.

Frontend visibility is not authorization.

Do not implement security-sensitive business rules only in the client when they must be enforced by the backend.

---

## 11. Forms & User Actions

When relevant, forms should:

- validate user input for good UX;
- clearly represent submitting/loading state;
- prevent accidental duplicate submissions when necessary;
- display useful server errors;
- preserve user input after recoverable failures when practical.

Backend validation remains authoritative.

Do not create a second conflicting source of truth for business validation in the frontend.

---

## 12. Performance & Public Web

Maintain a reasonable performance mindset.

Avoid without a clear UX benefit:

- eager-loading heavy screens;
- oversized dependency imports;
- unnecessary rerenders;
- repeated API requests;
- always-running animations;
- unnecessary client-side work.

For public web changes, preserve when relevant:

- meaningful metadata;
- crawlable content;
- semantic structure;
- reasonable first-render performance;
- SEO and Core Web Vitals behavior.

Do not perform speculative micro-optimizations without evidence.

---

## 13. Files & Uploads

For images and documents:

- prefer file/multipart or supported storage upload flows;
- avoid Base64 conversion by default;
- avoid holding unnecessarily large binary data in client state.

Respect the backend upload contract.

---

## 14. Verification

Verification must be proportional to the change.

For substantial frontend changes, run the relevant combination of:

- `npx tsc --noEmit --pretty false`
- targeted tests
- `npm test`
- relevant existing regression suites

Prefer focused tests while iterating.

When fixing a bug or modifying regression-prone behavior, add a targeted regression test when practical.

Before completing a substantial task:

1. verify the requested behavior;
2. check the relevant acceptance criteria;
3. inspect the final diff;
4. confirm that no unintended changes were introduced;
5. verify relevant UX states and integration behavior;
6. correct confirmed problems and rerun affected checks.

Typecheck alone is not sufficient proof that a behavioral change is correct.

---

## 15. Stop Criteria

Do not perform endless rounds of abstract analysis.

Once:

- the requested behavior is implemented;
- relevant acceptance criteria are satisfied;
- appropriate checks pass;
- the final diff has been reviewed;
- no known critical or high-severity issue remains;

consider the task complete.

Do not continue exploring alternative architectures, redesign opportunities or hypothetical problems without a concrete reason.

---

## 16. Encoding

All frontend source, configuration and documentation files must remain UTF-8 without BOM.

If text shows signs of UTF-8/Windows-1252 corruption, treat it as real file corruption and verify the decoded source before editing.

After fixing encoding problems, reopen the affected file and verify representative strings.

---

## 17. Operational Commands

- **Development**: `npm start`
- **Web**: `npm run web`
- **Typecheck**: `npx tsc --noEmit --pretty false`
- **Tests**: `npm test`

Do not run broad or expensive verification unnecessarily when a focused check provides sufficient confidence.