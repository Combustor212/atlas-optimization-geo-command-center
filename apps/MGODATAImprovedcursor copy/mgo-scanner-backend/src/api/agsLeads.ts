/**
 * Proxy lead submissions from AGS Contact Us / Book a Call forms to Geo Command Center.
 * Also forwards scan leads when a business runs a free scan.
 * Keeps AGS_LEADS_API_KEY server-side; frontend calls this endpoint.
 */
import { Request, Response } from 'express'
import { logger } from '../lib/logger'

const GEO_LEADS_URL = process.env.GEO_COMMAND_CENTER_URL || process.env.VITE_GEO_COMMAND_CENTER_URL || 'http://localhost:3000'
const AGS_LEADS_API_KEY = process.env.AGS_LEADS_API_KEY

/**
 * Forward a lead payload to Geo Command Center. Used by both contact/call forms and scan flow.
 */
export async function forwardLeadToGeoCommandCenter(payload: Record<string, unknown>): Promise<{ success: boolean; id?: string }> {
  if (!AGS_LEADS_API_KEY) {
    logger.warn('AGS_LEADS_API_KEY not configured - lead will not be forwarded to Geo Command Center. Set AGS_LEADS_API_KEY and GEO_COMMAND_CENTER_URL in MGO backend .env')
    return { success: false }
  }

  try {
    const geoUrl = `${GEO_LEADS_URL.replace(/\/$/, '')}/api/leads`
    const response = await fetch(geoUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-ags-leads-api-key': AGS_LEADS_API_KEY,
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errText = await response.text()
      logger.error('Geo Command Center leads API error - leads will NOT appear in dashboard', {
        status: response.status,
        body: errText,
        hint: response.status === 401 ? 'Check AGS_LEADS_API_KEY matches in both MGO backend and Geo Command Center' : response.status === 500 ? 'Check AGS_LEADS_AGENCY_SLUG exists in agencies table' : 'Check GEO_COMMAND_CENTER_URL is correct',
      })
      return { success: false }
    }

    const data = await response.json()
    logger.info('Lead forwarded to Geo Command Center', { id: data.id, source: payload.source })
    return { success: true, id: data.id }
  } catch (error) {
    logger.error('Lead forward error', { error: (error as Error).message })
    return { success: false }
  }
}

export async function handleSubmitLead(req: Request, res: Response) {
  const result = await forwardLeadToGeoCommandCenter(req.body)
  if (!result.success) {
    if (!AGS_LEADS_API_KEY) {
      return res.status(200).json({ success: true, forwarded: false })
    }
    return res.status(502).json({
      error: 'Failed to save lead to Geo Command Center',
    })
  }
  return res.status(200).json({ success: true, forwarded: true, id: result.id })
}
