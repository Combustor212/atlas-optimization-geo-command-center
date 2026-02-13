'use server'

import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { BusinessStatus } from '@prisma/client'

const businessSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  legalName: z.string().optional(),
  industry: z.string().optional(),
  website: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  primaryContactName: z.string().optional(),
  primaryContactEmail: z.string().email().optional().or(z.literal('')),
  primaryContactPhone: z.string().optional(),
  notes: z.string().optional(),
  status: z.nativeEnum(BusinessStatus),
})

export async function createBusiness(formData: FormData) {
  const user = await requireAuth()

  const data = {
    name: formData.get('name') as string,
    legalName: formData.get('legalName') as string,
    industry: formData.get('industry') as string,
    website: formData.get('website') as string,
    address: formData.get('address') as string,
    city: formData.get('city') as string,
    state: formData.get('state') as string,
    zip: formData.get('zip') as string,
    primaryContactName: formData.get('primaryContactName') as string,
    primaryContactEmail: formData.get('primaryContactEmail') as string,
    primaryContactPhone: formData.get('primaryContactPhone') as string,
    notes: formData.get('notes') as string,
    status: formData.get('status') as BusinessStatus,
  }

  const validated = businessSchema.parse(data)

  const business = await prisma.business.create({
    data: validated,
  })

  await prisma.activityLog.create({
    data: {
      businessId: business.id,
      entityType: 'Business',
      entityId: business.id,
      action: 'CREATED',
      message: `Business "${business.name}" created`,
      createdByUserId: user.id,
    },
  })

  revalidatePath('/businesses')
  return { success: true, business }
}

export async function updateBusiness(id: string, formData: FormData) {
  const user = await requireAuth()

  const data = {
    name: formData.get('name') as string,
    legalName: formData.get('legalName') as string,
    industry: formData.get('industry') as string,
    website: formData.get('website') as string,
    address: formData.get('address') as string,
    city: formData.get('city') as string,
    state: formData.get('state') as string,
    zip: formData.get('zip') as string,
    primaryContactName: formData.get('primaryContactName') as string,
    primaryContactEmail: formData.get('primaryContactEmail') as string,
    primaryContactPhone: formData.get('primaryContactPhone') as string,
    notes: formData.get('notes') as string,
    status: formData.get('status') as BusinessStatus,
  }

  const validated = businessSchema.parse(data)

  const business = await prisma.business.update({
    where: { id },
    data: validated,
  })

  await prisma.activityLog.create({
    data: {
      businessId: business.id,
      entityType: 'Business',
      entityId: business.id,
      action: 'UPDATED',
      message: `Business "${business.name}" updated`,
      createdByUserId: user.id,
    },
  })

  revalidatePath('/businesses')
  revalidatePath(`/businesses/${id}`)
  return { success: true, business }
}

export async function deleteBusiness(id: string) {
  const user = await requireAuth()

  await prisma.business.delete({
    where: { id },
  })

  revalidatePath('/businesses')
  return { success: true }
}

