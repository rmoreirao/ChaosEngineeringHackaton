import { Router, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { ordersTotal } from '../middleware/metrics';
import logger from '../lib/logger';

const router = Router();

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl: string | null;
  slug: string;
}

router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { items, address } = req.body as { items: CartItem[]; address: string };
    const userId = req.user!.userId;

    if (!items || !items.length) {
      res.status(400).json({ error: 'Cart is empty' });
      return;
    }

    if (!address || !address.trim()) {
      res.status(400).json({ error: 'Address is required' });
      return;
    }

    // Validate all product IDs exist in the database
    const productIds = items.map((item) => item.id);
    const existingProducts = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, price: true },
    });

    const existingIds = new Set(existingProducts.map((p) => p.id));
    const missingIds = productIds.filter((id) => !existingIds.has(id));

    if (missingIds.length > 0) {
      res.status(400).json({
        error: 'Some products in your cart are no longer available. Please clear your cart and try again.',
      });
      return;
    }

    // Use server-side prices for security
    const priceMap = new Map(existingProducts.map((p) => [p.id, Number(p.price)]));
    const total = items.reduce((sum, item) => sum + (priceMap.get(item.id) || 0) * item.quantity, 0);

    const order = await prisma.order.create({
      data: {
        userId,
        total,
        address,
        status: 'COMPLETED',
        items: {
          create: items.map((item) => ({
            productId: item.id,
            quantity: item.quantity,
            price: priceMap.get(item.id) || item.price,
          })),
        },
      },
      include: {
        items: {
          include: { product: true },
        },
      },
    });

    ordersTotal.inc();
    logger.info({ orderId: order.id, userId, total }, 'Order placed');

    res.status(201).json({ success: true, orderId: order.id });
  } catch (error) {
    next(error);
  }
});

router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.user!.userId },
      include: {
        items: {
          include: { product: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(orders);
  } catch (error) {
    next(error);
  }
});

export default router;
