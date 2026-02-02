export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { nanoid } from 'nanoid';
import bcrypt from 'bcryptjs';
import { sendApprovalEmail } from '@/lib/email';

export async function POST(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const ownerEmail = req.headers.get('x-owner-email');
        if (!ownerEmail) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { clientEmail } = await req.json();
        const projectId = params.id;

        if (!clientEmail) {
            return NextResponse.json({ error: 'Client email is required' }, { status: 400 });
        }

        // Verify ownership
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            include: { owner: true }
        });

        if (!project || project.owner.email !== ownerEmail) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        if (project.status === 'APPROVED') {
            return NextResponse.json({ error: 'Project is already approved' }, { status: 400 });
        }

        // Generate Secure Data
        const token = nanoid(32);
        const pin = Math.floor(100000 + Math.random() * 900000).toString();
        const pinHash = await bcrypt.hash(pin, 10);
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

        // Invalidate previous requests for this project
        await prisma.approvalRequest.updateMany({
            where: { projectId, usedAt: null },
            data: { usedAt: new Date() } // Mark as used/expired
        });

        // Create new request
        await prisma.approvalRequest.create({
            data: {
                projectId,
                email: clientEmail,
                token,
                pinHash,
                expiresAt
            }
        });

        // Send Email
        const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
        const approvalUrl = `${origin}/approve/${token}`;



        try {
            const sent = await sendApprovalEmail(clientEmail, project.name, approvalUrl, pin);
            if (!sent) {
                // Fallback for dev/error: Log it clearly
                console.error('[EMAIL FAIL] Could not send email via Resend.');
                // In dev, we might verify want to succeed if we can't send email but logged it?
                // The prompt says "No silent failures", "Return proper error JSON".
                // However, verify prompt says "If RESEND is not configured, implement a dev fallback: log link + pin".
                // Since sendApprovalEmail returns false on error, we can check env.
                if (process.env.NODE_ENV === 'development' || !process.env.RESEND_API_KEY) {
                    return NextResponse.json({ ok: true, devMode: true, pin, approvalUrl });
                }
                return NextResponse.json({ error: 'Failed to send approval email' }, { status: 500 });
            }
        } catch (emailErr) {
            console.error('Email sending exception:', emailErr);
            if (process.env.NODE_ENV === 'development') {
                return NextResponse.json({ ok: true, devMode: true, pin, approvalUrl });
            }
            return NextResponse.json({ error: 'Failed to send approval email' }, { status: 500 });
        }

        return NextResponse.json({ ok: true });
    } catch (e) {
        console.error('[APPROVAL REQUEST ERROR]', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
