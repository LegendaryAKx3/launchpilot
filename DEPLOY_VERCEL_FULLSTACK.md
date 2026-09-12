# Deploy LaunchPilot on Vercel (Frontend + API)

Two Vercel projects from the same repo:
- Frontend project, Root Directory `apps/web`
- API project, Root Directory `apps/api` (FastAPI on Vercel's Python runtime)

Both auto-deploy on push to `main`.

## 1. Constraints to know about

- The API runs as a serverless function. Every request, including FastAPI background tasks that run after the response, must finish within the function's `maxDuration`. `apps/api/vercel.json` sets it to `"max"` for your plan. Long research or execution runs that exceed it return a 504.
- Vercel does not run Alembic. Migrations are run manually (section 4).
- Each warm instance opens its own database pool. Use your provider's pooled connection string and keep the pool small (section 3).
- Hobby plan is non-commercial only.

## 2. Create the production Postgres

Any managed Postgres works (Neon, Supabase, RDS). Copy the **pooled** connection string and convert it to SQLAlchemy form:

```
postgresql+psycopg://USER:PASSWORD@HOST:PORT/DBNAME
```

`postgres://` and `postgresql://` will not work: SQLAlchemy rejects the first and the second needs psycopg2, which is not installed.

## 3. Deploy the API

1. Vercel -> Add New -> Project -> pick this repo.
2. Root Directory: `apps/api`. Framework Preset: FastAPI. Vercel finds `app/main.py` and the `app` object on its own.
3. Add env vars (Production):

Required:

| Name | Value |
| --- | --- |
| `SUPABASE_DB_URL` | pooled URL from section 2 |
| `AUTH_MODE` | `dev` (or `auth0`, see section 5) |
| `WEB_APP_URL` | frontend production origin, e.g. `https://launchpilot-xxx.vercel.app`, no trailing slash |
| `BACKBOARD_API_KEY` | your key |
| `DB_POOL_SIZE` | `1` |
| `DB_MAX_OVERFLOW` | `0` |

Optional (defaults shown are what the old Render config used):

| Name | Value |
| --- | --- |
| `BACKBOARD_BASE_URL` | `https://app.backboard.io/api` |
| `BACKBOARD_LLM_PROVIDER` | `openai` |
| `BACKBOARD_MODEL_NAME` | `gpt-4o` |
| `BACKBOARD_MEMORY_MODE` | `On` |
| `RESEND_API_KEY` | leave unset for mock email |
| `RESEND_FROM_EMAIL` | `noreply@growthlaunchpad.app` |

4. Deploy.
5. Project Settings -> Deployment Protection -> turn it **off** for this project. With it on, the frontend's server-side calls get a 302 to Vercel SSO instead of JSON.
6. Check `GET https://<api-project>.vercel.app/v1/health` returns `{"data":{"status":"ok"}}`.

## 4. Run migrations

From your machine, against the production database. Repeat whenever a migration is added.

```bash
cd apps/api
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export SUPABASE_DB_URL='postgresql+psycopg://USER:PASSWORD@HOST:PORT/DBNAME'
alembic upgrade head
```

## 5. Deploy the frontend

1. Vercel -> Add New -> Project -> same repo, second project.
2. Root Directory: `apps/web`. Framework Preset: Next.js.
3. Env vars (Production):

| Name | Value |
| --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | `https://<api-project>.vercel.app/v1` |
| `API_BASE_URL` | `https://<api-project>.vercel.app/v1` |
| `NEXT_PUBLIC_APP_URL` | `https://<web-project>.vercel.app` |

If using Auth0 web login, also:
`APP_BASE_URL`, `AUTH0_SECRET`, `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`, `AUTH0_AUDIENCE`, optional `AUTH0_SCOPE`.

4. Deploy. If the site should be public, turn Deployment Protection off here too.
5. Go back to the API project and confirm `WEB_APP_URL` matches this project's production origin exactly, then redeploy the API so CORS picks it up.

## 6. Auth0 (only when `AUTH_MODE=auth0`)

API project env: `AUTH0_ISSUER`, `AUTH0_AUDIENCE`, `APP_JWT_NAMESPACE`, `AUTH0_DOMAIN`, `AUTH0_M2M_CLIENT_ID`, `AUTH0_M2M_CLIENT_SECRET`, `AUTH0_MANAGEMENT_AUDIENCE`.

Auth0 application settings:
- Allowed Callback URLs: `https://<web-project>.vercel.app/auth/callback`
- Allowed Logout URLs: `https://<web-project>.vercel.app`
- Allowed Web Origins: `https://<web-project>.vercel.app`

## 7. Validation

1. `GET /v1/health` on the API responds.
2. Web loads and can create a project.
3. Research, positioning, and execution endpoints respond.
4. Approval flow works.
5. Outreach send works (real if `RESEND_API_KEY` is set, mock otherwise).
