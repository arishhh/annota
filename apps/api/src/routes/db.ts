import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

router.get('/ping', async (req: Request, res: Response) => {
    try {
        const result: any = await prisma.$queryRaw`SELECT NOW() as now`;
        // result is an array like [ { now: 2024-05-21T... } ]
        const now = result[0]?.now;
        res.json({ now });
    } catch (error) {
        console.error('DB ping failed:', error);
        res.status(500).json({ error: 'DB ping failed' });
    }
});

export default router;
