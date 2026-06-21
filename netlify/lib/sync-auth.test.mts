import { describe, it, expect } from "vitest"
import { isSyncAuthorized } from "./sync-auth.mts"

const URL = "https://example.test/.netlify/functions/sync-results"
const SECRET = "test-secret-value"

function scheduled(next_run: unknown = "2026-06-21T14:10:00.000Z"): Request {
  return new Request(URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ next_run }),
  })
}

function withAuth(header: string, value: string): Request {
  return new Request(URL, { headers: { [header]: value } })
}

describe("isSyncAuthorized", () => {
  describe("scheduler path (next_run body)", () => {
    it("accepts the scheduler with no secret configured", async () => {
      expect(await isSyncAuthorized(scheduled(), undefined)).toBe(true)
    })

    it("accepts the scheduler even when a secret IS configured", async () => {
      // The cron carries no header — it must still pass once SYNC_SECRET is set,
      // or configuring the secret would silently kill the schedule.
      expect(await isSyncAuthorized(scheduled(), SECRET)).toBe(true)
    })

    it("rejects a next_run that isn't a string", async () => {
      expect(await isSyncAuthorized(scheduled(12345), undefined)).toBe(false)
      expect(await isSyncAuthorized(scheduled(null), undefined)).toBe(false)
    })

    it("rejects a body with no next_run", async () => {
      const req = new Request(URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ hello: "world" }),
      })
      expect(await isSyncAuthorized(req, undefined)).toBe(false)
    })

    it("rejects a malformed / non-JSON body", async () => {
      const req = new Request(URL, { method: "POST", body: "not json" })
      expect(await isSyncAuthorized(req, undefined)).toBe(false)
    })
  })

  describe("admin path (shared secret)", () => {
    it("accepts a correct bearer token", async () => {
      expect(
        await isSyncAuthorized(withAuth("authorization", `Bearer ${SECRET}`), SECRET)
      ).toBe(true)
    })

    it("accepts a correct X-Sync-Key", async () => {
      expect(
        await isSyncAuthorized(withAuth("x-sync-key", SECRET), SECRET)
      ).toBe(true)
    })

    it("rejects a wrong secret (of a different length, no timing leak)", async () => {
      expect(
        await isSyncAuthorized(withAuth("authorization", "Bearer nope"), SECRET)
      ).toBe(false)
    })

    it("rejects an empty bearer token", async () => {
      expect(
        await isSyncAuthorized(withAuth("authorization", "Bearer "), SECRET)
      ).toBe(false)
    })

    it("rejects a correct-looking secret when none is configured", async () => {
      // Without SYNC_SECRET set there is no admin path at all.
      expect(
        await isSyncAuthorized(withAuth("authorization", `Bearer ${SECRET}`), undefined)
      ).toBe(false)
    })
  })

  describe("anonymous", () => {
    it("rejects a bare GET (secret unset)", async () => {
      expect(await isSyncAuthorized(new Request(URL), undefined)).toBe(false)
    })

    it("rejects a bare GET (secret set)", async () => {
      expect(await isSyncAuthorized(new Request(URL), SECRET)).toBe(false)
    })
  })
})
