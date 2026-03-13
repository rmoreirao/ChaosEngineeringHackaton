import { PrismaClient } from '@prisma/client';
import { dbQueryDuration } from '../middleware/metrics';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

prisma.$use(async (params, next) => {
  const start = performance.now();
  const operation = `${params.model}.${params.action}`;
  try {
    const result = await next(params);
    const duration = (performance.now() - start) / 1000;
    dbQueryDuration.observe({ operation }, duration);
    return result;
  } catch (error) {
    const duration = (performance.now() - start) / 1000;
    dbQueryDuration.observe({ operation }, duration);
    throw error;
  }
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
