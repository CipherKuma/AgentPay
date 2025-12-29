import { Router, Request, Response } from 'express';
import { paymentRepository } from '../db/repositories/payments.js';
import { getDb } from '../db/index.js';

const router = Router();

interface UsageQuery {
  payer?: string;
  days?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * GET /v1/usage
 * Get usage statistics
 */
router.get('/', async (req: Request<{}, {}, {}, UsageQuery>, res: Response) => {
  try {
    const db = getDb();
    if (!db) {
      return res.json({
        summary: { totalRequests: 0, totalSpent: '0', averageCost: '0', currency: 'octas' },
        daily: [],
        period: { days: 30 },
      });
    }

    const { payer, days = '30', startDate, endDate } = req.query;
    const daysNum = parseInt(days, 10) || 30;
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    const stats = await paymentRepository.getStats(payer, start, end);
    const dailyStats = await paymentRepository.getDailyStats(daysNum);

    res.json({
      summary: {
        totalRequests: stats.totalRequests || 0,
        totalSpent: stats.totalAmount?.toString() || '0',
        averageCost: stats.avgAmount?.toString() || '0',
        currency: 'octas',
      },
      daily: dailyStats.map(day => ({
        date: day.date,
        requests: day.requests,
        amount: day.amount?.toString() || '0',
      })),
      period: {
        days: daysNum,
        startDate: start?.toISOString(),
        endDate: end?.toISOString(),
      },
    });
  } catch (error) {
    console.error('[Usage] Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch usage stats' });
  }
});

/**
 * GET /v1/usage/history
 * Get payment history for a specific payer
 */
router.get('/history', async (req: Request<{}, {}, {}, { payer: string; limit?: string }>, res: Response) => {
  try {
    const db = getDb();
    if (!db) {
      return res.json({ payments: [], total: 0 });
    }

    const { payer, limit = '100' } = req.query;

    if (!payer) {
      return res.status(400).json({ error: 'payer address required' });
    }

    const payments = await paymentRepository.getByPayer(payer, parseInt(limit, 10));

    res.json({
      payments: payments.map(p => ({
        id: p.id,
        amount: p.amount.toString(),
        serviceType: p.serviceType,
        model: p.model,
        provider: p.provider,
        txHash: p.txHash,
        timestamp: p.createdAt.toISOString(),
      })),
      total: payments.length,
    });
  } catch (error) {
    console.error('[Usage] Error fetching history:', error);
    res.status(500).json({ error: 'Failed to fetch payment history' });
  }
});

/**
 * GET /v1/usage/by-service
 * Get usage breakdown by service type
 */
router.get('/by-service', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    if (!db) {
      return res.json({ services: [] });
    }

    const breakdown = await paymentRepository.getStatsByService();

    res.json({
      services: breakdown.map(s => ({
        service: s.serviceType,
        requests: s.requests,
        totalAmount: s.amount?.toString() || '0',
      })),
    });
  } catch (error) {
    console.error('[Usage] Error fetching service breakdown:', error);
    res.status(500).json({ error: 'Failed to fetch service breakdown' });
  }
});

export default router;
