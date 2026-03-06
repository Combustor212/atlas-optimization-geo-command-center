/**
 * Cron route authentication via x-cron-secret or x-vercel-cron-secret header.
 * Returns 401 Response if invalid; otherwise returns void.
 */
export function requireCronAuth(req: Request): void {
  const secret =
    req.headers.get('x-cron-secret') ??
    req.headers.get('x-vercel-cron-secret') ??
    (req.headers.get('authorization')?.startsWith('Bearer ')
      ? req.headers.get('authorization')!.slice(7)
      : null)
  const expected = process.env.CRON_SECRET

  if (!expected || secret !== expected) {
    throw new Response(
      JSON.stringify({ error: 'Unauthorized', message: 'Invalid or missing x-cron-secret' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
