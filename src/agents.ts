// ── agents.ts ── Agent state machine (Ag class) and agents array
import { S, C, DESKS, AGENT_FLOOR, AT } from './state.ts';
import type { AgentInstance, SessionInfo, DeskDef } from './state.ts';
import { spawnP, cW, cH, drawCh } from './renderer-views.ts';
import { getActivityIntensity } from './utils.ts';

// ── Agent class (operational state machine) ──
export class Ag implements AgentInstance {
  t: string;
  i: number;
  floor: number;
  x: number;
  y: number;
  tx: number;
  ty: number;
  d: number;
  st: string;
  wf: number;
  tk: string;
  wt: number;
  di: number;
  tot: number;
  sessionId?: string;

  constructor(t: string, i: number, sessionId?: string) {
    this.t = t; this.i = i; this.floor = AGENT_FLOOR[t] || 0;
    const desk = getDeskForAgent(i);
    this.x = desk.x + (Math.random() - .5) * .02; this.y = .78; this.tx = this.x; this.ty = this.y;
    this.d = 1; this.st = 'idle'; this.wf = Math.random() * 100; this.tk = ''; this.wt = 0; this.di = -1;
    this.tot = 0;
    this.sessionId = sessionId;
  }

  go(tk: string): void {
    this.di = this.i; const d = getDeskForAgent(this.i);
    this.tx = d.x + (Math.random() - .5) * .02; this.ty = .48;
    this.st = 'walk'; this.tk = tk; this.wt = 60 + Math.random() * 80;
    this.tot++;
    d.act = true;
  }

  up(): void {
    if (this.st === 'walk') {
      const dx = this.tx - this.x, dy = this.ty - this.y;
      const ai = getActivityIntensity();
      const opm = (S.serverMetrics && S.serverMetrics.opsPerMin || 0) / 100;
      const spd = .06 + Math.min(.08, Math.max(ai, opm) * .08);
      if (Math.hypot(dx, dy) > .004) {
        this.x += dx * spd; this.y += dy * spd; this.d = dx > 0 ? 1 : -1; this.wf++;
      } else {
        this.st = this.di >= 0 ? 'work' : 'idle';
      }
    } else if (this.st === 'work') {
      this.wt--;
      if (this.wt <= 0) {
        const desk = getDeskForAgent(this.i);
        desk.act = false; this.tk = '';
        spawnP(desk.x * cW(), cH() * .55, 5);
        this.tx = desk.x + (Math.random() - .5) * .03; this.ty = .78 + Math.random() * .03;
        this.st = 'walk'; this.di = -1;
      }
    } else {
      // Idle wandering
      if (Math.random() < .003) {
        const desk = getDeskForAgent(this.i);
        this.tx = desk.x + (Math.random() - .5) * .04;
        this.ty = Math.max(.73, Math.min(.84, this.y + (Math.random() - .5) * .03)); this.st = 'walk';
      }
      if (Math.random() < .005) this.d = this.d > 0 ? -1 : 1;
    }
  }

  draw(w: number, h: number): void {
    drawCh(this.x * w, this.y * h, this.t, this.wf, this.d, this.st === 'work', this.st === 'work' ? this.tk : '', this);
  }
}

// ── Desk lookup (supports both static and dynamic desks) ──
export function getDeskForAgent(index: number): DeskDef {
  if (!S.fallbackMode && S.dynamicDesks[index]) return S.dynamicDesks[index];
  return DESKS[index] || DESKS[0];
}

// ── Fallback agents (original 8 fixed characters) ──
export function initFallbackAgents(): void {
  agents.length = 0;
  AT.forEach((t, i) => agents.push(new Ag(t, i)));
  S.agents = agents;
  S.fallbackMode = true;
}

export function clearFallbackAgents(): void {
  agents.length = 0;
  S.agents = agents;
}

// ── Dynamic agent management ──
let _nextAgentIndex = 6; // start after the 6 fallback slots

function allocateAgentIndex(): number {
  // Find first unused index
  const usedIndices = new Set(agents.map(a => a.i));
  for (let i = 0; i < S.maxAgents; i++) {
    if (!usedIndices.has(i)) return i;
  }
  return _nextAgentIndex++;
}

/** Determine agent type from session tool profile (architecture-synced, MCP distributed) */
export function sessionToAgentType(session: SessionInfo): string {
  const profile = session.toolProfile;
  if (!profile || Object.keys(profile).length === 0) return 'commander';

  const scores: Record<string, number> = { commander: 0, operator: 0, architect: 0, inspector: 0, diplomat: 0, guardian: 0 };
  for (const [tool, count] of Object.entries(profile)) {
    if (tool === 'Bash') scores.operator += count;
    else if (tool === 'Agent' || ['TaskCreate', 'TaskUpdate', 'TaskList', 'TaskGet', 'TaskStop', 'TaskOutput', 'Skill', 'EnterPlanMode', 'ExitPlanMode'].includes(tool)) scores.commander += count;
    else if (['Read', 'Write', 'Edit', 'NotebookEdit'].includes(tool)) scores.architect += count;
    else if (tool === 'Grep' || tool === 'Glob' || tool === 'ToolSearch') scores.inspector += count;
    else if (tool === 'WebSearch' || tool === 'WebFetch' || tool === 'AskUserQuestion') scores.diplomat += count;
    // MCP tools distributed by architectural function
    else if (tool.startsWith('mcp__serena') || tool.startsWith('mcp__filesystem')) scores.architect += count;
    else if (tool.startsWith('mcp__grep') || tool.startsWith('mcp__seq')) scores.inspector += count;
    else if (tool.startsWith('mcp__context7') || tool.startsWith('mcp__claude_ai_Notion')) scores.diplomat += count;
    else if (tool.startsWith('mcp__memory')) scores.guardian += count;
    else if (tool.startsWith('mcp__')) scores.guardian += count;
    else scores.commander += count;
  }

  let best = 'commander', bestScore = 0;
  for (const [type, score] of Object.entries(scores)) {
    if (score > bestScore) { bestScore = score; best = type; }
  }
  return best;
}

/** Allocate desk position for a dynamic agent */
function allocateDynamicDesk(agentType: string, floor: number): DeskDef {
  const sameFloorDesks = S.dynamicDesks.filter(d => d.floor === floor);
  const count = sameFloorDesks.length;
  // Distribute evenly across 0.15..0.85
  const x = 0.15 + ((count % 6) + 0.5) * (0.7 / Math.max(count + 1, 3));
  const label = C[agentType]?.l || agentType;
  const desk: DeskDef = { x, label, act: false, floor };
  S.dynamicDesks.push(desk);
  return desk;
}

/** Spawn a new agent for a live session */
export function spawnAgentForSession(session: SessionInfo): Ag | null {
  if (agents.length >= S.maxAgents) return null;
  const agentType = sessionToAgentType(session);
  const floor = AGENT_FLOOR[agentType] || 0;
  const index = allocateAgentIndex();

  allocateDynamicDesk(agentType, floor);

  const ag = new Ag(agentType, index, session.sessionId);
  ag.floor = floor;
  agents.push(ag);
  S.agents = agents;

  // Start spawn animation
  S.agentLifecycles.set(index, {
    phase: 'spawning',
    progress: 0,
    startTime: performance.now(),
  });

  return ag;
}

/** Begin despawning an agent (starts fade-out) */
export function despawnAgentForSession(sessionId: string): void {
  const ag = agents.find(a => a.sessionId === sessionId);
  if (!ag) return;
  S.agentLifecycles.set(ag.i, {
    phase: 'despawning',
    progress: 0,
    startTime: performance.now(),
  });
}

/** Actually remove an agent after animation completes */
export function removeAgent(index: number): void {
  const idx = agents.findIndex(a => a.i === index);
  if (idx === -1) return;

  // Clean up desk
  const deskIdx = S.dynamicDesks.findIndex((_, di) => di === index);
  if (deskIdx >= 0) S.dynamicDesks.splice(deskIdx, 1);

  agents.splice(idx, 1);
  S.agents = agents;
  S.agentLifecycles.delete(index);
}

// ── Instantiate agents array (fallback mode by default) ──
export const agents: Ag[] = AT.map((t, i) => new Ag(t, i));

// Wire into shared state so other modules can access via S.agents
S.agents = agents;
