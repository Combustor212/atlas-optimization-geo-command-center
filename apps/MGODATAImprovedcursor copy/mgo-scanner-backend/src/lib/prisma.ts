/**
 * Prisma Client Singleton
 */
import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Check if using Prisma Accelerate URL
const databaseUrl = process.env.DATABASE_URL || '';
const isAccelerateUrl = databaseUrl.startsWith('prisma+postgres://');

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    ...(isAccelerateUrl ? { accelerateUrl: databaseUrl } : {}),
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Test connection
export async function testPrismaConnection(): Promise<boolean> {
  try {
    await prisma.$connect();
    logger.info('Prisma connected to PostgreSQL');
    return true;
  } catch (error) {
    logger.error('Prisma connection failed', { error: (error as Error).message });
    return false;
  }
}

// Graceful disconnect
export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
  logger.info('Prisma disconnected');
}

