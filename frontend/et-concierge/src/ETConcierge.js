import { useState, useRef, useEffect, useCallback } from "react";

// ─── STYLES ───────────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;0,900;1,600&family=Syne:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');

  :root {
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

    --sidebar-w: 260px;
    --reasoning-w: 310px;
    --hdr: 58px;

    --mono: 'JetBrains Mono', monospace;
    --display: 'Playfair Display', serif;
    --body: 'Syne', sans-serif;
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body, #root { height: 100%; overflow: hidden; }

  body {
    font-family: var(--body);
    background: var(--bg);
    color: var(--text);
    -webkit-font-smoothing: antialiased;
  }

  /* ══ SCROLLBARS ══ */
  ::-webkit-scrollbar { width: 2px; height: 2px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }

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
    height: var(--hdr); background: rgba(13,15,26,0.95);
    border-bottom: 1px solid var(--border);
    display: flex; align-items: center; padding: 0 22px; gap: 12px;
    flex-shrink: 0; backdrop-filter: blur(12px);
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
    background: linear-gradient(135deg, #0d6e72, #0a5459);
    border: 1px solid rgba(0,212,200,0.2);
    border-bottom-right-radius: 4px;
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
    background: rgba(13,15,26,0.98); border-top: 1px solid var(--border);
    padding: 14px 22px; flex-shrink: 0; backdrop-filter: blur(12px);
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
    background-image: linear-gradient(rgba(255,255,255,0.012) 1px, transparent 1px),
                      linear-gradient(90deg, rgba(255,255,255,0.012) 1px, transparent 1px);
    background-size: 40px 40px;
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

const FB_TAGS_POS = ["Highly Relevant", "Accurate", "Great UX", "Strong Recommendations", "Time-saving"];
const FB_TAGS_NEG = ["Too Generic", "Not Relevant", "Too Many Steps", "Missing Products", "Unclear"];

function nowTime() { return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }

// ─── AGENT BADGE ──────────────────────────────────────────────────────────────
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
function FinWidget({ profile }) {
  const riskMap = { "🟢 Conservative": 32, "🟡 Moderate": 58, "🔴 Aggressive": 82, "🤷 Not Sure Yet": 44 };
  const div = riskMap[profile.risk] || 55;
  const health = Math.round((div + 62 + 34) / 3);
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
          <RingMeter value={34} color="var(--green)" label="Goal Progress" />
        </div>
        <div className="fin-suggestions">
          {[
            ["⚡", "Action", "Your portfolio lacks international exposure. Consider adding a US Index ETF."],
            ["🛡️", "Gap", "No term insurance detected. ₹1 Cr cover available at under ₹900/month."],
            ["🎯", "Goal", `At current pace, you're 34% toward your ${profile.goal?.replace(/[^\w\s]/g,"") || "wealth"} goal.`],
          ].map(([icon, label, text]) => (
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
        {[1,2,3,4,5].map(s => (
          <div key={s} className={`fb-star ${(hovered||rating)>=s?"sel":""}`}
            onMouseEnter={() => setHov(s)} onMouseLeave={() => setHov(0)}
            onClick={() => setRating(s)}>
            {(hovered||rating)>=s?"⭐":"☆"}
          </div>
        ))}
      </div>
      <div className="fb-thumbs">
        <div className={`fb-thumb ${thumb==="up"?"sel-up":""}`} onClick={() => { setThumb("up"); setTags([]); }}>👍 Helpful</div>
        <div className={`fb-thumb ${thumb==="down"?"sel-down":""}`} onClick={() => { setThumb("down"); setTags([]); }}>👎 Needs Work</div>
      </div>
      {thumb !== null && (
        <div className="fb-tags">
          {tagList.map(t => <div key={t} className={`fb-tag ${tags.includes(t)?"sel":""}`} onClick={() => toggle(t)}>{t}</div>)}
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

  const [visitedNodes, setVisitedNodes] = useState(new Set());
  const [activeNudge, setActiveNudge] = useState(null);
  const [nudgeShownFor, setNudgeShownFor] = useState(new Set());
  const [feedbacks, setFeedbacks] = useState([]);
  const [behaviorLog, setBehaviorLog] = useState([]);
  const [reasoningTraces, setReasoningTraces] = useState([]);

  const msgsRef = useRef(null);
  const profileKeys = ["interests", "goal", "investments", "risk", "engagement"];

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

  const gotoNode = useCallback((nodeId, newProfile = null) => {
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
  }, [profile, addMessage, scrollBottom, logBehavior, nudgeShownFor]);

  useEffect(() => {
    setTimeout(() => {
      addMessage("bot", FLOWMAP["greeting"].bot, "text", null, { agent: "concierge" });
    }, 500);
  }, []);

  const handleQuickReply = useCallback((reply) => {
    if (thinking) return;
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
  }, [thinking, currentNode, profile, profileKeys, addMessage, gotoNode, logBehavior]);

  const handleSend = useCallback(() => {
    const val = inputVal.trim();
    if (!val || thinking) return;
    setInputVal("");
    addMessage("user", val);
    logBehavior("freetext", { len: val.length });
    setActiveNudge(null);

    const node = FLOWMAP[currentNode];
    let nextId;
    if (node && typeof node.next === "string") nextId = node.next;
    else if (node && typeof node.next === "object") nextId = Object.values(node.next)[0];

    if (nextId) gotoNode(nextId);
    else {
      setThinking(true);
      setTimeout(() => {
        setThinking(false);
        addMessage("bot", "I've processed your input. Would you like to explore your recommendations or run a financial analysis?", "text", null, { showFeedback: true, agent: "concierge" });
      }, 900);
    }
  }, [inputVal, thinking, currentNode, addMessage, gotoNode, logBehavior]);

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
    setMessages([]); setProfile({}); setProfilePct(0);
    setCurrentNode("greeting"); setStageLabel("Welcome"); setStagePill("Start");
    setVisitedNodes(new Set()); setNudgeShownFor(new Set());
    setActiveNudge(null); setBehaviorLog([]); setReasoningTraces([]);
    setActiveAgent("concierge");
    setTimeout(() => addMessage("bot", FLOWMAP["greeting"].bot, "text", null, { agent: "concierge" }), 300);
  };

  const toggleChannel = (key) => {
    setActiveChannels(prev => {
      const next = { ...prev, [key]: !prev[key] };
      if (next[key]) showToast("✅", `${key.toUpperCase()} channel activated`);
      logBehavior("channel_toggle", { key, active: next[key] });
      return next;
    });
  };

  const avgRating = feedbacks.length ? (feedbacks.reduce((s, f) => s + (f.rating || 0), 0) / feedbacks.length).toFixed(1) : null;
  const allTags = feedbacks.flatMap(f => f.tags || []);
  const tagFreq = allTags.reduce((a, t) => { a[t] = (a[t] || 0) + 1; return a; }, {});
  const topTags = Object.entries(tagFreq).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([t]) => t);

  const riskScore = { "🟢 Conservative": 25, "🟡 Moderate": 55, "🔴 Aggressive": 85, "🤷 Not Sure Yet": 40 }[profile.risk] || 0;
  const riskColor = riskScore > 65 ? "var(--red)" : riskScore > 40 ? "var(--gold)" : "var(--green)";
  const riskLabel = riskScore > 65 ? "Aggressive" : riskScore > 40 ? "Moderate" : riskScore > 0 ? "Conservative" : "—";

  const channelEng = [
    { label: "In-App", pct: 100 },
    { label: "Email", pct: activeChannels.email ? 82 : 0 },
    { label: "Push", pct: activeChannels.push ? 67 : 0 },
    { label: "WhatsApp", pct: activeChannels.wa ? 44 : 0 },
    { label: "SMS", pct: activeChannels.sms ? 30 : 0 },
  ];

  const pipelineSteps = ["Profiler", "Recommender", "RAG", "Action"];
  const agentPipelineMap = { profiler: 0, recommender: 1, rag: 2, action: 3 };
  const activeStep = agentPipelineMap[activeAgent] ?? -1;

  const currentQRs = FLOWMAP[currentNode]?.qr || [];

  return (
    <>
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
                onClick={() => { setActiveNav(n.id); if (n.id !== "chat") showToast("🔄", `Switching to ${n.label}…`); }}>
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
              <div className="hdr-sub">{thinking ? `${activeAgent.toUpperCase()} AGENT · Processing…` : "Online · Multi-Agent Pipeline Active"}</div>
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
              <button className="hdr-btn" title="Inner Monologue" onClick={() => setReasoningOpen(o => !o)}>🧠</button>
              <button className="hdr-btn" title="Restart" onClick={restartChat}>↺</button>
            </div>
          </div>

          <div className="msgs" ref={msgsRef}>
            {messages.map(m => (
              <div key={m.id}>
                <div className={`msg-row msg-animate ${m.role === "user" ? "user" : ""}`}>
                  <div className={`msg-av ${m.role === "bot" ? "bot" : "usr"}`}>{m.role === "bot" ? "ET" : "You"}</div>
                  <div className="msg-body">
                    {m.role === "bot" && <AgentBadge agent={m.agent || "concierge"} />}

                    {m.type === "profile_card" && m.extra ? (
                      <><div className="bubble bot"><BubbleText text={m.content} /></div><ProfileCard profile={m.extra} /></>
                    ) : m.type === "recommendations" ? (
                      <><div className="bubble bot"><BubbleText text={m.content} /></div><RecCards items={RECS} onAction={a => { showToast("🔗", a); logBehavior("rec_click", { a }); }} /></>
                    ) : m.type === "fin_widget" ? (
                      <><div className="bubble bot"><BubbleText text={m.content} /></div><FinWidget profile={profile} /></>
                    ) : m.type === "partner_recs" ? (
                      <><div className="bubble bot"><BubbleText text={m.content} /></div><RecCards items={PARTNER_RECS} onAction={a => { showToast("🔗", a); logBehavior("partner_click", { a }); }} /></>
                    ) : m.type === "masterclass_recs" ? (
                      <><div className="bubble bot"><BubbleText text={m.content} /></div><RecCards items={MASTERCLASS_RECS} onAction={a => { showToast("🎓", a); logBehavior("masterclass_click", { a }); }} /></>
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

            {!thinking && currentQRs.length > 0 && (
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
                placeholder="Type a message or tap a suggestion above…"
                value={inputVal} onChange={e => setInputVal(e.target.value)}
                onKeyDown={handleKey} rows={1} />
              <button className="send-btn" onClick={handleSend}>➤</button>
            </div>
          </div>
        </div>

        {/* ══ REASONING / INNER MONOLOGUE PANEL ══ */}
        <div className={`rp ${reasoningOpen ? "open" : ""}`}>
          <div className="rp-hdr">
            <span style={{ fontSize: 14 }}>🧠</span>
            <div className="rp-title">Inner Monologue</div>
            <button className="rp-close" onClick={() => setReasoningOpen(false)}>✕</button>
          </div>
          <div className="rp-body">

            {/* Risk Score Visual */}
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
                  <div className="risk-desc">Maps to 0–10 scale. Gates product recommendations and advisory tone.</div>
                </div>
              </div>
            </div>

            {/* Reasoning Traces */}
            <div>
              <div className="rp-sec">Agent Reasoning Traces</div>
              {reasoningTraces.length === 0 ? (
                <div className="trace-card"><div className="tc-text"><em>No reasoning traces yet. Start profiling to see agent thoughts.</em></div></div>
              ) : (
                reasoningTraces.slice().reverse().map((t, i) => (
                  <div className="trace-card" key={i}>
                    <div className={`tc-agent ${t.agent}`}>{t.agent?.toUpperCase()} · {t.time}</div>
                    <div className="tc-text">{t.text}</div>
                  </div>
                ))
              )}
            </div>

            {/* Feedback Analytics */}
            <div>
              <div className="rp-sec">Feedback Analytics</div>
              {feedbacks.length === 0 ? (
                <div className="trace-card"><div className="tc-text"><em>Rate interactions using the feedback widgets to see AI refinement data here.</em></div></div>
              ) : (
                <div className="fb-analytics-card">
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 10, marginBottom: 8 }}>
                    <div className="fb-big">{avgRating}</div>
                    <div>
                      <div style={{ fontSize: 10, color: "var(--text3)" }}>avg rating · {feedbacks.length} feedback{feedbacks.length > 1 ? "s" : ""}</div>
                      <div className="fb-mini-stars">{[1,2,3,4,5].map(s => <span key={s}>{parseFloat(avgRating) >= s ? "⭐" : "☆"}</span>)}</div>
                    </div>
                  </div>
                  {topTags.length > 0 && <div className="fb-tag-chips">{topTags.map(t => <div key={t} className="fb-tag-chip">{t}</div>)}</div>}
                </div>
              )}
            </div>

            {/* Channel Engagement */}
            <div>
              <div className="rp-sec">Channel Engagement</div>
              {channelEng.map(c => (
                <div className="ca-row" key={c.label}>
                  <div className="ca-label">{c.label}</div>
                  <div className="ca-track"><div className="ca-fill" style={{ width: `${c.pct}%` }} /></div>
                  <div className="ca-val">{c.pct}%</div>
                </div>
              ))}
            </div>

            {/* Behavior Log */}
            <div>
              <div className="rp-sec">Event Log ({behaviorLog.length})</div>
              {behaviorLog.length === 0 ? (
                <div className="trace-card"><div className="tc-text"><em>Interact with the chat to see live event tracking.</em></div></div>
              ) : (
                behaviorLog.slice().reverse().slice(0, 8).map((e, i) => (
                  <div className="evt-row" key={i}>
                    <div className="evt-time">{e.time}</div>
                    <div className="evt-label"><strong>{e.event}</strong> {e.meta.nodeId || e.meta.reply || e.meta.label || ""}</div>
                  </div>
                ))
              )}
            </div>

            {/* Session Stats */}
            <div>
              <div className="rp-sec">Session Stats</div>
              {[
                ["Messages", messages.length],
                ["Nodes visited", visitedNodes.size],
                ["Profile fields", `${profileKeys.filter(k => profile[k]).length}/5`],
                ["Active channels", Object.values(activeChannels).filter(Boolean).length],
                ["Nudges shown", nudgeShownFor.size],
                ["Feedbacks", feedbacks.length],
              ].map(([label, val]) => (
                <div className="ca-row" key={label}>
                  <div className="ca-label">{label}</div>
                  <div style={{ marginLeft: "auto", fontFamily: "var(--mono)", fontSize: "10px", color: "var(--gold)", fontWeight: 700 }}>{val}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className={`toast ${toast.show ? "show" : ""}`}>
        <span className="toast-icon">{toast.icon}</span>
        {toast.msg}
      </div>
    </>
  );
}