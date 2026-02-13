'use server'

import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { DealStage } from '@prisma/client'

const dealSchema = z.object({
  businessId: z.string(),
  stage: z.nativeEnum(DealStage),
  expectedMrr: z.number().int().optional(),
  expectedSetupFee: z.number().int().optional(),
  closeDate: z.string().optional(),
  source: z.string().optional(),
  notes: z.string().optional(),
})

export async function createDeal(data: z.infer<typeof dealSchema>) {
  const user = await requireAuth()
  const validated = dealSchema.parse(data)

  const deal = await prisma.deal.create({
    data: {
      ...validated,
      closeDate: validated.closeDate ? new Date(validated.closeDate) : null,
    },
  })

  await prisma.activityLog.create({
    data: {
      businessId: validated.businessId,
      entityType: 'Deal',
      entityId: deal.id,
      action: 'CREATED',
      message: `Deal created in ${deal.stage} stage`,
      createdByUserId: user.id,
    },
  })

  revalidatePath('/deals')
  return { success: true, deal }
}

export async function updateDealStage(dealId: string, stage: DealStage) {
  const user = await requireAuth()

  const deal = await prisma.deal.update({
    where: { id: dealId },
    data: { stage },
  })

  await prisma.activityLog.create({
    data: {
      businessId: deal.businessId,
      entityType: 'Deal',
      entityId: deal.id,
      action: 'STATUS_CHANGED',
      message: `Deal moved to ${stage}`,
      createdByUserId: user.id,
    },
  })

  revalidatePath('/deals')
  return { success: true, deal }
}

export async function convertDealToContract(dealId: string, contractData: any) {
  const user = await requireAuth()

  const deal = await prisma.deal.findUnique({ where: { id: dealId } })
  if (!deal) throw new Error('Deal not found')

  const contract = await prisma.contract.create({
    data: {
      businessId: deal.businessId,
      dealId: deal.id,
      ...contractData,
    },
  })

  await prisma.deal.update({
    where: { id: dealId },
    data: { stage: 'WON' },
  })

  await prisma.activityLog.create({
    data: {
      businessId: deal.businessId,
      entityType: 'Contract',
      entityId: contract.id,
      action: 'CREATED',
      message: `Contract created from deal`,
      createdByUserId: user.id,
    },
  })

  revalidatePath('/deals')
  revalidatePath('/contracts')
  return { success: true, contract }
}

