# Public HTML and psychology pages

The existing Expo application remains the interactive application. `scripts/prepare-web.cjs`
exports its shell, static landing content and the small CommonJS modules used by
`api/public-page.js`. Vercel routes only public discovery pages through that function.
Private, booking, consent and calendar routes retain their existing rewrites.

## Data and rendering

- `src/seo/publicContent.ts` owns the three topic pages, public metadata and directory query serialization.
- `src/seo/publicHtml.ts` renders escaped public content. The new web topic screens use the same presentation as the initial HTML.
- `psychologyPresentation.ts` uses HERA theme tokens for the topic pages. Their mounted screen reuses `LandingHeader` and `FooterSection`; the initial document includes the existing logo asset and public navigation.
- Topic profiles remain a compact, scrollable preview. JavaScript adds carousel controls; native links and FAQ disclosures remain usable without it.
- Topic cards match the featured landing cards: square portraits, Ionicons, theme-aware verified badges, and the same type scale. The public directory enforces verified status before returning profiles.
- The initial document temporarily allows body scrolling; the application restores its existing nested scrolling after mounting. Public age and experience filters are forwarded along with the other directory filters.
- Public responses use the existing unauthenticated API, an eight-second timeout and `no-store`.
- `publicData.ts` validates and selects bootstrap fields. No user credentials are forwarded.
- The matching screen consumes its initial data once, then retains normal discovery revalidation. `usePublicHtmlReady` releases the initial presentation after the screen is ready.
- Missing/inaccessible profiles return 404. Unlisted but accessible profiles remain 200 with `noindex`. Temporary upstream failures return 503 with `Retry-After`.
- Profile aliases redirect to the current slug. Filtered directory pages are `noindex, follow`; unfiltered pagination has self-referencing canonicals.

## Verification

Run `npm run typecheck`, `npm run test:seo`, the affected Jest suites, and `npm run build:web`.
Check the generated build with and without JavaScript, including a valid profile, an invalid profile,
an alias, each topic page and `/especialistas?page=2`. Verify the application replaces initial content,
does not immediately repeat the directory/profile request, and preserves its title after navigation settles.
Also check no-JavaScript scrolling to the FAQ, image-error initials, carousel navigation after switching
themes, and the directory, profile and questionnaire links. The SVG attribution ships in
`public/ionicons-LICENSE.txt`.

The runtime function needs `dist/app-shell.html` and `.seo-build/**`; these are included by `vercel.json`.
`EXPO_PUBLIC_API_URL` must point at the same backend for the function and the browser bundle.
The default is the production API. Never point a public preview at a developer's local API.

## Rollout

Deploy the compatible backend update first: it adds `professionalTypes` (comma-separated or array)
to the existing directory API and rejects simultaneous use of `professionalType`.
Then deploy the frontend and verify the function in Vercel, including its packaged build files.
No database migration is introduced by this change.

The updated sitemap adds the three topic URLs. After deployment, inspect them and a sample profile
in Search Console and request indexing. A successful local build does not establish production
Core Web Vitals or Google's indexing status; verify those separately after publication.
