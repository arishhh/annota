export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request, { params }: { params: { token: string } }) {
    try {
        const { token } = params;

        const request = await prisma.approvalRequest.findUnique({
            where: { token },
            include: { project: true }
        });

        if (!request) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        const project = request.project;
        const now = new Date();
        const isExpired = request.usedAt || now > request.expiresAt;
        const isProjectApproved = project.status === 'APPROVED';

        // Security: Don't reveal request exists if invalid, UNLESS project is already approved
        // (If project is approved, user might want to see the success screen again)
        if (!isProjectApproved && isExpired) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        // Fetch optional comment token for "Return to Feedback" link
        const feedbackLink = await prisma.feedbackLink.findUnique({
            where: { projectId: project.id }
        });

        return NextResponse.json({
            project: {
                id: project.id,
                name: project.name,
                baseUrl: project.baseUrl,
                status: project.status,
                approvedAt: project.approvedAt
            },
            commentToken: feedbackLink?.token || null
        });

    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
