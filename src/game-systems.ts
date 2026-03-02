// ── game-systems.ts ── Operational tracking (replaces game mechanics)
// Tool usage stats, pipeline status, MCP tracking
import { S } from './state.ts';

export interface AuditEntry {
  tool?: string;
  tool_name?: string;
  err?: string;
  decision?: 'allow' | 'deny' | string;
  cmd?: string;
  path?: string;
  summary?: string;
  ts?: string;
  timestamp?: string;
  skill_routed?: string;
  level?: string;
  ok?: boolean;
  seq?: number;
  group?: string;
  [key: string]: unknown;
}

export interface ToolSummaryEntry {
  calls: number;
  errors: number;
  lastCmd: string;
  lastTime?: string;
  successRate: string;
}

// ── Tool Call Tracking ──
export function trackToolCall(entry: AuditEntry): void {
  const tool = entry.tool || entry.tool_name || '';
  if (!tool) return;
  if (!S.toolStats[tool]) S.toolStats[tool] = { calls: 0, errors: 0, lastCmd: '' };
  const ts = S.toolStats[tool];
  ts.calls++;
  if (entry.err || entry.decision === 'deny') ts.errors++;
  ts.lastCmd = entry.cmd || entry.path || entry.summary || '';
  ts.lastTime = entry.ts || new Date().toISOString();
  // Pipeline status
  if (entry.decision === 'allow') S.pipelineStatus.approves++;
  else if (entry.decision === 'deny') S.pipelineStatus.denies++;
  S.pipelineStatus.lastTool = tool;
  S.pipelineStatus.lastToolTime = Date.now();
}

// ── Tool Summary ──
export function getToolSummary(): Record<string, ToolSummaryEntry> {
  const result: Record<string, ToolSummaryEntry> = {};
  for (const [tool, ts] of Object.entries(S.toolStats)) {
    result[tool] = { ...ts, successRate: ts.calls > 0 ? ((ts.calls - ts.errors) / ts.calls * 100).toFixed(0) : '100' };
  }
  return result;
}

// ── Codex Inspector Tracking ──
export interface CodexReportPayload {
  path?: string;
  score?: number;
  grade?: string;
  checks?: Array<{ name: string; ok: boolean; score: number }>;
  issues?: Array<{ message: string }>;
  filesScanned?: number;
  report?: {
    path?: string;
    score?: number;
    grade?: string;
    checks?: Array<{ name: string; ok: boolean; score: number }>;
    issues?: Array<{ message: string }>;
    filesScanned?: number;
  };
}

export function trackCodexCheck(payload: CodexReportPayload): void {
  // Unwrap nested report if present (orch-codex-report wraps in { runId, report })
  const data = payload.report || payload;
  const score = data.score ?? -1;
  const grade = data.grade ?? '';
  const checkCount = Array.isArray(data.checks) ? data.checks.length : 0;
  const issueCount = Array.isArray(data.issues) ? data.issues.length : 0;

  S.codexMetrics.lastScore = score;
  S.codexMetrics.lastGrade = grade;
  S.codexMetrics.totalChecks += checkCount;
  S.codexMetrics.totalIssues += issueCount;

  // History (max 50)
  S.codexMetrics.history.push({ ts: Date.now(), score, grade });
  if (S.codexMetrics.history.length > 50) S.codexMetrics.history.shift();

  // Last report summary
  S.codexMetrics.lastReport = {
    path: data.path || '',
    score,
    grade,
    checks: checkCount,
    issues: issueCount,
    filesScanned: data.filesScanned || 0,
  };
}

// ── MCP / Skill Route Tracking ──
export function trackMcp(entry: AuditEntry): void {
  const tool = entry.tool || entry.tool_name || '';
  if (tool.startsWith('mcp__')) {
    const parts = tool.split('__');
    if (parts.length >= 3) {
      const server = parts[1], toolName = parts.slice(2).join('__');
      if (!S.mcpServerData[server]) S.mcpServerData[server] = { calls: 0, tools: {}, lastSeen: null };
      S.mcpServerData[server].calls++;
      S.mcpServerData[server].tools[toolName] = (S.mcpServerData[server].tools[toolName] || 0) + 1;
      S.mcpServerData[server].lastSeen = entry.ts || entry.timestamp || null;
      S.mcpTotalCalls++;
    }
  }
  if (entry.skill_routed) {
    S.skillRouteData[entry.skill_routed] = (S.skillRouteData[entry.skill_routed] || 0) + 1;
    S.skillTotalRouted++;
  }
}
