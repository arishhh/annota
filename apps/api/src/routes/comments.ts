import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Apply auth
router.use(authMiddleware);

// GET /projects/:projectId/comments (Owner View)
router.get('/projects/:projectId', async (req: Request, res: Response) => {
    try {
        const { projectId } = req.params;
        const user = req.user!;

        // Verify ownership via nested query or explicit check.
        // Here we query comments where project.ownerId is user.id
        const comments = await prisma.comment.findMany({
            where: {
                projectId,
                project: {
                    ownerId: user.id
                }
            },
            orderBy: { createdAt: 'desc' },
        });

        res.json(comments);
    } catch (error) {
        console.error('List comments failed:', error);
        res.status(500).json({ error: 'Failed to fetch comments' });
    }
});

// PATCH /comments/:id
router.patch('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const user = req.user!;

        if (!['OPEN', 'RESOLVED'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status. Use OPEN or RESOLVED.' });
        }

        // Strict Ownership Update
        // Only update if the comment belongs to a project owned by the user
        const result = await prisma.comment.updateMany({
            where: {
                id,
                project: {
                    ownerId: user.id
                }
            },
            data: { status }
        });

        if (result.count === 0) {
            return res.status(404).json({ error: 'Comment not found or access denied' });
        }

        res.json({ ok: true });
    } catch (error) {
        console.error('Update comment failed:', error);
        res.status(500).json({ error: 'Failed to update comment' });
    }
});

export default router;
