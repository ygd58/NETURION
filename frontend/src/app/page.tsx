'use client';

import { useState, useRef, useEffect } from 'react';
import { getBrowserSigner, initAccount, encryptPrompt, decryptResponse } from '../lib/fairblock';

const BACKEND = '/api/infer';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  ts: number;
}

export default function Home() {
  const [wallet, setWallet] = useState('');
  const [signer, setSigner] = useState<any>(null);
  const [ready, setReady] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [nodeOk, setNodeOk] = useState<boolean | null>(null);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/health')
      .then(r => r.json())
      .then(d => setNodeOk(d.status === 'ok'))
      .catch(() => setNodeOk(false));
  }, []);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function connect() {
    try {
      setStatus('Connecting wallet...');
      const s = await getBrowserSigner();
      const addr = await initAccount(s);
      setSigner(s);
      setWallet(addr);
      setReady(true);
      setStatus('');
    } catch (e: any) {
      setStatus(`Error: ${e.message}`);
    }
  }

  async function send() {
    if (!input.trim() || !ready || loading) return;
    const prompt = input;
    setMessages(p => [...p, { role: 'user', content: prompt, ts: Date.now() }]);
    setInput('');
    setLoading(true);
    setStatus('Encrypting via Fairblock...');
    try {
      encryptPrompt(prompt);
      setStatus('Sending to NETURION node...');
      const res = await fetch(BACKEND, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, wallet, session_id: `s_${Date.now()}` }),
      });
      if (!res.ok) throw new Error(`Backend ${res.status}`);
      const data = await res.json();
      const enc = encryptPrompt(data.response);
      const dec = decryptResponse(enc);
      setMessages(p => [...p, { role: 'assistant', content: dec, ts: Date.now() }]);
      setStatus('');
    } catch (e: any) {
      setMessages(p => [...p, { role: 'assistant', content: `Error: ${e.message}`, ts: Date.now() }]);
      setStatus('');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ display:'flex', flexDirection:'column', height:'100vh', background:'#080810', color:'#e0e0e0', fontFamily:'monospace' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 24px', borderBottom:'1px solid #1a1a2e', background:'#0d0d1a' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ fontSize:24, color:'#7c3aed' }}>⬡</span>
          <span style={{ fontSize:18, fontWeight:700, color:'#fff', letterSpacing:2 }}>NETURION</span>
          <span style={{ fontSize:10, background:'#7c3aed22', color:'#a78bfa', border:'1px solid #7c3aed55', borderRadius:4, padding:'2px 8px', letterSpacing:1 }}>CONFIDENTIAL AI</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ width:8, height:8, borderRadius:'50%', background: nodeOk===null?'#555':nodeOk?'#00ff88':'#ff4444', display:'inline-block' }} />
          <span style={{ fontSize:11, color:'#666' }}>{nodeOk===null?'checking...':nodeOk?'Node online':'Node offline'}</span>
          <span style={{ fontSize:11, color:'#444', marginLeft:8 }}>Fairblock · Base Sepolia</span>
        </div>
      </div>

      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'8px 24px', borderBottom:'1px solid #1a1a2e', background:'#0d0d1a', minHeight:40 }}>
        {!wallet ? (
          <button onClick={connect} style={{ background:'#7c3aed', color:'#fff', border:'none', borderRadius:6, padding:'7px 18px', cursor:'pointer', fontFamily:'monospace', fontSize:12 }}>
            Connect Wallet
          </button>
        ) : (
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ width:7, height:7, borderRadius:'50%', background:'#00ff88', display:'inline-block' }} />
            <span style={{ fontSize:12, color:'#a78bfa' }}>{wallet.slice(0,6)}...{wallet.slice(-4)}</span>
            <span style={{ fontSize:11, color:'#555', background:'#ffffff08', padding:'2px 8px', borderRadius:4 }}>🔒 E2E Encrypted</span>
            <span style={{ fontSize:11, color:'#00ff88', background:'#00ff8810', padding:'2px 8px', borderRadius:4, border:'1px solid #00ff8833' }}>Fairblock Ready</span>
          </div>
        )}
        {status && <span style={{ fontSize:11, color:'#a78bfa', marginLeft:'auto' }}>{status}</span>}
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'24px', display:'flex', flexDirection:'column', gap:16 }}>
        {messages.length === 0 && (
          <div style={{ margin:'auto', textAlign:'center' }}>
            <div style={{ fontSize:56, color:'#7c3aed', marginBottom:16 }}>⬡</div>
            <p style={{ color:'#666', fontSize:20, margin:'0 0 8px', letterSpacing:2 }}>NETURION</p>
            <p style={{ color:'#444', fontSize:13, lineHeight:2, margin:'0 0 24px' }}>
              Confidential AI Agent · Powered by Fairblock Network<br/>
              Your prompts are encrypted end-to-end · Self-hosted LLM
            </p>
            <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
              {['🔒 Encrypted Prompts','🤖 Llama 3.1 Local','⛓️ Base Sepolia','⬡ Fairblock IBE'].map(f => (
                <span key={f} style={{ fontSize:11, background:'#ffffff06', color:'#666', padding:'4px 12px', borderRadius:20, border:'1px solid #1e1e2e' }}>{f}</span>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} style={{ display:'flex', justifyContent: m.role==='user'?'flex-end':'flex-start', alignItems:'flex-end', gap:8 }}>
            {m.role==='assistant' && <span style={{ fontSize:18, color:'#7c3aed' }}>⬡</span>}
            <div style={{ maxWidth:'68%', borderRadius:12, padding:'10px 14px', fontSize:13, lineHeight:1.7, ...(m.role==='user' ? { background:'#7c3aed22', border:'1px solid #7c3aed44', borderBottomRightRadius:4 } : { background:'#1a1a2e', border:'1px solid #252540', borderBottomLeftRadius:4 }) }}>
              {m.role==='assistant' && <div style={{ fontSize:10, color:'#7c3aed', marginBottom:6, letterSpacing:1 }}>🔒 FAIRBLOCK ENCRYPTED</div>}
              <p style={{ margin:0, color:'#d0d0d0', whiteSpace:'pre-wrap' }}>{m.content}</p>
              <span style={{ fontSize:10, color:'#444', display:'block', marginTop:4 }}>{new Date(m.ts).toLocaleTimeString()}</span>
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display:'flex', alignItems:'flex-end', gap:8 }}>
            <span style={{ fontSize:18, color:'#7c3aed' }}>⬡</span>
            <div style={{ background:'#1a1a2e', border:'1px solid #252540', borderRadius:12, borderBottomLeftRadius:4, padding:'12px 16px' }}>
              <span style={{ color:'#7c3aed', letterSpacing:4 }}>● ● ●</span>
            </div>
          </div>
        )}
        <div ref={bottom} />
      </div>

      <div style={{ display:'flex', gap:10, padding:'14px 24px', borderTop:'1px solid #1a1a2e', background:'#0d0d1a' }}>
        <input
          style={{ flex:1, background:'#1a1a2e', border:'1px solid #252540', borderRadius:8, padding:'10px 14px', color:'#e0e0e0', fontFamily:'monospace', fontSize:13, outline:'none' }}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key==='Enter' && !e.shiftKey && send()}
          placeholder={ready ? 'Type your confidential prompt...' : 'Connect wallet to start'}
          disabled={!ready || loading}
        />
        <button
          onClick={send}
          disabled={!ready || loading || !input.trim()}
          style={{ background:'#7c3aed', color:'#fff', border:'none', borderRadius:8, padding:'10px 20px', cursor:'pointer', fontSize:16, opacity:(!ready||loading||!input.trim())?0.4:1 }}
        >→</button>
      </div>

      <div style={{ textAlign:'center', fontSize:10, color:'#222', padding:'6px', borderTop:'1px solid #111' }}>
        NETURION · Fairblock Network · Llama 3.1 · Base Sepolia
      </div>
    </main>
  );
}
