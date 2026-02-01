export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request, { params }: { params: { id: string } }) {
    try {
        const email = req.headers.get('x-owner-email');
        if (!email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Verify ownership
        const project = await prisma.project.findUnique({
            where: { id: params.id },
            include: { owner: true }
        });

        if (!project || project.owner.email !== email) {
            return NextResponse.json({ error: 'Not found or access denied' }, { status: 404 });
        }

        const { searchParams } = new URL(req.url);
        const pageUrl = searchParams.get('pageUrl');

        const comments = await prisma.comment.findMany({
            where: {
                projectId: project.id,
                ...(pageUrl ? { pageUrl } : {})
            },
            orderBy: { createdAt: 'desc' }
        });

        const serializedComments = comments.map(c => ({
            ...c,
            clickX: Number(c.clickX),
            clickY: Number(c.clickY)
        }));

        return NextResponse.json(serializedComments);
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
