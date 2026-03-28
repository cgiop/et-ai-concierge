import { useState, useRef, useEffect, useCallback } from "react";

// ─── BACKEND URL — change this when backend is ready ─────────────────────────
const API_BASE = "http://localhost:5000";

const apiCall = async (endpoint, body) => {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    console.warn(`${endpoint} failed:`, e.message);
    return null; // null = use fallback UI data
  }
};

// ─── STYLES ───────────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;900&family=Syne:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');

  :root {
    --bg: #07080d; --bg2: #0c0e18; --surface: #131726; --surface2: #1a1f30;
    --border: rgba(255,255,255,0.06); --border2: rgba(255,255,255,0.11);
    --gold: #e8b84b; --gold2: #f5d07a; --gold-dim: rgba(232,184,75,0.11);
    --cyan: #00d4c8; --cyan-dim: rgba(0,212,200,0.09);
    --violet: #7c6cff; --violet-dim: rgba(124,108,255,0.11);
    --green: #22d67a; --green-dim: rgba(34,214,122,0.11);
    --red: #ff4d6a; --red-dim: rgba(255,77,106,0.11);
    --text: #e8eaf2; --text2: #8890aa; --text3: #4e5470;
    --mono: 'JetBrains Mono', monospace;
    --display: 'Playfair Display', serif;
    --body: 'Syne', sans-serif;
    --sb: 230px; --hdr: 56px; --panel: 300px;
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body, #root { height: 100%; overflow: hidden; }
  body { font-family: var(--body); background: var(--bg); color: var(--text); -webkit-font-smoothing: antialiased; }
  ::-webkit-scrollbar { width: 2px; } ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.07); border-radius: 2px; }

  .bg-grid { position: fixed; inset: 0; pointer-events: none; z-index: 0; background-image: linear-gradient(rgba(255,255,255,0.011) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.011) 1px,transparent 1px); background-size: 44px 44px; }
  .app { display: flex; height: 100vh; overflow: hidden; position: relative; z-index: 1; }
  @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }

  /* ── SIDEBAR ── */
  .sb { width: var(--sb); background: var(--bg2); border-right: 1px solid var(--border); display: flex; flex-direction: column; flex-shrink: 0; overflow: hidden; }

  .sb-brand { padding: 18px 16px 16px; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 11px; }
  .sb-logo { width: 36px; height: 36px; border-radius: 9px; flex-shrink: 0; background: linear-gradient(135deg,var(--gold),#c8780a); display: flex; align-items: center; justify-content: center; font-family: var(--display); font-size: 13px; font-weight: 700; color: #0a0800; box-shadow: 0 0 18px rgba(232,184,75,0.22); position: relative; }
  .sb-logo::after { content:''; position:absolute; inset:-2px; border-radius:11px; border:1px solid rgba(232,184,75,0.28); animation:logoRing 3s ease-in-out infinite; }
  @keyframes logoRing { 0%,100%{opacity:0.3} 50%{opacity:0.9} }
  .sb-brand-name { font-family: var(--display); font-size: 13.5px; font-weight: 700; }
  .sb-brand-sub { font-size: 8.5px; font-weight: 600; letter-spacing: 0.13em; text-transform: uppercase; color: var(--text3); margin-top: 2px; }

  /* profile — compact */
  .sb-profile { padding: 14px 16px; border-bottom: 1px solid var(--border); }
  .sb-profile-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 7px; }
  .sb-profile-label { font-size: 9px; font-weight: 700; letter-spacing: 0.13em; text-transform: uppercase; color: var(--text3); }
  .sb-profile-pct { font-family: var(--mono); font-size: 11px; font-weight: 700; color: var(--gold); }
  .prog-track { width: 100%; height: 3px; background: rgba(255,255,255,0.05); border-radius: 2px; overflow: hidden; margin-bottom: 10px; }
  .prog-fill { height: 100%; border-radius: 2px; background: linear-gradient(90deg,var(--gold),var(--cyan)); transition: width 0.8s cubic-bezier(0.4,0,0.2,1); }
  .profile-dots { display: flex; gap: 5px; }
  .pdot { flex: 1; height: 3px; border-radius: 2px; background: rgba(255,255,255,0.07); transition: all 0.4s; }
  .pdot.filled { background: linear-gradient(90deg,var(--gold),var(--cyan)); box-shadow: 0 0 6px rgba(232,184,75,0.3); }
  .pf-list { display: flex; flex-direction: column; gap: 3px; margin-top: 9px; }
  .pf-item { display: flex; align-items: center; gap: 6px; padding: 4px 7px; border-radius: 5px; background: rgba(232,184,75,0.05); border: 1px solid rgba(232,184,75,0.1); animation: fadeUp 0.2s ease; }
  .pf-key { font-size: 8.5px; color: var(--text3); text-transform: capitalize; min-width: 48px; }
  .pf-val { font-size: 9.5px; font-weight: 700; color: var(--gold2); margin-left: auto; max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: right; }

  /* nav */
  .sb-nav { flex: 1; overflow-y: auto; padding: 10px 8px; }
  .nav-group { font-size: 8px; font-weight: 700; letter-spacing: 0.17em; text-transform: uppercase; color: var(--text3); padding: 0 8px; margin: 12px 0 4px; }
  .nav-group:first-child { margin-top: 4px; }
  .nav-btn { width: 100%; display: flex; align-items: center; gap: 8px; padding: 7px 9px; border-radius: 7px; border: none; cursor: pointer; background: none; font-family: var(--body); font-size: 11px; font-weight: 500; color: var(--text3); text-align: left; transition: all 0.15s; }
  .nav-btn:hover { background: rgba(255,255,255,0.04); color: var(--text2); }
  .nav-btn.active { background: var(--gold-dim); color: var(--gold2); border: 1px solid rgba(232,184,75,0.16); }
  .nav-btn .ni { font-size: 12px; flex-shrink: 0; }
  .nav-badge { margin-left: auto; font-size: 8px; font-weight: 700; background: var(--gold); color: var(--bg); padding: 1px 5px; border-radius: 5px; font-family: var(--mono); }

  /* channels */
  .sb-channels { padding: 12px 16px; border-top: 1px solid var(--border); flex-shrink: 0; }
  .sb-channels-label { font-size: 8.5px; font-weight: 700; letter-spacing: 0.13em; text-transform: uppercase; color: var(--text3); margin-bottom: 8px; }
  .ch-row { display: flex; gap: 4px; flex-wrap: wrap; }
  .ch-chip { font-size: 8px; font-weight: 700; letter-spacing: 0.07em; text-transform: uppercase; padding: 3px 8px; border-radius: 4px; cursor: pointer; background: rgba(255,255,255,0.03); color: var(--text3); border: 1px solid var(--border); transition: all 0.15s; font-family: var(--mono); }
  .ch-chip:hover { background: rgba(255,255,255,0.06); }
  .ch-chip.on { background: var(--cyan-dim); color: var(--cyan); border-color: rgba(0,212,200,0.22); }

  /* ── MAIN ── */
  .main { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-width: 0; }

  .chat-hdr { height: var(--hdr); background: rgba(12,14,24,0.97); border-bottom: 1px solid var(--border); display: flex; align-items: center; padding: 0 20px; gap: 12px; flex-shrink: 0; backdrop-filter: blur(12px); }
  .hdr-av { width: 34px; height: 34px; border-radius: 50%; flex-shrink: 0; background: linear-gradient(135deg,var(--gold),var(--cyan)); display: flex; align-items: center; justify-content: center; font-family: var(--display); font-size: 11px; font-weight: 700; color: var(--bg); position: relative; }
  .hdr-av::after { content:''; position:absolute; bottom:0; right:0; width:8px; height:8px; border-radius:50%; background:var(--green); border:2px solid var(--bg2); }
  .hdr-info { flex: 1; }
  .hdr-name { font-family: var(--display); font-size: 14px; font-weight: 700; }
  .hdr-sub { font-size: 10px; color: var(--text3); margin-top: 1px; }
  .pipeline-pill { display: flex; align-items: center; gap: 2px; background: rgba(255,255,255,0.03); border: 1px solid var(--border2); border-radius: 6px; padding: 4px 10px; font-family: var(--mono); font-size: 8.5px; }
  .pp-step { padding: 2px 5px; border-radius: 3px; color: var(--text3); font-weight: 600; transition: all 0.3s; }
  .pp-step.active { background: var(--cyan-dim); color: var(--cyan); }
  .pp-sep { color: var(--text3); opacity: 0.3; }
  .hdr-btns { display: flex; gap: 5px; }
  .hdr-btn { width: 30px; height: 30px; border-radius: 7px; border: 1px solid var(--border); background: rgba(255,255,255,0.03); cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 12px; color: var(--text3); transition: all 0.15s; }
  .hdr-btn:hover { background: rgba(255,255,255,0.07); color: var(--text); }

  /* messages */
  .msgs { flex: 1; overflow-y: auto; padding: 20px 22px; display: flex; flex-direction: column; gap: 14px; scroll-behavior: smooth; }
  .msg-row { display: flex; gap: 9px; align-items: flex-end; animation: fadeUp 0.25s ease; }
  .msg-row.user { flex-direction: row-reverse; }
  .msg-av { width: 27px; height: 27px; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-family: var(--display); font-size: 9px; font-weight: 700; }
  .msg-av.bot { background: linear-gradient(135deg,var(--gold),var(--cyan)); color: var(--bg); }
  .msg-av.usr { background: var(--surface2); color: var(--text2); border: 1px solid var(--border2); }
  .msg-body { max-width: 74%; display: flex; flex-direction: column; gap: 4px; }
  .msg-row.user .msg-body { align-items: flex-end; }

  .agent-label { font-size: 8px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; padding: 2px 7px; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px; font-family: var(--mono); margin-bottom: 3px; width: fit-content; }
  .al-profiler    { background: var(--violet-dim); color: var(--violet); border: 1px solid rgba(124,108,255,0.18); }
  .al-recommender { background: var(--gold-dim);   color: var(--gold);   border: 1px solid rgba(232,184,75,0.18); }
  .al-rag         { background: var(--cyan-dim);   color: var(--cyan);   border: 1px solid rgba(0,212,200,0.18); }
  .al-action      { background: var(--green-dim);  color: var(--green);  border: 1px solid rgba(34,214,122,0.18); }
  .al-concierge   { background: rgba(255,255,255,0.04); color: var(--text3); border: 1px solid var(--border); }

  .bubble { padding: 11px 15px; font-size: 13px; line-height: 1.7; border-radius: 15px; }
  .bubble.bot { background: var(--surface); border: 1px solid var(--border2); border-bottom-left-radius: 4px; color: var(--text); }
  .bubble.user { background: linear-gradient(135deg,#0c6a6e,#0a5054); border: 1px solid rgba(0,212,200,0.18); border-bottom-right-radius: 4px; color: #ddfdfb; }
  .msg-ts { font-family: var(--mono); font-size: 8px; color: var(--text3); padding: 0 2px; }

  .typing { display: flex; align-items: center; gap: 5px; padding: 12px 15px; background: var(--surface); border: 1px solid var(--border2); border-radius: 15px; border-bottom-left-radius: 4px; }
  .td { width: 5px; height: 5px; border-radius: 50%; animation: tdB 1.3s ease infinite; }
  .td:nth-child(1){background:var(--cyan)} .td:nth-child(2){background:var(--gold);animation-delay:.15s} .td:nth-child(3){background:var(--violet);animation-delay:.3s}
  @keyframes tdB { 0%,60%,100%{transform:translateY(0);opacity:0.3} 30%{transform:translateY(-5px);opacity:1} }
  .typing-label { font-size: 9.5px; color: var(--text3); font-family: var(--mono); margin-left: 3px; }

  .qrs { display: flex; gap: 6px; flex-wrap: wrap; padding-left: 36px; }
  .qr { padding: 6px 14px; border-radius: 20px; font-size: 11px; font-weight: 600; border: 1px solid rgba(232,184,75,0.25); background: none; cursor: pointer; font-family: var(--body); color: var(--gold); transition: all 0.18s; }
  .qr:hover { background: var(--gold); color: var(--bg); transform: translateY(-2px); box-shadow: 0 4px 16px rgba(232,184,75,0.2); }

  /* profile card */
  .profile-card { background: var(--surface); border: 1px solid rgba(232,184,75,0.16); border-radius: 13px; overflow: hidden; margin-top: 4px; }
  .pc-top { padding: 13px 15px; border-bottom: 1px solid var(--border); background: linear-gradient(135deg,rgba(232,184,75,0.06),rgba(0,212,200,0.03)); display: flex; align-items: center; gap: 10px; }
  .pc-av { width: 38px; height: 38px; border-radius: 50%; background: linear-gradient(135deg,var(--gold),var(--cyan)); display: flex; align-items: center; justify-content: center; font-family: var(--display); font-size: 14px; font-weight: 700; color: var(--bg); }
  .pc-name { font-family: var(--display); font-size: 13px; font-weight: 700; }
  .pc-meta { font-size: 9.5px; color: var(--text3); margin-top: 2px; }
  .pc-body { padding: 13px 15px; }
  .pc-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; margin-bottom: 11px; }
  .pc-stat { padding: 8px 11px; border-radius: 8px; background: rgba(255,255,255,0.02); border: 1px solid var(--border); }
  .pc-sk { font-size: 8px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--text3); margin-bottom: 4px; }
  .pc-sv { font-size: 11.5px; font-weight: 700; color: var(--gold2); }
  .pc-tags { display: flex; gap: 5px; flex-wrap: wrap; }
  .pc-tag { font-size: 9px; font-weight: 700; padding: 3px 8px; border-radius: 7px; background: var(--cyan-dim); color: var(--cyan); border: 1px solid rgba(0,212,200,0.16); }

  /* rec cards */
  .rec-list { display: flex; flex-direction: column; gap: 6px; margin-top: 4px; }
  .rec-card { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 11px 13px; display: flex; gap: 10px; align-items: flex-start; cursor: pointer; transition: all 0.18s; position: relative; overflow: hidden; }
  .rec-card::before { content:''; position:absolute; left:0; top:0; bottom:0; width:2px; background:var(--gold); opacity:0; transition:opacity 0.2s; }
  .rec-card:hover { border-color: rgba(232,184,75,0.22); transform: translateX(2px); }
  .rec-card:hover::before { opacity: 1; }
  .rec-icon { font-size: 15px; min-width: 28px; height: 28px; background: var(--gold-dim); border-radius: 7px; display: flex; align-items: center; justify-content: center; }
  .rec-info { flex: 1; min-width: 0; }
  .rec-title { font-size: 12px; font-weight: 700; margin-bottom: 3px; }
  .rec-desc { font-size: 10px; color: var(--text2); line-height: 1.5; }
  .rec-reason { font-size: 9px; color: var(--cyan); margin-top: 4px; font-style: italic; }
  .rec-foot { margin-top: 5px; }
  .rbadge { font-size: 7.5px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; padding: 2px 7px; border-radius: 4px; }
  .rb-gold    { background: var(--gold-dim);   color: var(--gold);   border: 1px solid rgba(232,184,75,0.18); }
  .rb-free    { background: var(--green-dim);  color: var(--green);  border: 1px solid rgba(34,214,122,0.16); }
  .rb-event   { background: var(--cyan-dim);   color: var(--cyan);   border: 1px solid rgba(0,212,200,0.18); }
  .rb-partner { background: var(--violet-dim); color: var(--violet); border: 1px solid rgba(124,108,255,0.16); }

  /* financial widget */
  .fin-widget { background: var(--surface); border: 1px solid var(--border2); border-radius: 13px; overflow: hidden; margin-top: 4px; }
  .fw-hdr { padding: 11px 15px; border-bottom: 1px solid var(--border); background: linear-gradient(90deg,rgba(0,212,200,0.04),rgba(232,184,75,0.03)); display: flex; align-items: center; gap: 8px; }
  .fw-title { font-size: 12px; font-weight: 700; flex: 1; }
  .fw-badge { font-family: var(--mono); font-size: 7.5px; padding: 2px 6px; border-radius: 4px; background: var(--cyan-dim); color: var(--cyan); }
  .fw-body { padding: 14px 15px; }
  .fin-meters { display: grid; grid-template-columns: repeat(3,1fr); gap: 8px; margin-bottom: 14px; }
  .fin-meter { text-align: center; }
  .fm-label { font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text3); margin-bottom: 7px; }
  .ring-wrap { position: relative; width: 64px; height: 64px; margin: 0 auto 2px; }
  .ring-wrap svg { transform: rotate(-90deg); }
  .ring-bg { fill: none; stroke: rgba(255,255,255,0.04); stroke-width: 5; }
  .ring-fill { fill: none; stroke-width: 5; stroke-linecap: round; transition: stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1); }
  .ring-val { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-family: var(--mono); font-size: 12px; font-weight: 700; }
  .fin-sugs { display: flex; flex-direction: column; gap: 5px; }
  .fin-sug { display: flex; gap: 8px; align-items: flex-start; padding: 8px 10px; border-radius: 7px; background: rgba(255,255,255,0.02); border: 1px solid var(--border); }
  .fs-icon { font-size: 11px; min-width: 16px; margin-top: 1px; }
  .fs-text { font-size: 10.5px; line-height: 1.55; color: var(--text2); }
  .fs-text strong { color: var(--text); font-weight: 700; }

  /* action result */
  .action-result { background: var(--surface); border: 1px solid rgba(34,214,122,0.18); border-radius: 12px; padding: 13px 15px; margin-top: 4px; }
  .ar-title { font-size: 11.5px; font-weight: 700; color: var(--green); margin-bottom: 9px; }
  .ar-row { display: flex; align-items: center; gap: 8px; font-size: 11px; color: var(--text2); padding: 5px 0; border-bottom: 1px solid var(--border); }
  .ar-row:last-child { border-bottom: none; }
  .ar-ok   { margin-left: auto; font-family: var(--mono); font-size: 9px; font-weight: 700; color: var(--green); }
  .ar-fail { margin-left: auto; font-family: var(--mono); font-size: 9px; font-weight: 700; color: var(--red); }

  /* rag articles */
  .rag-articles { display: flex; flex-direction: column; gap: 5px; margin-top: 4px; }
  .rag-art { background: var(--surface); border: 1px solid var(--border); border-radius: 9px; padding: 9px 12px; }
  .rag-art-title { font-size: 11.5px; font-weight: 700; margin-bottom: 3px; }
  .rag-art-summary { font-size: 10px; color: var(--text2); line-height: 1.5; }
  .rag-art-tags { display: flex; gap: 4px; flex-wrap: wrap; margin-top: 5px; }
  .rag-tag { font-size: 8.5px; font-weight: 600; padding: 2px 6px; border-radius: 5px; background: var(--cyan-dim); color: var(--cyan); }

  /* feedback */
  .fb-widget { background: var(--surface); border: 1px solid var(--border); border-left: 2px solid var(--violet); border-radius: 12px; padding: 13px 15px; margin-top: 4px; }
  .fb-title { font-size: 10px; font-weight: 700; color: var(--text2); letter-spacing: 0.07em; text-transform: uppercase; margin-bottom: 10px; }
  .fb-stars { display: flex; gap: 4px; margin-bottom: 9px; }
  .fb-star { width: 29px; height: 29px; border-radius: 7px; border: 1px solid var(--border2); background: rgba(255,255,255,0.02); cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; transition: all 0.15s; }
  .fb-star:hover,.fb-star.sel { border-color: var(--gold); background: var(--gold-dim); transform: scale(1.1); }
  .fb-thumbs { display: flex; gap: 6px; margin-bottom: 9px; }
  .fb-thumb { flex: 1; padding: 7px; border-radius: 8px; border: 1px solid var(--border2); background: rgba(255,255,255,0.02); cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px; font-size: 11px; font-weight: 600; color: var(--text3); transition: all 0.15s; }
  .fb-thumb.up { border-color: var(--green); background: var(--green-dim); color: var(--green); }
  .fb-thumb.dn { border-color: var(--red);   background: var(--red-dim);   color: var(--red); }
  .fb-tags { display: flex; gap: 5px; flex-wrap: wrap; margin-bottom: 9px; }
  .fb-tag { font-size: 9.5px; padding: 3px 9px; border-radius: 18px; border: 1px solid var(--border2); background: rgba(255,255,255,0.02); cursor: pointer; color: var(--text3); transition: all 0.15s; }
  .fb-tag.sel { border-color: var(--cyan); background: var(--cyan-dim); color: var(--cyan); font-weight: 700; }
  .fb-ta { width: 100%; padding: 8px 11px; border-radius: 7px; border: 1px solid var(--border2); font-family: var(--body); font-size: 11.5px; background: rgba(255,255,255,0.02); color: var(--text); resize: none; outline: none; margin-bottom: 9px; transition: border-color 0.2s; }
  .fb-ta:focus { border-color: var(--violet); } .fb-ta::placeholder { color: var(--text3); }
  .fb-submit { width: 100%; padding: 9px; border-radius: 8px; border: none; cursor: pointer; background: linear-gradient(90deg,var(--violet),#9c8cff); color: white; font-family: var(--body); font-size: 12px; font-weight: 700; transition: all 0.18s; }
  .fb-submit:hover:not(:disabled) { opacity: 0.88; transform: translateY(-1px); }
  .fb-submit:disabled { opacity: 0.35; cursor: not-allowed; }
  .fb-done { text-align: center; padding: 8px 0; }
  .fb-done-icon { font-size: 20px; display: block; margin-bottom: 4px; }
  .fb-done-text { font-size: 12px; color: var(--green); font-weight: 700; }

  /* nudge */
  .nudge { background: linear-gradient(90deg,rgba(232,184,75,0.05),rgba(0,212,200,0.03)); border: 1px solid rgba(232,184,75,0.16); border-radius: 10px; padding: 10px 13px; display: flex; align-items: center; gap: 10px; cursor: pointer; transition: all 0.18s; animation: fadeUp 0.3s ease; margin-left: 36px; margin-top: 4px; }
  .nudge:hover { box-shadow: 0 4px 16px rgba(232,184,75,0.1); transform: translateY(-1px); }
  .nudge-icon { font-size: 16px; flex-shrink: 0; }
  .nudge-title { font-size: 11px; font-weight: 700; margin-bottom: 1px; }
  .nudge-desc { font-size: 9.5px; color: var(--text2); line-height: 1.4; }
  .nudge-cta { font-size: 9.5px; font-weight: 800; color: var(--gold); white-space: nowrap; }

  /* input */
  .input-area { background: rgba(12,14,24,0.98); border-top: 1px solid var(--border); padding: 13px 20px; flex-shrink: 0; }
  .stage-bar { display: flex; align-items: center; gap: 7px; margin-bottom: 9px; }
  .stage-dot { width: 4px; height: 4px; border-radius: 50%; background: var(--gold); box-shadow: 0 0 6px var(--gold); flex-shrink: 0; }
  .stage-text { font-size: 10px; color: var(--text3); font-weight: 500; flex: 1; }
  .stage-pill { font-size: 7.5px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; padding: 2px 8px; border-radius: 8px; font-family: var(--mono); background: var(--gold-dim); color: var(--gold); border: 1px solid rgba(232,184,75,0.2); }
  .input-row { display: flex; gap: 8px; align-items: flex-end; }
  .input-box { flex: 1; min-height: 42px; max-height: 110px; padding: 11px 16px; border-radius: 22px; border: 1px solid var(--border2); font-family: var(--body); font-size: 13px; resize: none; outline: none; background: var(--surface); color: var(--text); line-height: 1.5; transition: border-color 0.2s; }
  .input-box:focus { border-color: rgba(232,184,75,0.38); } .input-box::placeholder { color: var(--text3); }
  .send-btn { width: 42px; height: 42px; border-radius: 50%; flex-shrink: 0; background: linear-gradient(135deg,var(--gold),#c8780a); border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px; color: var(--bg); transition: all 0.18s; box-shadow: 0 2px 12px rgba(232,184,75,0.22); }
  .send-btn:hover { transform: scale(1.07); box-shadow: 0 4px 20px rgba(232,184,75,0.38); }
  .send-btn:active { transform: scale(0.93); }
  .send-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }

  /* inner monologue panel */
  .panel { background: var(--bg2); border-left: 1px solid var(--border); width: 0; overflow: hidden; flex-shrink: 0; display: flex; flex-direction: column; transition: width 0.32s cubic-bezier(0.4,0,0.2,1); }
  .panel.open { width: var(--panel); }
  .panel-hdr { padding: 13px 15px; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
  .panel-title { font-family: var(--display); font-size: 13px; font-weight: 700; flex: 1; }
  .panel-close { background: none; border: none; cursor: pointer; color: var(--text3); font-size: 13px; }
  .panel-body { flex: 1; overflow-y: auto; padding: 13px 15px; display: flex; flex-direction: column; gap: 14px; }
  .p-sec { font-size: 8px; font-weight: 800; letter-spacing: 0.17em; text-transform: uppercase; color: var(--text3); display: flex; align-items: center; gap: 5px; margin-bottom: 7px; }
  .p-sec::after { content:''; flex:1; height:1px; background:var(--border); }

  .trace { padding: 9px 11px; border-radius: 7px; background: rgba(255,255,255,0.02); border: 1px solid var(--border); margin-bottom: 5px; }
  .trace-agent { font-size: 7.5px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; font-family: var(--mono); margin-bottom: 3px; }
  .ta-profiler{color:var(--violet)} .ta-recommender{color:var(--gold)} .ta-rag{color:var(--cyan)} .ta-action{color:var(--green)} .ta-concierge{color:var(--text3)}
  .trace-text { font-size: 10px; color: var(--text2); line-height: 1.55; }
  .trace-json { font-family: var(--mono); font-size: 8.5px; color: var(--cyan); background: rgba(0,212,200,0.04); border: 1px solid rgba(0,212,200,0.1); border-radius: 5px; padding: 6px 8px; margin-top: 5px; white-space: pre-wrap; word-break: break-all; max-height: 100px; overflow-y: auto; }

  .risk-card { display: flex; align-items: center; gap: 11px; padding: 11px; border-radius: 9px; background: rgba(255,255,255,0.02); border: 1px solid var(--border); margin-bottom: 7px; }
  .risk-ring { position: relative; width: 52px; height: 52px; flex-shrink: 0; }
  .risk-ring svg { transform: rotate(-90deg); }
  .risk-ring-val { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-family: var(--mono); font-size: 10px; font-weight: 700; }
  .risk-label { font-size: 12px; font-weight: 700; margin-bottom: 3px; }
  .risk-desc { font-size: 9.5px; color: var(--text2); line-height: 1.5; }

  .ch-bar { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
  .ch-bar-label { color: var(--text3); min-width: 52px; font-size: 9px; }
  .ch-bar-track { flex: 1; height: 3px; background: rgba(255,255,255,0.04); border-radius: 2px; overflow: hidden; }
  .ch-bar-fill { height: 100%; border-radius: 2px; background: linear-gradient(90deg,var(--cyan),var(--violet)); transition: width 1s ease; }
  .ch-bar-val { font-family: var(--mono); font-size: 9px; color: var(--text2); min-width: 28px; text-align: right; }

  .fb-score-card { padding: 11px; border-radius: 8px; background: rgba(255,255,255,0.02); border: 1px solid var(--border); }
  .fb-score-num { font-family: var(--mono); font-size: 28px; font-weight: 700; color: var(--gold); line-height: 1; }
  .fb-score-meta { font-size: 9.5px; color: var(--text3); margin-top: 2px; }
  .fb-mini-stars { display: flex; gap: 2px; font-size: 10px; margin: 4px 0; }
  .fb-chip { font-size: 8.5px; font-weight: 700; padding: 2px 6px; border-radius: 5px; background: var(--cyan-dim); color: var(--cyan); border: 1px solid rgba(0,212,200,0.14); }

  .stat-row { display: flex; justify-content: space-between; align-items: center; padding: 5px 0; border-bottom: 1px solid var(--border); font-size: 10px; }
  .stat-row:last-child { border-bottom: none; }
  .stat-label { color: var(--text3); } .stat-val { font-family: var(--mono); font-size: 10px; font-weight: 700; color: var(--gold); }

  .evt-row { display: flex; gap: 6px; align-items: flex-start; margin-bottom: 4px; }
  .evt-time { font-family: var(--mono); font-size: 8px; color: var(--text3); white-space: nowrap; padding-top: 1px; }
  .evt-text { font-size: 9.5px; color: var(--text2); }
  .evt-text strong { color: var(--text); font-weight: 700; }

  .toast { position: fixed; top: 14px; right: 14px; z-index: 9999; background: var(--surface2); color: var(--text); padding: 10px 15px; border-radius: 10px; font-size: 12px; font-weight: 600; display: flex; align-items: center; gap: 8px; box-shadow: 0 8px 32px rgba(0,0,0,0.4),0 0 0 1px var(--border2); transition: all 0.3s cubic-bezier(0.4,0,0.2,1); transform: translateY(-60px); opacity: 0; pointer-events: none; }
  .toast.show { transform: none; opacity: 1; }
`;

// ─── STATIC FLOW ──────────────────────────────────────────────────────────────
const FLOW = [
  { id:"greeting", agent:"concierge", bot:"Welcome to **ET Concierge** — your AI-powered financial guide.\n\nI'm running a live multi-agent pipeline connected to your backend: Profiler → Recommender → RAG → Action Dispatcher. Ready to build your profile?", qr:["Let's go 🚀","How does this work?"], next:{"Let's go 🚀":"q1","How does this work?":"about"} },
  { id:"about", agent:"concierge", bot:"My pipeline has 4 real backend endpoints:\n\n**POST /profile** → Extracts your financial persona\n**POST /recommend** → Matches ET products to your profile\n**POST /rag** → Retrieves ET market intelligence\n**POST /action** → Sets up your alerts\n\nShall we begin?", qr:["Yes, start!","Maybe later"], next:{"Yes, start!":"q1","Maybe later":"end_soft"} },
  { id:"q1", agent:"profiler", bot:"What is your primary financial interest?", qr:["📈 Stock Markets","💼 Personal Finance","🏢 Business & Startups","🌍 Economy & Policy"], next:"q2", profileKey:"interests", stageLabel:"Profiler Agent · 1/5", stagePill:"01/05" },
  { id:"q2", agent:"profiler", bot:"What is your primary financial goal?", qr:["🎯 Grow Wealth","🏠 Buy Property","🎓 Child's Education","🌴 Early Retirement"], next:"q3", profileKey:"goal", stageLabel:"Profiler Agent · 2/5", stagePill:"02/05" },
  { id:"q3", agent:"profiler", bot:"How would you describe your current investments?", qr:["Just Starting Out","Mostly Mutual Funds","Diversified Portfolio","Heavy in Stocks/ETFs"], next:"q4", profileKey:"investments", stageLabel:"Profiler Agent · 3/5", stagePill:"03/05" },
  { id:"q4", agent:"profiler", bot:"What is your risk appetite?", qr:["🟢 Conservative","🟡 Moderate","🔴 Aggressive","🤷 Not Sure Yet"], next:"q5", profileKey:"risk", stageLabel:"Profiler Agent · 4/5", stagePill:"04/05" },
  { id:"q5", agent:"profiler", bot:"How do you prefer to consume financial content?", qr:["📰 Daily Articles","🎓 Deep Courses","🔔 Smart Alerts","📊 Data & Analysis"], next:"profile_done", profileKey:"engagement", stageLabel:"Profiler Agent · 5/5", stagePill:"05/05" },
  { id:"end_soft", agent:"concierge", bot:"No problem — I'll be here whenever you're ready. 👋", qr:["Actually, let's start!"], next:{"Actually, let's start!":"q1"} },
];
const FLOWMAP = {};
FLOW.forEach(f => { FLOWMAP[f.id] = f; });

// fallback data shown when backend is not connected yet
const FB_RECS = [
  { icon:"📈", title:"ET Markets Premium",         desc:"Real-time screener, F&O analytics, portfolio tracker.",   badge:"rb-gold",    badgeText:"ET Prime",    reason:"Matches your markets interest and analytical style." },
  { icon:"🎓", title:"Value Investing Masterclass", desc:"12-week deep-dive with industry veterans.",               badge:"rb-event",   badgeText:"Masterclass",  reason:"Aligned with your wealth-building goal." },
  { icon:"🏛️", title:"ET Global Business Summit",   desc:"Network with 500+ founders and investors.",              badge:"rb-event",   badgeText:"Event",        reason:"High ROI for your business interest cluster." },
  { icon:"📰", title:"ET Prime Subscription",       desc:"Unlimited access to in-depth analysis and data.",         badge:"rb-gold",    badgeText:"Premium",      reason:"Core product for your content preference." },
];
const FB_PARTNERS = [
  { icon:"💳", title:"HDFC Moneyback Credit Card",  desc:"5% cashback on investments + zero forex markup.",        badge:"rb-partner", badgeText:"Partner",      reason:"Investment cashback aligns with your portfolio." },
  { icon:"🛡️", title:"LIC Term Insurance",          desc:"₹1 Cr coverage at ₹899/month.",                          badge:"rb-partner", badgeText:"Insurance",    reason:"Financial health analysis found a protection gap." },
  { icon:"🏦", title:"Zerodha Kite Pro",             desc:"Commission-free trading with advanced charting.",        badge:"rb-free",    badgeText:"Free Trial",   reason:"Matches your risk appetite and maturity level." },
];
const FB_COURSES = [
  { icon:"📊", title:"Technical Analysis Bootcamp",  desc:"Candlestick patterns, RSI, MACD, momentum strategies.", badge:"rb-gold",    badgeText:"Premium",      reason:"High relevance to your markets interest." },
  { icon:"🏘️", title:"Real Estate Investing 101",    desc:"From REITs to direct property.",                        badge:"rb-event",   badgeText:"Live Course",  reason:"Diversification gap found in your profile." },
  { icon:"🧠", title:"Behavioral Finance Workshop",  desc:"Understand cognitive biases in investing.",              badge:"rb-free",    badgeText:"Free",         reason:"Recommended for all investor persona types." },
];

const NUDGES = [
  { trigger:"profile_done", icon:"🎓", title:"Unlock deeper insights",    desc:"Users with your profile save 2–3x more with ET Prime.", cta:"Explore ET Prime →" },
  { trigger:"recs",         icon:"🛡️", title:"Protection gap detected",   desc:"₹1 Cr term cover missing. LIC at ₹899/month.",          cta:"Get Quote →" },
  { trigger:"fin_analysis", icon:"📈", title:"Connect your portfolio",     desc:"Link your brokerage for live holdings and alerts.",     cta:"Connect Now →" },
];

const TAG_POS = ["Highly Relevant","Accurate","Great UX","Strong Recommendations","Time-saving"];
const TAG_NEG = ["Too Generic","Not Relevant","Too Many Steps","Missing Products","Unclear"];
const ts = () => new Date().toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" });

// ─── SMALL COMPONENTS ─────────────────────────────────────────────────────────
const AGENT_NAMES = { profiler:"Profiler Agent", recommender:"Recommender Agent", rag:"RAG Module", action:"Action Dispatcher", concierge:"ET Concierge" };

function AgentLabel({ agent }) {
  return <div className={`agent-label al-${agent||"concierge"}`}>◆ {AGENT_NAMES[agent]||"ET Concierge"}</div>;
}

function Txt({ t }) {
  return <>{t.split(/\*\*(.*?)\*\*/g).map((p,i) => i%2===1 ? <strong key={i}>{p}</strong> : p.split("\n").map((l,j)=><span key={j}>{l}{j<p.split("\n").length-1&&<br/>}</span>))}</>;
}

function Ring({ value, color, label }) {
  const r=25,cx=32,cy=32,c=2*Math.PI*r;
  return (
    <div className="fin-meter">
      <div className="fm-label">{label}</div>
      <div className="ring-wrap">
        <svg width="64" height="64" viewBox="0 0 64 64">
          <circle className="ring-bg" cx={cx} cy={cy} r={r}/>
          <circle className="ring-fill" cx={cx} cy={cy} r={r} stroke={color} strokeDasharray={c} strokeDashoffset={c-(value/100)*c}/>
        </svg>
        <div className="ring-val" style={{color}}>{value}%</div>
      </div>
    </div>
  );
}

function ProfileCard({ profile }) {
  return (
    <div className="profile-card">
      <div className="pc-top">
        <div className="pc-av">Y</div>
        <div><div className="pc-name">Your Persona</div><div className="pc-meta">Profiler Agent · Extracted</div></div>
      </div>
      <div className="pc-body">
        <div className="pc-grid">
          {[["Interest",profile.interests],["Goal",profile.goal],["Portfolio",profile.investments],["Risk",profile.risk]].map(([k,v])=>(
            <div className="pc-stat" key={k}><div className="pc-sk">{k}</div><div className="pc-sv">{v||"—"}</div></div>
          ))}
        </div>
        <div className="pc-tags">
          {profile.engagement&&<span className="pc-tag">{profile.engagement}</span>}
          <span className="pc-tag">Personalized ✓</span><span className="pc-tag">Multi-Agent</span>
        </div>
      </div>
    </div>
  );
}

function RecCards({ items, onAction }) {
  if (!items?.length) return null;
  return (
    <div className="rec-list">
      {items.map((r,i)=>(
        <div className="rec-card" key={i} onClick={()=>onAction(r.title||r.name)}>
          <div className="rec-icon">{r.icon||"📌"}</div>
          <div className="rec-info">
            <div className="rec-title">{r.title||r.name}</div>
            <div className="rec-desc">{r.desc||r.description}</div>
            {r.reason&&<div className="rec-reason">↳ {r.reason}</div>}
            <div className="rec-foot"><span className={`rbadge ${r.badge||"rb-gold"}`}>{r.badgeText||r.type||"ET"}</span></div>
          </div>
        </div>
      ))}
    </div>
  );
}

function FinWidget({ data, profile }) {
  const rMap = {"🟢 Conservative":32,"🟡 Moderate":58,"🔴 Aggressive":82,"🤷 Not Sure Yet":44};
  const div = data?.diversification ?? rMap[profile?.risk] ?? 55;
  const hp  = data?.goal_progress   ?? 34;
  const hs  = data?.health_score    ?? Math.round((div+62+hp)/3);
  const sugs = data?.suggestions ?? [
    {icon:"⚡",label:"Action",text:"Your portfolio lacks international exposure. Consider a US Index ETF."},
    {icon:"🛡️",label:"Gap",   text:"No term insurance detected. ₹1 Cr cover available under ₹900/month."},
    {icon:"🎯",label:"Goal",  text:`At current pace you're ${hp}% toward your ${profile?.goal?.replace(/[^\w\s]/g,"")||"wealth"} goal.`},
  ];
  return (
    <div className="fin-widget">
      <div className="fw-hdr"><span>📊</span><div className="fw-title">Financial Health Analysis</div><div className="fw-badge">RAG · Live</div></div>
      <div className="fw-body">
        <div className="fin-meters">
          <Ring value={hs}  color="var(--gold)"  label="Health"/>
          <Ring value={div} color="var(--cyan)"  label="Diversif."/>
          <Ring value={hp}  color="var(--green)" label="Goal"/>
        </div>
        <div className="fin-sugs">
          {sugs.map((s,i)=>(
            <div className="fin-sug" key={i}><span className="fs-icon">{s.icon}</span><div className="fs-text"><strong>{s.label}:</strong> {s.text}</div></div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ActionResult({ data }) {
  const channels = data?.dispatched_actions ?? [{icon:"💬",name:"In-App Chat",status:"success"},{icon:"📧",name:"Email",status:"success"},{icon:"📱",name:"Push",status:"success"}];
  return (
    <div className="action-result">
      <div className="ar-title">✅ Action Dispatcher — Results</div>
      {channels.map((c,i)=>(
        <div className="ar-row" key={i}>
          <span>{c.icon||"📡"}</span><span>{c.name||c.channel}</span>
          <span className={c.status==="success"||c.status==="ok"?"ar-ok":"ar-fail"}>{c.status==="success"||c.status==="ok"?"✓ SENT":"✗ FAIL"}</span>
        </div>
      ))}
      {data?.schedule&&<div style={{marginTop:8,fontSize:10,color:"var(--text3)"}}>📅 {data.schedule}</div>}
    </div>
  );
}

function RagArticles({ articles }) {
  if (!articles?.length) return null;
  return (
    <div className="rag-articles">
      {articles.map((a,i)=>(
        <div className="rag-art" key={i}>
          <div className="rag-art-title">{a.title}</div>
          <div className="rag-art-summary">{a.summary||a.content?.slice(0,140)+"…"}</div>
          {a.tags&&<div className="rag-art-tags">{a.tags.map(t=><span key={t} className="rag-tag">{t}</span>)}</div>}
        </div>
      ))}
    </div>
  );
}

function Feedback({ onSubmit }) {
  const [rating,setRating]=useState(0);
  const [hov,setHov]=useState(0);
  const [thumb,setThumb]=useState(null);
  const [tags,setTags]=useState([]);
  const [comment,setComment]=useState("");
  const [done,setDone]=useState(false);
  const tlist = thumb==="down"?TAG_NEG:TAG_POS;
  const tog = t=>setTags(p=>p.includes(t)?p.filter(x=>x!==t):[...p,t]);
  const submit = ()=>{ if(!rating&&thumb===null)return; setDone(true); onSubmit({rating,thumb,tags,comment}); };
  if(done) return <div className="fb-widget"><div className="fb-done"><span className="fb-done-icon">🙏</span><div className="fb-done-text">Feedback received — tuning recommendations</div></div></div>;
  return (
    <div className="fb-widget">
      <div className="fb-title">⭐ Rate this interaction</div>
      <div className="fb-stars">{[1,2,3,4,5].map(s=><div key={s} className={`fb-star ${(hov||rating)>=s?"sel":""}`} onMouseEnter={()=>setHov(s)} onMouseLeave={()=>setHov(0)} onClick={()=>setRating(s)}>{(hov||rating)>=s?"⭐":"☆"}</div>)}</div>
      <div className="fb-thumbs">
        <div className={`fb-thumb ${thumb==="up"?"up":""}`} onClick={()=>{setThumb("up");setTags([])}}>👍 Helpful</div>
        <div className={`fb-thumb ${thumb==="down"?"dn":""}`} onClick={()=>{setThumb("down");setTags([])}}>👎 Needs Work</div>
      </div>
      {thumb!==null&&<div className="fb-tags">{tlist.map(t=><div key={t} className={`fb-tag ${tags.includes(t)?"sel":""}`} onClick={()=>tog(t)}>{t}</div>)}</div>}
      <textarea className="fb-ta" rows={2} placeholder="Any comments? (optional)" value={comment} onChange={e=>setComment(e.target.value)}/>
      <button className="fb-submit" onClick={submit} disabled={!rating&&thumb===null}>Submit Feedback</button>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function ETConcierge() {
  const [messages,   setMessages]   = useState([]);
  const [inputVal,   setInputVal]   = useState("");
  const [node,       setNode]       = useState("greeting");
  const [profile,    setProfile]    = useState({});
  const [pct,        setPct]        = useState(0);
  const [loading,    setLoading]    = useState(false);
  const [loadLabel,  setLoadLabel]  = useState("");
  const [stageLabel, setStageLabel] = useState("Welcome");
  const [stagePill,  setStagePill]  = useState("Start");
  const [panelOpen,  setPanelOpen]  = useState(false);
  const [activeAgent,setActiveAgent]= useState("concierge");
  const [channels,   setChannels]   = useState({chat:true,sms:false,wa:false,email:false,push:false});
  const [toast,      setToast]      = useState({show:false,icon:"",msg:""});
  const [activeNav,  setActiveNav]  = useState("chat");
  const [visited,    setVisited]    = useState(new Set());
  const [nudge,      setNudge]      = useState(null);
  const [nudgeSeen,  setNudgeSeen]  = useState(new Set());
  const [feedbacks,  setFeedbacks]  = useState([]);
  const [traces,     setTraces]     = useState([]);
  const [evtLog,     setEvtLog]     = useState([]);

  const msgsRef = useRef(null);
  const convRef = useRef([]);
  const profileKeys = ["interests","goal","investments","risk","engagement"];

  const scroll    = useCallback(()=>{ setTimeout(()=>{ if(msgsRef.current) msgsRef.current.scrollTop=msgsRef.current.scrollHeight; },60); },[]);
  const showToast = useCallback((icon,msg)=>{ setToast({show:true,icon,msg}); setTimeout(()=>setToast(t=>({...t,show:false})),2800); },[]);
  const log       = useCallback((evt,meta={})=>{ setEvtLog(p=>[...p.slice(-19),{evt,meta,time:ts()}]); },[]);
  const addTrace  = useCallback((agent,text,json=null)=>{ setTraces(p=>[...p,{agent,text,json,time:ts()}]); },[]);

  const addMsg = useCallback((role,content,type="text",extra=null,opts={})=>{
    const id=Date.now()+Math.random();
    setMessages(p=>[...p,{id,role,content,type,extra,time:ts(),agent:opts.agent||"concierge",showFeedback:opts.fb||false}]);
    if(role==="user") convRef.current=[...convRef.current,{role:"user",content}];
    scroll();
  },[scroll]);

  // ── API wrappers ──────────────────────────────────────────────────────────
  const runProfile = useCallback(async(prof)=>{
    setActiveAgent("profiler"); setLoadLabel("Calling /profile…");
    const data = await apiCall("/profile",{ conversation:convRef.current, raw_answers:prof });
    if(data) addTrace("profiler", data.reasoning_trace||"Persona JSON extracted.", data.persona||data);
    else     addTrace("profiler","⚠ /profile unreachable — using local answers as fallback.");
    return data;
  },[addTrace]);

  const runRecommend = useCallback(async(prof,type="general")=>{
    setActiveAgent("recommender"); setLoadLabel("Calling /recommend…");
    const data = await apiCall("/recommend",{ profile:prof, type, conversation:convRef.current });
    if(data) addTrace("recommender", data.reasoning_trace||"Products matched.", data.recommended_products?.map(p=>p.title||p.name));
    else     addTrace("recommender","⚠ /recommend unreachable — using fallback recommendations.");
    return data;
  },[addTrace]);

  const runRag = useCallback(async(query)=>{
    setActiveAgent("rag"); setLoadLabel("Calling /rag…");
    const data = await apiCall("/rag",{ query, profile, conversation:convRef.current });
    if(data) addTrace("rag", data.reasoning_trace||`Retrieved ${data.articles?.length||0} articles.`, data.articles?.map(a=>a.title));
    else     addTrace("rag","⚠ /rag unreachable — showing computed analysis.");
    return data;
  },[profile, addTrace]);

  const runAction = useCallback(async()=>{
    setActiveAgent("action"); setLoadLabel("Calling /action…");
    const data = await apiCall("/action",{ profile, channels:Object.entries(channels).filter(([,v])=>v).map(([k])=>k), conversation:convRef.current });
    if(data) addTrace("action", data.reasoning_trace||"Dispatch queue executed.", data.dispatched_actions);
    else     addTrace("action","⚠ /action unreachable — alerts simulated.");
    return data;
  },[profile, channels, addTrace]);

  // ── Node router ───────────────────────────────────────────────────────────
  const goto = useCallback(async(nodeId, newProf=null)=>{
    const n = FLOWMAP[nodeId];
    const prof = newProf||profile;
    setNode(nodeId);
    if(n?.stageLabel) setStageLabel(n.stageLabel);
    if(n?.stagePill)  setStagePill(n.stagePill);
    if(n?.agent)      setActiveAgent(n.agent);
    setVisited(p=>new Set([...p,nodeId]));
    log("visit",{nodeId});

    const nr = NUDGES.find(x=>x.trigger===nodeId);
    if(nr&&!nudgeSeen.has(nodeId)){ setTimeout(()=>{ setNudge(nr); setNudgeSeen(p=>new Set([...p,nodeId])); },3000); }

    if(nodeId==="profile_done"){
      setLoading(true);
      await runProfile(prof);
      await runRecommend(prof);
      setLoading(false); setActiveAgent("profiler");
      addMsg("bot","✅ **Profile complete!** Here is your extracted persona:","profile_card",prof,{agent:"profiler"});
      setStageLabel("Profile Complete"); setStagePill("Done ✓");
      return;
    }
    if(nodeId==="recs"){
      setLoading(true);
      const data = await runRecommend(prof,"general");
      setLoading(false); setActiveAgent("recommender");
      addMsg("bot","**Recommender Agent** matched your profile to ET products:","recommendations",data?.recommended_products||FB_RECS,{agent:"recommender",fb:true});
      setStageLabel("Recommender Agent"); setStagePill("Live"); return;
    }
    if(nodeId==="fin_analysis"){
      setLoading(true);
      const data = await runRag("financial health portfolio diversification insurance goal tracking");
      setLoading(false); setActiveAgent("rag");
      addMsg("bot","**RAG Module** synthesized your financial health from ET's knowledge base:","fin_widget",data,{agent:"rag",fb:true});
      if(data?.articles?.length) addMsg("bot","📚 **Retrieved Articles:**","rag_articles",data.articles,{agent:"rag"});
      setStageLabel("RAG Module"); setStagePill("Live"); return;
    }
    if(nodeId==="alerts"){
      setLoading(true);
      const data = await runAction();
      setLoading(false); setActiveAgent("action");
      addMsg("bot","**Action Dispatcher** has set up your multi-channel alerts:","action_result",data,{agent:"action",fb:true});
      setStageLabel("Action Dispatcher"); setStagePill("Executed"); return;
    }
    if(nodeId==="partners"){
      setLoading(true);
      const data = await runRecommend(prof,"partners");
      setLoading(false); setActiveAgent("recommender");
      addMsg("bot","**Recommender Agent** identified partner services for your profile:","recommendations",data?.recommended_products||FB_PARTNERS,{agent:"recommender",fb:true});
      setStageLabel("Marketplace Concierge"); setStagePill("Partners"); return;
    }
    if(nodeId==="masterclass"){
      setLoading(true);
      const data = await runRecommend(prof,"masterclass");
      setLoading(false); setActiveAgent("recommender");
      addMsg("bot","**Recommender Agent** curated ET Masterclass courses for your profile:","recommendations",data?.recommended_products||FB_COURSES,{agent:"recommender",fb:true});
      setStageLabel("ET Masterclass"); setStagePill("Courses"); return;
    }
    if(n){
      setLoading(true); setLoadLabel(`${AGENT_NAMES[n.agent]||"Concierge"} processing…`);
      setTimeout(()=>{ setLoading(false); addMsg("bot",n.bot,"text",null,{agent:n.agent||"concierge"}); scroll(); }, 700+Math.random()*350);
    }
  },[profile, nudgeSeen, runProfile, runRecommend, runRag, runAction, addMsg, log, scroll]);

  useEffect(()=>{ setTimeout(()=>addMsg("bot",FLOWMAP["greeting"].bot,"text",null,{agent:"concierge"}),500); },[]);

  const onQR = useCallback((reply)=>{
    if(loading) return;
    addMsg("user",reply); log("qr",{reply}); setNudge(null);
    const n=FLOWMAP[node]; if(!n) return;
    let newProf={...profile};
    if(n.profileKey){
      newProf[n.profileKey]=reply.replace(/^[^\w\s]+\s*/,"");
      setProfile(newProf);
      setPct(Math.round((profileKeys.filter(k=>newProf[k]).length/profileKeys.length)*100));
    }
    const next = typeof n.next==="string" ? n.next : n.next?.[reply]||Object.values(n.next)[0];
    if(next) goto(next,newProf);
  },[loading,node,profile,profileKeys,addMsg,goto,log]);

  const onSend = useCallback(async()=>{
    const val=inputVal.trim(); if(!val||loading) return;
    setInputVal(""); addMsg("user",val); log("text",{len:val.length}); setNudge(null);
    setLoading(true);
    const data = await runRag(val);
    setLoading(false);
    if(data){
      addMsg("bot",data.summary||data.answer||"Here's what I found:","text",null,{agent:"rag",fb:true});
      if(data.articles?.length) addMsg("bot","📚 **Relevant Articles:**","rag_articles",data.articles,{agent:"rag"});
    } else {
      const n=FLOWMAP[node];
      const next = n && (typeof n.next==="string" ? n.next : Object.values(n.next)[0]);
      if(next) goto(next);
      else addMsg("bot","Got it! Would you like to see your recommendations or run a financial analysis?","text",null,{agent:"concierge",fb:true});
    }
  },[inputVal,loading,node,addMsg,runRag,goto,log]);

  const onKey = e=>{ if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();onSend();} };

  const onFeedback = useCallback((msgId,fb)=>{
    setFeedbacks(p=>[...p,{msgId,...fb}]);
    log("feedback",{rating:fb.rating,thumb:fb.thumb});
    showToast("🙏","Feedback captured!");
    if(fb.thumb==="down"||fb.rating<=2)
      setTimeout(()=>addMsg("bot","💡 I'll adjust my approach. Would you like to try a different path or revisit your profile?","text",null,{agent:"concierge"}),1200);
  },[log,showToast,addMsg]);

  const restart = ()=>{
    setMessages([]); setProfile({}); setPct(0); setNode("greeting");
    setStageLabel("Welcome"); setStagePill("Start"); setVisited(new Set());
    setNudgeSeen(new Set()); setNudge(null); setTraces([]); setEvtLog([]);
    setActiveAgent("concierge"); convRef.current=[];
    setTimeout(()=>addMsg("bot",FLOWMAP["greeting"].bot,"text",null,{agent:"concierge"}),300);
  };

  const toggleCh = k=>{
    setChannels(p=>{ const n={...p,[k]:!p[k]}; if(n[k]) showToast("✅",`${k.toUpperCase()} activated`); return n; });
  };

  const avgRating = feedbacks.length?(feedbacks.reduce((s,f)=>s+(f.rating||0),0)/feedbacks.length).toFixed(1):null;
  const topTags   = Object.entries(feedbacks.flatMap(f=>f.tags||[]).reduce((a,t)=>{a[t]=(a[t]||0)+1;return a;},{})).sort((a,b)=>b[1]-a[1]).slice(0,4).map(([t])=>t);
  const riskScore = {"🟢 Conservative":25,"🟡 Moderate":55,"🔴 Aggressive":85,"🤷 Not Sure Yet":40}[profile.risk]||0;
  const riskColor = riskScore>65?"var(--red)":riskScore>40?"var(--gold)":riskScore>0?"var(--green)":"var(--text3)";
  const riskLabel = riskScore>65?"Aggressive":riskScore>40?"Moderate":riskScore>0?"Conservative":"—";
  const STEPS     = ["Profiler","Recommender","RAG","Action"];
  const stepIdx   = {profiler:0,recommender:1,rag:2,action:3}[activeAgent]??-1;
  const curQRs    = FLOWMAP[node]?.qr||[];
  const filledKeys= profileKeys.filter(k=>profile[k]);

  return (
    <>
      <style>{css}</style>
      <div className="bg-grid"/>
      <div className="app">

        {/* ══ SIDEBAR — clean 3-section layout ══ */}
        <div className="sb">
          <div className="sb-brand">
            <div className="sb-logo">ET</div>
            <div><div className="sb-brand-name">ET Concierge</div><div className="sb-brand-sub">AI Financial Guide</div></div>
          </div>

          <div className="sb-profile">
            <div className="sb-profile-top">
              <div className="sb-profile-label">Profile</div>
              <div className="sb-profile-pct">{pct}%</div>
            </div>
            <div className="prog-track"><div className="prog-fill" style={{width:`${pct}%`}}/></div>
            <div className="profile-dots">{profileKeys.map(k=><div key={k} className={`pdot ${profile[k]?"filled":""}`}/>)}</div>
            {filledKeys.length>0&&(
              <div className="pf-list">
                {filledKeys.map(k=>(
                  <div className="pf-item" key={k}>
                    <div className="pf-key">{k==="investments"?"portfolio":k}</div>
                    <div className="pf-val">{profile[k].substring(0,16)+(profile[k].length>16?"…":"")}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="sb-nav">
            <div className="nav-group">Workspace</div>
            {[{id:"chat",icon:"💬",label:"Chat"},{id:"fin",icon:"📊",label:"Financial Navigator"},{id:"recs",icon:"✨",label:"Recommendations"},{id:"notifs",icon:"🔔",label:"Alerts & Actions"}].map(n=>(
              <button key={n.id} className={`nav-btn ${activeNav===n.id?"active":""}`}
                onClick={()=>{setActiveNav(n.id);if(n.id!=="chat")showToast("🔄",`Opening ${n.label}…`)}}>
                <span className="ni">{n.icon}</span>{n.label}
                {n.id==="notifs"&&feedbacks.length>0&&<span className="nav-badge">{feedbacks.length}</span>}
              </button>
            ))}
            <div className="nav-group">Tools</div>
            <button className={`nav-btn ${panelOpen?"active":""}`} onClick={()=>setPanelOpen(o=>!o)}>
              <span className="ni">🧠</span>Inner Monologue
            </button>
            <button className="nav-btn" onClick={restart}>
              <span className="ni">↺</span>Restart Session
            </button>
          </div>

          <div className="sb-channels">
            <div className="sb-channels-label">Channels</div>
            <div className="ch-row">
              {Object.entries(channels).map(([k,v])=>(
                <div key={k} className={`ch-chip ${v?"on":""}`} onClick={()=>k!=="chat"&&toggleCh(k)}>
                  {k==="wa"?"WA":k.toUpperCase()}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ══ MAIN CHAT ══ */}
        <div className="main">
          <div className="chat-hdr">
            <div className="hdr-av">ET</div>
            <div className="hdr-info">
              <div className="hdr-name">ET AI Concierge</div>
              <div className="hdr-sub">{loading?loadLabel:"Online · Pipeline Ready"}</div>
            </div>
            <div className="pipeline-pill">
              {STEPS.map((s,i)=>(
                <span key={s}>
                  <span className={`pp-step ${stepIdx===i&&loading?"active":""}`}>{s}</span>
                  {i<STEPS.length-1&&<span className="pp-sep">›</span>}
                </span>
              ))}
            </div>
            <div className="hdr-btns">
              <button className="hdr-btn" onClick={()=>setPanelOpen(o=>!o)} title="Inner Monologue">🧠</button>
              <button className="hdr-btn" onClick={restart} title="Restart">↺</button>
            </div>
          </div>

          <div className="msgs" ref={msgsRef}>
            {messages.map(m=>(
              <div key={m.id}>
                <div className={`msg-row ${m.role==="user"?"user":""}`}>
                  <div className={`msg-av ${m.role==="bot"?"bot":"usr"}`}>{m.role==="bot"?"ET":"You"}</div>
                  <div className="msg-body">
                    {m.role==="bot"&&<AgentLabel agent={m.agent}/>}
                    {m.type==="profile_card"   ? <><div className="bubble bot"><Txt t={m.content}/></div><ProfileCard profile={m.extra}/></>
                    :m.type==="recommendations" ? <><div className="bubble bot"><Txt t={m.content}/></div><RecCards items={m.extra} onAction={a=>{showToast("🔗",a);log("click",{a})}}/></>
                    :m.type==="fin_widget"      ? <><div className="bubble bot"><Txt t={m.content}/></div><FinWidget data={m.extra} profile={profile}/></>
                    :m.type==="rag_articles"    ? <RagArticles articles={m.extra}/>
                    :m.type==="action_result"   ? <><div className="bubble bot"><Txt t={m.content}/></div><ActionResult data={m.extra}/></>
                    :<div className={`bubble ${m.role==="bot"?"bot":"user"}`}><Txt t={m.content}/></div>}
                    <div className="msg-ts">{m.time}</div>
                  </div>
                </div>
                {m.role==="bot"&&m.showFeedback&&(
                  <div style={{paddingLeft:36,marginTop:2}}>
                    <Feedback onSubmit={fb=>onFeedback(m.id,fb)}/>
                  </div>
                )}
              </div>
            ))}

            {loading&&(
              <div className="msg-row">
                <div className="msg-av bot">ET</div>
                <div className="msg-body">
                  <AgentLabel agent={activeAgent}/>
                  <div className="typing"><div className="td"/><div className="td"/><div className="td"/><span className="typing-label">{loadLabel||"processing…"}</span></div>
                </div>
              </div>
            )}

            {!loading&&nudge&&(
              <div className="nudge" onClick={()=>{ showToast(nudge.icon,nudge.cta); setNudge(null); }}>
                <div className="nudge-icon">{nudge.icon}</div>
                <div><div className="nudge-title">{nudge.title}</div><div className="nudge-desc">{nudge.desc}</div></div>
                <div className="nudge-cta">{nudge.cta}</div>
              </div>
            )}

            {!loading&&curQRs.length>0&&(
              <div className="qrs">{curQRs.map(q=><button key={q} className="qr" onClick={()=>onQR(q)}>{q}</button>)}</div>
            )}
          </div>

          <div className="input-area">
            <div className="stage-bar">
              <div className="stage-dot"/>
              <span className="stage-text">{stageLabel}</span>
              <span className="stage-pill">{stagePill}</span>
            </div>
            <div className="input-row">
              <textarea className="input-box" placeholder="Type a message or tap a suggestion…"
                value={inputVal} onChange={e=>setInputVal(e.target.value)} onKeyDown={onKey} rows={1}/>
              <button className="send-btn" onClick={onSend} disabled={loading}>➤</button>
            </div>
          </div>
        </div>

        {/* ══ INNER MONOLOGUE PANEL ══ */}
        <div className={`panel ${panelOpen?"open":""}`}>
          <div className="panel-hdr">
            <span>🧠</span><div className="panel-title">Inner Monologue</div>
            <button className="panel-close" onClick={()=>setPanelOpen(false)}>✕</button>
          </div>
          <div className="panel-body">

            <div>
              <div className="p-sec">Risk Score</div>
              <div className="risk-card">
                <div className="risk-ring">
                  <svg width="52" height="52" viewBox="0 0 52 52">
                    <circle cx="26" cy="26" r="20" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="5"/>
                    <circle cx="26" cy="26" r="20" fill="none" stroke={riskColor} strokeWidth="5" strokeLinecap="round"
                      strokeDasharray={2*Math.PI*20} strokeDashoffset={2*Math.PI*20-(riskScore/100)*2*Math.PI*20}
                      style={{transform:"rotate(-90deg)",transformOrigin:"26px 26px",transition:"stroke-dashoffset 1s ease"}}/>
                  </svg>
                  <div className="risk-ring-val" style={{color:riskColor}}>{riskScore||"—"}</div>
                </div>
                <div><div className="risk-label">{riskLabel}</div><div className="risk-desc">0–10 scale · gates product recommendations.</div></div>
              </div>
            </div>

            <div>
              <div className="p-sec">Agent Reasoning ({traces.length})</div>
              {traces.length===0
                ?<div className="trace"><div className="trace-text" style={{fontStyle:"italic",color:"var(--text3)"}}>Start profiling to see reasoning traces.</div></div>
                :traces.slice().reverse().map((t,i)=>(
                  <div className="trace" key={i}>
                    <div className={`trace-agent ta-${t.agent}`}>{t.agent?.toUpperCase()} · {t.time}</div>
                    <div className="trace-text">{t.text}</div>
                    {t.json&&<div className="trace-json">{JSON.stringify(t.json,null,2)}</div>}
                  </div>
                ))
              }
            </div>

            <div>
              <div className="p-sec">Feedback Analytics</div>
              {feedbacks.length===0
                ?<div className="trace"><div className="trace-text" style={{fontStyle:"italic",color:"var(--text3)"}}>Rate interactions to see analytics.</div></div>
                :<div className="fb-score-card">
                  <div style={{display:"flex",alignItems:"flex-end",gap:10,marginBottom:7}}>
                    <div className="fb-score-num">{avgRating}</div>
                    <div><div className="fb-score-meta">{feedbacks.length} feedback{feedbacks.length>1?"s":""}</div>
                    <div className="fb-mini-stars">{[1,2,3,4,5].map(s=><span key={s}>{parseFloat(avgRating)>=s?"⭐":"☆"}</span>)}</div></div>
                  </div>
                  {topTags.length>0&&<div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{topTags.map(t=><span key={t} className="fb-chip">{t}</span>)}</div>}
                </div>
              }
            </div>

            <div>
              <div className="p-sec">Channel Engagement</div>
              {[{l:"In-App",p:100},{l:"Email",p:channels.email?82:0},{l:"Push",p:channels.push?67:0},{l:"WhatsApp",p:channels.wa?44:0},{l:"SMS",p:channels.sms?30:0}].map(c=>(
                <div className="ch-bar" key={c.l}>
                  <div className="ch-bar-label">{c.l}</div>
                  <div className="ch-bar-track"><div className="ch-bar-fill" style={{width:`${c.p}%`}}/></div>
                  <div className="ch-bar-val">{c.p}%</div>
                </div>
              ))}
            </div>

            <div>
              <div className="p-sec">Session Stats</div>
              {[["Messages",messages.length],["Profile fields",`${filledKeys.length}/5`],["Nodes visited",visited.size],["Active channels",Object.values(channels).filter(Boolean).length],["Feedbacks",feedbacks.length]].map(([l,v])=>(
                <div className="stat-row" key={l}><span className="stat-label">{l}</span><span className="stat-val">{v}</span></div>
              ))}
            </div>

            <div>
              <div className="p-sec">Event Log</div>
              {evtLog.length===0
                ?<div className="trace"><div className="trace-text" style={{fontStyle:"italic",color:"var(--text3)"}}>Interact to see live events.</div></div>
                :evtLog.slice().reverse().slice(0,8).map((e,i)=>(
                  <div className="evt-row" key={i}>
                    <div className="evt-time">{e.time}</div>
                    <div className="evt-text"><strong>{e.evt}</strong> {e.meta.nodeId||e.meta.reply||""}</div>
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      </div>

      <div className={`toast ${toast.show?"show":""}`}><span>{toast.icon}</span>{toast.msg}</div>
    </>
  );
}