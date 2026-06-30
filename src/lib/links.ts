/** Outbound links to third-party services. */

/** A live-score search link for a match, by team names. The card shows the
 *  synced in-play score, and links here for the richer minute-by-minute detail.
 *  Google's results carry a live match widget (score, scorers, stats) during the
 *  game, and need no third-party fixture id; "world cup" pins the query. */
export function liveScoreUrl(home: string, away: string): string {
  const q = `${home} vs ${away} world cup`
  return `https://www.google.com/search?q=${encodeURIComponent(q)}`
}
