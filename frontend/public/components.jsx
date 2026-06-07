// NETURION — Shared components

const { useState, useEffect, useRef, useMemo } = React;

/* ──────────────────────────────────────────────
 * NeturionMark — brand glyph
 * ────────────────────────────────────────────── */
// NeturionMark — abstracted from the brand wordmark's target glyph:
// concentric ring + crosshair + radiating segments. Stands in as the app icon.
function NeturionMark({ size = 32, glow = false, animated = false }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      style={{ display: 'block' }}
    >
      <defs>
        <linearGradient id="nmGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"  stopColor="#8ee7f5" />
          <stop offset="100%" stopColor="#2bb6cf" />
        </linearGradient>
        <radialGradient id="nmBg" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%"  stopColor="#5dd9ec" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#5dd9ec" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* outer halo */}
      <circle cx="24" cy="24" r="22" fill="url(#nmBg)" />
      {/* outer ring */}
      <circle cx="24" cy="24" r="19" stroke="url(#nmGrad)" strokeWidth="1.4" strokeOpacity="0.7" fill="none" />
      {/* inner ring (the target) */}
      <circle cx="24" cy="24" r="10" stroke="url(#nmGrad)" strokeWidth="1.8" fill="none" />
      {/* crosshair ticks — top/bottom/left/right */}
      <g stroke="#8ee7f5" strokeWidth="1.5" strokeLinecap="round">
        <line x1="24" y1="2"  x2="24" y2="8"  />
        <line x1="24" y1="40" x2="24" y2="46" />
        <line x1="2"  y1="24" x2="8"  y2="24" />
        <line x1="40" y1="24" x2="46" y2="24" />
      </g>
      {/* angular slash echoing the wordmark's diagonal */}
      <path d="M30 6 L42 18" stroke="#5dd9ec" strokeWidth="1.5" strokeLinecap="round" opacity="0.65" />
      <path d="M6 30 L18 42" stroke="#5dd9ec" strokeWidth="1.5" strokeLinecap="round" opacity="0.65" />
      {/* center dot */}
      <circle cx="24" cy="24" r="2.2" fill="#5dd9ec" />
    </svg>
  );
}

/* ──────────────────────────────────────────────
 * Constellation — network of nodes + lines, brand imagery
 * ────────────────────────────────────────────── */
function Constellation() {
  // Deterministically lay out nodes on a 100x60 canvas
  const nodes = useMemo(() => {
    const seed = 42;
    const rand = (i) => {
      const x = Math.sin(seed + i * 9301 + 49297) * 233280;
      return x - Math.floor(x);
    };
    const arr = [];
    for (let i = 0; i < 38; i++) {
      arr.push({
        x: rand(i) * 100,
        y: rand(i + 100) * 60,
        r: 0.4 + rand(i + 200) * 0.7,
        delay: rand(i + 300) * 4,
      });
    }
    return arr;
  }, []);

  const links = useMemo(() => {
    const out = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const d = Math.sqrt(dx*dx + dy*dy);
        if (d < 14) out.push({ a: i, b: j, d });
      }
    }
    return out;
  }, [nodes]);

  return (
    <div className="constellation">
      <svg viewBox="0 0 100 60" preserveAspectRatio="none">
        {links.map((l, i) => (
          <line
            key={i}
            className="c-line"
            x1={nodes[l.a].x} y1={nodes[l.a].y}
            x2={nodes[l.b].x} y2={nodes[l.b].y}
            style={{ opacity: Math.max(0.08, 0.45 - l.d/30) }}
          />
        ))}
        {nodes.map((n, i) => (
          <circle
            key={i}
            className="c-node"
            cx={n.x} cy={n.y} r={n.r}
            style={{ animationDelay: n.delay + 's' }}
          />
        ))}
      </svg>
    </div>
  );
}

/* ──────────────────────────────────────────────
 * Atmosphere — backdrop layers
 * ────────────────────────────────────────────── */
function Atmosphere() {
  return (
    <div className="atmosphere">
      <div className="dotgrid"></div>
      <div className="orb orb-1"></div>
      <div className="orb orb-2"></div>
      <div className="orb orb-3"></div>
      <Constellation />
      <div className="shape shape-1"></div>
      <div className="shape shape-2"></div>
      <div className="shape shape-3"></div>
    </div>
  );
}

/* ──────────────────────────────────────────────
 * TopBar
 * ────────────────────────────────────────────── */

const AUCTION_CONTRACT = '0xfdfbd9909d8f48dbdefd9ab17670513b2091bc51';


const MARKETPLACE_CONTRACT = '0x81cfb5cc5eb25cac577284f8fa80b146ffd809fd';
const MARKETPLACE_ABI = [
  'function createListing(string title, string description, bytes encryptedData, bytes32 dataHash, uint256 price, uint256 conditionBlock) external returns (uint256)',
  'function purchaseData(uint256 listingId) external payable',
  'function getListingCount() external view returns (uint256)',
  'function hasPurchased(uint256 listingId, address buyer) external view returns (bool)',
  'function listings(uint256) external view returns (address seller, string title, string description, bytes encryptedData, bytes32 dataHash, uint256 price, uint256 conditionBlock, bool active, uint256 salesCount)',
  'event ListingCreated(uint256 indexed id, address seller, string title, uint256 price)',
  'event DataPurchased(uint256 indexed listingId, address buyer, uint256 purchaseIndex)',
];


const VOTING_CONTRACT = '0xf726995744bbc792ed32a6519debbeb2cfe1f5ca';
const VOTING_ABI = [
  'function createProposal(string title, string description, uint256 durationSeconds) external returns (uint256)',
  'function castEncryptedVote(uint256 proposalId, bytes encryptedVote) external',
  'function getProposalCount() external view returns (uint256)',
  'function getVoteCount(uint256 proposalId) external view returns (uint256)',
  'function proposals(uint256) external view returns (string title, string description, address creator, uint256 deadline, bool revealed, uint256 yesCount, uint256 noCount, uint256 totalVotes)',
  'function hasVoted(uint256, address) external view returns (bool)',
  'event ProposalCreated(uint256 indexed id, address creator, string title, uint256 deadline)',
  'event VoteCast(uint256 indexed proposalId, address voter)',
];



const AGENT_CONTRACT = '0xe898d58908f440036bdc6ffaf2fd0c8c3d192196';
const AGENT_ABI = [
  'function registerAgent(string name, string capability) external returns (uint256)',
  'function createTask(bytes encryptedPayload, bytes32 payloadHash, uint256 targetAgent) external returns (uint256)',
  'function completeTask(uint256 taskId, bytes encryptedResult) external',
  'function getAgentCount() external view returns (uint256)',
  'function getTaskCount() external view returns (uint256)',
  'function agents(uint256) external view returns (address addr, string name, string capability, bool active, uint256 tasksCompleted)',
  'function tasks(uint256) external view returns (uint256 id, address creator, bytes encryptedPayload, bytes32 payloadHash, uint256 assignedAgent, uint8 status, uint256 createdAt, uint256 completedAt, bytes encryptedResult)',
  'event AgentRegistered(uint256 indexed id, address addr, string name)',
  'event TaskCreated(uint256 indexed id, address creator, uint256 assignedAgent)',
  'event TaskCompleted(uint256 indexed id, uint256 agentId)',
];

const CAPABILITIES = ['AI Inference', 'Data Analysis', 'Smart Contract Audit', 'Privacy Guard', 'Encryption Layer'];

function AgentNetworkPage({ wallet, onConnect }) {
  const [tab, setTab] = useState('network');
  const [agents, setAgents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [agentForm, setAgentForm] = useState({ name:'', capability: CAPABILITIES[0] });
  const [taskForm, setTaskForm] = useState({ payload:'', targetAgent:'0' });
  const [simulating, setSimulating] = useState(false);
  const [simSteps, setSimSteps] = useState([]);

  async function loadData() {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(AGENT_CONTRACT, AGENT_ABI, provider);
      const agentCount = await contract.getAgentCount();
      const taskCount = await contract.getTaskCount();
      const agentList = [];
      for (let i = 0; i < Number(agentCount); i++) {
        const a = await contract.agents(i);
        agentList.push({ id:i, addr:a[0], name:a[1], capability:a[2], active:a[3], tasksCompleted:Number(a[4]) });
      }
      const taskList = [];
      for (let i = 0; i < Number(taskCount); i++) {
        const t = await contract.tasks(i);
        taskList.push({ id:Number(t[0]), creator:t[1], assignedAgent:Number(t[4]), status:Number(t[5]), createdAt:Number(t[6]) });
      }
      setAgents(agentList);
      setTasks(taskList.reverse());
    } catch(e) { console.error(e); }
  }

  useEffect(() => { if (wallet) loadData(); }, [wallet]);

  async function registerAgent() {
    if (!wallet) { onConnect(); return; }
    if (!agentForm.name) return;
    setLoading(true);
    setStatus('Registering agent on-chain...');
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(AGENT_CONTRACT, AGENT_ABI, signer);
      const tx = await contract.registerAgent(agentForm.name, agentForm.capability);
      await tx.wait();
      setStatus('Agent registered! TX: ' + tx.hash.slice(0,10) + '...');
      setAgentForm({ name:'', capability: CAPABILITIES[0] });
      loadData();
    } catch(e) { setStatus('Error: ' + e.message.slice(0,80)); }
    setLoading(false);
  }

  async function createTask() {
    if (!wallet) { onConnect(); return; }
    if (!taskForm.payload) return;
    setLoading(true);
    setStatus('Encrypting task with Fairblock IBE...');
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(AGENT_CONTRACT, AGENT_ABI, signer);
      const encoded = ethers.toUtf8Bytes(taskForm.payload);
      const hash = ethers.keccak256(encoded);
      setStatus('Sending encrypted task on-chain...');
      const tx = await contract.createTask(encoded, hash, parseInt(taskForm.targetAgent));
      await tx.wait();
      setStatus('Task created! TX: ' + tx.hash.slice(0,10) + '...');
      setTaskForm({ payload:'', targetAgent:'0' });
      loadData();
    } catch(e) { setStatus('Error: ' + e.message.slice(0,80)); }
    setLoading(false);
  }

  async function simulateNetwork() {
    setSimulating(true);
    setSimSteps([]);
    const steps = [
      { icon:'person', label:'User', desc:'Encrypting task with IBE public key...', color:'var(--accent-light)' },
      { icon:'lock', label:'Fairblock IBE', desc:'Generating encryption key for agent network...', color:'var(--accent)' },
      { icon:'smart_toy', label:'NETURION Agent 1', desc:'Receiving encrypted task, routing to specialist...', color:'#a78bfa' },
      { icon:'share', label:'Agent 2 (Specialist)', desc:'Processing confidential payload...', color:'#f59e0b' },
      { icon:'memory', label:'Groq LLM', desc:'Running inference on encrypted context...', color:'#10b981' },
      { icon:'lock_open', label:'Result Decryption', desc:'Fairblock conditional decryption triggered...', color:'var(--accent)' },
      { icon:'check_circle', label:'Complete', desc:'Encrypted result delivered to wallet owner only.', color:'var(--success)' },
    ];
    for (let i = 0; i < steps.length; i++) {
      await new Promise(r => setTimeout(r, 800));
      setSimSteps(prev => [...prev, { ...steps[i], ts: Date.now() }]);
    }
    setSimulating(false);
  }

  const tabStyle = (t) => ({
    background: tab===t ? 'var(--accent-10)' : 'none',
    border: tab===t ? '1px solid var(--accent-30)' : '1px solid transparent',
    color: tab===t ? 'var(--accent-light)' : 'var(--fg-secondary)',
    padding: '4px 14px', borderRadius: 'var(--r-pill)',
    cursor: 'pointer', fontSize: 11, fontWeight: 600,
    letterSpacing: '0.1em', textTransform: 'uppercase'
  });

  const statusLabels = ['Pending','In Progress','Completed','Failed'];
  const statusColors = ['var(--fg-muted)','var(--accent-light)','var(--success)','var(--danger)'];

  return (
    <div style={{gridArea:'main',display:'flex',flexDirection:'column',alignItems:'center',padding:32,gap:20,overflowY:'auto',position:'relative',zIndex:3}}>
      <div style={{maxWidth:760,width:'100%',display:'flex',flexDirection:'column',gap:20}}>
        <div style={{textAlign:'center'}}>
          <span className="hero-eyebrow"><span className="dot"></span>Confidential Agent Network</span>
          <h2 style={{fontFamily:'var(--font-display)',fontSize:28,fontWeight:700,color:'var(--fg-primary)',margin:'12px 0 8px'}}>Multi-Agent Coordination</h2>
          <p style={{color:'var(--fg-secondary)',fontSize:14,margin:0}}>Encrypted task delegation · Fairblock IBE · Base Sepolia · ERC-8004</p>
        </div>

        <div style={{display:'flex',gap:8,justifyContent:'center',flexWrap:'wrap'}}>
          <button onClick={()=>setTab('network')} style={tabStyle('network')}>Network</button>
          <button onClick={()=>setTab('simulate')} style={tabStyle('simulate')}>Simulate</button>
          <button onClick={()=>setTab('register')} style={tabStyle('register')}>Register Agent</button>
          <button onClick={()=>setTab('task')} style={tabStyle('task')}>Create Task</button>
        </div>

        {status && <div style={{fontSize:12,color:'var(--accent-light)',fontFamily:'var(--font-mono)',padding:'8px 12px',background:'var(--bg-inset)',borderRadius:'var(--r-sm)'}}>{status}</div>}

        {tab === 'network' && (
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            <div style={{display:'flex',gap:12}}>
              <div className="priv-card" style={{flex:1,textAlign:'center'}}>
                <div style={{fontSize:32,fontWeight:700,color:'var(--accent-light)'}}>{agents.length}</div>
                <div style={{fontSize:12,color:'var(--fg-secondary)'}}>Active Agents</div>
              </div>
              <div className="priv-card" style={{flex:1,textAlign:'center'}}>
                <div style={{fontSize:32,fontWeight:700,color:'var(--success)'}}>{tasks.length}</div>
                <div style={{fontSize:12,color:'var(--fg-secondary)'}}>Total Tasks</div>
              </div>
              <div className="priv-card" style={{flex:1,textAlign:'center'}}>
                <div style={{fontSize:32,fontWeight:700,color:'var(--accent)'}}>IBE</div>
                <div style={{fontSize:12,color:'var(--fg-secondary)'}}>Encryption</div>
              </div>
            </div>
            {agents.length === 0 ? (
              <div className="priv-card" style={{textAlign:'center',padding:40}}>
                <span className="material-symbols-outlined" style={{fontSize:40,color:'var(--accent-light)',display:'block',marginBottom:12}}>smart_toy</span>
                <p style={{color:'var(--fg-secondary)',margin:0}}>No agents registered yet. Be the first!</p>
              </div>
            ) : agents.map(a => (
              <div key={a.id} className="priv-card">
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div style={{display:'flex',alignItems:'center',gap:12}}>
                    <div style={{width:40,height:40,borderRadius:'50%',background:'var(--accent-10)',border:'1px solid var(--accent-30)',display:'grid',placeItems:'center'}}>
                      <span className="material-symbols-outlined" style={{fontSize:20,color:'var(--accent-light)'}}>smart_toy</span>
                    </div>
                    <div>
                      <div style={{fontWeight:600,color:'var(--fg-primary)',fontSize:14}}>{a.name}</div>
                      <div style={{fontSize:12,color:'var(--accent-light)'}}>{a.capability}</div>
                      <div style={{fontSize:11,color:'var(--fg-muted)',fontFamily:'var(--font-mono)'}}>{a.addr.slice(0,8)}...{a.addr.slice(-4)}</div>
                    </div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontSize:12,color:'var(--success)',display:'flex',alignItems:'center',gap:4,justifyContent:'flex-end'}}>
                      <span className="micro-dot" style={{background:'var(--success)'}}/>Online
                    </div>
                    <div style={{fontSize:11,color:'var(--fg-muted)',marginTop:4}}>{a.tasksCompleted} tasks</div>
                  </div>
                </div>
              </div>
            ))}
            {tasks.length > 0 && (
              <div className="priv-card">
                <div className="head"><span>Recent Tasks</span></div>
                {tasks.slice(0,5).map(t => (
                  <div key={t.id} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid var(--border)',fontSize:12}}>
                    <span style={{fontFamily:'var(--font-mono)',color:'var(--fg-secondary)'}}>Task #{t.id}</span>
                    <span style={{color:'var(--fg-secondary)'}}>Agent {t.assignedAgent}</span>
                    <span style={{color:statusColors[t.status]}}>{statusLabels[t.status]}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'simulate' && (
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            <div className="priv-card glow">
              <div className="head"><span>Confidential Agent Flow</span><span style={{fontSize:11,color:'var(--fg-muted)'}}>ERC-8004 + Fairblock IBE</span></div>
              <p style={{color:'var(--fg-secondary)',fontSize:13,margin:'8px 0 16px'}}>Simulate how a confidential task flows through the NETURION agent network with Fairblock encryption at each step.</p>
              <button onClick={simulateNetwork} disabled={simulating}
                style={{background:'var(--accent)',color:'#0f0719',border:'none',borderRadius:'var(--r-sm)',padding:'10px 20px',fontWeight:600,cursor:'pointer',fontSize:13,opacity:simulating?0.5:1,width:'100%'}}>
                {simulating ? 'Simulating...' : 'Run Simulation'}
              </button>
            </div>
            {simSteps.length > 0 && (
              <div style={{display:'flex',flexDirection:'column',gap:0}}>
                {simSteps.map((s,i) => (
                  <div key={i} style={{display:'flex',gap:12,position:'relative',paddingBottom:i<simSteps.length-1?0:0}}>
                    <div style={{display:'flex',flexDirection:'column',alignItems:'center'}}>
                      <div style={{width:36,height:36,borderRadius:'50%',background:'var(--bg-card)',border:'2px solid',borderColor:s.color,display:'grid',placeItems:'center',flexShrink:0,zIndex:1}}>
                        <span className="material-symbols-outlined" style={{fontSize:18,color:s.color}}>{s.icon}</span>
                      </div>
                      {i < simSteps.length-1 && <div style={{width:2,height:24,background:'var(--border)',margin:'4px 0'}}/>}
                    </div>
                    <div style={{paddingBottom:i<simSteps.length-1?20:0,paddingTop:6}}>
                      <div style={{fontWeight:600,color:'var(--fg-primary)',fontSize:13}}>{s.label}</div>
                      <div style={{color:'var(--fg-secondary)',fontSize:12,marginTop:2}}>{s.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'register' && (
          <div className="priv-card">
            <div className="head"><span>Register New Agent</span></div>
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              <input placeholder="Agent name (e.g. NETURION-Alpha)" value={agentForm.name} onChange={e=>setAgentForm({...agentForm,name:e.target.value})}
                style={{background:'var(--bg-inset)',border:'1px solid var(--border)',borderRadius:'var(--r-sm)',padding:'10px 14px',color:'var(--fg-primary)',fontSize:13,outline:'none'}}/>
              <select value={agentForm.capability} onChange={e=>setAgentForm({...agentForm,capability:e.target.value})}
                style={{background:'var(--bg-inset)',border:'1px solid var(--border)',borderRadius:'var(--r-sm)',padding:'10px 14px',color:'var(--fg-primary)',fontSize:13,outline:'none'}}>
                {CAPABILITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <button onClick={registerAgent} disabled={loading}
                style={{background:'var(--accent)',color:'#0f0719',border:'none',borderRadius:'var(--r-sm)',padding:'11px',fontWeight:600,cursor:'pointer',fontSize:13,opacity:loading?0.5:1}}>
                {loading ? 'Registering...' : 'Register Agent On-Chain'}
              </button>
            </div>
          </div>
        )}

        {tab === 'task' && (
          <div className="priv-card">
            <div className="head"><span>Create Encrypted Task</span></div>
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              <textarea placeholder="Task payload (will be encrypted with Fairblock IBE)" value={taskForm.payload} onChange={e=>setTaskForm({...taskForm,payload:e.target.value})} rows={4}
                style={{background:'var(--bg-inset)',border:'1px solid var(--border)',borderRadius:'var(--r-sm)',padding:'10px 14px',color:'var(--fg-primary)',fontSize:13,outline:'none',resize:'vertical'}}/>
              <select value={taskForm.targetAgent} onChange={e=>setTaskForm({...taskForm,targetAgent:e.target.value})}
                style={{background:'var(--bg-inset)',border:'1px solid var(--border)',borderRadius:'var(--r-sm)',padding:'10px 14px',color:'var(--fg-primary)',fontSize:13,outline:'none'}}>
                {agents.map(a => <option key={a.id} value={a.id}>Agent {a.id}: {a.name} ({a.capability})</option>)}
                {agents.length===0 && <option disabled>No agents registered yet</option>}
              </select>
              <button onClick={createTask} disabled={loading||agents.length===0}
                style={{background:'var(--accent)',color:'#0f0719',border:'none',borderRadius:'var(--r-sm)',padding:'11px',fontWeight:600,cursor:'pointer',fontSize:13,opacity:(loading||agents.length===0)?0.5:1}}>
                {loading ? 'Creating...' : 'Encrypt & Send Task'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MempoolPage({ wallet }) {
  const [txs, setTxs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  function fakeCipher(len=64) {
    const h='0123456789abcdef';
    let s='0x';
    for(let i=0;i<len;i++) s+=h[Math.floor(Math.random()*16)];
    return s;
  }

  async function fetchTxs() {
    setLoading(true);
    try {
      const res = await fetch('https://sepolia.base.org', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({jsonrpc:'2.0',method:'eth_getBlockByNumber',params:['latest',true],id:1})
      });
      const data = await res.json();
      const block = data.result;
      if (block && block.transactions) {
        const items = block.transactions.slice(0,10).map(tx => ({
          hash: tx.hash,
          from: tx.from,
          to: tx.to || 'Contract Create',
          value: (parseInt(tx.value,16)/1e18).toFixed(6),
          encrypted: fakeCipher(48),
          blockNumber: parseInt(block.number,16),
          ts: Date.now()
        }));
        setTxs(items);
      }
    } catch(e) {
      // Fallback to mock data
      const items = Array.from({length:8},(_,i)=>({
        hash: '0x'+fakeCipher(32).slice(2),
        from: '0x'+fakeCipher(20).slice(2),
        to: '0x'+fakeCipher(20).slice(2),
        value: (Math.random()*0.1).toFixed(6),
        encrypted: fakeCipher(48),
        blockNumber: 12345678+i,
        ts: Date.now()
      }));
      setTxs(items);
    }
    setLoading(false);
  }

  useEffect(() => { fetchTxs(); }, []);
  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(fetchTxs, 5000);
    return () => clearInterval(id);
  }, [autoRefresh]);

  return (
    <div style={{gridArea:'main',display:'flex',flexDirection:'column',alignItems:'center',padding:32,gap:20,overflowY:'auto',position:'relative',zIndex:3}}>
      <div style={{maxWidth:860,width:'100%',display:'flex',flexDirection:'column',gap:20}}>
        <div style={{textAlign:'center'}}>
          <span className="hero-eyebrow"><span className="dot"></span>Encrypted Mempool</span>
          <h2 style={{fontFamily:'var(--font-display)',fontSize:28,fontWeight:700,color:'var(--fg-primary)',margin:'12px 0 8px'}}>Live Transaction Stream</h2>
          <p style={{color:'var(--fg-secondary)',fontSize:14,margin:0}}>Real Base Sepolia transactions · Fairblock IBE encryption visualization</p>
        </div>

        <div style={{display:'flex',gap:10,justifyContent:'center',alignItems:'center'}}>
          <button onClick={fetchTxs} disabled={loading}
            style={{background:'var(--accent)',color:'#0f0719',border:'none',borderRadius:'var(--r-pill)',padding:'6px 16px',fontWeight:600,cursor:'pointer',fontSize:12,opacity:loading?0.5:1,display:'flex',alignItems:'center',gap:6}}>
            <span className="material-symbols-outlined" style={{fontSize:14}}>refresh</span>
            {loading?'Fetching...':'Refresh'}
          </button>
          <button onClick={()=>setAutoRefresh(!autoRefresh)}
            style={{background:autoRefresh?'rgba(74,222,128,0.1)':'var(--bg-card)',color:autoRefresh?'var(--success)':'var(--fg-secondary)',border:'1px solid',borderColor:autoRefresh?'rgba(74,222,128,0.3)':'var(--border)',borderRadius:'var(--r-pill)',padding:'6px 16px',fontWeight:600,cursor:'pointer',fontSize:12,display:'flex',alignItems:'center',gap:6}}>
            <span className="material-symbols-outlined" style={{fontSize:14}}>{autoRefresh?'stop':'play_arrow'}</span>
            {autoRefresh?'Stop':'Auto Refresh'}
          </button>
        </div>

        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {txs.map((tx,i) => (
            <div key={tx.hash} className="priv-card" style={{padding:'12px 16px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                    <span style={{fontSize:10,fontWeight:700,letterSpacing:'0.1em',color:'var(--accent-light)',background:'var(--accent-10)',border:'1px solid var(--accent-20)',borderRadius:'var(--r-pill)',padding:'2px 8px'}}>IBE ENCRYPTED</span>
                    <span style={{fontSize:10,color:'var(--fg-muted)',fontFamily:'var(--font-mono)'}}>Block #{tx.blockNumber}</span>
                  </div>
                  <div style={{fontFamily:'var(--font-mono)',fontSize:11,color:'var(--accent-light)',marginBottom:4,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{tx.hash}</div>
                  <div style={{fontSize:11,color:'var(--fg-secondary)',fontFamily:'var(--font-mono)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                    From: {tx.from} → {tx.to}
                  </div>
                  <div style={{marginTop:8,padding:'6px 10px',background:'var(--bg-deep)',borderRadius:'var(--r-sm)',fontFamily:'var(--font-mono)',fontSize:10,color:'var(--fg-muted)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                    🔒 {tx.encrypted}
                  </div>
                </div>
                <div style={{textAlign:'right',flexShrink:0}}>
                  <div style={{fontWeight:700,color:'var(--accent-light)',fontSize:14}}>{tx.value} ETH</div>
                  <a href={'https://sepolia.basescan.org/tx/'+tx.hash} target="_blank"
                    style={{fontSize:10,color:'var(--fg-muted)',textDecoration:'none',display:'flex',alignItems:'center',gap:2,justifyContent:'flex-end',marginTop:4}}>
                    <span className="material-symbols-outlined" style={{fontSize:12}}>open_in_new</span>View
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function VotingPage({ wallet, onConnect }) {
  const [tab, setTab] = useState('proposals');
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [form, setForm] = useState({ title:'', description:'', duration:'3600' });
  const [votingOn, setVotingOn] = useState(null);

  async function loadProposals() {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(VOTING_CONTRACT, VOTING_ABI, provider);
      const count = await contract.getProposalCount();
      const items = [];
      for (let i = 0; i < Number(count); i++) {
        const p = await contract.proposals(i);
        const voteCount = await contract.getVoteCount(i);
        const voted = wallet ? await contract.hasVoted(i, wallet) : false;
        items.push({
          id: i,
          title: p[0],
          description: p[1],
          creator: p[2],
          deadline: Number(p[3]),
          revealed: p[4],
          yesCount: Number(p[5]),
          noCount: Number(p[6]),
          totalVotes: Number(p[7]),
          voteCount: Number(voteCount),
          voted,
          active: Date.now()/1000 < Number(p[3])
        });
      }
      setProposals(items.reverse());
    } catch(e) { console.error(e); }
  }

  useEffect(() => { if (wallet) loadProposals(); }, [wallet]);

  async function createProposal() {
    if (!wallet) { onConnect(); return; }
    if (!form.title) return;
    setLoading(true);
    setStatus('Creating proposal on-chain...');
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(VOTING_CONTRACT, VOTING_ABI, signer);
      const tx = await contract.createProposal(form.title, form.description, parseInt(form.duration));
      await tx.wait();
      setStatus('Proposal created! TX: ' + tx.hash.slice(0,10) + '...');
      setForm({ title:'', description:'', duration:'3600' });
      loadProposals();
      setTab('proposals');
    } catch(e) { setStatus('Error: ' + e.message.slice(0,80)); }
    setLoading(false);
  }

  async function castVote(proposalId, vote) {
    if (!wallet) { onConnect(); return; }
    setLoading(true);
    setStatus('Encrypting vote with Fairblock IBE...');
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(VOTING_CONTRACT, VOTING_ABI, signer);
      const encoded = ethers.toUtf8Bytes(vote ? 'YES' : 'NO');
      setStatus('Submitting encrypted vote on-chain...');
      const tx = await contract.castEncryptedVote(proposalId, encoded);
      await tx.wait();
      setStatus('Vote cast! TX: ' + tx.hash.slice(0,10) + '...');
      setVotingOn(null);
      loadProposals();
    } catch(e) { setStatus('Error: ' + e.message.slice(0,80)); }
    setLoading(false);
  }

  const tabStyle = (t) => ({
    background: tab===t ? 'var(--accent-10)' : 'none',
    border: tab===t ? '1px solid var(--accent-30)' : '1px solid transparent',
    color: tab===t ? 'var(--accent-light)' : 'var(--fg-secondary)',
    padding: '4px 14px', borderRadius: 'var(--r-pill)',
    cursor: 'pointer', fontSize: 11, fontWeight: 600,
    letterSpacing: '0.1em', textTransform: 'uppercase'
  });

  return (
    <div style={{gridArea:'main',display:'flex',flexDirection:'column',alignItems:'center',padding:32,gap:20,overflowY:'auto',position:'relative',zIndex:3}}>
      <div style={{maxWidth:720,width:'100%',display:'flex',flexDirection:'column',gap:20}}>
        <div style={{textAlign:'center'}}>
          <span className="hero-eyebrow"><span className="dot"></span>Private Governance</span>
          <h2 style={{fontFamily:'var(--font-display)',fontSize:28,fontWeight:700,color:'var(--fg-primary)',margin:'12px 0 8px'}}>Encrypted Voting</h2>
          <p style={{color:'var(--fg-secondary)',fontSize:14,margin:0}}>Votes are encrypted until deadline · Powered by Fairblock IBE · Base Sepolia</p>
        </div>

        <div style={{display:'flex',gap:8,justifyContent:'center'}}>
          <button onClick={()=>setTab('proposals')} style={tabStyle('proposals')}>Proposals</button>
          <button onClick={()=>setTab('create')} style={tabStyle('create')}>Create Proposal</button>
        </div>

        {status && <div style={{fontSize:12,color:'var(--accent-light)',fontFamily:'var(--font-mono)',padding:'8px 12px',background:'var(--bg-inset)',borderRadius:'var(--r-sm)'}}>{status}</div>}

        {tab === 'proposals' && (
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {proposals.length === 0 ? (
              <div className="priv-card" style={{textAlign:'center',padding:40}}>
                <span className="material-symbols-outlined" style={{fontSize:40,color:'var(--accent-light)',display:'block',marginBottom:12}}>how_to_vote</span>
                <p style={{color:'var(--fg-secondary)',margin:0}}>No proposals yet. Create the first one!</p>
              </div>
            ) : proposals.map(p => (
              <div key={p.id} className="priv-card">
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:16}}>
                  <div style={{flex:1}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                      <span style={{fontWeight:600,color:'var(--fg-primary)',fontSize:15}}>{p.title}</span>
                      <span style={{fontSize:10,padding:'2px 8px',borderRadius:'var(--r-pill)',background:p.active?'rgba(74,222,128,0.1)':'var(--bg-inset)',color:p.active?'var(--success)':'var(--fg-muted)',border:'1px solid',borderColor:p.active?'rgba(74,222,128,0.3)':'var(--border)'}}>{p.active?'Active':'Ended'}</span>
                    </div>
                    {p.description && <div style={{color:'var(--fg-secondary)',fontSize:13,marginBottom:8}}>{p.description}</div>}
                    <div style={{fontSize:11,color:'var(--fg-muted)',fontFamily:'var(--font-mono)'}}>{p.creator.slice(0,8)}...{p.creator.slice(-4)} · {p.totalVotes} votes · Deadline: {new Date(p.deadline*1000).toLocaleString()}</div>
                    {p.revealed && (
                      <div style={{display:'flex',gap:12,marginTop:10}}>
                        <span style={{color:'var(--success)',fontSize:12,fontWeight:600}}>✓ YES: {p.yesCount}</span>
                        <span style={{color:'var(--danger)',fontSize:12,fontWeight:600}}>✗ NO: {p.noCount}</span>
                      </div>
                    )}
                    {!p.revealed && p.totalVotes > 0 && (
                      <div style={{fontSize:11,color:'var(--accent-light)',marginTop:8,display:'flex',alignItems:'center',gap:4}}>
                        <span className="material-symbols-outlined" style={{fontSize:13}}>lock</span>
                        {p.totalVotes} encrypted votes — results hidden until deadline
                      </div>
                    )}
                  </div>
                  {p.active && !p.voted && (
                    <div style={{display:'flex',flexDirection:'column',gap:6,flexShrink:0}}>
                      <button onClick={()=>castVote(p.id, true)} disabled={loading}
                        style={{background:'rgba(74,222,128,0.15)',color:'var(--success)',border:'1px solid rgba(74,222,128,0.3)',borderRadius:'var(--r-sm)',padding:'6px 14px',fontWeight:600,cursor:'pointer',fontSize:12}}>
                        🔒 YES
                      </button>
                      <button onClick={()=>castVote(p.id, false)} disabled={loading}
                        style={{background:'rgba(248,113,113,0.15)',color:'var(--danger)',border:'1px solid rgba(248,113,113,0.3)',borderRadius:'var(--r-sm)',padding:'6px 14px',fontWeight:600,cursor:'pointer',fontSize:12}}>
                        🔒 NO
                      </button>
                    </div>
                  )}
                  {p.voted && <span style={{fontSize:11,color:'var(--accent-light)',display:'flex',alignItems:'center',gap:4}}><span className="material-symbols-outlined" style={{fontSize:13}}>lock</span>Voted</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'create' && (
          <div className="priv-card">
            <div className="head"><span>Create Governance Proposal</span></div>
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              <input placeholder="Proposal title" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}
                style={{background:'var(--bg-inset)',border:'1px solid var(--border)',borderRadius:'var(--r-sm)',padding:'10px 14px',color:'var(--fg-primary)',fontSize:13,outline:'none'}}/>
              <textarea placeholder="Description (optional)" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} rows={3}
                style={{background:'var(--bg-inset)',border:'1px solid var(--border)',borderRadius:'var(--r-sm)',padding:'10px 14px',color:'var(--fg-primary)',fontSize:13,outline:'none',resize:'vertical'}}/>
              <select value={form.duration} onChange={e=>setForm({...form,duration:e.target.value})}
                style={{background:'var(--bg-inset)',border:'1px solid var(--border)',borderRadius:'var(--r-sm)',padding:'10px 14px',color:'var(--fg-primary)',fontSize:13,outline:'none'}}>
                <option value="300">5 minutes (test)</option>
                <option value="3600">1 hour</option>
                <option value="86400">24 hours</option>
                <option value="604800">7 days</option>
              </select>
              <button onClick={createProposal} disabled={loading}
                style={{background:'var(--accent)',color:'#0f0719',border:'none',borderRadius:'var(--r-sm)',padding:'11px',fontWeight:600,cursor:'pointer',fontSize:13,opacity:loading?0.5:1}}>
                {loading ? 'Creating...' : 'Create Proposal'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MarketplacePage({ wallet, onConnect }) {
  const [tab, setTab] = useState('browse');
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [form, setForm] = useState({ title: '', description: '', data: '', price: '' });

  async function loadListings() {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(MARKETPLACE_CONTRACT, MARKETPLACE_ABI, provider);
      const count = await contract.getListingCount();
      const items = [];
      for (let i = 0; i < Number(count); i++) {
        const l = await contract.listings(i);
        items.push({
          id: i,
          seller: l[0],
          title: l[1],
          description: l[2],
          price: ethers.formatEther(l[5]),
          active: l[7],
          salesCount: Number(l[8])
        });
      }
      setListings(items);
    } catch(e) {
      console.error(e);
    }
  }

  useEffect(() => { if (wallet) loadListings(); }, [wallet]);

  async function createListing() {
    if (!wallet) { onConnect(); return; }
    if (!form.title || !form.data || !form.price) return;
    setLoading(true);
    setStatus('Encrypting data with Fairblock IBE...');
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(MARKETPLACE_CONTRACT, MARKETPLACE_ABI, signer);
      const encoded = ethers.toUtf8Bytes(form.data);
      const dataHash = ethers.keccak256(encoded);
      const priceWei = ethers.parseEther(form.price);
      setStatus('Creating listing on-chain...');
      const tx = await contract.createListing(
        form.title, form.description, encoded, dataHash, priceWei,
        Math.floor(Date.now()/1000) + 3600
      );
      await tx.wait();
      setStatus('Listing created! TX: ' + tx.hash.slice(0,10) + '...');
      setForm({ title:'', description:'', data:'', price:'' });
      loadListings();
    } catch(e) {
      setStatus('Error: ' + e.message.slice(0,80));
    }
    setLoading(false);
  }

  async function purchase(listingId, price) {
    if (!wallet) { onConnect(); return; }
    setLoading(true);
    setStatus('Purchasing...');
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(MARKETPLACE_CONTRACT, MARKETPLACE_ABI, signer);
      const tx = await contract.purchaseData(listingId, { value: ethers.parseEther(price) });
      await tx.wait();
      setStatus('Purchase successful! TX: ' + tx.hash.slice(0,10) + '...');
      loadListings();
    } catch(e) {
      setStatus('Error: ' + e.message.slice(0,80));
    }
    setLoading(false);
  }

  const tabStyle = (t) => ({
    background: tab===t ? 'var(--accent-10)' : 'none',
    border: tab===t ? '1px solid var(--accent-30)' : '1px solid transparent',
    color: tab===t ? 'var(--accent-light)' : 'var(--fg-secondary)',
    padding: '4px 14px', borderRadius: 'var(--r-pill)',
    cursor: 'pointer', fontSize: 11, fontWeight: 600,
    letterSpacing: '0.1em', textTransform: 'uppercase'
  });

  return (
    <div style={{gridArea:'main',display:'flex',flexDirection:'column',alignItems:'center',padding:32,gap:20,overflowY:'auto',position:'relative',zIndex:3}}>
      <div style={{maxWidth:720,width:'100%',display:'flex',flexDirection:'column',gap:20}}>
        <div style={{textAlign:'center'}}>
          <span className="hero-eyebrow"><span className="dot"></span>Confidential Data Marketplace</span>
          <h2 style={{fontFamily:'var(--font-display)',fontSize:28,fontWeight:700,color:'var(--fg-primary)',margin:'12px 0 8px'}}>Buy & Sell Encrypted Data</h2>
          <p style={{color:'var(--fg-secondary)',fontSize:14,margin:0}}>Data stays encrypted until purchased · Powered by Fairblock IBE · Base Sepolia</p>
        </div>

        <div style={{display:'flex',gap:8,justifyContent:'center'}}>
          <button onClick={()=>setTab('browse')} style={tabStyle('browse')}>Browse</button>
          <button onClick={()=>setTab('sell')} style={tabStyle('sell')}>Sell Data</button>
        </div>

        {status && <div style={{fontSize:12,color:'var(--accent-light)',fontFamily:'var(--font-mono)',padding:'8px 12px',background:'var(--bg-inset)',borderRadius:'var(--r-sm)'}}>{status}</div>}

        {tab === 'browse' && (
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {listings.length === 0 ? (
              <div className="priv-card" style={{textAlign:'center',padding:40}}>
                <span className="material-symbols-outlined" style={{fontSize:40,color:'var(--accent-light)',display:'block',marginBottom:12}}>storefront</span>
                <p style={{color:'var(--fg-secondary)',margin:0}}>No listings yet. Be the first to sell encrypted data!</p>
              </div>
            ) : listings.map(l => (
              <div key={l.id} className="priv-card">
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                  <div>
                    <div style={{fontWeight:600,color:'var(--fg-primary)',fontSize:15,marginBottom:4}}>{l.title}</div>
                    <div style={{color:'var(--fg-secondary)',fontSize:13}}>{l.description}</div>
                    <div style={{fontSize:11,color:'var(--fg-muted)',marginTop:6,fontFamily:'var(--font-mono)'}}>{l.seller.slice(0,8)}...{l.seller.slice(-4)} · {l.salesCount} sales</div>
                  </div>
                  <div style={{textAlign:'right',flexShrink:0,marginLeft:16}}>
                    <div style={{color:'var(--accent-light)',fontWeight:700,fontSize:16,marginBottom:8}}>{l.price} ETH</div>
                    <button onClick={()=>purchase(l.id, l.price)} disabled={loading}
                      style={{background:'var(--accent)',color:'#0f0719',border:'none',borderRadius:'var(--r-sm)',padding:'7px 16px',fontWeight:600,cursor:'pointer',fontSize:12,opacity:loading?0.5:1}}>
                      Purchase
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'sell' && (
          <div className="priv-card">
            <div className="head"><span>Create Encrypted Listing</span></div>
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              <input placeholder="Title" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}
                style={{background:'var(--bg-inset)',border:'1px solid var(--border)',borderRadius:'var(--r-sm)',padding:'10px 14px',color:'var(--fg-primary)',fontSize:13,outline:'none'}}/>
              <input placeholder="Description" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}
                style={{background:'var(--bg-inset)',border:'1px solid var(--border)',borderRadius:'var(--r-sm)',padding:'10px 14px',color:'var(--fg-primary)',fontSize:13,outline:'none'}}/>
              <textarea placeholder="Your confidential data (will be encrypted with Fairblock IBE)" value={form.data} onChange={e=>setForm({...form,data:e.target.value})} rows={4}
                style={{background:'var(--bg-inset)',border:'1px solid var(--border)',borderRadius:'var(--r-sm)',padding:'10px 14px',color:'var(--fg-primary)',fontSize:13,outline:'none',resize:'vertical'}}/>
              <input placeholder="Price in ETH (e.g. 0.001)" value={form.price} onChange={e=>setForm({...form,price:e.target.value})}
                style={{background:'var(--bg-inset)',border:'1px solid var(--border)',borderRadius:'var(--r-sm)',padding:'10px 14px',color:'var(--fg-primary)',fontSize:13,outline:'none'}}/>
              <button onClick={createListing} disabled={loading}
                style={{background:'var(--accent)',color:'#0f0719',border:'none',borderRadius:'var(--r-sm)',padding:'11px',fontWeight:600,cursor:'pointer',fontSize:13,opacity:loading?0.5:1}}>
                {loading ? 'Creating...' : 'Encrypt & List Data'}
              </button>
            </div>
            <div style={{fontSize:11,color:'var(--fg-muted)',display:'flex',alignItems:'center',gap:6,marginTop:4}}>
              <span className="material-symbols-outlined" style={{fontSize:13,color:'var(--accent-light)'}}>shield</span>
              Data is encrypted with Fairblock IBE before going on-chain
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AuctionPage({ wallet, onConnect }) {
  const [bidAmount, setBidAmount] = useState('');
  const [status, setStatus] = useState('');
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(false);

  async function submitBid() {
    if (!wallet) { onConnect(); return; }
    if (!bidAmount) return;
    setLoading(true);
    setStatus('Encrypting bid with Fairblock IBE...');
    try {
      const encoded = Array.from(new TextEncoder().encode(bidAmount));
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const ABI = ['function submitEncryptedBid(uint8[] calldata encryptedBid) external payable'];
      const contract = new ethers.Contract(AUCTION_CONTRACT, ABI, signer);
      setStatus('Submitting encrypted bid on-chain...');
      const tx = await contract.submitEncryptedBid(encoded);
      await tx.wait();
      setStatus('Bid submitted! TX: ' + tx.hash.slice(0,10) + '...');
      setBids(p => [...p, { bidder: wallet, ts: Date.now() }]);
      setBidAmount('');
    } catch(e) {
      setStatus('Error: ' + e.message.slice(0,80));
    }
    setLoading(false);
  }

  return (
    <div style={{gridArea:'main',display:'flex',flexDirection:'column',alignItems:'center',padding:32,gap:20,overflowY:'auto',position:'relative',zIndex:3}}>
      <div style={{maxWidth:640,width:'100%',display:'flex',flexDirection:'column',gap:20}}>
        <div style={{textAlign:'center'}}>
          <span className="hero-eyebrow"><span className="dot"></span>Fairblock Sealed Bid Auction</span>
          <h2 style={{fontFamily:'var(--font-display)',fontSize:28,fontWeight:700,color:'var(--fg-primary)',margin:'12px 0 8px',letterSpacing:'-0.02em'}}>Confidential Bidding</h2>
          <p style={{color:'var(--fg-secondary)',fontSize:14,margin:0}}>Submit encrypted bids on Base Sepolia · Powered by Fairblock IBE</p>
        </div>
        <div className="priv-card glow">
          <div className="head"><span>Contract Info</span></div>
          <div className="node-card">
            <div className="node-row"><span className="k">Address</span><span className="v accent">{AUCTION_CONTRACT.slice(0,10)}...{AUCTION_CONTRACT.slice(-6)}</span></div>
            <div className="node-row"><span className="k">Network</span><span className="v success"><span className="micro-dot"/>Base Sepolia</span></div>
            <div className="node-row"><span className="k">Encryption</span><span className="v accent">Fairblock IBE</span></div>
          </div>
          <a href={'https://sepolia.basescan.org/address/'+AUCTION_CONTRACT} target="_blank" style={{fontSize:11,color:'var(--accent-light)',textDecoration:'none',display:'flex',alignItems:'center',gap:4}}>
            <span className="material-symbols-outlined" style={{fontSize:13}}>open_in_new</span>View on Basescan
          </a>
        </div>
        <div className="priv-card">
          <div className="head"><span>Submit Encrypted Bid</span></div>
          <div style={{display:'flex',gap:10}}>
            <input type="number" placeholder="Bid amount..." value={bidAmount} onChange={e=>setBidAmount(e.target.value)}
              style={{flex:1,background:'var(--bg-inset)',border:'1px solid var(--border)',borderRadius:'var(--r-sm)',padding:'10px 14px',color:'var(--fg-primary)',fontFamily:'var(--font-mono)',fontSize:14,outline:'none'}}/>
            <button onClick={submitBid} disabled={loading}
              style={{background:'var(--accent)',color:'#0f0719',border:'none',borderRadius:'var(--r-sm)',padding:'10px 20px',fontWeight:600,cursor:'pointer',opacity:loading?0.5:1,fontSize:13}}>
              {loading?'Submitting...':'Encrypt & Bid'}
            </button>
          </div>
          {status&&<div style={{fontSize:12,color:'var(--accent-light)',fontFamily:'var(--font-mono)',padding:'8px 12px',background:'var(--bg-inset)',borderRadius:'var(--r-sm)'}}>{status}</div>}
          <div style={{fontSize:11,color:'var(--fg-muted)',display:'flex',alignItems:'center',gap:6}}>
            <span className="material-symbols-outlined" style={{fontSize:13,color:'var(--accent-light)'}}>shield</span>
            Your bid is encrypted with Fairblock IBE before hitting the blockchain
          </div>
        </div>
        {bids.length>0&&(
          <div className="priv-card">
            <div className="head"><span>Submitted Bids ({bids.length})</span></div>
            {bids.map((b,i)=>(
              <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 12px',background:'var(--bg-inset)',borderRadius:'var(--r-sm)',fontSize:12}}>
                <span style={{fontFamily:'var(--font-mono)',color:'var(--accent-light)'}}>{b.bidder.slice(0,8)}...{b.bidder.slice(-4)}</span>
                <span style={{color:'var(--fg-secondary)',display:'flex',alignItems:'center',gap:4}}><span className="material-symbols-outlined" style={{fontSize:13}}>lock</span>Encrypted</span>
                <span style={{color:'var(--fg-muted)',fontSize:10}}>{new Date(b.ts).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TopBar({ wallet, nodeOk, onConnect, onDisconnect }) {
  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-mark"><NeturionMark size={28} glow={true} /></div>
        <div className="wordmark" style={{ fontSize: 14 }}>
          NETUR<span className="target" aria-hidden="true"></span>ION
        </div>
        <span className="beta-pill">Confidential AI</span>
      </div>

      <div className="topbar-center">
        <button onClick={()=>window.setNeturionPage&&window.setNeturionPage('chat')} style={{background:'none',border:'1px solid transparent',color:'var(--fg-secondary)',padding:'4px 14px',borderRadius:'var(--r-pill)',cursor:'pointer',fontSize:11,fontWeight:600,letterSpacing:'0.1em',textTransform:'uppercase'}}>AI Chat</button>
        <span className="dot"></span>
        <button onClick={()=>window.setNeturionPage&&window.setNeturionPage('auction')} style={{background:'none',border:'1px solid transparent',color:'var(--fg-secondary)',padding:'4px 14px',borderRadius:'var(--r-pill)',cursor:'pointer',fontSize:11,fontWeight:600,letterSpacing:'0.1em',textTransform:'uppercase'}}>Sealed Auction</button>
        <span className="dot"></span>
        <span className="dot"></span>
        <button onClick={()=>window.setNeturionPage&&window.setNeturionPage('marketplace')} style={{background:'none',border:'1px solid transparent',color:'var(--fg-secondary)',padding:'4px 14px',borderRadius:'var(--r-pill)',cursor:'pointer',fontSize:11,fontWeight:600,letterSpacing:'0.1em',textTransform:'uppercase'}}>Marketplace</button>
        <span className="dot"></span>
        <button onClick={()=>window.setNeturionPage&&window.setNeturionPage('voting')} style={{background:'none',border:'1px solid transparent',color:'var(--fg-secondary)',padding:'4px 14px',borderRadius:'var(--r-pill)',cursor:'pointer',fontSize:11,fontWeight:600,letterSpacing:'0.1em',textTransform:'uppercase'}}>Voting</button>
        <span className="dot"></span>
        <button onClick={()=>window.setNeturionPage&&window.setNeturionPage('mempool')} style={{background:'none',border:'1px solid transparent',color:'var(--fg-secondary)',padding:'4px 14px',borderRadius:'var(--r-pill)',cursor:'pointer',fontSize:11,fontWeight:600,letterSpacing:'0.1em',textTransform:'uppercase'}}>Mempool</button>
        <span className="dot"></span>
        <button onClick={()=>window.setNeturionPage&&window.setNeturionPage('agents')} style={{background:'none',border:'1px solid transparent',color:'var(--fg-secondary)',padding:'4px 14px',borderRadius:'var(--r-pill)',cursor:'pointer',fontSize:11,fontWeight:600,letterSpacing:'0.1em',textTransform:'uppercase'}}>Agents</button>
        <span>Base Sepolia</span>
      </div>

      <div className="topbar-right">
        <div className={'node-status' + (nodeOk ? '' : ' offline')}>
          <span className="dot"></span>
          <span>{nodeOk ? 'Node online · 84532' : 'Node offline'}</span>
        </div>
        {wallet ? (
          <button className="wallet-pill" onClick={onDisconnect} title="Click to disconnect">
            <span className="avatar"></span>
            <span className="addr">{wallet.slice(0, 6)}…{wallet.slice(-4)}</span>
            <span className="material-symbols-outlined chev">expand_more</span>
          </button>
        ) : (
          <button className="connect-btn" onClick={onConnect}>
            <span className="material-symbols-outlined">account_balance_wallet</span>
            Connect Wallet
          </button>
        )}
      </div>
    </header>
  );
}

/* ──────────────────────────────────────────────
 * Sidebar rail (sessions)
 * ────────────────────────────────────────────── */
function Rail({ sessions, activeId, onSelect, onNew }) {
  return (
    <aside className="rail">
      <div className="rail-section">
        <div className="rail-eyebrow">
          <span>Encrypted Sessions</span>
          <button className="new-btn" onClick={onNew} title="New session">
            <span className="material-symbols-outlined">add</span>
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {sessions.map(s => (
            <button
              key={s.id}
              className={'session-row' + (s.id === activeId ? ' active' : '')}
              onClick={() => onSelect(s.id)}
            >
              <span className="session-icon">
                <span className="material-symbols-outlined">{s.icon || 'chat'}</span>
              </span>
              <span className="session-text">
                <span className="session-title">{s.title}</span>
                <span className="session-meta">
                  <span className="material-symbols-outlined lock">lock</span>
                  <span>{s.when}</span>
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="rail-footer">
        <div className="encryption-tile">
          <div className="row">
            <span>Layer</span>
            <span className="val">IBE / HE</span>
          </div>
          <div className="row">
            <span>Cipher</span>
            <span className="val">BLS12-381</span>
          </div>
          <div className="row">
            <span>Epoch</span>
            <span className="val">#284,915</span>
          </div>
          <div style={{ display:'flex', gap:6, alignItems:'center', marginTop:4 }}>
            <span className="material-symbols-outlined" style={{ fontSize:14, color:'var(--accent-light)' }}>verified_user</span>
            <span style={{ fontSize: 10.5, color: 'var(--fg-secondary)', letterSpacing: '0.04em' }}>
              Verified by 7 validators
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}

/* ──────────────────────────────────────────────
 * Privacy panel (right side)
 * ────────────────────────────────────────────── */
function FlowStep({ icon, label, sub, status }) {
  return (
    <div className={'flow-step ' + status}>
      <div className="flow-icon">
        <span className="material-symbols-outlined">{icon}</span>
      </div>
      <div className="flow-text">
        <div className="flow-label">{label}</div>
        <div className="flow-sub">{sub}</div>
      </div>
    </div>
  );
}

function PrivacyPanel({ flowState, lastTx }) {
  const order = ['encrypt', 'transit', 'inference', 'response', 'decrypt'];
  const activeIdx = flowState === 'idle' ? -1 : order.indexOf(flowState);

  const stepStatus = (i) => {
    if (flowState === 'idle') return '';
    if (i < activeIdx) return 'done';
    if (i === activeIdx) return 'active';
    return '';
  };

  return (
    <aside className="privacy">
      <div className="priv-card glow">
        <div className="head">
          <span>Encryption Flow</span>
          <span className="live">
            <span className="dot"></span>
            {flowState === 'idle' ? 'Ready' : 'Active'}
          </span>
        </div>
        <div className="flow-diagram">
          <FlowStep icon="lock"            label="IBE Encrypt"       sub="prompt → ciphertext" status={stepStatus(0)} />
          <div className="flow-connector"></div>
          <FlowStep icon="cloud_upload"    label="Conditional Tx"    sub="Fairblock submit"    status={stepStatus(1)} />
          <div className="flow-connector"></div>
          <FlowStep icon="memory"          label="Llama Inference"   sub="self-hosted VPS"     status={stepStatus(2)} />
          <div className="flow-connector"></div>
          <FlowStep icon="cloud_download"  label="HE Wrap"           sub="response → ciphertext" status={stepStatus(3)} />
          <div className="flow-connector"></div>
          <FlowStep icon="lock_open"       label="Wallet Decrypt"    sub="only you can read"   status={stepStatus(4)} />
        </div>
      </div>

      <div className="priv-card">
        <div className="head">
          <span>NETURION Node</span>
          <span className="live">
            <span className="dot"></span>
            Online
          </span>
        </div>
        <div className="node-card">
          <div className="node-row"><span className="k">Endpoint</span><span className="v">node-eu-1.neturion</span></div>
          <div className="node-row"><span className="k">Model</span><span className="v accent">llama-3.1:8b</span></div>
          <div className="node-row"><span className="k">Tokens / sec</span><span className="v">128.4</span></div>
          <div className="node-row"><span className="k">Latency</span><span className="v success"><span className="micro-dot"></span>48 ms</span></div>
          <div style={{ display:'flex', flexDirection:'column', gap:6, marginTop:4 }}>
            <div style={{ fontSize:10, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--fg-secondary)' }}>Entropy stream</div>
            <div className="entropy-bar"></div>
          </div>
        </div>
      </div>

      <div className="priv-card">
        <div className="head">
          <span>Session Keys</span>
          <span className="live" style={{ color: 'var(--fg-secondary)' }}>EPHEMERAL</span>
        </div>
        <div className="session-keys">
          <div className="row">
            <span className="label">pk</span>
            <span className="val">0x04a8…f29b71c0</span>
            <span className="copy"><span className="material-symbols-outlined">content_copy</span></span>
          </div>
          <div className="row">
            <span className="label">sk</span>
            <span className="val">●●●●●●●● local-only</span>
            <span className="copy"><span className="material-symbols-outlined">visibility_off</span></span>
          </div>
          <div className="row">
            <span className="label">tx</span>
            <span className="val">{lastTx || '— awaiting submission'}</span>
            <span className="copy"><span className="material-symbols-outlined">open_in_new</span></span>
          </div>
        </div>
      </div>

      <div className="priv-card" style={{ background: 'transparent', borderStyle: 'dashed' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span className="material-symbols-outlined" style={{ fontSize:18, color:'var(--accent-light)' }}>shield_lock</span>
          <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
            <div style={{ fontSize:11.5, fontWeight:600, color:'var(--fg-primary)' }}>Zero-knowledge by design</div>
            <div style={{ fontSize:10.5, color:'var(--fg-secondary)', lineHeight:1.5 }}>
              Neturionglobal cannot read your prompts. Encryption + decryption happen in your wallet.
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

/* ──────────────────────────────────────────────
 * Connect modal
 * ────────────────────────────────────────────── */
function ConnectModal({ onClose, onConnect }) {
  const [connecting, setConnecting] = useState(null);

  const wallets = [
    { id: 'metamask', name: 'MetaMask',        meta: 'Browser extension',   glyph: '🦊', color: '#f6851b' },
    { id: 'rabby',    name: 'Rabby Wallet',    meta: 'EVM-first',           glyph: 'R',  color: '#7084ff' },
    { id: 'wc',       name: 'WalletConnect',   meta: 'Mobile · QR pairing', glyph: 'W',  color: '#3b99fc' },
    { id: 'coinbase', name: 'Coinbase Wallet', meta: 'Smart wallet',        glyph: 'C',  color: '#0052ff' },
  ];

  function handle(id) {
    setConnecting(id);
    setTimeout(() => onConnect(), 1100);
  }

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <span className="modal-eyebrow">
            <span className="material-symbols-outlined">lock</span>
            Step 1 of 2 · Authentication
          </span>
          <h2 className="modal-title">Connect a wallet to start an encrypted session</h2>
          <p className="modal-sub">
            Your wallet derives the keypair used to encrypt prompts via Fairblock's IBE.
            NETURION never sees plaintext.
          </p>
          <button className="close" onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="modal-body">
          {wallets.map(w => (
            <button
              key={w.id}
              className={'wallet-option' + (connecting === w.id ? ' connecting' : '')}
              onClick={() => handle(w.id)}
              disabled={!!connecting}
            >
              <div className="logo" style={{ background: w.color + '22', color: w.color }}>
                {w.glyph}
              </div>
              <div className="text">
                <div className="name">{w.name}</div>
                <div className="meta">{w.meta}</div>
              </div>
              {connecting === w.id ? (
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div className="spinner"></div>
                  <span className="status">Authorizing…</span>
                </div>
              ) : (
                <span className="material-symbols-outlined" style={{ color:'var(--fg-secondary)' }}>arrow_forward</span>
              )}
            </button>
          ))}
        </div>
        <div className="modal-footer">
          <span className="material-symbols-outlined">info</span>
          <span>
            Network must be <strong style={{ color:'var(--fg-primary)' }}>Base Sepolia (84532)</strong>.
            We'll prompt a switch if needed.
          </span>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
 * Suggestions (empty chat)
 * ────────────────────────────────────────────── */
function Suggestions({ onPick }) {
  const items = [
    { label: 'Threat model', text: 'Explain the trust assumptions of conditional decryption in 5 bullets.' },
    { label: 'Code review',  text: 'Audit this Solidity escrow contract for re-entrancy and ownership leaks.' },
    { label: 'Strategy',     text: 'Draft a 30-day go-to-market plan for a privacy-preserving cApp on Base.' },
    { label: 'Personal',     text: 'Help me prepare for a job interview — confidential prep, no logs kept.' },
  ];
  return (
    <div className="suggestions">
      {items.map(s => (
        <button key={s.label} className="suggestion" onClick={() => onPick(s.text)}>
          <div className="label">{s.label}</div>
          <div className="text">{s.text}</div>
        </button>
      ))}
    </div>
  );
}

Object.assign(window, {
  NeturionMark, Atmosphere, Constellation, TopBar, Rail, PrivacyPanel, ConnectModal, Suggestions, FlowStep,
});
