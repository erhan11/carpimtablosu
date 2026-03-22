/** Wall-clock ms for response-time metrics (isolated for lint: timing is intentional). */
export function responseClockMs(): number {
  return Date.now()
}
