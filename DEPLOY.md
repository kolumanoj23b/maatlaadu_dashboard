# Maatlaadu Administration Dashboard — running it outside Lovable

This is the complete source of your admin dashboard. It is a TanStack Start app,
which means it runs server code: it needs a host that runs a server, not a host
that only serves files (a plain static site or CDN bucket will not work).

Your learner data is **not** inside this package. The dashboard reads it live
from your Supabase project `Maatlaadu`, so the records stay exactly where they
are and the Android app keeps using the same database.

---

## 1. What you need installed

- Node.js 22 (check with `node -v`)
- npm (comes with Node), or Bun if you prefer

## 2. Run it on your own computer first

```sh
npm install          # or: bun install
cp .env.example .env # .env is already included with your database address filled in
npm run dev
```

Open the address it prints (usually http://localhost:8080) and sign in with
`kolukondamanoj2005@gmail.com`.

**One thing you must add yourself:** the admin dashboard reads every learner's
records, so it needs your `service_role` key. Put it in `.env`:

```
SUPABASE_SERVICE_ROLE_KEY=paste-the-key-here
```

Get it from your Supabase dashboard: **Project Settings → API Keys → service_role →
Reveal**. It is a secret: it stays in `.env` on your machine/server and must never
appear in a file that starts with `VITE_` or in the browser.

Without this key the pages load but the tables come back empty.

## 3. Deploy to your own server (VPS, DigitalOcean, Railway, Render, Fly, Docker…)

Build for a plain Node.js server, then run the result:

```sh
NITRO_PRESET=node-server npm run build
node .output/server/index.mjs
```

- The build writes a self-contained `.output` folder — copy just that folder to the server.
- It listens on port `3000`; change with `PORT`, and the address with `HOST=0.0.0.0`.
- Set these on the server's environment: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY` (and `SUPABASE_PROJECT_ID` if you like it shown in Settings).
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` must be set **before the build**
  (they are baked into the pages). Changing them means rebuilding.
- Put it behind your own web server or load balancer (Nginx, Caddy, a platform proxy) so
  it gets HTTPS. Do not add an `index.html` fallback rule — the server handles routing.

### Docker

```sh
docker build -t maatlaadu-dashboard .
docker run -p 3000:3000 --env-file .env maatlaadu-dashboard
```

The Dockerfile is a ready starting point; the two `VITE_` values are passed as build
arguments, the rest come from the environment at run time.

## 4. Deploy to Vercel / Netlify / Cloudflare (connected repository)

| Setting | Value |
| --- | --- |
| Build command | `npm run build` |
| Node version | 22 |
| Output directory | `dist` (Netlify and Cloudflare Pages; Vercel needs nothing) |

Environment variables to set in the platform's dashboard:

| Variable | Where it's read | Needed for |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | browser, at build time | talking to your database from the page |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | browser, at build time | same |
| `SUPABASE_URL` | server | sign-in checks, admin pages |
| `SUPABASE_PUBLISHABLE_KEY` | server | same |
| `SUPABASE_SERVICE_ROLE_KEY` | server | reading all learners (admin dashboard) |

### Cloudflare Pages, step by step

1. Push these files to GitHub / GitLab / Bitbucket (or use Cloudflare's "Direct upload").
2. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git** → pick the repository.
3. Build settings: framework preset **None**, build command `npm run build`,
   build output directory `dist`, Node version `22`.
4. **Environment variables** — add these as *Build variables*:

   | Name | Value |
   | --- | --- |
   | `VITE_SUPABASE_URL` | `https://hfebtxqogfbxhzrnnjbq.supabase.co` |
   | `VITE_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_8fLXliT20VoCdkMBToIW3Q_O9aBOwiC` |
   | `VITE_SUPABASE_PROJECT_ID` | `hfebtxqogfbxhzrnnjbq` |
   | `NITRO_PRESET` | `cloudflare-pages` |

   and these as *Secrets* (never as build variables, they must not reach the browser):

   | Name | Value |
   | --- | --- |
   | `SUPABASE_URL` | `https://hfebtxqogfbxhzrnnjbq.supabase.co` |
   | `SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_8fLXliT20VoCdkMBToIW3Q_O9aBOwiC` |
   | `SUPABASE_SERVICE_ROLE_KEY` | your service_role key, from Supabase → Project Settings → API Keys |

5. Save and deploy. Then Supabase → **Authentication → URL Configuration** → point
   *Site URL* at the new address and add it to *Redirect URLs*.

`NITRO_PRESET=cloudflare-pages` tells the build to produce the Cloudflare Pages
layout. Without it the build still succeeds but ships the wrong shape for Pages.

If the repository only has `bun.lock`, either use Bun in your build settings
(`bun install && bun run build`) or run `npm install` locally once and commit the
generated `package-lock.json`.

### If the build fails with "Could not resolve './routeTree.gen'"

`src/routeTree.gen.ts` is generated by the build, and it is included in this
package and committed in git, so a normal deploy finds it. If your repository
ignored it, either commit the file or let the build generate it — `vite.config.ts`
has route generation turned on (`enableRouteGeneration: true`), and
`src/test/route-generation.test.ts` checks it from a clean checkout. Do not
hand-write a placeholder file: the real one lists every page.


## 5. After it is live — two things in Supabase

1. **Allowed web addresses:** Supabase dashboard → **Authentication → URL Configuration**
   → set *Site URL* to your new address and add it to *Redirect URLs*.
   Without this, some sign-in and password-change flows bounce back to the wrong address.
2. **Check the numbers:** sign in on the new address and compare the dashboard against
   your Android app's data. The figures must match — the dashboard never invents them.

## 6. Keeping the code up to date

- This snapshot is a copy. If you keep building in Lovable, either re-download the
  codebase, or connect the project to GitHub (**Project settings → Git**) and point
  your host at that repository — then every Lovable change deploys automatically.
- Database structure changes live in `supabase/migrations/`. They are applied to your
  Supabase project separately from the code; nothing here re-runs them.

## 7. What is in the package

| Path | What it is |
| --- | --- |
| `src/` | the whole app: pages, dashboard, sign-in, server functions |
| `supabase/migrations/` | the admin-role tables (`app_role`, `user_roles`) and the `has_role` check |
| `public/` | favicon and robots file |
| `.env` | your database address and publishable key (no secret key inside) |
| `vite.config.ts` | build setup; `NITRO_PRESET` chooses the platform |
| `Dockerfile` | container build for your own server |
| `package.json` | dependencies and the `dev` / `build` / `test` commands |
