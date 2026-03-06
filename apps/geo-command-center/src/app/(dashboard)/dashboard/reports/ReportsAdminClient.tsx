'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import {
  Plus,
  Trash2,
  Calendar,
  Mail,
  FileText,
  ChevronUp,
} from 'lucide-react'

interface Template {
  id: string
  name: string
  branding: { company_name?: string; accent_color?: string; logo_url?: string }
  sections: string[]
}

interface Client {
  id: string
  name: string
}

interface Schedule {
  id: string
  client_id: string
  template_id: string
  frequency: string
  day_of_week: number | null
  day_of_month: number | null
  time_of_day: string
  timezone: string
  recipients: { email: string }[]
  is_active: boolean
  report_templates?: { name: string }
  clients?: { name: string }
}

interface Props {
  templates: Template[]
  schedules: Schedule[]
  clients: Client[]
}

export function ReportsAdminClient({ templates, schedules, clients }: Props) {
  const [showAddTemplate, setShowAddTemplate] = useState(false)
  const [showAddSchedule, setShowAddSchedule] = useState(false)
  const [newTemplateName, setNewTemplateName] = useState('')
  const [newTemplateCompany, setNewTemplateCompany] = useState('')
  const [scheduleForm, setScheduleForm] = useState({
    client_id: '',
    template_id: '',
    frequency: 'weekly' as 'weekly' | 'monthly',
    day_of_week: 1,
    day_of_month: 1,
    time_of_day: '09:00',
    timezone: 'America/New_York',
    recipients: '',
  })
  const [loading, setLoading] = useState(false)

  async function createTemplate() {
    if (!newTemplateName.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/reports/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTemplateName.trim(),
          branding: newTemplateCompany.trim() ? { company_name: newTemplateCompany.trim() } : {},
          sections: ['executive_summary', 'highlights', 'location_breakdown', 'roi_analysis'],
        }),
      })
      if (res.ok) {
        setNewTemplateName('')
        setNewTemplateCompany('')
        setShowAddTemplate(false)
        window.location.reload()
      } else {
        const err = await res.json()
        alert(err.error ?? 'Failed')
      }
    } finally {
      setLoading(false)
    }
  }

  async function deleteTemplate(id: string) {
    if (!confirm('Delete this template? Schedules using it will fail.')) return
    setLoading(true)
    try {
      const res = await fetch(`/api/reports/templates/${id}`, { method: 'DELETE' })
      if (res.ok) window.location.reload()
      else alert((await res.json()).error)
    } finally {
      setLoading(false)
    }
  }

  async function createSchedule() {
    if (!scheduleForm.client_id || !scheduleForm.template_id) {
      alert('Select client and template')
      return
    }
    const recipients = scheduleForm.recipients
      .split(/[\n,;]/)
      .map((e) => e.trim())
      .filter(Boolean)
      .map((email) => ({ email }))

    const body: Record<string, unknown> = {
      client_id: scheduleForm.client_id,
      template_id: scheduleForm.template_id,
      frequency: scheduleForm.frequency,
      time_of_day: scheduleForm.time_of_day,
      timezone: scheduleForm.timezone,
      recipients,
      is_active: true,
    }
    if (scheduleForm.frequency === 'weekly') body.day_of_week = scheduleForm.day_of_week
    else body.day_of_month = scheduleForm.day_of_month

    setLoading(true)
    try {
      const res = await fetch('/api/reports/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setShowAddSchedule(false)
        setScheduleForm({ ...scheduleForm, client_id: '', template_id: '' })
        window.location.reload()
      } else {
        const err = await res.json()
        alert(err.error ?? 'Failed')
      }
    } finally {
      setLoading(false)
    }
  }

  async function deleteSchedule(id: string) {
    if (!confirm('Remove this schedule?')) return
    setLoading(true)
    try {
      const res = await fetch(`/api/reports/schedules/${id}`, { method: 'DELETE' })
      if (res.ok) window.location.reload()
      else alert((await res.json()).error)
    } finally {
      setLoading(false)
    }
  }

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Report Templates
            </CardTitle>
            <button
              onClick={() => setShowAddTemplate(!showAddTemplate)}
              className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              {showAddTemplate ? <ChevronUp className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              Add Template
            </button>
          </div>
        </CardHeader>
        {showAddTemplate && (
          <div className="mb-4 flex flex-wrap gap-3 rounded-lg border border-[var(--card-border)] p-4">
            <input
              type="text"
              placeholder="Template name"
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              className="rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm"
            />
            <input
              type="text"
              placeholder="Company name (optional)"
              value={newTemplateCompany}
              onChange={(e) => setNewTemplateCompany(e.target.value)}
              className="rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm"
            />
            <button
              onClick={createTemplate}
              disabled={loading}
              className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              Create
            </button>
          </div>
        )}
        <div className="space-y-2">
          {templates.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between rounded-lg border border-[var(--card-border)] p-3"
            >
              <div>
                <p className="font-medium">{t.name}</p>
                {t.branding?.company_name && (
                  <p className="text-sm text-[var(--muted)]">{t.branding.company_name}</p>
                )}
              </div>
              <button
                onClick={() => deleteTemplate(t.id)}
                disabled={loading}
                className="rounded p-2 text-[var(--danger)] hover:bg-[var(--danger-muted)]/30"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          {templates.length === 0 && (
            <p className="py-4 text-center text-[var(--muted)]">No templates yet. Create one to get started.</p>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Scheduled Reports
            </CardTitle>
            <button
              onClick={() => setShowAddSchedule(!showAddSchedule)}
              className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              {showAddSchedule ? <ChevronUp className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              Add Schedule
            </button>
          </div>
        </CardHeader>
        {showAddSchedule && (
          <div className="mb-4 space-y-3 rounded-lg border border-[var(--card-border)] p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm text-[var(--muted)]">Client</label>
                <select
                  value={scheduleForm.client_id}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, client_id: e.target.value })}
                  className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm"
                >
                  <option value="">Select client</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm text-[var(--muted)]">Template</label>
                <select
                  value={scheduleForm.template_id}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, template_id: e.target.value })}
                  className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm"
                >
                  <option value="">Select template</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm text-[var(--muted)]">Frequency</label>
                <select
                  value={scheduleForm.frequency}
                  onChange={(e) =>
                    setScheduleForm({ ...scheduleForm, frequency: e.target.value as 'weekly' | 'monthly' })
                  }
                  className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm"
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              {scheduleForm.frequency === 'weekly' && (
                <div>
                  <label className="mb-1 block text-sm text-[var(--muted)]">Day</label>
                  <select
                    value={scheduleForm.day_of_week}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, day_of_week: Number(e.target.value) })}
                    className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm"
                  >
                    {dayNames.map((d, i) => (
                      <option key={d} value={i}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {scheduleForm.frequency === 'monthly' && (
                <div>
                  <label className="mb-1 block text-sm text-[var(--muted)]">Day of month</label>
                  <select
                    value={scheduleForm.day_of_month}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, day_of_month: Number(e.target.value) })}
                    className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm"
                  >
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="mb-1 block text-sm text-[var(--muted)]">Time (HH:MM)</label>
                <input
                  type="time"
                  value={scheduleForm.time_of_day}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, time_of_day: e.target.value })}
                  className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm text-[var(--muted)]">
                <Mail className="inline h-4 w-4" /> Recipients (emails, comma-separated)
              </label>
              <textarea
                value={scheduleForm.recipients}
                onChange={(e) => setScheduleForm({ ...scheduleForm, recipients: e.target.value })}
                placeholder="client@example.com, manager@example.com"
                rows={2}
                className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm"
              />
            </div>
            <button
              onClick={createSchedule}
              disabled={loading}
              className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              Create Schedule
            </button>
          </div>
        )}
        <div className="space-y-2">
          {schedules.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between rounded-lg border border-[var(--card-border)] p-3"
            >
              <div>
                <p className="font-medium">
                  {(s.clients as { name?: string })?.name ?? 'Client'} → {(s.report_templates as { name?: string })?.name ?? 'Template'}
                </p>
                <p className="text-sm text-[var(--muted)]">
                  {s.frequency === 'weekly'
                    ? `${dayNames[s.day_of_week ?? 0]} at ${s.time_of_day}`
                    : `Day ${s.day_of_month} at ${s.time_of_day}`}{' '}
                  ({s.timezone})
                  {s.recipients?.length ? ` • ${s.recipients.length} recipient(s)` : ''}
                </p>
              </div>
              <button
                onClick={() => deleteSchedule(s.id)}
                disabled={loading}
                className="rounded p-2 text-[var(--danger)] hover:bg-[var(--danger-muted)]/30"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          {schedules.length === 0 && (
            <p className="py-4 text-center text-[var(--muted)]">No schedules. Add one to auto-send reports.</p>
          )}
        </div>
      </Card>

      <p className="text-xs text-[var(--muted)]">
        Configure a Vercel Cron job to hit /api/cron/reports with CRON_SECRET header. Default email provider logs
        only—integrate a real provider for delivery.
      </p>
    </div>
  )
}
