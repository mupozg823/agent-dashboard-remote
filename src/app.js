// ── App: Connection, Events, Panels, Commands ──
import { createClient } from '@supabase/supabase-js';
import { P, C, AT, DESKS, FLOORS, AGENT_FLOOR, TOOL_COLORS, NR, ACHIEVEMENTS, tk } from './config.js';
import { S, cW, cH, initCanvas, esc, pick, toast, narr, spawnP, addSpark, drawSparkSvg, trackActivity, getActivityIntensity, triggerShake, addCombo, updateBadge } from './state.js';
import { Ag, switchFloor, toggleBuildingView, spawnElevatorPacket, render, initGame } from './game.js';

// ── Tool → Agent Index ──
function t2a(t) {
  if (!t) return 5;
  if (t === 'Bash') return 0;
  if (t === 'Read') return 1;
  if ('Write Edit NotebookEdit'.includes(t)) return 2;
  if (t === 'Grep' || t === 'Glob') return 3;
  if (t.startsWith('mcp__serena')) return 7;
  if (t.startsWith('mcp__')) return 4;
  if (t === 'WebSearch' || t === 'WebFetch') return 6;
  return 5;
}

function desc(e) {
  const t = e.tool || '', s = e.summary || e.cmd || '';
  if (t === 'Bash') { const c = e.cmd || s; if (c.includes('git')) return 'Git'; if (c.includes('npm') || c.includes('node')) return 'Node'; if (c.includes('curl')) return '네트워크'; return '명령실행'; }
  if (t === 'Read' || t === 'Write' || t === 'Edit') { const f = (e.path || s).split(/[/\\]/).pop(); return f ? f.slice(0, 14) : tk(t); }
  if (t === 'Grep') return '패턴검색'; if (t === 'Glob') return '파일탐색';
  if (t === 'WebSearch') return '웹검색'; if (t === 'WebFetch') return '페이지수집';
  if (t === 'Task') return '에이전트파견'; if (t.startsWith('mcp__serena')) return 'Serena';
  if (t.startsWith('mcp__')) return 'MCP'; return tk(t);
}

// ── Event Handler (floor-aware) ──
let lastAutoSwitch = 0;

function onE(e) {
  trackActivity();
  const ai = t2a(e.tool), ag = S.agents.find(a => a.i === ai), ds = desc(e);
  const agFloor = ag ? ag.floor : 0;
  const deskX = DESKS[ag ? ag.i : 0].x * cW(), deskY = cH() * .55;

  // Auto floor switch: if event is on different floor and no recent switch
  if (ag && agFloor !== S.currentFloor && S.viewMode === 'floor') {
    const now = Date.now();
    if (now - lastAutoSwitch > 3000) {
      lastAutoSwitch = now;
      // Spawn elevator packet before switching
      spawnElevatorPacket(S.currentFloor, agFloor, e.tool);
      switchFloor(agFloor);
    }
  }

  // Track floor activity
  if (ag) S.floorActivity[agFloor] = (S.floorActivity[agFloor] || 0) + 1;

  if (ag && ag.st !== 'work') { ag.go(ds); spawnP(deskX, deskY, 4, 'success', e.tool); }
  else if (ag && ag.st === 'work') { ag.tk = ds; ag.wt = Math.max(ag.wt, 40); }

  if (e.decision === 'deny') {
    narr(pick(NR.deny), 'agent');
    spawnP(cW() / 2, cH() * .3, 8, 'error');
    triggerShake(4); addCombo(false);
    toast('차단: ' + (e.cmd || e.tool || '').slice(0, 30), 'er');
    // Emotion: frustrated on deny
    if (ag && ag.setEmotion) ag.setEmotion('frustrated', 120);
  } else if (e.err) {
    spawnP(deskX, cH() * .5, 5, 'error');
    const p = NR[e.tool] || NR.idle; narr(pick(p), AT[ai]); addCombo(false);
    // Emotion: frustrated on error
    if (ag && ag.setEmotion) ag.setEmotion('frustrated', 80);
  } else {
    const p = NR[e.tool] || NR.idle; narr(pick(p), AT[ai]); addCombo(true);
    const pCount = 3 + (S.combo > 5 ? 3 : 0) + (S.combo > 10 ? 4 : 0);
    spawnP(deskX, cH() * .5, pCount, 'success', e.tool);
    if (Math.random() < .3) {
      S.pts.push({ x: deskX, y: cH() * .5, vx: (cW() / 2 - deskX) * .02, vy: -(cH() * .5 - 20) * .02,
        l: 50, c: TOOL_COLORS[e.tool] ? TOOL_COLORS[e.tool][0] : '#FFD080', z: 2, shape: 'circle', rot: 0, rv: 0 });
    }
    // Emotion: happy on success, excited on combo 5+
    if (ag && ag.setEmotion) {
      if (S.combo >= 10) ag.setEmotion('excited', 100);
      else if (S.combo >= 5) ag.setEmotion('happy', 80);
      else ag.setEmotion('focused', 60);
    }
  }
}

// ══════════════════════════════════════════
// ── SUPABASE CONNECTION ──
// ══════════════════════════════════════════

export function getParams() {
  const p = new URLSearchParams(location.search);
  const DEF_URL = 'https://cdiptfmagemjfmsuphaj.supabase.co';
  const DEF_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkaXB0Zm1hZ2VtamZtc3VwaGFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1NjQyMTIsImV4cCI6MjA4NDE0MDIxMn0.mOulQy84XNc7dBQWbC4GlAKkx-9cWOcSgzYWi_tLuHU';
  return {
    url: p.get('url') || localStorage.getItem('sb_url') || DEF_URL,
    key: p.get('key') || localStorage.getItem('sb_key') || DEF_KEY,
    session: p.get('session') || localStorage.getItem('sb_session') || '',
  };
}

export function doConnect() {
  const url = document.getElementById('cfgUrl').value.trim();
  const key = document.getElementById('cfgKey').value.trim();
  const session = document.getElementById('cfgSession').value.trim();
  if (!url || !key || !session) return alert('모든 항목을 입력해주세요');
  localStorage.setItem('sb_url', url);
  localStorage.setItem('sb_key', key);
  localStorage.setItem('sb_session', session);
  connectWith(url, key, session);
}

export function connectWith(url, key, sessionId) {
  S.connParams = { url, key, sessionId };
  document.getElementById('setupOverlay').style.display = 'none';
  document.getElementById('mainApp').style.display = '';
  requestAnimationFrame(() => {
    initCanvas();
    initGame();
    requestAnimationFrame(render);
  });

  S.sbClient = createClient(url, key, { realtime: { params: { eventsPerSecond: 10 } } });
  const channelName = 'claude:' + sessionId;
  S.channel = S.sbClient.channel(channelName, { config: { broadcast: { ack: true, self: false } } });

  // ── Audit Events ──
  S.channel.on('broadcast', { event: 'audit' }, ({ payload }) => {
    S.entries.push(payload); S.lastET = Date.now(); onE(payload); sUI();
    if (!S.panelOpen || S.currentPanel !== 'log') { S.newLogCount++; updateBadge('logBadge', S.newLogCount); }
    addSpark('ops', 1);
    if (payload.err || payload.decision === 'deny') addSpark('errs', 1); else addSpark('errs', 0);
  });

  // ── Status ──
  S.channel.on('broadcast', { event: 'status' }, ({ payload }) => {
    if (payload.system) { if (!S.serverMetrics) S.serverMetrics = {}; Object.assign(S.serverMetrics, payload.system); }
    sUI();
  });

  // ── Metrics ──
  S.channel.on('broadcast', { event: 'metrics' }, ({ payload }) => {
    S.serverMetrics = payload; sUI();
  });

  // ── Tick Liveness ──
  S.channel.on('broadcast', { event: 'tick' }, ({ payload }) => {
    S.lastTick = Date.now(); S.relayUptime = payload.uptime || 0;
    const sig = document.getElementById('sig');
    if (sig) sig.className = 'signal';
  });

  // ── Lane Stats ──
  S.channel.on('broadcast', { event: 'lane-stats' }, ({ payload }) => {
    if (payload && !payload.error) {
      S.lastLaneStats = payload; S.lastLaneStatsTime = Date.now();
      const el = document.getElementById('laneInfo');
      if (el) {
        const locked = payload.locked ? '🔒' : '';
        const failed = payload.failed ? ` 실패:${payload.failed}` : '';
        el.innerHTML = `${locked}큐:<b>${payload.pending || 0}</b> 실행:<b>${payload.running || 0}</b> 완료:<b>${payload.completed || 0}</b>${failed}`;
        el.style.borderLeft = payload.running > 0 ? '3px solid var(--accent)' : '3px solid transparent';
      }
    }
  });

  // ── Lane Executing ──
  S.channel.on('broadcast', { event: 'lane-executing' }, ({ payload }) => {
    const cmd = S.cmdHistory.find(c => c.id === payload.id);
    if (cmd) { cmd.status = 'executing'; renderCmdHist(); }
    toast('실행 중: ' + ((payload.command || '').slice(0, 30)), 'in');
    narr('명령 실행 시작: ' + (payload.command || ''), 'bash');
    spawnP(cW() / 2, cH() / 2, 6, 'success');
  });

  // ── Command Ack/Result ──
  S.channel.on('broadcast', { event: 'command-ack' }, ({ payload }) => {
    updateCmdStatus(payload.id, payload.status, payload.reason);
    toast(payload.status === 'queued' ? '명령 큐 추가됨' : '명령 거부: ' + (payload.reason || ''), payload.status === 'queued' ? 'ok' : 'er');
  });
  S.channel.on('broadcast', { event: 'command-result' }, ({ payload }) => {
    updateCmdResult(payload.id, payload.result, payload.exitCode);
    toast(payload.exitCode === 0 ? '명령 완료' : '명령 실패 (code ' + payload.exitCode + ')', payload.exitCode === 0 ? 'ok' : 'er');
    if (payload.exitCode === 0) { addCombo(true); spawnP(cW() / 2, cH() * .3, 8, 'success'); }
    else { addCombo(false); triggerShake(4); }
  });

  // ── Orchestration Events ──
  S.channel.on('broadcast', { event: 'orch-state' }, ({ payload }) => {
    S.orchRun = S.orchRun || {};
    S.orchRun.state = payload.to; S.orchRun.runId = payload.runId;
    toast('오케스트레이션: ' + payload.to, 'in');
    narr('오케스트레이션 상태: ' + payload.from + ' → ' + payload.to, 'sys');
    updateOrchUI();
  });
  S.channel.on('broadcast', { event: 'orch-dag' }, ({ payload }) => {
    S.orchRun = S.orchRun || {};
    S.orchRun.dag = payload.dag; S.orchRun.total = payload.steps; S.orchRun.done = 0;
    toast('DAG 생성: ' + payload.steps + '개 스텝', 'ok');
    narr('태스크 분해 완료: ' + payload.steps + '개 스텝', 'agent');
    for (let i = 0; i < Math.min(payload.steps, 12); i++) spawnP(cW() * Math.random(), cH() * Math.random(), 3, 'success');
    updateOrchUI();
  });
  S.channel.on('broadcast', { event: 'orch-step-start' }, ({ payload }) => {
    toast('실행: ' + payload.name, 'in');
    narr(payload.step + ': ' + payload.name + ' (' + payload.executor + ')', 'bash');
    updateOrchUI();
  });
  S.channel.on('broadcast', { event: 'orch-step-done' }, ({ payload }) => {
    if (payload.success) { addCombo(true); spawnP(cW() / 2, cH() * .4, 6, 'success'); }
    else { addCombo(false); triggerShake(3); }
    updateOrchUI();
  });
  S.channel.on('broadcast', { event: 'orch-progress' }, ({ payload }) => {
    if (S.orchRun) S.orchRun.done = payload.done;
    updateOrchUI();
  });
  S.channel.on('broadcast', { event: 'orch-complete' }, ({ payload }) => {
    S.orchRun = payload;
    const ok = payload.status === 'done';
    toast(ok ? '오케스트레이션 완료!' : '오케스트레이션 실패', ok ? 'ok' : 'er');
    narr('오케스트레이션 ' + payload.status + ': ' + payload.steps?.completed + '/' + payload.steps?.total, 'agent');
    if (ok) { for (let i = 0; i < 15; i++) spawnP(cW() * Math.random(), cH() * Math.random(), 4, 'success'); }
    else triggerShake(6);
    updateOrchUI();
  });

  function updateOrchUI() {
    const el = document.getElementById('orchInfo');
    if (!el) return;
    if (!S.orchRun) { el.style.display = 'none'; return; }
    el.style.display = 'block';
    const s = S.orchRun;
    let h = '<b>오케스트레이션</b> ';
    if (s.state) h += `<span style="color:var(--${s.state === 'done' ? 'ok' : s.state === 'failed' ? 'err' : 'info'})">${s.state}</span> `;
    if (s.total) h += (s.done || 0) + '/' + s.total + ' ';
    if (s.dag && s.dag.length > 0) {
      h += '<br>';
      for (const st of s.dag.slice(0, 6)) {
        const icon = st.status === 'completed' ? '<span style="color:var(--ok)">■</span>' :
          st.status === 'running' ? '<span class="executing">▶</span>' :
          st.status === 'failed' ? '<span style="color:var(--err)">✕</span>' : '<span style="color:var(--gold-d)">○</span>';
        h += icon + ' ' + ((st.name || st.id).slice(0, 18)) + ' ';
      }
    }
    el.innerHTML = h;
  }

  // ── Presence ──
  S.channel.on('presence', { event: 'sync' }, () => {
    const state = S.channel.presenceState();
    const al = Object.values(state).flat().filter(p => p.role === 'agent');
    setAgentOnline(al.length > 0);
  });
  S.channel.on('presence', { event: 'join' }, ({ newPresences }) => {
    if (newPresences.find(p => p.role === 'agent')) {
      setAgentOnline(true);
      narr('에이전트 온라인! 실시간 모니터링 시작.', 'agent'); toast('에이전트 접속', 'ok');
    }
  });
  S.channel.on('presence', { event: 'leave' }, () => {
    const state = S.channel.presenceState();
    const al = Object.values(state).flat().filter(p => p.role === 'agent');
    setAgentOnline(al.length > 0);
    if (!al.length) toast('에이전트 오프라인', 'er');
  });

  // ── Subscribe ──
  S.channel.subscribe(async (status) => {
    const cs = document.getElementById('cs'), lv = document.getElementById('lv'), sig = document.getElementById('sig');
    if (status === 'SUBSCRIBED') {
      S.connected = true; S.reconnectAttempts = 0;
      cs.className = 'conn on'; cs.innerHTML = '실시간' + sig.outerHTML;
      lv.className = 'live on'; sig.className = 'signal';
      narr('Supabase 연결! 실시간 모니터링 시작.');
      await S.channel.track({ role: 'mobile', online_at: new Date().toISOString() });
    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      S.connected = false;
      cs.className = 'conn off'; cs.innerHTML = (status === 'TIMED_OUT' ? '시간초과' : '오류') + ' (재연결...)' + sig.outerHTML;
      lv.className = 'live off'; sig.className = 'signal weak';
      scheduleReconnect();
    }
  });
}

function scheduleReconnect() {
  if (S.reconnectTimer) return;
  S.reconnectAttempts++;
  const delay = Math.min(1000 * Math.pow(2, S.reconnectAttempts), 30000);
  S.reconnectTimer = setTimeout(() => {
    S.reconnectTimer = null;
    if (!S.connected && S.connParams) {
      S.channel?.unsubscribe(); S.sbClient?.removeChannel(S.channel);
      connectWith(S.connParams.url, S.connParams.key, S.connParams.sessionId);
    }
  }, delay);
}

function setAgentOnline(online) {
  S.agentOnline = online;
  if (online) narr('에이전트 활성 중', 'agent');
  else narr('에이전트 대기 중...');
}

// ══════════════════════════════════════════
// ── UI UPDATE (throttled) ──
// ══════════════════════════════════════════

let uiD = false, uiT = null;
function sUI() {
  if (!uiD) { uiD = true; if (!uiT) uiT = setTimeout(() => { uiT = null; uiD = false; uUI(); }, 500); }
}

function uUI() {
  const d = S.entries, al = d.reduce((a, e) => a + (e.decision === 'allow' ? 1 : 0), 0),
    dn = d.reduce((a, e) => a + (e.decision === 'deny' ? 1 : 0), 0);
  document.getElementById('sT').textContent = d.length;
  const sAel = document.getElementById('sA'); sAel.textContent = al;
  const deltaEl = document.getElementById('sAd');
  if (d.length > S.prevTotal) {
    const diff = d.length - S.prevTotal; deltaEl.textContent = '+' + diff; deltaEl.className = 'delta up';
    setTimeout(() => deltaEl.textContent = '', 2000);
  }
  S.prevTotal = d.length;
  document.getElementById('sD').textContent = dn;
  if (S.serverMetrics) document.getElementById('sO').textContent = S.serverMetrics.opsPerMin || '-';
  document.getElementById('lc').textContent = d.length;
  const mcEl = document.getElementById('mc');
  if (mcEl && S.serverMetrics) mcEl.textContent = `${S.serverMetrics.opsPerMin || 0}/m`;
  if (S.panelOpen) renderPanel();
}

// ══════════════════════════════════════════
// ── PANEL SYSTEM ──
// ══════════════════════════════════════════

export function openPanel(name) {
  S.currentPanel = name || 'log'; S.panelOpen = true;
  document.getElementById('panelOverlay').classList.add('open');
  document.getElementById('fabBtn').classList.add('hide');
  switchTab(S.currentPanel); renderPanel();
  document.querySelectorAll('.bnav .nb').forEach(b => { b.classList.toggle('active', b.dataset.p === S.currentPanel); });
  if (name === 'log') { S.newLogCount = 0; updateBadge('logBadge', 0); }
}

export function closePanel(e) {
  if (e && e.target !== e.currentTarget) return;
  S.panelOpen = false;
  document.getElementById('panelOverlay').classList.remove('open');
  document.getElementById('fabBtn').classList.remove('hide');
}

export function switchTab(name) {
  S.currentPanel = name;
  document.querySelectorAll('.ptab').forEach(t => t.classList.toggle('active', t.dataset.p === name));
  document.querySelectorAll('.bnav .nb').forEach(b => b.classList.toggle('active', b.dataset.p === name));
  renderPanel();
}

function renderPanel() {
  const body = document.getElementById('panelBody'); if (!body) return;
  switch (S.currentPanel) {
    case 'log': body.innerHTML = rLogHTML(); break;
    case 'metrics': body.innerHTML = rStatHTML(); break;
    case 'agents': body.innerHTML = rAgHTML(); break;
    case 'cmd': body.innerHTML = rCmdHTML(); setupCmdHandlers(); break;
  }
}

function rLogHTML() {
  return S.entries.slice(-40).reverse().map(e => {
    const cl = e.decision === 'deny' ? 'er' : e.err ? 'er' : e.decision === 'allow' ? 'ok' : e.level === 'warn' ? 'wr' : 'in';
    const tm = (e.ts || '').slice(11, 19), tl = tk(e.tool);
    const gBadge = e.group ? `<span style="color:#8B7860;font-size:8px;margin-right:2px">${e.group}</span>` : '';
    let dt = '';
    if (e.err) dt = '⚠ ' + e.err.slice(0, 40);
    else if (e.cmd) dt = e.cmd.slice(0, 50);
    else if (e.path) dt = e.path.split(/[/\\]/).slice(-2).join('/');
    else if (e.summary) dt = e.summary.slice(0, 50);
    else dt = desc(e);
    const seqTag = e.seq ? `<span style="color:#AAA;font-size:8px;margin-right:2px">#${e.seq}</span>` : '';
    return `<div class="le ${cl}">${seqTag}<span class="t">${tm}</span><span class="n">${tl}</span>${gBadge}<span class="m">${esc(dt)}</span></div>`;
  }).join('') || '<div style="text-align:center;color:#8B7860;padding:20px">아직 이벤트가 없습니다</div>';
}

function rStatHTML() {
  const d = S.entries, m = S.serverMetrics;
  let successRate = 100, blockRate = 0, opsMin = '0', errs = 0, blocks = 0, total = d.length, sessions = 0, durMin = 0;
  const grp = { 'file-io': 0, shell: 0, search: 0, external: 0, agent: 0, edit: 0 };
  if (m && m.total > 0) {
    successRate = m.successRate || 100; blockRate = m.blockRate || 0;
    opsMin = m.opsPerMin || 0; errs = m.errorCount || 0; blocks = Math.round(m.blockRate * m.total / 100) || 0;
    total = m.total; sessions = m.sessions || 0; durMin = m.durationMin || 0;
    if (m.groups) Object.entries(m.groups).forEach(([k, v]) => { if (grp[k] !== undefined) grp[k] = v.count || v; });
  } else {
    d.forEach(e => {
      if (!e.tool) return;
      if ('Read Write Edit NotebookEdit'.includes(e.tool)) grp['file-io']++;
      else if (e.tool === 'Bash') grp.shell++;
      else if (e.tool === 'Grep' || e.tool === 'Glob') grp.search++;
      else if (e.tool.startsWith('mcp__') || e.tool === 'WebSearch' || e.tool === 'WebFetch') grp.external++;
      else if ('Task Skill TaskCreate TaskUpdate'.includes(e.tool)) grp.agent++;
      if (e.ok === false) errs++; if (e.decision === 'deny') blocks++;
    });
    successRate = total > 0 ? ((total - errs) / total * 100) | 0 : 100;
    blockRate = total > 0 ? (blocks / total * 100) | 0 : 0;
    opsMin = total >= 2 ? (total / Math.max(1, (new Date(d[d.length - 1].ts) - new Date(d[0].ts)) / 6e4)).toFixed(1) : '0';
  }
  let h = '<div style="font-size:12px;color:var(--gold-dd);font-weight:bold;margin:4px 0 8px">시스템 메트릭</div>';
  h += `<div class="sb"><span class="n">성공률</span><div class="b"><div class="f" style="width:${successRate}%;background:${successRate > 90 ? 'var(--ok)' : 'var(--err)'}"></div>${drawSparkSvg(S.sparkData.ops, '#44AA4480', 60, 12)}</div><span class="v">${Math.round(successRate)}%</span></div>`;
  h += `<div class="sb"><span class="n">차단률</span><div class="b"><div class="f" style="width:${Math.min(blockRate * 10, 100)}%;background:var(--err)"></div>${drawSparkSvg(S.sparkData.errs, '#CC330080', 60, 12)}</div><span class="v">${Math.round(blockRate)}%</span></div>`;
  h += `<div class="sb"><span class="n">속도</span><div class="b"><div class="f" style="width:${Math.min(opsMin * 5, 100)}%;background:var(--info)"></div></div><span class="v">${opsMin}/m</span></div>`;

  // Floor activity section
  h += '<div style="font-size:12px;color:var(--gold-dd);font-weight:bold;margin:10px 0 8px">층별 활동</div>';
  const fMax = Math.max(1, ...S.floorActivity);
  FLOORS.forEach((fl, i) => {
    h += `<div class="sb"><span class="n">${fl.nameKo}</span><div class="b"><div class="f" style="width:${(S.floorActivity[i] / fMax * 100) | 0}%;background:${fl.colors.accent}"></div></div><span class="v">${S.floorActivity[i] || 0}</span></div>`;
  });

  h += '<div style="font-size:12px;color:var(--gold-dd);font-weight:bold;margin:10px 0 8px">도구 그룹</div>';
  const gMetrics = [['파일I/O', grp['file-io'] + grp.edit, 'var(--ok)'], ['셸', grp.shell, '#FF6644'], ['검색', grp.search, 'var(--info)'], ['외부', grp.external, 'var(--warn)'], ['에이전트', grp.agent, '#AA88FF']];
  const gmx = Math.max(1, ...gMetrics.map(m2 => m2[1]));
  gMetrics.forEach(([n, v, co]) => {
    h += `<div class="sb"><span class="n">${n}</span><div class="b"><div class="f" style="width:${(v / gmx * 100) | 0}%;background:${co}"></div></div><span class="v">${v}</span></div>`;
  });
  h += `<div style="font-size:10px;color:#8B7860;margin-top:8px;padding:6px;background:#FFF8E8;border-radius:6px">총 <b>${total}</b> | 에러 <b>${errs}</b> | 차단 <b>${blocks}</b>${sessions ? ' | ' + sessions + '세션' : ''}${durMin ? ' | ' + durMin + '분' : ''}</div>`;
  // Lane Queue info
  h += '<div style="font-size:12px;color:var(--gold-dd);font-weight:bold;margin:10px 0 6px">Lane Queue</div>';
  const laneAge = S.lastLaneStatsTime ? Math.floor((Date.now() - S.lastLaneStatsTime) / 1000) : 999;
  const laneDefault = S.lastLaneStats ?
    `큐:<b>${S.lastLaneStats.pending || 0}</b> 실행:<b>${S.lastLaneStats.running || 0}</b> 완료:<b>${S.lastLaneStats.completed || 0}</b>${laneAge > 90 ? ' <span style="color:var(--err)">(' + laneAge + '초 전)</span>' : ''}` :
    (S.connected ? '<span style="color:var(--warn)">대기 중... (30초 내 업데이트)</span>' : '<span style="color:var(--err)">릴레이 오프라인</span>');
  h += `<div id="laneInfo" style="font-size:11px;color:#8B7860;padding:6px;background:#FFF8E8;border-radius:6px;border-left:3px solid ${S.lastLaneStats && S.lastLaneStats.running > 0 ? 'var(--accent)' : 'transparent'}">${laneDefault}</div>`;
  // Orchestration
  h += '<div id="orchInfo" style="font-size:11px;color:#8B7860;padding:6px;margin-top:4px;background:#FFF8E8;border-radius:6px;border-left:3px solid var(--info);display:none"></div>';
  // Combo & XP
  h += '<div style="font-size:12px;color:var(--gold-dd);font-weight:bold;margin:10px 0 6px">게임 통계</div>';
  h += '<div style="padding:6px;background:#FFF8E8;border-radius:6px;font-size:11px">';
  h += `<div>현재 콤보: <b style="color:${S.combo >= 5 ? 'var(--err)' : 'var(--accent)'}">${S.combo}</b> | 최대: <b>${S.maxCombo}</b></div>`;
  h += `<div>총 XP: <b style="color:var(--info)">${S.totalXP}</b></div>`;
  h += `<div style="margin-top:4px">업적: ${S.achievements.length}/${ACHIEVEMENTS.length}</div>`;
  S.achievements.forEach(id => { const a = ACHIEVEMENTS.find(x => x.id === id); if (a) h += `<div style="font-size:9px;color:var(--ok);margin-top:2px">✓ ${a.name}</div>`; });
  h += '</div>';
  // Relay uptime
  if (S.relayUptime > 0) {
    const um = Math.floor(S.relayUptime / 60), us = S.relayUptime % 60;
    h += `<div style="font-size:10px;color:#8B7860;margin-top:6px">릴레이 업타임: ${um}분 ${us}초</div>`;
  }
  return h;
}

function rAgHTML() {
  // Floor-grouped agents
  let h = '';
  FLOORS.forEach((fl, fi) => {
    h += `<div style="font-size:11px;color:${fl.colors.accent};font-weight:bold;margin:${fi ? '8px' : '0'} 0 4px;padding:2px 6px;background:#1A1A3A20;border-radius:4px">${fl.nameKo}</div>`;
    S.agents.filter(a => a.floor === fi).forEach(a => {
      const c = C[a.t],
        txt = a.tk || (a.st === 'work' ? '처리 중' : a.st === 'walk' ? '이동' : '대기'),
        act = a.st === 'work' ? ' on' : '', pp = Math.max(0, Math.min(100, a.pw)),
        st = a.st === 'work' ? 'RUN' : a.st === 'walk' ? 'MOV' : 'IDLE',
        stC = a.st === 'work' ? 'var(--err)' : a.st === 'walk' ? 'var(--warn)' : '#888',
        lvBar = '<span style="font-size:8px;color:var(--info)">Lv.' + a.lv + '</span>';
      h += `<div class="ac${act}"><div class="fc" style="background:${a.st === 'work' ? c.s : 'var(--panel)'};color:${a.st === 'work' ? '#FFF' : c.s};font-family:monospace;font-weight:bold">${c.e}</div><div class="i"><div class="nm">${c.l} <span class="rl">${c.r} | ${a.tot}ops ${lvBar}</span></div><div class="tk"><span style="color:${stC};font-weight:bold;font-size:9px">[${st}]</span> ${txt}</div><div class="pw"><div class="pf" style="width:${pp}%;background:${pp > 30 ? 'var(--ok)' : 'var(--err)'}"></div></div></div></div>`;
    });
  });
  return h;
}

function rCmdHTML() {
  let h = '<div class="cmd-area">';
  h += '<div class="cmd-row"><input id="cmdInput" placeholder="명령 입력..."><button id="cmdSendBtn">전송</button></div>';
  h += '<div class="quick-cmds">';
  h += '<button class="qc" data-cmd="/status">📋 상태</button>';
  h += '<button class="qc" data-cmd="/log">📝 로그</button>';
  h += '<button class="qc" data-cmd="/optimize">⚡ 최적화</button>';
  h += '<button class="qc" data-cmd="/continue">▶ 이어서</button>';
  h += '<button class="qc" data-cmd="__status__">🔄 새로고침</button>';
  h += '</div>';
  h += '<div id="cmdHist" class="cmd-hist">';
  h += renderCmdHistItems();
  h += '</div></div>';
  return h;
}

function renderCmdHistItems() {
  return S.cmdHistory.slice(0, 30).map(c => {
    const stCls = c.status === 'completed' ? 'queued' : c.status === 'queued' ? 'queued' : c.status === 'executing' ? 'executing' : c.status === 'rejected' || c.status === 'failed' ? 'rejected' : 'pending';
    const statusIcon = c.status === 'executing' ? '⚙️ ' : c.status === 'completed' ? '✅ ' : c.status === 'failed' ? '❌ ' : c.status === 'queued' ? '📋 ' : '⏳ ';
    return `<div class="cmd-entry"><span class="ct">${statusIcon}${esc(c.command)}</span><span class="cs ${stCls}">${c.status}${c.reason ? ' : ' + esc(c.reason) : ''}</span><br><span style="color:#8B7860;font-size:9px">${c.ts.toLocaleTimeString('ko-KR')}</span>${c.result ? '<div style="margin-top:2px;padding:2px 4px;background:#FFF0D0;border:1px solid #D4B896;border-radius:2px;font-size:9px;max-height:60px;overflow:auto;white-space:pre-wrap">' + esc(String(c.result)) + '</div>' : ''}</div>`;
  }).join('');
}

function setupCmdHandlers() {
  const inp = document.getElementById('cmdInput');
  const btn = document.getElementById('cmdSendBtn');
  if (inp) { inp.focus(); inp.addEventListener('keydown', e => { if (e.key === 'Enter') sendCmd(); }); }
  if (btn) btn.addEventListener('click', () => sendCmd());
  document.querySelectorAll('.qc[data-cmd]').forEach(b => {
    b.addEventListener('click', () => {
      const cmd = b.dataset.cmd;
      if (cmd === '__status__') requestStatus();
      else quickCmd(cmd);
    });
  });
}

// ── Command Sending ──
function sendCmd() {
  const input = document.getElementById('cmdInput');
  const cmd = input.value.trim();
  if (!cmd || !S.channel) return;
  const id = 'cmd-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  S.channel.send({ type: 'broadcast', event: 'command', payload: { id, command: cmd, priority: 'normal' } });
  S.cmdHistory.unshift({ id, command: cmd, status: 'pending', ts: new Date() });
  renderCmdHist();
  input.value = '';
}

function quickCmd(cmd) {
  const inp = document.getElementById('cmdInput');
  if (inp) inp.value = cmd;
  sendCmd();
}

function requestStatus() {
  if (!S.channel) return;
  S.channel.send({ type: 'broadcast', event: 'status-request', payload: {} });
  narr('상태 요청 전송...');
}

function updateCmdStatus(id, status, reason) {
  const cmd = S.cmdHistory.find(c => c.id === id);
  if (cmd) { cmd.status = status; if (reason) cmd.reason = reason; renderCmdHist(); }
}

function updateCmdResult(id, result, exitCode) {
  const cmd = S.cmdHistory.find(c => c.id === id);
  if (cmd) { cmd.result = result; cmd.exitCode = exitCode; cmd.status = exitCode === 0 ? 'completed' : 'failed'; renderCmdHist(); }
}

function renderCmdHist() {
  document.getElementById('cmdCount').textContent = S.cmdHistory.length;
  const el = document.getElementById('cmdHist');
  if (el) el.innerHTML = renderCmdHistItems();
}

// ══════════════════════════════════════════
// ── TOUCH / SWIPE / INTERACTION ──
// ══════════════════════════════════════════

export function setupCanvasTouch() {
  const cv = document.getElementById('c'); if (!cv) return;
  let touchStartX = 0, touchStartY = 0, touchStartTime = 0;

  cv.addEventListener('touchstart', (e) => {
    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    touchStartTime = Date.now();
  }, { passive: true });

  cv.addEventListener('touchend', (e) => {
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartX;
    const dy = touch.clientY - touchStartY;
    const dt = Date.now() - touchStartTime;

    // Swipe detection (vertical for floor change)
    if (Math.abs(dy) > 60 && Math.abs(dy) > Math.abs(dx) * 1.5 && dt < 500) {
      if (S.viewMode === 'floor') {
        if (dy < 0 && S.currentFloor < 2) switchFloor(S.currentFloor + 1); // swipe up = higher floor
        else if (dy > 0 && S.currentFloor > 0) switchFloor(S.currentFloor - 1); // swipe down = lower floor
      }
      return;
    }

    // Tap detection (agent or building floor)
    if (Math.abs(dx) < 15 && Math.abs(dy) < 15 && dt < 300) {
      const rect = cv.getBoundingClientRect();
      const sx = cW() / rect.width, sy = cH() / rect.height;
      const cx2 = (touch.clientX - rect.left) * sx, cy2 = (touch.clientY - rect.top) * sy;

      if (S.viewMode === 'building') {
        // Tap on building floor to switch
        const h = cH(), margin = 6;
        const flH = (h - margin * 2 - 30) / 3;
        for (let i = 0; i < 3; i++) {
          const fy = margin + (2 - i) * flH;
          if (cy2 >= fy && cy2 < fy + flH) {
            S.viewMode = 'floor';
            switchFloor(i);
            return;
          }
        }
      } else {
        // Hit test agents on current floor
        const hitAgent = S.agents.filter(a => a.floor === S.currentFloor).find(a => {
          const ax = a.x * cW(), ay = a.y * cH();
          return Math.abs(cx2 - ax) < 30 * P / 5 && Math.abs(cy2 - ay) < 40 * P / 5;
        });
        if (hitAgent) {
          const c2 = C[hitAgent.t];
          narr(`${c2.l} Lv.${hitAgent.lv} (${c2.r}) - ${hitAgent.st === 'work' ? '작업: ' + hitAgent.tk : hitAgent.st === 'walk' ? '이동 중' : '대기'} [${hitAgent.tot}ops]`, AT[hitAgent.i]);
          spawnP(hitAgent.x * cW(), hitAgent.y * cH() - 20, 3);
        }
      }
    }
  }, { passive: true });
}

export function setupSheetSwipe() {
  const sheet = document.getElementById('panelSheet'); if (!sheet) return;
  let sheetStartY = 0;
  sheet.addEventListener('touchstart', e => { sheetStartY = e.touches[0].clientY; }, { passive: true });
  sheet.addEventListener('touchmove', e => { if (e.touches[0].clientY - sheetStartY > 80) closePanel(); }, { passive: true });
}

export function setupDragDrop() {
  document.body.addEventListener('dragover', e => e.preventDefault());
  document.body.addEventListener('drop', e => {
    e.preventDefault();
    const f = e.dataTransfer?.files[0];
    if (f) {
      const r = new FileReader();
      r.onload = v => {
        S.entries = v.target.result.trim().split('\n').filter(Boolean).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
        S.entries.forEach(e2 => onE(e2)); sUI();
        toast(`로그 로드! ${S.entries.length}건`, 'ok'); narr(`로그 로드! ${S.entries.length}건`);
      };
      r.readAsText(f);
    }
  });
}

// ── Intervals ──
export function startIntervals() {
  // Idle narration
  setInterval(() => { if (Date.now() - S.lastET > 12000) narr(pick(NR.idle)); }, 8000);
  // Tick liveness monitor
  setInterval(() => {
    if (!S.connected) return;
    const sig = document.getElementById('sig'); if (!sig) return;
    const elapsed = Date.now() - S.lastTick;
    if (S.lastTick === 0 || elapsed < 70000) sig.className = 'signal';
    else if (elapsed < 130000) sig.className = 'signal mid';
    else sig.className = 'signal weak';
  }, 10000);
}

// ── Visibility ──
export function setupVisibility() {
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && !S.connected && S.connParams) scheduleReconnect();
  });
}
