import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
    try {
        // Perform a simple query to verify DB connection
        await prisma.$queryRaw`SELECT 1`;
        res.json({ ok: true, db: 'connected' });
    } catch (error) {
        console.error('Health check failed:', error);
        res.status(500).json({ ok: false, db: 'error', details: (error as Error).message });
    }
});

export default router;
