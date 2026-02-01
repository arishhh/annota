export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request, { params }: { params: { token: string } }) {
    try {
        const { token } = params;

        const link = await prisma.feedbackLink.findUnique({
            where: { token },
            include: {
                project: true
            }
        });

        if (!link || !link.isActive) {
            return NextResponse.json({ error: 'Invaild or inactive link' }, { status: 404 });
        }

        const project = link.project;

        // Return project info securely (no internal IDs if not needed, definitely NO other tokens)
        // Matching express logic:
        return NextResponse.json({
            project: {
                id: project.id,
                name: project.name,
                baseUrl: project.baseUrl,
                status: project.status,
                approvedAt: project.approvedAt
            }
        });

    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
