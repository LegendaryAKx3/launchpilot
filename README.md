# Growth Launchpad

Growth Launchpad is a hackathon-focused MVP for supervised, multi-agent product launches.

This repo is intentionally streamlined for a 36-hour delivery window:
- Next.js frontend (`apps/web`)
- FastAPI backend (`apps/api`)
- Postgres for app state
- Synchronous execution flow (no worker queue)

## Core Product Slice

The shipped slice is:

1. Create project
2. Run research
3. Run positioning
4. Generate execution plan + assets
5. Prepare outreach batch
6. Approve send
7. Send emails (real Resend if configured, mock otherwise)

## Repo layout

- `apps/web`: Next.js App Router UI
- `apps/api`: FastAPI API, SQLAlchemy models, Alembic migrations
- `infra/docker`: local Docker Compose for DB + migrate + API
- `infra/scripts`: utility scripts

## Prerequisites

- Node.js 20+
- npm 10+
- Python 3.12+
- Postgres 15+ (or Docker)

## Environment setup

1. Copy `.env.example` to `.env`
2. Choose auth mode:
   - `AUTH_MODE=dev` (recommended for hackathon speed)
   - `AUTH_MODE=auth0` (strict JWT validation)

## Local development

### 1. Install web dependencies

```bash
npm run install:web
```

### 2. Install API dependencies

```bash
cd apps/api
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
```

### 3. Run API migrations

From `apps/api`:

```bash
alembic upgrade head
```

### 4. Start API

From repo root:

```bash
uvicorn app.main:app --reload --app-dir apps/api
```

### 5. Start web

From repo root:

```bash
npm run dev
```

## Docker quickstart

```bash
docker compose -f infra/docker/docker-compose.yml up --build
```

This starts:
- Postgres
- Migration job
- API

Note: frontend is not run by Docker Compose in this repo.

## Auth modes

### Dev mode (fastest)

Set:

```env
AUTH_MODE=dev
```

Backend uses a local fallback user/scopes. No Auth0 API token verification is required.

### Auth0 mode

Set:

```env
AUTH_MODE=auth0
AUTH0_ISSUER=https://YOUR_TENANT.us.auth0.com/
AUTH0_AUDIENCE=YOUR_API_IDENTIFIER
```

Backend fails fast on startup if these are missing.

## API overview

Base URL: `http://localhost:8000/v1`

### Identity

- `GET /me`

### Projects

- `GET /projects`
- `POST /projects`
- `GET /projects/{project_id}`
- `POST /projects/{project_id}/brief`
- `POST /projects/{project_id}/sources`
- `GET /projects/{project_id}/memory`
- `GET /projects/{project_id}/activity`

### Research

- `POST /projects/{project_id}/research/run` (synchronous)
- `GET /projects/{project_id}/research`

### Positioning

- `POST /projects/{project_id}/positioning/run` (synchronous)
- `GET /projects/{project_id}/positioning`
- `POST /projects/{project_id}/positioning/select/{version_id}`

### Execution

- `POST /projects/{project_id}/execution/plan` (synchronous)
- `POST /projects/{project_id}/execution/assets` (synchronous)
- `POST /projects/{project_id}/execution/contacts`
- `POST /projects/{project_id}/execution/email-batch/prepare` (synchronous)
- `POST /projects/{project_id}/execution/email-batch/{batch_id}/send` (requires approval)
- `GET /projects/{project_id}/execution/state`

### Approvals

- `GET /projects/{project_id}/approvals`
- `POST /approvals/{approval_id}/approve`
- `POST /approvals/{approval_id}/reject`

## Frontend route map

- `/`
- `/login`
- `/app`
- `/app/projects`
- `/app/projects/new`
- `/app/projects/[projectSlug]`
- `/app/projects/[projectSlug]/research`
- `/app/projects/[projectSlug]/positioning`
- `/app/projects/[projectSlug]/execution`
- `/app/projects/[projectSlug]/approvals`
- `/app/projects/[projectSlug]/memory`
- `/app/projects/[projectSlug]/settings`
- `/app/settings/security`

Legacy workspace routes still exist as redirects for compatibility.
