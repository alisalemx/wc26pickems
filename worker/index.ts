// The Cloudflare Worker that serves the SPA and keeps Supabase awake.
//
// Requests are answered by the static assets in dist/ (wrangler.jsonc), so the
// fetch handler only runs as a fallback. The cron trigger is the Supabase
// keep-alive: the free tier pauses a project without "a few user requests to
// the database each day" over a week, and since the tournament ended nothing
// else touches the DB. A once-a-day read still drew a pause warning, so this
// reads once an hour. Don't thin it out or remove it unless the project moves
// to a paid plan.

interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> }
  SUPABASE_URL?: string
  SUPABASE_ANON_KEY?: string
}

/** One tiny `matches` read. The table is publicly readable, so the public
 *  anon key is enough and no server-only secret lives on Cloudflare. */
async function keepAlive(env: Env): Promise<void> {
  const { SUPABASE_URL: url, SUPABASE_ANON_KEY: key } = env
  if (!url || !key) throw new Error("keep-alive: missing SUPABASE_URL or SUPABASE_ANON_KEY")
  const res = await fetch(`${url}/rest/v1/matches?select=id&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  })
  if (!res.ok) throw new Error(`keep-alive: Supabase answered ${res.status}`)
}

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    return env.ASSETS.fetch(request)
  },

  async scheduled(_controller: unknown, env: Env): Promise<void> {
    // Throwing marks the cron run as failed in the Cloudflare dashboard.
    await keepAlive(env)
  },
}
