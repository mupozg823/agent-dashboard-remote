// ── connection.ts ── Supabase Realtime + SSE fallback connection
import { S, DESKS, AT, NR, TOOL_COLORS, SSE_PORTS, WORKER_ROLES } from './state.ts';
import { desc, pick, t2a, toolGroup, trackActivity, addSpark, recordHeat } from './utils.ts';
import { toast, narr, updateBadge, renderCmdHist, sUI } from './ui.ts';
import { cW, cH, initCanvas, startRenderLoop, spawnP, spawnFloatingText, triggerShake, switchFloor, spawnElevatorPacket } from './renderer-views.ts';
import { trackToolCall, trackMcp, type AuditEntry } from './game-systems.ts';

// ── URL params ──
export function getParams(): { url: string; key: string; session: string } {
  const p = new URLSearchParams(location.search);
  const DEF_URL = 'https://cdiptfmagemjfmsuphaj.supabase.co';
  const DEF_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkaXB0Zm1hZ2VtamZtc3VwaGFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1NjQyMTIsImV4cCI6MjA4NDE0MDIxMn0.mOulQy84XNc7dBQWbC4GlAKkx-9cWOcSgzYWi_tLuHU';
  return {
    url: p.get('url') || localStorage.getItem('sb_url') || localStorage.getItem('ops_sb_url') || DEF_URL,
    key: p.get('key') || localStorage.getItem('sb_key') || localStorage.getItem('ops_sb_key') || DEF_KEY,
    session: p.get('session') || localStorage.getItem('sb_session') || localStorage.getItem('ops_sb_session') || '',
  };
}

// ── Auto-fetch session from dashboard-server API ──
export async function autoFetchSession(): Promise<boolean> {
  const ports = [17891, ...SSE_PORTS];
  const token = new URLSearchParams(location.search).get('token') || '';
  for (const port of ports) {
    try {
      const url = `http://localhost:${port}/api/supabase-config${token ? '?token=' + token : ''}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (!res.ok) continue;
      const cfg = await res.json();
      if (cfg.url && cfg.anonKey && cfg.sessionId) {
        localStorage.setItem('sb_url', cfg.url);
        localStorage.setItem('sb_key', cfg.anonKey);
        localStorage.setItem('sb_session', cfg.sessionId);
        return true;
      }
    } catch {}
  }
  return false;
}

// ── Connect button handler ──
export function doConnect(): void {
  const url = (document.getElementById('cfgUrl') as HTMLInputElement).value.trim();
  const key = (document.getElementById('cfgKey') as HTMLInputElement).value.trim();
  const session = (document.getElementById('cfgSession') as HTMLInputElement).value.trim();
  if (!url || !key || !session) return alert('\uBAA8\uB4E0 \uD56D\uBAA9\uC744 \uC785\uB825\uD574\uC8FC\uC138\uC694');
  localStorage.setItem('sb_url', url); localStorage.setItem('sb_key', key); localStorage.setItem('sb_session', session);
  localStorage.setItem('ops_sb_url', url); localStorage.setItem('ops_sb_key', key); localStorage.setItem('ops_sb_session', session);
  connectWith(url, key, session);
}

// ── Main Supabase connection ──
export function connectWith(url: string, key: string, sessionId: string): void {
  S.connParams = { url, key, sessionId };
  (document.getElementById('setupOverlay') as HTMLElement).style.display = 'none';
  (document.getElementById('mainApp') as HTMLElement).style.display = '';
  requestAnimationFrame(async () => { await initCanvas(); startRenderLoop(); });

  const sbLib = window.supabase;
  if (!sbLib || !sbLib.createClient) { const cs = document.getElementById('cs'); if (cs) cs.innerHTML = 'SDK \uC624\uB958'; narr('Supabase SDK \uB85C\uB4DC \uC2E4\uD328!'); return; }

  S.sbClient = sbLib.createClient(url, key, { realtime: { params: { eventsPerSecond: 10 } } });
  const channelName = 'claude:' + sessionId;
  S.channel = S.sbClient.channel(channelName, { config: { broadcast: { ack: true, self: false } } });

  // Audit Events
  S.channel.on('broadcast', { event: 'audit' }, ({ payload }: { payload: Record<string, unknown> }) => { ingestAuditEntry(payload as AuditEntry); });

  // Status
  S.channel.on('broadcast', { event: 'status' }, ({ payload }: { payload: Record<string, unknown> }) => {
    if (payload.system) { if (!S.serverMetrics) S.serverMetrics = {}; Object.assign(S.serverMetrics, payload.system); } sUI();
  });

  // Metrics
  S.channel.on('broadcast', { event: 'metrics' }, ({ payload }: { payload: Record<string, unknown> }) => { S.serverMetrics = payload as typeof S.serverMetrics; sUI(); });

  // Tick Liveness
  S.channel.on('broadcast', { event: 'tick' }, ({ payload }: { payload: Record<string, unknown> }) => {
    S.lastTick = Date.now(); S.relayUptime = (payload.uptime as number) || 0;
    const sig = document.getElementById('sig'); if (sig) sig.className = 'signal';
  });

  // Lane Stats
  S.channel.on('broadcast', { event: 'lane-stats' }, ({ payload }: { payload: Record<string, unknown> }) => {
    if (payload && !payload.error) {
      S.lastLaneStats = payload as unknown as typeof S.lastLaneStats; S.lastLaneStatsTime = Date.now();
      const el = document.getElementById('laneInfo');
      if (el && S.lastLaneStats) {
        const locked = S.lastLaneStats.locked ? '\uD83D\uDD12' : '';
        const failed = S.lastLaneStats.failed ? ` \uC2E4\uD328:${S.lastLaneStats.failed}` : '';
        const laneAge = Math.floor((Date.now() - S.lastLaneStatsTime) / 1000);
        el.innerHTML = `${locked}\uD050:<b>${S.lastLaneStats.pending || 0}</b> \uC2E4\uD589:<b>${S.lastLaneStats.running || 0}</b> \uC644\uB8CC:<b>${S.lastLaneStats.completed || 0}</b>${failed}`;
        el.style.borderLeft = S.lastLaneStats.running > 0 ? '3px solid var(--accent)' : '3px solid transparent';
      }
    }
  });

  // Lane Executing
  S.channel.on('broadcast', { event: 'lane-executing' }, ({ payload }: { payload: Record<string, unknown> }) => {
    const cmd = S.cmdHistory.find(c => c.id === payload.id);
    if (cmd) { cmd.status = 'executing'; renderCmdHist(); }
    toast('\uC2E4\uD589 \uC911: ' + ((payload.command as string) || '').slice(0, 30), 'in');
    narr('\uBA85\uB839 \uC2E4\uD589 \uC2DC\uC791: ' + ((payload.command as string) || ''), 'bash');
    spawnP(cW() / 2, cH() / 2, 6, 'success');
  });

  // Command Ack/Result
  S.channel.on('broadcast', { event: 'command-ack' }, ({ payload }: { payload: Record<string, unknown> }) => {
    updateCmdStatus(payload.id as string, payload.status as string, payload.reason as string | undefined);
    toast(payload.status === 'queued' ? '\uBA85\uB839 \uD050 \uCD94\uAC00\uB428' : '\uBA85\uB839 \uAC70\uBD80: ' + ((payload.reason as string) || ''), payload.status === 'queued' ? 'ok' : 'er');
  });
  S.channel.on('broadcast', { event: 'command-result' }, ({ payload }: { payload: Record<string, unknown> }) => {
    updateCmdResult(payload.id as string, payload.result, payload.exitCode as number);
    toast(payload.exitCode === 0 ? '\uBA85\uB839 \uC644\uB8CC' : '\uBA85\uB839 \uC2E4\uD328 (code ' + payload.exitCode + ')', payload.exitCode === 0 ? 'ok' : 'er');
    if (payload.exitCode === 0) { spawnP(cW() / 2, cH() * .3, 8, 'success'); }
    else { triggerShake(4); }
  });

  // Orchestration Events
  S.channel.on('broadcast', { event: 'orch-state' }, ({ payload }: { payload: Record<string, unknown> }) => { S.orchRun = S.orchRun || {}; S.orchRun.state = payload.to as string; S.orchRun.runId = payload.runId as string; toast('\uC624\uCF00\uC2A4\uD2B8\uB808\uC774\uC158: ' + payload.to, 'in'); narr('\uC624\uCF00\uC2A4\uD2B8\uB808\uC774\uC158 \uC0C1\uD0DC: ' + payload.from + ' \u2192 ' + payload.to, 'sys'); updateOrchUI(); });
  S.channel.on('broadcast', { event: 'orch-dag' }, ({ payload }: { payload: Record<string, unknown> }) => {
    S.orchRun = S.orchRun || {}; S.orchRun.dag = payload.dag as typeof S.orchRun.dag; S.orchRun.total = payload.steps as number; S.orchRun.done = 0; S.workers = {}; S.activeWorkerAgents = {};
    if (Array.isArray(payload.dag)) { (payload.dag as Array<{ id: string; worker?: string; name?: string }>).forEach(st => { if (st.worker) { S.workers[st.id] = { role: st.worker, status: 'pending', stepName: st.name }; const wr = WORKER_ROLES[st.worker]; if (wr) S.activeWorkerAgents![wr.agentType] = st.worker; } }); }
    toast('DAG \uC0DD\uC131: ' + payload.steps + '\uAC1C \uC2A4\uD15D', 'ok'); narr('\uD0DC\uC2A4\uD06C \uBD84\uD574 \uC644\uB8CC: ' + payload.steps + '\uAC1C \uC2A4\uD15D', 'agent'); for (let i = 0; i < Math.min(payload.steps as number, 12); i++) spawnP(cW() * Math.random(), cH() * Math.random(), 3, 'success'); updateOrchUI();
  });
  S.channel.on('broadcast', { event: 'orch-step-start' }, ({ payload }: { payload: Record<string, unknown> }) => { if (payload.worker && payload.step) { S.workers[payload.step as string] = { role: payload.worker as string, status: 'running', stepName: payload.name as string }; const wr = WORKER_ROLES[payload.worker as string]; if (wr) S.activeWorkerAgents![wr.agentType] = payload.worker as string; } toast('\uC2E4\uD589: ' + payload.name, 'in'); narr(payload.step + ': ' + payload.name + ' (' + payload.executor + ')', 'bash'); updateOrchUI(); });
  S.channel.on('broadcast', { event: 'orch-step-done' }, ({ payload }: { payload: Record<string, unknown> }) => { if (payload.step && S.workers[payload.step as string]) { S.workers[payload.step as string].status = payload.success ? 'completed' : 'failed'; } if (payload.success) { spawnP(cW() / 2, cH() * .4, 6, 'success'); } else { triggerShake(3); } updateOrchUI(); });
  S.channel.on('broadcast', { event: 'orch-progress' }, ({ payload }: { payload: Record<string, unknown> }) => { if (S.orchRun) S.orchRun.done = payload.done as number; if (payload.workerStats) S.workerStats = payload.workerStats as Record<string, number>; updateOrchUI(); });
  S.channel.on('broadcast', { event: 'orch-complete' }, ({ payload }: { payload: Record<string, unknown> }) => {
    S.orchRun = payload as typeof S.orchRun; const ok = payload.status === 'done';
    if (Array.isArray(payload.dag)) { (payload.dag as Array<{ id: string; worker?: string; name?: string; status?: string }>).forEach(st => { if (st.worker && st.id) S.workers[st.id] = { role: st.worker, status: st.status || 'completed', stepName: st.name }; }); }
    toast(ok ? '\uC624\uCF00\uC2A4\uD2B8\uB808\uC774\uC158 \uC644\uB8CC!' : '\uC624\uCF00\uC2A4\uD2B8\uB808\uC774\uC158 \uC2E4\uD328', ok ? 'ok' : 'er');
    const steps = (payload.steps as { completed: number; total: number } | undefined);
    narr('\uC624\uCF00\uC2A4\uD2B8\uB808\uC774\uC158 ' + payload.status + ': ' + (steps?.completed) + '/' + (steps?.total), 'agent');
    if (ok) { for (let i = 0; i < 15; i++) spawnP(cW() * Math.random(), cH() * Math.random(), 4, 'success'); } else triggerShake(6); S.activeWorkerAgents = null; updateOrchUI();
  });

  function updateOrchUI(): void {
    const el = document.getElementById('orchInfo'); if (!el) return;
    if (!S.orchRun) { el.style.display = 'none'; return; }
    el.style.display = 'block'; const s = S.orchRun;
    let h = '<b>\uC624\uCF00\uC2A4\uD2B8\uB808\uC774\uC158</b> ';
    if (s.state) h += '<span style="color:var(--' + (s.state === 'done' ? 'ok' : s.state === 'failed' ? 'err' : 'info') + ')">' + s.state + '</span> ';
    if (s.total) h += (s.done || 0) + '/' + s.total + ' ';
    if (s.dag && s.dag.length > 0) { h += '<br>'; for (const st of s.dag.slice(0, 6)) { const icon = st.status === 'completed' ? '<span style="color:var(--ok)">\u25A0</span>' : st.status === 'running' ? '<span class="executing">\u25B6</span>' : st.status === 'failed' ? '<span style="color:var(--err)">\u2715</span>' : '<span style="color:var(--gold-d)">\u25CB</span>'; h += icon + ' ' + ((st.name || st.id).slice(0, 18)) + ' '; } }
    el.innerHTML = h;
  }

  // Presence
  S.channel.on('presence', { event: 'sync' }, () => { const state = S.channel!.presenceState(); const al = Object.values(state).flat().filter(p => p.role === 'agent'); setAgentOnline(al.length > 0); });
  S.channel.on('presence', { event: 'join' }, ({ newPresences }: Record<string, unknown>) => { const np = newPresences as Array<{ role: string }>; if (np && np.find(p => p.role === 'agent')) { setAgentOnline(true); narr('\uC5D0\uC774\uC804\uD2B8 \uC628\uB77C\uC778! \uC2E4\uC2DC\uAC04 \uBAA8\uB2C8\uD130\uB9C1 \uC2DC\uC791.', 'agent'); toast('\uC5D0\uC774\uC804\uD2B8 \uC811\uC18D', 'ok'); } });
  S.channel.on('presence', { event: 'leave' }, () => { const state = S.channel!.presenceState(); const al = Object.values(state).flat().filter(p => p.role === 'agent'); setAgentOnline(al.length > 0); if (!al.length) toast('\uC5D0\uC774\uC804\uD2B8 \uC624\uD504\uB77C\uC778', 'er'); });

  // Subscribe
  S.channel.subscribe(async (status: string) => {
    const cs = document.getElementById('cs'), lv = document.getElementById('lv'), sig = document.getElementById('sig');
    if (status === 'SUBSCRIBED') {
      S.connected = true; S.reconnectAttempts = 0;
      if (cs) { cs.className = 'conn on'; cs.innerHTML = '\uC2E4\uC2DC\uAC04' + (sig ? sig.outerHTML : ''); }
      if (lv) lv.className = 'live on'; if (sig) sig.className = 'signal';
      narr('Supabase \uC5F0\uACB0! \uC2E4\uC2DC\uAC04 \uBAA8\uB2C8\uD130\uB9C1 \uC2DC\uC791.');
      closeSSEIfActive();
      await S.channel!.track({ role: 'mobile', online_at: new Date().toISOString() });
    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      S.connected = false;
      if (cs) { cs.className = 'conn off'; cs.innerHTML = (status === 'TIMED_OUT' ? '\uC2DC\uAC04\uCD08\uACFC' : '\uC624\uB958') + ' (\uC7AC\uC5F0\uACB0...)' + (sig ? sig.outerHTML : ''); }
      if (lv) lv.className = 'live off'; if (sig) sig.className = 'signal weak';
      scheduleReconnect();
    }
  });
}

function scheduleReconnect(): void {
  if (S.reconnectTimer) return;
  S.reconnectAttempts++;
  if (S.reconnectAttempts >= 3 && !S.sseActive) { trySSEFallback(); return; }
  const delay = Math.min(1000 * Math.pow(2, S.reconnectAttempts), 30000);
  S.reconnectTimer = setTimeout(() => {
    S.reconnectTimer = null;
    if (!S.connected && S.connParams) { S.channel?.unsubscribe(); if (S.sbClient && S.channel) S.sbClient.removeChannel(S.channel); connectWith(S.connParams.url, S.connParams.key, S.connParams.sessionId); }
  }, delay);
}

// ── SSE Fallback ──
function getSSEToken(): string { return new URLSearchParams(location.search).get('token') || ''; }
function sseUrl(port: number, path: string): string { const tk2 = S.sseToken || getSSEToken(); return 'http://localhost:' + port + path + (tk2 ? '?token=' + tk2 : ''); }

export function trySSEFallback(): void {
  if (S.sseActive) return;
  S.sseToken = getSSEToken();
  const cs = document.getElementById('cs'), lv = document.getElementById('lv'), sig = document.getElementById('sig');
  if (cs) { cs.className = 'conn off'; cs.innerHTML = 'SSE \uD0D0\uC0C9...'; }
  let portIdx = 0;
  function tryPort() {
    if (portIdx >= SSE_PORTS.length) {
      if (cs) cs.innerHTML = '\uC624\uD504\uB77C\uC778'; narr('SSE \uC11C\uBC84\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.');
      setTimeout(() => { if (!S.connected && S.connParams) { S.reconnectAttempts = 0; scheduleReconnect(); } }, 30000); return;
    }
    const port = SSE_PORTS[portIdx++];
    try {
      const es = new EventSource(sseUrl(port, '/api/events'));
      es.onopen = () => {
        S.sseActive = true; S.sseSource = es; S.ssePort = port; S.connected = true;
        if (cs) { cs.className = 'conn sse'; cs.innerHTML = 'SSE \uC5F0\uACB0 :' + port; }
        if (lv) lv.className = 'live on'; if (sig) sig.className = 'signal mid';
        narr('SSE \uB85C\uCEEC \uC11C\uBC84 \uC5F0\uACB0! (port ' + port + ')'); toast('SSE fallback \uC5F0\uACB0', 'ok');
        fetchSSEMetrics(port); if (S.sseMetricsTimer) clearInterval(S.sseMetricsTimer);
        S.sseMetricsTimer = setInterval(() => fetchSSEMetrics(port), 5000);
      };
      es.onmessage = (ev: MessageEvent) => { try { ingestAuditEntry(JSON.parse(ev.data) as AuditEntry); } catch { } };
      es.onerror = () => {
        es.close(); S.sseActive = false; S.sseSource = null;
        if (S.sseMetricsTimer) { clearInterval(S.sseMetricsTimer); S.sseMetricsTimer = null; }
        if (portIdx < SSE_PORTS.length) tryPort();
        else {
          S.connected = false;
          if (cs) { cs.className = 'conn off'; cs.innerHTML = '\uC7AC\uC5F0\uACB0...'; }
          if (lv) lv.className = 'live off';
          setTimeout(() => { if (!S.connected) { if (S.connParams) connectWith(S.connParams.url, S.connParams.key, S.connParams.sessionId); else trySSEFallback(); } }, 10000);
        }
      };
    } catch (e) { tryPort(); }
  }
  tryPort();
}

function fetchSSEMetrics(port: number): void {
  fetch(sseUrl(port, '/api/metrics')).then(r => r.json()).then((m: typeof S.serverMetrics) => { S.serverMetrics = m; sUI(); }).catch(() => { });
  if (!S.sseActive) return;
  if (S.entries.length === 0) {
    fetch(sseUrl(port, '/api/timeline')).then(r => r.json()).then((data: AuditEntry[]) => {
      if (Array.isArray(data) && data.length > 0) { data.forEach(e => { S.entries.push(e as Record<string, unknown>); onE(e); }); sUI(); toast('\uB85C\uADF8 ' + data.length + '\uAC74 \uB85C\uB4DC', 'ok'); }
    }).catch(() => { });
  }
}

function closeSSEIfActive(): void {
  if (S.sseSource) { S.sseSource.close(); S.sseSource = null; S.sseActive = false; }
  if (S.sseMetricsTimer) { clearInterval(S.sseMetricsTimer); S.sseMetricsTimer = null; }
}

export function setAgentOnline(online: boolean): void {
  S.agentOnline = online;
  if (online) narr('\uC5D0\uC774\uC804\uD2B8 \uD65C\uC131 \uC911', 'agent');
  else narr('\uC5D0\uC774\uC804\uD2B8 \uB300\uAE30 \uC911...');
}

// ── Unified audit entry ingestion (Supabase + SSE) ──
function ingestAuditEntry(entry: AuditEntry): void {
  S.entries.push(entry as Record<string, unknown>); S.lastET = Date.now(); onE(entry); sUI();
  if (!S.panelOpen || S.currentPanel !== 'log') { S.newLogCount++; updateBadge('logBadge', S.newLogCount); }
  addSpark('ops', 1);
  if (entry.err || entry.decision === 'deny') addSpark('errs', 1); else addSpark('errs', 0);
}

// ── Event Handler ──
export function onE(e: AuditEntry): void {
  // Cap entries to prevent unbounded growth
  if (S.entries.length > 2000) {
    const keep = S.entries.slice(-1500);
    const trimmedErrors = S.entries.slice(0, S.entries.length - 1500).reduce((n, e2) => {
      const entry = e2 as AuditEntry;
      return n + (entry.err || entry.decision === 'deny' ? 1 : 0);
    }, 0);
    S.entries = keep;
    S._localErrors = Math.max(0, (S._localErrors || 0) - trimmedErrors);
  }
  if (e.err || e.decision === 'deny') S._localErrors = (S._localErrors || 0) + 1;
  trackActivity(); trackToolCall(e); trackMcp(e); recordHeat(e.ts);
  const grp = toolGroup(e.tool || '');
  if (!S.groupStats[grp]) S.groupStats[grp] = { total: 0, errors: 0 };
  S.groupStats[grp].total++;
  if (e.err || e.level === 'error') S.groupStats[grp].errors++;
  if (e.ts && S.lastToolStart > 0) { const lat = new Date(e.ts).getTime() - S.lastToolStart; if (lat > 0 && lat < 60000) addSpark('lat', lat); }
  S.lastToolStart = e.ts ? new Date(e.ts).getTime() : Date.now();
  const ai = t2a(e.tool || ''), ag = S.agents.find(a => a.i === ai);
  const detail = (e.cmd as string) || ((e.path as string)?.split(/[/\\]/).slice(-2).join('/')) || (e.summary as string) || '';
  const ds = detail || desc(e as Record<string, unknown>);
  if (ag && S.viewMode === 'floor' && ag.floor !== S.currentFloor) { spawnElevatorPacket(S.currentFloor, ag.floor, e.tool || ''); switchFloor(ag.floor); }
  const deskX = DESKS[ag ? ag.i : 0].x * cW(), deskY = cH() * .55;
  if (ag && ag.st !== 'work') { ag.go(ds); spawnP(deskX, deskY, 4, 'success', e.tool); }
  else if (ag && ag.st === 'work') { ag.tk = ds; ag.wt = Math.max(ag.wt, 40); }
  if (e.decision === 'deny') { narr(pick(NR.deny), 'agent'); spawnP(cW() / 2, cH() * .3, 8, 'error'); triggerShake(4); toast('\uCC28\uB2E8: ' + ((e.cmd as string) || e.tool || '').slice(0, 30), 'er'); }
  else if (e.err) { spawnP(deskX, cH() * .5, 5, 'error'); const p = NR[e.tool || ''] || NR.idle; narr(pick(p), AT[ai]); }
  else {
    const p = NR[e.tool || ''] || NR.idle; narr(pick(p), AT[ai]);
    spawnP(deskX, cH() * .5, 3, 'success', e.tool);
    if (Math.random() < .3) S.pts.push({ x: deskX, y: cH() * .5, vx: (cW() / 2 - deskX) * .02, vy: -(cH() * .5 - 20) * .02, l: 50, c: TOOL_COLORS[e.tool || ''] ? TOOL_COLORS[e.tool!][0] : '#FFD080', z: 2, shape: 'circle', rot: 0, rv: 0, sprite: null });
  }
}

// ── Command Sending ──
export function sendCmd(): void {
  const input = document.getElementById('cmdInput') as HTMLInputElement; const cmd = input.value.trim();
  if (!cmd || !S.channel) return;
  const id = 'cmd-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  S.channel.send({ type: 'broadcast', event: 'command', payload: { id, command: cmd, priority: 'normal' } });
  S.cmdHistory.unshift({ id, command: cmd, status: 'pending', ts: new Date() }); renderCmdHist(); input.value = '';
}

export function quickCmd(cmd: string): void {
  const input = document.getElementById('cmdInput') as HTMLInputElement;
  input.value = cmd; sendCmd();
}

export function requestStatus(): void {
  if (!S.channel) return;
  S.channel.send({ type: 'broadcast', event: 'status-request', payload: {} }); narr('\uC0C1\uD0DC \uC694\uCCAD \uC804\uC1A1...');
}

function updateCmdStatus(id: string, status: string, reason?: string): void {
  const cmd = S.cmdHistory.find(c => c.id === id);
  if (cmd) { cmd.status = status; if (reason) cmd.reason = reason; renderCmdHist(); }
}

function updateCmdResult(id: string, result: unknown, exitCode: number): void {
  const cmd = S.cmdHistory.find(c => c.id === id);
  if (cmd) { cmd.result = result; cmd.exitCode = exitCode; cmd.status = exitCode === 0 ? 'completed' : 'failed'; renderCmdHist(); }
}
