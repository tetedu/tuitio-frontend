# Deploying Tuitio

Two supported topologies. The submission-grade one is the PaaS path; the
tunnel path runs everything on a single machine and is what the live demo
currently uses.

```
browser ──▶ frontend (Next.js) ──▶ backend (Go indexer + REST API) ──▶ Postgres
                │                        │
                └── Soroban RPC ◀────────┘   (contract writes go browser → RPC directly)
```

## Path A: Vercel + Render (durable)

### Backend on Render (~7 min)

1. Render dashboard → **New → Blueprint**, pick the `tetedu/tuitio-backend`
   repository. The included `render.yaml` provisions:
   - a web service from the Dockerfile (health check `/healthz`), and
   - a co-located free Postgres (`tuitio-db`), wired with the internal
     connection string.
2. When prompted for `START_LEDGER`, set `4570990` — the ledger just before
   the first demo event, so the indexer backfills the existing testnet state.
   (0 would start at the chain tip and index only new events.)
3. Deploy. First build takes a few minutes; `https://<service>.onrender.com`
   is the API base URL.

### Frontend on Vercel (~5 min)

1. Vercel → **Add New → Project**, import `tetedu/tuitio-frontend`
   (framework auto-detected; build command `pnpm build`).
2. Environment variables:
   - `NEXT_PUBLIC_API_URL` — the Render URL from above (fallback/label use)
   - `API_URL` — the same Render URL (used by server-side fetches at runtime)
   - the contract/token variables from `.env.example`
3. Deploy. Optional: add a custom domain in Vercel settings.

CORS: the backend emits CORS headers only for origins listed in
`ALLOWED_ORIGINS` (comma-separated). The web app does not need it — it calls
the API same-origin through its `/api/[...path]` runtime proxy — but set
`ALLOWED_ORIGINS` to your Vercel domain(s) if other browser clients will use
the API directly.

## Path B: single machine + tunnels (current live demo)

Everything runs locally, bound to 127.0.0.1, exposed through outbound SSH
tunnels (no inbound firewall ports needed). See `deploy/` in the working
copy: `make-live.sh` (start), `watchdog.sh` (self-heal), `stop.sh`.

Anonymous tunnel subdomains are random and change on reconnect. For stable
subdomains: generate a key (`ssh-keygen -t ed25519 -f ~/.ssh/tuitio_tunnels
-N ""`), register the public key at https://admin.localhost.run/, then
connect as `plan@localhost.run` requesting a named subdomain
(`ssh -R name.lhr.life:80:localhost:PORT plan@localhost.run`).

Caveats, stated plainly: the demo lives only while the machine is on, and a
reboot requires re-running the deploy scripts (or installing the provided
systemd user units). Use Path A for anything you need to stay up.
