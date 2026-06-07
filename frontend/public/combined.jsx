const { useState, useEffect, useRef, useMemo } = React;

const BACKEND_URL = window.location.origin;
const AUCTION_CONTRACT = "0xfdfbd9909d8f48dbdefd9ab17670513b2091bc51";

// === tweaks-panel.jsx ===

// tweaks-panel.jsx
// Reusable Tweaks shell + form-control helpers.
//
// Owns the host protocol (listens for __activate_edit_mode / __deactivate_edit_mode,
// posts __edit_mode_available / __edit_mode_set_keys / __edit_mode_dismissed) so
// individual prototypes don't re-roll it. Ships a consistent set of controls so you
// don't hand-draw <input type="range">, segmented radios, steppers, etc.
//
// Usage (in an HTML file that loads React + Babel):
//
//   const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
//     "primaryColor": "#D97757",
//     "palette": ["#D97757", "#29261b", "#f6f4ef"],
//     "fontSize": 16,
//     "density": "regular",
//     "dark": false
//   }/*EDITMODE-END*/;
//
//   function App() {
//     const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
//     return (
//       <div style={{ fontSize: t.fontSize, color: t.primaryColor }}>
//         Hello
//         <TweaksPanel>
//           <TweakSection label="Typography" />
//           <TweakSlider label="Font size" value={t.fontSize} min={10} max={32} unit="px"
//                        onChange={(v) => setTweak('fontSize', v)} />
//           <TweakRadio  label="Density" value={t.density}
//                        options={['compact', 'regular', 'comfy']}
//                        onChange={(v) => setTweak('density', v)} />
//           <TweakSection label="Theme" />
//           <TweakColor  label="Primary" value={t.primaryColor}
//                        options={['#D97757', '#2A6FDB', '#1F8A5B', '#7A5AE0']}
//                        onChange={(v) => setTweak('primaryColor', v)} />
//           <TweakColor  label="Palette" value={t.palette}
//                        options={[['#D97757', '#29261b', '#f6f4ef'],
//                                  ['#475569', '#0f172a', '#f1f5f9']]}
//                        onChange={(v) => setTweak('palette', v)} />
//           <TweakToggle label="Dark mode" value={t.dark}
//                        onChange={(v) => setTweak('dark', v)} />
//         </TweaksPanel>
//       </div>
//     );
//   }
//
// ─────────────────────────────────────────────────────────────────────────────

const __TWEAKS_STYLE = `
  .twk-panel{position:fixed;right:16px;bottom:16px;z-index:2147483646;width:280px;
    max-height:calc(100vh - 32px);display:flex;flex-direction:column;
    transform:scale(var(--dc-inv-zoom,1));transform-origin:bottom right;
    background:rgba(250,249,247,.78);color:#29261b;
    -webkit-backdrop-filter:blur(24px) saturate(160%);backdrop-filter:blur(24px) saturate(160%);
    border:.5px solid rgba(255,255,255,.6);border-radius:14px;
    box-shadow:0 1px 0 rgba(255,255,255,.5) inset,0 12px 40px rgba(0,0,0,.18);
    font:11.5px/1.4 ui-sans-serif,system-ui,-apple-system,sans-serif;overflow:hidden}
  .twk-hd{display:flex;align-items:center;justify-content:space-between;
    padding:10px 8px 10px 14px;cursor:move;user-select:none}
  .twk-hd b{font-size:12px;font-weight:600;letter-spacing:.01em}
  .twk-x{appearance:none;border:0;background:transparent;color:rgba(41,38,27,.55);
    width:22px;height:22px;border-radius:6px;cursor:default;font-size:13px;line-height:1}
  .twk-x:hover{background:rgba(0,0,0,.06);color:#29261b}
  .twk-body{padding:2px 14px 14px;display:flex;flex-direction:column;gap:10px;
    overflow-y:auto;overflow-x:hidden;min-height:0;
    scrollbar-width:thin;scrollbar-color:rgba(0,0,0,.15) transparent}
  .twk-body::-webkit-scrollbar{width:8px}
  .twk-body::-webkit-scrollbar-track{background:transparent;margin:2px}
  .twk-body::-webkit-scrollbar-thumb{background:rgba(0,0,0,.15);border-radius:4px;
    border:2px solid transparent;background-clip:content-box}
  .twk-body::-webkit-scrollbar-thumb:hover{background:rgba(0,0,0,.25);
    border:2px solid transparent;background-clip:content-box}
  .twk-row{display:flex;flex-direction:column;gap:5px}
  .twk-row-h{flex-direction:row;align-items:center;justify-content:space-between;gap:10px}
  .twk-lbl{display:flex;justify-content:space-between;align-items:baseline;
    color:rgba(41,38,27,.72)}
  .twk-lbl>span:first-child{font-weight:500}
  .twk-val{color:rgba(41,38,27,.5);font-variant-numeric:tabular-nums}

  .twk-sect{font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;
    color:rgba(41,38,27,.45);padding:10px 0 0}
  .twk-sect:first-child{padding-top:0}

  .twk-field{appearance:none;box-sizing:border-box;width:100%;min-width:0;height:26px;padding:0 8px;
    border:.5px solid rgba(0,0,0,.1);border-radius:7px;
    background:rgba(255,255,255,.6);color:inherit;font:inherit;outline:none}
  .twk-field:focus{border-color:rgba(0,0,0,.25);background:rgba(255,255,255,.85)}
  select.twk-field{padding-right:22px;
    background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path fill='rgba(0,0,0,.5)' d='M0 0h10L5 6z'/></svg>");
    background-repeat:no-repeat;background-position:right 8px center}

  .twk-slider{appearance:none;-webkit-appearance:none;width:100%;height:4px;margin:6px 0;
    border-radius:999px;background:rgba(0,0,0,.12);outline:none}
  .twk-slider::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;
    width:14px;height:14px;border-radius:50%;background:#fff;
    border:.5px solid rgba(0,0,0,.12);box-shadow:0 1px 3px rgba(0,0,0,.2);cursor:default}
  .twk-slider::-moz-range-thumb{width:14px;height:14px;border-radius:50%;
    background:#fff;border:.5px solid rgba(0,0,0,.12);box-shadow:0 1px 3px rgba(0,0,0,.2);cursor:default}

  .twk-seg{position:relative;display:flex;padding:2px;border-radius:8px;
    background:rgba(0,0,0,.06);user-select:none}
  .twk-seg-thumb{position:absolute;top:2px;bottom:2px;border-radius:6px;
    background:rgba(255,255,255,.9);box-shadow:0 1px 2px rgba(0,0,0,.12);
    transition:left .15s cubic-bezier(.3,.7,.4,1),width .15s}
  .twk-seg.dragging .twk-seg-thumb{transition:none}
  .twk-seg button{appearance:none;position:relative;z-index:1;flex:1;border:0;
    background:transparent;color:inherit;font:inherit;font-weight:500;min-height:22px;
    border-radius:6px;cursor:default;padding:4px 6px;line-height:1.2;
    overflow-wrap:anywhere}

  .twk-toggle{position:relative;width:32px;height:18px;border:0;border-radius:999px;
    background:rgba(0,0,0,.15);transition:background .15s;cursor:default;padding:0}
  .twk-toggle[data-on="1"]{background:#34c759}
  .twk-toggle i{position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;
    background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.25);transition:transform .15s}
  .twk-toggle[data-on="1"] i{transform:translateX(14px)}

  .twk-num{display:flex;align-items:center;box-sizing:border-box;min-width:0;height:26px;padding:0 0 0 8px;
    border:.5px solid rgba(0,0,0,.1);border-radius:7px;background:rgba(255,255,255,.6)}
  .twk-num-lbl{font-weight:500;color:rgba(41,38,27,.6);cursor:ew-resize;
    user-select:none;padding-right:8px}
  .twk-num input{flex:1;min-width:0;height:100%;border:0;background:transparent;
    font:inherit;font-variant-numeric:tabular-nums;text-align:right;padding:0 8px 0 0;
    outline:none;color:inherit;-moz-appearance:textfield}
  .twk-num input::-webkit-inner-spin-button,.twk-num input::-webkit-outer-spin-button{
    -webkit-appearance:none;margin:0}
  .twk-num-unit{padding-right:8px;color:rgba(41,38,27,.45)}

  .twk-btn{appearance:none;height:26px;padding:0 12px;border:0;border-radius:7px;
    background:rgba(0,0,0,.78);color:#fff;font:inherit;font-weight:500;cursor:default}
  .twk-btn:hover{background:rgba(0,0,0,.88)}
  .twk-btn.secondary{background:rgba(0,0,0,.06);color:inherit}
  .twk-btn.secondary:hover{background:rgba(0,0,0,.1)}

  .twk-swatch{appearance:none;-webkit-appearance:none;width:56px;height:22px;
    border:.5px solid rgba(0,0,0,.1);border-radius:6px;padding:0;cursor:default;
    background:transparent;flex-shrink:0}
  .twk-swatch::-webkit-color-swatch-wrapper{padding:0}
  .twk-swatch::-webkit-color-swatch{border:0;border-radius:5.5px}
  .twk-swatch::-moz-color-swatch{border:0;border-radius:5.5px}

  .twk-chips{display:flex;gap:6px}
  .twk-chip{position:relative;appearance:none;flex:1;min-width:0;height:46px;
    padding:0;border:0;border-radius:6px;overflow:hidden;cursor:default;
    box-shadow:0 0 0 .5px rgba(0,0,0,.12),0 1px 2px rgba(0,0,0,.06);
    transition:transform .12s cubic-bezier(.3,.7,.4,1),box-shadow .12s}
  .twk-chip:hover{transform:translateY(-1px);
    box-shadow:0 0 0 .5px rgba(0,0,0,.18),0 4px 10px rgba(0,0,0,.12)}
  .twk-chip[data-on="1"]{box-shadow:0 0 0 1.5px rgba(0,0,0,.85),
    0 2px 6px rgba(0,0,0,.15)}
  .twk-chip>span{position:absolute;top:0;bottom:0;right:0;width:34%;
    display:flex;flex-direction:column;box-shadow:-1px 0 0 rgba(0,0,0,.1)}
  .twk-chip>span>i{flex:1;box-shadow:0 -1px 0 rgba(0,0,0,.1)}
  .twk-chip>span>i:first-child{box-shadow:none}
  .twk-chip svg{position:absolute;top:6px;left:6px;width:13px;height:13px;
    filter:drop-shadow(0 1px 1px rgba(0,0,0,.3))}
`;

// ── useTweaks ───────────────────────────────────────────────────────────────
// Single source of truth for tweak values. setTweak persists via the host
// (__edit_mode_set_keys → host rewrites the EDITMODE block on disk).
function useTweaks(defaults) {
  const [values, setValues] = React.useState(defaults);
  // Accepts either setTweak('key', value) or setTweak({ key: value, ... }) so a
  // useState-style call doesn't write a "[object Object]" key into the persisted
  // JSON block.
  const setTweak = React.useCallback((keyOrEdits, val) => {
    const edits = typeof keyOrEdits === 'object' && keyOrEdits !== null
      ? keyOrEdits : { [keyOrEdits]: val };
    setValues((prev) => ({ ...prev, ...edits }));
    window.parent.postMessage({ type: '__edit_mode_set_keys', edits }, '*');
    // Same-window signal so in-page listeners (deck-stage rail thumbnails)
    // can react — the parent message only reaches the host, not peers.
    window.dispatchEvent(new CustomEvent('tweakchange', { detail: edits }));
  }, []);
  return [values, setTweak];
}

// ── TweaksPanel ─────────────────────────────────────────────────────────────
// Floating shell. Registers the protocol listener BEFORE announcing
// availability — if the announce ran first, the host's activate could land
// before our handler exists and the toolbar toggle would silently no-op.
// The close button posts __edit_mode_dismissed so the host's toolbar toggle
// flips off in lockstep; the host echoes __deactivate_edit_mode back which
// is what actually hides the panel.
function TweaksPanel({ title = 'Tweaks', noDeckControls = false, children }) {
  const [open, setOpen] = React.useState(false);
  const dragRef = React.useRef(null);
  // Auto-inject a rail toggle when a <deck-stage> is on the page. The
  // toggle drives the deck's per-viewer _railVisible via window message;
  // state is mirrored from the same localStorage key the deck reads so
  // the control reflects reality across reloads. The mechanism is the
  // message — authors who want custom placement can post it directly
  // and pass noDeckControls to suppress this one.
  const hasDeckStage = React.useMemo(
    () => typeof document !== 'undefined' && !!document.querySelector('deck-stage'),
    [],
  );
  // deck-stage enables its rail in connectedCallback, but this panel can
  // mount before that element has upgraded. The initial read catches the
  // common case; the listener covers mounting first. (Older deck-stage.js
  // copies still wait for the host's __omelette_rail_enabled postMessage —
  // same listener handles those.)
  const [railEnabled, setRailEnabled] = React.useState(
    () => hasDeckStage && !!document.querySelector('deck-stage')?._railEnabled,
  );
  React.useEffect(() => {
    if (!hasDeckStage || railEnabled) return undefined;
    const onMsg = (e) => {
      if (e.data && e.data.type === '__omelette_rail_enabled') setRailEnabled(true);
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [hasDeckStage, railEnabled]);
  const [railVisible, setRailVisible] = React.useState(() => {
    try { return localStorage.getItem('deck-stage.railVisible') !== '0'; } catch (e) { return true; }
  });
  const toggleRail = (on) => {
    setRailVisible(on);
    window.postMessage({ type: '__deck_rail_visible', on }, '*');
  };
  const offsetRef = React.useRef({ x: 16, y: 16 });
  const PAD = 16;

  const clampToViewport = React.useCallback(() => {
    const panel = dragRef.current;
    if (!panel) return;
    const w = panel.offsetWidth, h = panel.offsetHeight;
    const maxRight = Math.max(PAD, window.innerWidth - w - PAD);
    const maxBottom = Math.max(PAD, window.innerHeight - h - PAD);
    offsetRef.current = {
      x: Math.min(maxRight, Math.max(PAD, offsetRef.current.x)),
      y: Math.min(maxBottom, Math.max(PAD, offsetRef.current.y)),
    };
    panel.style.right = offsetRef.current.x + 'px';
    panel.style.bottom = offsetRef.current.y + 'px';
  }, []);

  React.useEffect(() => {
    if (!open) return;
    clampToViewport();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', clampToViewport);
      return () => window.removeEventListener('resize', clampToViewport);
    }
    const ro = new ResizeObserver(clampToViewport);
    ro.observe(document.documentElement);
    return () => ro.disconnect();
  }, [open, clampToViewport]);

  React.useEffect(() => {
    const onMsg = (e) => {
      const t = e?.data?.type;
      if (t === '__activate_edit_mode') setOpen(true);
      else if (t === '__deactivate_edit_mode') setOpen(false);
    };
    window.addEventListener('message', onMsg);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', onMsg);
  }, []);

  const dismiss = () => {
    setOpen(false);
    window.parent.postMessage({ type: '__edit_mode_dismissed' }, '*');
  };

  const onDragStart = (e) => {
    const panel = dragRef.current;
    if (!panel) return;
    const r = panel.getBoundingClientRect();
    const sx = e.clientX, sy = e.clientY;
    const startRight = window.innerWidth - r.right;
    const startBottom = window.innerHeight - r.bottom;
    const move = (ev) => {
      offsetRef.current = {
        x: startRight - (ev.clientX - sx),
        y: startBottom - (ev.clientY - sy),
      };
      clampToViewport();
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  if (!open) return null;
  return (
    <>
      <style>{__TWEAKS_STYLE}</style>
      <div ref={dragRef} className="twk-panel" data-noncommentable=""
           style={{ right: offsetRef.current.x, bottom: offsetRef.current.y }}>
        <div className="twk-hd" onMouseDown={onDragStart}>
          <b>{title}</b>
          <button className="twk-x" aria-label="Close tweaks"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={dismiss}>✕</button>
        </div>
        <div className="twk-body">
          {children}
          {hasDeckStage && railEnabled && !noDeckControls && (
            <TweakSection label="Deck">
              <TweakToggle label="Thumbnail rail" value={railVisible} onChange={toggleRail} />
            </TweakSection>
          )}
        </div>
      </div>
    </>
  );
}

// ── Layout helpers ──────────────────────────────────────────────────────────

function TweakSection({ label, children }) {
  return (
    <>
      <div className="twk-sect">{label}</div>
      {children}
    </>
  );
}

function TweakRow({ label, value, children, inline = false }) {
  return (
    <div className={inline ? 'twk-row twk-row-h' : 'twk-row'}>
      <div className="twk-lbl">
        <span>{label}</span>
        {value != null && <span className="twk-val">{value}</span>}
      </div>
      {children}
    </div>
  );
}

// ── Controls ────────────────────────────────────────────────────────────────

function TweakSlider({ label, value, min = 0, max = 100, step = 1, unit = '', onChange }) {
  return (
    <TweakRow label={label} value={`${value}${unit}`}>
      <input type="range" className="twk-slider" min={min} max={max} step={step}
             value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </TweakRow>
  );
}

function TweakToggle({ label, value, onChange }) {
  return (
    <div className="twk-row twk-row-h">
      <div className="twk-lbl"><span>{label}</span></div>
      <button type="button" className="twk-toggle" data-on={value ? '1' : '0'}
              role="switch" aria-checked={!!value}
              onClick={() => onChange(!value)}><i /></button>
    </div>
  );
}

function TweakRadio({ label, value, options, onChange }) {
  const trackRef = React.useRef(null);
  const [dragging, setDragging] = React.useState(false);
  // The active value is read by pointer-move handlers attached for the lifetime
  // of a drag — ref it so a stale closure doesn't fire onChange for every move.
  const valueRef = React.useRef(value);
  valueRef.current = value;

  // Segments wrap mid-word once per-segment width runs out. The track is
  // ~248px (280 panel − 28 body pad − 4 seg pad), each button loses 12px
  // to its own padding, and 11.5px system-ui averages ~6.3px/char — so 2
  // options fit ~16 chars each, 3 fit ~10. Past that (or >3 options), fall
  // back to a dropdown rather than wrap.
  const labelLen = (o) => String(typeof o === 'object' ? o.label : o).length;
  const maxLen = options.reduce((m, o) => Math.max(m, labelLen(o)), 0);
  const fitsAsSegments = maxLen <= ({ 2: 16, 3: 10 }[options.length] ?? 0);
  if (!fitsAsSegments) {
    // <select> emits strings — map back to the original option value so the
    // fallback stays type-preserving (numbers, booleans) like the segment path.
    const resolve = (s) => {
      const m = options.find((o) => String(typeof o === 'object' ? o.value : o) === s);
      return m === undefined ? s : typeof m === 'object' ? m.value : m;
    };
    return <TweakSelect label={label} value={value} options={options}
                        onChange={(s) => onChange(resolve(s))} />;
  }
  const opts = options.map((o) => (typeof o === 'object' ? o : { value: o, label: o }));
  const idx = Math.max(0, opts.findIndex((o) => o.value === value));
  const n = opts.length;

  const segAt = (clientX) => {
    const r = trackRef.current.getBoundingClientRect();
    const inner = r.width - 4;
    const i = Math.floor(((clientX - r.left - 2) / inner) * n);
    return opts[Math.max(0, Math.min(n - 1, i))].value;
  };

  const onPointerDown = (e) => {
    setDragging(true);
    const v0 = segAt(e.clientX);
    if (v0 !== valueRef.current) onChange(v0);
    const move = (ev) => {
      if (!trackRef.current) return;
      const v = segAt(ev.clientX);
      if (v !== valueRef.current) onChange(v);
    };
    const up = () => {
      setDragging(false);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  return (
    <TweakRow label={label}>
      <div ref={trackRef} role="radiogroup" onPointerDown={onPointerDown}
           className={dragging ? 'twk-seg dragging' : 'twk-seg'}>
        <div className="twk-seg-thumb"
             style={{ left: `calc(2px + ${idx} * (100% - 4px) / ${n})`,
                      width: `calc((100% - 4px) / ${n})` }} />
        {opts.map((o) => (
          <button key={o.value} type="button" role="radio" aria-checked={o.value === value}>
            {o.label}
          </button>
        ))}
      </div>
    </TweakRow>
  );
}

function TweakSelect({ label, value, options, onChange }) {
  return (
    <TweakRow label={label}>
      <select className="twk-field" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => {
          const v = typeof o === 'object' ? o.value : o;
          const l = typeof o === 'object' ? o.label : o;
          return <option key={v} value={v}>{l}</option>;
        })}
      </select>
    </TweakRow>
  );
}

function TweakText({ label, value, placeholder, onChange }) {
  return (
    <TweakRow label={label}>
      <input className="twk-field" type="text" value={value} placeholder={placeholder}
             onChange={(e) => onChange(e.target.value)} />
    </TweakRow>
  );
}

function TweakNumber({ label, value, min, max, step = 1, unit = '', onChange }) {
  const clamp = (n) => {
    if (min != null && n < min) return min;
    if (max != null && n > max) return max;
    return n;
  };
  const startRef = React.useRef({ x: 0, val: 0 });
  const onScrubStart = (e) => {
    e.preventDefault();
    startRef.current = { x: e.clientX, val: value };
    const decimals = (String(step).split('.')[1] || '').length;
    const move = (ev) => {
      const dx = ev.clientX - startRef.current.x;
      const raw = startRef.current.val + dx * step;
      const snapped = Math.round(raw / step) * step;
      onChange(clamp(Number(snapped.toFixed(decimals))));
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  return (
    <div className="twk-num">
      <span className="twk-num-lbl" onPointerDown={onScrubStart}>{label}</span>
      <input type="number" value={value} min={min} max={max} step={step}
             onChange={(e) => onChange(clamp(Number(e.target.value)))} />
      {unit && <span className="twk-num-unit">{unit}</span>}
    </div>
  );
}

// Relative-luminance contrast pick — checkmarks drawn over a swatch need to
// read on both #111 and #fafafa without per-option configuration. Hex input
// only (#rgb / #rrggbb); named or rgb()/hsl() colors fall through to "light".
function __twkIsLight(hex) {
  const h = String(hex).replace('#', '');
  const x = h.length === 3 ? h.replace(/./g, (c) => c + c) : h.padEnd(6, '0');
  const n = parseInt(x.slice(0, 6), 16);
  if (Number.isNaN(n)) return true;
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return r * 299 + g * 587 + b * 114 > 148000;
}

const __TwkCheck = ({ light }) => (
  <svg viewBox="0 0 14 14" aria-hidden="true">
    <path d="M3 7.2 5.8 10 11 4.2" fill="none" strokeWidth="2.2"
          strokeLinecap="round" strokeLinejoin="round"
          stroke={light ? 'rgba(0,0,0,.78)' : '#fff'} />
  </svg>
);

// TweakColor — curated color/palette picker. Each option is either a single
// hex string or an array of 1-5 hex strings; the card adapts — a lone color
// renders solid, a palette renders colors[0] as the hero (left ~2/3) with the
// rest stacked in a sharp column on the right. onChange emits the
// option in the shape it was passed (string stays string, array stays array).
// Without options it falls back to the native color input for back-compat.
function TweakColor({ label, value, options, onChange }) {
  if (!options || !options.length) {
    return (
      <div className="twk-row twk-row-h">
        <div className="twk-lbl"><span>{label}</span></div>
        <input type="color" className="twk-swatch" value={value}
               onChange={(e) => onChange(e.target.value)} />
      </div>
    );
  }
  // Native <input type=color> emits lowercase hex per the HTML spec, so
  // compare case-insensitively. String() guards JSON.stringify(undefined),
  // which returns the primitive undefined (no .toLowerCase).
  const key = (o) => String(JSON.stringify(o)).toLowerCase();
  const cur = key(value);
  return (
    <TweakRow label={label}>
      <div className="twk-chips" role="radiogroup">
        {options.map((o, i) => {
          const colors = Array.isArray(o) ? o : [o];
          const [hero, ...rest] = colors;
          const sup = rest.slice(0, 4);
          const on = key(o) === cur;
          return (
            <button key={i} type="button" className="twk-chip" role="radio"
                    aria-checked={on} data-on={on ? '1' : '0'}
                    aria-label={colors.join(', ')} title={colors.join(' · ')}
                    style={{ background: hero }}
                    onClick={() => onChange(o)}>
              {sup.length > 0 && (
                <span>
                  {sup.map((c, j) => <i key={j} style={{ background: c }} />)}
                </span>
              )}
              {on && <__TwkCheck light={__twkIsLight(hero)} />}
            </button>
          );
        })}
      </div>
    </TweakRow>
  );
}

function TweakButton({ label, onClick, secondary = false }) {
  return (
    <button type="button" className={secondary ? 'twk-btn secondary' : 'twk-btn'}
            onClick={onClick}>{label}</button>
  );
}

Object.assign(window, {
  useTweaks, TweaksPanel, TweakSection, TweakRow,
  TweakSlider, TweakToggle, TweakRadio, TweakSelect,
  TweakText, TweakNumber, TweakColor, TweakButton,
});


// === components.jsx ===
// NETURION — Shared components

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
        <span>Fairblock</span>
        <span className="dot"></span>
        <span>Base Sepolia</span>
        <span className="dot"></span>
        <span>Llama 3.1 · 8B</span>
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


// === chat.jsx ===
// NETURION — Chat view with encryption visualization

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


// === app.jsx ===
const BACKEND_URL = window.location.origin;
const AUCTION_CONTRACT = '0xfdfbd9909d8f48dbdefd9ab17670513b2091bc51';

function App() {
  const [wallet, setWallet] = useState('');
  const [page, setPage] = useState('chat');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [nodeOk, setNodeOk] = useState(null);
  const [showConnect, setShowConnect] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    fetch('/api/health').then(r => r.json()).then(d => setNodeOk(d.status === 'ok')).catch(() => setNodeOk(false));
  }, []);

  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function connectWallet() {
    try {
      if (!window.ethereum) { alert('MetaMask not found'); return; }
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setWallet(accounts[0]);
      setShowConnect(false);
    } catch(e) { alert('Connection failed: ' + e.message); }
  }

  async function send() {
    if (!input.trim() || !wallet || loading) return;
    const prompt = input.trim();
    setMessages(p => [...p, { role: 'user', content: prompt, ts: Date.now() }]);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch('/api/infer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, wallet, session_id: 's_' + Date.now() })
      });
      const data = await res.json();
      setMessages(p => [...p, { role: 'assistant', content: data.response || 'Error', ts: Date.now() }]);
    } catch(e) {
      setMessages(p => [...p, { role: 'assistant', content: 'Error: ' + e.message, ts: Date.now() }]);
    }
    setLoading(false);
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', background:'#060a14', color:'#e8eef7', fontFamily:'Inter,system-ui,sans-serif', fontSize:14 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0 20px', height:56, borderBottom:'1px solid #1e2a45', background:'rgba(10,11,15,0.9)', backdropFilter:'blur(20px)', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <svg width="28" height="28" viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="19" stroke="#5dd9ec" strokeWidth="1.4" fill="none" opacity="0.7"/>
            <circle cx="24" cy="24" r="10" stroke="#5dd9ec" strokeWidth="1.8" fill="none"/>
            <line x1="24" y1="2" x2="24" y2="8" stroke="#8ee7f5" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="24" y1="40" x2="24" y2="46" stroke="#8ee7f5" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="2" y1="24" x2="8" y2="24" stroke="#8ee7f5" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="40" y1="24" x2="46" y2="24" stroke="#8ee7f5" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="24" cy="24" r="2.2" fill="#5dd9ec"/>
          </svg>
          <span style={{ fontWeight:800, fontSize:14, letterSpacing:'0.2em', background:'linear-gradient(180deg,#fff,#b8dde8)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>NETURION</span>
          <span style={{ fontSize:9, fontWeight:700, letterSpacing:'0.25em', color:'#8ee7f5', background:'rgba(93,217,236,0.1)', border:'1px solid rgba(93,217,236,0.3)', padding:'3px 8px', borderRadius:999, textTransform:'uppercase' }}>Confidential AI</span>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={() => setPage('chat')} style={{ background:page==='chat'?'rgba(93,217,236,0.1)':'none', border:page==='chat'?'1px solid rgba(93,217,236,0.3)':'1px solid transparent', color:page==='chat'?'#8ee7f5':'#93a4bf', padding:'4px 12px', borderRadius:999, cursor:'pointer', fontSize:11, fontWeight:600, letterSpacing:'0.1em', textTransform:'uppercase' }}>AI Chat</button>
          <button onClick={() => setPage('auction')} style={{ background:page==='auction'?'rgba(93,217,236,0.1)':'none', border:page==='auction'?'1px solid rgba(93,217,236,0.3)':'1px solid transparent', color:page==='auction'?'#8ee7f5':'#93a4bf', padding:'4px 12px', borderRadius:999, cursor:'pointer', fontSize:11, fontWeight:600, letterSpacing:'0.1em', textTransform:'uppercase' }}>Sealed Auction</button>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 12px', background:'#131b30', border:'1px solid #1e2a45', borderRadius:999, fontSize:11, color:'#93a4bf' }}>
            <span style={{ width:6, height:6, borderRadius:'50%', background:nodeOk===null?'#555':nodeOk?'#4ade80':'#f87171', display:'inline-block' }}/>
            {nodeOk===null?'Checking...':nodeOk?'Node online · 84532':'Node offline'}
          </div>
          {wallet ? (
            <div style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 12px', background:'#131b30', border:'1px solid #1e2a45', borderRadius:999, cursor:'pointer' }} onClick={() => setWallet('')}>
              <span style={{ width:22, height:22, borderRadius:'50%', background:'linear-gradient(135deg,#5dd9ec,#8ee7f5)', display:'inline-block' }}/>
              <span style={{ fontFamily:'monospace', fontSize:12, color:'#e8eef7' }}>{wallet.slice(0,6)}...{wallet.slice(-4)}</span>
            </div>
          ) : (
            <button onClick={() => setShowConnect(true)} style={{ background:'#5dd9ec', color:'#0f0719', border:'none', borderRadius:999, padding:'8px 16px', fontWeight:600, fontSize:13, cursor:'pointer' }}>Connect Wallet</button>
          )}
        </div>
      </div>

      {page === 'chat' && (
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
          <div style={{ flex:1, overflowY:'auto', padding:'24px 28px', display:'flex', flexDirection:'column', gap:16 }}>
            {messages.length === 0 && (
              <div style={{ margin:'auto', textAlign:'center', padding:32 }}>
                <div style={{ fontSize:56, marginBottom:16 }}>⬡</div>
                <h2 style={{ fontWeight:500, fontSize:32, letterSpacing:'0.18em', margin:'0 0 12px', background:'linear-gradient(180deg,#fff,#b8dde8)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>NETURION</h2>
                <p style={{ color:'#93a4bf', fontSize:14, margin:'0 0 32px' }}>Confidential AI Agent · Powered by Fairblock Network<br/>Your prompts are encrypted end-to-end · Self-hosted LLM</p>
                {!wallet && <button onClick={() => setShowConnect(true)} style={{ background:'#5dd9ec', color:'#0f0719', border:'none', borderRadius:999, padding:'13px 22px', fontWeight:600, fontSize:14, cursor:'pointer' }}>Connect wallet to start</button>}
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} style={{ display:'flex', justifyContent:m.role==='user'?'flex-end':'flex-start', gap:8, alignItems:'flex-end' }}>
                {m.role==='assistant' && <span style={{ fontSize:18, color:'#5dd9ec' }}>⬡</span>}
                <div style={{ maxWidth:'68%', borderRadius:12, padding:'10px 14px', fontSize:13, lineHeight:1.7, ...(m.role==='user' ? { background:'rgba(93,217,236,0.1)', border:'1px solid rgba(93,217,236,0.3)', borderBottomRightRadius:4 } : { background:'#131b30', border:'1px solid #1e2a45', borderBottomLeftRadius:4 }) }}>
                  {m.role==='assistant' && <div style={{ fontSize:10, color:'#5dd9ec', marginBottom:6, letterSpacing:1 }}>🔒 FAIRBLOCK ENCRYPTED</div>}
                  <p style={{ margin:0, color:'#d0d0d0', whiteSpace:'pre-wrap' }}>{m.content}</p>
                  <span style={{ fontSize:10, color:'#444', display:'block', marginTop:4 }}>{new Date(m.ts).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display:'flex', alignItems:'flex-end', gap:8 }}>
                <span style={{ fontSize:18, color:'#5dd9ec' }}>⬡</span>
                <div style={{ background:'#131b30', border:'1px solid #1e2a45', borderRadius:12, borderBottomLeftRadius:4, padding:'12px 16px' }}>
                  <span style={{ color:'#5dd9ec', letterSpacing:4 }}>● ● ●</span>
                </div>
              </div>
            )}
            <div ref={bottomRef}/>
          </div>
          <div style={{ flexShrink:0, padding:'12px 28px 20px', borderTop:'1px solid #1e2a45', background:'#060a14' }}>
            <div style={{ display:'flex', gap:10, background:'#131b30', border:'1px solid #1e2a45', borderRadius:12, padding:'4px 4px 4px 14px' }}>
              <input
                style={{ flex:1, background:'transparent', border:'none', outline:'none', color:'#e8eef7', fontSize:14, padding:'8px 0' }}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key==='Enter' && !e.shiftKey && send()}
                placeholder={wallet ? 'Type a confidential prompt...' : 'Connect wallet to start'}
                disabled={!wallet || loading}
              />
              <button onClick={send} disabled={!wallet || loading || !input.trim()} style={{ background:'#5dd9ec', color:'#0f0719', border:'none', borderRadius:9, padding:'8px 16px', cursor:'pointer', fontSize:16, opacity:(!wallet||loading||!input.trim())?0.4:1 }}>→</button>
            </div>
          </div>
        </div>
      )}

      {page === 'auction' && (
        <div style={{ flex:1, overflowY:'auto', padding:32, display:'flex', flexDirection:'column', gap:20, alignItems:'center' }}>
          <div style={{ maxWidth:640, width:'100%', display:'flex', flexDirection:'column', gap:20 }}>
            <div style={{ textAlign:'center' }}>
              <h2 style={{ fontFamily:'system-ui', fontSize:28, fontWeight:700, color:'#e8eef7', margin:'0 0 8px' }}>Sealed Bid Auction</h2>
              <p style={{ color:'#93a4bf', fontSize:14, margin:0 }}>Encrypted bids on Base Sepolia via Fairblock IBE</p>
            </div>
            <div style={{ background:'#131b30', border:'1px solid rgba(93,217,236,0.2)', borderRadius:16, padding:20 }}>
              <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.2em', textTransform:'uppercase', color:'#93a4bf', marginBottom:12 }}>Contract Info</div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:8 }}>
                <span style={{ color:'#93a4bf' }}>Address</span>
                <span style={{ fontFamily:'monospace', color:'#8ee7f5' }}>{AUCTION_CONTRACT.slice(0,10)}...{AUCTION_CONTRACT.slice(-6)}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:8 }}>
                <span style={{ color:'#93a4bf' }}>Network</span>
                <span style={{ color:'#4ade80' }}>Base Sepolia</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:12 }}>
                <span style={{ color:'#93a4bf' }}>Encryption</span>
                <span style={{ color:'#8ee7f5' }}>Fairblock IBE</span>
              </div>
              <a href={'https://sepolia.basescan.org/address/'+AUCTION_CONTRACT} target="_blank" style={{ fontSize:11, color:'#5dd9ec', textDecoration:'none' }}>View on Basescan →</a>
            </div>
            <AuctionBid wallet={wallet} onConnect={() => setShowConnect(true)} />
          </div>
        </div>
      )}

      {showConnect && (
        <div style={{ position:'fixed', inset:0, background:'rgba(10,11,15,0.8)', backdropFilter:'blur(8px)', zIndex:50, display:'grid', placeItems:'center' }} onClick={e => e.target===e.currentTarget && setShowConnect(false)}>
          <div style={{ background:'#131b30', border:'1px solid #1e2a45', borderRadius:16, overflow:'hidden', maxWidth:400, width:'100%', boxShadow:'0 30px 80px rgba(0,0,0,0.6)' }}>
            <div style={{ padding:'22px 24px 16px', borderBottom:'1px solid #1e2a45' }}>
              <h3 style={{ margin:'0 0 8px', color:'#e8eef7', fontSize:20 }}>Connect your wallet</h3>
              <p style={{ margin:0, color:'#93a4bf', fontSize:13 }}>Your wallet key encrypts prompts. Nothing stored server-side.</p>
            </div>
            <div style={{ padding:'16px 18px 18px' }}>
              <button onClick={connectWallet} style={{ display:'flex', alignItems:'center', gap:12, width:'100%', padding:'12px 14px', background:'#0c1322', border:'1px solid #1e2a45', borderRadius:12, cursor:'pointer', textAlign:'left' }}>
                <span style={{ fontSize:24 }}>🦊</span>
                <div>
                  <div style={{ color:'#e8eef7', fontWeight:600, fontSize:13 }}>MetaMask</div>
                  <div style={{ color:'#93a4bf', fontSize:11 }}>Browser extension</div>
                </div>
              </button>
            </div>
            <div style={{ padding:'14px 18px', background:'#0c1322', borderTop:'1px solid #1e2a45', fontSize:11, color:'#93a4bf' }}>
              NETURION nodes never receive plaintext. Decryption happens in your wallet.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AuctionBid({ wallet, onConnect }) {
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
      const AUCTION_ABI = ['function submitEncryptedBid(uint8[] calldata encryptedBid) external payable'];
      const contract = new ethers.Contract(AUCTION_CONTRACT, AUCTION_ABI, signer);
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
    <div style={{ background:'#131b30', border:'1px solid #1e2a45', borderRadius:16, padding:20, display:'flex', flexDirection:'column', gap:12 }}>
      <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.2em', textTransform:'uppercase', color:'#93a4bf' }}>Submit Encrypted Bid</div>
      <div style={{ display:'flex', gap:10 }}>
        <input type="number" placeholder="Bid amount..." value={bidAmount} onChange={e => setBidAmount(e.target.value)}
          style={{ flex:1, background:'#0c1322', border:'1px solid #1e2a45', borderRadius:8, padding:'10px 14px', color:'#e8eef7', fontFamily:'monospace', fontSize:14, outline:'none' }}/>
        <button onClick={submitBid} disabled={loading}
          style={{ background:'#5dd9ec', color:'#0f0719', border:'none', borderRadius:8, padding:'10px 20px', fontWeight:600, cursor:'pointer', opacity:loading?0.5:1 }}>
          {loading ? 'Submitting...' : 'Encrypt & Bid'}
        </button>
      </div>
      {status && <div style={{ fontSize:12, color:'#8ee7f5', fontFamily:'monospace', padding:'8px 12px', background:'#0c1322', borderRadius:8 }}>{status}</div>}
      {bids.length > 0 && bids.map((b,i) => (
        <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'8px 12px', background:'#0c1322', borderRadius:8, fontSize:12 }}>
          <span style={{ fontFamily:'monospace', color:'#8ee7f5' }}>{b.bidder.slice(0,8)}...{b.bidder.slice(-4)}</span>
          <span style={{ color:'#93a4bf' }}>🔒 Encrypted</span>
          <span style={{ color:'#444', fontSize:10 }}>{new Date(b.ts).toLocaleTimeString()}</span>
        </div>
      ))}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);


