export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
    try {
        const email = req.headers.get('x-owner-email');
        if (!email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { email },
            include: {
                projects: {
                    orderBy: { updatedAt: 'desc' },
                    include: {
                        comments: true,
                        feedbackLink: true
                    }
                }
            }
        });

        if (!user) {
            return NextResponse.json({ projects: [] });
        }

        return NextResponse.json({ projects: user.projects });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const email = req.headers.get('x-owner-email');
        if (!email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        let { name, baseUrl } = body;

        if (!name || !baseUrl) {
            return NextResponse.json({ error: 'Name and URL are required' }, { status: 400 });
        }

        if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
            return NextResponse.json({ error: 'URL must start with http:// or https://' }, { status: 400 });
        }

        // Normalize trailing slash
        baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

        // Find or create user (Simple Auth Flow)
        let user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            user = await prisma.user.create({ data: { email } });
        }

        const project = await prisma.project.create({
            data: {
                name,
                baseUrl,
                ownerId: user.id
            }
        });

        return NextResponse.json({ project });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
