// ── Pure Data Constants ──
export const P = window.innerWidth <= 600 ? 3 : 5;

// ── Floor System ──
export const FLOORS = [
  { id:0, name:'1F Coding Lab', nameKo:'1F 코딩 연구실',
    colors:{ wall:['#F0F8E8','#E4F0D8','#C0D8A0'], floor:['#5A9E50','#4D8A44','#3D7A35'], accent:'#44DD66' },
    deskDefs:[{rx:.35,label:'Shell',agentType:'bash'},{rx:.65,label:'Editor',agentType:'writer'}] },
  { id:1, name:'2F Analysis Center', nameKo:'2F 분석 센터',
    colors:{ wall:['#F0E8FF','#E4D8F8','#C0A8E0'], floor:['#7A6AAA','#6A5A9A','#5A4A8A'], accent:'#8866CC' },
    deskDefs:[{rx:.22,label:'Reader',agentType:'reader'},{rx:.50,label:'Search',agentType:'finder'},{rx:.78,label:'Serena',agentType:'serena'}] },
  { id:2, name:'3F Operations Hub', nameKo:'3F 운영 허브',
    colors:{ wall:['#FFF0E0','#F8E0C8','#E0C0A0'], floor:['#AA7744','#996633','#886622'], accent:'#FF8844' },
    deskDefs:[{rx:.22,label:'MCP',agentType:'mcp'},{rx:.50,label:'Agent',agentType:'agent'},{rx:.78,label:'Web',agentType:'web'}] },
];

export const AGENT_FLOOR = {bash:0,writer:0,reader:1,finder:1,serena:1,mcp:2,agent:2,web:2};

// ── Character Palette ──
export const C = {
  bash:{h:'#6644CC',s:'#4834D4',p:'#2A1B6A',l:'Shell',r:'명령실행',e:'$_',emoji:'🖥'},
  reader:{h:'#4488CC',s:'#0984E3',p:'#06527A',l:'Reader',r:'파일분석',e:'{}',emoji:'📖'},
  writer:{h:'#FF6699',s:'#D63031',p:'#8B1A1A',l:'Editor',r:'코드편집',e:'<>',emoji:'✏'},
  finder:{h:'#44AA88',s:'#00796B',p:'#004040',l:'Search',r:'패턴검색',e:'??',emoji:'🔍'},
  mcp:{h:'#44DDAA',s:'#00B894',p:'#006644',l:'MCP',r:'서버연동',e:'::',emoji:'🔌'},
  agent:{h:'#AA88FF',s:'#6C5CE7',p:'#3D2B8A',l:'Agent',r:'오케스트라',e:'>>',emoji:'🎯'},
  web:{h:'#FF88AA',s:'#E84393',p:'#8B2252',l:'Web',r:'웹리서치',e:'@',emoji:'🌐'},
  serena:{h:'#FFCC44',s:'#B8860B',p:'#6B4E00',l:'Serena',r:'심볼분석',e:'fn',emoji:'🌿'},
};

export const AT = ['bash','reader','writer','finder','mcp','agent','web','serena'];

// DESKS: indexed same as AT. Floor-local x positions.
export const DESKS = [
  {x:.35,label:'Shell',act:false,floor:0},    // bash   (AT[0])
  {x:.22,label:'Reader',act:false,floor:1},   // reader (AT[1])
  {x:.65,label:'Editor',act:false,floor:0},   // writer (AT[2])
  {x:.50,label:'Search',act:false,floor:1},   // finder (AT[3])
  {x:.22,label:'MCP',act:false,floor:2},      // mcp    (AT[4])
  {x:.50,label:'Agent',act:false,floor:2},    // agent  (AT[5])
  {x:.78,label:'Web',act:false,floor:2},      // web    (AT[6])
  {x:.78,label:'Serena',act:false,floor:1},   // serena (AT[7])
];

// ── Tool Labels ──
export const TK = {Bash:'터미널',Read:'파일읽기',Write:'파일쓰기',Edit:'코드편집',Grep:'패턴검색',Glob:'파일찾기',WebSearch:'웹검색',WebFetch:'웹수집',Task:'서브에이전트',Skill:'스킬',NotebookEdit:'노트북',TaskCreate:'태스크생성',TaskUpdate:'태스크갱신',TaskList:'태스크목록',TaskGet:'태스크조회',TaskOutput:'결과확인',TaskStop:'태스크중단',ToolSearch:'도구탐색',AskUserQuestion:'질의'};

export function tk(t){
  if(!t)return'대기';if(TK[t])return TK[t];
  if(t.startsWith('mcp__serena__'))return'Serena';if(t.startsWith('mcp__memory__'))return'메모리';
  if(t.startsWith('mcp__context7'))return'문서조회';if(t.startsWith('mcp__filesystem'))return'파일시스템';
  if(t.startsWith('mcp__grep'))return'코드검색';if(t.startsWith('mcp__seq'))return'추론';
  if(t.startsWith('mcp__'))return'MCP';return t;
}

// ── Tool Colors ──
export const TOOL_COLORS = {
  Bash:['#44DD66','#22CC44','#66FF88'],
  Read:['#4488FF','#6699FF','#88BBFF'],
  Write:['#FF6699','#FF88AA','#FF44CC'],
  Edit:['#FFAA22','#FFCC44','#FF8800'],
  Grep:['#44DDAA','#66FFCC','#22BB88'],
  Glob:['#44DDAA','#22BB88','#88FFDD'],
  WebSearch:['#AA88FF','#CC99FF','#8866DD'],
  WebFetch:['#AA88FF','#8866DD','#CCAAFF'],
  Task:['#FFDD44','#FFE866','#FFCC00'],
  ToolSearch:['#88CCDD','#66BBCC','#AADDEE'],
};

// ── Narration Pools ──
export const NR = {
  Bash:['Shell: 터미널 명령 실행 중...','Shell: 시스템 호출 처리 중','Shell: 프로세스 실행 대기','Shell: 명령 결과 수집 중','Shell: 파이프라인 구성 중'],
  Read:['Reader: 소스코드 분석 시작','Reader: 파일 내용 스캔 중','Reader: 구조 파악 중...','Reader: 의존성 추적 중','Reader: 모듈 분석 완료'],
  Write:['Editor: 새 파일 생성 중','Editor: 코드 작성 시작','Editor: 보일러플레이트 생성','Editor: 파일 구조 설계 중'],
  Edit:['Editor: 코드 패치 적용 중','Editor: 리팩토링 수행','Editor: 심볼 교체 중','Editor: diff 계산 중','Editor: 인라인 수정 반영'],
  Grep:['Search: 정규식 패턴 매칭 중','Search: 코드베이스 스캔 중','Search: 일치 결과 수집 중','Search: 심층 검색 진행 중'],
  Glob:['Search: 파일 시스템 탐색 중','Search: 패턴 매칭 파일 검색','Search: 디렉토리 트리 순회 중'],
  WebSearch:['Web: 검색 엔진 쿼리 실행','Web: 최신 정보 수집 중','Web: 검색 결과 분석 중','Web: 글로벌 지식 탐색 중'],
  WebFetch:['Web: 웹 페이지 다운로드 중','Web: HTML 파싱 처리 중','Web: 콘텐츠 추출 중','Web: API 응답 처리 중'],
  Task:['Agent: 서브에이전트 디스패치!','Agent: 병렬 작업 분배 중','Agent: 에이전트 태스크 할당','Agent: 오케스트레이션 실행 중'],
  TaskCreate:['Agent: 새 태스크 생성!','Agent: 작업 계획 수립 중'],
  TaskUpdate:['Agent: 태스크 상태 업데이트','Agent: 진행 상황 기록 중'],
  ToolSearch:['MCP: 도구 검색 실행 중','MCP: 확장 도구 탐색 중'],
  Skill:['Skill: 스킬 실행 중!','Skill: 자동화 워크플로우 시작'],
  EnterPlanMode:['Plan: 설계 모드 진입!','Plan: 아키텍처 분석 시작'],
  ExitPlanMode:['Plan: 설계 완료, 실행 준비!'],
  deny:['⚠ 차단: 위험 명령 감지됨!','⚠ 차단: 정책 위반 감지','⚠ 차단: 접근 거부됨'],
  idle:['시스템 모니터링 대기 중...','모든 에이전트 대기 상태','다음 작업 대기 중...','시스템 정상 운영 중'],
};

// ── Achievements ──
export const ACHIEVEMENTS = [
  {id:'first',name:'첫 번째 작업',desc:'첫 도구 실행',cond:s=>s.entries.length>=1},
  {id:'combo5',name:'콤보 5!',desc:'5연속 성공',cond:s=>s.maxCombo>=5},
  {id:'combo10',name:'콤보 마스터',desc:'10연속 성공',cond:s=>s.maxCombo>=10},
  {id:'ops50',name:'50작업 돌파',desc:'총 50회 도구 실행',cond:s=>s.entries.length>=50},
  {id:'ops100',name:'백전노장',desc:'총 100회 도구 실행',cond:s=>s.entries.length>=100},
  {id:'deny0',name:'무결점',desc:'차단 0으로 50작업',cond:s=>s.entries.length>=50&&s.entries.filter(e=>e.decision==='deny').length===0},
  {id:'alltools',name:'만능 도구',desc:'5종류 이상 도구 사용',cond:s=>new Set(s.entries.map(e=>e.tool).filter(Boolean)).size>=5},
  {id:'night',name:'야간 근무',desc:'밤 10시 이후 작업',cond:()=>new Date().getHours()>=22},
];
