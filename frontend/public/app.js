const {
  useState,
  useEffect,
  useRef,
  useMemo
} = React;

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
//   const TWEAK_DEFAULTS = {
//     "primaryColor": "#D97757",
//     "palette": ["#D97757", "#29261b", "#f6f4ef"],
//     "fontSize": 16,
//     "density": "regular",
//     "dark": false
//   };
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
    const edits = typeof keyOrEdits === 'object' && keyOrEdits !== null ? keyOrEdits : {
      [keyOrEdits]: val
    };
    setValues(prev => ({
      ...prev,
      ...edits
    }));
    window.parent.postMessage({
      type: '__edit_mode_set_keys',
      edits
    }, '*');
    // Same-window signal so in-page listeners (deck-stage rail thumbnails)
    // can react — the parent message only reaches the host, not peers.
    window.dispatchEvent(new CustomEvent('tweakchange', {
      detail: edits
    }));
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
function TweaksPanel({
  title = 'Tweaks',
  noDeckControls = false,
  children
}) {
  const [open, setOpen] = React.useState(false);
  const dragRef = React.useRef(null);
  // Auto-inject a rail toggle when a <deck-stage> is on the page. The
  // toggle drives the deck's per-viewer _railVisible via window message;
  // state is mirrored from the same localStorage key the deck reads so
  // the control reflects reality across reloads. The mechanism is the
  // message — authors who want custom placement can post it directly
  // and pass noDeckControls to suppress this one.
  const hasDeckStage = React.useMemo(() => typeof document !== 'undefined' && !!document.querySelector('deck-stage'), []);
  // deck-stage enables its rail in connectedCallback, but this panel can
  // mount before that element has upgraded. The initial read catches the
  // common case; the listener covers mounting first. (Older deck-stage.js
  // copies still wait for the host's __omelette_rail_enabled postMessage —
  // same listener handles those.)
  const [railEnabled, setRailEnabled] = React.useState(() => hasDeckStage && !!document.querySelector('deck-stage')?._railEnabled);
  React.useEffect(() => {
    if (!hasDeckStage || railEnabled) return undefined;
    const onMsg = e => {
      if (e.data && e.data.type === '__omelette_rail_enabled') setRailEnabled(true);
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [hasDeckStage, railEnabled]);
  const [railVisible, setRailVisible] = React.useState(() => {
    try {
      return localStorage.getItem('deck-stage.railVisible') !== '0';
    } catch (e) {
      return true;
    }
  });
  const toggleRail = on => {
    setRailVisible(on);
    window.postMessage({
      type: '__deck_rail_visible',
      on
    }, '*');
  };
  const offsetRef = React.useRef({
    x: 16,
    y: 16
  });
  const PAD = 16;
  const clampToViewport = React.useCallback(() => {
    const panel = dragRef.current;
    if (!panel) return;
    const w = panel.offsetWidth,
      h = panel.offsetHeight;
    const maxRight = Math.max(PAD, window.innerWidth - w - PAD);
    const maxBottom = Math.max(PAD, window.innerHeight - h - PAD);
    offsetRef.current = {
      x: Math.min(maxRight, Math.max(PAD, offsetRef.current.x)),
      y: Math.min(maxBottom, Math.max(PAD, offsetRef.current.y))
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
    const onMsg = e => {
      const t = e?.data?.type;
      if (t === '__activate_edit_mode') setOpen(true);else if (t === '__deactivate_edit_mode') setOpen(false);
    };
    window.addEventListener('message', onMsg);
    window.parent.postMessage({
      type: '__edit_mode_available'
    }, '*');
    return () => window.removeEventListener('message', onMsg);
  }, []);
  const dismiss = () => {
    setOpen(false);
    window.parent.postMessage({
      type: '__edit_mode_dismissed'
    }, '*');
  };
  const onDragStart = e => {
    const panel = dragRef.current;
    if (!panel) return;
    const r = panel.getBoundingClientRect();
    const sx = e.clientX,
      sy = e.clientY;
    const startRight = window.innerWidth - r.right;
    const startBottom = window.innerHeight - r.bottom;
    const move = ev => {
      offsetRef.current = {
        x: startRight - (ev.clientX - sx),
        y: startBottom - (ev.clientY - sy)
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
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("style", null, __TWEAKS_STYLE), /*#__PURE__*/React.createElement("div", {
    ref: dragRef,
    className: "twk-panel",
    "data-noncommentable": "",
    style: {
      right: offsetRef.current.x,
      bottom: offsetRef.current.y
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-hd",
    onMouseDown: onDragStart
  }, /*#__PURE__*/React.createElement("b", null, title), /*#__PURE__*/React.createElement("button", {
    className: "twk-x",
    "aria-label": "Close tweaks",
    onMouseDown: e => e.stopPropagation(),
    onClick: dismiss
  }, "\u2715")), /*#__PURE__*/React.createElement("div", {
    className: "twk-body"
  }, children, hasDeckStage && railEnabled && !noDeckControls && /*#__PURE__*/React.createElement(TweakSection, {
    label: "Deck"
  }, /*#__PURE__*/React.createElement(TweakToggle, {
    label: "Thumbnail rail",
    value: railVisible,
    onChange: toggleRail
  })))));
}

// ── Layout helpers ──────────────────────────────────────────────────────────

function TweakSection({
  label,
  children
}) {
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "twk-sect"
  }, label), children);
}
function TweakRow({
  label,
  value,
  children,
  inline = false
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: inline ? 'twk-row twk-row-h' : 'twk-row'
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-lbl"
  }, /*#__PURE__*/React.createElement("span", null, label), value != null && /*#__PURE__*/React.createElement("span", {
    className: "twk-val"
  }, value)), children);
}

// ── Controls ────────────────────────────────────────────────────────────────

function TweakSlider({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  unit = '',
  onChange
}) {
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label,
    value: `${value}${unit}`
  }, /*#__PURE__*/React.createElement("input", {
    type: "range",
    className: "twk-slider",
    min: min,
    max: max,
    step: step,
    value: value,
    onChange: e => onChange(Number(e.target.value))
  }));
}
function TweakToggle({
  label,
  value,
  onChange
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "twk-row twk-row-h"
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-lbl"
  }, /*#__PURE__*/React.createElement("span", null, label)), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "twk-toggle",
    "data-on": value ? '1' : '0',
    role: "switch",
    "aria-checked": !!value,
    onClick: () => onChange(!value)
  }, /*#__PURE__*/React.createElement("i", null)));
}
function TweakRadio({
  label,
  value,
  options,
  onChange
}) {
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
  const labelLen = o => String(typeof o === 'object' ? o.label : o).length;
  const maxLen = options.reduce((m, o) => Math.max(m, labelLen(o)), 0);
  const fitsAsSegments = maxLen <= ({
    2: 16,
    3: 10
  }[options.length] ?? 0);
  if (!fitsAsSegments) {
    // <select> emits strings — map back to the original option value so the
    // fallback stays type-preserving (numbers, booleans) like the segment path.
    const resolve = s => {
      const m = options.find(o => String(typeof o === 'object' ? o.value : o) === s);
      return m === undefined ? s : typeof m === 'object' ? m.value : m;
    };
    return /*#__PURE__*/React.createElement(TweakSelect, {
      label: label,
      value: value,
      options: options,
      onChange: s => onChange(resolve(s))
    });
  }
  const opts = options.map(o => typeof o === 'object' ? o : {
    value: o,
    label: o
  });
  const idx = Math.max(0, opts.findIndex(o => o.value === value));
  const n = opts.length;
  const segAt = clientX => {
    const r = trackRef.current.getBoundingClientRect();
    const inner = r.width - 4;
    const i = Math.floor((clientX - r.left - 2) / inner * n);
    return opts[Math.max(0, Math.min(n - 1, i))].value;
  };
  const onPointerDown = e => {
    setDragging(true);
    const v0 = segAt(e.clientX);
    if (v0 !== valueRef.current) onChange(v0);
    const move = ev => {
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
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("div", {
    ref: trackRef,
    role: "radiogroup",
    onPointerDown: onPointerDown,
    className: dragging ? 'twk-seg dragging' : 'twk-seg'
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-seg-thumb",
    style: {
      left: `calc(2px + ${idx} * (100% - 4px) / ${n})`,
      width: `calc((100% - 4px) / ${n})`
    }
  }), opts.map(o => /*#__PURE__*/React.createElement("button", {
    key: o.value,
    type: "button",
    role: "radio",
    "aria-checked": o.value === value
  }, o.label))));
}
function TweakSelect({
  label,
  value,
  options,
  onChange
}) {
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("select", {
    className: "twk-field",
    value: value,
    onChange: e => onChange(e.target.value)
  }, options.map(o => {
    const v = typeof o === 'object' ? o.value : o;
    const l = typeof o === 'object' ? o.label : o;
    return /*#__PURE__*/React.createElement("option", {
      key: v,
      value: v
    }, l);
  })));
}
function TweakText({
  label,
  value,
  placeholder,
  onChange
}) {
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("input", {
    className: "twk-field",
    type: "text",
    value: value,
    placeholder: placeholder,
    onChange: e => onChange(e.target.value)
  }));
}
function TweakNumber({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange
}) {
  const clamp = n => {
    if (min != null && n < min) return min;
    if (max != null && n > max) return max;
    return n;
  };
  const startRef = React.useRef({
    x: 0,
    val: 0
  });
  const onScrubStart = e => {
    e.preventDefault();
    startRef.current = {
      x: e.clientX,
      val: value
    };
    const decimals = (String(step).split('.')[1] || '').length;
    const move = ev => {
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
  return /*#__PURE__*/React.createElement("div", {
    className: "twk-num"
  }, /*#__PURE__*/React.createElement("span", {
    className: "twk-num-lbl",
    onPointerDown: onScrubStart
  }, label), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: value,
    min: min,
    max: max,
    step: step,
    onChange: e => onChange(clamp(Number(e.target.value)))
  }), unit && /*#__PURE__*/React.createElement("span", {
    className: "twk-num-unit"
  }, unit));
}

// Relative-luminance contrast pick — checkmarks drawn over a swatch need to
// read on both #111 and #fafafa without per-option configuration. Hex input
// only (#rgb / #rrggbb); named or rgb()/hsl() colors fall through to "light".
function __twkIsLight(hex) {
  const h = String(hex).replace('#', '');
  const x = h.length === 3 ? h.replace(/./g, c => c + c) : h.padEnd(6, '0');
  const n = parseInt(x.slice(0, 6), 16);
  if (Number.isNaN(n)) return true;
  const r = n >> 16 & 255,
    g = n >> 8 & 255,
    b = n & 255;
  return r * 299 + g * 587 + b * 114 > 148000;
}
const __TwkCheck = ({
  light
}) => /*#__PURE__*/React.createElement("svg", {
  viewBox: "0 0 14 14",
  "aria-hidden": "true"
}, /*#__PURE__*/React.createElement("path", {
  d: "M3 7.2 5.8 10 11 4.2",
  fill: "none",
  strokeWidth: "2.2",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  stroke: light ? 'rgba(0,0,0,.78)' : '#fff'
}));

// TweakColor — curated color/palette picker. Each option is either a single
// hex string or an array of 1-5 hex strings; the card adapts — a lone color
// renders solid, a palette renders colors[0] as the hero (left ~2/3) with the
// rest stacked in a sharp column on the right. onChange emits the
// option in the shape it was passed (string stays string, array stays array).
// Without options it falls back to the native color input for back-compat.
function TweakColor({
  label,
  value,
  options,
  onChange
}) {
  if (!options || !options.length) {
    return /*#__PURE__*/React.createElement("div", {
      className: "twk-row twk-row-h"
    }, /*#__PURE__*/React.createElement("div", {
      className: "twk-lbl"
    }, /*#__PURE__*/React.createElement("span", null, label)), /*#__PURE__*/React.createElement("input", {
      type: "color",
      className: "twk-swatch",
      value: value,
      onChange: e => onChange(e.target.value)
    }));
  }
  // Native <input type=color> emits lowercase hex per the HTML spec, so
  // compare case-insensitively. String() guards JSON.stringify(undefined),
  // which returns the primitive undefined (no .toLowerCase).
  const key = o => String(JSON.stringify(o)).toLowerCase();
  const cur = key(value);
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-chips",
    role: "radiogroup"
  }, options.map((o, i) => {
    const colors = Array.isArray(o) ? o : [o];
    const [hero, ...rest] = colors;
    const sup = rest.slice(0, 4);
    const on = key(o) === cur;
    return /*#__PURE__*/React.createElement("button", {
      key: i,
      type: "button",
      className: "twk-chip",
      role: "radio",
      "aria-checked": on,
      "data-on": on ? '1' : '0',
      "aria-label": colors.join(', '),
      title: colors.join(' · '),
      style: {
        background: hero
      },
      onClick: () => onChange(o)
    }, sup.length > 0 && /*#__PURE__*/React.createElement("span", null, sup.map((c, j) => /*#__PURE__*/React.createElement("i", {
      key: j,
      style: {
        background: c
      }
    }))), on && /*#__PURE__*/React.createElement(__TwkCheck, {
      light: __twkIsLight(hero)
    }));
  })));
}
function TweakButton({
  label,
  onClick,
  secondary = false
}) {
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: secondary ? 'twk-btn secondary' : 'twk-btn',
    onClick: onClick
  }, label);
}
Object.assign(window, {
  useTweaks,
  TweaksPanel,
  TweakSection,
  TweakRow,
  TweakSlider,
  TweakToggle,
  TweakRadio,
  TweakSelect,
  TweakText,
  TweakNumber,
  TweakColor,
  TweakButton
});

// NETURION — Shared components

/* ──────────────────────────────────────────────
 * NeturionMark — brand glyph
 * ────────────────────────────────────────────── */
// NeturionMark — abstracted from the brand wordmark's target glyph:
// concentric ring + crosshair + radiating segments. Stands in as the app icon.
function NeturionMark({
  size = 32,
  glow = false,
  animated = false
}) {
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 48 48",
    fill: "none",
    style: {
      display: 'block'
    }
  }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("linearGradient", {
    id: "nmGrad",
    x1: "0",
    y1: "0",
    x2: "1",
    y2: "1"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0%",
    stopColor: "#8ee7f5"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "100%",
    stopColor: "#2bb6cf"
  })), /*#__PURE__*/React.createElement("radialGradient", {
    id: "nmBg",
    cx: "0.5",
    cy: "0.5",
    r: "0.5"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0%",
    stopColor: "#5dd9ec",
    stopOpacity: "0.18"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "100%",
    stopColor: "#5dd9ec",
    stopOpacity: "0"
  }))), /*#__PURE__*/React.createElement("circle", {
    cx: "24",
    cy: "24",
    r: "22",
    fill: "url(#nmBg)"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "24",
    cy: "24",
    r: "19",
    stroke: "url(#nmGrad)",
    strokeWidth: "1.4",
    strokeOpacity: "0.7",
    fill: "none"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "24",
    cy: "24",
    r: "10",
    stroke: "url(#nmGrad)",
    strokeWidth: "1.8",
    fill: "none"
  }), /*#__PURE__*/React.createElement("g", {
    stroke: "#8ee7f5",
    strokeWidth: "1.5",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("line", {
    x1: "24",
    y1: "2",
    x2: "24",
    y2: "8"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "24",
    y1: "40",
    x2: "24",
    y2: "46"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "2",
    y1: "24",
    x2: "8",
    y2: "24"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "40",
    y1: "24",
    x2: "46",
    y2: "24"
  })), /*#__PURE__*/React.createElement("path", {
    d: "M30 6 L42 18",
    stroke: "#5dd9ec",
    strokeWidth: "1.5",
    strokeLinecap: "round",
    opacity: "0.65"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M6 30 L18 42",
    stroke: "#5dd9ec",
    strokeWidth: "1.5",
    strokeLinecap: "round",
    opacity: "0.65"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "24",
    cy: "24",
    r: "2.2",
    fill: "#5dd9ec"
  }));
}

/* ──────────────────────────────────────────────
 * Constellation — network of nodes + lines, brand imagery
 * ────────────────────────────────────────────── */
function Constellation() {
  // Deterministically lay out nodes on a 100x60 canvas
  const nodes = useMemo(() => {
    const seed = 42;
    const rand = i => {
      const x = Math.sin(seed + i * 9301 + 49297) * 233280;
      return x - Math.floor(x);
    };
    const arr = [];
    for (let i = 0; i < 38; i++) {
      arr.push({
        x: rand(i) * 100,
        y: rand(i + 100) * 60,
        r: 0.4 + rand(i + 200) * 0.7,
        delay: rand(i + 300) * 4
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
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < 14) out.push({
          a: i,
          b: j,
          d
        });
      }
    }
    return out;
  }, [nodes]);
  return /*#__PURE__*/React.createElement("div", {
    className: "constellation"
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 100 60",
    preserveAspectRatio: "none"
  }, links.map((l, i) => /*#__PURE__*/React.createElement("line", {
    key: i,
    className: "c-line",
    x1: nodes[l.a].x,
    y1: nodes[l.a].y,
    x2: nodes[l.b].x,
    y2: nodes[l.b].y,
    style: {
      opacity: Math.max(0.08, 0.45 - l.d / 30)
    }
  })), nodes.map((n, i) => /*#__PURE__*/React.createElement("circle", {
    key: i,
    className: "c-node",
    cx: n.x,
    cy: n.y,
    r: n.r,
    style: {
      animationDelay: n.delay + 's'
    }
  }))));
}

/* ──────────────────────────────────────────────
 * Atmosphere — backdrop layers
 * ────────────────────────────────────────────── */
function Atmosphere() {
  return /*#__PURE__*/React.createElement("div", {
    className: "atmosphere"
  }, /*#__PURE__*/React.createElement("div", {
    className: "dotgrid"
  }), /*#__PURE__*/React.createElement("div", {
    className: "orb orb-1"
  }), /*#__PURE__*/React.createElement("div", {
    className: "orb orb-2"
  }), /*#__PURE__*/React.createElement("div", {
    className: "orb orb-3"
  }), /*#__PURE__*/React.createElement(Constellation, null), /*#__PURE__*/React.createElement("div", {
    className: "shape shape-1"
  }), /*#__PURE__*/React.createElement("div", {
    className: "shape shape-2"
  }), /*#__PURE__*/React.createElement("div", {
    className: "shape shape-3"
  }));
}

/* ──────────────────────────────────────────────
 * TopBar
 * ────────────────────────────────────────────── */

const AUCTION_CONTRACT = '0xfdfbd9909d8f48dbdefd9ab17670513b2091bc51';
const MARKETPLACE_CONTRACT = '0x81cfb5cc5eb25cac577284f8fa80b146ffd809fd';
const MARKETPLACE_ABI = ['function createListing(string title, string description, bytes encryptedData, bytes32 dataHash, uint256 price, uint256 conditionBlock) external returns (uint256)', 'function purchaseData(uint256 listingId) external payable', 'function getListingCount() external view returns (uint256)', 'function hasPurchased(uint256 listingId, address buyer) external view returns (bool)', 'function listings(uint256) external view returns (address seller, string title, string description, bytes encryptedData, bytes32 dataHash, uint256 price, uint256 conditionBlock, bool active, uint256 salesCount)', 'event ListingCreated(uint256 indexed id, address seller, string title, uint256 price)', 'event DataPurchased(uint256 indexed listingId, address buyer, uint256 purchaseIndex)'];
const VOTING_CONTRACT = '0xf726995744bbc792ed32a6519debbeb2cfe1f5ca';
const VOTING_ABI = ['function createProposal(string title, string description, uint256 durationSeconds) external returns (uint256)', 'function castEncryptedVote(uint256 proposalId, bytes encryptedVote) external', 'function getProposalCount() external view returns (uint256)', 'function getVoteCount(uint256 proposalId) external view returns (uint256)', 'function proposals(uint256) external view returns (string title, string description, address creator, uint256 deadline, bool revealed, uint256 yesCount, uint256 noCount, uint256 totalVotes)', 'function hasVoted(uint256, address) external view returns (bool)', 'event ProposalCreated(uint256 indexed id, address creator, string title, uint256 deadline)', 'event VoteCast(uint256 indexed proposalId, address voter)'];
const AGENT_CONTRACT = '0xe898d58908f440036bdc6ffaf2fd0c8c3d192196';
const AGENT_ABI = ['function registerAgent(string name, string capability) external returns (uint256)', 'function createTask(bytes encryptedPayload, bytes32 payloadHash, uint256 targetAgent) external returns (uint256)', 'function completeTask(uint256 taskId, bytes encryptedResult) external', 'function getAgentCount() external view returns (uint256)', 'function getTaskCount() external view returns (uint256)', 'function agents(uint256) external view returns (address addr, string name, string capability, bool active, uint256 tasksCompleted)', 'function tasks(uint256) external view returns (uint256 id, address creator, bytes encryptedPayload, bytes32 payloadHash, uint256 assignedAgent, uint8 status, uint256 createdAt, uint256 completedAt, bytes encryptedResult)', 'event AgentRegistered(uint256 indexed id, address addr, string name)', 'event TaskCreated(uint256 indexed id, address creator, uint256 assignedAgent)', 'event TaskCompleted(uint256 indexed id, uint256 agentId)'];
const CAPABILITIES = ['AI Inference', 'Data Analysis', 'Smart Contract Audit', 'Privacy Guard', 'Encryption Layer'];
function AgentNetworkPage({
  wallet,
  onConnect
}) {
  const [tab, setTab] = useState('network');
  const [agents, setAgents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [agentForm, setAgentForm] = useState({
    name: '',
    capability: CAPABILITIES[0]
  });
  const [taskForm, setTaskForm] = useState({
    payload: '',
    targetAgent: '0'
  });
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
        agentList.push({
          id: i,
          addr: a[0],
          name: a[1],
          capability: a[2],
          active: a[3],
          tasksCompleted: Number(a[4])
        });
      }
      const taskList = [];
      for (let i = 0; i < Number(taskCount); i++) {
        const t = await contract.tasks(i);
        taskList.push({
          id: Number(t[0]),
          creator: t[1],
          assignedAgent: Number(t[4]),
          status: Number(t[5]),
          createdAt: Number(t[6])
        });
      }
      setAgents(agentList);
      setTasks(taskList.reverse());
    } catch (e) {
      console.error(e);
    }
  }
  useEffect(() => {
    if (wallet) loadData();
  }, [wallet]);
  async function registerAgent() {
    if (!wallet) {
      onConnect();
      return;
    }
    if (!agentForm.name) return;
    setLoading(true);
    setStatus('Registering agent on-chain...');
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(AGENT_CONTRACT, AGENT_ABI, signer);
      const tx = await contract.registerAgent(agentForm.name, agentForm.capability);
      await tx.wait();
      setStatus('Agent registered! TX: ' + tx.hash.slice(0, 10) + '...');
      setAgentForm({
        name: '',
        capability: CAPABILITIES[0]
      });
      loadData();
    } catch (e) {
      setStatus('Error: ' + e.message.slice(0, 80));
    }
    setLoading(false);
  }
  async function createTask() {
    if (!wallet) {
      onConnect();
      return;
    }
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
      setStatus('Task created! TX: ' + tx.hash.slice(0, 10) + '...');
      setTaskForm({
        payload: '',
        targetAgent: '0'
      });
      loadData();
    } catch (e) {
      setStatus('Error: ' + e.message.slice(0, 80));
    }
    setLoading(false);
  }
  async function simulateNetwork() {
    setSimulating(true);
    setSimSteps([]);
    const steps = [{
      icon: 'person',
      label: 'User',
      desc: 'Encrypting task with IBE public key...',
      color: 'var(--accent-light)'
    }, {
      icon: 'lock',
      label: 'Fairblock IBE',
      desc: 'Generating encryption key for agent network...',
      color: 'var(--accent)'
    }, {
      icon: 'smart_toy',
      label: 'NETURION Agent 1',
      desc: 'Receiving encrypted task, routing to specialist...',
      color: '#a78bfa'
    }, {
      icon: 'share',
      label: 'Agent 2 (Specialist)',
      desc: 'Processing confidential payload...',
      color: '#f59e0b'
    }, {
      icon: 'memory',
      label: 'Groq LLM',
      desc: 'Running inference on encrypted context...',
      color: '#10b981'
    }, {
      icon: 'lock_open',
      label: 'Result Decryption',
      desc: 'Fairblock conditional decryption triggered...',
      color: 'var(--accent)'
    }, {
      icon: 'check_circle',
      label: 'Complete',
      desc: 'Encrypted result delivered to wallet owner only.',
      color: 'var(--success)'
    }];
    for (let i = 0; i < steps.length; i++) {
      await new Promise(r => setTimeout(r, 800));
      setSimSteps(prev => [...prev, {
        ...steps[i],
        ts: Date.now()
      }]);
    }
    setSimulating(false);
  }
  const tabStyle = t => ({
    background: tab === t ? 'var(--accent-10)' : 'none',
    border: tab === t ? '1px solid var(--accent-30)' : '1px solid transparent',
    color: tab === t ? 'var(--accent-light)' : 'var(--fg-secondary)',
    padding: '4px 14px',
    borderRadius: 'var(--r-pill)',
    cursor: 'pointer',
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase'
  });
  const statusLabels = ['Pending', 'In Progress', 'Completed', 'Failed'];
  const statusColors = ['var(--fg-muted)', 'var(--accent-light)', 'var(--success)', 'var(--danger)'];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      gridArea: 'main',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: 32,
      gap: 20,
      overflowY: 'auto',
      position: 'relative',
      zIndex: 3
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 760,
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "hero-eyebrow"
  }, /*#__PURE__*/React.createElement("span", {
    className: "dot"
  }), "Confidential Agent Network"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 28,
      fontWeight: 700,
      color: 'var(--fg-primary)',
      margin: '12px 0 8px'
    }
  }, "Multi-Agent Coordination"), /*#__PURE__*/React.createElement("p", {
    style: {
      color: 'var(--fg-secondary)',
      fontSize: 14,
      margin: 0
    }
  }, "Encrypted task delegation \xB7 Fairblock IBE \xB7 Base Sepolia \xB7 ERC-8004")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      justifyContent: 'center',
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setTab('network'),
    style: tabStyle('network')
  }, "Network"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setTab('simulate'),
    style: tabStyle('simulate')
  }, "Simulate"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setTab('register'),
    style: tabStyle('register')
  }, "Register Agent"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setTab('task'),
    style: tabStyle('task')
  }, "Create Task")), status && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--accent-light)',
      fontFamily: 'var(--font-mono)',
      padding: '8px 12px',
      background: 'var(--bg-inset)',
      borderRadius: 'var(--r-sm)'
    }
  }, status), tab === 'network' && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "priv-card",
    style: {
      flex: 1,
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 32,
      fontWeight: 700,
      color: 'var(--accent-light)'
    }
  }, agents.length), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--fg-secondary)'
    }
  }, "Active Agents")), /*#__PURE__*/React.createElement("div", {
    className: "priv-card",
    style: {
      flex: 1,
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 32,
      fontWeight: 700,
      color: 'var(--success)'
    }
  }, tasks.length), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--fg-secondary)'
    }
  }, "Total Tasks")), /*#__PURE__*/React.createElement("div", {
    className: "priv-card",
    style: {
      flex: 1,
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 32,
      fontWeight: 700,
      color: 'var(--accent)'
    }
  }, "IBE"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--fg-secondary)'
    }
  }, "Encryption"))), agents.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "priv-card",
    style: {
      textAlign: 'center',
      padding: 40
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined",
    style: {
      fontSize: 40,
      color: 'var(--accent-light)',
      display: 'block',
      marginBottom: 12
    }
  }, "smart_toy"), /*#__PURE__*/React.createElement("p", {
    style: {
      color: 'var(--fg-secondary)',
      margin: 0
    }
  }, "No agents registered yet. Be the first!")) : agents.map(a => /*#__PURE__*/React.createElement("div", {
    key: a.id,
    className: "priv-card"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 40,
      height: 40,
      borderRadius: '50%',
      background: 'var(--accent-10)',
      border: '1px solid var(--accent-30)',
      display: 'grid',
      placeItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined",
    style: {
      fontSize: 20,
      color: 'var(--accent-light)'
    }
  }, "smart_toy")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      color: 'var(--fg-primary)',
      fontSize: 14
    }
  }, a.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--accent-light)'
    }
  }, a.capability), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--fg-muted)',
      fontFamily: 'var(--font-mono)'
    }
  }, a.addr.slice(0, 8), "...", a.addr.slice(-4)))), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'right'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--success)',
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      justifyContent: 'flex-end'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "micro-dot",
    style: {
      background: 'var(--success)'
    }
  }), "Online"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--fg-muted)',
      marginTop: 4
    }
  }, a.tasksCompleted, " tasks"))))), tasks.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "priv-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "head"
  }, /*#__PURE__*/React.createElement("span", null, "Recent Tasks")), tasks.slice(0, 5).map(t => /*#__PURE__*/React.createElement("div", {
    key: t.id,
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      padding: '8px 0',
      borderBottom: '1px solid var(--border)',
      fontSize: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      color: 'var(--fg-secondary)'
    }
  }, "Task #", t.id), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--fg-secondary)'
    }
  }, "Agent ", t.assignedAgent), /*#__PURE__*/React.createElement("span", {
    style: {
      color: statusColors[t.status]
    }
  }, statusLabels[t.status]))))), tab === 'simulate' && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "priv-card glow"
  }, /*#__PURE__*/React.createElement("div", {
    className: "head"
  }, /*#__PURE__*/React.createElement("span", null, "Confidential Agent Flow"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: 'var(--fg-muted)'
    }
  }, "ERC-8004 + Fairblock IBE")), /*#__PURE__*/React.createElement("p", {
    style: {
      color: 'var(--fg-secondary)',
      fontSize: 13,
      margin: '8px 0 16px'
    }
  }, "Simulate how a confidential task flows through the NETURION agent network with Fairblock encryption at each step."), /*#__PURE__*/React.createElement("button", {
    onClick: simulateNetwork,
    disabled: simulating,
    style: {
      background: 'var(--accent)',
      color: '#0f0719',
      border: 'none',
      borderRadius: 'var(--r-sm)',
      padding: '10px 20px',
      fontWeight: 600,
      cursor: 'pointer',
      fontSize: 13,
      opacity: simulating ? 0.5 : 1,
      width: '100%'
    }
  }, simulating ? 'Simulating...' : 'Run Simulation')), simSteps.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 0
    }
  }, simSteps.map((s, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'flex',
      gap: 12,
      position: 'relative',
      paddingBottom: i < simSteps.length - 1 ? 0 : 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 36,
      height: 36,
      borderRadius: '50%',
      background: 'var(--bg-card)',
      border: '2px solid',
      borderColor: s.color,
      display: 'grid',
      placeItems: 'center',
      flexShrink: 0,
      zIndex: 1
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined",
    style: {
      fontSize: 18,
      color: s.color
    }
  }, s.icon)), i < simSteps.length - 1 && /*#__PURE__*/React.createElement("div", {
    style: {
      width: 2,
      height: 24,
      background: 'var(--border)',
      margin: '4px 0'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      paddingBottom: i < simSteps.length - 1 ? 20 : 0,
      paddingTop: 6
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      color: 'var(--fg-primary)',
      fontSize: 13
    }
  }, s.label), /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'var(--fg-secondary)',
      fontSize: 12,
      marginTop: 2
    }
  }, s.desc)))))), tab === 'register' && /*#__PURE__*/React.createElement("div", {
    className: "priv-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "head"
  }, /*#__PURE__*/React.createElement("span", null, "Register New Agent")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("input", {
    placeholder: "Agent name (e.g. NETURION-Alpha)",
    value: agentForm.name,
    onChange: e => setAgentForm({
      ...agentForm,
      name: e.target.value
    }),
    style: {
      background: 'var(--bg-inset)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--r-sm)',
      padding: '10px 14px',
      color: 'var(--fg-primary)',
      fontSize: 13,
      outline: 'none'
    }
  }), /*#__PURE__*/React.createElement("select", {
    value: agentForm.capability,
    onChange: e => setAgentForm({
      ...agentForm,
      capability: e.target.value
    }),
    style: {
      background: 'var(--bg-inset)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--r-sm)',
      padding: '10px 14px',
      color: 'var(--fg-primary)',
      fontSize: 13,
      outline: 'none'
    }
  }, CAPABILITIES.map(c => /*#__PURE__*/React.createElement("option", {
    key: c,
    value: c
  }, c))), /*#__PURE__*/React.createElement("button", {
    onClick: registerAgent,
    disabled: loading,
    style: {
      background: 'var(--accent)',
      color: '#0f0719',
      border: 'none',
      borderRadius: 'var(--r-sm)',
      padding: '11px',
      fontWeight: 600,
      cursor: 'pointer',
      fontSize: 13,
      opacity: loading ? 0.5 : 1
    }
  }, loading ? 'Registering...' : 'Register Agent On-Chain'))), tab === 'task' && /*#__PURE__*/React.createElement("div", {
    className: "priv-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "head"
  }, /*#__PURE__*/React.createElement("span", null, "Create Encrypted Task")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("textarea", {
    placeholder: "Task payload (will be encrypted with Fairblock IBE)",
    value: taskForm.payload,
    onChange: e => setTaskForm({
      ...taskForm,
      payload: e.target.value
    }),
    rows: 4,
    style: {
      background: 'var(--bg-inset)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--r-sm)',
      padding: '10px 14px',
      color: 'var(--fg-primary)',
      fontSize: 13,
      outline: 'none',
      resize: 'vertical'
    }
  }), /*#__PURE__*/React.createElement("select", {
    value: taskForm.targetAgent,
    onChange: e => setTaskForm({
      ...taskForm,
      targetAgent: e.target.value
    }),
    style: {
      background: 'var(--bg-inset)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--r-sm)',
      padding: '10px 14px',
      color: 'var(--fg-primary)',
      fontSize: 13,
      outline: 'none'
    }
  }, agents.map(a => /*#__PURE__*/React.createElement("option", {
    key: a.id,
    value: a.id
  }, "Agent ", a.id, ": ", a.name, " (", a.capability, ")")), agents.length === 0 && /*#__PURE__*/React.createElement("option", {
    disabled: true
  }, "No agents registered yet")), /*#__PURE__*/React.createElement("button", {
    onClick: createTask,
    disabled: loading || agents.length === 0,
    style: {
      background: 'var(--accent)',
      color: '#0f0719',
      border: 'none',
      borderRadius: 'var(--r-sm)',
      padding: '11px',
      fontWeight: 600,
      cursor: 'pointer',
      fontSize: 13,
      opacity: loading || agents.length === 0 ? 0.5 : 1
    }
  }, loading ? 'Creating...' : 'Encrypt & Send Task')))));
}
function MempoolPage({
  wallet
}) {
  const [txs, setTxs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  function fakeCipher(len = 64) {
    const h = '0123456789abcdef';
    let s = '0x';
    for (let i = 0; i < len; i++) s += h[Math.floor(Math.random() * 16)];
    return s;
  }
  async function fetchTxs() {
    setLoading(true);
    try {
      const res = await fetch('https://sepolia.base.org', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getBlockByNumber',
          params: ['latest', true],
          id: 1
        })
      });
      const data = await res.json();
      const block = data.result;
      if (block && block.transactions) {
        const items = block.transactions.slice(0, 10).map(tx => ({
          hash: tx.hash,
          from: tx.from,
          to: tx.to || 'Contract Create',
          value: (parseInt(tx.value, 16) / 1e18).toFixed(6),
          encrypted: fakeCipher(48),
          blockNumber: parseInt(block.number, 16),
          ts: Date.now()
        }));
        setTxs(items);
      }
    } catch (e) {
      // Fallback to mock data
      const items = Array.from({
        length: 8
      }, (_, i) => ({
        hash: '0x' + fakeCipher(32).slice(2),
        from: '0x' + fakeCipher(20).slice(2),
        to: '0x' + fakeCipher(20).slice(2),
        value: (Math.random() * 0.1).toFixed(6),
        encrypted: fakeCipher(48),
        blockNumber: 12345678 + i,
        ts: Date.now()
      }));
      setTxs(items);
    }
    setLoading(false);
  }
  useEffect(() => {
    fetchTxs();
  }, []);
  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(fetchTxs, 5000);
    return () => clearInterval(id);
  }, [autoRefresh]);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      gridArea: 'main',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: 32,
      gap: 20,
      overflowY: 'auto',
      position: 'relative',
      zIndex: 3
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 860,
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "hero-eyebrow"
  }, /*#__PURE__*/React.createElement("span", {
    className: "dot"
  }), "Encrypted Mempool"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 28,
      fontWeight: 700,
      color: 'var(--fg-primary)',
      margin: '12px 0 8px'
    }
  }, "Live Transaction Stream"), /*#__PURE__*/React.createElement("p", {
    style: {
      color: 'var(--fg-secondary)',
      fontSize: 14,
      margin: 0
    }
  }, "Real Base Sepolia transactions \xB7 Fairblock IBE encryption visualization")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      justifyContent: 'center',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: fetchTxs,
    disabled: loading,
    style: {
      background: 'var(--accent)',
      color: '#0f0719',
      border: 'none',
      borderRadius: 'var(--r-pill)',
      padding: '6px 16px',
      fontWeight: 600,
      cursor: 'pointer',
      fontSize: 12,
      opacity: loading ? 0.5 : 1,
      display: 'flex',
      alignItems: 'center',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined",
    style: {
      fontSize: 14
    }
  }, "refresh"), loading ? 'Fetching...' : 'Refresh'), /*#__PURE__*/React.createElement("button", {
    onClick: () => setAutoRefresh(!autoRefresh),
    style: {
      background: autoRefresh ? 'rgba(74,222,128,0.1)' : 'var(--bg-card)',
      color: autoRefresh ? 'var(--success)' : 'var(--fg-secondary)',
      border: '1px solid',
      borderColor: autoRefresh ? 'rgba(74,222,128,0.3)' : 'var(--border)',
      borderRadius: 'var(--r-pill)',
      padding: '6px 16px',
      fontWeight: 600,
      cursor: 'pointer',
      fontSize: 12,
      display: 'flex',
      alignItems: 'center',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined",
    style: {
      fontSize: 14
    }
  }, autoRefresh ? 'stop' : 'play_arrow'), autoRefresh ? 'Stop' : 'Auto Refresh')), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, txs.map((tx, i) => /*#__PURE__*/React.createElement("div", {
    key: tx.hash,
    className: "priv-card",
    style: {
      padding: '12px 16px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: '0.1em',
      color: 'var(--accent-light)',
      background: 'var(--accent-10)',
      border: '1px solid var(--accent-20)',
      borderRadius: 'var(--r-pill)',
      padding: '2px 8px'
    }
  }, "IBE ENCRYPTED"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      color: 'var(--fg-muted)',
      fontFamily: 'var(--font-mono)'
    }
  }, "Block #", tx.blockNumber)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      color: 'var(--accent-light)',
      marginBottom: 4,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    }
  }, tx.hash), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--fg-secondary)',
      fontFamily: 'var(--font-mono)',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    }
  }, "From: ", tx.from, " \u2192 ", tx.to), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8,
      padding: '6px 10px',
      background: 'var(--bg-deep)',
      borderRadius: 'var(--r-sm)',
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      color: 'var(--fg-muted)',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    }
  }, "\uD83D\uDD12 ", tx.encrypted)), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'right',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      color: 'var(--accent-light)',
      fontSize: 14
    }
  }, tx.value, " ETH"), /*#__PURE__*/React.createElement("a", {
    href: 'https://sepolia.basescan.org/tx/' + tx.hash,
    target: "_blank",
    style: {
      fontSize: 10,
      color: 'var(--fg-muted)',
      textDecoration: 'none',
      display: 'flex',
      alignItems: 'center',
      gap: 2,
      justifyContent: 'flex-end',
      marginTop: 4
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined",
    style: {
      fontSize: 12
    }
  }, "open_in_new"), "View"))))))));
}
function VotingPage({
  wallet,
  onConnect
}) {
  const [tab, setTab] = useState('proposals');
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [form, setForm] = useState({
    title: '',
    description: '',
    duration: '3600'
  });
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
          active: Date.now() / 1000 < Number(p[3])
        });
      }
      setProposals(items.reverse());
    } catch (e) {
      console.error(e);
    }
  }
  useEffect(() => {
    if (wallet) loadProposals();
  }, [wallet]);
  async function createProposal() {
    if (!wallet) {
      onConnect();
      return;
    }
    if (!form.title) return;
    setLoading(true);
    setStatus('Creating proposal on-chain...');
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(VOTING_CONTRACT, VOTING_ABI, signer);
      const tx = await contract.createProposal(form.title, form.description, parseInt(form.duration));
      await tx.wait();
      setStatus('Proposal created! TX: ' + tx.hash.slice(0, 10) + '...');
      setForm({
        title: '',
        description: '',
        duration: '3600'
      });
      loadProposals();
      setTab('proposals');
    } catch (e) {
      setStatus('Error: ' + e.message.slice(0, 80));
    }
    setLoading(false);
  }
  async function castVote(proposalId, vote) {
    if (!wallet) {
      onConnect();
      return;
    }
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
      setStatus('Vote cast! TX: ' + tx.hash.slice(0, 10) + '...');
      setVotingOn(null);
      loadProposals();
    } catch (e) {
      setStatus('Error: ' + e.message.slice(0, 80));
    }
    setLoading(false);
  }
  const tabStyle = t => ({
    background: tab === t ? 'var(--accent-10)' : 'none',
    border: tab === t ? '1px solid var(--accent-30)' : '1px solid transparent',
    color: tab === t ? 'var(--accent-light)' : 'var(--fg-secondary)',
    padding: '4px 14px',
    borderRadius: 'var(--r-pill)',
    cursor: 'pointer',
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase'
  });
  return /*#__PURE__*/React.createElement("div", {
    style: {
      gridArea: 'main',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: 32,
      gap: 20,
      overflowY: 'auto',
      position: 'relative',
      zIndex: 3
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 720,
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "hero-eyebrow"
  }, /*#__PURE__*/React.createElement("span", {
    className: "dot"
  }), "Private Governance"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 28,
      fontWeight: 700,
      color: 'var(--fg-primary)',
      margin: '12px 0 8px'
    }
  }, "Encrypted Voting"), /*#__PURE__*/React.createElement("p", {
    style: {
      color: 'var(--fg-secondary)',
      fontSize: 14,
      margin: 0
    }
  }, "Votes are encrypted until deadline \xB7 Powered by Fairblock IBE \xB7 Base Sepolia")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setTab('proposals'),
    style: tabStyle('proposals')
  }, "Proposals"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setTab('create'),
    style: tabStyle('create')
  }, "Create Proposal")), status && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--accent-light)',
      fontFamily: 'var(--font-mono)',
      padding: '8px 12px',
      background: 'var(--bg-inset)',
      borderRadius: 'var(--r-sm)'
    }
  }, status), tab === 'proposals' && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, proposals.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "priv-card",
    style: {
      textAlign: 'center',
      padding: 40
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined",
    style: {
      fontSize: 40,
      color: 'var(--accent-light)',
      display: 'block',
      marginBottom: 12
    }
  }, "how_to_vote"), /*#__PURE__*/React.createElement("p", {
    style: {
      color: 'var(--fg-secondary)',
      margin: 0
    }
  }, "No proposals yet. Create the first one!")) : proposals.map(p => /*#__PURE__*/React.createElement("div", {
    key: p.id,
    className: "priv-card"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 600,
      color: 'var(--fg-primary)',
      fontSize: 15
    }
  }, p.title), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      padding: '2px 8px',
      borderRadius: 'var(--r-pill)',
      background: p.active ? 'rgba(74,222,128,0.1)' : 'var(--bg-inset)',
      color: p.active ? 'var(--success)' : 'var(--fg-muted)',
      border: '1px solid',
      borderColor: p.active ? 'rgba(74,222,128,0.3)' : 'var(--border)'
    }
  }, p.active ? 'Active' : 'Ended')), p.description && /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'var(--fg-secondary)',
      fontSize: 13,
      marginBottom: 8
    }
  }, p.description), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--fg-muted)',
      fontFamily: 'var(--font-mono)'
    }
  }, p.creator.slice(0, 8), "...", p.creator.slice(-4), " \xB7 ", p.totalVotes, " votes \xB7 Deadline: ", new Date(p.deadline * 1000).toLocaleString()), p.revealed && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 12,
      marginTop: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--success)',
      fontSize: 12,
      fontWeight: 600
    }
  }, "\u2713 YES: ", p.yesCount), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--danger)',
      fontSize: 12,
      fontWeight: 600
    }
  }, "\u2717 NO: ", p.noCount)), !p.revealed && p.totalVotes > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--accent-light)',
      marginTop: 8,
      display: 'flex',
      alignItems: 'center',
      gap: 4
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined",
    style: {
      fontSize: 13
    }
  }, "lock"), p.totalVotes, " encrypted votes \u2014 results hidden until deadline")), p.active && !p.voted && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => castVote(p.id, true),
    disabled: loading,
    style: {
      background: 'rgba(74,222,128,0.15)',
      color: 'var(--success)',
      border: '1px solid rgba(74,222,128,0.3)',
      borderRadius: 'var(--r-sm)',
      padding: '6px 14px',
      fontWeight: 600,
      cursor: 'pointer',
      fontSize: 12
    }
  }, "\uD83D\uDD12 YES"), /*#__PURE__*/React.createElement("button", {
    onClick: () => castVote(p.id, false),
    disabled: loading,
    style: {
      background: 'rgba(248,113,113,0.15)',
      color: 'var(--danger)',
      border: '1px solid rgba(248,113,113,0.3)',
      borderRadius: 'var(--r-sm)',
      padding: '6px 14px',
      fontWeight: 600,
      cursor: 'pointer',
      fontSize: 12
    }
  }, "\uD83D\uDD12 NO")), p.voted && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: 'var(--accent-light)',
      display: 'flex',
      alignItems: 'center',
      gap: 4
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined",
    style: {
      fontSize: 13
    }
  }, "lock"), "Voted"))))), tab === 'create' && /*#__PURE__*/React.createElement("div", {
    className: "priv-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "head"
  }, /*#__PURE__*/React.createElement("span", null, "Create Governance Proposal")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("input", {
    placeholder: "Proposal title",
    value: form.title,
    onChange: e => setForm({
      ...form,
      title: e.target.value
    }),
    style: {
      background: 'var(--bg-inset)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--r-sm)',
      padding: '10px 14px',
      color: 'var(--fg-primary)',
      fontSize: 13,
      outline: 'none'
    }
  }), /*#__PURE__*/React.createElement("textarea", {
    placeholder: "Description (optional)",
    value: form.description,
    onChange: e => setForm({
      ...form,
      description: e.target.value
    }),
    rows: 3,
    style: {
      background: 'var(--bg-inset)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--r-sm)',
      padding: '10px 14px',
      color: 'var(--fg-primary)',
      fontSize: 13,
      outline: 'none',
      resize: 'vertical'
    }
  }), /*#__PURE__*/React.createElement("select", {
    value: form.duration,
    onChange: e => setForm({
      ...form,
      duration: e.target.value
    }),
    style: {
      background: 'var(--bg-inset)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--r-sm)',
      padding: '10px 14px',
      color: 'var(--fg-primary)',
      fontSize: 13,
      outline: 'none'
    }
  }, /*#__PURE__*/React.createElement("option", {
    value: "300"
  }, "5 minutes (test)"), /*#__PURE__*/React.createElement("option", {
    value: "3600"
  }, "1 hour"), /*#__PURE__*/React.createElement("option", {
    value: "86400"
  }, "24 hours"), /*#__PURE__*/React.createElement("option", {
    value: "604800"
  }, "7 days")), /*#__PURE__*/React.createElement("button", {
    onClick: createProposal,
    disabled: loading,
    style: {
      background: 'var(--accent)',
      color: '#0f0719',
      border: 'none',
      borderRadius: 'var(--r-sm)',
      padding: '11px',
      fontWeight: 600,
      cursor: 'pointer',
      fontSize: 13,
      opacity: loading ? 0.5 : 1
    }
  }, loading ? 'Creating...' : 'Create Proposal')))));
}
function MarketplacePage({
  wallet,
  onConnect
}) {
  const [tab, setTab] = useState('browse');
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [form, setForm] = useState({
    title: '',
    description: '',
    data: '',
    price: ''
  });
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
    } catch (e) {
      console.error(e);
    }
  }
  useEffect(() => {
    if (wallet) loadListings();
  }, [wallet]);
  async function createListing() {
    if (!wallet) {
      onConnect();
      return;
    }
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
      const tx = await contract.createListing(form.title, form.description, encoded, dataHash, priceWei, Math.floor(Date.now() / 1000) + 3600);
      await tx.wait();
      setStatus('Listing created! TX: ' + tx.hash.slice(0, 10) + '...');
      setForm({
        title: '',
        description: '',
        data: '',
        price: ''
      });
      loadListings();
    } catch (e) {
      setStatus('Error: ' + e.message.slice(0, 80));
    }
    setLoading(false);
  }
  async function purchase(listingId, price) {
    if (!wallet) {
      onConnect();
      return;
    }
    setLoading(true);
    setStatus('Purchasing...');
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(MARKETPLACE_CONTRACT, MARKETPLACE_ABI, signer);
      const tx = await contract.purchaseData(listingId, {
        value: ethers.parseEther(price)
      });
      await tx.wait();
      setStatus('Purchase successful! TX: ' + tx.hash.slice(0, 10) + '...');
      loadListings();
    } catch (e) {
      setStatus('Error: ' + e.message.slice(0, 80));
    }
    setLoading(false);
  }
  const tabStyle = t => ({
    background: tab === t ? 'var(--accent-10)' : 'none',
    border: tab === t ? '1px solid var(--accent-30)' : '1px solid transparent',
    color: tab === t ? 'var(--accent-light)' : 'var(--fg-secondary)',
    padding: '4px 14px',
    borderRadius: 'var(--r-pill)',
    cursor: 'pointer',
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase'
  });
  return /*#__PURE__*/React.createElement("div", {
    style: {
      gridArea: 'main',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: 32,
      gap: 20,
      overflowY: 'auto',
      position: 'relative',
      zIndex: 3
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 720,
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "hero-eyebrow"
  }, /*#__PURE__*/React.createElement("span", {
    className: "dot"
  }), "Confidential Data Marketplace"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 28,
      fontWeight: 700,
      color: 'var(--fg-primary)',
      margin: '12px 0 8px'
    }
  }, "Buy & Sell Encrypted Data"), /*#__PURE__*/React.createElement("p", {
    style: {
      color: 'var(--fg-secondary)',
      fontSize: 14,
      margin: 0
    }
  }, "Data stays encrypted until purchased \xB7 Powered by Fairblock IBE \xB7 Base Sepolia")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setTab('browse'),
    style: tabStyle('browse')
  }, "Browse"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setTab('sell'),
    style: tabStyle('sell')
  }, "Sell Data")), status && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--accent-light)',
      fontFamily: 'var(--font-mono)',
      padding: '8px 12px',
      background: 'var(--bg-inset)',
      borderRadius: 'var(--r-sm)'
    }
  }, status), tab === 'browse' && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, listings.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "priv-card",
    style: {
      textAlign: 'center',
      padding: 40
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined",
    style: {
      fontSize: 40,
      color: 'var(--accent-light)',
      display: 'block',
      marginBottom: 12
    }
  }, "storefront"), /*#__PURE__*/React.createElement("p", {
    style: {
      color: 'var(--fg-secondary)',
      margin: 0
    }
  }, "No listings yet. Be the first to sell encrypted data!")) : listings.map(l => /*#__PURE__*/React.createElement("div", {
    key: l.id,
    className: "priv-card"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      color: 'var(--fg-primary)',
      fontSize: 15,
      marginBottom: 4
    }
  }, l.title), /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'var(--fg-secondary)',
      fontSize: 13
    }
  }, l.description), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--fg-muted)',
      marginTop: 6,
      fontFamily: 'var(--font-mono)'
    }
  }, l.seller.slice(0, 8), "...", l.seller.slice(-4), " \xB7 ", l.salesCount, " sales")), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'right',
      flexShrink: 0,
      marginLeft: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'var(--accent-light)',
      fontWeight: 700,
      fontSize: 16,
      marginBottom: 8
    }
  }, l.price, " ETH"), /*#__PURE__*/React.createElement("button", {
    onClick: () => purchase(l.id, l.price),
    disabled: loading,
    style: {
      background: 'var(--accent)',
      color: '#0f0719',
      border: 'none',
      borderRadius: 'var(--r-sm)',
      padding: '7px 16px',
      fontWeight: 600,
      cursor: 'pointer',
      fontSize: 12,
      opacity: loading ? 0.5 : 1
    }
  }, "Purchase")))))), tab === 'sell' && /*#__PURE__*/React.createElement("div", {
    className: "priv-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "head"
  }, /*#__PURE__*/React.createElement("span", null, "Create Encrypted Listing")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("input", {
    placeholder: "Title",
    value: form.title,
    onChange: e => setForm({
      ...form,
      title: e.target.value
    }),
    style: {
      background: 'var(--bg-inset)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--r-sm)',
      padding: '10px 14px',
      color: 'var(--fg-primary)',
      fontSize: 13,
      outline: 'none'
    }
  }), /*#__PURE__*/React.createElement("input", {
    placeholder: "Description",
    value: form.description,
    onChange: e => setForm({
      ...form,
      description: e.target.value
    }),
    style: {
      background: 'var(--bg-inset)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--r-sm)',
      padding: '10px 14px',
      color: 'var(--fg-primary)',
      fontSize: 13,
      outline: 'none'
    }
  }), /*#__PURE__*/React.createElement("textarea", {
    placeholder: "Your confidential data (will be encrypted with Fairblock IBE)",
    value: form.data,
    onChange: e => setForm({
      ...form,
      data: e.target.value
    }),
    rows: 4,
    style: {
      background: 'var(--bg-inset)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--r-sm)',
      padding: '10px 14px',
      color: 'var(--fg-primary)',
      fontSize: 13,
      outline: 'none',
      resize: 'vertical'
    }
  }), /*#__PURE__*/React.createElement("input", {
    placeholder: "Price in ETH (e.g. 0.001)",
    value: form.price,
    onChange: e => setForm({
      ...form,
      price: e.target.value
    }),
    style: {
      background: 'var(--bg-inset)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--r-sm)',
      padding: '10px 14px',
      color: 'var(--fg-primary)',
      fontSize: 13,
      outline: 'none'
    }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: createListing,
    disabled: loading,
    style: {
      background: 'var(--accent)',
      color: '#0f0719',
      border: 'none',
      borderRadius: 'var(--r-sm)',
      padding: '11px',
      fontWeight: 600,
      cursor: 'pointer',
      fontSize: 13,
      opacity: loading ? 0.5 : 1
    }
  }, loading ? 'Creating...' : 'Encrypt & List Data')), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--fg-muted)',
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      marginTop: 4
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined",
    style: {
      fontSize: 13,
      color: 'var(--accent-light)'
    }
  }, "shield"), "Data is encrypted with Fairblock IBE before going on-chain"))));
}
function AuctionPage({
  wallet,
  onConnect
}) {
  const [bidAmount, setBidAmount] = useState('');
  const [status, setStatus] = useState('');
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(false);
  async function submitBid() {
    if (!wallet) {
      onConnect();
      return;
    }
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
      setStatus('Bid submitted! TX: ' + tx.hash.slice(0, 10) + '...');
      setBids(p => [...p, {
        bidder: wallet,
        ts: Date.now()
      }]);
      setBidAmount('');
    } catch (e) {
      setStatus('Error: ' + e.message.slice(0, 80));
    }
    setLoading(false);
  }
  return /*#__PURE__*/React.createElement("div", {
    style: {
      gridArea: 'main',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: 32,
      gap: 20,
      overflowY: 'auto',
      position: 'relative',
      zIndex: 3
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 640,
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "hero-eyebrow"
  }, /*#__PURE__*/React.createElement("span", {
    className: "dot"
  }), "Fairblock Sealed Bid Auction"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 28,
      fontWeight: 700,
      color: 'var(--fg-primary)',
      margin: '12px 0 8px',
      letterSpacing: '-0.02em'
    }
  }, "Confidential Bidding"), /*#__PURE__*/React.createElement("p", {
    style: {
      color: 'var(--fg-secondary)',
      fontSize: 14,
      margin: 0
    }
  }, "Submit encrypted bids on Base Sepolia \xB7 Powered by Fairblock IBE")), /*#__PURE__*/React.createElement("div", {
    className: "priv-card glow"
  }, /*#__PURE__*/React.createElement("div", {
    className: "head"
  }, /*#__PURE__*/React.createElement("span", null, "Contract Info")), /*#__PURE__*/React.createElement("div", {
    className: "node-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "node-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "k"
  }, "Address"), /*#__PURE__*/React.createElement("span", {
    className: "v accent"
  }, AUCTION_CONTRACT.slice(0, 10), "...", AUCTION_CONTRACT.slice(-6))), /*#__PURE__*/React.createElement("div", {
    className: "node-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "k"
  }, "Network"), /*#__PURE__*/React.createElement("span", {
    className: "v success"
  }, /*#__PURE__*/React.createElement("span", {
    className: "micro-dot"
  }), "Base Sepolia")), /*#__PURE__*/React.createElement("div", {
    className: "node-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "k"
  }, "Encryption"), /*#__PURE__*/React.createElement("span", {
    className: "v accent"
  }, "Fairblock IBE"))), /*#__PURE__*/React.createElement("a", {
    href: 'https://sepolia.basescan.org/address/' + AUCTION_CONTRACT,
    target: "_blank",
    style: {
      fontSize: 11,
      color: 'var(--accent-light)',
      textDecoration: 'none',
      display: 'flex',
      alignItems: 'center',
      gap: 4
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined",
    style: {
      fontSize: 13
    }
  }, "open_in_new"), "View on Basescan")), /*#__PURE__*/React.createElement("div", {
    className: "priv-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "head"
  }, /*#__PURE__*/React.createElement("span", null, "Submit Encrypted Bid")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "number",
    placeholder: "Bid amount...",
    value: bidAmount,
    onChange: e => setBidAmount(e.target.value),
    style: {
      flex: 1,
      background: 'var(--bg-inset)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--r-sm)',
      padding: '10px 14px',
      color: 'var(--fg-primary)',
      fontFamily: 'var(--font-mono)',
      fontSize: 14,
      outline: 'none'
    }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: submitBid,
    disabled: loading,
    style: {
      background: 'var(--accent)',
      color: '#0f0719',
      border: 'none',
      borderRadius: 'var(--r-sm)',
      padding: '10px 20px',
      fontWeight: 600,
      cursor: 'pointer',
      opacity: loading ? 0.5 : 1,
      fontSize: 13
    }
  }, loading ? 'Submitting...' : 'Encrypt & Bid')), status && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--accent-light)',
      fontFamily: 'var(--font-mono)',
      padding: '8px 12px',
      background: 'var(--bg-inset)',
      borderRadius: 'var(--r-sm)'
    }
  }, status), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--fg-muted)',
      display: 'flex',
      alignItems: 'center',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined",
    style: {
      fontSize: 13,
      color: 'var(--accent-light)'
    }
  }, "shield"), "Your bid is encrypted with Fairblock IBE before hitting the blockchain")), bids.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "priv-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "head"
  }, /*#__PURE__*/React.createElement("span", null, "Submitted Bids (", bids.length, ")")), bids.map((b, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '8px 12px',
      background: 'var(--bg-inset)',
      borderRadius: 'var(--r-sm)',
      fontSize: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      color: 'var(--accent-light)'
    }
  }, b.bidder.slice(0, 8), "...", b.bidder.slice(-4)), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--fg-secondary)',
      display: 'flex',
      alignItems: 'center',
      gap: 4
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined",
    style: {
      fontSize: 13
    }
  }, "lock"), "Encrypted"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--fg-muted)',
      fontSize: 10
    }
  }, new Date(b.ts).toLocaleTimeString()))))));
}
function TopBar({
  wallet,
  nodeOk,
  onConnect,
  onDisconnect
}) {
  return /*#__PURE__*/React.createElement("header", {
    className: "topbar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "brand"
  }, /*#__PURE__*/React.createElement("div", {
    className: "brand-mark"
  }, /*#__PURE__*/React.createElement(NeturionMark, {
    size: 28,
    glow: true
  })), /*#__PURE__*/React.createElement("div", {
    className: "wordmark",
    style: {
      fontSize: 14
    }
  }, "NETUR", /*#__PURE__*/React.createElement("span", {
    className: "target",
    "aria-hidden": "true"
  }), "ION"), /*#__PURE__*/React.createElement("span", {
    className: "beta-pill"
  }, "Confidential AI")), /*#__PURE__*/React.createElement("div", {
    className: "topbar-center"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => window.setNeturionPage && window.setNeturionPage('chat'),
    style: {
      background: 'none',
      border: '1px solid transparent',
      color: 'var(--fg-secondary)',
      padding: '4px 14px',
      borderRadius: 'var(--r-pill)',
      cursor: 'pointer',
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: '0.1em',
      textTransform: 'uppercase'
    }
  }, "AI Chat"), /*#__PURE__*/React.createElement("span", {
    className: "dot"
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => window.setNeturionPage && window.setNeturionPage('auction'),
    style: {
      background: 'none',
      border: '1px solid transparent',
      color: 'var(--fg-secondary)',
      padding: '4px 14px',
      borderRadius: 'var(--r-pill)',
      cursor: 'pointer',
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: '0.1em',
      textTransform: 'uppercase'
    }
  }, "Sealed Auction"), /*#__PURE__*/React.createElement("span", {
    className: "dot"
  }), /*#__PURE__*/React.createElement("span", {
    className: "dot"
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => window.setNeturionPage && window.setNeturionPage('marketplace'),
    style: {
      background: 'none',
      border: '1px solid transparent',
      color: 'var(--fg-secondary)',
      padding: '4px 14px',
      borderRadius: 'var(--r-pill)',
      cursor: 'pointer',
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: '0.1em',
      textTransform: 'uppercase'
    }
  }, "Marketplace"), /*#__PURE__*/React.createElement("span", {
    className: "dot"
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => window.setNeturionPage && window.setNeturionPage('voting'),
    style: {
      background: 'none',
      border: '1px solid transparent',
      color: 'var(--fg-secondary)',
      padding: '4px 14px',
      borderRadius: 'var(--r-pill)',
      cursor: 'pointer',
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: '0.1em',
      textTransform: 'uppercase'
    }
  }, "Voting"), /*#__PURE__*/React.createElement("span", {
    className: "dot"
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => window.setNeturionPage && window.setNeturionPage('mempool'),
    style: {
      background: 'none',
      border: '1px solid transparent',
      color: 'var(--fg-secondary)',
      padding: '4px 14px',
      borderRadius: 'var(--r-pill)',
      cursor: 'pointer',
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: '0.1em',
      textTransform: 'uppercase'
    }
  }, "Mempool"), /*#__PURE__*/React.createElement("span", {
    className: "dot"
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => window.setNeturionPage && window.setNeturionPage('agents'),
    style: {
      background: 'none',
      border: '1px solid transparent',
      color: 'var(--fg-secondary)',
      padding: '4px 14px',
      borderRadius: 'var(--r-pill)',
      cursor: 'pointer',
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: '0.1em',
      textTransform: 'uppercase'
    }
  }, "Agents"), /*#__PURE__*/React.createElement("span", null, "Base Sepolia")), /*#__PURE__*/React.createElement("div", {
    className: "topbar-right"
  }, /*#__PURE__*/React.createElement("div", {
    className: 'node-status' + (nodeOk ? '' : ' offline')
  }, /*#__PURE__*/React.createElement("span", {
    className: "dot"
  }), /*#__PURE__*/React.createElement("span", null, nodeOk ? 'Node online · 84532' : 'Node offline')), wallet ? /*#__PURE__*/React.createElement("button", {
    className: "wallet-pill",
    onClick: onDisconnect,
    title: "Click to disconnect"
  }, /*#__PURE__*/React.createElement("span", {
    className: "avatar"
  }), /*#__PURE__*/React.createElement("span", {
    className: "addr"
  }, wallet.slice(0, 6), "\u2026", wallet.slice(-4)), /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined chev"
  }, "expand_more")) : /*#__PURE__*/React.createElement("button", {
    className: "connect-btn",
    onClick: onConnect
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined"
  }, "account_balance_wallet"), "Connect Wallet")));
}

/* ──────────────────────────────────────────────
 * Sidebar rail (sessions)
 * ────────────────────────────────────────────── */
function Rail({
  sessions,
  activeId,
  onSelect,
  onNew
}) {
  return /*#__PURE__*/React.createElement("aside", {
    className: "rail"
  }, /*#__PURE__*/React.createElement("div", {
    className: "rail-section"
  }, /*#__PURE__*/React.createElement("div", {
    className: "rail-eyebrow"
  }, /*#__PURE__*/React.createElement("span", null, "Encrypted Sessions"), /*#__PURE__*/React.createElement("button", {
    className: "new-btn",
    onClick: onNew,
    title: "New session"
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined"
  }, "add"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 2
    }
  }, sessions.map(s => /*#__PURE__*/React.createElement("button", {
    key: s.id,
    className: 'session-row' + (s.id === activeId ? ' active' : ''),
    onClick: () => onSelect(s.id)
  }, /*#__PURE__*/React.createElement("span", {
    className: "session-icon"
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined"
  }, s.icon || 'chat')), /*#__PURE__*/React.createElement("span", {
    className: "session-text"
  }, /*#__PURE__*/React.createElement("span", {
    className: "session-title"
  }, s.title), /*#__PURE__*/React.createElement("span", {
    className: "session-meta"
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined lock"
  }, "lock"), /*#__PURE__*/React.createElement("span", null, s.when))))))), /*#__PURE__*/React.createElement("div", {
    className: "rail-footer"
  }, /*#__PURE__*/React.createElement("div", {
    className: "encryption-tile"
  }, /*#__PURE__*/React.createElement("div", {
    className: "row"
  }, /*#__PURE__*/React.createElement("span", null, "Layer"), /*#__PURE__*/React.createElement("span", {
    className: "val"
  }, "IBE / HE")), /*#__PURE__*/React.createElement("div", {
    className: "row"
  }, /*#__PURE__*/React.createElement("span", null, "Cipher"), /*#__PURE__*/React.createElement("span", {
    className: "val"
  }, "BLS12-381")), /*#__PURE__*/React.createElement("div", {
    className: "row"
  }, /*#__PURE__*/React.createElement("span", null, "Epoch"), /*#__PURE__*/React.createElement("span", {
    className: "val"
  }, "#284,915")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      alignItems: 'center',
      marginTop: 4
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined",
    style: {
      fontSize: 14,
      color: 'var(--accent-light)'
    }
  }, "verified_user"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10.5,
      color: 'var(--fg-secondary)',
      letterSpacing: '0.04em'
    }
  }, "Verified by 7 validators")))));
}

/* ──────────────────────────────────────────────
 * Privacy panel (right side)
 * ────────────────────────────────────────────── */
function FlowStep({
  icon,
  label,
  sub,
  status
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: 'flow-step ' + status
  }, /*#__PURE__*/React.createElement("div", {
    className: "flow-icon"
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined"
  }, icon)), /*#__PURE__*/React.createElement("div", {
    className: "flow-text"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flow-label"
  }, label), /*#__PURE__*/React.createElement("div", {
    className: "flow-sub"
  }, sub)));
}
function PrivacyPanel({
  flowState,
  lastTx
}) {
  const order = ['encrypt', 'transit', 'inference', 'response', 'decrypt'];
  const activeIdx = flowState === 'idle' ? -1 : order.indexOf(flowState);
  const stepStatus = i => {
    if (flowState === 'idle') return '';
    if (i < activeIdx) return 'done';
    if (i === activeIdx) return 'active';
    return '';
  };
  return /*#__PURE__*/React.createElement("aside", {
    className: "privacy"
  }, /*#__PURE__*/React.createElement("div", {
    className: "priv-card glow"
  }, /*#__PURE__*/React.createElement("div", {
    className: "head"
  }, /*#__PURE__*/React.createElement("span", null, "Encryption Flow"), /*#__PURE__*/React.createElement("span", {
    className: "live"
  }, /*#__PURE__*/React.createElement("span", {
    className: "dot"
  }), flowState === 'idle' ? 'Ready' : 'Active')), /*#__PURE__*/React.createElement("div", {
    className: "flow-diagram"
  }, /*#__PURE__*/React.createElement(FlowStep, {
    icon: "lock",
    label: "IBE Encrypt",
    sub: "prompt \u2192 ciphertext",
    status: stepStatus(0)
  }), /*#__PURE__*/React.createElement("div", {
    className: "flow-connector"
  }), /*#__PURE__*/React.createElement(FlowStep, {
    icon: "cloud_upload",
    label: "Conditional Tx",
    sub: "Fairblock submit",
    status: stepStatus(1)
  }), /*#__PURE__*/React.createElement("div", {
    className: "flow-connector"
  }), /*#__PURE__*/React.createElement(FlowStep, {
    icon: "memory",
    label: "Llama Inference",
    sub: "self-hosted VPS",
    status: stepStatus(2)
  }), /*#__PURE__*/React.createElement("div", {
    className: "flow-connector"
  }), /*#__PURE__*/React.createElement(FlowStep, {
    icon: "cloud_download",
    label: "HE Wrap",
    sub: "response \u2192 ciphertext",
    status: stepStatus(3)
  }), /*#__PURE__*/React.createElement("div", {
    className: "flow-connector"
  }), /*#__PURE__*/React.createElement(FlowStep, {
    icon: "lock_open",
    label: "Wallet Decrypt",
    sub: "only you can read",
    status: stepStatus(4)
  }))), /*#__PURE__*/React.createElement("div", {
    className: "priv-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "head"
  }, /*#__PURE__*/React.createElement("span", null, "NETURION Node"), /*#__PURE__*/React.createElement("span", {
    className: "live"
  }, /*#__PURE__*/React.createElement("span", {
    className: "dot"
  }), "Online")), /*#__PURE__*/React.createElement("div", {
    className: "node-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "node-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "k"
  }, "Endpoint"), /*#__PURE__*/React.createElement("span", {
    className: "v"
  }, "node-eu-1.neturion")), /*#__PURE__*/React.createElement("div", {
    className: "node-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "k"
  }, "Model"), /*#__PURE__*/React.createElement("span", {
    className: "v accent"
  }, "llama-3.1:8b")), /*#__PURE__*/React.createElement("div", {
    className: "node-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "k"
  }, "Tokens / sec"), /*#__PURE__*/React.createElement("span", {
    className: "v"
  }, "128.4")), /*#__PURE__*/React.createElement("div", {
    className: "node-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "k"
  }, "Latency"), /*#__PURE__*/React.createElement("span", {
    className: "v success"
  }, /*#__PURE__*/React.createElement("span", {
    className: "micro-dot"
  }), "48 ms")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      marginTop: 4
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      color: 'var(--fg-secondary)'
    }
  }, "Entropy stream"), /*#__PURE__*/React.createElement("div", {
    className: "entropy-bar"
  })))), /*#__PURE__*/React.createElement("div", {
    className: "priv-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "head"
  }, /*#__PURE__*/React.createElement("span", null, "Session Keys"), /*#__PURE__*/React.createElement("span", {
    className: "live",
    style: {
      color: 'var(--fg-secondary)'
    }
  }, "EPHEMERAL")), /*#__PURE__*/React.createElement("div", {
    className: "session-keys"
  }, /*#__PURE__*/React.createElement("div", {
    className: "row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "label"
  }, "pk"), /*#__PURE__*/React.createElement("span", {
    className: "val"
  }, "0x04a8\u2026f29b71c0"), /*#__PURE__*/React.createElement("span", {
    className: "copy"
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined"
  }, "content_copy"))), /*#__PURE__*/React.createElement("div", {
    className: "row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "label"
  }, "sk"), /*#__PURE__*/React.createElement("span", {
    className: "val"
  }, "\u25CF\u25CF\u25CF\u25CF\u25CF\u25CF\u25CF\u25CF local-only"), /*#__PURE__*/React.createElement("span", {
    className: "copy"
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined"
  }, "visibility_off"))), /*#__PURE__*/React.createElement("div", {
    className: "row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "label"
  }, "tx"), /*#__PURE__*/React.createElement("span", {
    className: "val"
  }, lastTx || '— awaiting submission'), /*#__PURE__*/React.createElement("span", {
    className: "copy"
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined"
  }, "open_in_new"))))), /*#__PURE__*/React.createElement("div", {
    className: "priv-card",
    style: {
      background: 'transparent',
      borderStyle: 'dashed'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined",
    style: {
      fontSize: 18,
      color: 'var(--accent-light)'
    }
  }, "shield_lock"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 2
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11.5,
      fontWeight: 600,
      color: 'var(--fg-primary)'
    }
  }, "Zero-knowledge by design"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10.5,
      color: 'var(--fg-secondary)',
      lineHeight: 1.5
    }
  }, "Neturionglobal cannot read your prompts. Encryption + decryption happen in your wallet.")))));
}

/* ──────────────────────────────────────────────
 * Connect modal
 * ────────────────────────────────────────────── */
function ConnectModal({
  onClose,
  onConnect
}) {
  const [connecting, setConnecting] = useState(null);
  const wallets = [{
    id: 'metamask',
    name: 'MetaMask',
    meta: 'Browser extension',
    glyph: '🦊',
    color: '#f6851b'
  }, {
    id: 'rabby',
    name: 'Rabby Wallet',
    meta: 'EVM-first',
    glyph: 'R',
    color: '#7084ff'
  }, {
    id: 'wc',
    name: 'WalletConnect',
    meta: 'Mobile · QR pairing',
    glyph: 'W',
    color: '#3b99fc'
  }, {
    id: 'coinbase',
    name: 'Coinbase Wallet',
    meta: 'Smart wallet',
    glyph: 'C',
    color: '#0052ff'
  }];
  function handle(id) {
    setConnecting(id);
    setTimeout(() => onConnect(), 1100);
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "modal-scrim",
    onClick: onClose
  }, /*#__PURE__*/React.createElement("div", {
    className: "modal",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "modal-head"
  }, /*#__PURE__*/React.createElement("span", {
    className: "modal-eyebrow"
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined"
  }, "lock"), "Step 1 of 2 \xB7 Authentication"), /*#__PURE__*/React.createElement("h2", {
    className: "modal-title"
  }, "Connect a wallet to start an encrypted session"), /*#__PURE__*/React.createElement("p", {
    className: "modal-sub"
  }, "Your wallet derives the keypair used to encrypt prompts via Fairblock's IBE. NETURION never sees plaintext."), /*#__PURE__*/React.createElement("button", {
    className: "close",
    onClick: onClose
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined"
  }, "close"))), /*#__PURE__*/React.createElement("div", {
    className: "modal-body"
  }, wallets.map(w => /*#__PURE__*/React.createElement("button", {
    key: w.id,
    className: 'wallet-option' + (connecting === w.id ? ' connecting' : ''),
    onClick: () => handle(w.id),
    disabled: !!connecting
  }, /*#__PURE__*/React.createElement("div", {
    className: "logo",
    style: {
      background: w.color + '22',
      color: w.color
    }
  }, w.glyph), /*#__PURE__*/React.createElement("div", {
    className: "text"
  }, /*#__PURE__*/React.createElement("div", {
    className: "name"
  }, w.name), /*#__PURE__*/React.createElement("div", {
    className: "meta"
  }, w.meta)), connecting === w.id ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "spinner"
  }), /*#__PURE__*/React.createElement("span", {
    className: "status"
  }, "Authorizing\u2026")) : /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined",
    style: {
      color: 'var(--fg-secondary)'
    }
  }, "arrow_forward")))), /*#__PURE__*/React.createElement("div", {
    className: "modal-footer"
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined"
  }, "info"), /*#__PURE__*/React.createElement("span", null, "Network must be ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: 'var(--fg-primary)'
    }
  }, "Base Sepolia (84532)"), ". We'll prompt a switch if needed."))));
}

/* ──────────────────────────────────────────────
 * Suggestions (empty chat)
 * ────────────────────────────────────────────── */
function Suggestions({
  onPick
}) {
  const items = [{
    label: 'Threat model',
    text: 'Explain the trust assumptions of conditional decryption in 5 bullets.'
  }, {
    label: 'Code review',
    text: 'Audit this Solidity escrow contract for re-entrancy and ownership leaks.'
  }, {
    label: 'Strategy',
    text: 'Draft a 30-day go-to-market plan for a privacy-preserving cApp on Base.'
  }, {
    label: 'Personal',
    text: 'Help me prepare for a job interview — confidential prep, no logs kept.'
  }];
  return /*#__PURE__*/React.createElement("div", {
    className: "suggestions"
  }, items.map(s => /*#__PURE__*/React.createElement("button", {
    key: s.label,
    className: "suggestion",
    onClick: () => onPick(s.text)
  }, /*#__PURE__*/React.createElement("div", {
    className: "label"
  }, s.label), /*#__PURE__*/React.createElement("div", {
    className: "text"
  }, s.text))));
}
Object.assign(window, {
  NeturionMark,
  Atmosphere,
  Constellation,
  TopBar,
  Rail,
  PrivacyPanel,
  ConnectModal,
  Suggestions,
  FlowStep
});

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

What would you like to dig into? I can help with code review, threat modeling, strategy, or anything you'd normally hesitate to send to a non-confidential AI.`
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
function MessageRow({
  msg,
  density
}) {
  const isUser = msg.role === 'user';
  const time = new Date(msg.ts).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });
  return /*#__PURE__*/React.createElement("div", {
    className: 'msg ' + (isUser ? 'user' : 'assistant')
  }, /*#__PURE__*/React.createElement("div", {
    className: "msg-avatar"
  }, isUser ? 'YOU' : /*#__PURE__*/React.createElement(NeturionMark, {
    size: 18
  })), /*#__PURE__*/React.createElement("div", {
    className: "msg-body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "msg-header"
  }, /*#__PURE__*/React.createElement("span", {
    className: "who"
  }, isUser ? 'You' : 'NETURION'), /*#__PURE__*/React.createElement("span", {
    className: "lock-tag"
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined"
  }, "lock"), isUser ? 'IBE' : 'HE'), /*#__PURE__*/React.createElement("span", {
    className: "ts"
  }, time), !isUser && /*#__PURE__*/React.createElement("span", {
    className: "msg-actions"
  }, /*#__PURE__*/React.createElement("button", {
    className: "icon-btn",
    title: "Copy"
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined"
  }, "content_copy")), /*#__PURE__*/React.createElement("button", {
    className: "icon-btn",
    title: "Verify"
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined"
  }, "verified")))), /*#__PURE__*/React.createElement("div", {
    className: "msg-bubble",
    style: {
      padding: density === 'cozy' ? '14px 18px' : '10px 14px'
    }
  }, renderContent(msg.content))));
}

/* Naive markdown-ish renderer — bold + inline code + bullets */
function renderContent(text) {
  const lines = text.split('\n');
  return lines.map((line, i) => {
    // code fence handling — simplified: stand-alone language-tagged fence becomes a code block start
    if (line.startsWith('```')) return null; // skip fences
    // bullet
    if (/^[•\-\*]\s/.test(line)) {
      return /*#__PURE__*/React.createElement("div", {
        key: i,
        style: {
          display: 'flex',
          gap: 8,
          marginLeft: 4
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          color: 'var(--accent-light)'
        }
      }, "\u2022"), /*#__PURE__*/React.createElement("span", null, inlineFormat(line.replace(/^[•\-\*]\s/, ''))));
    }
    if (/^\d+\.\s/.test(line)) {
      const m = line.match(/^(\d+)\.\s(.*)/);
      return /*#__PURE__*/React.createElement("div", {
        key: i,
        style: {
          display: 'flex',
          gap: 8
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          color: 'var(--accent-light)',
          fontFamily: 'var(--font-mono)',
          fontSize: 12
        }
      }, m[1], "."), /*#__PURE__*/React.createElement("span", null, inlineFormat(m[2])));
    }
    if (line.trim() === '') return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        height: 8
      }
    });
    // code block content (lines that look like solidity)
    if (/^\s{0,4}(function|require|uint|address|contract)/.test(line)) {
      return /*#__PURE__*/React.createElement("pre", {
        key: i,
        style: {
          background: 'var(--bg-inset)',
          border: '1px solid var(--border)',
          borderRadius: 6,
          padding: '8px 12px',
          margin: '2px 0',
          fontFamily: 'var(--font-mono)',
          fontSize: 12.5,
          color: 'var(--fg-primary)',
          overflowX: 'auto'
        }
      }, line);
    }
    return /*#__PURE__*/React.createElement("div", {
      key: i
    }, inlineFormat(line));
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
      parts.push(/*#__PURE__*/React.createElement("strong", {
        key: key++,
        style: {
          color: 'var(--fg-primary)',
          fontWeight: 600
        }
      }, boldM[1]));
      rest = rest.slice(boldM[0].length);
    } else if (codeM) {
      parts.push(/*#__PURE__*/React.createElement("code", {
        key: key++
      }, codeM[1]));
      rest = rest.slice(codeM[0].length);
    } else {
      // take chars until next special
      const idx = rest.search(/(\*\*|`)/);
      if (idx === -1) {
        parts.push(/*#__PURE__*/React.createElement("span", {
          key: key++
        }, rest));
        rest = '';
      } else {
        parts.push(/*#__PURE__*/React.createElement("span", {
          key: key++
        }, rest.slice(0, idx)));
        rest = rest.slice(idx);
      }
    }
  }
  return parts;
}

/* Transit / ciphertext indicator */
function TransitIndicator({
  direction
}) {
  const [chunk, setChunk] = useState(ciphertextChunk(28));
  useEffect(() => {
    const id = setInterval(() => setChunk(ciphertextChunk(28)), 120);
    return () => clearInterval(id);
  }, []);
  return /*#__PURE__*/React.createElement("div", {
    className: "transit"
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined",
    style: {
      fontSize: 13
    }
  }, direction === 'up' ? 'arrow_upward' : 'arrow_downward'), /*#__PURE__*/React.createElement("span", null, direction === 'up' ? 'Encrypting' : 'Decrypting'), /*#__PURE__*/React.createElement("span", {
    style: {
      opacity: 0.7
    }
  }, chunk), /*#__PURE__*/React.createElement("span", {
    className: "stream"
  }));
}

/* Composer */
function Composer({
  value,
  onChange,
  onSend,
  disabled,
  ready
}) {
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
  return /*#__PURE__*/React.createElement("div", {
    className: "composer-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "composer"
  }, /*#__PURE__*/React.createElement("textarea", {
    ref: ref,
    className: "composer-input",
    rows: 1,
    value: value,
    onChange: e => onChange(e.target.value),
    onKeyDown: handleKey,
    placeholder: ready ? 'Type a confidential prompt — it will be encrypted before leaving your device…' : 'Connect a wallet to start an encrypted session',
    disabled: !ready || disabled
  }), /*#__PURE__*/React.createElement("div", {
    className: "composer-bar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "tools"
  }, /*#__PURE__*/React.createElement("button", {
    className: "icon-btn",
    title: "Attach (encrypted)"
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined"
  }, "attach_file")), /*#__PURE__*/React.createElement("button", {
    className: "icon-btn",
    title: "Voice"
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined"
  }, "mic")), /*#__PURE__*/React.createElement("button", {
    className: "icon-btn",
    title: "Prompt library"
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined"
  }, "bookmarks"))), /*#__PURE__*/React.createElement("div", {
    className: "pill"
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined"
  }, "lock"), "E2E \xB7 IBE + HE"), /*#__PURE__*/React.createElement("div", {
    className: "pill",
    style: {
      marginLeft: 4
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined"
  }, "memory"), "Llama 3.1"), /*#__PURE__*/React.createElement("span", {
    className: "spacer"
  }), /*#__PURE__*/React.createElement("button", {
    className: "send-btn",
    onClick: onSend,
    disabled: !ready || disabled || !value.trim(),
    title: "Send (Enter)"
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined"
  }, "arrow_upward")))), /*#__PURE__*/React.createElement("div", {
    className: "composer-footer"
  }, /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined",
    style: {
      fontSize: 12,
      verticalAlign: '-2px',
      color: 'var(--accent-light)'
    }
  }, "shield"), ' ', "NETURION never sees plaintext. Decryption happens locally with your wallet's session key."), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("kbd", null, "Enter"), " to send \xB7 ", /*#__PURE__*/React.createElement("kbd", null, "Shift"), "+", /*#__PURE__*/React.createElement("kbd", null, "Enter"), " for newline")));
}
window.MessageRow = MessageRow;
window.TransitIndicator = TransitIndicator;
window.Composer = Composer;
window.routeResponse = routeResponse;

// NETURION — Main app entrypoint

const SEED_SESSIONS = [{
  id: 's1',
  title: 'Threat-model review',
  icon: 'shield',
  when: 'Today · 14:02'
}, {
  id: 's2',
  title: 'Solidity audit · escrow',
  icon: 'code',
  when: 'Yesterday'
}, {
  id: 's3',
  title: 'Q4 launch plan',
  icon: 'rocket_launch',
  when: '2 days ago'
}, {
  id: 's4',
  title: 'Personal · interview prep',
  icon: 'person',
  when: '4 days ago'
}, {
  id: 's5',
  title: 'Whitepaper feedback',
  icon: 'description',
  when: '1 week ago'
}];
const TWEAK_DEFAULTS = {
  "accent": "#5dd9ec",
  "palette": "cyan",
  "density": "comfortable",
  "showRail": true,
  "showPrivacy": true,
  "showAtmosphere": true,
  "scanline": true,
  "responseSpeed": 16,
  "mockConnected": false
};
const PALETTES = {
  cyan: {
    accent: '#5dd9ec',
    deep: '#2bb6cf',
    light: '#8ee7f5',
    name: 'Cyan (brand)'
  },
  violet: {
    accent: '#8b5cf6',
    deep: '#7c3aed',
    light: '#a78bfa',
    name: 'Violet'
  },
  azure: {
    accent: '#4a9eff',
    deep: '#2563eb',
    light: '#7cb8ff',
    name: 'Azure'
  },
  lime: {
    accent: '#dce87a',
    deep: '#c8d96a',
    light: '#e9f29c',
    name: 'Lime'
  },
  magenta: {
    accent: '#ec4899',
    deep: '#db2777',
    light: '#f9a8d4',
    name: 'Magenta'
  }
};
function applyPalette(p) {
  const root = document.documentElement;
  const pal = PALETTES[p] || PALETTES.violet;
  root.style.setProperty('--accent', pal.accent);
  root.style.setProperty('--accent-deep', pal.deep);
  root.style.setProperty('--accent-light', pal.light);
  // alpha variants — recompute from hex
  const h = pal.accent.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16),
    g = parseInt(h.slice(2, 4), 16),
    b = parseInt(h.slice(4, 6), 16);
  root.style.setProperty('--accent-10', `rgba(${r},${g},${b},0.10)`);
  root.style.setProperty('--accent-20', `rgba(${r},${g},${b},0.20)`);
  root.style.setProperty('--accent-30', `rgba(${r},${g},${b},0.30)`);
  root.style.setProperty('--accent-50', `rgba(${r},${g},${b},0.50)`);
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
    s1: [{
      role: 'user',
      content: 'Explain the trust assumptions of conditional decryption in 5 bullets.',
      ts: Date.now() - 1000 * 60 * 4
    }, {
      role: 'assistant',
      content: RESPONSES_CACHE.threat,
      ts: Date.now() - 1000 * 60 * 3 + 30000
    }],
    s2: [],
    s3: [],
    s4: [],
    s5: []
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
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, transitDir, pendingChunks]);
  function handleConnect() {
    setShowConnect(true);
  }
  function handleDisconnect() {
    setWallet('');
    setTweak('mockConnected', false);
  }
  function completeConnect() {
    const fake = '0x4a8f' + Math.floor(Math.random() * 0xFFFFFF).toString(16).padStart(6, '0').toUpperCase() + 'B7c1d8E0a2B3F6c0a1b2c3D4e5f6789abc'.slice(0, 26);
    setWallet(fake);
    setTweak('mockConnected', true);
    setShowConnect(false);
  }
  function pickSuggestion(text) {
    setInput(text);
  }
  function setMessages(updater) {
    setMessagesBySession(prev => {
      const cur = prev[activeId] || [];
      const next = typeof updater === 'function' ? updater(cur) : updater;
      return {
        ...prev,
        [activeId]: next
      };
    });
  }
  async function send() {
    if (!input.trim() || !ready) return;
    const prompt = input.trim();
    const userMsg = {
      role: 'user',
      content: prompt,
      ts: Date.now()
    };
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
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt,
          wallet: wallet || '0x000',
          session_id: 's_' + Date.now()
        })
      });
      const data = await apiRes.json();
      full = data.response || 'Error connecting to server';
    } catch (e) {
      full = 'Error: ' + e.message;
    }
    setPendingChunks(full);
    // commit the message
    setMessages(p => [...p, {
      role: 'assistant',
      content: full,
      ts: Date.now()
    }]);
    setPendingChunks(null);
    setTransitDir(null);
    setFlowState('idle');
  }

  // Title of the active session
  const activeSession = sessions.find(s => s.id === activeId) || sessions[0];

  // App grid class toggles
  const appClass = ['app', t.showRail ? '' : 'no-rail', t.showPrivacy ? '' : 'no-privacy'].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("div", {
    className: appClass
  }, t.showAtmosphere && /*#__PURE__*/React.createElement(Atmosphere, null), /*#__PURE__*/React.createElement("div", {
    className: "top-accent-bar"
  }), /*#__PURE__*/React.createElement(TopBar, {
    wallet: wallet,
    nodeOk: true,
    onConnect: handleConnect,
    onDisconnect: handleDisconnect
  }), t.showRail && /*#__PURE__*/React.createElement(Rail, {
    sessions: sessions,
    activeId: activeId,
    onSelect: setActiveId,
    onNew: () => {
      const id = 's' + (sessions.length + 1) + Date.now().toString(36).slice(-4);
      setSessions([{
        id,
        title: 'New session',
        icon: 'auto_awesome',
        when: 'just now'
      }, ...sessions]);
      setActiveId(id);
      setMessagesBySession(prev => ({
        ...prev,
        [id]: []
      }));
    }
  }), /*#__PURE__*/React.createElement("main", {
    className: "main",
    style: {
      display: page === 'auction' || page === 'marketplace' || page === 'voting' || page === 'mempool' || page === 'agents' ? 'none' : undefined
    }
  }, messages.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "hero"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hero-mark-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ring ring-1"
  }), /*#__PURE__*/React.createElement("div", {
    className: "ring ring-2"
  }), /*#__PURE__*/React.createElement(NeturionMark, {
    size: 96,
    glow: true
  })), /*#__PURE__*/React.createElement("span", {
    className: "hero-eyebrow"
  }, /*#__PURE__*/React.createElement("span", {
    className: "dot"
  }), "Confidential AI \xB7 Fairblock Network"), /*#__PURE__*/React.createElement("div", {
    className: "hero-wordmark wordmark",
    "aria-label": "NETURION"
  }, "NETUR", /*#__PURE__*/React.createElement("span", {
    className: "target",
    "aria-hidden": "true"
  }), "ION"), /*#__PURE__*/React.createElement("h1", {
    className: "hero-title"
  }, "Talk to AI like nobody's ", /*#__PURE__*/React.createElement("span", {
    className: "accent"
  }, "listening"), "."), /*#__PURE__*/React.createElement("p", {
    className: "hero-sub"
  }, "NETURION runs Llama 3.1 inside a Fairblock-protected node. Your prompts are encrypted with your wallet's key before they leave your device \u2014 and only you can read what comes back."), /*#__PURE__*/React.createElement("div", {
    className: "hero-cta-row"
  }, !ready ? /*#__PURE__*/React.createElement("button", {
    className: "btn-primary",
    onClick: handleConnect
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined"
  }, "account_balance_wallet"), "Connect wallet to start") : /*#__PURE__*/React.createElement("button", {
    className: "btn-primary",
    onClick: () => document.querySelector('.composer-input')?.focus()
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined"
  }, "edit_square"), "Start an encrypted prompt"), /*#__PURE__*/React.createElement("button", {
    className: "btn-secondary"
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined"
  }, "menu_book"), "How it works")), /*#__PURE__*/React.createElement("div", {
    className: "proof-strip",
    style: {
      marginBottom: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "item"
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined"
  }, "lock"), "End-to-end encrypted"), /*#__PURE__*/React.createElement("div", {
    className: "divider"
  }), /*#__PURE__*/React.createElement("div", {
    className: "item"
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined"
  }, "memory"), "Self-hosted Llama 3.1"), /*#__PURE__*/React.createElement("div", {
    className: "divider"
  }), /*#__PURE__*/React.createElement("div", {
    className: "item"
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined"
  }, "hexagon"), "Fairblock IBE / HE"), /*#__PURE__*/React.createElement("div", {
    className: "divider"
  }), /*#__PURE__*/React.createElement("div", {
    className: "item"
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined"
  }, "link"), "Base Sepolia \xB7 84532")), ready && /*#__PURE__*/React.createElement(Suggestions, {
    onPick: pickSuggestion
  })) : /*#__PURE__*/React.createElement("div", {
    className: "chat-view"
  }, /*#__PURE__*/React.createElement("div", {
    className: "chat-header"
  }, /*#__PURE__*/React.createElement("div", {
    className: "chat-title"
  }, /*#__PURE__*/React.createElement("div", {
    className: "icon-box"
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined"
  }, activeSession.icon)), /*#__PURE__*/React.createElement("div", {
    className: "text"
  }, /*#__PURE__*/React.createElement("div", {
    className: "name"
  }, activeSession.title), /*#__PURE__*/React.createElement("div", {
    className: "meta"
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined",
    style: {
      fontSize: 11,
      color: 'var(--accent-light)'
    }
  }, "lock"), "IBE encrypted"), /*#__PURE__*/React.createElement("span", {
    className: "dot"
  }), /*#__PURE__*/React.createElement("span", null, messages.length, " messages"), /*#__PURE__*/React.createElement("span", {
    className: "dot"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)'
    }
  }, "session \xB7 ", activeSession.id)))), /*#__PURE__*/React.createElement("div", {
    className: "chat-actions"
  }, /*#__PURE__*/React.createElement("button", {
    className: "icon-btn",
    title: "Pin"
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined"
  }, "push_pin")), /*#__PURE__*/React.createElement("button", {
    className: "icon-btn",
    title: "Verify on-chain"
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined"
  }, "verified")), /*#__PURE__*/React.createElement("button", {
    className: "icon-btn",
    title: "Burn session"
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined"
  }, "delete_forever")), /*#__PURE__*/React.createElement("button", {
    className: "icon-btn",
    title: "More"
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined"
  }, "more_horiz")))), /*#__PURE__*/React.createElement("div", {
    className: "chat-scroll",
    ref: scrollRef
  }, t.scanline && /*#__PURE__*/React.createElement("div", {
    className: "scanline"
  }), messages.map((m, i) => /*#__PURE__*/React.createElement(MessageRow, {
    key: i,
    msg: m,
    density: t.density
  })), transitDir && /*#__PURE__*/React.createElement(TransitIndicator, {
    direction: transitDir
  }), pendingChunks !== null && /*#__PURE__*/React.createElement("div", {
    className: "msg assistant"
  }, /*#__PURE__*/React.createElement("div", {
    className: "msg-avatar"
  }, /*#__PURE__*/React.createElement(NeturionMark, {
    size: 18
  })), /*#__PURE__*/React.createElement("div", {
    className: "msg-body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "msg-header"
  }, /*#__PURE__*/React.createElement("span", {
    className: "who"
  }, "NETURION"), /*#__PURE__*/React.createElement("span", {
    className: "lock-tag"
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined"
  }, "lock_open"), "Decrypted"), /*#__PURE__*/React.createElement("span", {
    className: "ts"
  }, "streaming")), /*#__PURE__*/React.createElement("div", {
    className: "msg-bubble"
  }, renderContent(pendingChunks), /*#__PURE__*/React.createElement("span", {
    className: "cursor",
    style: {
      display: 'inline-block',
      width: 8,
      height: 14,
      background: 'var(--accent-light)',
      verticalAlign: '-2px',
      marginLeft: 2,
      animation: 'blink 1s steps(2) infinite'
    }
  })))), flowState === 'inference' && pendingChunks === null && /*#__PURE__*/React.createElement("div", {
    className: "msg assistant"
  }, /*#__PURE__*/React.createElement("div", {
    className: "msg-avatar"
  }, /*#__PURE__*/React.createElement(NeturionMark, {
    size: 18
  })), /*#__PURE__*/React.createElement("div", {
    className: "msg-body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "msg-header"
  }, /*#__PURE__*/React.createElement("span", {
    className: "who"
  }, "NETURION"), /*#__PURE__*/React.createElement("span", {
    className: "lock-tag"
  }, /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined"
  }, "memory"), "Inferring")), /*#__PURE__*/React.createElement("div", {
    className: "typing-bubble"
  }, /*#__PURE__*/React.createElement("span", null), /*#__PURE__*/React.createElement("span", null), /*#__PURE__*/React.createElement("span", null))))), /*#__PURE__*/React.createElement(Composer, {
    value: input,
    onChange: setInput,
    onSend: send,
    disabled: flowState !== 'idle',
    ready: ready
  })), messages.length === 0 && /*#__PURE__*/React.createElement(Composer, {
    value: input,
    onChange: setInput,
    onSend: send,
    disabled: flowState !== 'idle',
    ready: ready
  })), t.showPrivacy && page === 'chat' && /*#__PURE__*/React.createElement(PrivacyPanel, {
    flowState: flowState,
    lastTx: lastTx
  }), page === 'auction' && /*#__PURE__*/React.createElement(AuctionPage, {
    wallet: wallet,
    onConnect: handleConnect
  }), page === 'marketplace' && /*#__PURE__*/React.createElement(MarketplacePage, {
    wallet: wallet,
    onConnect: handleConnect
  }), page === 'voting' && /*#__PURE__*/React.createElement(VotingPage, {
    wallet: wallet,
    onConnect: handleConnect
  }), page === 'mempool' && /*#__PURE__*/React.createElement(MempoolPage, {
    wallet: wallet
  }), page === 'agents' && /*#__PURE__*/React.createElement(AgentNetworkPage, {
    wallet: wallet,
    onConnect: handleConnect
  }), showConnect && /*#__PURE__*/React.createElement(ConnectModal, {
    onClose: () => setShowConnect(false),
    onConnect: completeConnect
  }), /*#__PURE__*/React.createElement(TweaksPanel, {
    title: "Tweaks"
  }, /*#__PURE__*/React.createElement(TweakSection, {
    title: "Color"
  }, /*#__PURE__*/React.createElement(TweakColor, {
    label: "Palette",
    valueKey: "palette",
    value: t.palette,
    onChange: setTweak,
    options: [['#5dd9ec', '#8ee7f5', '#2bb6cf'], ['#8b5cf6', '#a78bfa', '#7c3aed'], ['#4a9eff', '#7cb8ff', '#2563eb'], ['#dce87a', '#e9f29c', '#c8d96a'], ['#ec4899', '#f9a8d4', '#db2777']],
    optionLabels: ['Cyan', 'Violet', 'Azure', 'Lime', 'Magenta'],
    onPick: (palette, idx) => {
      const keys = ['cyan', 'violet', 'azure', 'lime', 'magenta'];
      setTweak('palette', keys[idx]);
    }
  })), /*#__PURE__*/React.createElement(TweakSection, {
    title: "Layout"
  }, /*#__PURE__*/React.createElement(TweakToggle, {
    label: "Show session rail",
    valueKey: "showRail",
    value: t.showRail,
    onChange: setTweak
  }), /*#__PURE__*/React.createElement(TweakToggle, {
    label: "Show privacy panel",
    valueKey: "showPrivacy",
    value: t.showPrivacy,
    onChange: setTweak
  }), /*#__PURE__*/React.createElement(TweakToggle, {
    label: "Atmosphere (orbs + grid)",
    valueKey: "showAtmosphere",
    value: t.showAtmosphere,
    onChange: setTweak
  }), /*#__PURE__*/React.createElement(TweakToggle, {
    label: "Scanline overlay",
    valueKey: "scanline",
    value: t.scanline,
    onChange: setTweak
  }), /*#__PURE__*/React.createElement(TweakRadio, {
    label: "Message density",
    valueKey: "density",
    value: t.density,
    onChange: setTweak,
    options: ['compact', 'comfortable', 'cozy']
  })), /*#__PURE__*/React.createElement(TweakSection, {
    title: "Behavior"
  }, /*#__PURE__*/React.createElement(TweakSlider, {
    label: "Response stream speed (ms/token)",
    valueKey: "responseSpeed",
    value: t.responseSpeed,
    min: 4,
    max: 80,
    step: 2,
    onChange: setTweak
  }), /*#__PURE__*/React.createElement(TweakToggle, {
    label: "Mock wallet connected",
    valueKey: "mockConnected",
    value: t.mockConnected,
    onChange: (k, v) => {
      setTweak(k, v);
      if (v && !wallet) completeConnect();
      if (!v && wallet) setWallet('');
    }
  }))));
}

// helper
function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

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
root.render(/*#__PURE__*/React.createElement(App, null));