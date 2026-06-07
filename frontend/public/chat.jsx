// NETURION — Chat view with encryption visualization

const { useState, useEffect, useRef } = React;

/* Fake encrypted text generator for showing "ciphertext in transit" */
function ciphertextChunk(len = 40) {
  const chars = '0123456789abcdef';
  let out = '0x';
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

/* Simulated response bank — keyed by intent */
const RESPONSES = {
  threat: `Five trust assumptions baked into Fairblock's conditional decryption:

1. **Validator quorum honesty.** A threshold (here 2f+1 of 3f+1) of the keeper set must remain non-colluding for the IBE master secret to stay safe.
2. **Network liveness.** Conditional keys are only released after on-chain conditions resolve, so a censoring majority can delay (not break) confidentiality.
3. **Wallet integrity.** Your local signing key is the last line of defense — a compromised wallet means a compromised session.
4. **Time-lock determinism.** Conditions tied to block height assume the underlying chain (Base Sepolia, in NETURION's case) produces blocks at the expected cadence.
5. **Code review of the cApp.** The application surface — NETURION's frontend + node — must be audited; cryptography only protects what the app encrypts.

I'd rate the residual risk: low for casual prompts, medium-low for sensitive code, medium for high-value secrets without additional ZK attestation.`,

  audit: `Two issues stand out in the snippet you'd share — I'll lay out the pattern:

\`\`\`solidity
function withdraw() external {
    uint256 amt = balances[msg.sender];
    (bool ok,) = msg.sender.call{value: amt}("");
    require(ok, "transfer failed");
    balances[msg.sender] = 0;
}
\`\`\`

• **Re-entrancy** — state is mutated *after* the external call. A malicious receiver re-enters \`withdraw()\` before \`balances\` is zeroed. Fix: checks-effects-interactions, or \`nonReentrant\`.
• **Ownership leak** — if you have an \`owner = msg.sender\` assignment inside a function callable post-deploy, any actor can claim ownership.

Send me the full contract and I'll annotate inline.`,

  gtm: `30-day GTM for a privacy-preserving cApp on Base — compressed:

**Week 1 — Narrative + proof.** Lock the one-line wedge ("end-to-end encrypted AI, your wallet is the key"). Publish a teardown showing what competing AI assistants *do* see vs. what NETURION sees.

**Week 2 — Builder loop.** Ship a public testnet, open a Discord, post a thread per day on threat model, encryption math, and a 30-second product demo. Reach out to 20 Fairblock + Base ecosystem accounts.

**Week 3 — Distribution.** Partner with one privacy DAO and one DeFi protocol that needs confidential agent calls. Run a sponsored Farcaster frame.

**Week 4 — Conversion.** Launch a paid tier (10 USDC / mo) with a free 100-prompt trial. Track wallets-connected → prompts-sent → second-day retention. Aim for 1,000 wallets, 12% D2.

Want me to draft week 1 in detail?`,

  interview: `Of course. Confidential mode — none of this is logged or readable to anyone but you. Three quick framing questions:

1. **Role + level** — what's the title, and is it IC or management?
2. **Format** — coding screen, system design, behavioral, or a panel?
3. **Stage** — first round, hiring manager, or final loop?

Once I know those I'll generate a custom prep brief: likely questions, signal the interviewer is hunting for, and a STAR-format response template for two stories from your background.`,

  default: `Got it. I'm running inside the NETURION node — Llama 3.1 8B, fully self-hosted, no logging. Your prompt was decrypted only after Fairblock's threshold released the conditional key for this session.

What would you like to dig into? I can help with code review, threat modeling, strategy, or anything you'd normally hesitate to send to a non-confidential AI.`,
};

function routeResponse(text) {
  const t = text.toLowerCase();
  if (/(threat|trust|assumption|conditional)/.test(t)) return RESPONSES.threat;
  if (/(audit|solidity|contract|re-?entran)/.test(t)) return RESPONSES.audit;
  if (/(go-?to-?market|gtm|strategy|launch|30-?day)/.test(t)) return RESPONSES.gtm;
  if (/(interview|prep|job)/.test(t)) return RESPONSES.interview;
  return RESPONSES.default;
}

/* Single message row */
function MessageRow({ msg, density }) {
  const isUser = msg.role === 'user';
  const time = new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={'msg ' + (isUser ? 'user' : 'assistant')}>
      <div className="msg-avatar">
        {isUser ? 'YOU' : <NeturionMark size={18} />}
      </div>
      <div className="msg-body">
        <div className="msg-header">
          <span className="who">{isUser ? 'You' : 'NETURION'}</span>
          <span className="lock-tag">
            <span className="material-symbols-outlined">lock</span>
            {isUser ? 'IBE' : 'HE'}
          </span>
          <span className="ts">{time}</span>
          {!isUser && (
            <span className="msg-actions">
              <button className="icon-btn" title="Copy"><span className="material-symbols-outlined">content_copy</span></button>
              <button className="icon-btn" title="Verify"><span className="material-symbols-outlined">verified</span></button>
            </span>
          )}
        </div>
        <div className="msg-bubble" style={{ padding: density === 'cozy' ? '14px 18px' : '10px 14px' }}>
          {renderContent(msg.content)}
        </div>
      </div>
    </div>
  );
}

/* Naive markdown-ish renderer — bold + inline code + bullets */
function renderContent(text) {
  const lines = text.split('\n');
  return lines.map((line, i) => {
    // code fence handling — simplified: stand-alone language-tagged fence becomes a code block start
    if (line.startsWith('```')) return null; // skip fences
    // bullet
    if (/^[•\-\*]\s/.test(line)) {
      return <div key={i} style={{ display:'flex', gap:8, marginLeft:4 }}>
        <span style={{ color:'var(--accent-light)' }}>•</span>
        <span>{inlineFormat(line.replace(/^[•\-\*]\s/, ''))}</span>
      </div>;
    }
    if (/^\d+\.\s/.test(line)) {
      const m = line.match(/^(\d+)\.\s(.*)/);
      return <div key={i} style={{ display:'flex', gap:8 }}>
        <span style={{ color:'var(--accent-light)', fontFamily:'var(--font-mono)', fontSize:12 }}>{m[1]}.</span>
        <span>{inlineFormat(m[2])}</span>
      </div>;
    }
    if (line.trim() === '') return <div key={i} style={{ height: 8 }} />;
    // code block content (lines that look like solidity)
    if (/^\s{0,4}(function|require|uint|address|contract)/.test(line)) {
      return <pre key={i} style={{
        background:'var(--bg-inset)', border:'1px solid var(--border)',
        borderRadius:6, padding:'8px 12px', margin:'2px 0',
        fontFamily:'var(--font-mono)', fontSize:12.5, color:'var(--fg-primary)',
        overflowX:'auto'
      }}>{line}</pre>;
    }
    return <div key={i}>{inlineFormat(line)}</div>;
  });
}

function inlineFormat(text) {
  // **bold** and `code`
  const parts = [];
  let rest = text;
  let key = 0;
  while (rest.length) {
    const boldM = rest.match(/^\*\*(.+?)\*\*/);
    const codeM = rest.match(/^`(.+?)`/);
    if (boldM) {
      parts.push(<strong key={key++} style={{ color: 'var(--fg-primary)', fontWeight: 600 }}>{boldM[1]}</strong>);
      rest = rest.slice(boldM[0].length);
    } else if (codeM) {
      parts.push(<code key={key++}>{codeM[1]}</code>);
      rest = rest.slice(codeM[0].length);
    } else {
      // take chars until next special
      const idx = rest.search(/(\*\*|`)/);
      if (idx === -1) { parts.push(<span key={key++}>{rest}</span>); rest = ''; }
      else { parts.push(<span key={key++}>{rest.slice(0, idx)}</span>); rest = rest.slice(idx); }
    }
  }
  return parts;
}

/* Transit / ciphertext indicator */
function TransitIndicator({ direction }) {
  const [chunk, setChunk] = useState(ciphertextChunk(28));
  useEffect(() => {
    const id = setInterval(() => setChunk(ciphertextChunk(28)), 120);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="transit">
      <span className="material-symbols-outlined" style={{ fontSize: 13 }}>
        {direction === 'up' ? 'arrow_upward' : 'arrow_downward'}
      </span>
      <span>{direction === 'up' ? 'Encrypting' : 'Decrypting'}</span>
      <span style={{ opacity: 0.7 }}>{chunk}</span>
      <span className="stream"></span>
    </div>
  );
}

/* Composer */
function Composer({ value, onChange, onSend, disabled, ready }) {
  const ref = useRef(null);

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  }

  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto';
      ref.current.style.height = Math.min(180, ref.current.scrollHeight) + 'px';
    }
  }, [value]);

  return (
    <div className="composer-wrap">
      <div className="composer">
        <textarea
          ref={ref}
          className="composer-input"
          rows={1}
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={handleKey}
          placeholder={ready ? 'Type a confidential prompt — it will be encrypted before leaving your device…' : 'Connect a wallet to start an encrypted session'}
          disabled={!ready || disabled}
        />
        <div className="composer-bar">
          <div className="tools">
            <button className="icon-btn" title="Attach (encrypted)"><span className="material-symbols-outlined">attach_file</span></button>
            <button className="icon-btn" title="Voice"><span className="material-symbols-outlined">mic</span></button>
            <button className="icon-btn" title="Prompt library"><span className="material-symbols-outlined">bookmarks</span></button>
          </div>
          <div className="pill">
            <span className="material-symbols-outlined">lock</span>
            E2E · IBE + HE
          </div>
          <div className="pill" style={{ marginLeft: 4 }}>
            <span className="material-symbols-outlined">memory</span>
            Llama 3.1
          </div>
          <span className="spacer"></span>
          <button
            className="send-btn"
            onClick={onSend}
            disabled={!ready || disabled || !value.trim()}
            title="Send (Enter)"
          >
            <span className="material-symbols-outlined">arrow_upward</span>
          </button>
        </div>
      </div>
      <div className="composer-footer">
        <span>
          <span className="material-symbols-outlined" style={{ fontSize:12, verticalAlign:'-2px', color:'var(--accent-light)' }}>shield</span>
          {' '}NETURION never sees plaintext. Decryption happens locally with your wallet's session key.
        </span>
        <span>
          <kbd>Enter</kbd> to send · <kbd>Shift</kbd>+<kbd>Enter</kbd> for newline
        </span>
      </div>
    </div>
  );
}

window.MessageRow = MessageRow;
window.TransitIndicator = TransitIndicator;
window.Composer = Composer;
window.routeResponse = routeResponse;
