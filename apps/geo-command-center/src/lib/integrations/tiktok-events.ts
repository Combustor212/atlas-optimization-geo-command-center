import { createHash } from 'crypto'

const TIKTOK_PIXEL_TRACK_URL =
  'https://business-api.tiktok.com/open_api/v1.3/pixel/track/'

function sha256Hex(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex')
}

function hashEmail(email: string): string {
  return sha256Hex(email.trim().toLowerCase())
}

function hashPhone(phone: string): string | undefined {
  const digits = phone.replace(/\D/g, '')
  if (!digits) return undefined
  const e164 = digits.length === 10 ? `+1${digits}` : `+${digits}`
  return sha256Hex(e164)
}

export type TikTokServerLeadEvent = {
  eventId: string
  email: string
  phone?: string | null
  ip?: string | null
  userAgent?: string | null
  pageUrl?: string | null
  ttclid?: string | null
  /** Standard web event, e.g. SubmitForm for lead capture */
  event?: string
}

/**
 * Sends one server-side event to TikTok Events API (v1.3 pixel/track).
 * No-ops when TIKTOK_EVENTS_ACCESS_TOKEN is unset (leads flow still succeeds).
 *
 * For Events Manager → Test Events: set TIKTOK_TEST_EVENT_CODE (e.g. TEST18286).
 * Remove or leave empty in production.
 */
export async function trackTikTokLeadEvent(params: TikTokServerLeadEvent): Promise<void> {
  const accessToken = process.env.TIKTOK_EVENTS_ACCESS_TOKEN
  const pixelCode =
    process.env.TIKTOK_PIXEL_CODE?.trim() || 'D71V5BJC77UAEQ8SFAE0'
  const testEventCode = process.env.TIKTOK_TEST_EVENT_CODE?.trim()

  if (!accessToken) {
    return
  }

  const event = params.event || 'SubmitForm'
  const context: Record<string, unknown> = {}
  if (params.ip) context.ip = params.ip
  if (params.userAgent) context.user_agent = params.userAgent
  if (params.pageUrl) context.page = { url: params.pageUrl }

  const user: Record<string, string> = {
    email: hashEmail(params.email),
  }
  const phoneHash = params.phone ? hashPhone(params.phone) : undefined
  if (phoneHash) user.phone_number = phoneHash
  if (params.ttclid) context.ad = { callback: params.ttclid }
  context.user = user

  const body: Record<string, unknown> = {
    pixel_code: pixelCode,
    event,
    event_id: params.eventId,
    timestamp: new Date().toISOString(),
    context,
    properties: { description: 'ags_lead' },
  }

  if (testEventCode) {
    body.test_event_code = testEventCode
  }

  try {
    const res = await fetch(TIKTOK_PIXEL_TRACK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Access-Token': accessToken,
      },
      body: JSON.stringify(body),
    })

    const json = (await res.json()) as { code?: number; message?: string }

    if (!res.ok) {
      console.error('TikTok Events API HTTP error', res.status, json)
      return
    }
    const code = json.code
    if (code != null && code !== 0 && code !== 20001) {
      console.error('TikTok Events API rejected payload', json)
    }
  } catch (e) {
    console.error('TikTok Events API request failed', e)
  }
}
