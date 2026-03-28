import { useState, useRef, useEffect, useCallback } from "react";

// ─── STYLES ───────────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;600&display=swap');

  :root {
    --gold: #c8973a;
    --gold-2: #e8b84b;
    --gold-bg: #fdf8ee;
    --teal: #0d6e72;
    --teal-2: #12a085;
    --teal-bg: #eaf6f5;
    --ink: #0c0c14;
    --ink-2: #1e1e2e;
    --ink-3: #2d2d3e;
    --paper: #f8f6f1;
    --white: #ffffff;
    --border: rgba(0,0,0,0.07);
    --border-2: rgba(0,0,0,0.12);
    --muted: #7a7670;
    --muted-2: #a09a94;
    --danger: #c0392b;
    --danger-bg: #fdf1ef;
    --success: #1a7a4a;
    --success-bg: #eaf7f0;
    --sidebar: 272px;
    --hdr: 62px;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body, #root { height: 100%; overflow: hidden; }

  body {
    font-family: 'DM Sans', sans-serif;
    background: var(--paper);
    color: var(--ink);
  }

  .app { display: flex; height: 100vh; overflow: hidden; }

  /* ── SIDEBAR ── */
  .sb {
    width: var(--sidebar);
    background: var(--ink);
    display: flex; flex-direction: column;
    flex-shrink: 0; overflow: hidden;
    border-right: 1px solid rgba(255,255,255,0.05);
    transition: width 0.3s ease;
  }

  .sb-brand {
    padding: 18px 20px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    display: flex; align-items: center; gap: 11px; flex-shrink: 0;
  }

  .sb-logo {
    width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0;
    background: linear-gradient(135deg, var(--gold) 0%, #e8901a 100%);
    display: flex; align-items: center; justify-content: center;
    font-family: 'Lora', serif; font-size: 15px; font-weight: 700;
    color: var(--ink); letter-spacing: -0.03em;
  }

  .sb-brand-text { line-height: 1; }
  .sb-brand-name { font-size: 13.5px; font-weight: 600; color: #fff; }
  .sb-brand-tag { font-size: 9.5px; color: rgba(255,255,255,0.32); letter-spacing: 0.1em; text-transform: uppercase; margin-top: 2px; }

  .sb-profile { padding: 16px 20px; border-bottom: 1px solid rgba(255,255,255,0.06); flex-shrink: 0; }
  .sb-label { font-size: 9px; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; color: rgba(255,255,255,0.25); margin-bottom: 10px; }

  .prog-row { display: flex; align-items: center; gap: 9px; margin-bottom: 12px; }
  .prog-track { flex: 1; height: 4px; background: rgba(255,255,255,0.08); border-radius: 2px; overflow: hidden; }
  .prog-fill { height: 100%; border-radius: 2px; background: linear-gradient(90deg, var(--gold), var(--teal-2)); transition: width 0.7s ease; }
  .prog-pct { font-size: 11px; font-weight: 600; color: var(--gold); min-width: 34px; text-align: right; font-family: 'JetBrains Mono', monospace; }

  .chips { display: flex; flex-direction: column; gap: 5px; }
  .chip {
    display: flex; align-items: center; gap: 7px;
    padding: 6px 10px; border-radius: 7px;
    border: 1px solid rgba(255,255,255,0.05);
    background: rgba(255,255,255,0.03);
    font-size: 11px; color: rgba(255,255,255,0.4); transition: all 0.2s;
  }
  .chip.on { background: rgba(200,151,58,0.1); border-color: rgba(200,151,58,0.22); color: #e8d08a; }
  .chip-dot { width: 5px; height: 5px; border-radius: 50%; background: rgba(255,255,255,0.18); flex-shrink: 0; transition: background 0.2s; }
  .chip.on .chip-dot { background: var(--gold); }
  .chip-val { margin-left: auto; font-family: 'JetBrains Mono', monospace; font-size: 9.5px; color: rgba(255,255,255,0.28); }
  .chip.on .chip-val { color: var(--gold); }

  .sb-nav { flex: 1; overflow-y: auto; padding: 14px 10px; scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.08) transparent; }

  .nav-group-label { font-size: 9px; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; color: rgba(255,255,255,0.22); padding: 0 8px; margin-bottom: 5px; margin-top: 14px; }
  .nav-group-label:first-child { margin-top: 0; }

  .nav-btn {
    width: 100%; display: flex; align-items: center; gap: 9px;
    padding: 8px 10px; border-radius: 8px;
    background: none; border: none; cursor: pointer;
    font-family: 'DM Sans', sans-serif; font-size: 12.5px;
    color: rgba(255,255,255,0.42); text-align: left; transition: all 0.15s; position: relative;
  }
  .nav-btn:hover { background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.72); }
  .nav-btn.active { background: rgba(200,151,58,0.11); color: #e8d08a; }
  .nav-btn .ni { font-size: 13px; min-width: 18px; }
  .nav-btn .nbadge { margin-left: auto; font-size: 8.5px; font-weight: 700; background: var(--gold); color: var(--ink); padding: 2px 6px; border-radius: 8px; }

  .sb-foot { padding: 14px 20px; border-top: 1px solid rgba(255,255,255,0.06); flex-shrink: 0; }
  .ch-pills { display: flex; gap: 4px; flex-wrap: wrap; }
  .ch-pill { font-size: 8.5px; font-weight: 600; letter-spacing: 0.07em; text-transform: uppercase; padding: 4px 8px; border-radius: 4px; cursor: pointer; background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.28); border: 1px solid rgba(255,255,255,0.07); transition: all 0.15s; }
  .ch-pill.on { background: rgba(13,110,114,0.18); color: #4dd4c4; border-color: rgba(13,110,114,0.3); }

  /* ── MAIN ── */
  .main { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-width: 0; }

  .chat-hdr { height: var(--hdr); background: var(--white); border-bottom: 1px solid var(--border); display: flex; align-items: center; padding: 0 24px; gap: 12px; flex-shrink: 0; }
  .av { width: 38px; height: 38px; border-radius: 50%; background: linear-gradient(135deg, var(--gold), var(--teal)); display: flex; align-items: center; justify-content: center; font-family: 'Lora', serif; font-size: 13px; font-weight: 700; color: white; flex-shrink: 0; position: relative; }
  .av::after { content: ''; position: absolute; bottom: 1px; right: 1px; width: 9px; height: 9px; border-radius: 50%; background: #22c55e; border: 2px solid white; }
  .hdr-info { flex: 1; }
  .hdr-name { font-size: 14px; font-weight: 600; }
  .hdr-status { font-size: 11px; color: var(--muted); }
  .hdr-acts { display: flex; gap: 8px; }
  .icon-btn { width: 34px; height: 34px; border-radius: 8px; border: 1px solid var(--border); background: none; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px; color: var(--muted); transition: all 0.15s; }
  .icon-btn:hover { background: var(--paper); color: var(--ink); }

  .msgs { flex: 1; overflow-y: auto; padding: 22px; display: flex; flex-direction: column; gap: 14px; scroll-behavior: smooth; }

  .msg-row { display: flex; gap: 9px; align-items: flex-end; animation: msgIn 0.3s ease; }
  .msg-row.user { flex-direction: row-reverse; }
  @keyframes msgIn { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }

  .msg-av { width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; }
  .msg-av.bot { background: linear-gradient(135deg, var(--gold), var(--teal)); color: white; }
  .msg-av.usr { background: var(--teal); color: white; }

  .msg-body { max-width: 74%; display: flex; flex-direction: column; gap: 5px; }
  .msg-row.user .msg-body { align-items: flex-end; }

  .bubble { padding: 11px 15px; border-radius: 16px; font-size: 13px; line-height: 1.65; }
  .bubble.bot { background: white; border: 1px solid var(--border); border-bottom-left-radius: 4px; color: var(--ink); }
  .bubble.user { background: var(--teal); color: white; border-bottom-right-radius: 4px; }

  .thinking { display: flex; align-items: center; gap: 4px; padding: 14px 16px; background: white; border: 1px solid var(--border); border-radius: 16px; border-bottom-left-radius: 4px; }
  .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--muted-2); animation: bounce 1.2s ease-in-out infinite; }
  .dot:nth-child(2) { animation-delay: 0.18s; }
  .dot:nth-child(3) { animation-delay: 0.36s; }
  @keyframes bounce { 0%,60%,100%{transform:translateY(0);opacity:0.4;} 30%{transform:translateY(-5px);opacity:1;} }

  .msg-ts { font-size: 9.5px; color: var(--muted-2); padding: 0 3px; }

  .qrs { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 3px; }
  .qr { padding: 6px 13px; border-radius: 20px; border: 1.5px solid var(--gold); background: none; cursor: pointer; font-family: 'DM Sans', sans-serif; font-size: 11.5px; font-weight: 500; color: var(--gold); transition: all 0.15s; }
  .qr:hover { background: var(--gold); color: white; transform: translateY(-1px); }

  /* ── FEEDBACK WIDGET ── */
  .feedback-widget {
    background: white; border: 1px solid var(--border); border-radius: 14px;
    padding: 14px 16px; margin-top: 4px;
    animation: msgIn 0.3s ease;
  }
  .fb-label { font-size: 11px; font-weight: 600; color: var(--muted); margin-bottom: 10px; display: flex; align-items: center; gap: 6px; }
  .fb-stars { display: flex; gap: 5px; margin-bottom: 10px; }
  .fb-star {
    width: 32px; height: 32px; border-radius: 8px; border: 1.5px solid var(--border);
    background: var(--paper); cursor: pointer; font-size: 16px;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.15s;
  }
  .fb-star:hover { border-color: var(--gold); background: var(--gold-bg); transform: scale(1.12); }
  .fb-star.sel { border-color: var(--gold); background: var(--gold-bg); box-shadow: 0 2px 8px rgba(200,151,58,0.22); }
  .fb-thumbs { display: flex; gap: 7px; margin-bottom: 10px; }
  .fb-thumb {
    flex: 1; padding: 7px; border-radius: 9px; border: 1.5px solid var(--border);
    background: var(--paper); cursor: pointer; font-size: 18px;
    display: flex; align-items: center; justify-content: center; gap: 6px;
    font-size: 12px; font-weight: 500; color: var(--muted);
    transition: all 0.15s;
  }
  .fb-thumb:hover { border-color: var(--teal); color: var(--teal); background: var(--teal-bg); }
  .fb-thumb.sel-up { border-color: var(--success); background: var(--success-bg); color: var(--success); }
  .fb-thumb.sel-down { border-color: var(--danger); background: var(--danger-bg); color: var(--danger); }
  .fb-tags { display: flex; gap: 5px; flex-wrap: wrap; margin-bottom: 10px; }
  .fb-tag {
    font-size: 10.5px; padding: 4px 10px; border-radius: 20px;
    border: 1.5px solid var(--border); background: var(--paper); cursor: pointer;
    color: var(--muted); transition: all 0.15s;
  }
  .fb-tag.sel { border-color: var(--teal); background: var(--teal-bg); color: var(--teal); font-weight: 600; }
  .fb-input { width: 100%; padding: 8px 11px; border-radius: 8px; border: 1.5px solid var(--border); font-family: 'DM Sans',sans-serif; font-size: 12px; background: var(--paper); color: var(--ink); resize: none; outline: none; margin-bottom: 9px; transition: border-color 0.2s; }
  .fb-input:focus { border-color: var(--gold); background: white; }
  .fb-submit {
    width: 100%; padding: 9px; border-radius: 9px; border: none; cursor: pointer;
    background: linear-gradient(90deg, var(--teal), var(--teal-2));
    color: white; font-family: 'DM Sans',sans-serif; font-size: 12.5px; font-weight: 600;
    transition: all 0.15s;
  }
  .fb-submit:hover { opacity: 0.88; transform: translateY(-1px); }
  .fb-submitted { text-align: center; padding: 10px 0; font-size: 12px; color: var(--success); font-weight: 600; }
  .fb-submitted span { font-size: 20px; display: block; margin-bottom: 4px; }

  /* ── CROSS-SELL NUDGE ── */
  .nudge-bar {
    background: linear-gradient(90deg, rgba(200,151,58,0.08), rgba(13,110,114,0.06));
    border: 1px solid rgba(200,151,58,0.18); border-radius: 11px;
    padding: 10px 14px; display: flex; align-items: center; gap: 10px;
    margin-top: 2px; animation: msgIn 0.3s ease; cursor: pointer;
    transition: all 0.15s;
  }
  .nudge-bar:hover { box-shadow: 0 3px 12px rgba(200,151,58,0.14); transform: translateY(-1px); }
  .nudge-icon { font-size: 18px; flex-shrink: 0; }
  .nudge-text { flex: 1; font-size: 11.5px; line-height: 1.4; color: var(--ink-3); }
  .nudge-text strong { font-weight: 600; color: var(--ink); display: block; margin-bottom: 1px; }
  .nudge-cta { font-size: 10.5px; font-weight: 700; color: var(--gold); white-space: nowrap; }

  /* ── PROFILE CARD ── */
  .profile-card { background: var(--ink-2); border-radius: 14px; padding: 18px 20px; border: 1px solid rgba(200,151,58,0.18); color: white; margin-top: 2px; }
  .pc-head { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
  .pc-av { width: 42px; height: 42px; border-radius: 50%; background: linear-gradient(135deg,var(--gold),var(--teal)); display:flex;align-items:center;justify-content:center;font-family:'Lora',serif;font-size:16px;font-weight:700; }
  .pc-name { font-size: 14px; font-weight: 600; }
  .pc-sub { font-size: 10px; color: rgba(255,255,255,0.4); margin-top: 2px; }
  .pc-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px; }
  .pc-stat { background: rgba(255,255,255,0.05); border-radius: 8px; padding: 9px 12px; border: 1px solid rgba(255,255,255,0.06); }
  .pc-sl { font-size: 8.5px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(255,255,255,0.32); margin-bottom: 3px; }
  .pc-sv { font-size: 13px; font-weight: 600; color: #e8d08a; }
  .pc-tags { display: flex; gap: 5px; flex-wrap: wrap; }
  .pc-tag { font-size: 10px; font-weight: 600; padding: 3px 9px; border-radius: 9px; background: rgba(200,151,58,0.12); color: #e8d08a; border: 1px solid rgba(200,151,58,0.2); }

  /* ── REC CARDS ── */
  .rec-list { display: flex; flex-direction: column; gap: 7px; margin-top: 2px; }
  .rec-card { background: white; border: 1px solid var(--border); border-radius: 12px; padding: 12px 14px; display: flex; gap: 11px; align-items: flex-start; cursor: pointer; transition: all 0.15s; }
  .rec-card:hover { border-color: var(--gold); box-shadow: 0 3px 14px rgba(200,151,58,0.1); transform: translateY(-1px); }
  .rec-icon { font-size: 18px; min-width: 32px; height: 32px; background: var(--gold-bg); border-radius: 8px; display:flex;align-items:center;justify-content:center; }
  .rec-title { font-size: 12.5px; font-weight: 600; margin-bottom: 2px; }
  .rec-desc { font-size: 11px; color: var(--muted); line-height: 1.4; }
  .rec-foot { display: flex; gap: 5px; align-items: center; margin-top: 5px; }
  .rbadge { font-size: 8.5px; font-weight: 700; letter-spacing: 0.07em; text-transform: uppercase; padding: 2px 8px; border-radius: 4px; }
  .rb-gold { background: rgba(200,151,58,0.1); color: #8a6010; border: 1px solid rgba(200,151,58,0.25); }
  .rb-free { background: var(--success-bg); color: var(--success); border: 1px solid rgba(26,122,74,0.18); }
  .rb-event { background: var(--teal-bg); color: var(--teal); border: 1px solid rgba(13,110,114,0.2); }
  .rb-partner { background: var(--danger-bg); color: var(--danger); border: 1px solid rgba(192,57,43,0.18); }

  /* ── FINANCIAL WIDGET ── */
  .fin-widget { background: white; border: 1px solid var(--border); border-radius: 14px; overflow: hidden; margin-top: 2px; }
  .fw-hdr { padding: 13px 18px; background: var(--paper); border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 8px; }
  .fw-title { font-size: 12.5px; font-weight: 600; }
  .fw-sub { font-size: 10px; color: var(--muted); margin-left: auto; }
  .fw-body { padding: 16px 18px; }
  .fin-meters { display: grid; grid-template-columns: repeat(3,1fr); gap: 10px; margin-bottom: 16px; }
  .fin-meter { text-align: center; }
  .fm-label { font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.09em; color: var(--muted); margin-bottom: 7px; }
  .ring-wrap { position: relative; width: 68px; height: 68px; margin: 0 auto 4px; }
  .ring-wrap svg { transform: rotate(-90deg); overflow: visible; }
  .ring-bg { fill: none; stroke: #f0ede6; stroke-width: 6; }
  .ring-fill { fill: none; stroke-width: 6; stroke-linecap: round; }
  .ring-label { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; font-family: 'JetBrains Mono', monospace; }
  .fin-sug { display: flex; flex-direction: column; gap: 7px; }
  .fs-row { display: flex; gap: 9px; align-items: flex-start; padding: 9px 11px; border-radius: 8px; border: 1px solid var(--border); background: var(--paper); }
  .fs-icon { font-size: 13px; min-width: 20px; margin-top: 1px; }
  .fs-text { font-size: 11.5px; line-height: 1.5; }
  .fs-text strong { font-weight: 600; }

  /* ── INPUT ── */
  .input-area { background: white; border-top: 1px solid var(--border); padding: 14px 22px; flex-shrink: 0; }
  .stage-bar { display: flex; align-items: center; gap: 7px; margin-bottom: 10px; font-size: 11px; color: var(--muted); }
  .s-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--gold); }
  .s-pill { font-size: 8.5px; font-weight: 700; letter-spacing: 0.09em; text-transform: uppercase; padding: 3px 9px; border-radius: 9px; background: var(--gold-bg); color: #8a6010; border: 1px solid rgba(200,151,58,0.25); }
  .input-row { display: flex; gap: 8px; align-items: flex-end; }
  .input-box { flex: 1; min-height: 42px; max-height: 110px; padding: 10px 15px; border-radius: 22px; border: 1.5px solid var(--border-2); font-family: 'DM Sans', sans-serif; font-size: 13px; resize: none; outline: none; line-height: 1.5; background: var(--paper); color: var(--ink); transition: border-color 0.2s, background 0.2s; overflow-y: auto; }
  .input-box:focus { border-color: var(--gold); background: white; }
  .input-box::placeholder { color: rgba(0,0,0,0.28); }
  .send-btn { width: 42px; height: 42px; border-radius: 50%; flex-shrink: 0; background: var(--teal); border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 15px; color: white; transition: all 0.15s; }
  .send-btn:hover { background: var(--teal-2); transform: scale(1.06); }
  .send-btn:active { transform: scale(0.94); }

  /* ── ANALYTICS PANEL ── */
  .ap { background: white; border-left: 1px solid var(--border); flex-shrink: 0; overflow: hidden; width: 0; transition: width 0.3s ease; display: flex; flex-direction: column; }
  .ap.open { width: 300px; }
  .ap-hdr { padding: 16px 18px; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 7px; flex-shrink: 0; }
  .ap-title { font-size: 13px; font-weight: 600; flex: 1; }
  .ap-close { background: none; border: none; cursor: pointer; font-size: 14px; color: var(--muted); padding: 2px; }
  .ap-body { flex: 1; overflow-y: auto; padding: 14px 18px; display: flex; flex-direction: column; gap: 14px; }
  .ap-sec-title { font-size: 9px; font-weight: 700; letter-spacing: 0.13em; text-transform: uppercase; color: var(--muted); margin-bottom: 9px; }
  .insight-card { padding: 11px 13px; border-radius: 9px; background: var(--paper); border: 1px solid var(--border); margin-bottom: 7px; }
  .ic-title { font-size: 12px; font-weight: 600; margin-bottom: 3px; }
  .ic-desc { font-size: 11px; color: var(--muted); line-height: 1.5; }
  .ca-row { display: flex; align-items: center; gap: 9px; font-size: 11.5px; margin-bottom: 6px; }
  .ca-label { min-width: 68px; color: var(--muted); font-size: 11px; }
  .ca-track { flex: 1; height: 5px; background: #f0ede6; border-radius: 2px; overflow: hidden; }
  .ca-fill { height: 100%; border-radius: 2px; background: var(--teal); transition: width 0.9s ease; }
  .ca-val { min-width: 34px; text-align: right; font-weight: 600; font-size: 10.5px; font-family: 'JetBrains Mono', monospace; }

  /* ── FEEDBACK SCORE SUMMARY IN ANALYTICS ── */
  .fb-summary { padding: 12px 14px; border-radius: 9px; background: var(--paper); border: 1px solid var(--border); }
  .fb-score-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
  .fb-big-score { font-size: 28px; font-weight: 700; font-family: 'JetBrains Mono', monospace; color: var(--gold); }
  .fb-score-meta { font-size: 11px; color: var(--muted); }
  .fb-score-meta strong { display: block; font-size: 12px; color: var(--ink); font-weight: 600; }
  .fb-mini-stars { display: flex; gap: 2px; font-size: 12px; }
  .fb-tags-summary { display: flex; gap: 4px; flex-wrap: wrap; }
  .fb-tag-chip { font-size: 9.5px; font-weight: 600; padding: 2px 7px; border-radius: 8px; background: var(--teal-bg); color: var(--teal); border: 1px solid rgba(13,110,114,0.15); }

  /* ── TOAST ── */
  .toast { position: fixed; top: 14px; right: 14px; z-index: 9999; background: var(--ink); color: white; padding: 11px 16px; border-radius: 10px; font-size: 12px; font-weight: 500; display: flex; align-items: center; gap: 8px; box-shadow: 0 8px 28px rgba(0,0,0,0.22); transition: all 0.3s ease; transform: translateY(-80px); opacity: 0; pointer-events: none; }
  .toast.show { transform: none; opacity: 1; }

  /* ── SCROLLBARS ── */
  .sb-nav::-webkit-scrollbar, .msgs::-webkit-scrollbar, .ap-body::-webkit-scrollbar { width: 3px; }
  .sb-nav::-webkit-scrollbar-thumb, .msgs::-webkit-scrollbar-thumb, .ap-body::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 2px; }
`;

// ─── CONVERSATION FLOW ────────────────────────────────────────────────────────
const FLOW = [
  { id: "greeting", bot: "👋 Welcome to **ET Concierge** — your intelligent financial guide across the entire ET ecosystem.\n\nI'll build your personalized profile in under 3 minutes so I can recommend the right content, events, and financial products for you. Ready to begin?", qr: ["Let's go! 🚀", "Tell me more first"], next: { "Let's go! 🚀": "q1", "Tell me more first": "about" } },
  { id: "about", bot: "ET Concierge combines conversational AI, financial intelligence, and multi-channel engagement to give you a truly personalized experience across ET Prime, Markets, Masterclass, Events, and more.\n\nShall we start your profile?", qr: ["Yes, let's start!", "Maybe later"], next: { "Yes, let's start!": "q1", "Maybe later": "end_soft" } },
  { id: "q1", bot: "Great! First — **what best describes your primary interest area?**", qr: ["📈 Stock Markets", "💼 Personal Finance", "🏢 Business & Startups", "🌍 Economy & Policy"], next: "q2", profileKey: "interests", stageLabel: "Profiling · Step 1 of 5", stagePill: "01 / 05" },
  { id: "q2", bot: "Got it! Now, **what is your primary financial goal right now?**", qr: ["🎯 Grow Wealth", "🏠 Buy Property", "🎓 Child's Education", "🌴 Early Retirement"], next: "q3", profileKey: "goal", stageLabel: "Profiling · Step 2 of 5", stagePill: "02 / 05" },
  { id: "q3", bot: "Perfect. **How would you describe your current investment portfolio?**", qr: ["Just Starting Out", "Mostly Mutual Funds", "Diversified Portfolio", "Heavy in Stocks/ETFs"], next: "q4", profileKey: "investments", stageLabel: "Profiling · Step 3 of 5", stagePill: "03 / 05" },
  { id: "q4", bot: "Almost there! **What's your risk appetite?**", qr: ["🟢 Conservative", "🟡 Moderate", "🔴 Aggressive", "🤷 Not Sure Yet"], next: "q5", profileKey: "risk", stageLabel: "Profiling · Step 4 of 5", stagePill: "04 / 05" },
  { id: "q5", bot: "Last one — **how do you prefer to engage with financial content?**", qr: ["📰 Daily Articles", "🎓 Deep Courses", "🔔 Smart Alerts", "📊 Data & Analysis"], next: "profile_done", profileKey: "engagement", stageLabel: "Profiling · Step 5 of 5", stagePill: "05 / 05" },
  { id: "profile_done", bot: "✅ **Your profile is complete!** Here's what I've captured:", type: "profile_card", qr: ["Show my Recommendations", "Open Financial Analysis", "Set Up Alerts"], next: { "Show my Recommendations": "recs", "Open Financial Analysis": "fin_analysis", "Set Up Alerts": "alerts" }, stageLabel: "Profile Complete", stagePill: "Done ✓" },
  { id: "recs", bot: "Based on your profile, here are your **top personalized recommendations** from the ET ecosystem:", type: "recommendations", qr: ["Analyze My Portfolio", "Set Up Alerts", "Explore ET Masterclass"], next: { "Analyze My Portfolio": "fin_analysis", "Set Up Alerts": "alerts", "Explore ET Masterclass": "masterclass" }, stageLabel: "Recommendations", stagePill: "Personalized" },
  { id: "fin_analysis", bot: "Here's your **Financial Health Analysis** based on your profile. I've identified some opportunities to optimize your portfolio:", type: "fin_widget", qr: ["Show Partner Services", "View My Recommendations", "Set Up Alerts"], next: { "Show Partner Services": "partners", "View My Recommendations": "recs", "Set Up Alerts": "alerts" }, stageLabel: "Financial Navigator", stagePill: "Analysis" },
  { id: "partners", bot: "Based on gaps in your portfolio, here are **partner financial services** I recommend:", type: "partner_recs", qr: ["Show My Full Recommendations", "Set Up Alerts", "Start Over"], next: { "Show My Full Recommendations": "recs", "Set Up Alerts": "alerts", "Start Over": "greeting" }, stageLabel: "Marketplace Concierge", stagePill: "Partners" },
  { id: "alerts", bot: "🔔 I'll set up **smart alerts** for you across your active channels. You'll receive:\n\n• Market updates every morning at 8 AM\n• Portfolio milestone alerts in real time\n• Curated event invites based on your interests\n• Exclusive ET partner offers when relevant\n\nYou can manage your channels in the sidebar!", qr: ["Show My Recommendations", "Analyze My Portfolio", "Start Over"], next: { "Show My Recommendations": "recs", "Analyze My Portfolio": "fin_analysis", "Start Over": "greeting" }, stageLabel: "Alerts Active", stagePill: "Multi-Channel" },
  { id: "masterclass", bot: "🎓 Based on your interests, here are top **ET Masterclass** courses for you:", type: "masterclass_recs", qr: ["Analyze My Portfolio", "Set Up Alerts", "View All Recommendations"], next: { "Analyze My Portfolio": "fin_analysis", "Set Up Alerts": "alerts", "View All Recommendations": "recs" }, stageLabel: "ET Masterclass", stagePill: "Courses" },
  { id: "end_soft", bot: "No problem! Come back whenever you're ready. I'll be here to guide you across the entire ET ecosystem. 👋", qr: ["Actually, let's start now!"], next: { "Actually, let's start now!": "q1" }, stageLabel: "Paused", stagePill: "Anytime" },
];
const FLOWMAP = {};
FLOW.forEach(f => { FLOWMAP[f.id] = f; });

// ─── RECOMMENDATION DATA ──────────────────────────────────────────────────────
const RECS = [
  { icon: "📈", title: "ET Markets Premium", desc: "Real-time stock screener, F&O analytics, and portfolio tracker.", badge: "rb-gold", badgeText: "ET Prime", action: "Open ET Markets" },
  { icon: "🎓", title: "Value Investing Masterclass", desc: "12-week deep-dive into fundamental analysis with industry veterans.", badge: "rb-event", badgeText: "Masterclass", action: "View Course" },
  { icon: "🏛️", title: "ET Global Business Summit", desc: "Network with 500+ founders and investors in Mumbai, March 2025.", badge: "rb-event", badgeText: "Event", action: "Register Now" },
  { icon: "📰", title: "ET Prime Subscription", desc: "Unlimited access to in-depth analysis, long-form journalism, and exclusive data.", badge: "rb-gold", badgeText: "Premium", action: "Subscribe" },
];

const PARTNER_RECS = [
  { icon: "💳", title: "HDFC Moneyback Credit Card", desc: "5% cashback on investments + zero forex markup for international ETFs.", badge: "rb-partner", badgeText: "Partner", action: "Apply Now" },
  { icon: "🛡️", title: "LIC Term Insurance Plan", desc: "₹1 Cr coverage at ₹899/month. Recommended for your wealth-building goal.", badge: "rb-partner", badgeText: "Insurance", action: "Get Quote" },
  { icon: "🏦", title: "Zerodha Kite Pro", desc: "Commission-free trading with advanced charting, matching your aggressive portfolio.", badge: "rb-free", badgeText: "Free Trial", action: "Connect" },
];

const MASTERCLASS_RECS = [
  { icon: "📊", title: "Technical Analysis Bootcamp", desc: "Master candlestick patterns, RSI, MACD, and more in 6 weeks.", badge: "rb-gold", badgeText: "Premium", action: "Enroll" },
  { icon: "🏘️", title: "Real Estate Investing 101", desc: "From REITs to direct property — diversify beyond equities.", badge: "rb-event", badgeText: "Live Course", action: "Join Waitlist" },
  { icon: "🧠", title: "Behavioral Finance Workshop", desc: "Understand cognitive biases that impact your investment decisions.", badge: "rb-free", badgeText: "Free", action: "Start Free" },
];

// ─── CROSS-SELL NUDGE RULES ───────────────────────────────────────────────────
// Triggered by behavior: node visited, clicks made, time spent on recs
const NUDGE_RULES = [
  { trigger: "recs_viewed", icon: "🎓", title: "Unlock deeper insights", desc: "Users with your profile save 2–3x more with ET Prime's exclusive reports.", cta: "Explore ET Prime →" },
  { trigger: "fin_analysis_viewed", icon: "🛡️", title: "Protect your portfolio", desc: "You're missing ₹1 Cr term cover. LIC offers it at ₹899/month — specially sourced for ET readers.", cta: "Get Quote →" },
  { trigger: "partners_viewed", icon: "📈", title: "Track your investments live", desc: "Connect Zerodha to your ET dashboard and see all holdings in one place.", cta: "Connect Now →" },
  { trigger: "masterclass_viewed", icon: "🏛️", title: "Meet the experts in person", desc: "Your course instructors are speaking at ET Global Business Summit — early-bird closes soon.", cta: "Register →" },
];

// ─── FEEDBACK TAG OPTIONS ─────────────────────────────────────────────────────
const FB_TAGS_GOOD = ["Relevant", "Accurate", "Easy to use", "Good recommendations", "Saved me time"];
const FB_TAGS_BAD = ["Too generic", "Not relevant", "Too many steps", "Missing products", "Confusing"];

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function nowTime() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function RingMeter({ value, color, label }) {
  const r = 28, cx = 34, cy = 34, circ = 2 * Math.PI * r;
  return (
    <div className="fin-meter">
      <div className="fm-label">{label}</div>
      <div className="ring-wrap">
        <svg width="68" height="68" viewBox="0 0 68 68">
          <circle className="ring-bg" cx={cx} cy={cy} r={r} />
          <circle className="ring-fill" cx={cx} cy={cy} r={r} stroke={color} strokeDasharray={circ} strokeDashoffset={circ - (value / 100) * circ} />
        </svg>
        <div className="ring-label" style={{ color }}>{value}%</div>
      </div>
    </div>
  );
}

function BubbleText({ text }) {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return (
    <>{parts.map((p, i) => i % 2 === 1 ? <strong key={i}>{p}</strong> : p.split("\n").map((line, j) => (<span key={j}>{line}{j < p.split("\n").length - 1 && <br />}</span>)))}</>
  );
}

function RecCards({ items, onAction }) {
  return (
    <div className="rec-list">
      {items.map((r, i) => (
        <div className="rec-card" key={i} onClick={() => onAction(r.action)}>
          <div className="rec-icon">{r.icon}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="rec-title">{r.title}</div>
            <div className="rec-desc">{r.desc}</div>
            <div className="rec-foot"><span className={`rbadge ${r.badge}`}>{r.badgeText}</span></div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ProfileCard({ profile }) {
  return (
    <div className="profile-card">
      <div className="pc-head">
        <div className="pc-av">Y</div>
        <div><div className="pc-name">Your Profile</div><div className="pc-sub">Personalized · Just Now</div></div>
      </div>
      <div className="pc-grid">
        <div className="pc-stat"><div className="pc-sl">Interest</div><div className="pc-sv">{profile.interests || "—"}</div></div>
        <div className="pc-stat"><div className="pc-sl">Goal</div><div className="pc-sv">{profile.goal || "—"}</div></div>
        <div className="pc-stat"><div className="pc-sl">Portfolio</div><div className="pc-sv">{profile.investments || "—"}</div></div>
        <div className="pc-stat"><div className="pc-sl">Risk</div><div className="pc-sv">{profile.risk || "—"}</div></div>
      </div>
      <div className="pc-tags">
        {profile.engagement && <span className="pc-tag">{profile.engagement}</span>}
        <span className="pc-tag">ET Ecosystem</span>
        <span className="pc-tag">Personalized ✓</span>
      </div>
    </div>
  );
}

function FinWidget({ profile }) {
  const riskMap = { "🟢 Conservative": 30, "🟡 Moderate": 58, "🔴 Aggressive": 85, "🤷 Not Sure Yet": 45 };
  const diversification = riskMap[profile.risk] || 55;
  const goalProgress = 34;
  const healthScore = Math.round((diversification + 60 + goalProgress) / 3);
  return (
    <div className="fin-widget">
      <div className="fw-hdr"><span style={{ fontSize: 14 }}>📊</span><span className="fw-title">Financial Health Analysis</span><span className="fw-sub">Personalized</span></div>
      <div className="fw-body">
        <div className="fin-meters">
          <RingMeter value={healthScore} color="#c8973a" label="Health Score" />
          <RingMeter value={diversification} color="#0d6e72" label="Diversification" />
          <RingMeter value={goalProgress} color="#1a7a4a" label="Goal Progress" />
        </div>
        <div className="fin-sug">
          <div className="fs-row"><span className="fs-icon">⚡</span><div className="fs-text"><strong>Action:</strong> Your portfolio lacks international exposure. Consider adding a US Index ETF.</div></div>
          <div className="fs-row"><span className="fs-icon">🛡️</span><div className="fs-text"><strong>Gap:</strong> No term insurance detected. A ₹1 Cr cover costs less than ₹900/month.</div></div>
          <div className="fs-row"><span className="fs-icon">🎯</span><div className="fs-text"><strong>Goal:</strong> At current savings rate, you're 34% towards your {profile.goal?.replace(/[^\w\s]/g, "") || "wealth"} goal.</div></div>
        </div>
      </div>
    </div>
  );
}

// ─── FEEDBACK WIDGET ──────────────────────────────────────────────────────────
function FeedbackWidget({ onSubmit }) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [thumb, setThumb] = useState(null); // 'up' | 'down'
  const [selectedTags, setSelectedTags] = useState([]);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const tags = thumb === "down" ? FB_TAGS_BAD : FB_TAGS_GOOD;

  const toggleTag = (t) => setSelectedTags(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t]);

  const handleSubmit = () => {
    if (!rating && thumb === null) return;
    const fbData = { rating, thumb, tags: selectedTags, comment, time: nowTime() };
    setSubmitted(true);
    onSubmit(fbData);
  };

  if (submitted) {
    return (
      <div className="feedback-widget">
        <div className="fb-submitted">
          <span>🙏</span>
          Thanks for your feedback! I'll use this to improve your recommendations.
        </div>
      </div>
    );
  }

  return (
    <div className="feedback-widget">
      <div className="fb-label">⭐ Rate this interaction</div>

      {/* Star rating */}
      <div className="fb-stars">
        {[1, 2, 3, 4, 5].map(s => (
          <div key={s} className={`fb-star ${rating >= s ? "sel" : ""}`}
            onMouseEnter={() => setHovered(s)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => setRating(s)}
            style={{ fontSize: 16 }}>
            {(hovered || rating) >= s ? "⭐" : "☆"}
          </div>
        ))}
      </div>

      {/* Thumbs */}
      <div className="fb-thumbs">
        <div className={`fb-thumb ${thumb === "up" ? "sel-up" : ""}`} onClick={() => { setThumb("up"); setSelectedTags([]); }}>
          👍 Helpful
        </div>
        <div className={`fb-thumb ${thumb === "down" ? "sel-down" : ""}`} onClick={() => { setThumb("down"); setSelectedTags([]); }}>
          👎 Needs Work
        </div>
      </div>

      {/* Contextual tags */}
      {thumb !== null && (
        <div className="fb-tags">
          {tags.map(t => (
            <div key={t} className={`fb-tag ${selectedTags.includes(t) ? "sel" : ""}`} onClick={() => toggleTag(t)}>{t}</div>
          ))}
        </div>
      )}

      {/* Free text */}
      <textarea className="fb-input" rows={2} placeholder="Any other comments? (optional)" value={comment} onChange={e => setComment(e.target.value)} />

      <button className="fb-submit" onClick={handleSubmit} disabled={!rating && thumb === null}>
        Submit Feedback
      </button>
    </div>
  );
}

// ─── CROSS-SELL NUDGE ─────────────────────────────────────────────────────────
function NudgeBar({ nudge, onDismiss, onAction }) {
  return (
    <div className="nudge-bar" onClick={onAction}>
      <div className="nudge-icon">{nudge.icon}</div>
      <div className="nudge-text">
        <strong>{nudge.title}</strong>
        {nudge.desc}
      </div>
      <span className="nudge-cta">{nudge.cta}</span>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function ETConcierge() {
  const [messages, setMessages] = useState([]);
  const [inputVal, setInputVal] = useState("");
  const [currentNode, setCurrentNode] = useState("greeting");
  const [profile, setProfile] = useState({});
  const [profilePct, setProfilePct] = useState(0);
  const [thinking, setThinking] = useState(false);
  const [stageLabel, setStageLabel] = useState("Welcome");
  const [stagePill, setStagePill] = useState("Start");
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [activeChannels, setActiveChannels] = useState({ chat: true, sms: false, wa: false, email: false, push: false });
  const [toast, setToast] = useState({ show: false, icon: "", msg: "" });
  const [activeNav, setActiveNav] = useState("chat");

  // ── NEW: Behavior tracking & feedback state ──
  const [behaviorLog, setBehaviorLog] = useState([]); // [{event, time}]
  const [visitedNodes, setVisitedNodes] = useState(new Set());
  const [activeNudge, setActiveNudge] = useState(null);
  const [nudgeShownFor, setNudgeShownFor] = useState(new Set());
  const [feedbacks, setFeedbacks] = useState([]); // collected feedback objects
  const [feedbackCount, setFeedbackCount] = useState(0);
  const [pendingFeedbackMsg, setPendingFeedbackMsg] = useState(null); // msgId that needs a feedback widget shown after

  const msgsRef = useRef(null);
  const profileKeys = ["interests", "goal", "investments", "risk", "engagement"];

  const scrollBottom = useCallback(() => {
    setTimeout(() => { if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight; }, 60);
  }, []);

  const showToast = useCallback((icon, msg) => {
    setToast({ show: true, icon, msg });
    setTimeout(() => setToast(t => ({ ...t, show: false })), 2800);
  }, []);

  // ── Behavior logging ──
  const logBehavior = useCallback((event, meta = {}) => {
    setBehaviorLog(prev => [...prev, { event, meta, time: nowTime(), ts: Date.now() }]);
  }, []);

  // ── Cross-sell nudge trigger logic ──
  const checkNudge = useCallback((nodeId, newVisited) => {
    const triggerMap = {
      recs: "recs_viewed",
      fin_analysis: "fin_analysis_viewed",
      partners: "partners_viewed",
      masterclass: "masterclass_viewed",
    };
    const trigger = triggerMap[nodeId];
    if (!trigger || nudgeShownFor.has(trigger)) return;

    const rule = NUDGE_RULES.find(r => r.trigger === trigger);
    if (!rule) return;

    // Delay nudge by 3s after landing on node
    setTimeout(() => {
      setActiveNudge(rule);
      setNudgeShownFor(prev => new Set([...prev, trigger]));
      logBehavior("nudge_shown", { trigger });
    }, 3000);
  }, [nudgeShownFor, logBehavior]);

  const addMessage = useCallback((role, content, type = "text", extra = null, opts = {}) => {
    const id = Date.now() + Math.random();
    setMessages(prev => [...prev, { id, role, content, type, extra, time: nowTime(), showFeedback: opts.showFeedback || false }]);
    scrollBottom();
    return id;
  }, [scrollBottom]);

  const gotoNode = useCallback((nodeId, newProfile = null) => {
    const node = FLOWMAP[nodeId];
    if (!node) return;
    setCurrentNode(nodeId);
    if (node.stageLabel) setStageLabel(node.stageLabel);
    if (node.stagePill) setStagePill(node.stagePill);

    // Track visits
    setVisitedNodes(prev => {
      const next = new Set([...prev, nodeId]);
      checkNudge(nodeId, next);
      return next;
    });
    logBehavior("node_visited", { nodeId });

    setThinking(true);
    setTimeout(() => {
      setThinking(false);
      const prof = newProfile || profile;
      // Show feedback widget after key nodes
      const showFb = ["recs", "fin_analysis", "partners", "masterclass", "alerts"].includes(nodeId);
      addMessage("bot", node.bot, node.type || "text", prof, { showFeedback: showFb });
      scrollBottom();
    }, 900 + Math.random() * 400);
  }, [profile, addMessage, scrollBottom, logBehavior, checkNudge]);

  // Start on mount
  useEffect(() => {
    setTimeout(() => {
      addMessage("bot", FLOWMAP["greeting"].bot);
      setStageLabel("Welcome");
      setStagePill("Start");
    }, 500);
  }, []);

  const handleQuickReply = useCallback((reply) => {
    if (thinking) return;
    addMessage("user", reply);
    logBehavior("quick_reply", { reply });
    setActiveNudge(null); // dismiss active nudge on user action

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
    logBehavior("freetext_sent", { len: val.length });
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
        addMessage("bot", "I understand! Let me tailor my response for you. Would you like to explore your recommendations or analyze your portfolio?", "text", null, { showFeedback: true });
      }, 900);
    }
  }, [inputVal, thinking, currentNode, addMessage, gotoNode, logBehavior]);

  const handleKey = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } };

  // ── Feedback submission ──
  const handleFeedbackSubmit = useCallback((msgId, fbData) => {
    setFeedbacks(prev => [...prev, { msgId, ...fbData }]);
    setFeedbackCount(c => c + 1);
    logBehavior("feedback_submitted", { rating: fbData.rating, thumb: fbData.thumb, tags: fbData.tags });
    showToast("🙏", `Feedback recorded — improving your recs!`);

    // Adapt: if negative feedback, suggest restart or different flow
    if (fbData.thumb === "down" || fbData.rating <= 2) {
      setTimeout(() => {
        addMessage("bot", "💡 Thanks for letting me know. I can try a **different approach** — would you like me to restart your profile or explore a different section?", "text", null, { showFeedback: false });
      }, 1200);
    }
  }, [logBehavior, showToast, addMessage]);

  const restartChat = () => {
    setMessages([]); setProfile({}); setProfilePct(0);
    setCurrentNode("greeting"); setStageLabel("Welcome"); setStagePill("Start");
    setVisitedNodes(new Set()); setNudgeShownFor(new Set());
    setActiveNudge(null); setBehaviorLog([]);
    setTimeout(() => { addMessage("bot", FLOWMAP["greeting"].bot); }, 300);
  };

  const toggleChannel = (key) => {
    setActiveChannels(prev => {
      const next = { ...prev, [key]: !prev[key] };
      if (next[key]) showToast("✅", `${key.toUpperCase()} channel activated`);
      logBehavior("channel_toggled", { key, active: next[key] });
      return next;
    });
  };

  // ── Computed analytics ──
  const avgRating = feedbacks.length ? (feedbacks.reduce((s, f) => s + (f.rating || 0), 0) / feedbacks.length).toFixed(1) : null;
  const allFbTags = feedbacks.flatMap(f => f.tags || []);
  const tagCounts = allFbTags.reduce((acc, t) => { acc[t] = (acc[t] || 0) + 1; return acc; }, {});
  const topTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([t]) => t);
  const channelEngagement = [
    { label: "In-App", pct: 100 },
    { label: "Push", pct: activeChannels.push ? 68 : 0 },
    { label: "WhatsApp", pct: activeChannels.wa ? 44 : 0 },
    { label: "Email", pct: activeChannels.email ? 82 : 0 },
    { label: "SMS", pct: activeChannels.sms ? 30 : 0 },
  ];

  const currentNode_ = FLOWMAP[currentNode];
  const currentQRs = currentNode_?.qr || [];

  return (
    <>
      <style>{css}</style>
      <div className="app">
        {/* ── SIDEBAR ── */}
        <div className="sb">
          <div className="sb-brand">
            <div className="sb-logo">ET</div>
            <div className="sb-brand-text">
              <div className="sb-brand-name">ET Concierge</div>
              <div className="sb-brand-tag">AI Financial Guide</div>
            </div>
          </div>

          <div className="sb-profile">
            <div className="sb-label">Profile Completion</div>
            <div className="prog-row">
              <div className="prog-track"><div className="prog-fill" style={{ width: `${profilePct}%` }} /></div>
              <div className="prog-pct">{profilePct}%</div>
            </div>
            <div className="chips">
              {["interests", "goal", "investments", "risk"].map(k => (
                <div key={k} className={`chip ${profile[k] ? "on" : ""}`}>
                  <div className="chip-dot" />
                  <span style={{ textTransform: "capitalize" }}>{k === "investments" ? "Portfolio" : k}</span>
                  <span className="chip-val">{profile[k] ? profile[k].substring(0, 12) + (profile[k].length > 12 ? "…" : "") : "—"}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="sb-nav">
            <div className="nav-group-label">Workspace</div>
            {[
              { id: "chat", icon: "💬", label: "Chat Concierge" },
              { id: "fin", icon: "📊", label: "Financial Navigator" },
              { id: "recs", icon: "✨", label: "Recommendations" },
              { id: "notifs", icon: "🔔", label: "Alerts & Notifs" },
            ].map(n => (
              <button key={n.id} className={`nav-btn ${activeNav === n.id ? "active" : ""}`}
                onClick={() => { setActiveNav(n.id); if (n.id !== "chat") showToast("🔄", `Switching to ${n.label}…`); }}>
                <span className="ni">{n.icon}</span> {n.label}
                {n.id === "notifs" && feedbackCount > 0 && <span className="nbadge">{feedbackCount}</span>}
              </button>
            ))}

            <div className="nav-group-label">ET Ecosystem</div>
            {[
              { icon: "📰", label: "ET Prime", msg: "Opening ET Prime…" },
              { icon: "📈", label: "ET Markets", msg: "Opening ET Markets…" },
              { icon: "🎓", label: "ET Masterclass", msg: "Opening Masterclass…" },
              { icon: "🏛️", label: "ET Events", msg: "Opening ET Events…" },
            ].map(n => (
              <button key={n.label} className="nav-btn" onClick={() => { showToast(n.icon, n.msg); logBehavior("ecosystem_click", { label: n.label }); }}>
                <span className="ni">{n.icon}</span> {n.label}
              </button>
            ))}

            <div className="nav-group-label">Tools</div>
            <button className={`nav-btn ${analyticsOpen ? "active" : ""}`} onClick={() => setAnalyticsOpen(o => !o)}>
              <span className="ni">🔍</span> Live Analytics
            </button>
            <button className="nav-btn" onClick={restartChat}>
              <span className="ni">↺</span> Restart Session
            </button>
          </div>

          <div className="sb-foot">
            <div className="sb-label" style={{ marginBottom: 7 }}>Active Channels</div>
            <div className="ch-pills">
              {Object.entries(activeChannels).map(([k, v]) => (
                <div key={k} className={`ch-pill ${v ? "on" : ""}`} onClick={() => k !== "chat" && toggleChannel(k)}>
                  {k === "wa" ? "WhatsApp" : k.toUpperCase()}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── MAIN ── */}
        <div className="main">
          <div className="chat-hdr">
            <div className="av">ET</div>
            <div className="hdr-info">
              <div className="hdr-name">ET AI Concierge</div>
              <div className="hdr-status">{thinking ? "Thinking…" : "Online · Ready to help"}</div>
            </div>
            <div className="hdr-acts">
              <button className="icon-btn" title="Analytics" onClick={() => setAnalyticsOpen(o => !o)}>📊</button>
              <button className="icon-btn" title="Restart" onClick={restartChat}>↺</button>
            </div>
          </div>

          <div className="msgs" ref={msgsRef}>
            {messages.map(m => (
              <div key={m.id}>
                <div className={`msg-row ${m.role === "user" ? "user" : ""}`}>
                  <div className={`msg-av ${m.role === "bot" ? "bot" : "usr"}`}>{m.role === "bot" ? "ET" : "You"}</div>
                  <div className="msg-body">
                    {m.type === "profile_card" && m.extra ? (
                      <><div className="bubble bot"><BubbleText text={m.content} /></div><ProfileCard profile={m.extra} /></>
                    ) : m.type === "recommendations" ? (
                      <><div className="bubble bot"><BubbleText text={m.content} /></div><RecCards items={RECS} onAction={a => { showToast("🔗", a); logBehavior("rec_clicked", { action: a }); }} /></>
                    ) : m.type === "fin_widget" ? (
                      <><div className="bubble bot"><BubbleText text={m.content} /></div><FinWidget profile={profile} /></>
                    ) : m.type === "partner_recs" ? (
                      <><div className="bubble bot"><BubbleText text={m.content} /></div><RecCards items={PARTNER_RECS} onAction={a => { showToast("🔗", a); logBehavior("partner_clicked", { action: a }); }} /></>
                    ) : m.type === "masterclass_recs" ? (
                      <><div className="bubble bot"><BubbleText text={m.content} /></div><RecCards items={MASTERCLASS_RECS} onAction={a => { showToast("🎓", a); logBehavior("masterclass_clicked", { action: a }); }} /></>
                    ) : (
                      <div className={`bubble ${m.role === "bot" ? "bot" : "user"}`}><BubbleText text={m.content} /></div>
                    )}
                    <div className="msg-ts">{m.time}</div>
                  </div>
                </div>

                {/* Inline feedback widget after key bot messages */}
                {m.role === "bot" && m.showFeedback && (
                  <div style={{ paddingLeft: 36, marginTop: 2 }}>
                    <FeedbackWidget onSubmit={(fb) => handleFeedbackSubmit(m.id, fb)} />
                  </div>
                )}
              </div>
            ))}

            {thinking && (
              <div className="msg-row">
                <div className="msg-av bot">ET</div>
                <div className="msg-body">
                  <div className="thinking"><div className="dot" /><div className="dot" /><div className="dot" /></div>
                </div>
              </div>
            )}

            {/* Behavior-triggered cross-sell nudge */}
            {!thinking && activeNudge && (
              <div style={{ paddingLeft: 36 }}>
                <NudgeBar
                  nudge={activeNudge}
                  onDismiss={() => setActiveNudge(null)}
                  onAction={() => { showToast(activeNudge.icon, activeNudge.cta); logBehavior("nudge_clicked", { trigger: activeNudge.trigger }); setActiveNudge(null); }}
                />
              </div>
            )}

            {/* Quick replies */}
            {!thinking && currentQRs.length > 0 && (
              <div style={{ paddingLeft: 36 }}>
                <div className="qrs">
                  {currentQRs.map(qr => (<button key={qr} className="qr" onClick={() => handleQuickReply(qr)}>{qr}</button>))}
                </div>
              </div>
            )}
          </div>

          <div className="input-area">
            <div className="stage-bar">
              <div className="s-dot" />
              <span>{stageLabel}</span>
              <div className="s-pill">{stagePill}</div>
            </div>
            <div className="input-row">
              <textarea ref={useRef(null)} className="input-box" placeholder="Type a message or tap a suggestion above…" value={inputVal} onChange={e => setInputVal(e.target.value)} onKeyDown={handleKey} rows={1} />
              <button className="send-btn" onClick={handleSend}>➤</button>
            </div>
          </div>
        </div>

        {/* ── ANALYTICS PANEL ── */}
        <div className={`ap ${analyticsOpen ? "open" : ""}`}>
          <div className="ap-hdr">
            <span style={{ fontSize: 15 }}>📊</span>
            <div className="ap-title">Live Analytics</div>
            <button className="ap-close" onClick={() => setAnalyticsOpen(false)}>✕</button>
          </div>
          <div className="ap-body">

            {/* Profile insights */}
            <div>
              <div className="ap-sec-title">Profile Insights</div>
              <div className="insight-card">
                <div className="ic-title">Personalization Score</div>
                <div className="ic-desc">
                  {profilePct === 0 ? "Complete the profiling to unlock recommendations."
                    : profilePct < 60 ? `${profilePct}% complete. Keep going to unlock full personalization.`
                    : `Strong profile at ${profilePct}%. Recommendations are highly personalized.`}
                </div>
              </div>
              {profile.interests && <div className="insight-card"><div className="ic-title">Interest Cluster</div><div className="ic-desc">Mapped to: {profile.interests}. ET is curating relevant content streams for you.</div></div>}
              {profile.risk && (
                <div className="insight-card">
                  <div className="ic-title">Risk Profile</div>
                  <div className="ic-desc">
                    {profile.risk.includes("Conservative") && "Stable, low-volatility product recommendations served."}
                    {profile.risk.includes("Moderate") && "Balanced mix of growth and stability products recommended."}
                    {profile.risk.includes("Aggressive") && "High-growth instruments and advanced tools recommended."}
                    {profile.risk.includes("Not Sure") && "Starting conservative and adjusting as you engage more."}
                  </div>
                </div>
              )}
            </div>

            {/* Feedback summary — NEW */}
            <div>
              <div className="ap-sec-title">Feedback & AI Refinement</div>
              {feedbacks.length === 0 ? (
                <div className="insight-card">
                  <div className="ic-title">No feedback yet</div>
                  <div className="ic-desc">Rate interactions using the feedback widgets in chat. Your input directly improves recommendations.</div>
                </div>
              ) : (
                <div className="fb-summary">
                  <div className="fb-score-row">
                    <div className="fb-big-score">{avgRating}</div>
                    <div>
                      <div className="fb-score-meta"><strong>Avg. Rating</strong>from {feedbacks.length} feedback{feedbacks.length > 1 ? "s" : ""}</div>
                      <div className="fb-mini-stars">{[1,2,3,4,5].map(s => <span key={s}>{parseFloat(avgRating) >= s ? "⭐" : "☆"}</span>)}</div>
                    </div>
                  </div>
                  {topTags.length > 0 && (
                    <div className="fb-tags-summary">{topTags.map(t => <div key={t} className="fb-tag-chip">{t}</div>)}</div>
                  )}
                </div>
              )}
            </div>

            {/* Behavior log — NEW */}
            <div>
              <div className="ap-sec-title">Behavior Log ({behaviorLog.length} events)</div>
              {behaviorLog.slice(-5).reverse().map((e, i) => (
                <div key={i} className="insight-card" style={{ marginBottom: 5 }}>
                  <div className="ic-title" style={{ fontSize: 11 }}>{e.event}</div>
                  <div className="ic-desc">{e.time} · {JSON.stringify(e.meta)}</div>
                </div>
              ))}
              {behaviorLog.length === 0 && <div className="insight-card"><div className="ic-desc">Interact with the chat to see live event tracking.</div></div>}
            </div>

            {/* Channel engagement */}
            <div>
              <div className="ap-sec-title">Channel Engagement</div>
              {channelEngagement.map(c => (
                <div className="ca-row" key={c.label}>
                  <div className="ca-label">{c.label}</div>
                  <div className="ca-track"><div className="ca-fill" style={{ width: `${c.pct}%` }} /></div>
                  <div className="ca-val">{c.pct}%</div>
                </div>
              ))}
            </div>

            {/* Session stats */}
            <div>
              <div className="ap-sec-title">Session Stats</div>
              <div className="insight-card">
                <div className="ic-title">Messages Exchanged</div>
                <div className="ic-desc">{messages.length} messages · {profileKeys.filter(k => profile[k]).length}/{profileKeys.length} profile fields captured</div>
              </div>
              <div className="insight-card">
                <div className="ic-title">Screens Visited</div>
                <div className="ic-desc">{visitedNodes.size} nodes · {[...visitedNodes].join(", ") || "none yet"}</div>
              </div>
              <div className="insight-card">
                <div className="ic-title">Active Channels</div>
                <div className="ic-desc">{Object.values(activeChannels).filter(Boolean).length} of 5 channels activated</div>
              </div>
              <div className="insight-card">
                <div className="ic-title">Cross-sell Nudges</div>
                <div className="ic-desc">{nudgeShownFor.size} nudges shown · {nudgeShownFor.size > 0 ? [...nudgeShownFor].join(", ") : "none yet"}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={`toast ${toast.show ? "show" : ""}`}>
        <span style={{ fontSize: 15 }}>{toast.icon}</span>
        {toast.msg}
      </div>
    </>
  );
}