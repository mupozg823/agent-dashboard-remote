// ── utils.ts ── Pure utility functions
import { S, TK } from './state.ts';

export function tk(t: string): string {
  if (!t) return '대기';
  if (TK[t]) return TK[t];
  if (t.startsWith('mcp__serena__')) return 'Serena';
  if (t.startsWith('mcp__memory__')) return '메모리';
  if (t.startsWith('mcp__context7')) return '문서조회';
  if (t.startsWith('mcp__filesystem')) return '파일시스템';
  if (t.startsWith('mcp__grep')) return '코드검색';
  if (t.startsWith('mcp__seq')) return '추론';
  if (t.startsWith('mcp__')) return 'MCP';
  return t;
}

// Tool → Agent type mapping (architecture-synced: MCP tools distributed by function)
export function toolToAgentType(t: string): string {
  if (!t) return 'commander';
  // 1F Execution — Gateway control plane + Orchestrator
  if (t === 'Bash') return 'operator';
  if (t === 'Agent') return 'commander';
  if (['TaskCreate', 'TaskUpdate', 'TaskList', 'TaskGet', 'TaskStop', 'TaskOutput'].includes(t)) return 'commander';
  if (['Skill', 'EnterPlanMode', 'ExitPlanMode'].includes(t)) return 'commander';
  // 2F Analysis — Code intelligence + Audit trail
  if (t === 'Read') return 'architect';
  if (['Write', 'Edit', 'NotebookEdit'].includes(t)) return 'architect';
  if (t === 'Grep' || t === 'Glob') return 'inspector';
  if (t === 'ToolSearch') return 'inspector';
  // 3F Connection — Relay bridge + Security shield
  if (t === 'WebSearch' || t === 'WebFetch') return 'diplomat';
  if (t === 'AskUserQuestion') return 'diplomat';
  // MCP tools → distributed by architectural function
  if (t.startsWith('mcp__serena')) return 'architect';       // Serena = code intelligence
  if (t.startsWith('mcp__filesystem')) return 'architect';    // file ops = code workspace
  if (t.startsWith('mcp__grep')) return 'inspector';          // grep.app = pattern analysis
  if (t.startsWith('mcp__seq')) return 'inspector';           // sequential-thinking = deep analysis
  if (t.startsWith('mcp__context7')) return 'diplomat';       // docs = external knowledge
  if (t.startsWith('mcp__claude_ai_Notion')) return 'diplomat'; // Notion = external API
  if (t.startsWith('mcp__memory')) return 'guardian';          // memory = knowledge protection
  if (t.startsWith('mcp__')) return 'guardian';                // other MCP = guardian fallback
  return 'commander';
}

// Tool → Agent index mapping
export function t2a(t: string): number {
  if (S.fallbackMode) {
    // Fixed mapping: 6 architecture roles (0-5), MCP distributed by function
    if (!t) return 0;                                    // commander
    if (t === 'Bash') return 1;                          // operator
    if (t === 'Agent') return 0;                         // commander
    if (['TaskCreate', 'TaskUpdate', 'TaskList', 'TaskGet', 'TaskStop', 'TaskOutput'].includes(t)) return 0;
    if (['Skill', 'EnterPlanMode', 'ExitPlanMode'].includes(t)) return 0;
    if (t === 'Read') return 2;                          // architect
    if (['Write', 'Edit', 'NotebookEdit'].includes(t)) return 2;
    if (t === 'Grep' || t === 'Glob') return 3;          // inspector
    if (t === 'ToolSearch') return 3;
    if (t === 'WebSearch' || t === 'WebFetch') return 4;  // diplomat
    if (t === 'AskUserQuestion') return 4;
    // MCP distributed by architecture role
    if (t.startsWith('mcp__serena')) return 2;            // architect (code intelligence)
    if (t.startsWith('mcp__filesystem')) return 2;        // architect (file workspace)
    if (t.startsWith('mcp__grep')) return 3;              // inspector (pattern analysis)
    if (t.startsWith('mcp__seq')) return 3;               // inspector (deep analysis)
    if (t.startsWith('mcp__context7')) return 4;          // diplomat (external docs)
    if (t.startsWith('mcp__claude_ai_Notion')) return 4;  // diplomat (external API)
    if (t.startsWith('mcp__memory')) return 5;            // guardian (knowledge protection)
    if (t.startsWith('mcp__')) return 5;                  // guardian (MCP fallback)
    return 0;
  }
  // Dynamic mode: find agent by type
  const agentType = toolToAgentType(t);
  const ag = S.agents.find(a => a.t === agentType);
  return ag ? ag.i : (S.agents[0]?.i ?? 0);
}

export function desc(e: Record<string, unknown>): string {
  const t = (e.tool as string) || '', s = (e.summary as string) || (e.cmd as string) || '';
  if (t === 'Bash') { const c = (e.cmd as string) || s; if (c.includes('git')) return 'Git'; if (c.includes('npm') || c.includes('node')) return 'Node'; if (c.includes('curl') || c.includes('wget')) return '네트워크'; if (c.includes('docker')) return 'Docker'; if (c.includes('test') || c.includes('jest')) return '테스트'; return '명령실행'; }
  if (t === 'Read') { const f = ((e.path as string) || s).split(/[/\\]/).pop(); return f ? f.slice(0, 14) : '파일읽기'; }
  if (t === 'Write') { const f = ((e.path as string) || s).split(/[/\\]/).pop(); return f ? '생성:' + f.slice(0, 10) : '파일생성'; }
  if (t === 'Edit') { const f = ((e.path as string) || s).split(/[/\\]/).pop(); return f ? '수정:' + f.slice(0, 10) : '코드수정'; }
  if (t === 'NotebookEdit') return '노트북편집';
  if (t === 'Grep') return '코드검색'; if (t === 'Glob') return '파일탐색';
  if (t === 'WebSearch') return '웹검색'; if (t === 'WebFetch') return '페이지수집';
  if (t === 'Task') return '서브에이전트'; if (t === 'Skill') return '스킬실행';
  if (t === 'ToolSearch') return '도구탐색'; if (t === 'AskUserQuestion') return '사용자질의';
  if (t === 'EnterPlanMode') return '계획수립'; if (t === 'ExitPlanMode') return '계획완료';
  if (['TaskCreate', 'TaskUpdate', 'TaskList', 'TaskGet'].includes(t)) return '태스크관리';
  if (t.startsWith('mcp__serena')) return 'Serena:' + t.split('__').pop()!.slice(0, 10);
  if (t.startsWith('mcp__grep')) return '코드검색(외부)';
  if (t.startsWith('mcp__context7')) return '문서조회';
  if (t.startsWith('mcp__filesystem')) return '파일시스템';
  if (t.startsWith('mcp__memory')) return '지식그래프';
  if (t.startsWith('mcp__seq')) return '추론체인';
  if (t.startsWith('mcp__claude_ai_Notion')) return 'Notion';
  if (t.startsWith('mcp__')) return 'MCP:' + t.split('__')[1];
  return tk(t);
}

export function esc(s: unknown): string { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
export function pick<T>(a: T[]): T { return a[Math.floor(Math.random() * a.length)]; }

export function toolGroup(t: string): string {
  if (!t) return 'other';
  if (t === 'Bash') return 'shell';
  if (['Read', 'Write', 'Glob'].includes(t)) return 'file-io';
  if (['Edit', 'NotebookEdit'].includes(t)) return 'edit';
  if (['Grep', 'WebSearch', 'WebFetch', 'ToolSearch'].includes(t)) return 'search';
  if (t.startsWith('mcp__')) return 'external';
  if (['Task', 'Skill', 'Agent', 'TaskCreate', 'TaskUpdate', 'TaskList', 'TaskGet', 'TaskStop', 'TaskOutput', 'AskUserQuestion', 'EnterPlanMode', 'ExitPlanMode'].includes(t)) return 'agent';
  return 'other';
}

// Real-time session label (recalculated at most once per second)
export interface SessionLabel {
  time: string;
  elapsed: number;
  label: string;
}

let _calCache: SessionLabel | null = null, _calBucket = -1;
export function getSessionLabel(): SessionLabel {
  const now = Date.now();
  const bucket = Math.floor(now / 1000);
  if (bucket === _calBucket && _calCache) return _calCache;
  _calBucket = bucket;
  const elapsed = Math.floor((now - S.sessionStart) / 60000);
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  _calCache = {
    time: `${hh}:${mm}`,
    elapsed,
    label: `${hh}:${mm} (${elapsed}m)`,
  };
  return _calCache;
}

export function getDayPhase(): 'morning' | 'day' | 'evening' | 'night' {
  const h = new Date().getHours();
  if (h >= 6 && h < 10) return 'morning';
  if (h >= 10 && h < 17) return 'day';
  if (h >= 17 && h < 20) return 'evening';
  return 'night';
}

// Activity status (replaces weather)
let _statusCache = 'idle', _statusTs = 0;
export function getActivityStatus(): string {
  const now = Date.now();
  if (now - _statusTs < 1000) return _statusCache;
  _statusTs = now;
  const intensity = getActivityIntensity();
  if (intensity > .6) _statusCache = 'active';
  else if (intensity > .2) _statusCache = 'normal';
  else _statusCache = 'idle';
  return _statusCache;
}

export function trackActivity(): void {
  const now = Date.now();
  S.activityHistory.push(now);
  S.activityHistory = S.activityHistory.filter(t => now - t < 60000);
}

export function getActivityIntensity(): number {
  return Math.min(S.activityHistory.length / 30, 1);
}

export function addSpark(key: keyof typeof S.sparkData, val: number): void {
  const a = S.sparkData[key]; a.push(val); if (a.length > 30) a.shift();
}

export function recordHeat(ts: string | undefined): void {
  const d = new Date(ts || Date.now());
  S.heatmap[d.getDay()][d.getHours()]++;
}
