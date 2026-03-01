// ── main.ts ── Bootstrap, DOM events, window exposures
import { S, C, AT } from './state.ts';
import { narr } from './ui.ts';
import { openPanel, closePanel, switchTab } from './ui.ts';
import { cW, cH, initCanvas, startRenderLoop, spawnP, switchFloor, toggleBuildingView } from './renderer-views.ts';
import { agents } from './agents.ts';
import { getParams, autoFetchSession, doConnect, connectWith, sendCmd, quickCmd, requestStatus, trySSEFallback } from './connection.ts';
import { pick } from './utils.ts';
import { NR } from './state.ts';

// ── Expose globals for HTML onclick handlers ──
declare global {
  interface Window {
    switchFloor: typeof switchFloor;
    toggleBuildingView: typeof toggleBuildingView;
    openPanel: typeof openPanel;
    closePanel: typeof closePanel;
    switchTab: typeof switchTab;
    doConnect: typeof doConnect;
    sendCmd: typeof sendCmd;
    quickCmd: typeof quickCmd;
    requestStatus: typeof requestStatus;
    _mainCx?: CanvasRenderingContext2D;
    supabase: typeof supabase;
    PIXI: typeof PIXI;
  }
}

window.switchFloor = switchFloor;
window.toggleBuildingView = toggleBuildingView;
window.openPanel = openPanel;
window.closePanel = closePanel;
window.switchTab = switchTab;
window.doConnect = doConnect;
window.sendCmd = sendCmd;
window.quickCmd = quickCmd;
window.requestStatus = requestStatus;

// ── Canvas touch/click support ──
const sceneEl = document.querySelector('.scene') as HTMLElement | null;
const _cTarget = sceneEl || document.getElementById('c') as HTMLElement;

function _canvasCoords(clientX: number, clientY: number): { x: number; y: number } {
  const target = S.pixiApp ? S.pixiApp.canvas : document.getElementById('c') as HTMLCanvasElement;
  const rect = target.getBoundingClientRect();
  return { x: (clientX - rect.left) * (cW() / rect.width), y: (clientY - rect.top) * (cH() / rect.height) };
}

function _handleBuildingClick(cx2: number, cy2: number): boolean {
  if (S.viewMode !== 'building' || !S.buildingFloorHits.length) return false;
  for (const h of S.buildingFloorHits) {
    if (cx2 >= h.x && cx2 <= h.x + h.w && cy2 >= h.y && cy2 <= h.y + h.h) {
      switchFloor(h.fi); spawnP(cx2, cy2, 5); return true;
    }
  }
  return false;
}

_cTarget.addEventListener('touchstart', (e: Event) => {
  const te = e as TouchEvent;
  const touch = te.touches[0];
  const { x: cx2, y: cy2 } = _canvasCoords(touch.clientX, touch.clientY);
  S.swipeStartY = touch.clientY; S.swipeStartTime = Date.now(); S.swipeActive = true;
  if (_handleBuildingClick(cx2, cy2)) return;
  const hitAgent = agents.find(a => {
    const ax = a.x * cW(), ay = a.y * cH();
    return Math.abs(cx2 - ax) < 30 * S.P / 5 && Math.abs(cy2 - ay) < 40 * S.P / 5;
  });
  if (hitAgent) {
    const c2 = C[hitAgent.t];
    narr(`${c2.l} (${c2.r}) - ${hitAgent.st === 'work' ? '\uC791\uC5C5: ' + hitAgent.tk : hitAgent.st === 'walk' ? '\uC774\uB3D9 \uC911' : '\uB300\uAE30'} [${hitAgent.tot}ops]`, AT[hitAgent.i]);
    spawnP(hitAgent.x * cW(), hitAgent.y * cH() - 20, 3);
  }
}, { passive: true });

_cTarget.addEventListener('touchend', (e: Event) => {
  if (!S.swipeActive) return; S.swipeActive = false;
  const te = e as TouchEvent;
  const touch = te.changedTouches[0];
  const dy = touch.clientY - S.swipeStartY, dt = Date.now() - S.swipeStartTime;
  if (dt < 500 && Math.abs(dy) > 50) {
    if (dy < -50 && S.currentFloor < 2) switchFloor(S.currentFloor + 1);
    else if (dy > 50 && S.currentFloor > 0) switchFloor(S.currentFloor - 1);
  }
}, { passive: true });

_cTarget.addEventListener('click', (e: Event) => {
  const me = e as MouseEvent;
  const { x: cx2, y: cy2 } = _canvasCoords(me.clientX, me.clientY);
  _handleBuildingClick(cx2, cy2);
});

// ── Bottom sheet swipe ──
document.getElementById('panelSheet')?.addEventListener('touchstart', (e: Event) => {
  S.sheetStartY = (e as TouchEvent).touches[0].clientY;
}, { passive: true });
document.getElementById('panelSheet')?.addEventListener('touchmove', (e: Event) => {
  const dy = (e as TouchEvent).touches[0].clientY - S.sheetStartY;
  if (dy > 80) closePanel();
}, { passive: true });

// ── Drag & Drop JSONL ──
document.body.addEventListener('dragover', (e: DragEvent) => e.preventDefault());
document.body.addEventListener('drop', (e: DragEvent) => {
  e.preventDefault();
  const f = e.dataTransfer?.files[0];
  if (f) {
    const r = new FileReader();
    r.onload = (v: ProgressEvent<FileReader>) => {
      const text = v.target!.result as string;
      S.entries = text.trim().split('\n').filter(Boolean).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean) as Record<string, unknown>[];
      import('./connection.ts').then(conn => { S.entries.forEach(e2 => conn.onE(e2 as Parameters<typeof conn.onE>[0])); });
      import('./ui.ts').then(ui => { ui.sUI(); ui.toast(`\uB85C\uADF8 \uB85C\uB4DC! ${S.entries.length}\uAC74`, 'ok'); });
      narr(`\uB85C\uADF8 \uB85C\uB4DC! ${S.entries.length}\uAC74`);
    };
    r.readAsText(f);
  }
});

// ── Visibility change ──
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && !S.connected && S.connParams) {
    import('./connection.ts').then(conn => conn.connectWith(S.connParams!.url, S.connParams!.key, S.connParams!.sessionId));
  }
});

// ── Idle narration ──
setInterval(() => { if (Date.now() - S.lastET > 12000) narr(pick(NR.idle)); }, 8000);

// ── Tick liveness monitor ──
setInterval(() => {
  if (!S.connected) return;
  const sig = document.getElementById('sig'); if (!sig) return;
  const elapsed = Date.now() - S.lastTick;
  if (S.lastTick === 0 || elapsed < 70000) sig.className = 'signal';
  else if (elapsed < 130000) sig.className = 'signal mid';
  else sig.className = 'signal weak';
}, 10000);

// ── Auto-connect on load ──
window.addEventListener('DOMContentLoaded', async () => {
  let p = getParams();
  const forceSSE = new URLSearchParams(location.search).get('sse') === '1';
  if (forceSSE) {
    (document.getElementById('setupOverlay') as HTMLElement).style.display = 'none';
    (document.getElementById('mainApp') as HTMLElement).style.display = '';
    requestAnimationFrame(async () => { await initCanvas(); startRenderLoop(); });
    trySSEFallback();
    return;
  }

  // Auto-fetch session from dashboard-server if missing
  if (!p.session) {
    const fetched = await autoFetchSession();
    if (fetched) p = getParams();
  }

  if (p.url && p.key && p.session) {
    connectWith(p.url, p.key, p.session);
  } else {
    (document.getElementById('setupOverlay') as HTMLElement).style.display = 'none';
    (document.getElementById('mainApp') as HTMLElement).style.display = '';
    requestAnimationFrame(async () => { await initCanvas(); startRenderLoop(); });
    trySSEFallback();

    // After SSE connects, try fetching Supabase config for realtime upgrade
    setTimeout(async () => {
      if (S.sseActive && !S.connected) {
        const fetched = await autoFetchSession();
        if (fetched) {
          const p2 = getParams();
          if (p2.session) connectWith(p2.url, p2.key, p2.session);
        }
      }
      if (!S.connected && !S.sseActive) {
        (document.getElementById('setupOverlay') as HTMLElement).style.display = 'flex';
        (document.getElementById('cfgUrl') as HTMLInputElement).value = p.url;
        (document.getElementById('cfgKey') as HTMLInputElement).value = p.key;
        (document.getElementById('cfgSession') as HTMLInputElement).value = p.session;
      }
    }, 5000);
  }
});
