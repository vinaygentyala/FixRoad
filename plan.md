# FixMyRoad implementation plan

## Implementation approach

Preserve the existing Vite React frontend, Express API, file-backed store, role-based routing, and vision endpoint. Extend the current report contract with separate weather context and officer correction metadata; keep reporter-provided photo, location, landmark, and description unchanged. Camera capture and file upload continue through the same `PhotoCapture` callback and therefore the same AI analysis and submission mutation.

Priority is image-led: reliable AI severity maps directly to High, Medium, or Low. Location-specific weather is fetched server-side from the reporter-entered location using Open-Meteo geocoding and forecast data, stored on the report with source and timestamp, and may raise Medium to High only under a transparent heavy-rain rule. Weather never creates the removed seasonal dashboard alert and does not replace the original location text. If AI or weather is unavailable, submission continues and the report is clearly marked for review or notes the unavailable context.

The officer interface keeps its existing queue, assignments, status controls, and role guard. The seasonal banner and seasonal copy are removed from officer-facing surfaces; actual report data and weather context remain available in report details. Officer priority corrections record a reason and are presented as officer metadata.

## Design direction

- **Design movement:** vibrant civic-tech dashboard, combining utility-first information design with a warm, optimistic public-service palette.
- **Core principles:** evidence first; reporter data is sacred; AI and external context are visibly separated; every action has a clear state.
- **Color philosophy:** electric blue communicates action and trust, teal signals progress, yellow flags attention without panic, soft white keeps dense operational views calm, and deep navy anchors legibility.
- **Layout paradigm:** a responsive command-center canvas with compact stat bands, split evidence/context panels, and progressive disclosure in report modals rather than a centered marketing grid.
- **Signature elements:** blue-to-teal action gradients, rounded evidence cards with labeled provenance, and thin status timelines that show the handoff from citizen to crew.
- **Interaction philosophy:** direct manipulation with explicit loading, success, error, and review states; camera and upload are equal first-class choices.
- **Animation:** subtle 150–220ms fades and lifts for cards, no distracting motion during camera capture, and visible progress spinners for AI/weather/network work.
- **Typography system:** existing Inter-like sans for UI text, strong compact section headings, and readable 14–16px body copy with generous line height.
- **Brand essence:** a clearer route from citizen evidence to municipal repair; practical, reassuring, accountable.
- **Brand voice:** concise and civic: “Show us what the road needs.” / “Evidence in, repair in motion.”
- **Wordmark & logo:** retain the existing FixMyRoad mark and its road/repair visual language.
- **Signature brand color:** electric blue `#2563EB`, paired with teal `#14B8A6`.

## Project structure

- `artifacts/fixmyroad/src/components/camera.tsx`: secure camera lifecycle, capture, upload validation, and previews.
- `artifacts/fixmyroad/src/pages/reporter/report.tsx`: shared analysis/submission flow and provenance-aware result display.
- `artifacts/fixmyroad/src/components/report.tsx`: reporter evidence, AI/weather metadata, and officer corrections.
- `artifacts/fixmyroad/src/pages/officer/*`: clean role-specific operations without seasonal notification UI.
- `artifacts/fixmyroad/src/lib/types.ts` and `meta.ts`: shared report, priority, and weather display types.
- `artifacts/api-server/src/routes/analysis.ts`: structured vision assessment.
- `artifacts/api-server/src/routes/reports.ts`: validation, weather lookup, image-led priority, persistence, and protected officer updates.
- `artifacts/api-server/src/lib/weather.ts`: location-specific geocoding and forecast assessment.
- `artifacts/api-server/src/lib/priority.ts`: transparent image/weather priority rules without global season logic.
- `artifacts/api-server/src/lib/store.ts`: durable report persistence.

## Serving and constraints

The existing dev/build scripts remain the source of truth. Camera access requires a secure context in deployment (HTTPS); local development can use localhost. API keys stay server-side. Weather uses a public provider and degrades gracefully when lookup or forecast fails. The file-backed store persists across refreshes in the running environment but is not a multi-instance database.
