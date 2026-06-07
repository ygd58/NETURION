// NETURION — Main app entrypoint

const { useState, useEffect, useRef, useMemo } = React;

const SEED_SESSIONS = [
  { id: 's1', title: 'Threat-model review',   icon: 'shield',    when: 'Today · 14:02' },
  { id: 's2', title: 'Solidity audit · escrow', icon: 'code',    when: 'Yesterday' },
  { id: 's3', title: 'Q4 launch plan',         icon: 'rocket_launch', when: '2 days ago' },
  { id: 's4', title: 'Personal · interview prep', icon: 'person', when: '4 days ago' },
  { id: 's5', title: 'Whitepaper feedback',    icon: 'description', when: '1 week ago' },
];

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#5dd9ec",
  "palette": "cyan",
  "density": "comfortable",
  "showRail": true,
  "showPrivacy": true,
  "showAtmosphere": true,
  "scanline": true,
  "responseSpeed": 16,
  "mockConnected": false
}/*EDITMODE-END*/;

const PALETTES = {
  cyan:   { accent: '#5dd9ec', deep: '#2bb6cf', light: '#8ee7f5', name: 'Cyan (brand)' },
  violet: { accent: '#8b5cf6', deep: '#7c3aed', light: '#a78bfa', name: 'Violet' },
  azure:  { accent: '#4a9eff', deep: '#2563eb', light: '#7cb8ff', name: 'Azure' },
  lime:   { accent: '#dce87a', deep: '#c8d96a', light: '#e9f29c', name: 'Lime' },
  magenta:{ accent: '#ec4899', deep: '#db2777', light: '#f9a8d4', name: 'Magenta' },
};

function applyPalette(p) {
  const root = document.documentElement;
  const pal = PALETTES[p] || PALETTES.violet;
  root.style.setProperty('--accent', pal.accent);
  root.style.setProperty('--accent-deep', pal.deep);
  root.style.setProperty('--accent-light', pal.light);
  // alpha variants — recompute from hex
  const h = pal.accent.replace('#','');
  const r = parseInt(h.slice(0,2),16), g = parseInt(h.slice(2,4),16), b = parseInt(h.slice(4,6),16);
  root.style.setProperty('--accent-10',   `rgba(${r},${g},${b},0.10)`);
  root.style.setProperty('--accent-20',   `rgba(${r},${g},${b},0.20)`);
  root.style.setProperty('--accent-30',   `rgba(${r},${g},${b},0.30)`);
  root.style.setProperty('--accent-50',   `rgba(${r},${g},${b},0.50)`);
  root.style.setProperty('--accent-glow', `rgba(${r},${g},${b},0.18)`);
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // Wallet state
  const [wallet, setWallet] = useState(t.mockConnected ? '0x4a8f29B7c1d8E0a2B3F6c0a1b2c3D4e5f6789abc' : '');
  const [page, setPage] = useState('chat');
  window.setNeturionPage = setPage;
  const [showConnect, setShowConnect] = useState(false);
  const ready = !!wallet;

  // Sessions
  const [sessions, setSessions] = useState(SEED_SESSIONS);
  const [activeId, setActiveId] = useState('s1');

  // Messages per session — start session s1 with a seeded conversation, others empty
  const [messagesBySession, setMessagesBySession] = useState({
    s1: [
      { role: 'user',      content: 'Explain the trust assumptions of conditional decryption in 5 bullets.', ts: Date.now() - 1000 * 60 * 4 },
      { role: 'assistant', content: RESPONSES_CACHE.threat, ts: Date.now() - 1000 * 60 * 3 + 30000 },
    ],
    s2: [],
    s3: [],
    s4: [],
    s5: [],
  });

  const messages = messagesBySession[activeId] || [];

  // Composer
  const [input, setInput] = useState('');
  const [flowState, setFlowState] = useState('idle');
  const [transitDir, setTransitDir] = useState(null); // 'up' | 'down' | null
  const [pendingChunks, setPendingChunks] = useState(null); // streaming
  const [lastTx, setLastTx] = useState('');

  const scrollRef = useRef(null);
  useEffect(() => {
    // Apply palette on mount + when changed
    applyPalette(t.palette);
  }, [t.palette]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, transitDir, pendingChunks]);

  function handleConnect()    { setShowConnect(true); }
  function handleDisconnect() { setWallet(''); setTweak('mockConnected', false); }
  function completeConnect() {
    const fake = '0x4a8f' + Math.floor(Math.random() * 0xFFFFFF).toString(16).padStart(6, '0').toUpperCase()
      + 'B7c1d8E0a2B3F6c0a1b2c3D4e5f6789abc'.slice(0, 26);
    setWallet(fake);
    setTweak('mockConnected', true);
    setShowConnect(false);
  }

  function pickSuggestion(text) { setInput(text); }

  function setMessages(updater) {
    setMessagesBySession(prev => {
      const cur = prev[activeId] || [];
      const next = typeof updater === 'function' ? updater(cur) : updater;
      return { ...prev, [activeId]: next };
    });
  }

  async function send() {
    if (!input.trim() || !ready) return;
    const prompt = input.trim();
    const userMsg = { role: 'user', content: prompt, ts: Date.now() };
    setMessages(p => [...p, userMsg]);
    setInput('');

    // Choreographed encryption flow
    setFlowState('encrypt');
    setTransitDir('up');
    await sleep(700);

    setFlowState('transit');
    setLastTx('0x' + Math.random().toString(16).slice(2, 10) + '…' + Math.random().toString(16).slice(2, 8));
    await sleep(700);

    setFlowState('inference');
    setTransitDir(null);
    await sleep(900);

    setFlowState('response');
    setTransitDir('down');
    await sleep(500);

    setFlowState('decrypt');
    await sleep(300);

    // Real Groq API call
    let full = '';
    try {
      const apiRes = await fetch('/api/infer', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({prompt, wallet: wallet || '0x000', session_id: 's_' + Date.now()})
      });
      const data = await apiRes.json();
      full = data.response || 'Error connecting to server';
    } catch(e) {
      full = 'Error: ' + e.message;
    }
    setPendingChunks(full);
    // commit the message
    setMessages(p => [...p, { role: 'assistant', content: full, ts: Date.now() }]);
    setPendingChunks(null);
    setTransitDir(null);
    setFlowState('idle');
  }

  // Title of the active session
  const activeSession = sessions.find(s => s.id === activeId) || sessions[0];

  // App grid class toggles
  const appClass = [
    'app',
    t.showRail    ? '' : 'no-rail',
    t.showPrivacy ? '' : 'no-privacy',
  ].filter(Boolean).join(' ');

  return (
    <div className={appClass}>
      {t.showAtmosphere && <Atmosphere />}
      <div className="top-accent-bar"></div>

      <TopBar
        wallet={wallet}
        nodeOk={true}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
      />

      {t.showRail && (
        <Rail
          sessions={sessions}
          activeId={activeId}
          onSelect={setActiveId}
          onNew={() => {
            const id = 's' + (sessions.length + 1) + Date.now().toString(36).slice(-4);
            setSessions([{ id, title: 'New session', icon: 'auto_awesome', when: 'just now' }, ...sessions]);
            setActiveId(id);
            setMessagesBySession(prev => ({ ...prev, [id]: [] }));
          }}
        />
      )}

      <main className="main" style={{display:(page==='auction'||page==='marketplace'||page==='voting'||page==='mempool'||page==='agents')?'none':undefined}}>
        {messages.length === 0 ? (
          <div className="hero">
            <div className="hero-mark-wrap">
              <div className="ring ring-1"></div>
              <div className="ring ring-2"></div>
              <NeturionMark size={96} glow={true} />
            </div>

            <span className="hero-eyebrow">
              <span className="dot"></span>
              Confidential AI · Fairblock Network
            </span>

            <div className="hero-wordmark wordmark" aria-label="NETURION">
              NETUR<span className="target" aria-hidden="true"></span>ION
            </div>

            <h1 className="hero-title">
              Talk to AI like nobody's <span className="accent">listening</span>.
            </h1>

            <p className="hero-sub">
              NETURION runs Llama 3.1 inside a Fairblock-protected node. Your prompts are encrypted with
              your wallet's key before they leave your device — and only you can read what comes back.
            </p>

            <div className="hero-cta-row">
              {!ready ? (
                <button className="btn-primary" onClick={handleConnect}>
                  <span className="material-symbols-outlined">account_balance_wallet</span>
                  Connect wallet to start
                </button>
              ) : (
                <button className="btn-primary" onClick={() => document.querySelector('.composer-input')?.focus()}>
                  <span className="material-symbols-outlined">edit_square</span>
                  Start an encrypted prompt
                </button>
              )}
              <button className="btn-secondary">
                <span className="material-symbols-outlined">menu_book</span>
                How it works
              </button>
            </div>

            <div className="proof-strip" style={{ marginBottom: 24 }}>
              <div className="item"><span className="material-symbols-outlined">lock</span>End-to-end encrypted</div>
              <div className="divider"></div>
              <div className="item"><span className="material-symbols-outlined">memory</span>Self-hosted Llama 3.1</div>
              <div className="divider"></div>
              <div className="item"><span className="material-symbols-outlined">hexagon</span>Fairblock IBE / HE</div>
              <div className="divider"></div>
              <div className="item"><span className="material-symbols-outlined">link</span>Base Sepolia · 84532</div>
            </div>

            {ready && <Suggestions onPick={pickSuggestion} />}
          </div>
        ) : (
          <div className="chat-view">
            <div className="chat-header">
              <div className="chat-title">
                <div className="icon-box">
                  <span className="material-symbols-outlined">{activeSession.icon}</span>
                </div>
                <div className="text">
                  <div className="name">{activeSession.title}</div>
                  <div className="meta">
                    <span style={{ display:'inline-flex', alignItems:'center', gap:4 }}>
                      <span className="material-symbols-outlined" style={{ fontSize:11, color:'var(--accent-light)' }}>lock</span>
                      IBE encrypted
                    </span>
                    <span className="dot"></span>
                    <span>{messages.length} messages</span>
                    <span className="dot"></span>
                    <span style={{ fontFamily:'var(--font-mono)' }}>session · {activeSession.id}</span>
                  </div>
                </div>
              </div>
              <div className="chat-actions">
                <button className="icon-btn" title="Pin"><span className="material-symbols-outlined">push_pin</span></button>
                <button className="icon-btn" title="Verify on-chain"><span className="material-symbols-outlined">verified</span></button>
                <button className="icon-btn" title="Burn session"><span className="material-symbols-outlined">delete_forever</span></button>
                <button className="icon-btn" title="More"><span className="material-symbols-outlined">more_horiz</span></button>
              </div>
            </div>

            <div className="chat-scroll" ref={scrollRef}>
              {t.scanline && <div className="scanline"></div>}
              {messages.map((m, i) => (
                <MessageRow key={i} msg={m} density={t.density} />
              ))}

              {transitDir && <TransitIndicator direction={transitDir} />}

              {pendingChunks !== null && (
                <div className="msg assistant">
                  <div className="msg-avatar"><NeturionMark size={18} /></div>
                  <div className="msg-body">
                    <div className="msg-header">
                      <span className="who">NETURION</span>
                      <span className="lock-tag">
                        <span className="material-symbols-outlined">lock_open</span>
                        Decrypted
                      </span>
                      <span className="ts">streaming</span>
                    </div>
                    <div className="msg-bubble">
                      {renderContent(pendingChunks)}
                      <span className="cursor" style={{
                        display:'inline-block', width:8, height:14,
                        background:'var(--accent-light)', verticalAlign:'-2px',
                        marginLeft:2, animation:'blink 1s steps(2) infinite'
                      }}></span>
                    </div>
                  </div>
                </div>
              )}

              {flowState === 'inference' && pendingChunks === null && (
                <div className="msg assistant">
                  <div className="msg-avatar"><NeturionMark size={18} /></div>
                  <div className="msg-body">
                    <div className="msg-header">
                      <span className="who">NETURION</span>
                      <span className="lock-tag"><span className="material-symbols-outlined">memory</span>Inferring</span>
                    </div>
                    <div className="typing-bubble"><span></span><span></span><span></span></div>
                  </div>
                </div>
              )}
            </div>

            <Composer
              value={input}
              onChange={setInput}
              onSend={send}
              disabled={flowState !== 'idle'}
              ready={ready}
            />
          </div>
        )}

        {messages.length === 0 && (
          <Composer
            value={input}
            onChange={setInput}
            onSend={send}
            disabled={flowState !== 'idle'}
            ready={ready}
          />
        )}
      </main>

      {t.showPrivacy && page==='chat' && <PrivacyPanel flowState={flowState} lastTx={lastTx} />}
      {page==='auction' && <AuctionPage wallet={wallet} onConnect={handleConnect} />}
      {page==='marketplace' && <MarketplacePage wallet={wallet} onConnect={handleConnect} />}
      {page==='voting' && <VotingPage wallet={wallet} onConnect={handleConnect} />}
      {page==='mempool' && <MempoolPage wallet={wallet} />}
      {page==='agents' && <AgentNetworkPage wallet={wallet} onConnect={handleConnect} />}

      {showConnect && (
        <ConnectModal
          onClose={() => setShowConnect(false)}
          onConnect={completeConnect}
        />
      )}

      {/* Tweaks panel */}
      <TweaksPanel title="Tweaks">
        <TweakSection title="Color">
          <TweakColor
            label="Palette"
            valueKey="palette"
            value={t.palette}
            onChange={setTweak}
            options={[
              ['#5dd9ec', '#8ee7f5', '#2bb6cf'],
              ['#8b5cf6', '#a78bfa', '#7c3aed'],
              ['#4a9eff', '#7cb8ff', '#2563eb'],
              ['#dce87a', '#e9f29c', '#c8d96a'],
              ['#ec4899', '#f9a8d4', '#db2777'],
            ]}
            optionLabels={['Cyan', 'Violet', 'Azure', 'Lime', 'Magenta']}
            onPick={(palette, idx) => {
              const keys = ['cyan','violet','azure','lime','magenta'];
              setTweak('palette', keys[idx]);
            }}
          />
        </TweakSection>

        <TweakSection title="Layout">
          <TweakToggle label="Show session rail"     valueKey="showRail"       value={t.showRail}       onChange={setTweak} />
          <TweakToggle label="Show privacy panel"    valueKey="showPrivacy"    value={t.showPrivacy}    onChange={setTweak} />
          <TweakToggle label="Atmosphere (orbs + grid)" valueKey="showAtmosphere" value={t.showAtmosphere} onChange={setTweak} />
          <TweakToggle label="Scanline overlay"      valueKey="scanline"       value={t.scanline}       onChange={setTweak} />
          <TweakRadio
            label="Message density"
            valueKey="density"
            value={t.density}
            onChange={setTweak}
            options={['compact', 'comfortable', 'cozy']}
          />
        </TweakSection>

        <TweakSection title="Behavior">
          <TweakSlider
            label="Response stream speed (ms/token)"
            valueKey="responseSpeed"
            value={t.responseSpeed}
            min={4}
            max={80}
            step={2}
            onChange={setTweak}
          />
          <TweakToggle label="Mock wallet connected" valueKey="mockConnected" value={t.mockConnected} onChange={(k,v) => {
            setTweak(k, v);
            if (v && !wallet) completeConnect();
            if (!v && wallet) setWallet('');
          }} />
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

// helper
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Stash responses so chat.jsx's RESPONSES can be referenced before its module loads
window.RESPONSES_CACHE = {
  threat: `Five trust assumptions baked into Fairblock's conditional decryption:

1. **Validator quorum honesty.** A threshold (here 2f+1 of 3f+1) of the keeper set must remain non-colluding for the IBE master secret to stay safe.
2. **Network liveness.** Conditional keys are only released after on-chain conditions resolve, so a censoring majority can delay (not break) confidentiality.
3. **Wallet integrity.** Your local signing key is the last line of defense — a compromised wallet means a compromised session.
4. **Time-lock determinism.** Conditions tied to block height assume the underlying chain (Base Sepolia, in NETURION's case) produces blocks at the expected cadence.
5. **Code review of the cApp.** The application surface — NETURION's frontend + node — must be audited; cryptography only protects what the app encrypts.

I'd rate the residual risk: low for casual prompts, medium-low for sensitive code, medium for high-value secrets without additional ZK attestation.`
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
