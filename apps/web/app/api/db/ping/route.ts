export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        await prisma.$queryRaw`SELECT 1`;
        return NextResponse.json({ ok: true, timestamp: new Date().toISOString() });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ ok: false, error: 'Database connection failed' }, { status: 500 });
    }
}
