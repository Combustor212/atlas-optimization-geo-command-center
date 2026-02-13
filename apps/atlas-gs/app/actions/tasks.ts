'use server'

import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { WorkItemCategory, WorkItemStatus, WorkItemPriority } from '@prisma/client'

const workItemSchema = z.object({
  businessId: z.string(),
  contractId: z.string().optional(),
  title: z.string().min(1),
  category: z.nativeEnum(WorkItemCategory),
  description: z.string().optional(),
  status: z.nativeEnum(WorkItemStatus),
  priority: z.nativeEnum(WorkItemPriority),
  dueDate: z.string().optional(),
  assignedToUserId: z.string().optional(),
  checklist: z.string().optional(),
})

export async function createWorkItem(data: z.infer<typeof workItemSchema>) {
  const user = await requireAuth()
  const validated = workItemSchema.parse(data)

  const workItem = await prisma.workItem.create({
    data: {
      ...validated,
      dueDate: validated.dueDate ? new Date(validated.dueDate) : null,
      contractId: validated.contractId || null,
      assignedToUserId: validated.assignedToUserId || null,
      checklist: validated.checklist || null,
    },
  })

  await prisma.activityLog.create({
    data: {
      businessId: validated.businessId,
      entityType: 'WorkItem',
      entityId: workItem.id,
      action: 'CREATED',
      message: `Task "${workItem.title}" created`,
      createdByUserId: user.id,
    },
  })

  revalidatePath('/tasks')
  return { success: true, workItem }
}

export async function updateWorkItem(id: string, data: z.infer<typeof workItemSchema>) {
  const user = await requireAuth()
  const validated = workItemSchema.parse(data)

  const workItem = await prisma.workItem.update({
    where: { id },
    data: {
      ...validated,
      dueDate: validated.dueDate ? new Date(validated.dueDate) : null,
      contractId: validated.contractId || null,
      assignedToUserId: validated.assignedToUserId || null,
      checklist: validated.checklist || null,
    },
  })

  await prisma.activityLog.create({
    data: {
      businessId: validated.businessId,
      entityType: 'WorkItem',
      entityId: workItem.id,
      action: 'UPDATED',
      message: `Task "${workItem.title}" updated`,
      createdByUserId: user.id,
    },
  })

  revalidatePath('/tasks')
  revalidatePath(`/tasks/${id}`)
  return { success: true, workItem }
}

export async function updateWorkItemStatus(id: string, status: WorkItemStatus) {
  const user = await requireAuth()

  const workItem = await prisma.workItem.update({
    where: { id },
    data: { status },
  })

  await prisma.activityLog.create({
    data: {
      businessId: workItem.businessId,
      entityType: 'WorkItem',
      entityId: workItem.id,
      action: 'STATUS_CHANGED',
      message: `Task status changed to ${status}`,
      createdByUserId: user.id,
    },
  })

  revalidatePath('/tasks')
  return { success: true, workItem }
}

// Task templates
export const TASK_TEMPLATES = {
  'seo-monthly': {
    title: 'SEO Monthly Report',
    category: 'SEO' as WorkItemCategory,
    description: 'Generate monthly SEO performance report',
    checklist: [
      { text: 'Pull ranking data from tools', done: false },
      { text: 'Analyze traffic metrics', done: false },
      { text: 'Create report document', done: false },
      { text: 'Add insights and recommendations', done: false },
      { text: 'Send to client', done: false },
    ],
  },
  'geo-citations': {
    title: 'Build Local Citations',
    category: 'GEO' as WorkItemCategory,
    description: 'Build citations on top local directories',
    checklist: [
      { text: 'Google Business Profile', done: false },
      { text: 'Yelp', done: false },
      { text: 'Yellow Pages', done: false },
      { text: 'Bing Places', done: false },
      { text: 'Apple Maps', done: false },
      { text: 'Facebook', done: false },
    ],
  },
  'meo-weekly-post': {
    title: 'Weekly Google Business Profile Post',
    category: 'MEO' as WorkItemCategory,
    description: 'Create and publish weekly GBP post',
    checklist: [
      { text: 'Create post content', done: false },
      { text: 'Design image', done: false },
      { text: 'Schedule/Publish to GBP', done: false },
      { text: 'Monitor engagement', done: false },
    ],
  },
  'crm-setup': {
    title: 'CRM Initial Setup',
    category: 'CRM' as WorkItemCategory,
    description: 'Configure CRM for new client',
    checklist: [
      { text: 'Create pipeline stages', done: false },
      { text: 'Set up custom fields', done: false },
      { text: 'Configure lead capture forms', done: false },
      { text: 'Set up automations', done: false },
      { text: 'Create email templates', done: false },
      { text: 'Train client team', done: false },
    ],
  },
  'website-build': {
    title: 'Build Business Website',
    category: 'WEBSITE' as WorkItemCategory,
    description: 'Design and develop a new website for client',
    checklist: [
      { text: 'Discovery call and requirements gathering', done: false },
      { text: 'Create wireframes and design mockups', done: false },
      { text: 'Get client approval on design', done: false },
      { text: 'Develop website pages', done: false },
      { text: 'Add content and images', done: false },
      { text: 'Set up contact forms', done: false },
      { text: 'Test on mobile and desktop', done: false },
      { text: 'Launch website', done: false },
      { text: 'Train client on updates', done: false },
    ],
  },
  'all-services-onboarding': {
    title: 'Complete Service Package Onboarding',
    category: 'ALL_SERVICES' as WorkItemCategory,
    description: 'Full onboarding for all services: SEO, GEO, MEO, CRM, and Website',
    checklist: [
      { text: 'SEO: Keyword research and strategy setup', done: false },
      { text: 'SEO: Set up Google Search Console and Analytics', done: false },
      { text: 'GEO: Build local citations on directories', done: false },
      { text: 'GEO: Optimize Google Business Profile', done: false },
      { text: 'MEO: Set up weekly GBP posting schedule', done: false },
      { text: 'MEO: Create initial content calendar', done: false },
      { text: 'CRM: Configure pipeline and automation', done: false },
      { text: 'CRM: Train client team on system', done: false },
      { text: 'Website: Design and launch business website', done: false },
      { text: 'Website: Set up hosting and maintenance plan', done: false },
      { text: 'Schedule monthly check-in meetings', done: false },
      { text: 'Deliver comprehensive onboarding report', done: false },
    ],
  },
}

