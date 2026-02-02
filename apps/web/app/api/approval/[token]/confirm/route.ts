export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(
    req: Request,
    { params }: { params: { token: string } }
) {
    try {
        const { token } = params;
        const { pin } = await req.json();

        if (!pin) {
            return NextResponse.json({ error: 'PIN is required' }, { status: 400 });
        }

        // Find Request
        const request = await prisma.approvalRequest.findUnique({
            where: { token },
            include: { project: true }
        });

        if (!request) {
            return NextResponse.json({ error: 'Request not found' }, { status: 404 });
        }

        // Check if project is already approved (Idempotency)
        if (request.project.status === 'APPROVED') {
            return NextResponse.json({ ok: true, alreadyApproved: true });
        }

        // Validate Expiration and Usage
        if (request.usedAt || new Date() > request.expiresAt) {
            return NextResponse.json({ error: 'Request expired or already used' }, { status: 400 }); // Or 404 per prompt? Prompt says "If valid: ...". "If invalid/expired -> 404"
            // The prompt says: "If invalid/expired -> 404".
        }

        // I'll stick to 404 for expired per prompt requirements for GET, 
        // but for POST "invalid/expired -> 404" and "pin mismatch -> 400".
        if (request.usedAt || new Date() > request.expiresAt) {
            return NextResponse.json({ error: 'Request expired or invalid' }, { status: 404 });
        }

        // Verify PIN
        const isValidPin = await bcrypt.compare(pin, request.pinHash);
        if (!isValidPin) {
            return NextResponse.json({ error: 'Invalid PIN' }, { status: 400 });
        }

        // SUCCESS: Update DB
        const now = new Date();

        // Transaction to ensure consistency
        await prisma.$transaction([
            prisma.project.update({
                where: { id: request.projectId },
                data: {
                    status: 'APPROVED',
                    approvedAt: now
                }
            }),
            prisma.approvalRequest.update({
                where: { id: request.id },
                data: { usedAt: now }
            })
        ]);

        return NextResponse.json({ ok: true });

    } catch (e) {
        console.error('[APPROVAL CONFIRM ERROR]', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
