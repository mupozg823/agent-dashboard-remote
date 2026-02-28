// ── Shared Mutable State ──
import { C, TOOL_COLORS, ACHIEVEMENTS } from './config.js';

export const S = {
  // Connection
  sbClient: null, channel: null, connected: false, connParams: null,
  agentOnline: false, reconnectAttempts: 0, reconnectTimer: null,
  // Data
  entries: [], serverMetrics: null, prevTotal: 0, lastET: 0,
  // Game
  combo: 0, maxCombo: 0, comboTimer: null, totalXP: 0,
  achievements: [], prevLevel: 1,
  // Canvas
  cv: null, mainCx: null, buf: null, cx: null, dpr: 1, fr: 0,
  // Floor
  currentFloor: 0, viewMode: 'floor',
  floorAnim: 0, floorAnimDir: 0, floorAnimFrom: 0,
  floorBgCache: [null, null, null],
  elevatorPackets: [], floorActivity: [0, 0, 0],
  // Agents (populated by game.js)
  agents: [],
  // Particles
  pts: [], weatherParticles: [],
  // Effects
  thunderFlash: 0, shakeFrames: 0, shakeIntensity: 0,
  // Render
  lastRender: 0, hudPrev: 0, hudWait: 30, hudShow: 0,
  // Activity
  activityHistory: [], sparkData: { ops: [], errs: [] },
  // Tick
  lastTick: 0, relayUptime: 0, lastLaneStats: null, lastLaneStatsTime: 0,
  // Orchestration
  orchRun: null,
  // Commands
  cmdHistory: [],
  // Panel
  currentPanel: 'log', panelOpen: false, newLogCount: 0,
  // Narration
  nFull: '', nIdx: 0, nTxt: '', nTm: null,
};

// ── Canvas Helpers ──
export function cW() { return S.cv ? S.cv.width / S.dpr : 300; }
export function cH() { return S.cv ? S.cv.height / S.dpr : 200; }

export function resize() {
  if (!S.cv) return;
  const rect = S.cv.parentElement.getBoundingClientRect();
  if (rect.width < 10 || rect.height < 10) return;
  S.dpr = Math.min(window.devicePixelRatio || 1, 2);
  S.cv.width = rect.width * S.dpr;
  S.cv.height = rect.height * S.dpr;
  S.cv.style.width = rect.width + 'px';
  S.cv.style.height = rect.height + 'px';
  S.buf.width = S.cv.width; S.buf.height = S.cv.height;
  S.cx = S.buf.getContext('2d');
  S.cx.setTransform(S.dpr, 0, 0, S.dpr, 0, 0);
  S.floorBgCache = [null, null, null];
}

export function initCanvas() {
  S.cv = document.getElementById('c');
  S.mainCx = S.cv.getContext('2d');
  S.buf = document.createElement('canvas');
  S.cx = S.buf.getContext('2d');
  resize();
  window.addEventListener('resize', resize);
}

// ── Utilities ──
export function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
export function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

// ── Toast ──
export function toast(msg, type = 'in') {
  const wrap = document.getElementById('toastWrap'); if (!wrap) return;
  const el = document.createElement('div'); el.className = 'toast ' + type; el.textContent = msg;
  wrap.appendChild(el); requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => { el.classList.remove('show'); el.classList.add('hide'); setTimeout(() => el.remove(), 300); }, 2500);
  while (wrap.children.length > 3) wrap.firstChild.remove();
}

// ── Narration ──
export function narr(t, at) {
  const nf = document.getElementById('nf');
  if (nf) nf.textContent = at ? (C[at]?.l || 'SYS') : 'SYS';
  S.nFull = t; S.nIdx = 0; S.nTxt = ''; clearInterval(S.nTm);
  S.nTm = setInterval(() => {
    if (S.nIdx < S.nFull.length) { S.nTxt += S.nFull[S.nIdx++]; const nt = document.getElementById('nt'); if (nt) nt.textContent = S.nTxt; }
    else clearInterval(S.nTm);
  }, 35);
}

// ── Particles ──
export function spawnP(x, y, n, type, tool) {
  if (S.pts.length > 80) return;
  const colors = type === 'error' ? ['#FF3300', '#FF6644', '#CC0000'] :
    type === 'success' ? (TOOL_COLORS[tool] || ['#44DD66', '#88FF88', '#22AA44']) :
    ['#FFD080', '#FFAA22', '#FF6644', '#FFDD44', '#88BBFF'];
  for (let i = 0; i < Math.min(n, 10); i++) {
    const shape = type === 'error' ? 'rect' : Math.random() > .6 ? 'star' : Math.random() > .3 ? 'circle' : 'rect';
    S.pts.push({ x: x + (Math.random() - .5) * 14, y: y + (Math.random() - .5) * 6,
      vx: (Math.random() - .5) * 4.5, vy: -Math.random() * 4.5 - 1,
      l: 35 + Math.random() * 25, c: colors[i % colors.length],
      z: 2 + Math.random() * 3.5, shape, rot: Math.random() * 6.28, rv: (Math.random() - .5) * .25 });
  }
}

// ── Sparkline ──
export function addSpark(key, val) { const a = S.sparkData[key]; a.push(val); if (a.length > 20) a.shift(); }
export function drawSparkSvg(data, color, w, h) {
  if (data.length < 2) return '';
  const max = Math.max(1, ...data);
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - v / max * (h - 2) + 1}`).join(' ');
  return `<svg class="spark" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.5"/></svg>`;
}

// ── Activity ──
export function trackActivity() {
  const now = Date.now(); S.activityHistory.push(now);
  S.activityHistory = S.activityHistory.filter(t => now - t < 60000);
}
export function getActivityIntensity() { return Math.min(S.activityHistory.length / 30, 1); }

// ── Shake ──
export function triggerShake(intensity) { S.shakeFrames = 12; S.shakeIntensity = intensity || 3; }

// ── Combo ──
export function addCombo(success) {
  if (success) {
    S.combo++; if (S.combo > S.maxCombo) S.maxCombo = S.combo;
    clearTimeout(S.comboTimer); S.comboTimer = setTimeout(() => { S.combo = 0; }, 5000);
    S.totalXP += 10 + S.combo * 2;
    if (S.combo >= 5 && S.combo % 5 === 0) { toast(S.combo + '콤보!', 'ok'); spawnP(cW() / 2, cH() * .4, 6 + S.combo, 'success'); }
    const newLvl = Math.floor(S.totalXP / 500) + 1;
    if (newLvl > S.prevLevel) {
      S.prevLevel = newLvl; toast('LEVEL UP! Lv.' + newLvl, 'ok'); triggerShake(3);
      for (let i = 0; i < 20; i++) spawnP(cW() * Math.random(), cH() * Math.random(), 5, 'success');
      S.agents.forEach(a => { a.compFx = 20; });
    }
    const joyAg = S.agents[Math.floor(Math.random() * S.agents.length)];
    if (joyAg && joyAg.st === 'work') joyAg.compFx = Math.max(joyAg.compFx || 0, 8);
  } else { S.combo = 0; }
  checkAchievements();
}

function checkAchievements() {
  for (const a of ACHIEVEMENTS) {
    if (!S.achievements.includes(a.id) && a.cond(S)) {
      S.achievements.push(a.id);
      toast('업적 달성: ' + a.name + '!', 'ok');
      spawnP(cW() / 2, cH() / 2, 12, 'success');
      narr('업적 달성! ' + a.name + ' - ' + a.desc, 'agent');
    }
  }
}

// ── Panel Badge ──
export function updateBadge(id, n) {
  const el = document.getElementById(id); if (!el) return;
  el.textContent = n; el.classList.toggle('show', n > 0);
}
