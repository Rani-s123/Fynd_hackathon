# Defect Pattern Detector & Auto-Escalator

Built for the **Fynd Hiring Hackathon 2026** (Field Support Engineer track).

Detects repeated manufacturing defects in near real time, shows a documented fix when
the defect is already known, opens an investigation ticket when it isn't, and — when the
same defect code hits the same station 3+ times within a configurable window — escalates
automatically: opens a critical alert, an investigation ticket, and an NCR, then tracks
the whole thing through to resolution with a full audit trail.

> "The system does not wait for the line to stop. It detects the third repeated defect,
> explains what is happening, and routes the issue to the right person with evidence."

## Architecture

```
Defect-main/
├── src/               React + TypeScript + Tailwind frontend (Vite)
├── server/            Node.js + Express + SQLite backend (the real API + database)
└── .env.example       Frontend env template
```

The frontend can run two ways:
- **Standalone (no backend)** — an in-memory mock (`src/api/client.ts`) with realistic
  seed data, so the UI is fully demoable without running anything else. Data resets on
  page refresh in this mode.
- **Against the real backend** — set `VITE_API_URL`, and every request goes to the
  Express API in `server/`, which persists to a real SQLite database. This is the mode
  that satisfies the hackathon's database/API/testing requirements and the acceptance
  criterion that an audit trail survives a page refresh.
## Demo Video

[Watch the demo video](https://github.com/Rani-s123/Fynd_hackathon/blob/main/docs/demo_video.mp4)

Both implementations share the exact same rule engine logic (see "Detection algorithm"
below), kept in sync so the demo behaves identically either way.

## Quick start

### 1. Backend (recommended — real persistence)

```bash
cd server
npm install
npm run dev          # starts on http://localhost:3001, creates server/data/defect.db
```

Run the backend test suite:

```bash
cd server
npm test             # 15 tests: the rule engine's 10 required cases + HTTP-layer tests
```

### 2. Frontend

```bash
npm install
cp .env.example .env         # uncomment/set VITE_API_URL to point at the backend
npm run dev                  # http://localhost:5173
```

If you skip the `.env` step (or leave `VITE_API_URL` blank), the frontend runs entirely
on its in-memory mock — no backend needed, useful for quick UI-only iteration.

### 3. Try the acceptance-criteria flow

1. Open the dashboard.
2. Click **Run Demo Scenario**, or manually log 3 `TORQUE_LOW` defects at station `ST-07`
   within 30 minutes of each other via **Log Defect**.
3. The 3rd defect returns a `SYSTEMIC` classification and opens a CRITICAL/HIGH alert,
   a ticket, and an NCR in one shot.
4. Open the alert, see the exact matching serial numbers and timestamps, acknowledge it,
   move it through `INVESTIGATING → CONTAINED → RESOLVED`, adding a note at each step.
5. Refresh the page — with the backend running, the alert and its full audit trail are
   still there (this is stored in SQLite, not just React state).
6. Log a defect with code `SEAL_LEAK`, `LABEL_MISSING`, or `SCAN_FAIL` — since these are
   in the known-fix knowledge base, you'll get the documented fix immediately instead of
   an escalation.

## Environment variables

**Frontend** (`.env`, see `.env.example`):
| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Base URL of the backend, e.g. `http://localhost:3001`. Unset → uses the in-memory mock. |

**Backend** (`server/.env`, see `server/.env.example`):
| Variable | Purpose |
|---|---|
| `PORT` | Port the API listens on. Default `3001`. |
| `DB_PATH` | Path to the SQLite file. Default `server/data/defect.db`. |

## Detection algorithm

Implemented identically in `server/src/rules.js` (real backend) and `src/api/client.ts`
(frontend mock):

```
onDefectCreated(defect):
  matching = defects where station_id = defect.station_id
                       and defect_code = defect.defect_code
                       and occurred_at within [defect.occurred_at - window, defect.occurred_at]
  count = matching.count   # defect is inserted before this runs, so it's already included

  if known_fix_exists(defect.defect_code): classification = KNOWN
  else: classification = UNKNOWN

  if count >= threshold:
    classification = SYSTEMIC
    if an OPEN/ACKNOWLEDGED/INVESTIGATING/CONTAINED alert already exists for this
       exact station+code pattern:
      update it in place (idempotent — no duplicate alert/ticket/NCR)
    else:
      create alert + ticket + NCR, notify line leader, write audit event
```

Two properties the brief calls out explicitly, and that are easy to get subtly wrong:

- **Event-time evaluation.** The window is computed from each defect's own `occurred_at`,
  never from the server's current clock, so a delayed or offline submission is still
  evaluated correctly against the time it actually happened.
- **Idempotency.** Reprocessing into an already-open pattern (e.g. a 4th, 5th defect
  while the alert from the 3rd is still open) updates the existing alert/ticket/NCR
  rather than creating new ones. Only after an alert is `RESOLVED` does the same pattern
  reappearing create a fresh incident.

## Database schema (SQLite)

`stations`, `products`, `defect_codes`, `known_fixes`, `defects`, `alerts`, `tickets`,
`ncrs`, `audit_events`, `alert_history`, `activity_events`, `settings`, `id_seq`.

Indexed on `(station_id, defect_code, occurred_at)` for the pattern query, per the
brief's non-functional requirements. IDs (`DEF-1001`, `ALT-2003`, ...) are generated from
a persistent per-prefix counter table, so they stay stable and readable across restarts.

## API surface

All endpoints live under `/api`. See `server/src/routes.js` for the full implementation;
the key ones:

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/defects` | Create a defect, run the rule engine, return the classification |
| `GET` | `/defects?station_id=` | List defects |
| `GET` | `/alerts?state=` | List alerts |
| `GET` | `/alerts/:id` | Get one alert |
| `POST` | `/alerts/:id/acknowledge` | `OPEN → ACKNOWLEDGED` |
| `POST` | `/alerts/:id/transition` | Move through the rest of the lifecycle |
| `GET` | `/alerts/:id/evidence` | Matched defects behind an alert |
| `GET` | `/alerts/:id/history` | Full state-change history for an alert |
| `GET` / `POST` | `/known-fixes` | Knowledge base |
| `POST` | `/ncrs/:alertId` | Update containment / corrective action |
| `GET` | `/metrics/summary`, `/metrics/station-risk`, `/metrics/trend` | Dashboard data |
| `GET` | `/audit`, `/activity` | Audit trail / activity feed |
| `GET` / `POST` | `/settings` | Read/update threshold N and window T |
| `POST` | `/demo` | Seeds the 3-defect demo scenario server-side |

## Design

Restyled away from the generic SaaS-dashboard default (white cards, slate-grey text, blue
accents, Inter) into something grounded in the subject matter: a factory-floor
instrument panel for a field engineer. IBM Plex Sans/Mono (designed for technical,
enterprise systems), a warm steel-grey surface instead of clinical white/slate, and a
single deliberate bronze/brass accent used only for the logo mark, the active nav rail,
primary actions, and focus rings. Severity shows as a left-edge signal bar on rows (like
a panel indicator light) as well as the usual badge, station-risk tiles carry a small
gauge-fill readout, and a newly-fired systemic alert gets one brief highlight sweep on
the dashboard -- the one orchestrated motion moment, rather than hover animations on
everything.

## Testing

```bash
cd server && npm test
```

19 tests covering the brief's 10 required cases plus HTTP-layer and settings/known-fix checks:

1. One defect does not create an alert
2. Two matching defects within the window do not cross a threshold of three
3. Three matching defects create exactly one alert, one ticket, one NCR
4. Three matching defects at different stations do not escalate
5. Three matching defects outside the time window do not escalate
6. A known defect returns its documented fix
7. An unknown defect creates an investigation ticket
8. Reprocessing an already-open pattern does not duplicate escalation records
9. An alert can move through its full lifecycle and retains audit history
10. Invalid input (unknown station, missing fields) is rejected with a useful message

Plus a few extra checks beyond the required list: settings validation, settings actually
affecting live classification, the known-fix helpful-count endpoint, and a clean JSON 404
for unknown routes.

## What's implemented vs. future work

**Implemented:** defect intake with validation and dedup, the full rule engine
(event-time based, idempotent), known-fix knowledge base with a helpful-count, automatic
alert/ticket/NCR escalation, the full alert lifecycle with notes and audit history,
dashboard (summary cards, station risk grid, trend chart, activity feed, demo-scenario
button), settings for threshold/window, English/Telugu i18n, light/dark theme, a real
SQLite-backed API with 15 passing tests.

**Deliberately out of scope for this MVP** (per the brief's section 3.3): connecting to a
real factory PLC, a full enterprise identity/auth system, legally binding quality
documents, real email/webhook delivery for the line-leader notification (currently an
in-app notification centre).

**Natural next steps:** role-based auth instead of the current demo role-switcher,
production impact calculation, a corrective-action recommender trained on historical
resolutions, offline capture for floor engineers.
