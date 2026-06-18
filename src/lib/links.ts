/** Outbound links to third-party services. */

/** A live-score search link for a match, by team names. We only sync the final
 *  result (after full-time), so the card can't show a live score while a match
 *  is in play — instead it links here for the minute-by-minute. Google's results
 *  carry a live match widget (score, scorers, stats) during the game, and need
 *  no third-party fixture id; "world cup" pins the query to the right fixture. */
export function liveScoreUrl(home: string, away: string): string {
  const q = `${home} vs ${away} world cup`
  return `https://www.google.com/search?q=${encodeURIComponent(q)}`
}
