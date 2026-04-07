# Deployment Guide

This document covers the full deployment process for **I Have Been Here** — from local development to a production-ready stack with Supabase, Railway, and EAS.

---

## Stack Overview

| Layer | Service | Purpose |
|---|---|---|
| Database + Storage | Supabase | PostgreSQL + image file storage |
| Backend | Railway | FastAPI server hosting |
| Mobile Build | EAS (Expo) | Android/iOS app builds |

---

## 1. Supabase Setup

### 1.1 Create a Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to finish provisioning

### 1.2 Create Storage Bucket

1. In the sidebar, go to **Storage**
2. Click **New bucket**
3. Name it `meal-images`
4. Set it to **Public**

### 1.3 Collect Credentials

Go to **Project Settings → API** and copy:

| Variable | Where to find |
|---|---|
| `SUPABASE_URL` | Project URL |
| `SUPABASE_SERVICE_KEY` | `service_role` secret key (not the publishable key) |

Go to **Project Settings → Database** and copy:

| Variable | Format |
|---|---|
| `DATABASE_URL` | Use `postgresql+asyncpg://...` format |

### 1.4 Configure Backend `.env`

Create `backend/.env`:

```env
GOOGLE_API_KEY=your_google_ai_api_key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
DATABASE_URL=postgresql+asyncpg://postgres:password@db.your-project.supabase.co:5432/postgres
```

> **Important:** Use the `service_role` JWT key, not the `publishable` key. The service role key starts with `eyJ` and is much longer.

---

## 2. Railway Setup

### 2.1 Required Files

The repo includes these files for Railway deployment:

**`backend/Dockerfile`** — builds the FastAPI app using `uv`:
```dockerfile
FROM python:3.13-slim
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/
WORKDIR /app
COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --frozen --no-dev
COPY backend/ .
EXPOSE 8000
CMD uv run uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
```

**`railway.toml`** — tells Railway to use the Dockerfile:
```toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "backend/Dockerfile"

[deploy]
healthcheckPath = "/health"
healthcheckTimeout = 300
restartPolicyType = "ON_FAILURE"
```

> **Note:** `buildContext` is intentionally omitted — Railway uses the repo root as the build context, so the Dockerfile references `backend/` paths explicitly.

### 2.2 Create Railway Project

1. Go to [railway.app](https://railway.app)
2. **New Project → GitHub Repository** → select `IHaveBeenHere`
3. Railway auto-detects `railway.toml` and starts building

### 2.3 Set Environment Variables

In the Railway dashboard → your service → **Variables**, add:

```
GOOGLE_API_KEY=...
SUPABASE_URL=...
SUPABASE_SERVICE_KEY=...
DATABASE_URL=...
```

### 2.4 Generate Public URL

1. Go to your service → **Settings → Networking**
2. Click **Generate Domain**
3. You'll get a URL like `https://ihavebeenhere-production.up.railway.app`

### 2.5 Verify Deployment

```bash
curl https://ihavebeenhere-production.up.railway.app/health
# Expected: {"status":"healthy"}

curl https://ihavebeenhere-production.up.railway.app/meals
# Expected: {"meals":[], "stats":{...}}
```

---

## 3. Frontend Configuration

### 3.1 Local Development

Set `frontend/.env` to your Railway URL:

```env
API_URL=https://ihavebeenhere-production.up.railway.app
APP_ENV=development
```

> For local backend testing, use your Mac's LAN IP (e.g. `http://10.0.0.46:8000`) instead.

### 3.2 `app.config.ts`

The frontend uses `app.config.ts` (dynamic config) to inject the API URL at build time:

```ts
module.exports = {
  expo: {
    owner: 'your-expo-username',
    name: 'I Have Been Here',
    slug: 'i-have-been-here',
    // ...
    extra: {
      API_URL: process.env.API_URL ?? 'https://ihavebeenhere-production.up.railway.app',
      APP_ENV: process.env.APP_ENV ?? 'production',
      eas: {
        projectId: 'your-eas-project-id',
      },
    },
  },
};
```

---

## 4. EAS Build Setup

### 4.1 Install EAS CLI

```bash
npm install -g eas-cli
```

### 4.2 Login to Expo

```bash
expo login
```

### 4.3 Link EAS Project

```bash
cd frontend
eas init --id your-eas-project-id
```

If `eas build:configure` creates a new project automatically, it will output the project ID. Add it to `app.config.ts` under `extra.eas.projectId`.

> **Troubleshooting:** EAS CLI requires `app.config.ts` (not `.js`) for TypeScript projects. Use `module.exports = { ... }` syntax (CommonJS), not `export default`.

### 4.4 `eas.json` Build Profiles

```json
{
  "cli": { "version": ">= 15.0.0" },
  "build": {
    "preview": {
      "distribution": "internal",
      "env": {
        "APP_ENV": "staging",
        "API_URL": "https://ihavebeenhere-production.up.railway.app"
      }
    },
    "production": {
      "distribution": "store",
      "autoIncrement": true,
      "ios": { "simulator": false },
      "android": { "buildType": "app-bundle" },
      "env": {
        "APP_ENV": "production",
        "API_URL": "https://ihavebeenhere-production.up.railway.app"
      }
    }
  }
}
```

### 4.5 Build for Android (No Apple Developer Account Required)

```bash
cd frontend
eas build --profile preview --platform android
```

- Build runs on EAS servers (~10–15 min)
- When complete, you get a download link for the `.apk`
- Share the link with Android testers — they can install it directly

### 4.6 Build for iOS (Requires Apple Developer Account)

Apple Developer Program costs $99/year. Once enrolled:

```bash
eas build --profile preview --platform ios
```

For wider distribution, use **TestFlight**:

```bash
eas submit --platform ios
```

---

## 5. Deployment Architecture

```
[Mobile App - EAS Build]
        |
        | HTTPS
        v
[Railway - FastAPI Backend]
        |
        |-- AI calls --> [Google Gemini API]
        |
        |-- DB queries --> [Supabase PostgreSQL]
        |
        |-- Image upload --> [Supabase Storage]
                                    |
                                    | Public URL
                                    v
                            [Mobile App displays image]
```

---

## 6. Gotchas & Lessons Learned

| Issue | Root Cause | Fix |
|---|---|---|
| `load_dotenv()` not overriding env vars | Shell had stale env vars | Use `load_dotenv(override=True)` |
| Wrong Supabase key | Used publishable key instead of service_role | Copy `service_role` JWT from Project Settings → API |
| Date filter "Unknown error" | Timezone-aware datetime vs naive DB column mismatch | Use naive datetimes (no `tzinfo`) for asyncpg |
| AI menu detection returning empty | Image tools used `Path.exists()` on `https://` URLs | Load images via `httpx` for URL paths |
| "Network request failed" on real device | `localhost` not reachable from phone | Use Mac's LAN IP or Railway URL |
| EAS can't find `uv.lock` | `buildContext` not honored; repo root used | Reference `backend/uv.lock` explicitly in Dockerfile |
| EAS `eas init` fails | `export default` not readable by EAS CLI | Use `module.exports` in `app.config.ts` |
| EAS slug mismatch | Auto-generated slug `i-have-been-here` ≠ `ihavebeenhere` | Match slug in `app.config.ts` to EAS project slug |
