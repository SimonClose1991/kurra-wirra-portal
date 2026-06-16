# Deploying the Kurra-Wirra Staff Portal to Render

This guide takes the portal off Replit and onto **Render**, deployed from
**GitHub**. The app is now a single web service (Express API + built React
frontend on one origin) plus a managed Postgres database.

Three external services replace the Replit-managed pieces:

| Replit piece            | Replacement                          | Cost |
|-------------------------|--------------------------------------|------|
| Replit Postgres         | Render managed PostgreSQL            | free trial (deleted after ~30 days) / ~US$6-7/mo basic-256mb |
| Replit Object Storage   | Cloudflare R2 (S3-compatible)        | free up to 10 GB, no egress fees |
| Replit Gmail connector  | Any SMTP (Resend / Brevo / Gmail)    | free tiers available |
| Replit-managed Clerk    | Your own Clerk app                   | free up to 10k MAU |

> **Running cost:** roughly **US$13–14/month** all-in for an always-on setup
> (Starter web service ~$7 + basic-256mb Postgres ~$6–7), with R2, Clerk and
> SMTP on their free tiers. To trial for free, set both Render plans to `free` —
> but the web service sleeps after 15 min idle (30–60s cold start) and the
> Postgres database is **permanently deleted after ~30 days**.

---

## 1. Regenerate the lockfile, then push to GitHub

The dependency changes (S3 SDK in, Replit/GCS packages out) mean
`pnpm-lock.yaml` must be refreshed once before the first deploy:

```bash
cd workspace
corepack enable
pnpm install            # regenerates pnpm-lock.yaml with the new deps
```

Then push:

```bash
git init
git add .
git commit -m "Portable build: Render-ready, Replit couplings removed"
git branch -M main
git remote add origin https://github.com/<you>/kurra-wirra-portal.git
git push -u origin main
```

> The Blueprint uses `pnpm install --no-frozen-lockfile` so the very first
> deploy still succeeds even if you forget to regenerate locally — but
> regenerating and committing the lockfile is the clean way to do it.

## 2. Create a Clerk app

1. Sign up at <https://dashboard.clerk.com> and create an application.
2. Enable the sign-in methods you want (email, Google, etc.).
3. From **API Keys**, copy the **Publishable key** (`pk_…`) and **Secret key** (`sk_…`).
4. Leave the dashboard open — you'll need a user id in step 6.

## 3. Create a Cloudflare R2 bucket

1. In the Cloudflare dashboard go to **R2** → **Create bucket** (e.g. `kurra-wirra-portal`).
2. Under **R2 → Manage API tokens**, create a token with **Object Read & Write**.
3. Note the **Access Key ID**, **Secret Access Key**, and your account's
   S3 endpoint: `https://<accountid>.r2.cloudflarestorage.com`.
4. (Optional, for publicly served assets) create a `public/` folder convention —
   the app serves public objects from the `PUBLIC_OBJECT_SEARCH_PATHS` prefix.

## 4. (Optional) Set up email

Pick any SMTP provider. For **Resend**: create an account, verify your domain,
and use `smtp.resend.com`, port `587`, user `resend`, password = your API key.
If you skip this, form-submission emails are simply not sent.

## 5. Deploy on Render via the Blueprint

1. Go to <https://dashboard.render.com> → **New** → **Blueprint**.
2. Connect your GitHub account and pick the repo. Render reads `render.yaml`
   and proposes a **web service** + a **Postgres database**.
3. Click **Apply**. The database is created and `DATABASE_URL` is wired
   automatically.

## 6. Fill in the secret env vars

In the Render dashboard, open the **kurra-wirra-portal** service →
**Environment**, and set every variable marked `sync: false`:

```
CLERK_SECRET_KEY            sk_… from Clerk
CLERK_PUBLISHABLE_KEY       pk_… from Clerk
VITE_CLERK_PUBLISHABLE_KEY  pk_… (same value)
VITE_CLERK_PROXY_URL        https://<your-app>.onrender.com/api/__clerk
BOOTSTRAP_ADMIN_CLERK_ID    user_… (your Clerk user id — see note below)
S3_ENDPOINT                 https://<accountid>.r2.cloudflarestorage.com
S3_ACCESS_KEY_ID            from R2
S3_SECRET_ACCESS_KEY        from R2
S3_BUCKET                   kurra-wirra-portal
SMTP_HOST / USER / PASS / FROM   (only if using email)
```

> **Getting your Clerk user id:** sign in to the deployed app once (this creates
> your Clerk user), then in the Clerk dashboard → **Users**, copy your user id
> (`user_…`) into `BOOTSTRAP_ADMIN_CLERK_ID` and redeploy. That makes you admin.
> Alternatively the app promotes the very first signed-up user to admin.

After setting the vars, trigger **Manual Deploy → Deploy latest commit** so the
frontend bundle is rebuilt with the `VITE_*` values baked in.

## 7. Point Clerk at your domain

In the Clerk dashboard, add your Render URL (`https://<app>.onrender.com`) as an
allowed origin / configure the proxy URL to match `VITE_CLERK_PROXY_URL`. The
built-in `clerkProxyMiddleware` proxies Clerk's frontend API through
`/api/__clerk`, so no CNAME/DNS work is needed.

## 8. Verify

- Visit `https://<app>.onrender.com` — the React app loads.
- `https://<app>.onrender.com/api/healthz` returns OK.
- Sign in, upload a document (lands in R2), tick/sign a document.
- Submit a form with "notify admins" on → admin gets an email (if SMTP set).

---

## Custom domain (optional)

In the Render service → **Settings → Custom Domains**, add e.g.
`portal.kurrawirra.com.au` and follow the CNAME instructions. Then update
`VITE_CLERK_PROXY_URL` to the custom domain and redeploy.

## How this "marries into" the other farm apps

- **One Render account / GitHub org** holds this and future farm apps.
- **One Clerk organisation** can back all of them — shared logins for staff.
- The **same R2 account** can host buckets for every app.
- If you later move the AgriWebb-style app server-side, point it at the **same
  Render Postgres** (or a second database in the same Blueprint) so data lives
  together.

## Local development

```bash
pnpm install
cp .env.example .env        # fill in values
pnpm --filter @workspace/db run push          # create tables
pnpm --filter @workspace/api-server run dev    # API on :8080
pnpm --filter @workspace/induction-app run dev # Vite on :5173 (proxy /api → :8080)
```

## What changed from the Replit version

- `objectStorage.ts` / `objectAcl.ts` — rewritten for **S3-compatible storage**
  (AWS SDK v3) instead of the Replit GCS sidecar. ACL policies are stored as S3
  object metadata.
- `gmail.ts` — rewritten to send via **SMTP (Nodemailer)** instead of the Replit
  Gmail connector. Same `notifyAdminsOfSubmission` signature, so callers are
  unchanged.
- `app.ts` — now **serves the built frontend** and SPA-falls-back to
  `index.html` in production (single-service deploy).
- `vite.config.ts` — removed the `@replit/*` dev plugins; `PORT`/`BASE_PATH`
  now have sensible defaults.
- Added `render.yaml`, `.env.example`; removed `.replit`, `.replitignore`.
- The **database layer was already portable** (standard `pg` + Drizzle reading
  `DATABASE_URL`) and is unchanged.
