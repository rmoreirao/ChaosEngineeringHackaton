import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import logger from '../lib/logger';

const router = Router();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { q, featured, limit } = req.query;

    if (q && typeof q === 'string') {
      const products = await prisma.product.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
          ],
        },
        include: { category: true },
        orderBy: { name: 'asc' },
      });
      res.json(products);
      return;
    }

    if (featured === 'true') {
      const take = limit ? parseInt(limit as string, 10) : 8;
      const products = await prisma.product.findMany({
        take,
        include: { category: true },
        orderBy: { createdAt: 'desc' },
      });
      res.json(products);
      return;
    }

    const products = await prisma.product.findMany({
      include: { category: true },
      orderBy: { name: 'asc' },
    });
    res.json(products);
  } catch (error) {
    next(error);
  }
});

router.get('/:slug', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await prisma.product.findUnique({
      where: { slug: req.params.slug },
      include: { category: true },
    });

    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    res.json(product);
  } catch (error) {
    next(error);
  }
});

router.get('/:slug/related', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await prisma.product.findUnique({
      where: { slug: req.params.slug },
      select: { id: true, categoryId: true },
    });

    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 4;

    const related = await prisma.product.findMany({
      where: {
        categoryId: product.categoryId,
        id: { not: product.id },
      },
      take: limit,
      orderBy: { name: 'asc' },
    });

    res.json(related);
  } catch (error) {
    next(error);
  }
});

export default router;
