export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req: Request, { params }: { params: { token: string } }) {
    try {
        const { token } = params;
        const body = await req.json();
        const { pin } = body;

        const request = await prisma.approvalRequest.findUnique({
            where: { token },
            include: { project: true }
        });

        if (!request) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        // Idempotency
        if (request.project.status === 'APPROVED') {
            return NextResponse.json({ ok: true });
        }

        // Validity Check
        const now = new Date();
        if (request.usedAt || now > request.expiresAt) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        // PIN Verification
        const isValid = await bcrypt.compare(pin, request.pinHash);
        if (!isValid) {
            return NextResponse.json({ error: 'Invalid PIN' }, { status: 400 });
        }

        // Execute Approval
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

        return NextResponse.json({ ok: true });

    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
