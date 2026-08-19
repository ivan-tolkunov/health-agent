# Health Agent

Private, mobile-friendly health dashboard for WHOOP, FitBee nutrition exports, weight tracking, and read-only AI analysis.

## Current milestone

- Next.js dashboard shell
- Persistent embedded Postgres through PGlite
- WHOOP OAuth 2.0 connection
- Encrypted WHOOP access and refresh tokens
- 90-day WHOOP cycle, recovery, sleep, and workout sync
- Toronto-local display dates
- Paste-based FitBee text imports with calories, macros, meals, and foods
- Immutable nutrition snapshots for repeated same-day imports

Weight logging, trends, and Pi chat are the next milestones.

## Local setup

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Create a WHOOP app at <https://developer-dashboard.whoop.com>.

3. Enable these scopes:

   - `read:profile`
   - `read:body_measurement`
   - `read:cycles`
   - `read:recovery`
   - `read:sleep`
   - `read:workout`
   - `offline`

4. Add this development redirect URI to the WHOOP app:

   ```text
   http://localhost:3000/api/whoop/callback
   ```

   If WHOOP requires HTTPS, use the HTTPS address exposed by your reverse proxy or tunnel instead and put that exact URL in both WHOOP and `.env.local`.

5. Configure secrets:

   ```bash
   cp .env.example .env.local
   openssl rand -base64 32
   ```

   Put the generated value in `TOKEN_ENCRYPTION_KEY`, then add the WHOOP client ID and secret.

6. Start the app:

   ```bash
   pnpm dev
   ```

7. Open <http://localhost:3000>, select **Connect WHOOP**, authorize access, and run **Sync 90 days**.

## Private data

`data/`, `storage/`, and `.env*` are excluded from version control. PGlite persists to `./storage/pglite` by default.

Never commit WHOOP credentials, OAuth tokens, PGlite files, or health exports.

## Version control

This project uses Jujutsu:

```bash
jj status
jj diff
jj describe -m "description"
jj new
```

## Home-server deployment

The intended production target is one persistent Node.js instance on Fedora Server behind an HTTPS reverse proxy. The PGlite directory must be mounted on persistent storage and backed up. Do not run multiple application replicas against the same PGlite directory.
