// ── state.js ── Central shared mutable state + constants
// All modules import S from here; no circular dependencies.

// ── Worker Roles (OpenClaw-style orchestration) ──
export const WORKER_ROLES = {
  SUPERVISOR: { name: 'Supervisor', color: '#FFD700', agentType: 'agent' },
  BUILDER:    { name: 'Builder',    color: '#4488CC', agentType: 'writer' },
  VERIFIER:   { name: 'Verifier',   color: '#44AA44', agentType: 'finder' },
  REVIEWER:   { name: 'Reviewer',   color: '#CC6644', agentType: 'reader' },
};

// ── Shared mutable state ──
export const S = {
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
};

// Init group stats
const _groups = ['shell', 'file-io', 'edit', 'search', 'external', 'agent', 'other'];
_groups.forEach(g => { S.groupStats[g] = { total: 0, errors: 0 }; });

// ── Tool name translations ──
export const TK = {
  Bash: '터미널', Read: '파일읽기', Write: '파일쓰기', Edit: '코드편집',
  Grep: '패턴검색', Glob: '파일찾기', WebSearch: '웹검색', WebFetch: '웹수집',
  Task: '서브에이전트', Skill: '스킬', NotebookEdit: '노트북',
  TaskCreate: '태스크생성', TaskUpdate: '태스크갱신', TaskList: '태스크목록',
  TaskGet: '태스크조회', TaskOutput: '결과확인', TaskStop: '태스크중단',
  ToolSearch: '도구탐색', AskUserQuestion: '질의',
};

// ── Character definitions ──
export const C = {
  bash:   { h: '#6644CC', s: '#4834D4', p: '#2A1B6A', l: 'Shell',  r: '명령실행', e: '$_', emoji: '🖥' },
  reader: { h: '#4488CC', s: '#0984E3', p: '#06527A', l: 'Reader', r: '파일분석', e: '{}', emoji: '📖' },
  writer: { h: '#FF6699', s: '#D63031', p: '#8B1A1A', l: 'Editor', r: '코드편집', e: '<>', emoji: '✏' },
  finder: { h: '#44AA88', s: '#00796B', p: '#004040', l: 'Search', r: '패턴검색', e: '??', emoji: '🔍' },
  mcp:    { h: '#44DDAA', s: '#00B894', p: '#006644', l: 'MCP',    r: '서버연동', e: '::', emoji: '🔌' },
  agent:  { h: '#AA88FF', s: '#6C5CE7', p: '#3D2B8A', l: 'Agent',  r: '오케스트라', e: '>>', emoji: '🎯' },
  web:    { h: '#FF88AA', s: '#E84393', p: '#8B2252', l: 'Web',    r: '웹리서치', e: '@',  emoji: '🌐' },
  serena: { h: '#FFCC44', s: '#B8860B', p: '#6B4E00', l: 'Serena', r: '심볼분석', e: 'fn', emoji: '🌿' },
};

// ── Floor definitions ──
export const FLOORS = [
  { id: 0, name: '1F Execution', nameKo: '1F 실행 계층',
    colors: { wall: ['#F0F8E8', '#E4F0D8', '#C0D8A0'], floor: ['#5A9E50', '#4D8A44', '#3D7A35'], accent: '#44DD66' } },
  { id: 1, name: '2F Analysis', nameKo: '2F 분석 계층',
    colors: { wall: ['#F0E8FF', '#E4D8F8', '#C0A8E0'], floor: ['#7A6AAA', '#6A5A9A', '#5A4A8A'], accent: '#8866CC' } },
  { id: 2, name: '3F Connection', nameKo: '3F 연결 계층',
    colors: { wall: ['#FFF0E0', '#F8E0C8', '#E0C0A0'], floor: ['#AA7744', '#996633', '#886622'], accent: '#FF8844' } },
];

export const AGENT_FLOOR = { bash: 0, writer: 0, reader: 1, finder: 1, serena: 1, mcp: 2, agent: 2, web: 2 };
export const AT = ['bash', 'reader', 'writer', 'finder', 'mcp', 'agent', 'web', 'serena'];

export const DESKS = [
  { x: .35, label: 'Shell', act: false, floor: 0 }, { x: .19, label: 'Reader', act: false, floor: 1 },
  { x: .65, label: 'Editor', act: false, floor: 0 }, { x: .43, label: 'Search', act: false, floor: 1 },
  { x: .22, label: 'MCP', act: false, floor: 2 },    { x: .50, label: 'Agent', act: false, floor: 2 },
  { x: .78, label: 'Web', act: false, floor: 2 },    { x: .78, label: 'Serena', act: false, floor: 1 },
];

// ── Tool particle colors ──
export const TOOL_COLORS = {
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
export const GROUPS = {
  shell: '#44AA44', 'file-io': '#4488CC', edit: '#CC8800',
  search: '#44AAAA', external: '#AA44CC', agent: '#CCAA22', other: '#888888',
};

// ── Default sky colors for background ──
export const DEFAULT_SKY = ['#88DDFF', '#BBEEFF', '#E0F8FF'];

// ── Narration templates ──
export const NR = {
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
export const MCP_SERVERS = [
  { id: 'serena', label: 'Serena', desc: '코드 심볼 탐색/수정', icon: '🔍' },
  { id: 'grep-app', label: 'grep.app', desc: '공개 저장소 검색', icon: '🌐' },
  { id: 'context7', label: 'Context7', desc: '라이브러리 문서', icon: '📚' },
  { id: 'filesystem', label: 'Filesystem', desc: '파일 시스템', icon: '📁' },
  { id: 'memory', label: 'Memory', desc: '지식 그래프', icon: '🧠' },
  { id: 'sequential-thinking', label: 'Thinking', desc: '복잡 추론', icon: '💭' },
  { id: 'claude_ai_Notion', label: 'Notion', desc: '노션 연동', icon: '📝' },
];

// ── Skill categories ──
export const SKILL_CATEGORIES = [
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
export const SSE_PORTS = [17891, 17892];
