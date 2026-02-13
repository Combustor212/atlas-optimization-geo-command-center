import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed...')

  // Clear existing data
  await prisma.activityLog.deleteMany()
  await prisma.workItem.deleteMany()
  await prisma.invoice.deleteMany()
  await prisma.contract.deleteMany()
  await prisma.deal.deleteMany()
  await prisma.business.deleteMany()
  await prisma.user.deleteMany()

  // Create users
  const hashedPassword = await bcrypt.hash('password123', 10)
  
  const admin = await prisma.user.create({
    data: {
      name: 'Admin User',
      email: 'admin@agency.com',
      password: hashedPassword,
      role: 'ADMIN',
    },
  })

  const teamMember = await prisma.user.create({
    data: {
      name: 'John Smith',
      email: 'john@agency.com',
      password: hashedPassword,
      role: 'TEAM',
    },
  })

  console.log('✅ Created users')

  // Create businesses
  const businesses = await Promise.all([
    prisma.business.create({
      data: {
        name: 'Joe\'s Pizza',
        legalName: 'Joe\'s Pizza LLC',
        industry: 'Restaurant',
        website: 'https://joespizza.com',
        address: '123 Main St',
        city: 'New York',
        state: 'NY',
        zip: '10001',
        primaryContactName: 'Joe Smith',
        primaryContactEmail: 'joe@joespizza.com',
        primaryContactPhone: '(555) 123-4567',
        status: 'ACTIVE',
        notes: 'Great local pizza place, needs help with local SEO',
      },
    }),
    prisma.business.create({
      data: {
        name: 'Smith & Associates Law',
        legalName: 'Smith & Associates PC',
        industry: 'Legal Services',
        website: 'https://smithlaw.com',
        address: '456 Oak Ave',
        city: 'Los Angeles',
        state: 'CA',
        zip: '90001',
        primaryContactName: 'Sarah Smith',
        primaryContactEmail: 'sarah@smithlaw.com',
        primaryContactPhone: '(555) 234-5678',
        status: 'ACTIVE',
        notes: 'Law firm specializing in family law',
      },
    }),
    prisma.business.create({
      data: {
        name: 'Elite Fitness Gym',
        legalName: 'Elite Fitness Inc',
        industry: 'Fitness',
        website: 'https://elitefitness.com',
        address: '789 Gym Blvd',
        city: 'Chicago',
        state: 'IL',
        zip: '60601',
        primaryContactName: 'Mike Johnson',
        primaryContactEmail: 'mike@elitefitness.com',
        primaryContactPhone: '(555) 345-6789',
        status: 'ACTIVE',
      },
    }),
    prisma.business.create({
      data: {
        name: 'Green Thumb Landscaping',
        industry: 'Landscaping',
        website: 'https://greenthumb.com',
        city: 'Austin',
        state: 'TX',
        zip: '73301',
        primaryContactName: 'Linda Green',
        primaryContactEmail: 'linda@greenthumb.com',
        status: 'PROSPECT',
        notes: 'Currently evaluating our services',
      },
    }),
    prisma.business.create({
      data: {
        name: 'ABC Plumbing',
        industry: 'Home Services',
        city: 'Miami',
        state: 'FL',
        zip: '33101',
        primaryContactName: 'Tom Wilson',
        primaryContactEmail: 'tom@abcplumbing.com',
        status: 'LEAD',
      },
    }),
  ])

  console.log('✅ Created businesses')

  // Create deals
  const deal1 = await prisma.deal.create({
    data: {
      businessId: businesses[3].id,
      stage: 'PROPOSAL',
      expectedMrr: 150000, // $1500
      expectedSetupFee: 50000, // $500
      notes: 'Interested in full SEO + GEO package',
    },
  })

  const deal2 = await prisma.deal.create({
    data: {
      businessId: businesses[4].id,
      stage: 'DISCOVERY',
      expectedMrr: 100000, // $1000
      notes: 'Initial call scheduled',
    },
  })

  console.log('✅ Created deals')

  // Create contracts
  const now = new Date()
  const sixMonthsAgo = new Date(now)
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
  const threeMonthsFromNow = new Date(now)
  threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3)
  const oneYearFromNow = new Date(now)
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1)
  const twentyDaysFromNow = new Date(now)
  twentyDaysFromNow.setDate(twentyDaysFromNow.getDate() + 20)

  const contracts = await Promise.all([
    prisma.contract.create({
      data: {
        businessId: businesses[0].id,
        startDate: sixMonthsAgo,
        endDate: threeMonthsFromNow,
        termMonths: 12,
        autoRenew: true,
        status: 'ACTIVE',
        mrr: 120000, // $1200/mo
        setupFee: 50000,
        serviceSEO: true,
        serviceGEO: true,
        serviceMEO: true,
      },
    }),
    prisma.contract.create({
      data: {
        businessId: businesses[1].id,
        startDate: sixMonthsAgo,
        endDate: oneYearFromNow,
        termMonths: 12,
        autoRenew: false,
        status: 'ACTIVE',
        mrr: 200000, // $2000/mo
        setupFee: 100000,
        serviceSEO: true,
        serviceCRM: true,
      },
    }),
    prisma.contract.create({
      data: {
        businessId: businesses[2].id,
        startDate: new Date('2024-01-01'),
        endDate: twentyDaysFromNow,
        termMonths: 12,
        autoRenew: false,
        status: 'ACTIVE',
        mrr: 150000, // $1500/mo
        serviceSEO: true,
        serviceGEO: true,
        serviceMEO: true,
      },
    }),
  ])

  console.log('✅ Created contracts')

  // Create invoices
  const lastMonth = new Date(now)
  lastMonth.setMonth(lastMonth.getMonth() - 1)
  const twoMonthsAgo = new Date(now)
  twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2)
  const thirtyDaysAgo = new Date(now)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const fifteenDaysAgo = new Date(now)
  fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15)
  const fiveDaysFromNow = new Date(now)
  fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5)

  await Promise.all([
    prisma.invoice.create({
      data: {
        businessId: businesses[0].id,
        contractId: contracts[0].id,
        invoiceNumber: 'INV-2026-0001',
        issueDate: twoMonthsAgo,
        dueDate: lastMonth,
        amountCents: 120000,
        status: 'PAID',
        paidAt: lastMonth,
        paymentMethod: 'Credit Card',
      },
    }),
    prisma.invoice.create({
      data: {
        businessId: businesses[0].id,
        contractId: contracts[0].id,
        invoiceNumber: 'INV-2026-0002',
        issueDate: lastMonth,
        dueDate: now,
        amountCents: 120000,
        status: 'SENT',
      },
    }),
    prisma.invoice.create({
      data: {
        businessId: businesses[1].id,
        contractId: contracts[1].id,
        invoiceNumber: 'INV-2026-0003',
        issueDate: thirtyDaysAgo,
        dueDate: fifteenDaysAgo,
        amountCents: 200000,
        status: 'OVERDUE',
        paymentLink: 'https://pay.stripe.com/example',
      },
    }),
    prisma.invoice.create({
      data: {
        businessId: businesses[2].id,
        contractId: contracts[2].id,
        invoiceNumber: 'INV-2026-0004',
        issueDate: now,
        dueDate: fiveDaysFromNow,
        amountCents: 150000,
        status: 'SENT',
      },
    }),
  ])

  console.log('✅ Created invoices')

  // Create work items
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const nextWeek = new Date(now)
  nextWeek.setDate(nextWeek.getDate() + 7)
  const threeDaysFromNow = new Date(now)
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)

  await Promise.all([
    prisma.workItem.create({
      data: {
        businessId: businesses[0].id,
        contractId: contracts[0].id,
        title: 'Monthly keyword ranking report',
        category: 'SEO',
        description: 'Generate and send monthly keyword ranking report',
        status: 'TODO',
        priority: 'HIGH',
        dueDate: tomorrow,
        assignedToUserId: teamMember.id,
        checklist: JSON.stringify([
          { text: 'Pull ranking data from tools', done: false },
          { text: 'Create report document', done: false },
          { text: 'Add insights and recommendations', done: false },
          { text: 'Send to client', done: false },
        ]),
      },
    }),
    prisma.workItem.create({
      data: {
        businessId: businesses[0].id,
        contractId: contracts[0].id,
        title: 'Update Google Business Profile',
        category: 'MEO',
        description: 'Post weekly update to GBP',
        status: 'IN_PROGRESS',
        priority: 'MEDIUM',
        dueDate: threeDaysFromNow,
        assignedToUserId: teamMember.id,
        checklist: JSON.stringify([
          { text: 'Create social media post', done: true },
          { text: 'Design image', done: true },
          { text: 'Post to GBP', done: false },
          { text: 'Monitor engagement', done: false },
        ]),
      },
    }),
    prisma.workItem.create({
      data: {
        businessId: businesses[1].id,
        contractId: contracts[1].id,
        title: 'Build practice area landing pages',
        category: 'SEO',
        description: 'Create optimized landing pages for family law practice areas',
        status: 'TODO',
        priority: 'HIGH',
        dueDate: nextWeek,
        assignedToUserId: admin.id,
      },
    }),
    prisma.workItem.create({
      data: {
        businessId: businesses[2].id,
        contractId: contracts[2].id,
        title: 'Citation building - 20 sites',
        category: 'GEO',
        description: 'Build citations on top 20 local directories',
        status: 'IN_PROGRESS',
        priority: 'MEDIUM',
        assignedToUserId: teamMember.id,
        checklist: JSON.stringify([
          { text: 'Google Business Profile', done: true },
          { text: 'Yelp', done: true },
          { text: 'Yellow Pages', done: true },
          { text: 'Bing Places', done: true },
          { text: 'Apple Maps', done: false },
          { text: 'Facebook', done: false },
        ]),
      },
    }),
  ])

  console.log('✅ Created work items')

  // Create activity logs
  await Promise.all([
    prisma.activityLog.create({
      data: {
        businessId: businesses[0].id,
        entityType: 'Business',
        entityId: businesses[0].id,
        action: 'CREATED',
        message: 'Business created',
        createdByUserId: admin.id,
      },
    }),
    prisma.activityLog.create({
      data: {
        businessId: businesses[0].id,
        entityType: 'Contract',
        entityId: contracts[0].id,
        action: 'CREATED',
        message: 'Contract created',
        createdByUserId: admin.id,
      },
    }),
  ])

  console.log('✅ Created activity logs')
  console.log('🎉 Seed complete!')
  console.log('\n📧 Test credentials:')
  console.log('Admin: admin@agency.com / password123')
  console.log('Team:  john@agency.com / password123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

