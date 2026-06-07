import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const res = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` }
    });
    if (res.ok) {
      return NextResponse.json({ status: 'ok', model: 'llama-3.1-8b-instant' });
    }
    return NextResponse.json({ status: 'error' }, { status: 503 });
  } catch {
    return NextResponse.json({ status: 'error' }, { status: 503 });
  }
}
