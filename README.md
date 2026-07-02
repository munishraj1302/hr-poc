# Onboarding / Offboarding POC — Starter Repo

Matches `POC_Technical_Architecture.md`. This is a working skeleton, not a finished
product — every router, agent, and orchestrator is real, functional code, but
several endpoints are intentionally thin so each of you can build on top without
fighting merge conflicts.

## Prerequisites

- Python 3.11+
- Node 20+
- [Ollama](https://ollama.com) installed locally, with a model pulled:
  ```
  ollama pull gpt-oss:120b-cloud
  ```
- Docker + docker-compose (optional — you can also run everything locally without it)

## Quick start (local, no Docker)

**Terminal 1 — mock HRMS:**
```bash
cd mock_hrms
pip install -r requirements.txt --break-system-packages
uvicorn app:app --reload --port 9000
```

**Terminal 2 — backend:**
```bash
cd backend
pip install -r requirements.txt --break-system-packages
# uses sqlite by default (no Postgres needed for local dev) -- see app/database.py
uvicorn main:app --reload --port 8000
```

**Terminal 3 — frontend:**
```bash
cd frontend
npm install
npm run dev
```

**Terminal 4 — Ollama:**
```bash
ollama serve
```

Then visit `http://localhost:3000`. API docs (Swagger) at `http://localhost:8000/docs`.

## Quick start (Docker)

```bash
docker-compose up --build
```

Ollama still needs to run on your host (not containerized — see architecture doc
section 9 for why). The backend is configured to reach it at
`host.docker.internal:11434` automatically.

## Try the HRMS sync flow

1. `POST http://localhost:8000/hrms/sync/new-hires` (or click "Sync from HRMS" on
   the Directory page) — pulls the 3 fixture employees from `mock_hrms/fixtures/new_hires.json`,
   creates them, and runs the full onboarding pipeline automatically.
2. Check `GET /onboarding/{employee_id}/status` to see the tracker steps complete.
3. `GET /reports/{employee_id}?report_type=onboarding` generates the PDF, then
   `GET /reports/{employee_id}/download?report_type=onboarding` fetches it.
4. To rerun the demo from scratch: `POST http://localhost:9000/hrms/_reset` unmarks
   all fixture records as synced.

## What's built vs. what's a stub

| Area | Status |
|---|---|
| DB models (all 12 tables) | Done |
| Config JSON (roles/apps/groups/assets/compliance) | Done, sample data — expand as needed |
| `ai_client.py` (Ollama wrapper) | Done, with timeout + fallback |
| Role/Access/Hardware/Compliance/Risk agents | Done |
| Onboarding + Offboarding orchestrators | Done |
| Mock HRMS service | Done, 3 sample new hires + 1 exit |
| HRMS connector | Done |
| Auth | Done (4 hardcoded demo users, JWT) |
| Employees/Onboarding/Offboarding/Access/Assets/Approvals/Audit routers | Done |
| Reports (PDF generation) | Done (basic layout — style it further if time allows) |
| Frontend | **Stub only** — Login + Directory pages exist and call the real API. Executive Dashboard, Profile, Onboarding/Offboarding Tracker UI, and Reports Dashboard still need building. |

## Day 1 checklist

- [ ] Everyone: `git clone`, get local quick-start running, confirm you can hit `/docs`
- [ ] Nithishkumar R: swap `DATABASE_URL` to real Postgres once docker-compose is confirmed working on your machine; review/extend DB schema if needed
- [ ] Nithish A: review `hrms_connector.py` + `hrms_sync.py` — this is your Day 2 starting point
- [ ] Mohan Raj D: pull the Ollama model, confirm `ai_client.prewarm()` succeeds on startup, review agent prompts in `app/agents/`
- [ ] Keerthana A: confirm `npm run dev` works, review `lib/api.js` (every backend call you'll need is already wrapped there)

## Notes

- SQLite is the local dev default (`app/database.py`) so nobody's blocked on Postgres
  being up — switch to `DATABASE_URL` pointing at Postgres for integration testing.
- All AI agent calls have rule-based fallbacks (see `app/agents/`) — if Ollama isn't
  running, the app still works, just with lower-quality (but deterministic) output.
- This repo was syntax-checked but **not dependency-installed or live-tested**
  (sandboxed build environment had no PyPI/npm access) — run the quick start above
  end-to-end on Day 1 and report anything that breaks.
