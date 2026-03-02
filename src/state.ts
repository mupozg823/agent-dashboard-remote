// ── state.ts ── Central shared mutable state + constants
// All modules import S from here; no circular dependencies.

// ── Interfaces ──

export interface WorkerRole {
  name: string;
  color: string;
  agentType: string;
}

export interface FloorColors {
  wall: string[];
  floor: string[];
  accent: string;
}

export interface FloorDef {
  id: number;
  name: string;
  nameKo: string;
  colors: FloorColors;
}

export interface DeskDef {
  x: number;
  label: string;
  act: boolean;
  floor: number;
}

export interface CharDef {
  h: string;
  s: string;
  p: string;
  l: string;
  r: string;
  e: string;
  emoji: string;
}

export interface PipelineStatus {
  approves: number;
  denies: number;
  lastTool: string | null;
  lastToolTime: number;
}

export interface ToolStat {
  calls: number;
  errors: number;
  lastCmd: string;
  lastTime?: string;
}

export interface SparkData {
  ops: number[];
  errs: number[];
  lat: number[];
}

export interface GroupStat {
  total: number;
  errors: number;
}

export interface McpServerEntry {
  calls: number;
  tools: Record<string, number>;
  lastSeen: string | null;
}

export interface ConnParams {
  url: string;
  key: string;
  sessionId: string;
}

export interface SessionInfo {
  sessionId: string;
  hostname?: string;
  project?: string;
  toolProfile: Record<string, number>;
  dominantType: string;
  lastActivity: number;
  status: 'online' | 'idle' | 'offline';
}

export interface AgentLifecycle {
  phase: 'spawning' | 'alive' | 'despawning';
  progress: number;
  startTime: number;
}

export interface ProjectContext {
  name: string;
  language?: string;
  color?: string;
}

export interface CmdHistoryEntry {
  id: string;
  command: string;
  status: string;
  ts: Date;
  reason?: string;
  result?: unknown;
  exitCode?: number;
}

export interface FloorHit {
  fi: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ElevatorPacket {
  from: number;
  to: number;
  progress: number;
  speed: number;
  color: string;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  l: number;
  c: string;
  z: number;
  shape: string;
  rot: number;
  rv: number;
  sprite: PIXI.Sprite | null;
}

export interface WeatherParticle {
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  l: number;
  type: string;
  r: number;
  sprite: PIXI.Graphics | null;
}

export interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  size: number;
  life: number;
  vy: number;
  alpha: number;
  sprite: PIXI.Text | null;
}

export interface FloorTransition {
  from: number;
  to: number;
  progress: number;
  eased?: number;
  dir: number;
  fromBg: HTMLCanvasElement | null;
  fromSprite: PIXI.Sprite | null;
  startTime: number;
  _divLine?: PIXI.Graphics | null;
}

export interface OrchRun {
  state?: string;
  runId?: string;
  dag?: Array<{
    id: string;
    name?: string;
    status?: string;
    worker?: string;
    dependsOn?: string[];
    executor?: string;
  }>;
  total?: number;
  done?: number;
  steps?: { completed: number; total: number };
}

export interface WorkerInfo {
  role: string;
  status: string;
  stepName?: string;
}

export interface ServerMetrics {
  opsPerMin?: number;
  successRate?: number;
  blockRate?: number;
  errorCount?: number;
  total?: number;
  sessions?: number;
  durationMin?: number;
  groups?: Record<string, { count: number } | number>;
}

export interface LaneStats {
  pending: number;
  running: number;
  completed: number;
  failed?: number;
  locked?: boolean;
  error?: string;
}

export interface CodexMetrics {
  lastScore: number;        // -1 = 미검사
  lastGrade: string;
  totalChecks: number;
  totalIssues: number;
  history: Array<{ ts: number; score: number; grade: string }>;
  lastReport: {
    path: string;
    score: number;
    grade: string;
    checks: number;
    issues: number;
    filesScanned: number;
  } | null;
}

/** Agent instance (forward-declared to avoid circular dep with agents.ts) */
export interface AgentInstance {
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
  go(tk: string): void;
  up(): void;
  draw(w: number, h: number): void;
}

export interface DashboardState {
  // Supabase
  sbClient: SupabaseClient | null;
  channel: SupabaseChannel | null;
  // Display
  P: number;
  // Data
  entries: Record<string, unknown>[];
  fr: number;
  connected: boolean;
  lastET: number;
  serverMetrics: ServerMetrics | null;
  prevTotal: number;
  // PixiJS / Canvas
  pixiApp: PIXI.Application | null;
  pixiReady: boolean;
  buf: HTMLCanvasElement | null;
  cx: CanvasRenderingContext2D | null;
  bg: HTMLCanvasElement | null;
  bgW: number;
  bgH: number;
  dpr: number;
  L: {
    bg: PIXI.Container | null;
    weather: PIXI.Container | null;
    desks: PIXI.Container | null;
    agents: PIXI.Container | null;
    particles: PIXI.Container | null;
    hud: PIXI.Container | null;
    effects: PIXI.Container | null;
  };
  bgSprite: PIXI.Sprite | null;
  agentSprites: PIXI.Sprite[];
  deskSprites: PIXI.Sprite[];
  hudCanvas: HTMLCanvasElement | null;
  hudCx: CanvasRenderingContext2D | null;
  hudSprite: (PIXI.Sprite & { _tex?: PIXI.Texture }) | null;
  agentCanvases: HTMLCanvasElement[];
  deskCanvases: HTMLCanvasElement[];
  pixiPtexCache: Map<string, PIXI.Texture>;
  // Session
  sessionStart: number;
  // Pipeline status
  pipelineStatus: PipelineStatus;
  // Tool stats
  toolStats: Record<string, ToolStat>;
  // Floors
  currentFloor: number;
  viewMode: 'floor' | 'building';
  floorTransition: FloorTransition | null;
  elevatorPackets: ElevatorPacket[];
  buildingFloorHits: FloorHit[];
  swipeStartY: number;
  swipeStartTime: number;
  swipeActive: boolean;
  // Tick / Lane
  lastTick: number;
  relayUptime: number;
  lastLaneStats: LaneStats | null;
  lastLaneStatsTime: number;
  // Particles
  pts: Particle[];
  floatingTexts: FloatingText[];
  weatherParticles: WeatherParticle[];
  // Shake
  shakeFrames: number;
  shakeIntensity: number;
  // Render
  lastRender: number;
  hudPrev: number;
  hudWait: number;
  hudShow: number;
  // Narration
  nFull: string;
  nIdx: number;
  nTxt: string;
  nTm: ReturnType<typeof setInterval> | null;
  // Sparkline / Heatmap
  sparkData: SparkData;
  heatmap: Float32Array[];
  groupStats: Record<string, GroupStat>;
  // Activity
  activityHistory: number[];
  lastActivityPush: number;
  lastToolStart: number;
  // UI
  uiD: boolean;
  uiT: ReturnType<typeof setTimeout> | null;
  panelOpen: boolean;
  currentPanel: string;
  newLogCount: number;
  // Connection
  reconnectAttempts: number;
  reconnectTimer: ReturnType<typeof setTimeout> | null;
  agentOnline: boolean;
  connParams: ConnParams | null;
  orchRun: OrchRun | null;
  // Worker orchestration
  workers: Record<string, WorkerInfo>;
  workerStats: Record<string, number> | null;
  activeWorkerAgents: Record<string, string> | null;
  // SSE
  sseActive: boolean;
  sseSource: EventSource | null;
  ssePort: number;
  sseToken: string;
  sseMetricsTimer: ReturnType<typeof setInterval> | null;
  // Commands
  cmdHistory: CmdHistoryEntry[];
  // Building view
  buildingCanvas: HTMLCanvasElement | null;
  buildingCx2: CanvasRenderingContext2D | null;
  // Sheet
  sheetStartY: number;
  // MCP tracking
  mcpServerData: Record<string, McpServerEntry>;
  skillRouteData: Record<string, number>;
  mcpTotalCalls: number;
  skillTotalRouted: number;
  // Agents (set by agents.ts)
  agents: AgentInstance[];
  // Dynamic agent system
  sessionRegistry: Map<string, SessionInfo>;
  agentLifecycles: Map<number, AgentLifecycle>;
  projectContext: ProjectContext | null;
  maxAgents: number;
  fallbackMode: boolean;
  dynamicDesks: DeskDef[];
  // Internal error count
  _localErrors?: number;
  // Day overlay
  _dayOverlay?: PIXI.Graphics;
  // Codex Inspector
  codexMetrics: CodexMetrics;
  // Floor switch debounce
  lastFloorSwitch: number;
  floorSwitchTimer: ReturnType<typeof setTimeout> | null;
  // v8 event state
  codexExecStatus: { prompt: string; status: string; result?: string; startedAt: number } | null;
  codexSessions: Array<{ id: string; status: string; ts: number }>;
  steerHistory: Array<{ mode: string; message: string; ts: number }>;
  lifecycleStatus: Record<string, { health: string; from: string; ts: number }>;
  workflowRun: { id: string; pipeline: string; status: string; steps: Array<{ name: string; status: string; startedAt: number }>; startedAt: number } | null;
  acpSessions: Array<{ id: string; type: string; status: string; ts: number }>;
}

// ── Worker Roles (OpenClaw-style orchestration) ──
export const WORKER_ROLES: Record<string, WorkerRole> = {
  SUPERVISOR: { name: 'Supervisor', color: '#FFD700', agentType: 'commander' },
  BUILDER:    { name: 'Builder',    color: '#4488CC', agentType: 'architect' },
  VERIFIER:   { name: 'Verifier',   color: '#44AA44', agentType: 'inspector' },
  REVIEWER:   { name: 'Reviewer',   color: '#CC6644', agentType: 'inspector' },
};

// ── Shared mutable state ──
export const S: DashboardState = {
  // Supabase
  sbClient: null, channel: null,
  // Display
  P: window.innerWidth <= 600 ? 3 : 5,
  // Data
  entries: [], fr: 0, connected: false, lastET: 0,
  serverMetrics: null, prevTotal: 0,
  // PixiJS / Canvas
  pixiApp: null, pixiReady: false,
  buf: null, cx: null, bg: null, bgW: 0, bgH: 0, dpr: 1,
  L: { bg: null, weather: null, desks: null, agents: null, particles: null, hud: null, effects: null },
  bgSprite: null, agentSprites: [], deskSprites: [],
  hudCanvas: null, hudCx: null, hudSprite: null,
  agentCanvases: [], deskCanvases: [],
  pixiPtexCache: new Map(),
  // Session
  sessionStart: Date.now(),
  // Pipeline status
  pipelineStatus: { approves: 0, denies: 0, lastTool: null, lastToolTime: 0 },
  // Tool stats (per-tool: { calls, errors, lastCmd })
  toolStats: {},
  // Floors
  currentFloor: 0, viewMode: 'floor',
  floorTransition: null,
  elevatorPackets: [],
  buildingFloorHits: [],
  swipeStartY: 0, swipeStartTime: 0, swipeActive: false,
  // Tick / Lane
  lastTick: 0, relayUptime: 0, lastLaneStats: null, lastLaneStatsTime: 0,
  // Particles
  pts: [], floatingTexts: [], weatherParticles: [],
  // Shake
  shakeFrames: 0, shakeIntensity: 0,
  // Render
  lastRender: 0, hudPrev: 0, hudWait: 30, hudShow: 0,
  // Narration
  nFull: '', nIdx: 0, nTxt: '', nTm: null,
  // Sparkline / Heatmap
  sparkData: { ops: [], errs: [], lat: [] },
  heatmap: Array.from({ length: 7 }, () => new Float32Array(24)),
  groupStats: {},
  // Activity
  activityHistory: [], lastActivityPush: 0, lastToolStart: 0,
  // UI
  uiD: false, uiT: null, panelOpen: false, currentPanel: 'log', newLogCount: 0,
  // Connection
  reconnectAttempts: 0, reconnectTimer: null, agentOnline: false,
  connParams: null, orchRun: null,
  // Worker orchestration
  workers: {}, workerStats: null, activeWorkerAgents: null,
  // SSE
  sseActive: false, sseSource: null, ssePort: 0, sseToken: '', sseMetricsTimer: null,
  // Commands
  cmdHistory: [],
  // Building view
  buildingCanvas: null, buildingCx2: null,
  // Sheet
  sheetStartY: 0,
  // MCP tracking
  mcpServerData: {}, skillRouteData: {},
  mcpTotalCalls: 0, skillTotalRouted: 0,
  // Agents (populated by agents.ts)
  agents: [],
  // Dynamic agent system
  sessionRegistry: new Map(),
  agentLifecycles: new Map(),
  projectContext: null,
  maxAgents: 20,
  fallbackMode: true,
  dynamicDesks: [],
  // Codex Inspector
  codexMetrics: { lastScore: -1, lastGrade: '', totalChecks: 0, totalIssues: 0, history: [], lastReport: null },
  // Floor switch debounce
  lastFloorSwitch: 0,
  floorSwitchTimer: null,
  // v8 event state
  codexExecStatus: null,
  codexSessions: [],
  steerHistory: [],
  lifecycleStatus: {},
  workflowRun: null,
  acpSessions: [],
};

// Init group stats
const _groups = ['shell', 'file-io', 'edit', 'search', 'external', 'agent', 'other'];
_groups.forEach(g => { S.groupStats[g] = { total: 0, errors: 0 }; });

// ── Tool name translations ──
export const TK: Record<string, string> = {
  Bash: '터미널', Read: '파일읽기', Write: '파일쓰기', Edit: '코드편집',
  Grep: '패턴검색', Glob: '파일찾기', WebSearch: '웹검색', WebFetch: '웹수집',
  Task: '서브에이전트', Skill: '스킬', NotebookEdit: '노트북',
  TaskCreate: '태스크생성', TaskUpdate: '태스크갱신', TaskList: '태스크목록',
  TaskGet: '태스크조회', TaskOutput: '결과확인', TaskStop: '태스크중단',
  ToolSearch: '도구탐색', AskUserQuestion: '질의',
};

// ── Character definitions (architecture-synced 6 roles) ──
export const C: Record<string, CharDef> = {
  // 1F Execution — 실행 계층: Gateway + Orchestrator + CommandExecutor
  commander:  { h: '#D4AA55', s: '#C89040', p: '#A07838', l: 'Commander',  r: '제어 평면',  e: '>>', emoji: '⚡' },
  operator:   { h: '#6B8B60', s: '#5A7A50', p: '#486840', l: 'Operator',   r: '실행 엔진',  e: '>_', emoji: '🖥' },
  // 2F Analysis — 분석 계층: Code Intelligence + Audit Trail
  architect:  { h: '#7B9DC8', s: '#6A8AB8', p: '#5A78A0', l: 'Architect',  r: '코드 지능',  e: '</>', emoji: '🔧' },
  inspector:  { h: '#A880B8', s: '#9870A8', p: '#805890', l: 'Inspector',  r: '감사 분석',  e: '??', emoji: '🔬' },
  // 3F Connection — 연결 계층: Relay Bridge + Security Shield
  diplomat:   { h: '#E08868', s: '#D07858', p: '#B86848', l: 'Diplomat',   r: '통신 브릿지', e: '@>', emoji: '🧭' },
  guardian:   { h: '#58BEB8', s: '#48A8A0', p: '#389088', l: 'Guardian',   r: '보안 수호',  e: '::', emoji: '🛡' },
};

// ── Floor definitions ──
export const FLOORS: FloorDef[] = [
  { id: 0, name: '1F Execution', nameKo: '1F 실행 계층',
    colors: { wall: ['#F5F0E0', '#EDE5D0', '#E0D8C0'], floor: ['#88C880', '#70B868', '#5AA050'], accent: '#44DD66' } },
  { id: 1, name: '2F Analysis', nameKo: '2F 분석 계층',
    colors: { wall: ['#F0EAF5', '#E8DCF0', '#DDD0E8'], floor: ['#9988CC', '#8878BB', '#7768AA'], accent: '#8866CC' } },
  { id: 2, name: '3F Connection', nameKo: '3F 연결 계층',
    colors: { wall: ['#FFF0E5', '#FFDEC8', '#F5D0B0'], floor: ['#CC9966', '#BB8855', '#AA7744'], accent: '#FF8844' } },
];

export const AGENT_FLOOR: Record<string, number> = {
  commander: 0, operator: 0,
  architect: 1, inspector: 1,
  diplomat: 2, guardian: 2,
};
export const AT: string[] = ['commander', 'operator', 'architect', 'inspector', 'diplomat', 'guardian'];

export const DESKS: DeskDef[] = [
  { x: .35, label: 'Gateway', act: false, floor: 0 },
  { x: .65, label: 'Terminal', act: false, floor: 0 },
  { x: .35, label: 'CodeBase', act: false, floor: 1 },
  { x: .65, label: 'AuditLog', act: false, floor: 1 },
  { x: .35, label: 'Relay', act: false, floor: 2 },
  { x: .65, label: 'Security', act: false, floor: 2 },
];

// ── Tool particle colors ──
export const TOOL_COLORS: Record<string, string[]> = {
  Bash: ['#44DD66', '#22CC44', '#66FF88'],
  Read: ['#4488FF', '#6699FF', '#88BBFF'],
  Write: ['#FF6699', '#FF88AA', '#FF44CC'],
  Edit: ['#FFAA22', '#FFCC44', '#FF8800'],
  Grep: ['#44DDAA', '#66FFCC', '#22BB88'],
  Glob: ['#44DDAA', '#22BB88', '#88FFDD'],
  WebSearch: ['#AA88FF', '#CC99FF', '#8866DD'],
  WebFetch: ['#AA88FF', '#8866DD', '#CCAAFF'],
  Task: ['#FFDD44', '#FFE866', '#FFCC00'],
  ToolSearch: ['#88CCDD', '#66BBCC', '#AADDEE'],
};

// ── Tool group classification ──
export const GROUPS: Record<string, string> = {
  shell: '#44AA44', 'file-io': '#4488CC', edit: '#CC8800',
  search: '#44AAAA', external: '#AA44CC', agent: '#CCAA22', other: '#888888',
};

// ── Default sky colors for background ──
export const DEFAULT_SKY: string[] = ['#B8E8FF', '#D8F0FF', '#F0FAFF'];

// ── Narration templates ──
export const NR: Record<string, string[]> = {
  Bash: ['Shell: 터미널 명령 실행 중...', 'Shell: 시스템 호출 처리 중', 'Shell: 프로세스 실행 대기', 'Shell: 명령 결과 수집 중', 'Shell: 파이프라인 구성 중'],
  Read: ['Reader: 소스코드 분석 시작', 'Reader: 파일 내용 스캔 중', 'Reader: 구조 파악 중...', 'Reader: 의존성 추적 중', 'Reader: 모듈 분석 완료'],
  Write: ['Editor: 새 파일 생성 중', 'Editor: 코드 작성 시작', 'Editor: 보일러플레이트 생성', 'Editor: 파일 구조 설계 중'],
  Edit: ['Editor: 코드 패치 적용 중', 'Editor: 리팩토링 수행', 'Editor: 심볼 교체 중', 'Editor: diff 계산 중', 'Editor: 인라인 수정 반영'],
  Grep: ['Search: 정규식 패턴 매칭 중', 'Search: 코드베이스 스캔 중', 'Search: 일치 결과 수집 중', 'Search: 심층 검색 진행 중'],
  Glob: ['Search: 파일 시스템 탐색 중', 'Search: 패턴 매칭 파일 검색', 'Search: 디렉토리 트리 순회 중'],
  WebSearch: ['Web: 검색 엔진 쿼리 실행', 'Web: 최신 정보 수집 중', 'Web: 검색 결과 분석 중', 'Web: 글로벌 지식 탐색 중'],
  WebFetch: ['Web: 웹 페이지 다운로드 중', 'Web: HTML 파싱 처리 중', 'Web: 콘텐츠 추출 중', 'Web: API 응답 처리 중'],
  Task: ['Agent: 서브에이전트 디스패치!', 'Agent: 병렬 작업 분배 중', 'Agent: 에이전트 태스크 할당', 'Agent: 오케스트레이션 실행 중'],
  TaskCreate: ['Agent: 새 태스크 생성!', 'Agent: 작업 계획 수립 중'],
  TaskUpdate: ['Agent: 태스크 상태 업데이트', 'Agent: 진행 상황 기록 중'],
  ToolSearch: ['MCP: 도구 검색 실행 중', 'MCP: 확장 도구 탐색 중'],
  Skill: ['Skill: 스킬 실행 중!', 'Skill: 자동화 워크플로우 시작'],
  EnterPlanMode: ['Plan: 설계 모드 진입!', 'Plan: 아키텍처 분석 시작'],
  ExitPlanMode: ['Plan: 설계 완료, 실행 준비!'],
  deny: ['⚠ 차단: 위험 명령 감지됨!', '⚠ 차단: 정책 위반 감지', '⚠ 차단: 접근 거부됨'],
  idle: ['시스템 모니터링 대기 중...', '모든 에이전트 대기 상태', '다음 작업 대기 중...', '시스템 정상 운영 중'],
};

// ── MCP server list ──
export interface McpServerDef {
  id: string;
  label: string;
  desc: string;
  icon: string;
}

export const MCP_SERVERS: McpServerDef[] = [
  { id: 'serena', label: 'Serena', desc: '코드 심볼 탐색/수정', icon: '🔍' },
  { id: 'grep-app', label: 'grep.app', desc: '공개 저장소 검색', icon: '🌐' },
  { id: 'context7', label: 'Context7', desc: '라이브러리 문서', icon: '📚' },
  { id: 'filesystem', label: 'Filesystem', desc: '파일 시스템', icon: '📁' },
  { id: 'memory', label: 'Memory', desc: '지식 그래프', icon: '🧠' },
  { id: 'sequential-thinking', label: 'Thinking', desc: '복잡 추론', icon: '💭' },
  { id: 'claude_ai_Notion', label: 'Notion', desc: '노션 연동', icon: '📝' },
];

// ── Skill categories ──
export interface SkillCategory {
  id: string;
  label: string;
  color: string;
}

export const SKILL_CATEGORIES: SkillCategory[] = [
  { id: 'session', label: '세션', color: '#6B9A8E' },
  { id: 'quality', label: '품질', color: '#D4523C' },
  { id: 'debug', label: '디버그', color: '#CC3300' },
  { id: 'security', label: '보안', color: '#8B6F47' },
  { id: 'workflow', label: '워크플로', color: '#6666CC' },
  { id: 'devops', label: 'DevOps', color: '#44AA44' },
  { id: 'project', label: '프로젝트', color: '#CC6600' },
  { id: 'deps', label: '의존성', color: '#CCAA22' },
  { id: 'docs', label: '문서', color: '#4488AA' },
  { id: 'planning', label: '기획', color: '#AA88FF' },
  { id: 'research', label: '리서치', color: '#888888' },
  { id: 'system', label: '시스템', color: '#44CC44' },
  { id: 'report', label: '보고', color: '#BB6688' },
];

// ── SSE Ports ──
export const SSE_PORTS: number[] = [17891, 17892];
