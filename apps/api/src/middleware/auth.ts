import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

// Extend Express Request to include user
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                email: string;
            };
        }
    }
}

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    const email = req.headers['x-owner-email'] as string;

    if (!email) {
        return res.status(401).json({ error: 'Missing x-owner-email header' });
    }

    try {
        // MVP: Find or create user by email
        let user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            console.log(`Creating new user for MVP: ${email}`);
            user = await prisma.user.create({
                data: { email },
            });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Auth check failed:', error);
        res.status(500).json({ error: 'Internal auth error' });
    }
};
