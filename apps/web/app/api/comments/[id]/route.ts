export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
    try {
        const email = req.headers.get('x-owner-email');
        if (!email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = params;
        const body = await req.json();
        const { status } = body; // 'OPEN' | 'RESOLVED'

        // Verify Ownership of the Project via the Comment
        const comment = await prisma.comment.findUnique({
            where: { id },
            include: { project: { include: { owner: true } } }
        });

        if (!comment || comment.project.owner.email !== email) {
            return NextResponse.json({ error: 'Not found or access denied' }, { status: 404 });
        }

        const updated = await prisma.comment.update({
            where: { id },
            data: { status }
        });

        return NextResponse.json(updated);
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
