import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authMiddleware } from '../middleware/auth';
import { nanoid } from 'nanoid';
import bcrypt from 'bcryptjs';
import { sendApprovalEmail } from '../services/email';

const router = Router();

// POST /api/approval/request/:projectId
// Protected: Agency triggers this
router.post('/request/:projectId', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { projectId } = req.params;
        const { email } = req.body;
        const user = req.user!;

        if (!email) return res.status(400).json({ error: 'Client email is required' });

        // Verify ownership
        const project = await prisma.project.findUnique({
            where: { id: projectId },
        });

        if (!project || project.ownerId !== user.id) {
            return res.status(404).json({ error: 'Project not found' });
        }

        if (project.status === 'APPROVED') {
            return res.status(400).json({ error: 'Project is already approved' });
        }

        // Generate Secure Data
        const token = nanoid(32); // URL safe
        const pin = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit PIN
        const pinHash = await bcrypt.hash(pin, 10);

        // Expiry: 24 hours
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        // Invalidate previous active requests?
        // Optional but good practice to avoid multiple valid PINs floating around
        await prisma.approvalRequest.updateMany({
            where: { projectId, usedAt: null },
            data: { usedAt: new Date() } // Mark effectively as used/cancelled
        });

        // Create Request
        await prisma.approvalRequest.create({
            data: {
                projectId,
                email,
                token,
                pinHash,
                expiresAt
            }
        });

        // Send Email
        const webBase = process.env.WEB_BASE_URL || 'http://localhost:3000';
        const approvalUrl = `${webBase}/approve/${token}`;

        const emailSent = await sendApprovalEmail(email, project.name, approvalUrl, pin);

        if (!emailSent) {
            return res.status(500).json({ error: 'Failed to send email. Check server logs.' });
        }

        res.json({ ok: true });
    } catch (error) {
        console.error('Approval Request Failed:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/approval/:token
// Public: Client views this
router.get('/:token', async (req: Request, res: Response) => {
    try {
        const { token } = req.params;

        // 1. Find the Request (No includes yet to see if it even exists)
        const request = await prisma.approvalRequest.findUnique({
            where: { token },
            include: { project: true }
        });

        // 2. Strict Validation: Found?
        if (!request) {
            return res.status(404).json({ error: 'Not found' });
        }

        const project = request.project;
        const now = new Date();
        const isExpired = request.usedAt || now > request.expiresAt;
        const isProjectApproved = project.status === 'APPROVED';

        // 3. Status Rule:
        // If not approved, and token is unusable -> fail securely (don't reveal project)
        if (!isProjectApproved && isExpired) {
            return res.status(404).json({ error: 'Not found' });
        }

        // 4. Fetch Feedback Token (Safe separate query)
        const feedbackLink = await prisma.feedbackLink.findUnique({
            where: { projectId: project.id }
        });

        res.json({
            project: {
                id: project.id,
                name: project.name,
                baseUrl: project.baseUrl,
                status: project.status,
                approvedAt: project.approvedAt
            },
            commentToken: feedbackLink?.token || null
        });
    } catch (error) {
        console.error('Get Approval Info Failed:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/approval/:token/confirm
// Public: Client submits PIN
router.post('/:token/confirm', async (req: Request, res: Response) => {
    try {
        const { token } = req.params;
        const { pin } = req.body;

        const request = await prisma.approvalRequest.findUnique({
            where: { token },
            include: { project: true }
        });

        if (!request) return res.status(404).json({ error: 'Not found' });

        // Idempotency: If already approved, return success
        if (request.project.status === 'APPROVED') {
            return res.json({ ok: true });
        }

        // Logic Check: If not approved, token must be valid
        const now = new Date();
        if (request.usedAt || now > request.expiresAt) {
            return res.status(404).json({ error: 'Not found' }); // Same generic error
        }

        // Verify PIN
        const isValid = await bcrypt.compare(pin, request.pinHash);
        if (!isValid) {
            return res.status(400).json({ error: 'Invalid PIN' });
        }

        // Transaction: Approve Project + Mark Request Used
        await prisma.$transaction([
            prisma.project.update({
                where: { id: request.projectId },
                data: {
                    status: 'APPROVED',
                    approvedAt: new Date()
                }
            }),
            prisma.approvalRequest.update({
                where: { id: request.id },
                data: { usedAt: new Date() }
            })
        ]);

        res.json({ ok: true });
    } catch (error) {
        console.error('Confirm Approval Failed:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
