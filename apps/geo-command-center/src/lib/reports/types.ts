import { z } from 'zod'

export const reportBrandingSchema = z.object({
  logo_url: z.string().url().optional(),
  company_name: z.string().optional(),
  accent_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
})
export type ReportBranding = z.infer<typeof reportBrandingSchema>

export const reportSectionsSchema = z.array(z.string())
export type ReportSections = z.infer<typeof reportSectionsSchema>

export const reportTemplateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  branding: reportBrandingSchema.default({}),
  sections: reportSectionsSchema.default(['executive_summary', 'highlights', 'location_breakdown', 'roi_analysis']),
})
export type ReportTemplateInput = z.infer<typeof reportTemplateSchema>

export const reportScheduleFrequencySchema = z.enum(['weekly', 'monthly'])
export const timeOfDaySchema = z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Use HH:MM format')
export const recipientSchema = z.object({ email: z.string().email() })

const reportScheduleBaseSchema = z.object({
  client_id: z.string().uuid(),
  template_id: z.string().uuid(),
  frequency: reportScheduleFrequencySchema,
  day_of_week: z.number().int().min(0).max(6).nullable().optional(),
  day_of_month: z.number().int().min(1).max(31).nullable().optional(),
  time_of_day: timeOfDaySchema,
  timezone: z.string().min(1).default('America/New_York'),
  recipients: z.array(recipientSchema).default([]),
  is_active: z.boolean().default(true),
})

export const reportScheduleSchema = reportScheduleBaseSchema.refine(
  (data) => {
    if (data.frequency === 'weekly') return data.day_of_week != null
    if (data.frequency === 'monthly') return data.day_of_month != null
    return false
  },
  { message: 'day_of_week required for weekly, day_of_month for monthly', path: ['day_of_week'] }
)
export const reportSchedulePartialSchema = reportScheduleBaseSchema.partial()
export type ReportScheduleInput = z.infer<typeof reportScheduleSchema>

export const reportRunStatusSchema = z.enum(['queued', 'generated', 'sent', 'failed'])
export type ReportRunStatus = z.infer<typeof reportRunStatusSchema>
