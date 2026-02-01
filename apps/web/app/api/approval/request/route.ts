export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { nanoid } from 'nanoid';
import bcrypt from 'bcryptjs';
import { sendApprovalEmail } from '@/lib/email';

export async function POST(req: Request) {
    try {
        const email = req.headers.get('x-owner-email');
        if (!email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { projectId } = body;

        // Verify ownership
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            include: { owner: true }
        });

        if (!project || project.owner.email !== email) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        if (project.status === 'APPROVED') {
            return NextResponse.json({ error: 'Project is already approved' }, { status: 400 });
        }

        // For this MVP flow, we send the email TO THE OWNER (Agency) as requested by the frontend alert
        // "he/she sends to themselves" logic implies we use the owner email.
        const recipientEmail = email;

        // Generate Secure Data
        const token = nanoid(32);
        const pin = Math.floor(100000 + Math.random() * 900000).toString();
        const pinHash = await bcrypt.hash(pin, 10);
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

        // Invalidate previous
        await prisma.approvalRequest.updateMany({
            where: { projectId, usedAt: null },
            data: { usedAt: new Date() }
        });

        await prisma.approvalRequest.create({
            data: {
                projectId,
                email: recipientEmail,
                token,
                pinHash,
                expiresAt
            }
        });

        // Send Email
        // Assuming NEXT_PUBLIC_APP_URL or we derive from request
        const origin = new URL(req.url).origin;
        const approvalUrl = `${origin}/approve/${token}`;

        const sent = await sendApprovalEmail(recipientEmail, project.name, approvalUrl, pin);

        if (!sent) {
            return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
        }

        return NextResponse.json({ ok: true });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
