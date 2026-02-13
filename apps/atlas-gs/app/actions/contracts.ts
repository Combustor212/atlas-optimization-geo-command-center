'use server'

import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { ContractStatus } from '@prisma/client'

const contractSchema = z.object({
  businessId: z.string(),
  dealId: z.string().optional(),
  startDate: z.string(),
  endDate: z.string(),
  termMonths: z.number().int(),
  autoRenew: z.boolean(),
  renewalNoticeDays: z.number().int(),
  status: z.nativeEnum(ContractStatus),
  mrr: z.number().int(),
  setupFee: z.number().int(),
  serviceSEO: z.boolean(),
  serviceGEO: z.boolean(),
  serviceMEO: z.boolean(),
  serviceCRM: z.boolean(),
  serviceWEBSITE: z.boolean(),
  notes: z.string().optional(),
})

export async function createContract(data: z.infer<typeof contractSchema>) {
  const user = await requireAuth()
  const validated = contractSchema.parse(data)

  const contract = await prisma.contract.create({
    data: {
      ...validated,
      startDate: new Date(validated.startDate),
      endDate: new Date(validated.endDate),
      dealId: validated.dealId || null,
    },
  })

  await prisma.activityLog.create({
    data: {
      businessId: validated.businessId,
      entityType: 'Contract',
      entityId: contract.id,
      action: 'CREATED',
      message: `Contract created`,
      createdByUserId: user.id,
    },
  })

  revalidatePath('/contracts')
  return { success: true, contract }
}

export async function updateContract(id: string, data: z.infer<typeof contractSchema>) {
  const user = await requireAuth()
  const validated = contractSchema.parse(data)

  const contract = await prisma.contract.update({
    where: { id },
    data: {
      ...validated,
      startDate: new Date(validated.startDate),
      endDate: new Date(validated.endDate),
      dealId: validated.dealId || null,
    },
  })

  await prisma.activityLog.create({
    data: {
      businessId: validated.businessId,
      entityType: 'Contract',
      entityId: contract.id,
      action: 'UPDATED',
      message: `Contract updated`,
      createdByUserId: user.id,
    },
  })

  revalidatePath('/contracts')
  revalidatePath(`/contracts/${id}`)
  return { success: true, contract }
}

export async function renewContract(id: string) {
  const user = await requireAuth()

  const oldContract = await prisma.contract.findUnique({ where: { id } })
  if (!oldContract) throw new Error('Contract not found')

  const newStartDate = new Date(oldContract.endDate)
  newStartDate.setDate(newStartDate.getDate() + 1)

  const newEndDate = new Date(newStartDate)
  newEndDate.setMonth(newEndDate.getMonth() + oldContract.termMonths)

  const newContract = await prisma.contract.create({
    data: {
      businessId: oldContract.businessId,
      startDate: newStartDate,
      endDate: newEndDate,
      termMonths: oldContract.termMonths,
      autoRenew: oldContract.autoRenew,
      renewalNoticeDays: oldContract.renewalNoticeDays,
      status: 'ACTIVE',
      mrr: oldContract.mrr,
      setupFee: 0,
      serviceSEO: oldContract.serviceSEO,
      serviceGEO: oldContract.serviceGEO,
      serviceMEO: oldContract.serviceMEO,
      serviceCRM: oldContract.serviceCRM,
      notes: oldContract.notes,
    },
  })

  await prisma.contract.update({
    where: { id },
    data: { status: 'EXPIRED' },
  })

  await prisma.activityLog.create({
    data: {
      businessId: oldContract.businessId,
      entityType: 'Contract',
      entityId: newContract.id,
      action: 'CREATED',
      message: `Contract renewed`,
      createdByUserId: user.id,
    },
  })

  revalidatePath('/contracts')
  return { success: true, contract: newContract }
}

