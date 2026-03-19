import express from 'express';
import cors from 'cors';
import pinoHttp from 'pino-http';
import logger from './lib/logger';
import { metricsMiddleware, metricsRoute } from './middleware/metrics';
import { errorHandler } from './middleware/error-handler';
import authRoutes from './routes/auth';
import productRoutes from './routes/products';
import categoryRoutes from './routes/categories';
import orderRoutes from './routes/orders';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));

app.use(express.json());

app.use(pinoHttp({ logger }));

app.use(metricsMiddleware);

app.get('/api/metrics', metricsRoute);

app.get('/api/health', async (_req, res) => {
  try {
    const { prisma } = await import('./lib/prisma');
    await prisma.$queryRawUnsafe('SELECT 1');
    res.json({ status: 'ok' });
  } catch {
    res.status(503).json({ status: 'unhealthy', reason: 'database unreachable' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/orders', orderRoutes);

app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`Backend server running on port ${PORT}`);
});

export default app;
