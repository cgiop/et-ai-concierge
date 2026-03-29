import { useState, useRef, useEffect, useCallback, useMemo } from "react";

const API_BASE = process.env.REACT_APP_API_BASE || "http://127.0.0.1:8000";

// ─── STYLES ───────────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;0,900;1,600&family=Syne:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');

  /* ══ NEW THEME — dark + coral/orange accents (DEFAULT) ══ */
  :root {
    --bg: #141414;
    --bg2: #1a1a1a;
    --bg3: #1f1f1f;
    --panel: transparent;
    --surface: #232323;
    --surface2: #2c2c2c;
    --border: rgba(255,255,255,0.07);
    --border2: rgba(255,255,255,0.12);

    --gold: #FF6F61;
    --gold2: #ff8a7e;
    --gold-dim: rgba(255,111,97,0.14);
    --gold-glow: rgba(255,111,97,0.18);

    --cyan: #FF4500;
    --cyan2: #ff6533;
    --cyan-dim: rgba(255,69,0,0.12);

    --violet: #DAA520;
    --violet-dim: rgba(218,165,32,0.13);

    --green: #3dca7e;
    --green-dim: rgba(61,202,126,0.12);
    --red: #ff5c5c;
    --red-dim: rgba(255,92,92,0.12);

    --text: #F5E8D8;
    --text2: #c4b09a;
    --text3: #7a6e66;

    --sidebar-w: 260px;
    --reasoning-w: 310px;
    --hdr: 58px;

    --mono: 'JetBrains Mono', monospace;
    --display: 'Playfair Display', serif;
    --body: 'Syne', sans-serif;
  }

  /* ══ LEGACY THEME — original gold/cyan dark ══ */
  .theme-dark {
    --bg: #07080d;
    --bg2: #0d0f1a;
    --bg3: #111420;
    --panel: #13162000;
    --surface: #181c2c;
    --surface2: #1e2335;
    --border: rgba(255,255,255,0.06);
    --border2: rgba(255,255,255,0.10);

    --gold: #e8b84b;
    --gold2: #f5d07a;
    --gold-dim: rgba(232,184,75,0.12);
    --gold-glow: rgba(232,184,75,0.08);

    --cyan: #00d4c8;
    --cyan2: #4ee8de;
    --cyan-dim: rgba(0,212,200,0.10);

    --violet: #7c6cff;
    --violet-dim: rgba(124,108,255,0.12);

    --green: #22d67a;
    --green-dim: rgba(34,214,122,0.12);
    --red: #ff4d6a;
    --red-dim: rgba(255,77,106,0.12);

    --text: #e8eaf2;
    --text2: #9095b0;
    --text3: #5a5f7a;
  }

  /* ══ MIDNIGHT THEME (DARK 2) ══ */
  .theme-midnight {
    --bg: #0b0e14;
    --bg2: #11151c;
    --bg3: #161b22;
    --panel: transparent;
    --surface: #1a1f29;
    --surface2: #212836;
    --border: rgba(255,255,255,0.06);
    --border2: rgba(255,255,255,0.10);

    /* Purple & Blue highlights */
    --gold: #82aaff;
    --gold2: #5c8cf5;
    --gold-dim: rgba(130,170,255,0.15);
    --gold-glow: rgba(130,170,255,0.2);

    --cyan: #c792ea;
    --cyan2: #b371de;
    --cyan-dim: rgba(199,146,234,0.15);

    --violet: #f07178;
    --violet-dim: rgba(240,113,120,0.15);

    --green: #c3e88d;
    --green-dim: rgba(195,232,141,0.15);
    --red: #ff5370;
    --red-dim: rgba(255,83,112,0.15);

    --text: #d0d4e3;
    --text2: #8a91a8;
    --text3: #58617a;
  }

  /* ══ CREAM THEME (LIGHT 1) ══ */
  .theme-light {
    --bg: #f9f6f0;
    --bg2: #f2ede4;
    --bg3: #e8e2d5;
    --panel: transparent;
    --surface: #ffffff;
    --surface2: #fdfbf7;
    --border: rgba(0,0,0,0.06);
    --border2: rgba(0,0,0,0.10);

    /* Warm autumn accents */
    --gold: #d97706;
    --gold2: #b45309;
    --gold-dim: rgba(217,119,6,0.1);
    --gold-glow: rgba(217,119,6,0.15);

    --cyan: #059669;
    --cyan2: #047857;
    --cyan-dim: rgba(5,150,105,0.1);

    --violet: #6366f1;
    --violet-dim: rgba(99,102,241,0.1);

    --green: #059669;
    --green-dim: rgba(5,150,105,0.1);
    --red: #dc2626;
    --red-dim: rgba(220,38,38,0.1);

    --text: #292524;
    --text2: #57534e;
    --text3: #78716c;
  }

  /* ══ ICE THEME (LIGHT 2) ══ */
  .theme-ice {
    --bg: #f8fafc;
    --bg2: #f1f5f9;
    --bg3: #e2e8f0;
    --panel: transparent;
    --surface: #ffffff;
    --surface2: #fdfdfd;
    --border: rgba(15,23,42,0.06);
    --border2: rgba(15,23,42,0.12);

    /* Cool blue and violet accents */
    --gold: #3b82f6; 
    --gold2: #2563eb;
    --gold-dim: rgba(59,130,246,0.1);
    --gold-glow: rgba(59,130,246,0.15);

    --cyan: #8b5cf6;
    --cyan2: #7c3aed;
    --cyan-dim: rgba(139,92,246,0.1);

    --violet: #f43f5e;
    --violet-dim: rgba(244,63,94,0.1);

    --green: #10b981;
    --green-dim: rgba(16,185,129,0.1);
    --red: #ef4444;
    --red-dim: rgba(239,68,68,0.1);

    --text: #0f172a;
    --text2: #334155;
    --text3: #64748b;
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body, #root { height: 100%; overflow: hidden; }

  body {
    font-family: var(--body);
    background: var(--bg);
    color: var(--text);
    -webkit-font-smoothing: antialiased;
  }

  /* Root wrapper inherits theme */
  .app-root {
    height: 100%;
    overflow: hidden;
    background: var(--bg);
  }

  /* ══ THEME SELECTOR ══ */
  .theme-select-wrap {
    position: relative; display: inline-flex; align-items: center;
  }
  .theme-select {
    appearance: none; -webkit-appearance: none;
    background: var(--surface);
    border: 1px solid var(--border2);
    color: var(--text2);
    padding: 5px 28px 5px 12px;
    border-radius: 20px;
    font-family: var(--body); font-size: 11px; font-weight: 700;
    cursor: pointer; outline: none; transition: all 0.2s ease;
    letter-spacing: 0.03em;
  }
  .theme-select:hover {
    background: var(--gold-dim); border-color: var(--gold);
    color: var(--gold); transform: translateY(-1px);
    box-shadow: 0 4px 12px var(--gold-glow);
  }
  .theme-select option {
    background: var(--surface2); color: var(--text); font-weight: 500;
  }
  .ts-chevron {
    position: absolute; right: 10px; font-size: 9px; pointer-events: none; color: inherit; transition: color 0.2s;
  }
  .theme-select-wrap:hover .ts-chevron { color: var(--gold); }

  /* ══ SCROLLBARS ══ */
  ::-webkit-scrollbar { width: 2px; height: 2px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 2px; }

  /* ══ LAYOUT ══ */
  .app { display: flex; height: 100vh; overflow: hidden; }

  /* ══ SIDEBAR ══ */
  .sb {
    width: var(--sidebar-w);
    background: var(--bg2);
    border-right: 1px solid var(--border);
    display: flex; flex-direction: column; flex-shrink: 0;
    overflow: hidden;
  }

  .sb-brand {
    padding: 20px 20px 18px;
    border-bottom: 1px solid var(--border);
    display: flex; align-items: center; gap: 12px;
  }

  .sb-logo-wrap {
    position: relative; flex-shrink: 0;
  }
  .sb-logo {
    width: 38px; height: 38px; border-radius: 10px;
    background: linear-gradient(135deg, var(--gold) 0%, #c8780a 100%);
    display: flex; align-items: center; justify-content: center;
    font-family: var(--display); font-size: 14px; font-weight: 700;
    color: var(--bg); letter-spacing: -0.02em;
    box-shadow: 0 0 20px rgba(232,184,75,0.25);
  }
  .sb-logo-ring {
    position: absolute; inset: -3px; border-radius: 13px;
    border: 1px solid rgba(232,184,75,0.3);
    animation: pulse-ring 2.5s ease-in-out infinite;
  }
  @keyframes pulse-ring {
    0%, 100% { opacity: 0.4; transform: scale(1); }
    50% { opacity: 1; transform: scale(1.04); }
  }

  .sb-brand-text { line-height: 1.15; }
  .sb-brand-name {
    font-family: var(--display); font-size: 14px; font-weight: 700;
    color: var(--text); letter-spacing: 0.01em;
  }
  .sb-brand-tag {
    font-size: 9px; font-weight: 600; letter-spacing: 0.14em;
    text-transform: uppercase; color: var(--text3); margin-top: 2px;
  }

  /* agent status strip */
  .agent-strip {
    padding: 10px 14px;
    background: rgba(0,212,200,0.04);
    border-bottom: 1px solid var(--border);
    display: flex; flex-direction: column; gap: 5px;
  }
  .agent-row {
    display: flex; align-items: center; gap: 8px;
    font-size: 10px; font-weight: 500; color: var(--text3);
  }
  .agent-row.active { color: var(--cyan); }
  .agent-dot {
    width: 5px; height: 5px; border-radius: 50%;
    background: var(--text3); flex-shrink: 0; transition: all 0.3s;
  }
  .agent-row.active .agent-dot {
    background: var(--cyan);
    box-shadow: 0 0 6px var(--cyan);
    animation: blink 1.4s ease-in-out infinite;
  }
  @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.4} }
  .agent-label { flex: 1; letter-spacing: 0.06em; text-transform: uppercase; font-size: 9px; }
  .agent-status { font-family: var(--mono); font-size: 8px; }

  /* profile */
  .sb-profile { padding: 14px 16px; border-bottom: 1px solid var(--border); }
  .sb-section-label {
    font-size: 8.5px; font-weight: 700; letter-spacing: 0.16em;
    text-transform: uppercase; color: var(--text3); margin-bottom: 9px;
    display: flex; align-items: center; gap: 5px;
  }
  .sb-section-label::after { content: ''; flex: 1; height: 1px; background: var(--border); }

  .prog-bar-wrap { margin-bottom: 10px; }
  .prog-row { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
  .prog-label { font-size: 10px; color: var(--text2); }
  .prog-pct { font-family: var(--mono); font-size: 10px; font-weight: 600; color: var(--gold); margin-left: auto; }
  .prog-track { width: 100%; height: 2px; background: rgba(255,255,255,0.06); border-radius: 1px; overflow: hidden; }
  .prog-fill { height: 100%; border-radius: 1px; background: linear-gradient(90deg, var(--gold), var(--cyan)); transition: width 0.8s cubic-bezier(0.4,0,0.2,1); }

  .profile-fields { display: flex; flex-direction: column; gap: 4px; }
  .pf-row {
    display: flex; align-items: center; gap: 7px;
    padding: 5px 8px; border-radius: 6px; font-size: 10.5px;
    border: 1px solid transparent;
    transition: all 0.2s;
    background: rgba(255,255,255,0.02);
  }
  .pf-row.filled { border-color: rgba(232,184,75,0.14); background: rgba(232,184,75,0.05); }
  .pf-key { color: var(--text3); min-width: 56px; text-transform: capitalize; font-size: 9.5px; letter-spacing: 0.05em; }
  .pf-val { color: var(--gold2); font-size: 10px; font-weight: 600; margin-left: auto; max-width: 96px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap; text-align: right; }
  .pf-val.empty { color: var(--text3); font-weight: 400; }
  .pf-dot { width: 4px; height: 4px; border-radius: 50%; background: var(--text3); flex-shrink: 0; transition: all 0.3s; }
  .pf-row.filled .pf-dot { background: var(--gold); box-shadow: 0 0 5px var(--gold); }

  /* nav */
  .sb-nav { flex: 1; overflow-y: auto; padding: 12px 10px; }
  .nav-section-label {
    font-size: 8px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase;
    color: var(--text3); padding: 0 8px; margin: 12px 0 5px;
  }
  .nav-section-label:first-child { margin-top: 0; }

  .nav-btn {
    width: 100%; display: flex; align-items: center; gap: 9px;
    padding: 7px 10px; border-radius: 7px;
    background: none; border: none; cursor: pointer;
    font-family: var(--body); font-size: 11.5px; font-weight: 500;
    color: var(--text3); text-align: left; transition: all 0.15s;
  }
  .nav-btn:hover { background: rgba(255,255,255,0.04); color: var(--text2); }
  .nav-btn.active { background: var(--gold-dim); color: var(--gold2); border: 1px solid rgba(232,184,75,0.18); }
  .nav-btn .ni { font-size: 12px; min-width: 16px; }
  .nav-badge {
    margin-left: auto; font-size: 8px; font-weight: 700;
    background: var(--gold); color: var(--bg); padding: 1.5px 6px;
    border-radius: 6px; font-family: var(--mono);
  }

  /* channels */
  .sb-foot { padding: 12px 14px; border-top: 1px solid var(--border); flex-shrink: 0; }
  .ch-grid { display: flex; gap: 4px; flex-wrap: wrap; }
  .ch-chip {
    font-size: 8px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
    padding: 3px 8px; border-radius: 4px; cursor: pointer;
    background: rgba(255,255,255,0.03); color: var(--text3);
    border: 1px solid var(--border); transition: all 0.15s;
  }
  .ch-chip.on { background: var(--cyan-dim); color: var(--cyan); border-color: rgba(0,212,200,0.25); }

  /* ══ MAIN ══ */
  .main { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-width: 0; position: relative; }

  /* header */
  .chat-hdr {
    height: var(--hdr); background: var(--surface);
    border-bottom: 1px solid var(--border);
    display: flex; align-items: center; padding: 0 22px; gap: 12px;
    flex-shrink: 0;
    position: relative; z-index: 10;
  }

  .hdr-av {
    width: 36px; height: 36px; border-radius: 50%;
    background: linear-gradient(135deg, var(--gold), var(--cyan));
    display: flex; align-items: center; justify-content: center;
    font-family: var(--display); font-size: 12px; font-weight: 700;
    color: var(--bg); flex-shrink: 0; position: relative;
  }
  .hdr-av-status {
    position: absolute; bottom: 0; right: 0;
    width: 9px; height: 9px; border-radius: 50%;
    background: var(--green); border: 2px solid var(--bg2);
  }

  .hdr-info { flex: 1; }
  .hdr-name { font-family: var(--display); font-size: 14px; font-weight: 700; color: var(--text); }
  .hdr-sub { font-size: 10px; color: var(--text3); margin-top: 1px; letter-spacing: 0.05em; }

  .hdr-pipeline {
    display: flex; align-items: center; gap: 4px;
    padding: 5px 10px; border-radius: 6px;
    background: rgba(255,255,255,0.03); border: 1px solid var(--border);
    font-size: 9px; font-family: var(--mono); color: var(--text3); letter-spacing: 0.08em;
  }
  .pipeline-step {
    padding: 2px 6px; border-radius: 3px; font-weight: 600; transition: all 0.3s;
  }
  .pipeline-step.active {
    background: var(--cyan-dim); color: var(--cyan);
    box-shadow: 0 0 8px rgba(0,212,200,0.15);
  }
  .pipeline-sep { color: var(--text3); opacity: 0.4; }

  .hdr-btns { display: flex; gap: 6px; }
  .hdr-btn {
    width: 32px; height: 32px; border-radius: 7px; border: 1px solid var(--border);
    background: rgba(255,255,255,0.03); cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    font-size: 13px; color: var(--text3); transition: all 0.15s;
  }
  .hdr-btn:hover { background: rgba(255,255,255,0.07); color: var(--text); border-color: var(--border2); }

  /* messages */
  .msgs {
    flex: 1; overflow-y: auto; padding: 20px 24px;
    display: flex; flex-direction: column; gap: 16px;
    scroll-behavior: smooth;
  }

  .msg-row { display: flex; gap: 10px; align-items: flex-end; }
  .msg-row.user { flex-direction: row-reverse; }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .msg-animate { animation: fadeUp 0.28s ease forwards; }

  .msg-av {
    width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    font-family: var(--display); font-size: 9px; font-weight: 700;
  }
  .msg-av.bot {
    background: linear-gradient(135deg, var(--gold), var(--cyan));
    color: var(--bg);
    box-shadow: 0 2px 10px rgba(232,184,75,0.2);
  }
  .msg-av.usr { background: var(--surface2); color: var(--text2); border: 1px solid var(--border2); }

  .msg-body { max-width: 72%; display: flex; flex-direction: column; gap: 5px; }
  .msg-row.user .msg-body { align-items: flex-end; }

  .bubble {
    padding: 12px 16px; font-size: 13px; line-height: 1.7;
    border-radius: 16px; position: relative;
  }
  .bubble.bot {
    background: var(--surface);
    border: 1px solid var(--border2);
    border-bottom-left-radius: 4px;
    color: var(--text);
  }
  .bubble.user {
    background: linear-gradient(135deg, var(--violet), var(--cyan));
    border: 1px solid var(--cyan-dim);
    border-bottom-right-radius: 4px;
    color: #fff;
  }
  .theme-dark .bubble.user {
    background: linear-gradient(135deg, #0d6e72, #0a5459);
    border: 1px solid rgba(0,212,200,0.2);
    color: #e0fffe;
  }

  .msg-ts { font-family: var(--mono); font-size: 8.5px; color: var(--text3); padding: 0 3px; }

  /* agent badge on bot messages */
  .agent-badge {
    display: inline-flex; align-items: center; gap: 4px;
    font-size: 8px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
    padding: 2px 7px; border-radius: 4px; margin-bottom: 4px;
    font-family: var(--mono);
  }
  .ab-profiler { background: var(--violet-dim); color: var(--violet); border: 1px solid rgba(124,108,255,0.2); }
  .ab-recommender { background: var(--gold-dim); color: var(--gold); border: 1px solid rgba(232,184,75,0.2); }
  .ab-rag { background: var(--cyan-dim); color: var(--cyan); border: 1px solid rgba(0,212,200,0.2); }
  .ab-action { background: var(--green-dim); color: var(--green); border: 1px solid rgba(34,214,122,0.2); }
  .ab-concierge { background: rgba(255,255,255,0.05); color: var(--text2); border: 1px solid var(--border); }

  /* thinking */
  .thinking {
    display: flex; align-items: center; gap: 5px;
    padding: 13px 16px; background: var(--surface);
    border: 1px solid var(--border2); border-radius: 16px;
    border-bottom-left-radius: 4px;
  }
  .t-dot {
    width: 5px; height: 5px; border-radius: 50%;
    background: var(--cyan); animation: tBounce 1.3s ease-in-out infinite;
  }
  .t-dot:nth-child(2) { animation-delay: 0.16s; background: var(--gold); }
  .t-dot:nth-child(3) { animation-delay: 0.32s; background: var(--violet); }
  @keyframes tBounce { 0%,60%,100%{transform:translateY(0);opacity:0.3} 30%{transform:translateY(-5px);opacity:1} }
  .t-label { font-size: 10px; color: var(--text3); margin-left: 2px; font-family: var(--mono); }

  /* quick replies */
  .qrs { display: flex; gap: 6px; flex-wrap: wrap; }
  .qr {
    padding: 6px 14px; border-radius: 20px; font-size: 11px; font-weight: 600;
    border: 1px solid rgba(232,184,75,0.28); background: none; cursor: pointer;
    font-family: var(--body); color: var(--gold); transition: all 0.18s;
    letter-spacing: 0.02em;
  }
  .qr:hover { background: var(--gold); color: var(--bg); border-color: var(--gold); transform: translateY(-2px); box-shadow: 0 4px 16px rgba(232,184,75,0.2); }

  /* ══ RICH CARDS ══ */

  /* profile card */
  .profile-card {
    background: var(--surface); border: 1px solid rgba(232,184,75,0.18);
    border-radius: 14px; overflow: hidden; margin-top: 4px;
    box-shadow: 0 4px 24px rgba(0,0,0,0.3), 0 0 0 1px rgba(232,184,75,0.06);
  }
  .pc-hdr {
    padding: 14px 16px; border-bottom: 1px solid var(--border);
    background: linear-gradient(135deg, rgba(232,184,75,0.07), rgba(0,212,200,0.04));
    display: flex; align-items: center; gap: 12px;
  }
  .pc-av {
    width: 40px; height: 40px; border-radius: 50%;
    background: linear-gradient(135deg, var(--gold), var(--cyan));
    display: flex; align-items: center; justify-content: center;
    font-family: var(--display); font-size: 15px; font-weight: 700; color: var(--bg);
  }
  .pc-name { font-family: var(--display); font-size: 14px; font-weight: 700; color: var(--text); }
  .pc-meta { font-size: 10px; color: var(--text3); margin-top: 2px; }
  .pc-body { padding: 14px 16px; }
  .pc-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px; }
  .pc-stat {
    padding: 9px 12px; border-radius: 8px;
    background: rgba(255,255,255,0.03); border: 1px solid var(--border);
  }
  .pc-sk { font-size: 8.5px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--text3); margin-bottom: 4px; }
  .pc-sv { font-size: 12px; font-weight: 700; color: var(--gold2); font-family: var(--body); }
  .pc-tags { display: flex; gap: 5px; flex-wrap: wrap; }
  .pc-tag { font-size: 9.5px; font-weight: 700; padding: 3px 9px; border-radius: 8px; background: var(--cyan-dim); color: var(--cyan); border: 1px solid rgba(0,212,200,0.18); letter-spacing: 0.05em; }

  /* rec cards */
  .rec-list { display: flex; flex-direction: column; gap: 6px; margin-top: 4px; }
  .rec-card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 11px; padding: 12px 14px;
    display: flex; gap: 11px; align-items: flex-start;
    cursor: pointer; transition: all 0.18s; position: relative; overflow: hidden;
  }
  .rec-card::before {
    content: ''; position: absolute; left: 0; top: 0; bottom: 0;
    width: 2px; background: var(--gold); opacity: 0; transition: opacity 0.2s;
  }
  .rec-card:hover { border-color: rgba(232,184,75,0.25); transform: translateX(2px); box-shadow: 0 4px 20px rgba(0,0,0,0.3); }
  .rec-card:hover::before { opacity: 1; }
  .rec-icon {
    font-size: 16px; min-width: 30px; height: 30px;
    background: var(--gold-dim); border-radius: 7px;
    display: flex; align-items: center; justify-content: center;
  }
  .rec-info { flex: 1; min-width: 0; }
  .rec-title { font-size: 12px; font-weight: 700; color: var(--text); margin-bottom: 3px; }
  .rec-desc { font-size: 10.5px; color: var(--text2); line-height: 1.5; }
  .rec-reason { font-size: 9.5px; color: var(--cyan); margin-top: 5px; font-style: italic; }
  .rec-foot { display: flex; gap: 5px; align-items: center; margin-top: 6px; }
  .rbadge { font-size: 8px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; padding: 2px 7px; border-radius: 4px; }
  .rb-gold { background: var(--gold-dim); color: var(--gold); border: 1px solid rgba(232,184,75,0.2); }
  .rb-free { background: var(--green-dim); color: var(--green); border: 1px solid rgba(34,214,122,0.18); }
  .rb-event { background: var(--cyan-dim); color: var(--cyan); border: 1px solid rgba(0,212,200,0.2); }
  .rb-partner { background: var(--violet-dim); color: var(--violet); border: 1px solid rgba(124,108,255,0.18); }

  /* fin widget */
  .fin-widget {
    background: var(--surface); border: 1px solid var(--border2);
    border-radius: 14px; overflow: hidden; margin-top: 4px;
  }
  .fw-hdr {
    padding: 12px 16px; border-bottom: 1px solid var(--border);
    background: linear-gradient(90deg, rgba(0,212,200,0.05), rgba(232,184,75,0.04));
    display: flex; align-items: center; gap: 8px;
  }
  .fw-title { font-size: 12px; font-weight: 700; color: var(--text); flex: 1; letter-spacing: 0.03em; }
  .fw-badge { font-family: var(--mono); font-size: 8px; font-weight: 600; padding: 2px 7px; border-radius: 4px; background: var(--cyan-dim); color: var(--cyan); letter-spacing: 0.1em; }
  .fw-body { padding: 16px; }
  .fin-meters { display: grid; grid-template-columns: repeat(3,1fr); gap: 10px; margin-bottom: 16px; }
  .fin-meter { text-align: center; }
  .fm-label { font-size: 8.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.11em; color: var(--text3); margin-bottom: 8px; }
  .ring-wrap { position: relative; width: 68px; height: 68px; margin: 0 auto 4px; }
  .ring-wrap svg { transform: rotate(-90deg); }
  .ring-bg { fill: none; stroke: rgba(255,255,255,0.05); stroke-width: 5; }
  .ring-fill { fill: none; stroke-width: 5; stroke-linecap: round; transition: stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1); }
  .ring-label {
    position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
    font-family: var(--mono); font-size: 13px; font-weight: 700;
  }
  .fin-suggestions { display: flex; flex-direction: column; gap: 6px; }
  .fin-sug-row {
    display: flex; gap: 9px; align-items: flex-start;
    padding: 9px 11px; border-radius: 8px;
    background: rgba(255,255,255,0.02); border: 1px solid var(--border);
  }
  .fsr-icon { font-size: 12px; min-width: 18px; margin-top: 1px; }
  .fsr-text { font-size: 11px; line-height: 1.55; color: var(--text2); }
  .fsr-text strong { color: var(--text); font-weight: 700; }

  /* feedback */
  .fb-widget {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 13px; padding: 14px 16px; margin-top: 4px;
    border-left: 2px solid var(--violet);
  }
  .fb-header { font-size: 10.5px; font-weight: 700; color: var(--text2); margin-bottom: 11px; letter-spacing: 0.06em; text-transform: uppercase; }
  .fb-stars { display: flex; gap: 5px; margin-bottom: 10px; }
  .fb-star {
    width: 30px; height: 30px; border-radius: 7px; border: 1px solid var(--border2);
    background: rgba(255,255,255,0.03); cursor: pointer; font-size: 15px;
    display: flex; align-items: center; justify-content: center; transition: all 0.15s;
  }
  .fb-star:hover, .fb-star.sel { border-color: var(--gold); background: var(--gold-dim); transform: scale(1.1); }
  .fb-thumbs { display: flex; gap: 6px; margin-bottom: 10px; }
  .fb-thumb {
    flex: 1; padding: 7px; border-radius: 8px; border: 1px solid var(--border2);
    background: rgba(255,255,255,0.02); cursor: pointer;
    display: flex; align-items: center; justify-content: center; gap: 5px;
    font-size: 11.5px; font-weight: 600; color: var(--text3); transition: all 0.15s;
  }
  .fb-thumb:hover { border-color: var(--cyan); color: var(--cyan); background: var(--cyan-dim); }
  .fb-thumb.sel-up { border-color: var(--green); background: var(--green-dim); color: var(--green); }
  .fb-thumb.sel-down { border-color: var(--red); background: var(--red-dim); color: var(--red); }
  .fb-tags { display: flex; gap: 5px; flex-wrap: wrap; margin-bottom: 10px; }
  .fb-tag {
    font-size: 10px; padding: 3px 9px; border-radius: 20px;
    border: 1px solid var(--border2); background: rgba(255,255,255,0.02);
    cursor: pointer; color: var(--text3); transition: all 0.15s;
  }
  .fb-tag.sel { border-color: var(--cyan); background: var(--cyan-dim); color: var(--cyan); font-weight: 700; }
  .fb-textarea {
    width: 100%; padding: 8px 11px; border-radius: 8px; border: 1px solid var(--border2);
    font-family: var(--body); font-size: 11.5px; background: rgba(255,255,255,0.02);
    color: var(--text); resize: none; outline: none; margin-bottom: 9px;
    transition: border-color 0.2s;
  }
  .fb-textarea:focus { border-color: var(--violet); }
  .fb-textarea::placeholder { color: var(--text3); }
  .fb-submit {
    width: 100%; padding: 9px; border-radius: 8px; border: none; cursor: pointer;
    background: linear-gradient(90deg, var(--violet), #9c8cff);
    color: white; font-family: var(--body); font-size: 12px; font-weight: 700;
    letter-spacing: 0.04em; transition: all 0.18s;
  }
  .fb-submit:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); box-shadow: 0 4px 16px rgba(124,108,255,0.3); }
  .fb-submit:disabled { opacity: 0.4; cursor: not-allowed; }
  .fb-done { text-align: center; padding: 10px 0; }
  .fb-done-icon { font-size: 22px; display: block; margin-bottom: 5px; }
  .fb-done-text { font-size: 12px; color: var(--green); font-weight: 700; }

  /* nudge */
  .nudge-bar {
    background: linear-gradient(90deg, rgba(232,184,75,0.06), rgba(0,212,200,0.04));
    border: 1px solid rgba(232,184,75,0.18); border-radius: 10px;
    padding: 10px 14px; display: flex; align-items: center; gap: 10px;
    margin-top: 4px; cursor: pointer; transition: all 0.18s;
    animation: fadeUp 0.3s ease forwards;
  }
  .nudge-bar:hover { box-shadow: 0 4px 16px rgba(232,184,75,0.12); transform: translateY(-1px); }
  .nudge-icon { font-size: 17px; flex-shrink: 0; }
  .nudge-body { flex: 1; }
  .nudge-title { font-size: 11.5px; font-weight: 700; color: var(--text); margin-bottom: 1px; }
  .nudge-desc { font-size: 10px; color: var(--text2); line-height: 1.4; }
  .nudge-cta { font-size: 10px; font-weight: 800; color: var(--gold); letter-spacing: 0.06em; white-space: nowrap; }

  /* ══ INPUT AREA ══ */
  .input-area {
    background: var(--surface); border-top: 1px solid var(--border);
    padding: 14px 22px; flex-shrink: 0;
  }
  .stage-strip {
    display: flex; align-items: center; gap: 8px; margin-bottom: 10px;
  }
  .stage-dot { width: 4px; height: 4px; border-radius: 50%; background: var(--gold); box-shadow: 0 0 6px var(--gold); }
  .stage-text { font-size: 10.5px; color: var(--text3); font-weight: 500; flex: 1; }
  .stage-pill {
    font-size: 8px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase;
    padding: 3px 9px; border-radius: 9px; font-family: var(--mono);
    background: var(--gold-dim); color: var(--gold); border: 1px solid rgba(232,184,75,0.22);
  }
  .input-row { display: flex; gap: 8px; align-items: flex-end; }
  .input-box {
    flex: 1; min-height: 42px; max-height: 110px; padding: 11px 16px;
    border-radius: 22px; border: 1px solid var(--border2);
    font-family: var(--body); font-size: 13px; resize: none; outline: none;
    background: var(--surface); color: var(--text); line-height: 1.5;
    transition: border-color 0.2s;
  }
  .input-box:focus { border-color: rgba(232,184,75,0.4); background: var(--surface2); }
  .input-box::placeholder { color: var(--text3); }
  .send-btn {
    width: 42px; height: 42px; border-radius: 50%; flex-shrink: 0;
    background: linear-gradient(135deg, var(--gold), #c8780a);
    border: none; cursor: pointer; display: flex; align-items: center;
    justify-content: center; font-size: 14px; color: var(--bg);
    transition: all 0.18s; box-shadow: 0 2px 12px rgba(232,184,75,0.25);
  }
  .send-btn:hover { transform: scale(1.07); box-shadow: 0 4px 20px rgba(232,184,75,0.4); }
  .send-btn:active { transform: scale(0.94); }

  /* ══ REASONING PANEL ══ */
  .rp {
    background: var(--bg2); border-left: 1px solid var(--border);
    width: 0; overflow: hidden; flex-shrink: 0;
    display: flex; flex-direction: column; transition: width 0.35s cubic-bezier(0.4,0,0.2,1);
  }
  .rp.open { width: var(--reasoning-w); }
  .rp-hdr {
    padding: 14px 16px; border-bottom: 1px solid var(--border);
    display: flex; align-items: center; gap: 8px; flex-shrink: 0;
    background: rgba(124,108,255,0.04);
  }
  .rp-title { font-family: var(--display); font-size: 13px; font-weight: 700; color: var(--text); flex: 1; }
  .rp-close { background: none; border: none; cursor: pointer; color: var(--text3); font-size: 13px; padding: 2px; }
  .rp-body { flex: 1; overflow-y: auto; padding: 14px 16px; display: flex; flex-direction: column; gap: 12px; }
  .rp-sec { font-size: 8.5px; font-weight: 800; letter-spacing: 0.18em; text-transform: uppercase; color: var(--text3); margin-bottom: 8px; display: flex; align-items: center; gap: 6px; }
  .rp-sec::after { content: ''; flex: 1; height: 1px; background: var(--border); }

  .trace-card {
    padding: 10px 12px; border-radius: 8px; background: rgba(255,255,255,0.02);
    border: 1px solid var(--border); margin-bottom: 5px;
  }
  .tc-agent { font-size: 8px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; font-family: var(--mono); margin-bottom: 4px; }
  .tc-agent.profiler { color: var(--violet); }
  .tc-agent.recommender { color: var(--gold); }
  .tc-agent.rag { color: var(--cyan); }
  .tc-agent.action { color: var(--green); }
  .tc-text { font-size: 10.5px; color: var(--text2); line-height: 1.55; }
  .tc-text em { font-style: italic; color: var(--text3); }

  /* risk ring */
  .risk-visual { display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 10px; background: rgba(255,255,255,0.02); border: 1px solid var(--border); margin-bottom: 8px; }
  .risk-ring-wrap { position: relative; width: 56px; height: 56px; flex-shrink: 0; }
  .risk-ring-wrap svg { transform: rotate(-90deg); }
  .risk-ring-label { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-family: var(--mono); font-size: 11px; font-weight: 700; }
  .risk-info { flex: 1; }
  .risk-title { font-size: 12px; font-weight: 700; color: var(--text); margin-bottom: 3px; }
  .risk-desc { font-size: 10px; color: var(--text2); line-height: 1.5; }

  .ca-row { display: flex; align-items: center; gap: 8px; margin-bottom: 7px; font-size: 10.5px; }
  .ca-label { color: var(--text3); min-width: 58px; font-size: 9.5px; }
  .ca-track { flex: 1; height: 3px; background: rgba(255,255,255,0.04); border-radius: 2px; overflow: hidden; }
  .ca-fill { height: 100%; border-radius: 2px; background: linear-gradient(90deg, var(--cyan), var(--violet)); transition: width 1s ease; }
  .ca-val { font-family: var(--mono); font-size: 9.5px; font-weight: 600; color: var(--text2); min-width: 30px; text-align: right; }

  /* feedback analytics */
  .fb-analytics-card { padding: 12px; border-radius: 9px; background: rgba(255,255,255,0.02); border: 1px solid var(--border); }
  .fb-big { font-family: var(--mono); font-size: 30px; font-weight: 700; color: var(--gold); line-height: 1; }
  .fb-meta { font-size: 10px; color: var(--text3); margin-top: 2px; }
  .fb-mini-stars { display: flex; gap: 2px; font-size: 11px; margin: 5px 0; }
  .fb-tag-chips { display: flex; gap: 4px; flex-wrap: wrap; }
  .fb-tag-chip { font-size: 9px; font-weight: 700; padding: 2px 7px; border-radius: 6px; background: var(--cyan-dim); color: var(--cyan); border: 1px solid rgba(0,212,200,0.15); }

  /* event log */
  .evt-row { display: flex; gap: 7px; align-items: flex-start; margin-bottom: 5px; }
  .evt-time { font-family: var(--mono); font-size: 8.5px; color: var(--text3); padding-top: 1px; white-space: nowrap; }
  .evt-label { font-size: 10px; color: var(--text2); }
  .evt-label strong { font-weight: 700; color: var(--text); }

  /* ══ TOAST ══ */
  .toast {
    position: fixed; top: 16px; right: 16px; z-index: 9999;
    background: var(--surface2); color: var(--text); padding: 10px 16px;
    border-radius: 10px; font-size: 12px; font-weight: 600;
    display: flex; align-items: center; gap: 8px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px var(--border2);
    transition: all 0.3s cubic-bezier(0.4,0,0.2,1);
    transform: translateY(-70px); opacity: 0; pointer-events: none;
  }
  .toast.show { transform: none; opacity: 1; }
  .toast-icon { font-size: 14px; }

  /* ══ BG TEXTURE ══ */
  .bg-grid {
    position: fixed; inset: 0; pointer-events: none; z-index: 0;
    background-image: linear-gradient(rgba(28,28,28,0.04) 1px, transparent 1px),
                      linear-gradient(90deg, rgba(28,28,28,0.04) 1px, transparent 1px);
    background-size: 40px 40px;
  }
  .theme-dark .bg-grid {
    background-image: linear-gradient(rgba(255,255,255,0.012) 1px, transparent 1px),
                      linear-gradient(90deg, rgba(255,255,255,0.012) 1px, transparent 1px);
  }

  /* workspace */
  .workspace-shell {
    flex: 1; min-height: 0; position: relative;
    display: flex; flex-direction: column; overflow: hidden;
  }
  .workspace-shell.locked { filter: blur(8px); pointer-events: none; user-select: none; }
  .workspace-body {
    flex: 1; min-height: 0; overflow-y: auto; padding: 22px 24px 28px;
    display: flex; flex-direction: column; gap: 16px;
  }
  .workspace-grid {
    display: grid; grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
  }
  .ws-card {
    background: rgba(255,255,255,0.025);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 16px 18px;
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.03);
  }
  .ws-card.hero {
    background:
      radial-gradient(circle at top right, rgba(232,184,75,0.12), transparent 36%),
      linear-gradient(145deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01));
  }
  .ws-card-title {
    font-family: var(--display); font-size: 18px; font-weight: 700;
    color: var(--text); margin-bottom: 6px;
  }
  .ws-card-sub {
    font-size: 11px; line-height: 1.6; color: var(--text2);
  }
  .ws-kicker {
    font-size: 9px; letter-spacing: 0.14em; text-transform: uppercase;
    color: var(--gold); font-weight: 700; margin-bottom: 10px;
  }
  .ws-stat-row {
    display: grid; grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px; margin-top: 14px;
  }
  .ws-stat {
    padding: 12px; border-radius: 12px; background: rgba(255,255,255,0.025);
    border: 1px solid var(--border);
  }
  .ws-stat-label {
    font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text3);
  }
  .ws-stat-value {
    margin-top: 8px; font-size: 18px; font-weight: 700; color: var(--gold2);
  }
  .ws-list {
    display: flex; flex-direction: column; gap: 10px;
  }
  .ws-list-item {
    padding: 12px 14px; border-radius: 12px; border: 1px solid var(--border);
    background: rgba(255,255,255,0.02);
    transition: border-color 0.18s ease, background 0.18s ease;
  }
  .ws-list-item.expandable {
    cursor: pointer;
  }
  .ws-list-item.expandable:hover {
    border-color: rgba(232,184,75,0.18);
    background: rgba(255,255,255,0.03);
  }
  .ws-list-title {
    font-size: 12px; font-weight: 700; color: var(--text);
  }
  .ws-list-desc {
    margin-top: 5px; font-size: 11px; line-height: 1.6; color: var(--text2);
  }
  .ws-list-meta {
    margin-top: 8px; display: inline-flex; align-items: center; gap: 6px;
    font-size: 9px; font-family: var(--mono); color: var(--cyan);
    text-transform: uppercase; letter-spacing: 0.08em;
  }
  .ws-item-head {
    display: flex; align-items: center; gap: 10px;
  }
  .ws-expand {
    margin-left: auto; color: var(--text3); font-size: 14px; line-height: 1;
  }
  .ws-item-detail {
    margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--border);
    font-size: 11px; line-height: 1.65; color: var(--text2);
  }
  .ws-chip-row {
    display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px;
  }
  .ws-chip {
    padding: 5px 10px; border-radius: 999px; border: 1px solid var(--border2);
    background: rgba(255,255,255,0.03); font-size: 10px; color: var(--text2);
  }
  .ws-actions {
    display: flex; gap: 10px; flex-wrap: wrap; margin-top: 14px;
  }
  .ws-btn {
    border: 1px solid rgba(232,184,75,0.2);
    background: var(--gold-dim);
    color: var(--gold2);
    border-radius: 999px;
    padding: 8px 14px;
    font-family: var(--body);
    font-size: 11px;
    font-weight: 700;
    cursor: pointer;
  }
  .ws-btn.secondary {
    border-color: var(--border2);
    background: rgba(255,255,255,0.03);
    color: var(--text2);
  }
  .ws-empty {
    padding: 18px; border: 1px dashed var(--border2); border-radius: 12px;
    color: var(--text3); font-size: 11px; line-height: 1.6;
    background: rgba(255,255,255,0.015);
  }
  .alert-grid {
    display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px;
  }
  .alert-card {
    padding: 14px 16px; border-radius: 14px; border: 1px solid var(--border);
    background: linear-gradient(145deg, rgba(255,255,255,0.03), rgba(255,255,255,0.015));
  }
  .alert-card.live { border-color: rgba(0,212,200,0.22); }
  .alert-top {
    display: flex; align-items: center; gap: 10px; margin-bottom: 10px;
  }
  .alert-icon {
    width: 34px; height: 34px; border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    background: rgba(255,255,255,0.05); font-size: 15px;
  }
  .alert-title { font-size: 12px; font-weight: 700; color: var(--text); }
  .alert-body { font-size: 11px; line-height: 1.6; color: var(--text2); }
  .alert-tag {
    margin-top: 10px; display: inline-block; padding: 4px 8px; border-radius: 999px;
    font-size: 9px; font-family: var(--mono); letter-spacing: 0.08em; text-transform: uppercase;
    background: rgba(0,212,200,0.1); color: var(--cyan);
  }
  .rp-mini-list {
    display: flex; flex-direction: column; gap: 8px;
  }
  .rp-mini-item {
    padding: 10px 12px; border-radius: 10px; border: 1px solid var(--border);
    background: rgba(255,255,255,0.02);
  }
  .rp-mini-title {
    font-size: 10px; font-weight: 700; color: var(--text);
  }
  .rp-mini-desc {
    margin-top: 5px; font-size: 10px; line-height: 1.55; color: var(--text2);
  }
  .deck-overlay {
    position: absolute; inset: 0; z-index: 30;
    display: flex; align-items: center; justify-content: center;
    padding: 28px;
    background: linear-gradient(180deg, rgba(7,8,13,0.78), rgba(7,8,13,0.92));
    backdrop-filter: blur(10px);
  }
  .deck-card {
    width: min(560px, 100%);
    border-radius: 28px;
    border: 1px solid rgba(255,255,255,0.08);
    background:
      radial-gradient(circle at top, rgba(232,184,75,0.12), transparent 38%),
      linear-gradient(160deg, rgba(18,21,32,0.98), rgba(10,12,18,0.98));
    box-shadow: 0 24px 80px rgba(0,0,0,0.42);
    padding: 28px 28px 24px;
  }
  .deck-step {
    font-size: 10px; font-family: var(--mono); letter-spacing: 0.14em;
    color: var(--gold2); text-transform: uppercase;
  }
  .deck-head {
    margin-top: 18px; display: flex; align-items: flex-start; justify-content: space-between; gap: 16px;
  }
  .deck-kicker {
    font-size: 11px; font-weight: 700; color: var(--cyan); letter-spacing: 0.08em; text-transform: uppercase;
  }
  .deck-title {
    margin-top: 8px; font-family: var(--display); font-size: 31px; line-height: 1.08; color: var(--text);
  }
  .deck-copy {
    margin-top: 12px; font-size: 12px; line-height: 1.7; color: var(--text2);
    max-width: 420px;
  }
  .deck-orb {
    width: 72px; height: 72px; border-radius: 22px; flex-shrink: 0;
    background: linear-gradient(135deg, rgba(232,184,75,0.18), rgba(0,212,200,0.16));
    border: 1px solid rgba(255,255,255,0.08);
    display: flex; align-items: center; justify-content: center; font-size: 26px;
  }
  .deck-track {
    margin-top: 20px; height: 5px; border-radius: 999px; overflow: hidden;
    background: rgba(255,255,255,0.06);
  }
  .deck-fill {
    height: 100%; border-radius: inherit; background: linear-gradient(90deg, var(--gold), var(--cyan));
    transition: width 0.35s ease;
  }
  .deck-options {
    margin-top: 22px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px;
  }
  .deck-option {
    padding: 14px 14px; border-radius: 16px;
    border: 1px solid var(--border2); background: rgba(255,255,255,0.03);
    color: var(--text); font-family: var(--body); font-size: 12px; font-weight: 600;
    text-align: left; cursor: pointer; transition: all 0.18s ease;
  }
  .deck-option:hover { border-color: rgba(232,184,75,0.24); transform: translateY(-1px); }
  .deck-freeform {
    margin-top: 18px; display: flex; gap: 10px; align-items: center;
  }
  .deck-input {
    flex: 1; min-height: 46px; border-radius: 16px; border: 1px solid var(--border2);
    background: rgba(255,255,255,0.03); color: var(--text); padding: 0 14px;
    font-family: var(--body); font-size: 12px; outline: none;
  }
  .deck-input:focus { border-color: rgba(232,184,75,0.3); }
  .deck-submit {
    min-width: 116px; height: 46px; border-radius: 16px; border: none; cursor: pointer;
    background: linear-gradient(135deg, var(--gold), #c8780a); color: var(--bg);
    font-family: var(--body); font-size: 11px; font-weight: 800; letter-spacing: 0.04em;
  }
  .deck-note {
    margin-top: 14px; font-size: 10px; line-height: 1.6; color: var(--text3);
  }

  .nav-btn:disabled,
  .hdr-btn:disabled,
  .ws-btn:disabled {
    opacity: 0.45; cursor: not-allowed;
  }

  @media (max-width: 1100px) {
    .workspace-grid, .alert-grid { grid-template-columns: 1fr; }
  }

  @media (max-width: 760px) {
    .deck-card { padding: 22px 18px 18px; border-radius: 22px; }
    .deck-head { flex-direction: column; }
    .deck-title { font-size: 26px; }
    .deck-options { grid-template-columns: 1fr; }
    .deck-freeform { flex-direction: column; }
    .deck-submit { width: 100%; }
    .ws-stat-row { grid-template-columns: 1fr; }
  }
`;

// ─── DATA ─────────────────────────────────────────────────────────────────────
const FLOW = [
  {
    id: "greeting",
    agent: "concierge",
    bot: "Welcome to **ET Concierge** — your AI-powered financial guide across the ET ecosystem.\n\nI'm running a multi-agent pipeline: Profiler · Recommender · RAG · Action Dispatcher. Ready to build your personalized financial intelligence profile?",
    qr: ["Let's build my profile 🚀", "How does this work?"],
    next: { "Let's build my profile 🚀": "q1", "How does this work?": "about" }
  },
  {
    id: "about",
    agent: "concierge",
    bot: "My pipeline works in 4 stages:\n\n**Profiler Agent** → Extracts your persona from conversation\n**Recommender Agent** → Matches ET products to your profile\n**RAG Module** → Retrieves relevant ET market intelligence\n**Action Dispatcher** → Converts insights into executable actions\n\nShall we begin?",
    qr: ["Yes, start profiling!", "Maybe later"],
    next: { "Yes, start profiling!": "q1", "Maybe later": "end_soft" }
  },
  {
    id: "q1", agent: "profiler",
    bot: "**Profiler Agent is active.** What is your primary financial interest area?",
    qr: ["📈 Stock Markets", "💼 Personal Finance", "🏢 Business & Startups", "🌍 Economy & Policy"],
    next: "q2", profileKey: "interests",
    stageLabel: "Profiler Agent · Step 1 of 5", stagePill: "01/05",
    reasoning: { agent: "profiler", text: "Extracting primary interest cluster to seed the persona JSON. This will determine content stream, product verticals, and risk-correlation buckets." }
  },
  {
    id: "q2", agent: "profiler",
    bot: "**Financial goal extraction.** What is your primary goal right now?",
    qr: ["🎯 Grow Wealth", "🏠 Buy Property", "🎓 Child's Education", "🌴 Early Retirement"],
    next: "q3", profileKey: "goal",
    stageLabel: "Profiler Agent · Step 2 of 5", stagePill: "02/05",
    reasoning: { agent: "profiler", text: "Goal classification narrows the recommendation vector space. Each goal maps to a specific ET product cluster and urgency tier." }
  },
  {
    id: "q3", agent: "profiler",
    bot: "**Portfolio classification.** How would you describe your current investments?",
    qr: ["Just Starting Out", "Mostly Mutual Funds", "Diversified Portfolio", "Heavy in Stocks/ETFs"],
    next: "q4", profileKey: "investments",
    stageLabel: "Profiler Agent · Step 3 of 5", stagePill: "03/05",
    reasoning: { agent: "profiler", text: "Investment maturity level adjusts the sophistication of recommendations. Beginners receive onboarding products; advanced investors receive premium analytics tools." }
  },
  {
    id: "q4", agent: "profiler",
    bot: "**Risk appetite scoring.** This determines product alignment and advisory tone.",
    qr: ["🟢 Conservative", "🟡 Moderate", "🔴 Aggressive", "🤷 Not Sure Yet"],
    next: "q5", profileKey: "risk",
    stageLabel: "Profiler Agent · Step 4 of 5", stagePill: "04/05",
    reasoning: { agent: "profiler", text: "Risk score maps to a 0–10 scale internally. Conservative → 2–3, Moderate → 5–6, Aggressive → 8–9. This gates high-volatility recommendations." }
  },
  {
    id: "q5", agent: "profiler",
    bot: "**Engagement preference.** How do you prefer to consume financial insights?",
    qr: ["📰 Daily Articles", "🎓 Deep Courses", "🔔 Smart Alerts", "📊 Data & Analysis"],
    next: "profile_done", profileKey: "engagement",
    stageLabel: "Profiler Agent · Step 5 of 5", stagePill: "05/05",
    reasoning: { agent: "profiler", text: "Engagement format preference determines delivery channel optimization. Alerts → push/SMS; Articles → email digest; Courses → Masterclass pipeline; Data → ET Markets APIs." }
  },
  {
    id: "profile_done", agent: "profiler",
    bot: "✅ **Persona extraction complete.** Here is your structured profile:",
    type: "profile_card", stageLabel: "Profile Complete", stagePill: "Done ✓",
    qr: ["Generate Recommendations", "View Financial Analysis", "Activate Smart Alerts"],
    next: { "Generate Recommendations": "recs", "View Financial Analysis": "fin_analysis", "Activate Smart Alerts": "alerts" },
    reasoning: { agent: "profiler", text: "Persona JSON finalized. Passing to Recommendation Agent: {interests, goal, investments, risk, engagement}. Confidence score: 94%." }
  },
  {
    id: "recs", agent: "recommender",
    bot: "**Recommender Agent** has matched your profile to the ET ecosystem. Here are your top personalized products with reasoning traces:",
    type: "recommendations", stageLabel: "Recommender Agent", stagePill: "Active",
    qr: ["Analyze My Portfolio", "Activate Smart Alerts", "Explore Masterclass"],
    next: { "Analyze My Portfolio": "fin_analysis", "Activate Smart Alerts": "alerts", "Explore Masterclass": "masterclass" },
    reasoning: { agent: "recommender", text: "Running collaborative filtering on user persona JSON. Scoring 47 ET products against risk × goal × engagement matrix. Returning top 4 with confidence ≥ 0.78." }
  },
  {
    id: "fin_analysis", agent: "rag",
    bot: "**RAG Module** has retrieved and synthesized your Financial Health Analysis from ET's intelligence base:",
    type: "fin_widget", stageLabel: "RAG · Financial Intelligence", stagePill: "Synthesizing",
    qr: ["Show Partner Services", "View Recommendations", "Activate Smart Alerts"],
    next: { "Show Partner Services": "partners", "View Recommendations": "recs", "Activate Smart Alerts": "alerts" },
    reasoning: { agent: "rag", text: "Queried ET Knowledge Base (48 articles). Retrieved: portfolio diversification, term insurance gap analysis, goal-tracking methodology. Synthesizing balanced, non-conflicting view." }
  },
  {
    id: "partners", agent: "recommender",
    bot: "**Recommender Agent** has identified partner services to fill gaps in your financial health:",
    type: "partner_recs", stageLabel: "Marketplace Concierge", stagePill: "Partners",
    qr: ["Full Recommendations", "Activate Smart Alerts", "Restart Session"],
    next: { "Full Recommendations": "recs", "Activate Smart Alerts": "alerts", "Restart Session": "greeting" },
    reasoning: { agent: "recommender", text: "Partner match executed: credit product → cashback on investments; insurance gap → term cover recommendation; trading → brokerage alignment with risk appetite." }
  },
  {
    id: "alerts", agent: "action",
    bot: "**Action Dispatcher** is setting up your intelligent multi-channel alert system:\n\n• Market intelligence every morning at 8 AM\n• Portfolio milestone triggers in real time\n• Curated event invites matching your profile\n• Partner offers calibrated to your financial goals\n\nManage your active channels in the sidebar.",
    stageLabel: "Action Dispatcher", stagePill: "Executing",
    qr: ["View Recommendations", "Analyze Portfolio", "Restart Session"],
    next: { "View Recommendations": "recs", "Analyze Portfolio": "fin_analysis", "Restart Session": "greeting" },
    reasoning: { agent: "action", text: "Dispatch queue initialized. Simulating API calls: [Twilio SMS ✓] [Email SMTP ✓] [Push FCM ✓] [WhatsApp Business ✓]. Alert schedule committed to user session." }
  },
  {
    id: "masterclass", agent: "recommender",
    bot: "**Recommender Agent** has curated ET Masterclass courses aligned with your profile:",
    type: "masterclass_recs", stageLabel: "ET Masterclass · Curated", stagePill: "Courses",
    qr: ["Analyze Portfolio", "Activate Alerts", "All Recommendations"],
    next: { "Analyze Portfolio": "fin_analysis", "Activate Alerts": "alerts", "All Recommendations": "recs" },
    reasoning: { agent: "recommender", text: "Course matching: risk-appetite → advanced analysis content; engagement preference → instructor-led format; goal → wealth-building curriculum track." }
  },
  {
    id: "end_soft", agent: "concierge",
    bot: "Understood — I'll be here whenever you're ready. Your session state will be preserved.\n\nCome back anytime to build your personalized ET financial intelligence profile. 👋",
    qr: ["Actually, let's start now!"],
    next: { "Actually, let's start now!": "q1" }
  }
];
const FLOWMAP = {};
FLOW.forEach(f => { FLOWMAP[f.id] = f; });

const RECS = [
  { icon: "📈", title: "ET Markets Premium", desc: "Real-time screener, F&O analytics, portfolio tracker with AI alerts.", badge: "rb-gold", badgeText: "ET Prime", reason: "Matches your Stock Markets interest and analytical engagement style." },
  { icon: "🎓", title: "Value Investing Masterclass", desc: "12-week deep-dive into fundamental analysis with industry veterans.", badge: "rb-event", badgeText: "Masterclass", reason: "Aligned with your wealth-building goal and course preference." },
  { icon: "🏛️", title: "ET Global Business Summit", desc: "Network with 500+ founders and investors. Personalized session matching.", badge: "rb-event", badgeText: "Event", reason: "Business interest cluster match. High ROI for your persona type." },
  { icon: "📰", title: "ET Prime Subscription", desc: "Unlimited access to in-depth analysis, proprietary data, and long-form journalism.", badge: "rb-gold", badgeText: "Premium", reason: "Core product for your content consumption profile." },
];

const PARTNER_RECS = [
  { icon: "💳", title: "HDFC Moneyback Credit Card", desc: "5% cashback on investments + zero forex markup for international ETFs.", badge: "rb-partner", badgeText: "Partner", reason: "Investment cashback aligns with your active portfolio management." },
  { icon: "🛡️", title: "LIC Term Insurance Plan", desc: "₹1 Cr coverage at ₹899/month — RAG analysis detected a protection gap.", badge: "rb-partner", badgeText: "Insurance", reason: "Financial health analysis identified missing term cover in your profile." },
  { icon: "🏦", title: "Zerodha Kite Pro", desc: "Commission-free trading with advanced charting, matching your risk profile.", badge: "rb-free", badgeText: "Free Trial", reason: "Brokerage recommendation calibrated to your investment maturity level." },
];

const MASTERCLASS_RECS = [
  { icon: "📊", title: "Technical Analysis Bootcamp", desc: "Master candlestick patterns, RSI, MACD, and momentum strategies.", badge: "rb-gold", badgeText: "Premium", reason: "High relevance to your markets interest and aggressive engagement." },
  { icon: "🏘️", title: "Real Estate Investing 101", desc: "From REITs to direct property — diversify beyond equities.", badge: "rb-event", badgeText: "Live Course", reason: "Diversification gap identified in your portfolio classification." },
  { icon: "🧠", title: "Behavioral Finance Workshop", desc: "Understand cognitive biases affecting your investment decisions.", badge: "rb-free", badgeText: "Free", reason: "Foundation course recommended for all investor persona types." },
];

const NUDGE_RULES = [
  { trigger: "recs", icon: "🎓", title: "Unlock deeper insights", desc: "Users with your profile save 2–3x more with ET Prime exclusive reports.", cta: "Explore ET Prime →" },
  { trigger: "fin_analysis", icon: "🛡️", title: "RAG detected a protection gap", desc: "₹1 Cr term cover detected as missing. LIC offers it at ₹899/month for ET readers.", cta: "Get Quote →" },
  { trigger: "partners", icon: "📈", title: "Connect your portfolio", desc: "Link Zerodha to your ET dashboard. See all holdings and alerts in one place.", cta: "Connect Now →" },
  { trigger: "masterclass", icon: "🏛️", title: "Meet your instructors live", desc: "Your course instructors are speaking at ET Global Business Summit — early-bird closing.", cta: "Register →" },
];

const PROFILE_DECK = [
  { nodeId: "q1", icon: "Stocks", hint: "Profile setup", title: "What do you want ET to help you with most?" },
  { nodeId: "q2", icon: "Goal", hint: "Goal mapping", title: "What is your most important money goal right now?" },
  { nodeId: "q3", icon: "Portfolio", hint: "Portfolio baseline", title: "Where are you in your investing journey today?" },
  { nodeId: "q4", icon: "Risk", hint: "Risk fit", title: "How much market movement feels comfortable to you?" },
  { nodeId: "q5", icon: "Alerts", hint: "Delivery preference", title: "How should ET show up for you every day?" },
];

const FB_TAGS_POS = ["Highly Relevant", "Accurate", "Great UX", "Strong Recommendations", "Time-saving"];
const FB_TAGS_NEG = ["Too Generic", "Not Relevant", "Too Many Steps", "Missing Products", "Unclear"];

function nowTime() { return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }

function looksLikeQuestion(text) {
  const trimmed = String(text || "").trim().toLowerCase();
  if (!trimmed) return false;
  return trimmed.includes("?") || /^(what|why|how|when|where|which|who|can|could|should|would|will|is|are|do|does|did|best)\b/.test(trimmed);
}

function normalizeResponse(payload) {
  return payload?.result || payload;
}

function titleize(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function mapProfileToConversation(profile) {
  return [
    `The user is interested in ${profile.interests || "financial intelligence"}.`,
    `Their main goal is ${profile.goal || "building a stronger financial plan"}.`,
    `Their current portfolio looks like ${profile.investments || "an early-stage investing setup"}.`,
    `Their risk appetite is ${profile.risk || "moderate"}.`,
    `They prefer ${profile.engagement || "smart ET updates"} as their engagement mode.`,
    "Build the full ET Concierge journey across recommendations, RAG, onboarding, cross-sell, marketplace, and action dispatch.",
  ].join(" ");
}

function mapProfileCard(profile, conciergeData) {
  const persona = conciergeData?.core?.persona;
  if (!persona) return profile;

  return {
    interests: persona.persona_type || profile.interests,
    goal: (persona.financial_goals || []).join(", ") || profile.goal,
    investments: profile.investments,
    risk: `${persona.risk_appetite || profile.risk} · ${persona.risk_score ?? "?"}/10`,
    engagement: profile.engagement,
  };
}

function badgeForCategory(category = "") {
  const normalized = String(category).toLowerCase();
  if (normalized.includes("partner") || normalized.includes("insurance") || normalized.includes("loan") || normalized.includes("wealth") || normalized.includes("credit")) {
    return { badge: "rb-partner", badgeText: "Partner" };
  }
  if (normalized.includes("event") || normalized.includes("masterclass") || normalized.includes("learning")) {
    return { badge: "rb-event", badgeText: "Experience" };
  }
  if (normalized.includes("free")) {
    return { badge: "rb-free", badgeText: "Free" };
  }
  return { badge: "rb-gold", badgeText: "ET Pick" };
}

function recommendationItemsFromData(conciergeData, fallbackItems) {
  const items = conciergeData?.core?.recommendations?.recommended_products || [];
  if (!items.length) return fallbackItems;

  return items.map((item) => {
    const badge = badgeForCategory(item.category);
    return {
      icon: "✨",
      title: item.name,
      desc: item.summary,
      reason: item.why_it_fits,
      ...badge,
    };
  });
}

function partnerItemsFromData(conciergeData, fallbackItems) {
  const items = conciergeData?.marketplace?.offers || [];
  if (!items.length) return fallbackItems;

  return items.map((item) => ({
    icon: item.category === "insurance" ? "🛡️" : item.category === "loan" ? "🏦" : item.category === "credit_card" ? "💳" : "📈",
    title: item.product_name,
    desc: item.next_step,
    reason: item.fit_summary,
    badge: "rb-partner",
    badgeText: titleize(item.category),
  }));
}

function masterclassItemsFromData(conciergeData, fallbackItems) {
  const touchpoints = conciergeData?.ecosystem?.prioritized_touchpoints || [];
  const learning = touchpoints.filter((item) => ["learning", "events"].includes(String(item.pillar).toLowerCase()));
  if (!learning.length) return fallbackItems;

  return learning.map((item) => ({
    icon: String(item.pillar).toLowerCase() === "events" ? "🏛️" : "🎓",
    title: item.name,
    desc: item.cta,
    reason: item.why_for_this_user,
    badge: "rb-event",
    badgeText: titleize(item.pillar),
  }));
}

function financialWidgetData(profile, conciergeData) {
  const navigator = conciergeData?.financial_life;
  const persona = conciergeData?.core?.persona;
  if (!navigator || !persona) return null;

  const health = Math.max(30, Math.min(96, 58 + ((persona.risk_score || 5) * 4) - ((navigator.portfolio_gaps || []).length * 6)));
  const diversification = Math.max(24, Math.min(92, 70 - ((navigator.portfolio_gaps || []).length * 8)));
  const goalProgress = Math.max(25, Math.min(90, 35 + ((navigator.immediate_needs || []).length * 8)));

  const suggestions = [
    ...(navigator.portfolio_gaps || []).slice(0, 1).map((item) => ["⚡", "Gap", item]),
    ...(navigator.immediate_needs || []).slice(0, 1).map((item) => ["🎯", "Need", item]),
    ...(navigator.suggested_et_surfaces || []).slice(0, 1).map((item) => ["🧭", "ET Surface", `Best next surface: ${item}`]),
  ];

  return {
    health,
    diversification,
    goalProgress,
    goalLabel: (persona.financial_goals || [profile.goal?.replace(/[^\w\s]/g, "") || "wealth"]).join(", "),
    suggestions,
  };
}

// ─── AGENT BADGE ──────────────────────────────────────────────────────────────
function extractArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (!value) return [];
  if (typeof value === "object") return Object.values(value).filter(Boolean);
  return [value];
}

function actionItemsFromData(conciergeData) {
  const actions = extractArray(conciergeData?.core?.dispatch?.actions);
  return actions.map((item, index) => ({
    title: item.label || item.name || `Suggested action ${index + 1}`,
    desc: item.description || item.summary || item.next_step || "Recommended next step from the concierge pipeline.",
    meta: item.channel || item.type || "dispatch",
  }));
}

function onboardingItemsFromData(conciergeData) {
  const items = extractArray(conciergeData?.ecosystem?.onboarding_path);
  return items.map((item, index) => ({
    title: item.step || item.name || `Step ${index + 1}`,
    desc: item.detail || item.description || item.why || "Suggested ET onboarding move.",
    meta: item.timeline || item.stage || `Step ${index + 1}`,
  }));
}

function touchpointItemsFromData(conciergeData) {
  const items = extractArray(conciergeData?.ecosystem?.prioritized_touchpoints);
  return items.map((item, index) => ({
    title: item.name || `Touchpoint ${index + 1}`,
    desc: item.why_for_this_user || item.cta || item.summary || "Relevant ET touchpoint for this profile.",
    meta: item.pillar || item.priority || "ecosystem",
  }));
}

function alertItemsFromData(conciergeData, activeChannels) {
  const dispatchItems = actionItemsFromData(conciergeData).slice(0, 3).map((item) => ({
    icon: "Action",
    title: item.title,
    body: item.desc,
    tag: `Live on ${item.meta}`,
    live: true,
  }));

  const crossSell = extractArray(conciergeData?.cross_sell?.opportunities).slice(0, 3).map((item, index) => ({
    icon: "Alert",
    title: item.name || item.title || `Opportunity ${index + 1}`,
    body: item.why_now || item.summary || item.reason || "Suggested because of your current ET profile and timing.",
    tag: item.trigger || "Suggested",
    live: false,
  }));

  const channelList = Object.entries(activeChannels)
    .filter(([key, enabled]) => key !== "chat" && enabled)
    .map(([key]) => key.toUpperCase());

  if (!dispatchItems.length && !crossSell.length) {
    return [{
      icon: "Bell",
      title: "No alerts generated yet",
      body: `Finish profiling and trigger recommendations to generate alerts. Active channels: ${channelList.join(", ") || "IN-APP only"}.`,
      tag: "Waiting",
      live: false,
    }];
  }

  return [...dispatchItems, ...crossSell];
}

function riskSummaryFromData(profile, conciergeData) {
  const persona = conciergeData?.core?.persona || {};
  const rawScore = Number(persona.risk_score);
  const score = Number.isFinite(rawScore)
    ? Math.max(0, Math.min(100, rawScore * 10))
    : ({ "🟢 Conservative": 25, "🟡 Moderate": 55, "🔴 Aggressive": 85, "🤷 Not Sure Yet": 40 }[profile.risk] || 0);
  const label = score > 70 ? "Aggressive" : score > 40 ? "Moderate" : score > 0 ? "Conservative" : "Not set";
  return { score, label };
}

function riskReductionStepsFromData(conciergeData) {
  const gaps = extractArray(conciergeData?.financial_life?.portfolio_gaps);
  const needs = extractArray(conciergeData?.financial_life?.immediate_needs);
  const products = extractArray(conciergeData?.core?.recommendations?.recommended_products);
  const steps = [];

  gaps.slice(0, 2).forEach((item) => {
    steps.push({
      title: "Close a portfolio gap",
      desc: item,
    });
  });
  needs.slice(0, 2).forEach((item) => {
    steps.push({
      title: "Address an immediate need",
      desc: item,
    });
  });
  products.slice(0, 1).forEach((item) => {
    steps.push({
      title: "Use an ET tool to reduce uncertainty",
      desc: item.why_it_fits || item.summary || item.name || "Explore the top matched ET recommendation.",
    });
  });

  return steps.slice(0, 4);
}

function FlashProfileDeck({ node, step, total, value, onValueChange, onOption, onSubmit, disabled }) {
  if (!node) return null;

  return (
    <div className="deck-overlay">
      <div className="deck-card">
        <div className="deck-step">Required profile · {step}/{total}</div>
        <div className="deck-head">
          <div>
            <div className="deck-kicker">{PROFILE_DECK[step - 1]?.hint || "Profile setup"}</div>
            <div className="deck-title">{PROFILE_DECK[step - 1]?.title || "Tell us about yourself"}</div>
            <div className="deck-copy">
              {node.bot.replace(/\*\*/g, "")} Finish this card to unlock chat, recommendations, navigator insights, and alerts.
            </div>
          </div>
          <div className="deck-orb">{PROFILE_DECK[step - 1]?.icon || "ET"}</div>
        </div>
        <div className="deck-track">
          <div className="deck-fill" style={{ width: `${(step / total) * 100}%` }} />
        </div>
        <div className="deck-options">
          {(node.qr || []).map((option) => (
            <button
              key={option}
              type="button"
              className="deck-option"
              onClick={() => onOption(option)}
              disabled={disabled}
            >
              {option}
            </button>
          ))}
        </div>
        <div className="deck-freeform">
          <input
            className="deck-input"
            value={value}
            onChange={(event) => onValueChange(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); onSubmit(); } }}
            placeholder="Or type your own answer"
            disabled={disabled}
          />
          <button type="button" className="deck-submit" onClick={onSubmit} disabled={disabled || !String(value || "").trim()}>
            Continue
          </button>
        </div>
        <div className="deck-note">
          This step is mandatory so the concierge can personalize the ET ecosystem instead of showing the same generic experience to everyone.
        </div>
      </div>
    </div>
  );
}

function ExpandableItems({ items, expandedKey, onToggle, onAskConcierge }) {
  return (
    <div className="ws-list">
      {items.map((item, index) => {
        const key = `${item.title}-${index}`;
        const expanded = expandedKey === key;
        return (
          <div
            key={key}
            className="ws-list-item expandable"
            onClick={() => onToggle(expanded ? null : key)}
          >
            <div className="ws-item-head">
              <div>
                <div className="ws-list-title">{item.title}</div>
                {item.meta && <div className="ws-list-meta">{item.meta}</div>}
              </div>
              <div className="ws-expand">{expanded ? "−" : "+"}</div>
            </div>
            <div className="ws-list-desc">{item.desc}</div>
            {expanded && (
              <div className="ws-item-detail">
                <div>{item.detail || item.desc}</div>
                <div className="ws-actions">
                  <button
                    type="button"
                    className="ws-btn"
                    onClick={(event) => {
                      event.stopPropagation();
                      onAskConcierge(item);
                    }}
                  >
                    Ask concierge
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function AgentBadge({ agent }) {
  const map = {
    profiler: { cls: "ab-profiler", label: "Profiler Agent", dot: "◆" },
    recommender: { cls: "ab-recommender", label: "Recommender Agent", dot: "◆" },
    rag: { cls: "ab-rag", label: "RAG Module", dot: "◆" },
    action: { cls: "ab-action", label: "Action Dispatcher", dot: "◆" },
    concierge: { cls: "ab-concierge", label: "ET Concierge", dot: "◆" },
  };
  const a = map[agent] || map.concierge;
  return <div className={`agent-badge ${a.cls}`}>{a.dot} {a.label}</div>;
}

// ─── BUBBLE TEXT ──────────────────────────────────────────────────────────────
function BubbleText({ text }) {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return <>{parts.map((p, i) => i % 2 === 1
    ? <strong key={i}>{p}</strong>
    : p.split("\n").map((l, j) => <span key={j}>{l}{j < p.split("\n").length - 1 && <br />}</span>)
  )}</>;
}

// ─── RING METER ───────────────────────────────────────────────────────────────
function RingMeter({ value, color, label }) {
  const r = 26, cx = 34, cy = 34, circ = 2 * Math.PI * r;
  return (
    <div className="fin-meter">
      <div className="fm-label">{label}</div>
      <div className="ring-wrap">
        <svg width="68" height="68" viewBox="0 0 68 68">
          <circle className="ring-bg" cx={cx} cy={cy} r={r} />
          <circle className="ring-fill" cx={cx} cy={cy} r={r} stroke={color}
            strokeDasharray={circ} strokeDashoffset={circ - (value / 100) * circ} />
        </svg>
        <div className="ring-label" style={{ color }}>{value}%</div>
      </div>
    </div>
  );
}

// ─── PROFILE CARD ─────────────────────────────────────────────────────────────
function ProfileCard({ profile }) {
  return (
    <div className="profile-card">
      <div className="pc-hdr">
        <div className="pc-av">Y</div>
        <div>
          <div className="pc-name">Your Persona</div>
          <div className="pc-meta">Extracted by Profiler Agent · Confidence 94%</div>
        </div>
      </div>
      <div className="pc-body">
        <div className="pc-grid">
          {[["Interest", profile.interests], ["Goal", profile.goal], ["Portfolio", profile.investments], ["Risk Appetite", profile.risk]].map(([k, v]) => (
            <div className="pc-stat" key={k}>
              <div className="pc-sk">{k}</div>
              <div className="pc-sv">{v || "—"}</div>
            </div>
          ))}
        </div>
        <div className="pc-tags">
          {profile.engagement && <span className="pc-tag">{profile.engagement}</span>}
          <span className="pc-tag">ET Ecosystem</span>
          <span className="pc-tag">Personalized ✓</span>
          <span className="pc-tag">Multi-Agent</span>
        </div>
      </div>
    </div>
  );
}

// ─── REC CARDS ────────────────────────────────────────────────────────────────
function RecCards({ items, onAction }) {
  return (
    <div className="rec-list">
      {items.map((r, i) => (
        <div className="rec-card" key={i} onClick={() => onAction(r.title)}>
          <div className="rec-icon">{r.icon}</div>
          <div className="rec-info">
            <div className="rec-title">{r.title}</div>
            <div className="rec-desc">{r.desc}</div>
            {r.reason && <div className="rec-reason">↳ {r.reason}</div>}
            <div className="rec-foot"><span className={`rbadge ${r.badge}`}>{r.badgeText}</span></div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── FIN WIDGET ───────────────────────────────────────────────────────────────
function FinWidget({ profile, data }) {
  const riskMap = { "🟢 Conservative": 32, "🟡 Moderate": 58, "🔴 Aggressive": 82, "🤷 Not Sure Yet": 44 };
  const div = data?.diversification || riskMap[profile.risk] || 55;
  const health = data?.health || Math.round((div + 62 + 34) / 3);
  const goalProgress = data?.goalProgress || 34;
  const goalLabel = data?.goalLabel || profile.goal?.replace(/[^\w\s]/g, "") || "wealth";
  const suggestions = data?.suggestions || [
    ["âš¡", "Action", "Your portfolio lacks international exposure. Consider adding a US Index ETF."],
    ["ðŸ›¡ï¸", "Gap", "No term insurance detected. â‚¹1 Cr cover available at under â‚¹900/month."],
    ["ðŸŽ¯", "Goal", `At current pace, you're 34% toward your ${goalLabel} goal.`],
  ];
  return (
    <div className="fin-widget">
      <div className="fw-hdr">
        <span style={{ fontSize: 13 }}>📊</span>
        <div className="fw-title">Financial Health Analysis</div>
        <div className="fw-badge">RAG · Synthesized</div>
      </div>
      <div className="fw-body">
        <div className="fin-meters">
          <RingMeter value={health} color="var(--gold)" label="Health Score" />
          <RingMeter value={div} color="var(--cyan)" label="Diversification" />
          <RingMeter value={goalProgress} color="var(--green)" label="Goal Progress" />
        </div>
        <div className="fin-suggestions">
          {suggestions.map(([icon, label, text]) => (
            <div className="fin-sug-row" key={label}>
              <span className="fsr-icon">{icon}</span>
              <div className="fsr-text"><strong>{label}:</strong> {text}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── FEEDBACK WIDGET ─────────────────────────────────────────────────────────
function FeedbackWidget({ onSubmit }) {
  const [rating, setRating] = useState(0);
  const [hovered, setHov] = useState(0);
  const [thumb, setThumb] = useState(null);
  const [tags, setTags] = useState([]);
  const [comment, setComment] = useState("");
  const [done, setDone] = useState(false);

  const tagList = thumb === "down" ? FB_TAGS_NEG : FB_TAGS_POS;
  const toggle = (t) => setTags(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t]);

  const submit = () => {
    if (!rating && thumb === null) return;
    setDone(true);
    onSubmit({ rating, thumb, tags, comment, time: nowTime() });
  };

  if (done) return (
    <div className="fb-widget">
      <div className="fb-done">
        <span className="fb-done-icon">🙏</span>
        <div className="fb-done-text">Feedback received — tuning your recommendations</div>
      </div>
    </div>
  );

  return (
    <div className="fb-widget">
      <div className="fb-header">⭐ Rate this interaction</div>
      <div className="fb-stars">
        {[1, 2, 3, 4, 5].map(s => (
          <div key={s} className={`fb-star ${(hovered || rating) >= s ? "sel" : ""}`}
            onMouseEnter={() => setHov(s)} onMouseLeave={() => setHov(0)}
            onClick={() => setRating(s)}>
            {(hovered || rating) >= s ? "⭐" : "☆"}
          </div>
        ))}
      </div>
      <div className="fb-thumbs">
        <div className={`fb-thumb ${thumb === "up" ? "sel-up" : ""}`} onClick={() => { setThumb("up"); setTags([]); }}>👍 Helpful</div>
        <div className={`fb-thumb ${thumb === "down" ? "sel-down" : ""}`} onClick={() => { setThumb("down"); setTags([]); }}>👎 Needs Work</div>
      </div>
      {thumb !== null && (
        <div className="fb-tags">
          {tagList.map(t => <div key={t} className={`fb-tag ${tags.includes(t) ? "sel" : ""}`} onClick={() => toggle(t)}>{t}</div>)}
        </div>
      )}
      <textarea className="fb-textarea" rows={2} placeholder="Any other comments? (optional)"
        value={comment} onChange={e => setComment(e.target.value)} />
      <button className="fb-submit" onClick={submit} disabled={!rating && thumb === null}>
        Submit Feedback
      </button>
    </div>
  );
}

// ─── NUDGE BAR ────────────────────────────────────────────────────────────────
function NudgeBar({ nudge, onAction }) {
  return (
    <div className="nudge-bar" onClick={onAction}>
      <div className="nudge-icon">{nudge.icon}</div>
      <div className="nudge-body">
        <div className="nudge-title">{nudge.title}</div>
        <div className="nudge-desc">{nudge.desc}</div>
      </div>
      <div className="nudge-cta">{nudge.cta}</div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function ETConcierge() {
  const [theme, setTheme] = useState("warm"); // 'warm' = new default, 'dark' = legacy
  const [backendStatus, setBackendStatus] = useState("checking");
  const [messages, setMessages] = useState([]);
  const [inputVal, setInputVal] = useState("");
  const [currentNode, setCurrentNode] = useState("greeting");
  const [profile, setProfile] = useState({});
  const [profilePct, setProfilePct] = useState(0);
  const [thinking, setThinking] = useState(false);
  const [stageLabel, setStageLabel] = useState("Welcome");
  const [stagePill, setStagePill] = useState("Start");
  const [reasoningOpen, setReasoningOpen] = useState(false);
  const [activeChannels, setActiveChannels] = useState({ chat: true, sms: false, wa: false, email: false, push: false });
  const [toast, setToast] = useState({ show: false, icon: "", msg: "" });
  const [activeNav, setActiveNav] = useState("chat");
  const [activeAgent, setActiveAgent] = useState("concierge");
  const [deckInput, setDeckInput] = useState("");
  const [expandedWorkspaceItem, setExpandedWorkspaceItem] = useState(null);

  const [visitedNodes, setVisitedNodes] = useState(new Set());
  const [activeNudge, setActiveNudge] = useState(null);
  const [nudgeShownFor, setNudgeShownFor] = useState(new Set());
  const [feedbacks, setFeedbacks] = useState([]);
  const [, setBehaviorLog] = useState([]);
  const [, setReasoningTraces] = useState([]);
  const [conciergeData, setConciergeData] = useState(null);

  const msgsRef = useRef(null);
  const backendStatusRef = useRef("checking");
  const profileKeys = useMemo(() => ["interests", "goal", "investments", "risk", "engagement"], []);

  const scrollBottom = useCallback(() => {
    setTimeout(() => { if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight; }, 60);
  }, []);

  const showToast = useCallback((icon, msg) => {
    setToast({ show: true, icon, msg });
    setTimeout(() => setToast(t => ({ ...t, show: false })), 2800);
  }, []);

  const logBehavior = useCallback((event, meta = {}) => {
    setBehaviorLog(prev => [...prev.slice(-19), { event, meta, time: nowTime() }]);
  }, []);

  const addMessage = useCallback((role, content, type = "text", extra = null, opts = {}) => {
    const id = Date.now() + Math.random();
    setMessages(prev => [...prev, { id, role, content, type, extra, time: nowTime(), agent: opts.agent || "concierge", showFeedback: opts.showFeedback || false }]);
    scrollBottom();
    return id;
  }, [scrollBottom]);

  const resetSessionState = useCallback(() => {
    setProfile({});
    setProfilePct(0);
    setCurrentNode("greeting");
    setVisitedNodes(new Set());
    setActiveNudge(null);
    setNudgeShownFor(new Set());
    setBehaviorLog([]);
    setReasoningTraces([]);
    setConciergeData(null);
    setThinking(false);
    setInputVal("");
    setActiveAgent("concierge");
    setActiveNav("chat");
    setDeckInput("");
    setExpandedWorkspaceItem(null);
  }, []);

  const showBackendOffline = useCallback(() => {
    resetSessionState();
    setStageLabel("Backend Offline");
    setStagePill("Try Later");
    setMessages([{
      id: Date.now() + Math.random(),
      role: "bot",
      content: "Backend offline. Try again later.",
      type: "text",
      extra: null,
      time: nowTime(),
      agent: "concierge",
      showFeedback: false,
    }]);
  }, [resetSessionState]);

  const startOnlineSession = useCallback(() => {
    resetSessionState();
    setCurrentNode("q1");
    setStageLabel("Profiler Agent · Step 1 of 5");
    setStagePill("01/05");
    setActiveAgent("profiler");
    setMessages([
      {
        id: Date.now() + Math.random(),
        role: "bot",
        content: "Backend online. Complete your profile to unlock the workspace.",
        type: "text",
        extra: null,
        time: nowTime(),
        agent: "concierge",
        showFeedback: false,
      },
    ]);
  }, [resetSessionState]);

  const fetchConciergeData = useCallback(async (nextProfile) => {
    const conversation = mapProfileToConversation(nextProfile);
    try {
      const response = await fetch(`${API_BASE}/api/plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation,
          rag_query: `What ET guidance best supports ${nextProfile.goal || "this user's financial goal"}?`,
        }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      setConciergeData(normalizeResponse(payload));
      showToast("âœ…", "Live model pipeline connected");
      logBehavior("pipeline_live", {});
    } catch (error) {
      setConciergeData(null);
      logBehavior("pipeline_fallback", {});
    }
  }, [logBehavior, showToast]);

  const fetchChatReply = useCallback(async (userMessage) => {
    const transcript = messages
      .slice(-12)
      .map((item) => `${item.role === "user" ? "User" : "Assistant"}: ${item.content}`)
      .concat([`User: ${userMessage}`])
      .join("\n");

    const response = await fetch(`${API_BASE}/api/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transcript,
        message: userMessage,
      }),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    return normalizeResponse(payload);
  }, [messages]);

  useEffect(() => {
    let cancelled = false;

    const checkBackend = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/status`, { cache: "no-store" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        if (cancelled) return;
        setBackendStatus("online");
      } catch (error) {
        if (cancelled) return;
        setBackendStatus("offline");
      }
    };

    checkBackend();
    const intervalId = setInterval(checkBackend, 4000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    const previous = backendStatusRef.current;
    if (backendStatus === previous) return;
    backendStatusRef.current = backendStatus;

    if (backendStatus === "offline") {
      showBackendOffline();
      return;
    }

    if (backendStatus === "online") {
      startOnlineSession();
    }
  }, [backendStatus, showBackendOffline, startOnlineSession]);

  const gotoNode = useCallback((nodeId, newProfile = null) => {
    if (backendStatus !== "online") return;
    const node = FLOWMAP[nodeId];
    if (!node) return;
    setCurrentNode(nodeId);
    if (node.stageLabel) setStageLabel(node.stageLabel);
    if (node.stagePill) setStagePill(node.stagePill);
    if (node.agent) setActiveAgent(node.agent);

    setVisitedNodes(prev => new Set([...prev, nodeId]));
    logBehavior("node_visited", { nodeId, agent: node.agent });

    // Queue reasoning trace
    if (node.reasoning) {
      setReasoningTraces(prev => [...prev, { ...node.reasoning, nodeId, time: nowTime() }]);
    }

    if (nodeId === "profile_done") {
      fetchConciergeData(newProfile || profile);
    }

    // Cross-sell nudge
    const nudgeRule = NUDGE_RULES.find(n => n.trigger === nodeId);
    if (nudgeRule && !nudgeShownFor.has(nodeId)) {
      setTimeout(() => {
        setActiveNudge(nudgeRule);
        setNudgeShownFor(prev => new Set([...prev, nodeId]));
      }, 3200);
    }

    setThinking(true);
    setTimeout(() => {
      setThinking(false);
      const prof = newProfile || profile;
      const showFb = ["recs", "fin_analysis", "partners", "masterclass", "alerts"].includes(nodeId);
      addMessage("bot", node.bot, node.type || "text", prof, { showFeedback: showFb, agent: node.agent });
      scrollBottom();
    }, 850 + Math.random() * 450);
  }, [profile, addMessage, scrollBottom, logBehavior, nudgeShownFor, fetchConciergeData, backendStatus]);

  const handleQuickReply = useCallback((reply) => {
    if (thinking || backendStatus !== "online" || profilePct < 100) return;
    addMessage("user", reply);
    logBehavior("quick_reply", { reply });
    setActiveNudge(null);

    const node = FLOWMAP[currentNode];
    if (!node) return;

    let newProfile = { ...profile };
    if (node.profileKey) {
      newProfile[node.profileKey] = reply.replace(/^[^\w\s]+\s*/, "");
      setProfile(newProfile);
      const filled = profileKeys.filter(k => newProfile[k]).length;
      setProfilePct(Math.round((filled / profileKeys.length) * 100));
    }

    let nextId;
    if (typeof node.next === "string") nextId = node.next;
    else if (typeof node.next === "object") nextId = node.next[reply] || Object.values(node.next)[0];
    if (nextId) gotoNode(nextId, newProfile);
  }, [thinking, currentNode, profile, profileKeys, addMessage, gotoNode, logBehavior, backendStatus, profilePct]);

  const handleSend = useCallback(async () => {
    const val = inputVal.trim();
    if (!val || thinking || backendStatus !== "online" || profilePct < 100) return;
    setInputVal("");
    addMessage("user", val);
    logBehavior("freetext", { len: val.length });
    setActiveNudge(null);

    const node = FLOWMAP[currentNode];
    const isQuestion = looksLikeQuestion(val);

    if (node?.profileKey && !isQuestion) {
      const newProfile = { ...profile, [node.profileKey]: val.replace(/^[^\w\s]+\s*/, "") };
      setProfile(newProfile);
      const filled = profileKeys.filter(k => newProfile[k]).length;
      setProfilePct(Math.round((filled / profileKeys.length) * 100));

      let nextId;
      if (typeof node.next === "string") nextId = node.next;
      else if (typeof node.next === "object") nextId = Object.values(node.next)[0];
      if (nextId) gotoNode(nextId, newProfile);
      return;
    }

    setThinking(true);
    setActiveAgent("rag");
    try {
      const result = await fetchChatReply(val);
      if (result?.artifact) {
        setConciergeData(result.artifact);
      }
      addMessage(
        "bot",
        result?.message || "I couldn't generate a useful answer just now. Please try again.",
        "text",
        null,
        { showFeedback: true, agent: "rag" },
      );
      if (node?.profileKey) {
        addMessage(
          "bot",
          `We can keep going whenever you're ready. ${node.bot.replace(/\*\*/g, "")}`,
          "text",
          null,
          { agent: node.agent || "concierge" },
        );
      }
    } catch (error) {
      addMessage(
        "bot",
        "I couldn't reach the backend for a chat response just now. Please try again in a moment.",
        "text",
        null,
        { agent: "concierge" },
      );
    } finally {
      setThinking(false);
    }
  }, [inputVal, thinking, backendStatus, profilePct, addMessage, logBehavior, currentNode, profile, profileKeys, gotoNode, fetchChatReply]);

  const handleKey = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } };

  const handleFeedback = useCallback((msgId, fb) => {
    setFeedbacks(prev => [...prev, { msgId, ...fb }]);
    logBehavior("feedback", { rating: fb.rating, thumb: fb.thumb });
    showToast("🙏", "Feedback captured — improving your recs!");
    if (fb.thumb === "down" || fb.rating <= 2) {
      setTimeout(() => {
        addMessage("bot", "💡 I'll adjust my approach. Would you like to try a **different recommendation path** or revisit your profile?", "text", null, { agent: "concierge" });
      }, 1200);
    }
  }, [logBehavior, showToast, addMessage]);

  const restartChat = () => {
    if (backendStatus !== "online") {
      showBackendOffline();
      return;
    }
    startOnlineSession();
  };

  const toggleChannel = (key) => {
    setActiveChannels(prev => {
      const next = { ...prev, [key]: !prev[key] };
      if (next[key]) showToast("✅", `${key.toUpperCase()} channel activated`);
      logBehavior("channel_toggle", { key, active: next[key] });
      return next;
    });
  };

  const liveProfile = useMemo(() => mapProfileCard(profile, conciergeData), [profile, conciergeData]);
  const liveRecommendations = useMemo(() => recommendationItemsFromData(conciergeData, RECS), [conciergeData]);
  const livePartnerRecommendations = useMemo(() => partnerItemsFromData(conciergeData, PARTNER_RECS), [conciergeData]);
  const liveMasterclassRecommendations = useMemo(() => masterclassItemsFromData(conciergeData, MASTERCLASS_RECS), [conciergeData]);
  const liveFinancialData = useMemo(() => financialWidgetData(profile, conciergeData), [profile, conciergeData]);
  const recommendedActions = useMemo(() => actionItemsFromData(conciergeData), [conciergeData]);
  const onboardingItems = useMemo(() => onboardingItemsFromData(conciergeData), [conciergeData]);
  const touchpointItems = useMemo(() => touchpointItemsFromData(conciergeData), [conciergeData]);
  const alertItems = useMemo(() => alertItemsFromData(conciergeData, activeChannels), [conciergeData, activeChannels]);
  const riskSummary = useMemo(() => riskSummaryFromData(profile, conciergeData), [profile, conciergeData]);
  const riskReductionSteps = useMemo(() => riskReductionStepsFromData(conciergeData), [conciergeData]);

  const riskScore = riskSummary.score;
  const riskColor = riskScore > 65 ? "var(--red)" : riskScore > 40 ? "var(--gold)" : "var(--green)";
  const riskLabel = riskSummary.label;

  const pipelineSteps = ["Profiler", "Recommender", "RAG", "Action"];
  const agentPipelineMap = { profiler: 0, recommender: 1, rag: 2, action: 3 };
  const activeStep = agentPipelineMap[activeAgent] ?? -1;

  const profileFlowIds = PROFILE_DECK.map((item) => item.nodeId);
  const currentProfileStep = profileKeys.findIndex((key) => !profile[key]);
  const profileComplete = currentProfileStep === -1;
  const profileLocked = backendStatus === "online" && !profileComplete;
  const activeProfileNode = profileLocked ? FLOWMAP[profileFlowIds[currentProfileStep]] : null;
  const activeProfileStepNumber = profileLocked ? currentProfileStep + 1 : profileKeys.length;
  const currentQRs = !profileLocked ? (FLOWMAP[currentNode]?.qr || []) : [];

  const routeToChat = useCallback((prompt, toastMessage = "Opened in chat") => {
    setActiveNav("chat");
    setInputVal(prompt);
    showToast("💬", toastMessage);
  }, [showToast]);

  const completeProfileStep = useCallback((rawValue) => {
    if (!activeProfileNode || backendStatus !== "online") return;

    const answer = String(rawValue || "").trim();
    if (!answer) return;

    const newProfile = { ...profile, [activeProfileNode.profileKey]: answer.replace(/^[^\w\s]+\s*/, "") };
    const filled = profileKeys.filter((key) => newProfile[key]).length;

    setProfile(newProfile);
    setProfilePct(Math.round((filled / profileKeys.length) * 100));
    setVisitedNodes((prev) => new Set([...prev, activeProfileNode.id]));
    setActiveAgent(activeProfileNode.agent || "profiler");
    if (activeProfileNode.reasoning) {
      setReasoningTraces((prev) => [...prev, { ...activeProfileNode.reasoning, nodeId: activeProfileNode.id, time: nowTime() }]);
    }

    setMessages((prev) => ([
      ...prev,
      {
        id: Date.now() + Math.random(),
        role: "bot",
        content: activeProfileNode.bot,
        type: "text",
        extra: null,
        time: nowTime(),
        agent: activeProfileNode.agent || "profiler",
        showFeedback: false,
      },
      {
        id: Date.now() + Math.random(),
        role: "user",
        content: answer,
        type: "text",
        extra: null,
        time: nowTime(),
        agent: "user",
        showFeedback: false,
      },
    ]));

    logBehavior("profile_card_completed", { step: activeProfileNode.id, answer });
    setDeckInput("");
    scrollBottom();

    const nextId = typeof activeProfileNode.next === "string"
      ? activeProfileNode.next
      : Object.values(activeProfileNode.next || {})[0];

    if (nextId === "profile_done") {
      setCurrentNode("profile_done");
      setStageLabel("Profile Complete");
      setStagePill("Done");
      setVisitedNodes((prev) => new Set([...prev, "profile_done"]));
      addMessage("bot", FLOWMAP.profile_done.bot, "profile_card", newProfile, { agent: "profiler" });
      fetchConciergeData(newProfile);
      return;
    }

    setCurrentNode(nextId);
    if (FLOWMAP[nextId]?.stageLabel) setStageLabel(FLOWMAP[nextId].stageLabel);
    if (FLOWMAP[nextId]?.stagePill) setStagePill(FLOWMAP[nextId].stagePill);
  }, [activeProfileNode, addMessage, backendStatus, fetchConciergeData, logBehavior, profile, profileKeys, scrollBottom]);

  return (
    <div className={`app-root${theme !== "warm" ? ` theme-${theme}` : ""}`}>
      <style>{css}</style>
      <div className="bg-grid" />
      <div className="app" style={{ position: "relative", zIndex: 1 }}>

        {/* ══ SIDEBAR ══ */}
        <div className="sb">
          <div className="sb-brand">
            <div className="sb-logo-wrap">
              <div className="sb-logo">ET</div>
              <div className="sb-logo-ring" />
            </div>
            <div className="sb-brand-text">
              <div className="sb-brand-name">ET Concierge</div>
              <div className="sb-brand-tag">Multi-Agent AI Pipeline</div>
            </div>
          </div>

          {/* Agent status */}
          <div className="agent-strip">
            {[
              { key: "profiler", label: "Profiler Agent", icon: "◆" },
              { key: "recommender", label: "Recommender", icon: "◆" },
              { key: "rag", label: "RAG Module", icon: "◆" },
              { key: "action", label: "Action Dispatcher", icon: "◆" },
            ].map(a => (
              <div key={a.key} className={`agent-row ${activeAgent === a.key ? "active" : ""}`}>
                <div className="agent-dot" />
                <div className="agent-label">{a.label}</div>
                <div className="agent-status">{activeAgent === a.key ? "RUNNING" : visitedNodes.size > 0 ? "STANDBY" : "IDLE"}</div>
              </div>
            ))}
          </div>

          {/* Profile */}
          <div className="sb-profile">
            <div className="sb-section-label">Profile Completion</div>
            <div className="prog-bar-wrap">
              <div className="prog-row">
                <div className="prog-label">Persona extraction</div>
                <div className="prog-pct">{profilePct}%</div>
              </div>
              <div className="prog-track"><div className="prog-fill" style={{ width: `${profilePct}%` }} /></div>
            </div>
            <div className="profile-fields">
              {profileKeys.map(k => (
                <div key={k} className={`pf-row ${profile[k] ? "filled" : ""}`}>
                  <div className="pf-dot" />
                  <div className="pf-key">{k === "investments" ? "Portfolio" : k}</div>
                  <div className={`pf-val ${profile[k] ? "" : "empty"}`}>
                    {profile[k] ? profile[k].substring(0, 14) + (profile[k].length > 14 ? "…" : "") : "pending"}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Nav */}
          <div className="sb-nav">
            <div className="nav-section-label">Workspace</div>
            {[
              { id: "chat", icon: "💬", label: "Chat Interface" },
              { id: "fin", icon: "📊", label: "Financial Navigator" },
              { id: "recs", icon: "✨", label: "Recommendations" },
              { id: "notifs", icon: "🔔", label: "Alerts & Actions" },
            ].map(n => (
              <button key={n.id} className={`nav-btn ${activeNav === n.id ? "active" : ""}`}
                onClick={() => { setActiveNav(n.id); setExpandedWorkspaceItem(null); if (n.id !== "chat") showToast("🔄", `Switching to ${n.label}…`); }}>
                <span className="ni">{n.icon}</span> {n.label}
                {n.id === "notifs" && feedbacks.length > 0 && <span className="nav-badge">{feedbacks.length}</span>}
              </button>
            ))}



            <div className="nav-section-label">System</div>
            <button className={`nav-btn ${reasoningOpen ? "active" : ""}`} onClick={() => setReasoningOpen(o => !o)}>
              <span className="ni">🧠</span> Inner Monologue
            </button>
            <button className="nav-btn" onClick={restartChat}>
              <span className="ni">↺</span> Restart Session
            </button>
          </div>

          <div className="sb-foot">
            <div className="sb-section-label" style={{ marginBottom: 7 }}>Active Channels</div>
            <div className="ch-grid">
              {Object.entries(activeChannels).map(([k, v]) => (
                <div key={k} className={`ch-chip ${v ? "on" : ""}`}
                  onClick={() => k !== "chat" && toggleChannel(k)}>
                  {k === "wa" ? "WA" : k.toUpperCase()}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ══ MAIN ══ */}
        <div className="main">
          <div className="chat-hdr">
            <div className="hdr-av">
              ET
              <div className="hdr-av-status" />
            </div>
            <div className="hdr-info">
              <div className="hdr-name">ET AI Concierge</div>
              <div className="hdr-sub">
                {backendStatus === "online"
                  ? (profileLocked
                    ? `Backend Online · Complete profile card ${activeProfileStepNumber}/5`
                    : thinking ? `${activeAgent.toUpperCase()} AGENT · Processing…` : "Backend Online · Happy chatting")
                  : backendStatus === "checking"
                    ? "Checking backend status…"
                    : "Backend Offline · Try again later"}
              </div>
            </div>

            {/* Pipeline indicator */}
            <div className="hdr-pipeline">
              {pipelineSteps.map((step, i) => (
                <span key={step}>
                  <span className={`pipeline-step ${activeStep === i ? "active" : ""}`}>{step}</span>
                  {i < pipelineSteps.length - 1 && <span className="pipeline-sep">›</span>}
                </span>
              ))}
            </div>

            <div className="hdr-btns">
              <div className="theme-select-wrap" title="Select Theme">
                <select className="theme-select" value={theme} onChange={(e) => setTheme(e.target.value)}>
                  <option value="warm">🌊 Coral Theme</option>
                  <option value="dark">🎨 Classic Theme</option>
                  <option value="midnight">🌌 Midnight Mode</option>
                  <option value="light">☕ Cream Mode</option>
                  <option value="ice">❄️ Ice Mode</option>
                </select>
                <span className="ts-chevron">▼</span>
              </div>
              <button className="hdr-btn" title="Inner Monologue" onClick={() => setReasoningOpen(o => !o)}>🧠</button>
              <button className="hdr-btn" title="Restart" onClick={restartChat}>↺</button>
            </div>
          </div>
          <div className={`workspace-shell ${profileLocked ? "locked" : ""}`}>
            {activeNav === "chat" && (
              <>
                <div className="msgs" ref={msgsRef}>
                  {messages.map(m => (
                    <div key={m.id}>
                      <div className={`msg-row msg-animate ${m.role === "user" ? "user" : ""}`}>
                        <div className={`msg-av ${m.role === "bot" ? "bot" : "usr"}`}>{m.role === "bot" ? "ET" : "You"}</div>
                        <div className="msg-body">
                          {m.role === "bot" && <AgentBadge agent={m.agent || "concierge"} />}

                          {m.type === "profile_card" && m.extra ? (
                            <><div className="bubble bot"><BubbleText text={m.content} /></div><ProfileCard profile={liveProfile} /></>
                          ) : m.type === "recommendations" ? (
                            <><div className="bubble bot"><BubbleText text={m.content} /></div><RecCards items={liveRecommendations} onAction={a => { showToast("🔗", a); logBehavior("rec_click", { a }); }} /></>
                          ) : m.type === "fin_widget" ? (
                            <><div className="bubble bot"><BubbleText text={m.content} /></div><FinWidget profile={profile} data={liveFinancialData} /></>
                          ) : m.type === "partner_recs" ? (
                            <><div className="bubble bot"><BubbleText text={m.content} /></div><RecCards items={livePartnerRecommendations} onAction={a => { showToast("🔗", a); logBehavior("partner_click", { a }); }} /></>
                          ) : m.type === "masterclass_recs" ? (
                            <><div className="bubble bot"><BubbleText text={m.content} /></div><RecCards items={liveMasterclassRecommendations} onAction={a => { showToast("🎓", a); logBehavior("masterclass_click", { a }); }} /></>
                          ) : (
                            <div className={`bubble ${m.role === "bot" ? "bot" : "user"}`}><BubbleText text={m.content} /></div>
                          )}
                          <div className="msg-ts">{m.time}</div>
                        </div>
                      </div>

                      {m.role === "bot" && m.showFeedback && (
                        <div style={{ paddingLeft: 38, marginTop: 2 }}>
                          <FeedbackWidget onSubmit={(fb) => handleFeedback(m.id, fb)} />
                        </div>
                      )}
                    </div>
                  ))}

                  {thinking && (
                    <div className="msg-row msg-animate">
                      <div className="msg-av bot">ET</div>
                      <div className="msg-body">
                        <AgentBadge agent={activeAgent} />
                        <div className="thinking">
                          <div className="t-dot" /><div className="t-dot" /><div className="t-dot" />
                          <span className="t-label">{activeAgent} processing…</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {!thinking && activeNudge && (
                    <div style={{ paddingLeft: 38 }}>
                      <NudgeBar nudge={activeNudge} onAction={() => {
                        showToast(activeNudge.icon, activeNudge.cta);
                        logBehavior("nudge_click", { trigger: activeNudge.trigger });
                        setActiveNudge(null);
                      }} />
                    </div>
                  )}

                  {!thinking && backendStatus === "online" && currentQRs.length > 0 && (
                    <div style={{ paddingLeft: 38 }}>
                      <div className="qrs">
                        {currentQRs.map(qr => (
                          <button key={qr} className="qr" onClick={() => handleQuickReply(qr)}>{qr}</button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="input-area">
                  <div className="stage-strip">
                    <div className="stage-dot" />
                    <span className="stage-text">{stageLabel}</span>
                    <div className="stage-pill">{stagePill}</div>
                  </div>
                  <div className="input-row">
                    <textarea className="input-box"
                      placeholder={backendStatus === "online" && !profileLocked ? "Type a message or tap a suggestion above…" : backendStatus === "online" ? "Complete your profile to start chatting." : "Backend offline. Try again later."}
                      value={inputVal} onChange={e => setInputVal(e.target.value)}
                      onKeyDown={handleKey} rows={1} disabled={backendStatus !== "online" || profileLocked} />
                    <button className="send-btn" onClick={handleSend} disabled={backendStatus !== "online" || profileLocked}>➤</button>
                  </div>
                </div>
              </>
            )}
            {activeNav === "recs" && (
              <div className="workspace-body">
                <div className="ws-card hero">
                  <div className="ws-kicker">Recommendations</div>
                  <div className="ws-card-title">Your best next ET moves</div>
                  <div className="ws-card-sub">This workspace is for actionable next steps: products to explore, onboarding moves, and ecosystem touchpoints matched to your profile.</div>
                  <div className="ws-stat-row">
                    <div className="ws-stat"><div className="ws-stat-label">Profile fit</div><div className="ws-stat-value">{profilePct}%</div></div>
                    <div className="ws-stat"><div className="ws-stat-label">Product picks</div><div className="ws-stat-value">{liveRecommendations.length}</div></div>
                    <div className="ws-stat"><div className="ws-stat-label">Next actions</div><div className="ws-stat-value">{recommendedActions.length || onboardingItems.length || 0}</div></div>
                  </div>
                </div>
                <div className="workspace-grid">
                  <div className="ws-card">
                    <div className="ws-kicker">Matched picks</div>
                    <RecCards items={liveRecommendations} onAction={a => {
                      logBehavior("rec_click", { a });
                      routeToChat(`Explain why "${a}" is a good next step for me and what I should do first.`, "Moved to chat with this recommendation");
                    }} />
                    <div className="ws-actions">
                      <button type="button" className="ws-btn secondary" onClick={() => routeToChat("Show me more ET product suggestions based on my profile.", "Opened chat for more suggestions")}>
                        More suggestions
                      </button>
                    </div>
                  </div>
                  <div className="ws-card">
                    <div className="ws-kicker">Recommended next steps</div>
                    {recommendedActions.length ? (
                      <ExpandableItems
                        items={recommendedActions.map((item) => ({
                          ...item,
                          detail: `This step is connected to your current profile and ET journey. ${item.desc}`,
                        }))}
                        expandedKey={expandedWorkspaceItem}
                        onToggle={setExpandedWorkspaceItem}
                        onAskConcierge={(item) => routeToChat(`Help me execute this recommended step: ${item.title}. ${item.desc}`, "Opened chat for this step")}
                      />
                    ) : <div className="ws-empty">The backend has not returned action items yet. Ask the agent a few questions in Chat and this panel will fill in.</div>}
                  </div>
                  <div className="ws-card">
                    <div className="ws-kicker">Onboarding path</div>
                    {onboardingItems.length ? (
                      <ExpandableItems
                        items={onboardingItems.map((item) => ({
                          ...item,
                          detail: `${item.desc} This is part of your personalized ET onboarding path.`,
                        }))}
                        expandedKey={expandedWorkspaceItem}
                        onToggle={setExpandedWorkspaceItem}
                        onAskConcierge={(item) => routeToChat(`Walk me through this ET onboarding step: ${item.title}. ${item.desc}`, "Opened chat for onboarding help")}
                      />
                    ) : <div className="ws-empty">Onboarding guidance will appear here after the concierge plan is generated.</div>}
                  </div>
                  <div className="ws-card">
                    <div className="ws-kicker">More ET surfaces</div>
                    {touchpointItems.length ? (
                      <ExpandableItems
                        items={touchpointItems.slice(0, 4).map((item) => ({
                          ...item,
                          detail: `${item.desc} This connects you to another useful ET ecosystem surface.`,
                        }))}
                        expandedKey={expandedWorkspaceItem}
                        onToggle={setExpandedWorkspaceItem}
                        onAskConcierge={(item) => routeToChat(`Tell me how ${item.title} fits my profile and whether I should use it next.`, "Opened chat for ecosystem guidance")}
                      />
                    ) : <div className="ws-empty">This area is reserved for ET Prime, markets tools, courses, and events surfaced by the pipeline.</div>}
                  </div>
                </div>
              </div>
            )}
            {activeNav === "fin" && (
              <div className="workspace-body">
                <div className="ws-card hero">
                  <div className="ws-kicker">Financial navigator</div>
                  <div className="ws-card-title">A live view of your financial position</div>
                  <div className="ws-card-sub">This tab focuses on where you stand now: health score, portfolio gaps, immediate needs, and the ET surfaces that can help close those gaps.</div>
                  <div className="ws-chip-row">
                    {extractArray(conciergeData?.financial_life?.suggested_et_surfaces).slice(0, 4).map((item) => <div className="ws-chip" key={item}>{item}</div>)}
                  </div>
                </div>
                <div className="ws-card">
                  <FinWidget profile={profile} data={liveFinancialData} />
                  <div className="ws-actions">
                    <button type="button" className="ws-btn secondary" onClick={() => routeToChat("Based on my financial navigator, what should I prioritize this month?", "Opened chat for navigator guidance")}>
                      Discuss this plan in chat
                    </button>
                  </div>
                </div>
                <div className="workspace-grid">
                  <div className="ws-card">
                    <div className="ws-kicker">Portfolio gaps</div>
                    {extractArray(conciergeData?.financial_life?.portfolio_gaps).length ? (
                      <ExpandableItems
                        items={extractArray(conciergeData?.financial_life?.portfolio_gaps).map((item, index) => ({
                          title: `Gap ${index + 1}`,
                          desc: item,
                          meta: "Navigator",
                          detail: `This gap was identified from your current profile and concierge analysis. ${item}`,
                        }))}
                        expandedKey={expandedWorkspaceItem}
                        onToggle={setExpandedWorkspaceItem}
                        onAskConcierge={(item) => routeToChat(`How do I fix this portfolio gap: ${item.desc}`, "Opened chat for portfolio gap guidance")}
                      />
                    ) : <div className="ws-empty">No portfolio gaps have been synthesized yet.</div>}
                  </div>
                  <div className="ws-card">
                    <div className="ws-kicker">Immediate needs</div>
                    {extractArray(conciergeData?.financial_life?.immediate_needs).length ? (
                      <ExpandableItems
                        items={extractArray(conciergeData?.financial_life?.immediate_needs).map((item, index) => ({
                          title: `Priority ${index + 1}`,
                          desc: item,
                          meta: "Immediate",
                          detail: `This is marked as near-term because it affects what ET should recommend next. ${item}`,
                        }))}
                        expandedKey={expandedWorkspaceItem}
                        onToggle={setExpandedWorkspaceItem}
                        onAskConcierge={(item) => routeToChat(`Help me act on this immediate financial need: ${item.desc}`, "Opened chat for immediate need guidance")}
                      />
                    ) : <div className="ws-empty">Once the planner detects near-term needs, they will show up here.</div>}
                  </div>
                </div>
              </div>
            )}
            {activeNav === "notifs" && (
              <div className="workspace-body">
                <div className="ws-card hero">
                  <div className="ws-kicker">Alerts and actions</div>
                  <div className="ws-card-title">Alert history and suggested alerts</div>
                  <div className="ws-card-sub">No chatbot here by design. This tab is a feed of the alerts the concierge has already generated and the alerts it wants you to turn on next.</div>
                  <div className="ws-chip-row">
                    {Object.entries(activeChannels).filter(([key, enabled]) => enabled).map(([key]) => <div className="ws-chip" key={key}>{key === "wa" ? "WhatsApp" : key.toUpperCase()}</div>)}
                  </div>
                </div>
                <div className="alert-grid">
                  {alertItems.map((item, index) => (
                    <div className={`alert-card ${item.live ? "live" : ""}`} key={`${item.title}-${index}`}>
                      <div className="alert-top">
                        <div className="alert-icon">{item.icon}</div>
                        <div className="alert-title">{item.title}</div>
                      </div>
                      <div className="alert-body">{item.body}</div>
                      <div className="alert-tag">{item.tag}</div>
                      <div className="ws-actions">
                        <button type="button" className="ws-btn secondary" onClick={() => routeToChat(`Explain this alert and tell me whether I should act on it now: ${item.title}. ${item.body}`, "Opened chat for alert guidance")}>
                          Ask concierge
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="ws-card">
                  <div className="ws-kicker">Suggested channels</div>
                  <div className="ws-list">
                    {Object.entries(activeChannels).filter(([key]) => key !== "chat").map(([key, enabled]) => (
                      <div className="ws-list-item" key={key}>
                        <div className="ws-list-title">{key === "wa" ? "WhatsApp" : key.toUpperCase()}</div>
                        <div className="ws-list-desc">{enabled ? "Currently active for alerts and nudges." : "Recommended to increase delivery coverage for this user profile."}</div>
                        <div className="ws-actions">
                          <button className="ws-btn secondary" onClick={() => toggleChannel(key)}>{enabled ? "Pause channel" : "Activate channel"}</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          {profileLocked && (
            <FlashProfileDeck
              node={activeProfileNode}
              step={activeProfileStepNumber}
              total={profileKeys.length}
              value={deckInput}
              onValueChange={setDeckInput}
              onOption={completeProfileStep}
              onSubmit={() => completeProfileStep(deckInput)}
              disabled={thinking || backendStatus !== "online"}
            />
          )}
        </div>

        {/* ══ REASONING / INNER MONOLOGUE PANEL ══ */}
        <div className={`rp ${reasoningOpen ? "open" : ""}`}>
          <div className="rp-hdr">
            <span style={{ fontSize: 14 }}>🧠</span>
            <div className="rp-title">Inner Monologue</div>
            <button className="rp-close" onClick={() => setReasoningOpen(false)}>✕</button>
          </div>
          <div className="rp-body">

            <div>
              <div className="rp-sec">Risk Scoring</div>
              <div className="risk-visual">
                <div className="risk-ring-wrap">
                  <svg width="56" height="56" viewBox="0 0 56 56">
                    <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="5" />
                    <circle cx="28" cy="28" r="22" fill="none" stroke={riskColor} strokeWidth="5"
                      strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 22}
                      strokeDashoffset={2 * Math.PI * 22 - (riskScore / 100) * 2 * Math.PI * 22}
                      style={{ transform: "rotate(-90deg)", transformOrigin: "28px 28px", transition: "stroke-dashoffset 1s ease" }} />
                  </svg>
                  <div className="risk-ring-label" style={{ color: riskColor, fontSize: 10 }}>{riskScore || "—"}</div>
                </div>
                <div className="risk-info">
                  <div className="risk-title">Risk Score: {riskLabel}</div>
                  <div className="risk-desc">Derived from your live concierge profile and used to shape recommendations, alerts, and marketplace fit.</div>
                </div>
              </div>
            </div>
            <div>
              <div className="rp-sec">How To Reduce Risk</div>
              {riskReductionSteps.length === 0 ? (
                <div className="trace-card"><div className="tc-text"><em>Complete the profile and generate recommendations to see risk-reduction steps.</em></div></div>
              ) : (
                <div className="rp-mini-list">
                  {riskReductionSteps.map((item, index) => (
                    <div className="rp-mini-item" key={`${item.title}-${index}`}>
                      <div className="rp-mini-title">{item.title}</div>
                      <div className="rp-mini-desc">{item.desc}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <div className="rp-sec">Live Alerts</div>
              {alertItems.length === 0 ? (
                <div className="trace-card"><div className="tc-text"><em>No live alerts yet. Alerts will appear here once the concierge generates them.</em></div></div>
              ) : (
                <div className="rp-mini-list">
                  {alertItems.slice(0, 4).map((item, index) => (
                    <div className="rp-mini-item" key={`${item.title}-${index}`}>
                      <div className="rp-mini-title">{item.title}</div>
                      <div className="rp-mini-desc">{item.body}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className={`toast ${toast.show ? "show" : ""}`}>
        <span className="toast-icon">{toast.icon}</span>
        {toast.msg}
      </div>
    </div>
  );
}



