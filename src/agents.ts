// ── agents.ts ── Agent state machine (Ag class) and agents array
import { S, C, DESKS, AGENT_FLOOR, AT } from './state.ts';
import { spawnP, cW, cH, drawCh } from './renderer-views.ts';
import { getActivityIntensity } from './utils.ts';
import type { AgentInstance } from './state.ts';

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

  constructor(t: string, i: number) {
    this.t = t; this.i = i; this.floor = AGENT_FLOOR[t] || 0;
    this.x = DESKS[i].x + (Math.random() - .5) * .02; this.y = .78; this.tx = this.x; this.ty = this.y;
    this.d = 1; this.st = 'idle'; this.wf = Math.random() * 100; this.tk = ''; this.wt = 0; this.di = -1;
    this.tot = 0;
  }

  go(tk: string): void {
    this.di = this.i; const d = DESKS[this.i];
    this.tx = d.x + (Math.random() - .5) * .02; this.ty = .48;
    this.st = 'walk'; this.tk = tk; this.wt = 60 + Math.random() * 80;
    this.tot++;
    DESKS[this.i].act = true;
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
        DESKS[this.i].act = false; this.tk = '';
        spawnP(DESKS[this.i].x * cW(), cH() * .55, 5);
        this.tx = DESKS[this.i].x + (Math.random() - .5) * .03; this.ty = .78 + Math.random() * .03;
        this.st = 'walk'; this.di = -1;
      }
    } else {
      // Idle wandering
      if (Math.random() < .003) {
        this.tx = DESKS[this.i].x + (Math.random() - .5) * .04;
        this.ty = Math.max(.73, Math.min(.84, this.y + (Math.random() - .5) * .03)); this.st = 'walk';
      }
      if (Math.random() < .005) this.d = this.d > 0 ? -1 : 1;
    }
  }

  draw(w: number, h: number): void {
    drawCh(this.x * w, this.y * h, this.t, this.wf, this.d, this.st === 'work', this.st === 'work' ? this.tk : '', this);
  }
}

// ── Instantiate agents array ──
export const agents: Ag[] = AT.map((t, i) => new Ag(t, i));

// Wire into shared state so other modules can access via S.agents
S.agents = agents;
