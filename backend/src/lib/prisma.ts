import { PrismaClient } from '@prisma/client';
import { dbQueryDuration } from '../middleware/metrics';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

prisma.$use(async (params, next) => {
  const start = performance.now();
  const result = await next(params);
  const duration = (performance.now() - start) / 1000;
  const operation = `${params.model}.${params.action}`;
  dbQueryDuration.observe({ operation }, duration);
  return result;
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
