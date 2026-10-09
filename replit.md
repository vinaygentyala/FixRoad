# FixMyRoad

A civic-tech demo for citizen pothole reporting, AI-assisted image assessment, and municipal repair tracking.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/fixmyroad run dev` — run the FixMyRoad web app
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/fixmyroad/` — FixMyRoad React app and setup notes
- `artifacts/api-server/src/routes/analysis.ts` — server-side pothole photo assessment
- `lib/api-spec/openapi.yaml` — API contract source of truth

## Architecture decisions

- The first build stores reports and sample data in browser local storage; it is a same-browser demo, not shared municipal storage.
- Demo citizen/officer role switching is not authentication. Add identity and role authorization before enabling shared report writes.
- AI photo assessment runs through the server and reads `OPENAI_API_KEY` from Replit Secrets; never expose the key to the browser.

## Product

Citizens can submit pothole photos, receive a model assessment, and follow tickets. Officers can review reports, change severity, assign teams, add notes, and move a report through the status timeline.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
