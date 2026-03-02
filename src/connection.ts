// ── connection.ts ── Supabase Realtime + SSE fallback connection
import { S, DESKS, AT, NR, TOOL_COLORS, SSE_PORTS, WORKER_ROLES } from './state.ts';
import type { SessionInfo } from './state.ts';
import { desc, pick, t2a, toolGroup, trackActivity, addSpark, recordHeat } from './utils.ts';
import { toast, narr, updateBadge, renderCmdHist, sUI } from './ui.ts';
import { cW, cH, initCanvas, startRenderLoop, spawnP, spawnFloatingText, triggerShake, switchFloor, spawnElevatorPacket } from './renderer-views.ts';
import { trackToolCall, trackMcp, trackCodexCheck, type AuditEntry, type CodexReportPayload } from './game-systems.ts';
import { spawnAgentForSession, despawnAgentForSession, initFallbackAgents, clearFallbackAgents, sessionToAgentType, getDeskForAgent } from './agents.ts';

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
    narr('\uBA85\uB839 \uC2E4\uD589 \uC2DC\uC791: ' + ((payload.command as string) || ''), 'operator');
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
    toast('DAG \uC0DD\uC131: ' + payload.steps + '\uAC1C \uC2A4\uD15D', 'ok'); narr('\uD0DC\uC2A4\uD06C \uBD84\uD574 \uC644\uB8CC: ' + payload.steps + '\uAC1C \uC2A4\uD15D', 'commander'); for (let i = 0; i < Math.min(payload.steps as number, 12); i++) spawnP(cW() * Math.random(), cH() * Math.random(), 3, 'success'); updateOrchUI();
  });
  S.channel.on('broadcast', { event: 'orch-step-start' }, ({ payload }: { payload: Record<string, unknown> }) => { if (payload.worker && payload.step) { S.workers[payload.step as string] = { role: payload.worker as string, status: 'running', stepName: payload.name as string }; const wr = WORKER_ROLES[payload.worker as string]; if (wr) S.activeWorkerAgents![wr.agentType] = payload.worker as string; } toast('\uC2E4\uD589: ' + payload.name, 'in'); narr(payload.step + ': ' + payload.name + ' (' + payload.executor + ')', 'operator'); updateOrchUI(); });
  S.channel.on('broadcast', { event: 'orch-step-done' }, ({ payload }: { payload: Record<string, unknown> }) => { if (payload.step && S.workers[payload.step as string]) { S.workers[payload.step as string].status = payload.success ? 'completed' : 'failed'; } if (payload.success) { spawnP(cW() / 2, cH() * .4, 6, 'success'); } else { triggerShake(3); } updateOrchUI(); });
  S.channel.on('broadcast', { event: 'orch-progress' }, ({ payload }: { payload: Record<string, unknown> }) => { if (S.orchRun) S.orchRun.done = payload.done as number; if (payload.workerStats) S.workerStats = payload.workerStats as Record<string, number>; updateOrchUI(); });
  S.channel.on('broadcast', { event: 'orch-complete' }, ({ payload }: { payload: Record<string, unknown> }) => {
    S.orchRun = payload as typeof S.orchRun; const ok = payload.status === 'done';
    if (Array.isArray(payload.dag)) { (payload.dag as Array<{ id: string; worker?: string; name?: string; status?: string }>).forEach(st => { if (st.worker && st.id) S.workers[st.id] = { role: st.worker, status: st.status || 'completed', stepName: st.name }; }); }
    toast(ok ? '\uC624\uCF00\uC2A4\uD2B8\uB808\uC774\uC158 \uC644\uB8CC!' : '\uC624\uCF00\uC2A4\uD2B8\uB808\uC774\uC158 \uC2E4\uD328', ok ? 'ok' : 'er');
    const steps = (payload.steps as { completed: number; total: number } | undefined);
    narr('\uC624\uCF00\uC2A4\uD2B8\uB808\uC774\uC158 ' + payload.status + ': ' + (steps?.completed) + '/' + (steps?.total), 'commander');
    if (ok) { for (let i = 0; i < 15; i++) spawnP(cW() * Math.random(), cH() * Math.random(), 4, 'success'); } else triggerShake(6); S.activeWorkerAgents = null; updateOrchUI();
  });

  // Codex Report Events
  S.channel.on('broadcast', { event: 'orch-codex-report' }, ({ payload }: { payload: CodexReportPayload }) => {
    trackCodexCheck(payload);
    const report = payload.report || payload;
    const score = report.score ?? -1;
    const grade = report.grade ?? '';
    toast(`Codex: ${score}점 ${grade}`, score >= 70 ? 'ok' : score >= 50 ? 'in' : 'er');
    narr(`코덱스 점검 완료: ${score}점 (${grade})`, 'inspector');
    const inspectorAg = S.agents.find(a => a.t === 'inspector');
    if (inspectorAg) inspectorAg.go(`CODEX:${score}`);
    if (score >= 70) spawnP(cW() / 2, cH() * .4, 6, 'success');
    else triggerShake(3);
  });
  S.channel.on('broadcast', { event: 'codex-report' }, ({ payload }: { payload: CodexReportPayload }) => {
    trackCodexCheck(payload);
    const score = payload.score ?? -1;
    const grade = payload.grade ?? '';
    toast(`Codex: ${score}점 ${grade}`, score >= 70 ? 'ok' : score >= 50 ? 'in' : 'er');
    const inspectorAg = S.agents.find(a => a.t === 'inspector');
    if (inspectorAg) inspectorAg.go(`CODEX:${score}`);
  });

  // Codex Exec Events (v8)
  S.channel.on('broadcast', { event: 'codex-exec-started' }, ({ payload }: { payload: Record<string, unknown> }) => {
    S.codexExecStatus = { prompt: payload.prompt as string, status: 'running', startedAt: Date.now() };
    toast('Codex 실행 시작', 'in');
    narr('Codex CLI 실행: ' + ((payload.prompt as string) || '').slice(0, 40), 'inspector');
    spawnP(cW() / 2, cH() * .3, 5, 'success');
  });
  S.channel.on('broadcast', { event: 'codex-exec-result' }, ({ payload }: { payload: Record<string, unknown> }) => {
    const ok = payload.success !== false;
    S.codexExecStatus = { prompt: (payload.prompt as string) || '', status: ok ? 'done' : 'failed', result: payload.output as string, startedAt: S.codexExecStatus?.startedAt || Date.now() };
    toast(ok ? 'Codex 완료' : 'Codex 실패', ok ? 'ok' : 'er');
    if (ok) spawnP(cW() / 2, cH() * .3, 8, 'success'); else triggerShake(3);
  });
  S.channel.on('broadcast', { event: 'codex-session' }, ({ payload }: { payload: Record<string, unknown> }) => {
    if (!S.codexSessions) S.codexSessions = [];
    const existing = S.codexSessions.find(s => s.id === payload.sessionId);
    if (existing) { existing.status = payload.status as string; }
    else { S.codexSessions.push({ id: payload.sessionId as string, status: payload.status as string, ts: Date.now() }); }
    toast(`Codex 세션: ${payload.status}`, 'in');
  });

  // Steer Applied (v8)
  S.channel.on('broadcast', { event: 'steer-applied' }, ({ payload }: { payload: Record<string, unknown> }) => {
    if (!S.steerHistory) S.steerHistory = [];
    const steer = payload.steer as Record<string, unknown> || {};
    S.steerHistory.push({ mode: steer.mode as string, message: steer.message as string, ts: Date.now() });
    if (S.steerHistory.length > 50) S.steerHistory.shift();
    toast('Steer: ' + ((steer.message as string) || '').slice(0, 30), 'in');
    narr('방향 전환: ' + (steer.mode || 'steer') + ' - ' + ((steer.message as string) || '').slice(0, 40), 'commander');
    spawnFloatingText(cW() / 2, cH() * .2, 'STEER', '#FFD080');
  });

  // Agent Lifecycle Events (v8)
  S.channel.on('broadcast', { event: 'lifecycle:health-change' }, ({ payload }: { payload: Record<string, unknown> }) => {
    if (!S.lifecycleStatus) S.lifecycleStatus = {};
    const sid = payload.sessionId as string;
    S.lifecycleStatus[sid] = { health: payload.to as string, from: payload.from as string, ts: Date.now() };
    const isHealthy = payload.to === 'healthy';
    toast(`에이전트 ${isHealthy ? '정상' : payload.to}: ${(sid || '').slice(0, 8)}`, isHealthy ? 'ok' : 'er');
    if (!isHealthy) triggerShake(2);
    sUI();
  });
  S.channel.on('broadcast', { event: 'lifecycle:agent-crashed' }, ({ payload }: { payload: Record<string, unknown> }) => {
    toast('에이전트 크래시!', 'er');
    narr('에이전트 크래시 감지: ' + ((payload.sessionId as string) || '').slice(0, 8), 'guardian');
    triggerShake(5);
    spawnP(cW() / 2, cH() / 2, 10, 'error');
  });
  S.channel.on('broadcast', { event: 'lifecycle:agent-restarted' }, ({ payload }: { payload: Record<string, unknown> }) => {
    toast('에이전트 재시작됨', 'ok');
    narr('에이전트 자동 재시작: ' + ((payload.sessionId as string) || '').slice(0, 8), 'operator');
    spawnP(cW() / 2, cH() / 2, 6, 'success');
  });
  S.channel.on('broadcast', { event: 'lifecycle:restart-exhausted' }, ({ payload }: { payload: Record<string, unknown> }) => {
    toast('재시작 한도 초과!', 'er');
    narr('에이전트 재시작 한도 초과: ' + ((payload.sessionId as string) || '').slice(0, 8), 'guardian');
    triggerShake(8);
    spawnP(cW() / 2, cH() / 2, 12, 'error');
  });
  S.channel.on('broadcast', { event: 'lifecycle:agent-unresponsive' }, ({ payload }: { payload: Record<string, unknown> }) => {
    toast('에이전트 무응답', 'er');
    narr('에이전트 무응답: ' + ((payload.sessionId as string) || '').slice(0, 8) + ' (' + payload.elapsed + 'ms)', 'guardian');
  });

  // Workflow/Pipeline Events (v8 - lobster-lite)
  S.channel.on('broadcast', { event: 'workflow:start' }, ({ payload }: { payload: Record<string, unknown> }) => {
    S.workflowRun = { id: payload.runId as string, pipeline: payload.pipeline as string, status: 'running', steps: [], startedAt: Date.now() };
    toast('워크플로우 시작: ' + (payload.pipeline || ''), 'in');
    narr('워크플로우 파이프라인: ' + payload.pipeline, 'operator');
  });
  S.channel.on('broadcast', { event: 'workflow:step-start' }, ({ payload }: { payload: Record<string, unknown> }) => {
    if (S.workflowRun) {
      S.workflowRun.steps.push({ name: payload.name as string, status: 'running', startedAt: Date.now() });
    }
    toast('스텝 실행: ' + payload.name, 'in');
  });
  S.channel.on('broadcast', { event: 'workflow:step-done' }, ({ payload }: { payload: Record<string, unknown> }) => {
    if (S.workflowRun) {
      const step = S.workflowRun.steps.find(s => s.name === payload.name);
      if (step) { step.status = payload.success ? 'done' : 'failed'; }
    }
    const ok = payload.success !== false;
    if (ok) spawnP(cW() * Math.random(), cH() * .4, 4, 'success');
    else triggerShake(2);
  });
  S.channel.on('broadcast', { event: 'workflow:complete' }, ({ payload }: { payload: Record<string, unknown> }) => {
    if (S.workflowRun) { S.workflowRun.status = payload.status as string || 'done'; }
    toast('워크플로우 완료', 'ok');
    narr('워크플로우 완료: ' + (payload.pipeline || ''), 'commander');
    for (let i = 0; i < 8; i++) spawnP(cW() * Math.random(), cH() * Math.random(), 3, 'success');
  });
  S.channel.on('broadcast', { event: 'workflow:error' }, ({ payload }: { payload: Record<string, unknown> }) => {
    if (S.workflowRun) { S.workflowRun.status = 'failed'; }
    toast('워크플로우 에러', 'er');
    triggerShake(4);
  });
  S.channel.on('broadcast', { event: 'workflow-complete' }, ({ payload }: { payload: Record<string, unknown> }) => {
    toast('워크플로우 완료: ' + (payload.pipeline || ''), 'ok');
  });

  // ACP Bridge Events (v8)
  S.channel.on('broadcast', { event: 'acp:spawn' }, ({ payload }: { payload: Record<string, unknown> }) => {
    if (!S.acpSessions) S.acpSessions = [];
    S.acpSessions.push({ id: payload.sessionId as string, type: payload.agentType as string, status: 'active', ts: Date.now() });
    toast('ACP 에이전트 스폰: ' + payload.agentType, 'ok');
    narr('외부 에이전트 시작: ' + payload.agentType, 'operator');
    spawnP(cW() / 2, cH() * .3, 5, 'success');
  });
  S.channel.on('broadcast', { event: 'acp:close' }, ({ payload }: { payload: Record<string, unknown> }) => {
    if (S.acpSessions) {
      const idx = S.acpSessions.findIndex(s => s.id === payload.sessionId);
      if (idx !== -1) S.acpSessions[idx].status = 'closed';
    }
    toast('ACP 세션 종료', 'in');
  });
  S.channel.on('broadcast', { event: 'acp:event' }, ({ payload }: { payload: Record<string, unknown> }) => {
    toast('ACP: ' + ((payload.method as string) || '').slice(0, 20), 'in');
  });

  // Webhook Events (v8)
  S.channel.on('broadcast', { event: 'webhook-notify' }, ({ payload }: { payload: Record<string, unknown> }) => {
    toast('Webhook: ' + ((payload._source as string) || 'external'), 'in');
    narr('웹훅 수신: ' + JSON.stringify(payload).slice(0, 60), 'sys');
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

  // Presence (also feeds dynamic agent sync)
  S.channel.on('presence', { event: 'sync' }, () => {
    const state = S.channel!.presenceState();
    const al = Object.values(state).flat().filter(p => p.role === 'agent');
    setAgentOnline(al.length > 0);
    syncSessionAgents(state as Record<string, unknown[]>);
  });
  S.channel.on('presence', { event: 'join' }, ({ newPresences }: Record<string, unknown>) => {
    const np = newPresences as Array<{ role: string }>;
    if (np && np.find(p => p.role === 'agent')) {
      setAgentOnline(true);
      narr('\uC5D0\uC774\uC804\uD2B8 \uC628\uB77C\uC778! \uC2E4\uC2DC\uAC04 \uBAA8\uB2C8\uD130\uB9C1 \uC2DC\uC791.', 'commander');
      toast('\uC5D0\uC774\uC804\uD2B8 \uC811\uC18D', 'ok');
    }
    const state = S.channel!.presenceState();
    syncSessionAgents(state as Record<string, unknown[]>);
  });
  S.channel.on('presence', { event: 'leave' }, () => {
    const state = S.channel!.presenceState();
    const al = Object.values(state).flat().filter(p => p.role === 'agent');
    setAgentOnline(al.length > 0);
    if (!al.length) toast('\uC5D0\uC774\uC804\uD2B8 \uC624\uD504\uB77C\uC778', 'er');
    syncSessionAgents(state as Record<string, unknown[]>);
  });

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
  if (online) narr('\uC5D0\uC774\uC804\uD2B8 \uD65C\uC131 \uC911', 'commander');
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
  // Dynamic agent: update tool profile for the active session
  const activeSid = S.connParams?.sessionId || (e as Record<string, unknown>).session_id as string | undefined;
  updateToolProfile(activeSid, e.tool || '');
  // Project detection
  const detectedProject = detectProject(e);
  if (detectedProject && (!S.projectContext || S.projectContext.name !== detectedProject)) {
    S.projectContext = { name: detectedProject, language: guessLanguage(e.path || '') };
    applyProjectTheme(S.projectContext);
  }
  const grp = toolGroup(e.tool || '');
  if (!S.groupStats[grp]) S.groupStats[grp] = { total: 0, errors: 0 };
  S.groupStats[grp].total++;
  if (e.err || e.level === 'error') S.groupStats[grp].errors++;
  if (e.ts && S.lastToolStart > 0) { const lat = new Date(e.ts).getTime() - S.lastToolStart; if (lat > 0 && lat < 60000) addSpark('lat', lat); }
  S.lastToolStart = e.ts ? new Date(e.ts).getTime() : Date.now();
  const ai = t2a(e.tool || ''), ag = S.agents.find(a => a.i === ai);
  const detail = (e.cmd as string) || ((e.path as string)?.split(/[/\\]/).slice(-2).join('/')) || (e.summary as string) || '';
  const ds = detail || desc(e as Record<string, unknown>);
  if (ag && S.viewMode === 'floor' && ag.floor !== S.currentFloor) {
    spawnElevatorPacket(S.currentFloor, ag.floor, e.tool || '');
    const now = Date.now();
    if (now - S.lastFloorSwitch > 3000) {
      if (S.floorSwitchTimer) clearTimeout(S.floorSwitchTimer);
      const targetFloor = ag.floor;
      S.floorSwitchTimer = setTimeout(() => {
        S.floorSwitchTimer = null;
        switchFloor(targetFloor);
        S.lastFloorSwitch = Date.now();
      }, 500);
    }
  }
  const desk = getDeskForAgent(ag ? ag.i : 0);
  const deskX = desk.x * cW(), deskY = cH() * .55;
  if (ag && ag.st !== 'work') { ag.go(ds); spawnP(deskX, deskY, 4, 'success', e.tool); }
  else if (ag && ag.st === 'work') { ag.tk = ds; ag.wt = Math.max(ag.wt, 40); }
  if (e.decision === 'deny') {
    // ── Guardian activates on deny (smart-approve security event) ──
    narr(pick(NR.deny), 'guardian');
    const guardianAg = S.agents.find(a => a.t === 'guardian');
    const guardianDesk = getDeskForAgent(guardianAg ? guardianAg.i : 5);
    const gx = guardianDesk.x * cW(), gy = cH() * .55;
    if (guardianAg && guardianAg.st !== 'work') { guardianAg.go('DENY: ' + ((e.cmd as string) || e.tool || '').slice(0, 20)); }
    spawnP(gx, gy, 8, 'error'); triggerShake(4);
    toast('\uCC28\uB2E8: ' + ((e.cmd as string) || e.tool || '').slice(0, 30), 'er');
    // Also update pipeline status
    S.pipelineStatus.denies++;
  } else if (e.err) {
    // ── Inspector reacts to errors (audit-log observation) ──
    spawnP(deskX, cH() * .5, 5, 'error');
    const inspectorAg = S.agents.find(a => a.t === 'inspector');
    if (inspectorAg && inspectorAg.st !== 'work') { inspectorAg.go('ERR: ' + (e.err as string || '').slice(0, 20)); }
    const p = NR[e.tool || ''] || NR.idle; narr(pick(p), AT[ai]);
  } else {
    const p = NR[e.tool || ''] || NR.idle; narr(pick(p), AT[ai]);
    spawnP(deskX, cH() * .5, 3, 'success', e.tool);
    S.pipelineStatus.approves++;
    if (Math.random() < .3) S.pts.push({ x: deskX, y: cH() * .5, vx: (cW() / 2 - deskX) * .02, vy: -(cH() * .5 - 20) * .02, l: 50, c: TOOL_COLORS[e.tool || ''] ? TOOL_COLORS[e.tool!][0] : '#FFD080', z: 2, shape: 'circle', rot: 0, rv: 0, sprite: null });
  }
}

// ── Session Sync (dynamic agents) ──
export function syncSessionAgents(presenceState: Record<string, unknown[]>): void {
  const liveSessions = new Set<string>();

  // Collect all agent-role presences
  for (const [, presences] of Object.entries(presenceState)) {
    for (const p of presences as Array<Record<string, unknown>>) {
      if (p.role === 'agent' && p.session_id) {
        const sid = p.session_id as string;
        liveSessions.add(sid);

        if (!S.sessionRegistry.has(sid)) {
          // New session discovered
          const session: SessionInfo = {
            sessionId: sid,
            hostname: (p.hostname as string) || undefined,
            project: (p.project as string) || undefined,
            toolProfile: {},
            dominantType: 'commander',
            lastActivity: Date.now(),
            status: 'online',
          };
          S.sessionRegistry.set(sid, session);

          // Switch out of fallback mode on first real session
          if (S.fallbackMode) {
            S.fallbackMode = false;
            clearFallbackAgents();
            toast('동적 모드 전환', 'ok');
          }
          const ag = spawnAgentForSession(session);
          if (ag) {
            toast(`세션 접속: ${sid.slice(0, 8)}`, 'ok');
            narr(`새 에이전트 스폰! (${sid.slice(0, 8)})`, 'agent');
          }
        } else {
          // Update existing session
          const session = S.sessionRegistry.get(sid)!;
          session.status = 'online';
          session.lastActivity = Date.now();
        }
      }
    }
  }

  // Despawn sessions that left
  for (const [sid, session] of S.sessionRegistry) {
    if (!liveSessions.has(sid) && session.status !== 'offline') {
      session.status = 'offline';
      despawnAgentForSession(sid);
      toast(`세션 해제: ${sid.slice(0, 8)}`, 'er');
    }
  }

  // If no live sessions, revert to fallback
  if (liveSessions.size === 0 && !S.fallbackMode) {
    S.fallbackMode = true;
    initFallbackAgents();
    S.sessionRegistry.clear();
    toast('고정 모드 복원', 'in');
  }
}

/** Sync from a single SSE/dashboard-server session */
export function syncSingleSession(sessionId: string): void {
  if (!sessionId || S.sessionRegistry.has(sessionId)) return;
  const session: SessionInfo = {
    sessionId,
    toolProfile: {},
    dominantType: 'commander',
    lastActivity: Date.now(),
    status: 'online',
  };
  S.sessionRegistry.set(sessionId, session);
  if (S.fallbackMode) {
    S.fallbackMode = false;
    clearFallbackAgents();
  }
  spawnAgentForSession(session);
}

/** Detect project name from audit entry paths */
export function detectProject(entry: AuditEntry): string | null {
  const p = (entry.path as string) || '';
  if (!p) return null;
  const parts = p.replace(/\\/g, '/').split('/');
  const markers = ['src', 'lib', 'node_modules', 'dist', '.git', 'packages', 'apps'];
  for (let i = parts.length - 1; i >= 0; i--) {
    if (markers.includes(parts[i]) && i > 0) return parts[i - 1] || null;
  }
  return parts.filter(Boolean).slice(-2, -1)[0] || null;
}

/** Update tool profile for a session after audit event */
function updateToolProfile(sessionId: string | undefined, tool: string): void {
  if (!sessionId || !tool) return;
  const session = S.sessionRegistry.get(sessionId);
  if (!session) return;
  session.toolProfile[tool] = (session.toolProfile[tool] || 0) + 1;
  session.lastActivity = Date.now();
  // Recalc dominant type every 10 calls
  const totalCalls = Object.values(session.toolProfile).reduce((a, b) => a + b, 0);
  if (totalCalls % 10 === 0) {
    session.dominantType = sessionToAgentType(session);
  }
}

// ── Language/Project Theme helpers ──
function guessLanguage(path: string): string | undefined {
  if (!path) return undefined;
  if (/\.tsx?$/.test(path)) return 'typescript';
  if (/\.jsx?$/.test(path)) return 'javascript';
  if (/\.py$/.test(path)) return 'python';
  if (/\.rs$/.test(path)) return 'rust';
  if (/\.go$/.test(path)) return 'go';
  if (/\.java$/.test(path)) return 'java';
  return undefined;
}

const LANG_THEMES: Record<string, { accent: string; bg: string }> = {
  typescript: { accent: '#3178C6', bg: '#1B2838' },
  javascript: { accent: '#F7DF1E', bg: '#2A2A2A' },
  python:     { accent: '#FFD43B', bg: '#2B2B2B' },
  rust:       { accent: '#DEA584', bg: '#1E1E1E' },
  go:         { accent: '#00ADD8', bg: '#1E2A33' },
  java:       { accent: '#F89820', bg: '#2A2A2A' },
};

function applyProjectTheme(ctx: { name: string; language?: string; color?: string }): void {
  const theme = ctx.language ? LANG_THEMES[ctx.language] : null;
  if (theme) {
    ctx.color = theme.accent;
    document.documentElement.style.setProperty('--project-accent', theme.accent);
    document.documentElement.style.setProperty('--project-bg', theme.bg);
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
