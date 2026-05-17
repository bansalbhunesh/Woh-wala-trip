import { NextRequest, NextResponse } from 'next/server';
import { getBlockLog } from '@/lib/anti-spam';

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '').trim();
  const adminToken = process.env.ADMIN_API_TOKEN;

  if (!adminToken || !token || token !== adminToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const log = getBlockLog();
  return NextResponse.json({
    count: log.length,
    events: log,
  });
}
