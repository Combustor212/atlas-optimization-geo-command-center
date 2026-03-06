/**
 * Database Seed Script
 * Creates sample data for development
 */
import { PrismaClient, UserRole, MemberRole, ScanType, ScanStatus } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@mgodata.com' },
    update: {},
    create: {
      email: 'admin@mgodata.com',
      passwordHash: adminPassword,
      name: 'Admin User',
      role: UserRole.ADMIN,
    },
  });
  console.log('✅ Admin user created:', admin.email);

  // Create test user 1
  const user1Password = await bcrypt.hash('password123', 10);
  const user1 = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      passwordHash: user1Password,
      name: 'Test User',
      role: UserRole.USER,
    },
  });
  console.log('✅ Test user 1 created:', user1.email);

  // Create test user 2
  const user2Password = await bcrypt.hash('password123', 10);
  const user2 = await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: {},
    create: {
      email: 'demo@example.com',
      passwordHash: user2Password,
      name: 'Demo User',
      role: UserRole.USER,
    },
  });
  console.log('✅ Test user 2 created:', user2.email);

  // Create organization 1 for user1
  const org1 = await prisma.organization.upsert({
    where: { id: 'org-test-1' },
    update: {},
    create: {
      id: 'org-test-1',
      name: 'Test Company Inc',
      ownerUserId: user1.id,
    },
  });
  console.log('✅ Organization 1 created:', org1.name);

  // Create membership for user1 in org1
  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: org1.id,
        userId: user1.id,
      },
    },
    update: {},
    create: {
      organizationId: org1.id,
      userId: user1.id,
      role: MemberRole.OWNER,
    },
  });

  // Create organization 2 for user2
  const org2 = await prisma.organization.upsert({
    where: { id: 'org-test-2' },
    update: {},
    create: {
      id: 'org-test-2',
      name: 'Demo Business LLC',
      ownerUserId: user2.id,
    },
  });
  console.log('✅ Organization 2 created:', org2.name);

  // Create membership for user2 in org2
  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: org2.id,
        userId: user2.id,
      },
    },
    update: {},
    create: {
      organizationId: org2.id,
      userId: user2.id,
      role: MemberRole.OWNER,
    },
  });

  // Create sample locations
  const location1 = await prisma.location.upsert({
    where: { id: 'loc-test-1' },
    update: {},
    create: {
      id: 'loc-test-1',
      organizationId: org1.id,
      name: 'Main Office',
      city: 'San Francisco',
      state: 'CA',
      country: 'US',
      addressLine1: '123 Market St',
      zipCode: '94103',
    },
  });
  console.log('✅ Location 1 created:', location1.name);

  const location2 = await prisma.location.upsert({
    where: { id: 'loc-test-2' },
    update: {},
    create: {
      id: 'loc-test-2',
      organizationId: org1.id,
      name: 'Branch Office',
      city: 'Los Angeles',
      state: 'CA',
      country: 'US',
      addressLine1: '456 Sunset Blvd',
      zipCode: '90028',
    },
  });
  console.log('✅ Location 2 created:', location2.name);

  const location3 = await prisma.location.upsert({
    where: { id: 'loc-test-3' },
    update: {},
    create: {
      id: 'loc-test-3',
      organizationId: org2.id,
      name: 'Demo Store',
      city: 'New York',
      state: 'NY',
      country: 'US',
      addressLine1: '789 Broadway',
      zipCode: '10003',
    },
  });
  console.log('✅ Location 3 created:', location3.name);

  // Create sample completed scan
  const scan1 = await prisma.scan.upsert({
    where: { id: 'scan-test-1' },
    update: {},
    create: {
      id: 'scan-test-1',
      organizationId: org1.id,
      locationId: location1.id,
      userId: user1.id,
      scanType: ScanType.PAID,
      status: ScanStatus.COMPLETE,
      source: 'seed',
      inputPayload: {
        businessName: 'Main Office',
        city: 'San Francisco',
        state: 'CA',
      },
      resultPayload: {
        meo: { score: 85 },
        geo: { score: 78 },
      },
      scoreOverall: 82,
      scoreBreakdown: {
        meo: 85,
        geo: 78,
      },
      version: '1.0',
      completedAt: new Date(),
    },
  });
  console.log('✅ Sample scan created:', scan1.id);

  // Create sample subscription
  const subscription1 = await prisma.subscription.upsert({
    where: { id: 'sub-test-1' },
    update: {},
    create: {
      id: 'sub-test-1',
      organizationId: org1.id,
      provider: 'stripe',
      customerId: 'cus_test_123',
      subscriptionId: 'sub_test_123',
      plan: 'pro',
      status: 'active',
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    },
  });
  console.log('✅ Sample subscription created:', subscription1.id);

  // Create audit log
  await prisma.auditLog.create({
    data: {
      organizationId: org1.id,
      userId: user1.id,
      action: 'SEED_DATA_CREATED',
      entityType: 'System',
      entityId: 'seed',
      details: {
        message: 'Database seeded with sample data',
      },
    },
  });
  console.log('✅ Audit log created');

  console.log('\n🎉 Seeding complete!\n');
  console.log('Test accounts:');
  console.log('  Admin: admin@mgodata.com / admin123');
  console.log('  User 1: test@example.com / password123');
  console.log('  User 2: demo@example.com / password123');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });



