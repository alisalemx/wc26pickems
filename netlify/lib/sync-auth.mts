import { createHash, timingSafeEqual } from "node:crypto"

/** Constant-time string compare that doesn't leak length: hash both sides to a
 *  fixed 32-byte digest first, then compare. Avoids a timing side-channel on the
 *  shared secret. */
function constantTimeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest()
  const hb = createHash("sha256").update(b).digest()
  return timingSafeEqual(ha, hb)
}

/** The secret a caller presents, from `Authorization: Bearer <secret>` or the
 *  `X-Sync-Key` header. Returns null when neither is usably present. */
function presentedSecret(req: Request): string | null {
  const auth = req.headers.get("authorization")
  if (auth?.startsWith("Bearer ")) {
    const token = auth.slice("Bearer ".length)
    if (token) return token
  }
  const key = req.headers.get("x-sync-key")
  return key || null
}

/**
 * Authorize a sync invocation. Two — and only two — callers are legitimate:
 *
 *  1. **Netlify's scheduler**, which we recognize by the `next_run` timestamp it
 *     places in the JSON body of every scheduled (v2) invocation. This is the
 *     documented contract, and it means the 2-min cron keeps running with no
 *     secret configured — and never breaks if the secret is rotated or removed.
 *  2. **A human/admin force-sync** presenting the shared `SYNC_SECRET` as a
 *     bearer token (or `X-Sync-Key`).
 *
 * Everything else — a bare GET to the public `/.netlify/functions/sync-results`
 * URL, a bot, a curl without the secret — is rejected before any env read, DB
 * query, or upstream fetch happens. This closes the open-door problem (the
 * function is publicly reachable over HTTP) without taking the cron offline.
 *
 * Caveat (documented deliberately): the source is public, so the `next_run`
 * shape is discoverable and a crafted POST can still reach the body of the
 * function. That path is bounded by the 60s cooldown (it can't exceed the
 * football-data quota or alter results — the sync only mirrors the authoritative
 * feed), so the residual is cost amplification, not a data risk. To eliminate it
 * entirely, drop the `next_run` branch and move scheduling to a secret-carrying
 * trigger (GitHub Actions / Supabase pg_cron) so *every* caller must hold the
 * secret.
 *
 * `secret` is passed in (rather than read from the env here) to keep this pure
 * and unit-testable.
 */
export async function isSyncAuthorized(
  req: Request,
  secret: string | undefined
): Promise<boolean> {
  // Admin/manual path first: cheap, header-only, no body consumption.
  if (secret) {
    const presented = presentedSecret(req)
    if (presented && constantTimeEqual(presented, secret)) return true
  }

  // Scheduler path: the body is a JSON object carrying a `next_run` string.
  // Reading the body is safe — the handler itself never uses it.
  try {
    const text = await req.text()
    if (text) {
      const parsed = JSON.parse(text) as { next_run?: unknown }
      if (typeof parsed.next_run === "string") return true
    }
  } catch {
    // Not JSON, or no readable body — not a scheduler invocation.
  }

  return false
}
