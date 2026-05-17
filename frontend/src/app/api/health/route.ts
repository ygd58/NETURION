import { NextResponse } from 'next/server';

const BACKEND = process.env.BACKEND_URL || 'http://65.21.73.117:3001';

export async function GET() {
  try {
    const res = await fetch(`${BACKEND}/health`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ status: 'error' }, { status: 503 });
  }
}
