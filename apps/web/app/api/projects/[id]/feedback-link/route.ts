export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { nanoid } from 'nanoid';

export async function POST(req: Request, { params }: { params: { id: string } }) {
    try {
        const email = req.headers.get('x-owner-email');
        if (!email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const project = await prisma.project.findUnique({
            where: { id: params.id },
            include: { owner: true }
        });

        if (!project || project.owner.email !== email) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        const token = nanoid(10);

        await prisma.feedbackLink.upsert({
            where: { projectId: project.id },
            create: {
                projectId: project.id,
                token
            },
            update: {
                token,
                isActive: true
            }
        });

        // Use request URL to form the feedback link if possible, or fallback
        // Since we are in app route, we can treat relative URL safely or use origin
        // But for response we return the absolute URL for user convenience if needed, 
        // or just the token.
        // The Express API returned { url: ..., token: ... }
        // We will assume NEXT_PUBLIC_APP_URL is set or deduce from origin
        const origin = new URL(req.url).origin;
        const url = `${origin}/f/${token}`;

        return NextResponse.json({ url, token });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
