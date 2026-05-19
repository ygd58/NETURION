import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { prompt, wallet, session_id } = await req.json();

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: `You are NETURION — a confidential AI agent on Fairblock Network. All prompts are end-to-end encrypted. User wallet: ${wallet}` },
        { role: 'user', content: prompt }
      ],
      max_tokens: 1024,
    }),
  });

  const data = await res.json();
  const response = data.choices?.[0]?.message?.content || '';
  return NextResponse.json({ response, model: 'llama-3.1-8b-instant', session_id });
}
