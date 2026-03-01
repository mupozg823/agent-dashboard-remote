// ── game-systems.js ── Operational tracking (replaces game mechanics)
// Tool usage stats, pipeline status, MCP tracking
import { S } from './state.js';

// ── Tool Call Tracking ──
export function trackToolCall(entry) {
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
export function getToolSummary() {
  const result = {};
  for (const [tool, ts] of Object.entries(S.toolStats)) {
    result[tool] = { ...ts, successRate: ts.calls > 0 ? ((ts.calls - ts.errors) / ts.calls * 100).toFixed(0) : '100' };
  }
  return result;
}

// ── MCP / Skill Route Tracking ──
export function trackMcp(entry) {
  const tool = entry.tool || entry.tool_name || '';
  if (tool.startsWith('mcp__')) {
    const parts = tool.split('__');
    if (parts.length >= 3) {
      const server = parts[1], toolName = parts.slice(2).join('__');
      if (!S.mcpServerData[server]) S.mcpServerData[server] = { calls: 0, tools: {}, lastSeen: null };
      S.mcpServerData[server].calls++;
      S.mcpServerData[server].tools[toolName] = (S.mcpServerData[server].tools[toolName] || 0) + 1;
      S.mcpServerData[server].lastSeen = entry.ts || entry.timestamp;
      S.mcpTotalCalls++;
    }
  }
  if (entry.skill_routed) {
    S.skillRouteData[entry.skill_routed] = (S.skillRouteData[entry.skill_routed] || 0) + 1;
    S.skillTotalRouted++;
  }
}
