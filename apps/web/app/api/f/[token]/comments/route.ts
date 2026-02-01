export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request, { params }: { params: { token: string } }) {
    try {
        const { token } = params;
        const { searchParams } = new URL(req.url);
        const pageUrl = searchParams.get('pageUrl');

        // 1. Validate Link
        const link = await prisma.feedbackLink.findUnique({
            where: { token },
            include: { project: true }
        });

        if (!link || !link.isActive) {
            return NextResponse.json({ error: 'Invalid link' }, { status: 404 });
        }

        // 2. Fetch Comments
        const comments = await prisma.comment.findMany({
            where: {
                projectId: link.projectId,
                ...(pageUrl ? { pageUrl } : {})
            },
            orderBy: { createdAt: 'desc' }
        });

        // 3. Serialize (BigInt handling usually needed for some DBs, safety for clickX/Y)
        const serialized = comments.map(c => ({
            ...c,
            clickX: Number(c.clickX),
            clickY: Number(c.clickY)
        }));

        return NextResponse.json(serialized);

    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: Request, { params }: { params: { token: string } }) {
    try {
        const { token } = params;
        const body = await req.json();
        const { pageUrl, clickX, clickY, message } = body;

        // 1. Validate Link
        const link = await prisma.feedbackLink.findUnique({
            where: { token },
            include: { project: true }
        });

        if (!link || !link.isActive) {
            return NextResponse.json({ error: 'Invalid link' }, { status: 404 });
        }

        // 2. Project Status Check
        if (link.project.status === 'APPROVED') {
            return NextResponse.json({ error: 'Project is approved ' }, { status: 403 });
        }

        // 3. Input Validation
        if (!pageUrl || !pageUrl.startsWith('/')) {
            return NextResponse.json({ error: 'Invalid pageUrl (must start with /)' }, { status: 400 });
        }
        if (typeof clickX !== 'number' || clickX < 0 || typeof clickY !== 'number' || clickY < 0) {
            return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
        }
        if (!message || !message.trim()) {
            return NextResponse.json({ error: 'Message required' }, { status: 400 });
        }

        // 4. Create Comment
        const comment = await prisma.comment.create({
            data: {
                projectId: link.projectId,
                pageUrl,
                clickX,
                clickY,
                message,
                status: 'OPEN'
            }
        });

        return NextResponse.json(comment);

    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
