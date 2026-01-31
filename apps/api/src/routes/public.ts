import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

// GET /f/:token
router.get('/:token', async (req: Request, res: Response) => {
    try {
        const { token } = req.params;

        const link = await prisma.feedbackLink.findUnique({
            where: { token },
            include: { project: true },
        });

        if (!link || !link.isActive) {
            return res.status(404).json({ error: 'Link not found or inactive' });
        }

        // NO TOKEN ECHO in response
        res.json({
            project: {
                id: link.project.id,
                name: link.project.name,
                baseUrl: link.project.baseUrl,
                status: link.project.status,
            },
            link: {
                isActive: link.isActive,
            },
        });
    } catch (error) {
        console.error('Public link fetch failed:', error);
        res.status(500).json({ error: 'Internal error' });
    }
});

// POST /f/:token/approve
router.post('/:token/approve', async (req: Request, res: Response) => {
    try {
        const { token } = req.params;

        const link = await prisma.feedbackLink.findUnique({
            where: { token },
            include: { project: true }
        });

        if (!link || !link.isActive) {
            return res.status(404).json({ error: 'Link not found or inactive' });
        }

        const updatedProject = await prisma.project.update({
            where: { id: link.projectId },
            data: {
                status: 'APPROVED',
                approvedAt: new Date()
            }
        });

        res.json({ status: updatedProject.status });
    } catch (error) {
        console.error('Project approval failed:', error);
        res.status(500).json({ error: 'Failed to approve project' });
    }
});

// PATCH /f/:token/comments/:commentId/status
router.patch('/:token/comments/:commentId/status', async (req: Request, res: Response) => {
    try {
        const { token, commentId } = req.params;
        const { status } = req.body; // 'OPEN' | 'RESOLVED'

        const link = await prisma.feedbackLink.findUnique({
            where: { token },
        });

        if (!link || !link.isActive) {
            return res.status(404).json({ error: 'Link not found or inactive' });
        }

        // Verify comment belongs to project
        const comment = await prisma.comment.findFirst({
            where: { id: commentId, projectId: link.projectId }
        });

        if (!comment) {
            return res.status(404).json({ error: 'Comment not found' });
        }

        const updated = await prisma.comment.update({
            where: { id: commentId },
            data: { status }
        });

        res.json(updated);
    } catch (error) {
        console.error('Comment status update failed:', error);
        res.status(500).json({ error: 'Failed to update status' });
    }
});

// POST /f/:token/comments
router.post('/:token/comments', async (req: Request, res: Response) => {

    try {
        const { token } = req.params;
        const { pageUrl, clickX, clickY, screenshotUrl, message } = req.body;

        const link = await prisma.feedbackLink.findUnique({
            where: { token },
            include: { project: true } // Include project to check status
        });

        if (!link || !link.isActive) {
            return res.status(404).json({ error: 'Link not found or inactive' });
        }

        // 🔒 Lock check
        if (link.project.status === 'APPROVED') {
            return res.status(403).json({ error: 'Project is approved. No new comments allowed.' });
        }

        // Validation
        if (!Number.isInteger(clickX) || clickX < 0 || !Number.isInteger(clickY) || clickY < 0) {
            return res.status(400).json({ error: 'Coordinates must be non-negative integers' });
        }
        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        const comment = await prisma.comment.create({
            data: {
                projectId: link.projectId,
                pageUrl,
                clickX,
                clickY,
                screenshotUrl: screenshotUrl || null, // Allow nullable
                message,
                status: 'OPEN',
            },
        });

        res.status(201).json(comment);
    } catch (error) {
        console.error('Public comment create failed:', error);
        res.status(500).json({ error: 'Failed to post comment' });
    }
});

// GET /f/:token/comments (Public list)
router.get('/:token/comments', async (req: Request, res: Response) => {
    try {
        const { token } = req.params;

        const link = await prisma.feedbackLink.findUnique({
            where: { token },
        });

        if (!link || !link.isActive) {
            return res.status(404).json({ error: 'Link not found' });
        }

        const comments = await prisma.comment.findMany({
            where: { projectId: link.projectId },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                pageUrl: true,
                clickX: true,
                clickY: true,
                message: true,
                status: true,
                createdAt: true
                // Exclude internal fields if any
            }
        });

        res.json(comments);
    } catch (error) {
        console.error('Public comments list failed:', error);
        res.status(500).json({ error: 'Failed to fetch comments' });
    }
});

export default router;
