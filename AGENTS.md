# HERA Frontend: Agent Guidelines & UI Architecture (April 2026)

## 1. Frontend Mission
The frontend must feel premium, calm, trustworthy and easy to evolve. We optimize for clean architecture, visual consistency and honest product behavior.

## 2. Frontend Architecture Rules
- **Screen as Container**: Screens orchestrate data loading, navigation and high-level state.
- **UI in Components**: Reusable visual sections belong in `src/components/` or local feature subcomponents, not inline in giant screens.
- **Services Own API Access**: Screens and components should call domain services in `src/services/`, not raw API clients directly.
- **Single Responsibility**: Keep render logic, mapping logic and side effects separated whenever practical.
- **Strict TypeScript**: No `any`, no `@ts-ignore`, no untyped navigation payloads.
- **Encoding Standard**: All frontend source, config and documentation files must be saved as **UTF-8 without BOM**. Never save `ts`, `tsx`, `js`, `jsx`, `json`, `md`, `css`, `html` or similar text files as ANSI/Windows-1252 or after lossy editor conversions.

### Encoding Guardrail
- If text shows classic mojibake markers from a UTF-8/Windows-1252 mix-up, treat it as file corruption, not as a harmless terminal display issue.
- Before editing a frontend file with Spanish text, verify the decoded content first and repair the file to valid UTF-8 before making product changes.
- After any encoding-related fix, re-open the affected file and verify representative Spanish strings directly in source.

## 3. Design System Standards
- **Theme First**: Use shared theme tokens as the source of truth for colors, spacing and typography.
- **Dark Mode Mandatory**: Every touched screen and component must render correctly in both light and dark mode.
- **Shared Primitives First**: Use shared primitives such as `Button`, `AnimatedPressable`, dropdowns, cards and loaders before building custom one-offs.
- **No New Legacy Styling**: Do not introduce new usage of `heraLanding`, hardcoded color systems or ad hoc visual tokens.
- **Professional Aesthetic**: Large surfaces should stay neutral and calm. Brand colors should appear as accents, not neon-heavy backgrounds.
- **Responsive by Default**: Preserve affordance, scroll visibility and hierarchy across desktop, tablet and mobile.

## 4. Visual & UX Expectations
- **Primary/Secondary CTA Discipline**: CTA hierarchy must stay consistent across screens.
- **Visible Scroll Affordance**: If desktop content scrolls, the UI should make that discoverable.
- **Honest Status Design**: Empty states, beta states and loading states must reflect real product behavior.
- **Loading Quality**: Global and local loaders must match the active theme and the premium HERA visual language.

## 5. Quality & Maintainability
- **Incremental Refactors**: When touching legacy hotspots, reduce responsibility and coupling rather than adding more logic to the same file.
- **No Fake Operative Flows**: Demo or beta experiences must be labeled clearly and must not imitate a real live service if one does not exist.
- **Rebrand Readiness**: Touched code should move toward centralized style control through the shared theme.
- **Typecheck Before Close-Out**: Run `npx tsc --noEmit --pretty false` before finishing substantial frontend changes.
- **Smoke Tests for Core Flows**: Add or update smoke tests when touching shared primitives, onboarding, questionnaire, sessions, profile or other critical flows.
- **Web Performance Budget Mindset**: Avoid eager-loading heavy screens, oversized fonts/icon packs, always-on animations or repeated data fetches unless the UX gain clearly justifies the cost.
- **SEO & CWV Safety**: Public web changes must preserve meaningful metadata, crawlable structure and fast first render instead of shipping SPA-only shells with avoidable heavy assets.
- **Upload Efficiency**: For images or documents, prefer file/multipart flows over converting assets to `base64` in the client.

## 6. Operational Commands
- **Development**: `npm start`
- **Web**: `npm run web`
- **Typecheck**: `npx tsc --noEmit --pretty false`
- **Tests**: `npm test`

## 7. Safety & Privacy
- **Sensitive Context**: Never expose unnecessary patient or specialist data in UI, logs or helper text.
- **Minimal Data Rendering**: Render only the information required for the current screen or action.
- **Respect Existing Navigation Context**: Do not break sidebars, back navigation or escape routes when modernizing screens.

## 8. Release Bar
- **Production-Looking Means Production-Honest**: If a feature is demo-only, the UI must say so.
- **No Silent Regressions**: Preserve existing working behavior unless the change is intentional and user-visible.
- **Definition of Done**: Visual consistency, dark mode correctness, typecheck pass and no new architectural shortcuts.
