import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authMiddleware } from '../middleware/auth';
import { nanoid } from 'nanoid';

const router = Router();

// Apply auth to all routes
router.use(authMiddleware);

// POST /projects
router.post('/', async (req: Request, res: Response) => {
    try {
        const { name, baseUrl } = req.body;
        const user = req.user!;

        if (!name || !baseUrl) {
            return res.status(400).json({ error: 'Name and baseUrl are required' });
        }

        // STRICT URL Validation & Normalization
        let normalizedUrl: string;
        try {
            const parsed = new URL(baseUrl.trim());
            // Enforce scheme
            if (!['http:', 'https:'].includes(parsed.protocol)) {
                return res.status(400).json({ error: 'URL must start with http:// or https://' });
            }
            // Normalize: lowercase scheme/host (done by URL), remove trailing slash
            // We reconstruct to ensure cleanliness
            normalizedUrl = `${parsed.protocol}//${parsed.hostname.toLowerCase()}${parsed.port ? ':' + parsed.port : ''}${parsed.pathname.replace(/\/+$/, '')}${parsed.search}${parsed.hash}`;
        } catch (e) {
            return res.status(400).json({ error: 'Invalid URL format' });
        }

        const project = await prisma.project.create({
            data: {
                name,
                baseUrl: normalizedUrl,
                ownerId: user.id,
            },
        });

        res.status(201).json(project);
    } catch (error) {
        console.error('Create project failed:', error);
        res.status(500).json({ error: 'Failed to create project' });
    }
});

// GET /projects
router.get('/', async (req: Request, res: Response) => {
    try {
        const user = req.user!;
        const projects = await prisma.project.findMany({
            where: { ownerId: user.id },
            orderBy: { createdAt: 'desc' },
            include: { feedbackLink: true }, // Helpful for UI
        });
        res.json(projects);
    } catch (error) {
        console.error('List projects failed:', error);
        res.status(500).json({ error: 'Failed to list projects' });
    }
});

// GET /projects/:id
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const user = req.user!;

        const project = await prisma.project.findUnique({
            where: { id },
            include: { feedbackLink: true }
        });

        if (!project || project.ownerId !== user.id) {
            return res.status(404).json({ error: 'Project not found' });
        }

        res.json(project);
    } catch (error) {
        console.error('Get project failed:', error);
        res.status(500).json({ error: 'Failed to fetch project' });
    }
});

// POST /projects/:id/feedback-link
router.post('/:id/feedback-link', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const user = req.user!;

        // Verify ownership
        const project = await prisma.project.findUnique({
            where: { id },
        });

        if (!project || project.ownerId !== user.id) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // High entropy token (nanoid default is good, or 32 chars)
        const token = nanoid(32);

        const link = await prisma.feedbackLink.upsert({
            where: { projectId: id },
            update: {
                token,
                isActive: true,
            },
            create: {
                projectId: id,
                token,
                isActive: true,
            },
        });

        const webBase = process.env.WEB_BASE_URL || 'http://localhost:3000';
        res.json({
            token: link.token,
            url: `${webBase}/f/${link.token}`,
        });
    } catch (error) {
        console.error('Create link failed:', error);
        res.status(500).json({ error: 'Failed to create feedback link' });
    }
});

export default router;
