export interface SeedRow {
  id: number
  fd_id: number | null
  stage: string
  kickoff: string // ISO timestamptz
  home_code: string | null
  away_code: string | null
}

export interface ApiMatchLite {
  fdId: number
  stage: string // already mapped to our enum values
  utcDate: string
  homeTla: string | null
  awayTla: string | null
}

/** Returns fd_id -> our matches.id. Links only when unambiguous; an API
 *  match that cannot be safely linked is simply absent from the map. */
export function linkMatches(rows: SeedRow[], api: ApiMatchLite[]): Map<number, number> {
  const result = new Map<number, number>() // fdId -> our id

  // Track which rows and API matches are still unclaimed
  const unclaimedRows = new Set<number>(rows.map((r) => r.id))
  const unclaimedApi = new Set<number>(api.map((m) => m.fdId))

  const rowById = new Map<number, SeedRow>(rows.map((r) => [r.id, r]))
  const apiById = new Map<number, ApiMatchLite>(api.map((m) => [m.fdId, m]))

  // Pass 0 — explicit fd_ids: rows that already have an fd_id set
  for (const row of rows) {
    if (row.fd_id == null) continue
    const match = apiById.get(row.fd_id)
    if (match == null) continue
    result.set(row.fd_id, row.id)
    unclaimedRows.delete(row.id)
    unclaimedApi.delete(row.fd_id)
  }

  // Pass 1 — exact kickoff instant: group by (stage, epoch ms)
  // Link when exactly one row and one API match share the same key
  const rowsByStageMs = new Map<string, number[]>()
  for (const id of unclaimedRows) {
    const row = rowById.get(id)!
    const ms = new Date(row.kickoff).getTime()
    const key = `${row.stage}|${ms}`
    const bucket = rowsByStageMs.get(key) ?? []
    bucket.push(id)
    rowsByStageMs.set(key, bucket)
  }

  const apiByStageMs = new Map<string, number[]>()
  for (const fdId of unclaimedApi) {
    const m = apiById.get(fdId)!
    const ms = new Date(m.utcDate).getTime()
    const key = `${m.stage}|${ms}`
    const bucket = apiByStageMs.get(key) ?? []
    bucket.push(fdId)
    apiByStageMs.set(key, bucket)
  }

  for (const [key, rowIds] of rowsByStageMs) {
    const apiIds = apiByStageMs.get(key)
    if (rowIds.length === 1 && apiIds?.length === 1) {
      const rowId = rowIds[0]
      const fdId = apiIds[0]
      result.set(fdId, rowId)
      unclaimedRows.delete(rowId)
      unclaimedApi.delete(fdId)
    }
  }

  // Pass 2 — day + both team codes
  // Key remaining rows by (stage, UTC day); for each remaining API match,
  // find candidates where home_code === homeTla and away_code === awayTla
  const rowsByStageDay = new Map<string, number[]>()
  for (const id of unclaimedRows) {
    const row = rowById.get(id)!
    const day = new Date(row.kickoff).toISOString().slice(0, 10)
    const key = `${row.stage}|${day}`
    const bucket = rowsByStageDay.get(key) ?? []
    bucket.push(id)
    rowsByStageDay.set(key, bucket)
  }

  const pass2Claimed = new Set<number>() // row ids claimed in this pass

  for (const fdId of unclaimedApi) {
    const m = apiById.get(fdId)!
    const day = m.utcDate.slice(0, 10)
    const key = `${m.stage}|${day}`
    const candidates = rowsByStageDay.get(key) ?? []

    // Only match when all four code values are non-null
    if (m.homeTla == null || m.awayTla == null) continue

    const matching = candidates.filter((id) => {
      if (pass2Claimed.has(id)) return false
      const row = rowById.get(id)!
      return (
        row.home_code != null &&
        row.away_code != null &&
        row.home_code === m.homeTla &&
        row.away_code === m.awayTla
      )
    })

    if (matching.length === 1) {
      const rowId = matching[0]
      result.set(fdId, rowId)
      unclaimedRows.delete(rowId)
      unclaimedApi.delete(fdId)
      pass2Claimed.add(rowId)
    }
  }

  // Pass 3 — unique day: for each (stage, UTC day) key where exactly one
  // row and one API match remain, link and claim
  const rowsByStageDay3 = new Map<string, number[]>()
  for (const id of unclaimedRows) {
    const row = rowById.get(id)!
    const day = new Date(row.kickoff).toISOString().slice(0, 10)
    const key = `${row.stage}|${day}`
    const bucket = rowsByStageDay3.get(key) ?? []
    bucket.push(id)
    rowsByStageDay3.set(key, bucket)
  }

  const apiByStageDay3 = new Map<string, number[]>()
  for (const fdId of unclaimedApi) {
    const m = apiById.get(fdId)!
    const day = m.utcDate.slice(0, 10)
    const key = `${m.stage}|${day}`
    const bucket = apiByStageDay3.get(key) ?? []
    bucket.push(fdId)
    apiByStageDay3.set(key, bucket)
  }

  for (const [key, rowIds] of rowsByStageDay3) {
    const apiIds = apiByStageDay3.get(key)
    if (rowIds.length === 1 && apiIds?.length === 1) {
      const rowId = rowIds[0]
      const fdId = apiIds[0]
      result.set(fdId, rowId)
      unclaimedRows.delete(rowId)
      unclaimedApi.delete(fdId)
    }
  }

  return result
}
