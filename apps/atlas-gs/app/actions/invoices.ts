'use server'

import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { InvoiceStatus } from '@prisma/client'

const invoiceSchema = z.object({
  businessId: z.string(),
  contractId: z.string().optional(),
  invoiceNumber: z.string(),
  issueDate: z.string(),
  dueDate: z.string(),
  amountCents: z.number().int(),
  currency: z.string(),
  status: z.nativeEnum(InvoiceStatus),
  paymentLink: z.string().optional(),
  notes: z.string().optional(),
})

export async function createInvoice(data: z.infer<typeof invoiceSchema>) {
  const user = await requireAuth()
  const validated = invoiceSchema.parse(data)

  const invoice = await prisma.invoice.create({
    data: {
      ...validated,
      issueDate: new Date(validated.issueDate),
      dueDate: new Date(validated.dueDate),
      contractId: validated.contractId || null,
    },
  })

  await prisma.activityLog.create({
    data: {
      businessId: validated.businessId,
      entityType: 'Invoice',
      entityId: invoice.id,
      action: 'CREATED',
      message: `Invoice ${invoice.invoiceNumber} created`,
      createdByUserId: user.id,
    },
  })

  revalidatePath('/invoices')
  return { success: true, invoice }
}

export async function updateInvoice(id: string, data: z.infer<typeof invoiceSchema>) {
  const user = await requireAuth()
  const validated = invoiceSchema.parse(data)

  const invoice = await prisma.invoice.update({
    where: { id },
    data: {
      ...validated,
      issueDate: new Date(validated.issueDate),
      dueDate: new Date(validated.dueDate),
      contractId: validated.contractId || null,
    },
  })

  await prisma.activityLog.create({
    data: {
      businessId: validated.businessId,
      entityType: 'Invoice',
      entityId: invoice.id,
      action: 'UPDATED',
      message: `Invoice ${invoice.invoiceNumber} updated`,
      createdByUserId: user.id,
    },
  })

  revalidatePath('/invoices')
  revalidatePath(`/invoices/${id}`)
  return { success: true, invoice }
}

export async function markInvoicePaid(id: string) {
  const user = await requireAuth()

  const invoice = await prisma.invoice.update({
    where: { id },
    data: {
      status: 'PAID',
      paidAt: new Date(),
    },
  })

  await prisma.activityLog.create({
    data: {
      businessId: invoice.businessId,
      entityType: 'Invoice',
      entityId: invoice.id,
      action: 'STATUS_CHANGED',
      message: `Invoice ${invoice.invoiceNumber} marked as paid`,
      createdByUserId: user.id,
    },
  })

  revalidatePath('/invoices')
  revalidatePath(`/invoices/${id}`)
  return { success: true, invoice }
}

export async function generateInvoiceNumber() {
  const year = new Date().getFullYear()
  const prefix = `INV-${year}-`

  const lastInvoice = await prisma.invoice.findFirst({
    where: {
      invoiceNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      invoiceNumber: 'desc',
    },
  })

  if (!lastInvoice) {
    return `${prefix}0001`
  }

  const lastNumber = parseInt(lastInvoice.invoiceNumber.split('-').pop() || '0')
  const nextNumber = (lastNumber + 1).toString().padStart(4, '0')
  return `${prefix}${nextNumber}`
}

