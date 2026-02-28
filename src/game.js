// ── Game Engine: Drawing, Agents, Render, Floors ──
import { P, C, AT, DESKS, FLOORS, AGENT_FLOOR, TOOL_COLORS, NR } from './config.js';
import { S, cW, cH, spawnP, narr, toast, pick, getActivityIntensity, triggerShake } from './state.js';

// ══════════════════════════════════════════
// ── KAIROSOFT-STYLE CHARACTER DRAWING ──
// ══════════════════════════════════════════
export function drawCh(px,py,type,wf,dir,work,bub,ag){
  const c=C[type]||C.agent, s=P, cx=S.cx;
  const OL='#1A1A0A',SK='#FFD8B0',SK2='#EEBB88';
  const idle=ag&&ag.st==='idle', mood=ag?ag.mood:0;
  if(work){
    const bob=Math.sin(S.fr*.15)*.5, y=py+bob;
    const tL=Math.sin(S.fr*.5)*1, tR=Math.sin(S.fr*.5+3.14)*1;
    cx.fillStyle=c.s;
    cx.fillRect(px-5*s,y+3*s+tL,2*s,2.5*s);cx.fillRect(px+3*s,y+3*s+tR,2*s,2.5*s);
    cx.fillStyle=SK;cx.fillRect(px-5*s,y+5*s+tL,2*s,s);cx.fillRect(px+3*s,y+5*s+tR,2*s,s);
    cx.fillStyle=OL;cx.fillRect(px-4*s-1,y+1.5*s-1,8*s+2,4*s+2);
    cx.fillStyle=c.s;cx.fillRect(px-4*s,y+1.5*s,8*s,4*s);
    cx.fillStyle='#FFF';cx.fillRect(px-1.5*s,y+1.5*s,3*s,s);
    cx.fillStyle=OL;cx.fillRect(px-5*s-1,y-5.5*s-1,10*s+2,7*s+2);
    cx.fillStyle=SK;cx.fillRect(px-5*s,y-5.5*s,10*s,7*s);
    cx.fillStyle='#FFAA8840';cx.fillRect(px-4.5*s,y-1*s,2*s,1.5*s);cx.fillRect(px+2.5*s,y-1*s,2*s,1.5*s);
    cx.fillStyle=OL;cx.fillRect(px-5.5*s-1,y-7*s-1,11*s+2,3.5*s+2);
    cx.fillStyle=c.h;cx.fillRect(px-5.5*s,y-7*s,11*s,3.5*s);
    cx.fillRect(px-5.5*s,y-4*s,2*s,2.5*s);cx.fillRect(px+3.5*s,y-4*s,2*s,2.5*s);
    if(S.fr%100<97){
      cx.fillStyle='#FFF';cx.fillRect(px-3.5*s,y-3.5*s,3*s,2.5*s);cx.fillRect(px+.5*s,y-3.5*s,3*s,2.5*s);
      cx.fillStyle='#000';cx.fillRect(px-2.5*s,y-3*s,1.8*s,1.8*s);cx.fillRect(px+1.2*s,y-3*s,1.8*s,1.8*s);
      cx.fillStyle='#FFF';cx.fillRect(px-2.2*s,y-3*s,s*.6,s*.6);cx.fillRect(px+1.5*s,y-3*s,s*.6,s*.6);
    }else{
      cx.fillStyle='#000';cx.fillRect(px-3.5*s,y-2.5*s,3*s,s*.5);cx.fillRect(px+.5*s,y-2.5*s,3*s,s*.5);
    }
    cx.fillStyle='#CC6644';cx.fillRect(px-s*.5,y,S.fr%60<10?2*s:s,s*.5);
    drawAccessory(px,y,type,s,true);
    if(ag&&ag.wt>60){const sw=((S.fr*2)%25);cx.globalAlpha=1-sw/25;cx.fillStyle='#88CCFF';cx.fillRect(px+5*s,y-5*s+sw*.5,s*.5,s*.8);cx.globalAlpha=1;}
    drawWorkFx(px,y,type,s);
    drawStatusIcon(px+6.5*s,y-7*s,'gear');
    if(bub) drawBub(px,y-9*s,bub);
    drawNameTag(px,py+8*s,c);
    return;
  }
  // ═══ STANDING / WALKING ═══
  const bounce=Math.sin(wf*.3)*1, y=py+bounce;
  const walk=ag&&ag.st==='walk';
  const step=walk?Math.sin(wf*.35)*2:Math.sin(wf*.08)*.5;
  cx.fillStyle='#00000020';cx.fillRect(px-4*s,y+8.5*s,8*s,1.5*s);
  cx.fillStyle=OL;cx.fillRect(px-2.5*s,y+7*s+(step>0?-s*.5:0),2*s,2*s);cx.fillRect(px+.5*s,y+7*s+(step<0?-s*.5:0),2*s,2*s);
  cx.fillStyle=c.p;cx.fillRect(px-2.3*s,y+7.2*s+(step>0?-s*.5:0),1.6*s,1.5*s);cx.fillRect(px+.7*s,y+7.2*s+(step<0?-s*.5:0),1.6*s,1.5*s);
  cx.fillStyle=OL;cx.fillRect(px-2.5*s-1,y+5.5*s-1,5*s+2,2*s+2);
  cx.fillStyle=c.p;cx.fillRect(px-2.5*s,y+5.5*s,5*s,2*s);
  cx.fillStyle=OL;cx.fillRect(px-3.5*s-1,y+2*s-1,7*s+2,4*s+2);
  cx.fillStyle=c.s;cx.fillRect(px-3.5*s,y+2*s,7*s,4*s);
  cx.fillStyle='#FFF';cx.fillRect(px-1.2*s,y+2*s,2.4*s,s*.8);
  let armL=step*.3, armR=-step*.3;
  if(idle&&mood===1){armL=-2;armR=-2}
  if(idle&&mood===3){armR=-3}
  cx.fillStyle=OL;
  cx.fillRect(px-4.5*s-1,y+2.5*s+armL-1,1.5*s+2,3.5*s+2);cx.fillRect(px+3*s-1,y+2.5*s+armR-1,1.5*s+2,3.5*s+2);
  cx.fillStyle=c.s;cx.fillRect(px-4.5*s,y+2.5*s+armL,1.5*s,3.5*s);cx.fillRect(px+3*s,y+2.5*s+armR,1.5*s,3.5*s);
  cx.fillStyle=SK;cx.fillRect(px-4.5*s,y+5.5*s+armL,1.5*s,1.2*s);cx.fillRect(px+3*s,y+5.5*s+armR,1.5*s,1.2*s);
  if(idle&&mood===3){
    cx.fillStyle='#FFF';cx.fillRect(px+3.5*s,y+2*s+armR,2*s,2.5*s);
    cx.fillStyle='#8B6914';cx.fillRect(px+3.5*s,y+2*s+armR,2*s,.4*s);
    cx.fillStyle='#6B3A1A';cx.fillRect(px+3.7*s,y+2.4*s+armR,1.6*s,1.6*s);
    if(S.fr%40<25){cx.globalAlpha=.4;cx.fillStyle='#FFF';cx.fillRect(px+4*s,y+1.2*s+armR-Math.sin(S.fr*.1)*s,s*.4,s*.7);cx.fillRect(px+4.5*s,y+.8*s+armR-Math.cos(S.fr*.12)*s,s*.3,s*.5);cx.globalAlpha=1}
  }
  let headOff=0;
  if(idle&&mood===2)headOff=Math.sin(S.fr*.04)*2;
  cx.fillStyle=OL;cx.fillRect(px-5*s-1+headOff,y-5*s-1,10*s+2,7*s+2);
  cx.fillStyle=SK;cx.fillRect(px-5*s+headOff,y-5*s,10*s,7*s);
  cx.fillStyle='#FFAA8840';cx.fillRect(px-4.5*s+headOff,y-.5*s,2*s,1.5*s);cx.fillRect(px+2.5*s+headOff,y-.5*s,2*s,1.5*s);
  cx.fillStyle=OL;cx.fillRect(px-5.5*s-1+headOff,y-6.5*s-1,11*s+2,3.5*s+2);
  cx.fillStyle=c.h;cx.fillRect(px-5.5*s+headOff,y-6.5*s,11*s,3.5*s);
  cx.fillRect(px-5.5*s+headOff,y-3.5*s,2*s,2.5*s);cx.fillRect(px+3.5*s+headOff,y-3.5*s,2*s,2.5*s);
  const blk=S.fr%180>=176;
  if(!blk&&!(idle&&mood===4)){
    const ex=dir>0?s*.3:dir<0?-s*.3:0;
    cx.fillStyle='#FFF';cx.fillRect(px-3.5*s+headOff,y-3*s,3*s,2.5*s);cx.fillRect(px+.5*s+headOff,y-3*s,3*s,2.5*s);
    cx.fillStyle='#222';cx.fillRect(px-2.5*s+ex+headOff,y-2.5*s,1.8*s,1.8*s);cx.fillRect(px+1.2*s+ex+headOff,y-2.5*s,1.8*s,1.8*s);
    cx.fillStyle='#FFF';cx.fillRect(px-2.2*s+ex+headOff,y-2.5*s,s*.6,s*.6);cx.fillRect(px+1.5*s+ex+headOff,y-2.5*s,s*.6,s*.6);
  }else if(idle&&mood===4){
    cx.fillStyle='#FFF';cx.fillRect(px-3.5*s+headOff,y-2.5*s,3*s,1.2*s);cx.fillRect(px+.5*s+headOff,y-2.5*s,3*s,1.2*s);
    cx.fillStyle='#222';cx.fillRect(px-2.5*s+headOff,y-2*s,1.5*s,s*.8);cx.fillRect(px+1.2*s+headOff,y-2*s,1.5*s,s*.8);
  }else{
    cx.fillStyle='#222';cx.fillRect(px-3*s+headOff,y-1.8*s,2.5*s,s*.4);cx.fillRect(px+.5*s+headOff,y-1.8*s,2.5*s,s*.4);
  }
  cx.fillStyle='#CC6644';
  if(idle&&mood===4){cx.fillRect(px-.5*s+headOff,y+.5*s,s*1.2,s*.8)}
  else if(idle&&mood===1){cx.fillRect(px-s+headOff,y+.5*s,2*s,s*.3);cx.fillRect(px-.5*s+headOff,y+.7*s,s,s*.2)}
  else if(walk){cx.fillRect(px-.3*s+headOff,y+.5*s,s*.6,s*.4)}
  else{cx.fillRect(px-.5*s+headOff,y+.5*s,s,s*.4)}
  drawAccessory(px+headOff,y,type,s,false);
  if(idle){
    if(mood===4) drawStatusIcon(px+6*s,y-7*s,'zzz');
    else if(mood===0) drawStatusIcon(px+6*s,y-7*s,'idle');
  }
  if(ag&&ag.compFx>0){cx.globalAlpha=ag.compFx/20;cx.fillStyle='#FFD080';cx.fillRect(px-6*s,y-7*s,12*s,16*s);cx.globalAlpha=1;}
  drawNameTag(px,y+9*s,c);
}

function drawAccessory(px,y,type,s,sitting){
  const cx=S.cx;
  switch(type){
    case 'bash':cx.fillStyle='#333';cx.fillRect(px-5.8*s,y-4*s,1.2*s,3*s);cx.fillRect(px+4.6*s,y-4*s,1.2*s,3*s);cx.fillStyle='#555';cx.fillRect(px-4*s,y-7.5*s,8*s,s*.8);break;
    case 'reader':cx.fillStyle='#8B6914';cx.fillRect(px-4*s,y-3.2*s,3.2*s,s*.4);cx.fillRect(px+.8*s,y-3.2*s,3.2*s,s*.4);cx.fillRect(px-4*s,y-3.2*s,s*.3,2.5*s);cx.fillRect(px-.8*s,y-3.2*s,s*.3,2.5*s);cx.fillRect(px+.8*s,y-3.2*s,s*.3,2.5*s);cx.fillRect(px+3.7*s,y-3.2*s,s*.3,2.5*s);cx.fillRect(px-.8*s,y-2.5*s,1.6*s,s*.3);break;
    case 'writer':cx.fillStyle='#CC2244';cx.fillRect(px-5*s,y-7.5*s,10*s,2*s);cx.fillStyle='#FF4466';cx.fillRect(px-5*s,y-7.5*s,10*s,s*.6);cx.fillRect(px-s*.5,y-8*s,s,s);break;
    case 'finder':cx.fillStyle='#556B2F';cx.fillRect(px-5.5*s,y-7*s,11*s,1.5*s);cx.fillRect(px-6*s,y-5.8*s,3*s,s);break;
    case 'mcp':cx.fillStyle='#44DDAA';cx.fillRect(px-.2*s,y-8.5*s,s*.4,2*s);cx.fillStyle='#00FF88';cx.fillRect(px-.5*s,y-9*s,s,s);if(S.fr%30<15){cx.fillStyle='#00FF8860';cx.fillRect(px-s,y-9.5*s,2*s,2*s)}break;
    case 'agent':if(!sitting){cx.fillStyle='#CC3300';cx.fillRect(px-.5*s,y+2.8*s,s,2.5*s);cx.fillRect(px-.8*s,y+2.5*s,1.6*s,s*.6)}break;
    case 'web':cx.fillStyle='#333';cx.fillRect(px-5.8*s,y-4*s,1.2*s,2.5*s);cx.fillStyle='#444';cx.fillRect(px-6.5*s,y-2*s,2*s,1.5*s);cx.fillRect(px-6.5*s,y-2*s,s*.3,2*s);break;
    case 'serena':cx.fillStyle='#FFD700';cx.fillRect(px+3*s,y-6*s,2.5*s,1.5*s);cx.fillStyle='#FFA500';cx.fillRect(px+3.8*s,y-6*s,s*.8,1.5*s);break;
  }
}

function drawNameTag(px,y,c){
  const cx=S.cx, nm=c.l;
  cx.font='bold 11px -apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans KR",sans-serif';cx.textAlign='center';
  const nw=cx.measureText(nm).width+14, tx=px-nw/2, ty=y, th=16, r=4;
  cx.fillStyle='#00000018';
  cx.beginPath();cx.moveTo(tx+r+1,ty+1);cx.lineTo(tx+nw-r+1,ty+1);cx.arc(tx+nw-r+1,ty+r+1,r,-Math.PI/2,0);cx.lineTo(tx+nw+1,ty+th-r+1);cx.arc(tx+nw-r+1,ty+th-r+1,r,0,Math.PI/2);cx.lineTo(tx+r+1,ty+th+1);cx.arc(tx+r+1,ty+th-r+1,r,Math.PI/2,Math.PI);cx.lineTo(tx+1,ty+r+1);cx.arc(tx+r+1,ty+r+1,r,Math.PI,3*Math.PI/2);cx.fill();
  cx.fillStyle=c.p;
  cx.beginPath();cx.moveTo(tx+r,ty);cx.lineTo(tx+nw-r,ty);cx.arc(tx+nw-r,ty+r,r,-Math.PI/2,0);cx.lineTo(tx+nw,ty+th-r);cx.arc(tx+nw-r,ty+th-r,r,0,Math.PI/2);cx.lineTo(tx+r,ty+th);cx.arc(tx+r,ty+th-r,r,Math.PI/2,Math.PI);cx.lineTo(tx,ty+r);cx.arc(tx+r,ty+r,r,Math.PI,3*Math.PI/2);cx.fill();
  cx.strokeStyle='#00000030';cx.lineWidth=1;cx.stroke();
  cx.fillStyle='#FFFFFFEE';cx.fillText(nm,px,y+12);
}

function drawWorkFx(px,y,type,s){
  const cx=S.cx, fr=S.fr;
  cx.font='bold 9px monospace';cx.textAlign='center';
  const phase=fr*.12;
  switch(type){
    case 'bash':['$_','>_','OK','#!','~~'].forEach((ch,i)=>{const fy=((fr*2+i*25)%70);cx.globalAlpha=1-fy/70;cx.fillStyle='#44DD66';cx.fillText(ch,px+(Math.sin(i*2.1)*3-1)*s,y-8*s-fy*.4)});break;
    case 'reader':for(let i=0;i<2;i++){const fy=((fr*1.5+i*40)%60);cx.globalAlpha=.8-fy/75;cx.fillStyle='#FFF';cx.fillRect(px+(i*2-1)*5*s,y-9*s-fy*.3,3*s,3.5*s);cx.fillStyle='#6688CC';for(let j=0;j<3;j++)cx.fillRect(px+(i*2-1)*5*s+s*.3,y-8.5*s+j*s-fy*.3,2.2*s,s*.25)}break;
    case 'writer':['</>','{;}','fn(','//!','==='].forEach((ch,i)=>{const fy=((fr*2.2+i*20)%65);cx.globalAlpha=1-fy/65;cx.fillStyle=['#FF6699','#FFAA22','#88BBFF','#44DD66','#CC88FF'][i];cx.fillText(ch,px+(Math.sin(i*1.7)*3.5)*s,y-8*s-fy*.35)});break;
    case 'finder':['??','>>','**','..','!!'].forEach((ch,i)=>{const fy=((fr*1.8+i*22)%60);cx.globalAlpha=1-fy/60;cx.fillStyle='#44AA88';cx.fillText(ch,px+(Math.cos(i*1.4)*3)*s,y-8*s-fy*.35)});break;
    case 'mcp':for(let i=0;i<4;i++){const ang=phase+i*Math.PI/2,r=(3+Math.sin(fr*.08+i)*1.5)*s;cx.globalAlpha=.5+Math.sin(fr*.1+i)*.3;cx.fillStyle='#44DDAA';cx.fillRect(px+Math.cos(ang)*r-s*.4,y-8*s+Math.sin(ang)*r-s*.4,s*.8,s*.8)}cx.globalAlpha=1;cx.fillStyle='#00FF88';cx.fillRect(px-s*.5,y-8.5*s,s,s);break;
    case 'agent':['>>','>>','>>'].forEach((_,i)=>{const fx=((fr*3+i*30)%80)-40;cx.globalAlpha=1-Math.abs(fx)/40;cx.fillStyle='#AA88FF';cx.fillRect(px+fx*.5,y-8*s-i*2*s,s*1.5,s*.8)});break;
    case 'web':['@','://','GET','200','www'].forEach((ch,i)=>{const fy=((fr*2+i*18)%55);cx.globalAlpha=1-fy/55;cx.fillStyle='#FF88AA';cx.fillText(ch,px+(Math.sin(i*2.3)*3)*s,y-8*s-fy*.35)});break;
    case 'serena':cx.fillStyle='#B8860B';cx.globalAlpha=.7;cx.fillRect(px-s*.3,y-11*s,s*.6,4*s);[[-2,-2],[2,-2.5],[-1.5,-3.5],[1.5,-4],[0,-5]].forEach(([bx,by],i)=>{cx.fillStyle=['#44AA44','#228B22','#66CC66','#44AA44','#88DD88'][i];cx.globalAlpha=.5+Math.sin(fr*.06+i)*.3;cx.fillRect(px+bx*s,y-11*s+by*s,s*1.2,s*1.2)});break;
  }
  cx.globalAlpha=1;
}

function drawStatusIcon(x,y,type){
  const cx=S.cx, fr=S.fr;
  if(type==='gear'){const gfr=fr*.08;cx.fillStyle='#FFD080';for(let i=0;i<6;i++){const a=gfr+i*Math.PI/3,r=3.5;cx.fillRect(x+Math.cos(a)*r-1.5,y+Math.sin(a)*r-1.5,3,3)}cx.fillStyle='#8B6914';cx.fillRect(x-2,y-2,4,4)}
  else if(type==='zzz'){cx.font='bold 10px monospace';cx.textAlign='left';const z=((fr>>4)%3);cx.globalAlpha=.6;cx.fillStyle='#8888CC';if(z>=0)cx.fillText('z',x,y);if(z>=1)cx.fillText('z',x+5,y-6);if(z>=2)cx.fillText('Z',x+9,y-13);cx.globalAlpha=1}
  else if(type==='idle'){cx.fillStyle='#AAAAAA';const dp=(fr>>3)%4;for(let i=0;i<3;i++){cx.globalAlpha=i<=dp?.6:.15;cx.fillRect(x+i*4,y,2,2)}cx.globalAlpha=1}
}

function drawBub(x,y,t){
  const cx=S.cx, d=t.length>18?t.slice(0,18)+'...':t;
  cx.font='bold 13px -apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans KR",sans-serif';
  const tw=cx.measureText(d).width, w=Math.max(tw+20,50), h=26;
  const bx=x-w/2, by=y-h, r=6;
  cx.fillStyle='#00000020';cx.beginPath();cx.moveTo(bx+r+2,by+2);cx.lineTo(bx+w-r+2,by+2);cx.arc(bx+w-r+2,by+r+2,r,-Math.PI/2,0);cx.lineTo(bx+w+2,by+h-r+2);cx.arc(bx+w-r+2,by+h-r+2,r,0,Math.PI/2);cx.lineTo(bx+r+2,by+h+2);cx.arc(bx+r+2,by+h-r+2,r,Math.PI/2,Math.PI);cx.lineTo(bx+2,by+r+2);cx.arc(bx+r+2,by+r+2,r,Math.PI,3*Math.PI/2);cx.fill();
  cx.fillStyle='#FFFDF5';cx.beginPath();cx.moveTo(bx+r,by);cx.lineTo(bx+w-r,by);cx.arc(bx+w-r,by+r,r,-Math.PI/2,0);cx.lineTo(bx+w,by+h-r);cx.arc(bx+w-r,by+h-r,r,0,Math.PI/2);cx.lineTo(bx+r,by+h);cx.arc(bx+r,by+h-r,r,Math.PI/2,Math.PI);cx.lineTo(bx,by+r);cx.arc(bx+r,by+r,r,Math.PI,3*Math.PI/2);cx.fill();
  cx.strokeStyle='#A08060';cx.lineWidth=2;cx.stroke();
  cx.fillStyle='#FFFDF5';cx.beginPath();cx.moveTo(x-4,y);cx.lineTo(x+4,y);cx.lineTo(x,y+5);cx.fill();
  cx.strokeStyle='#A08060';cx.lineWidth=1.5;cx.beginPath();cx.moveTo(x-4,y);cx.lineTo(x,y+5);cx.lineTo(x+4,y);cx.stroke();
  cx.textAlign='center';cx.textBaseline='middle';
  cx.fillStyle='#00000012';cx.fillText(d,x+.5,y-h/2+.5);
  cx.fillStyle='#1A0A00';cx.fillText(d,x,y-h/2);
  cx.textBaseline='alphabetic';
}

// ══════════════════════════════════════════
// ── FLOOR BACKGROUNDS ──
// ══════════════════════════════════════════
export function buildFloorBg(floorIdx,w,h){
  if(w<10||h<10)return;
  const fl=FLOORS[floorIdx], fc=fl.colors;
  const o=document.createElement('canvas');o.width=w*S.dpr;o.height=h*S.dpr;
  const g=o.getContext('2d');g.setTransform(S.dpr,0,0,S.dpr,0,0);
  const fy=h*.55, s=P;
  // Wall
  const wallGrad=g.createLinearGradient(0,0,0,fy);
  wallGrad.addColorStop(0,fc.wall[0]);wallGrad.addColorStop(.7,fc.wall[1]);wallGrad.addColorStop(1,fc.wall[2]);
  g.fillStyle=wallGrad;g.fillRect(0,0,w,fy);
  g.fillStyle='#00000008';for(let x=0;x<w;x+=8)g.fillRect(x,0,1,fy);
  // Baseboard
  g.fillStyle='#00000015';g.fillRect(0,fy-6,w,8);
  g.fillStyle='#6B4E00';g.fillRect(0,fy-3,w,7);g.fillStyle='#8B6914';g.fillRect(0,fy-3,w,5);g.fillStyle='#A08030';g.fillRect(0,fy-3,w,2);
  // Floor tiles
  for(let x=0;x<w;x+=24)for(let y2=fy+4;y2<h;y2+=12){
    const shade=((x/24+y2/12)%3===0)?0:((x/24+y2/12)%3===1)?1:2;
    g.fillStyle=fc.floor[shade];g.fillRect(x,y2,24,12);g.fillStyle='#FFFFFF06';g.fillRect(x,y2,24,1);
  }
  // Window
  const wx=w*.42, wW=110, wH=58;
  g.fillStyle='#8B6914';g.fillRect(wx-4,6,wW+8,wH+8);
  const skyG=g.createLinearGradient(wx,10,wx,10+wH);
  if(floorIdx===2){skyG.addColorStop(0,'#6699CC');skyG.addColorStop(1,'#99CCFF')}
  else if(floorIdx===1){skyG.addColorStop(0,'#88CCFF');skyG.addColorStop(1,'#BBDDFF')}
  else{skyG.addColorStop(0,'#AADDFF');skyG.addColorStop(1,'#E0F0FF')}
  g.fillStyle=skyG;g.fillRect(wx,10,wW,wH);
  g.fillStyle='#FFFFFFCC';[[15,18,16],[45,12,12],[75,20,14]].forEach(([cx2,cy,r])=>{g.beginPath();g.arc(wx+cx2,10+cy,r,0,Math.PI*2);g.fill();g.beginPath();g.arc(wx+cx2+r*.7,10+cy+2,r*.7,0,Math.PI*2);g.fill()});
  g.strokeStyle='#C8A882';g.lineWidth=3;g.strokeRect(wx,10,wW,wH);g.lineWidth=2;
  g.beginPath();g.moveTo(wx+wW/2,10);g.lineTo(wx+wW/2,10+wH);g.stroke();
  g.beginPath();g.moveTo(wx,10+wH/2);g.lineTo(wx+wW,10+wH/2);g.stroke();
  g.fillStyle='#FFE0A080';g.fillRect(wx-2,8,6,wH+6);g.fillRect(wx+wW-4,8,6,wH+6);
  // Ceiling lights
  [[w*.25,5],[w*.75,5]].forEach(([lx,ly])=>{
    g.fillStyle=fc.accent;g.fillRect(lx-8,ly,16,4);g.fillStyle=fc.accent+'80';g.fillRect(lx-6,ly+4,12,3);
    const lg=g.createLinearGradient(lx,ly+7,lx,ly+45);lg.addColorStop(0,fc.accent+'20');lg.addColorStop(1,fc.accent+'00');
    g.fillStyle=lg;g.beginPath();g.moveTo(lx-8,ly+7);g.lineTo(lx+8,ly+7);g.lineTo(lx+25,ly+45);g.lineTo(lx-25,ly+45);g.closePath();g.fill();
  });
  // Plants
  [[w*.04,fy-10],[w*.96,fy-10]].forEach(([px2,py])=>{
    g.fillStyle='#AA5533';g.fillRect(px2-6,py+8,12,10);g.fillStyle='#CC6633';g.fillRect(px2-7,py+6,14,4);
    g.fillStyle='#228B22';[[-6,-8],[0,-14],[6,-8],[-3,-11],[3,-11]].forEach(([lx,ly])=>{g.beginPath();g.arc(px2+lx,py+ly,5,0,Math.PI*2);g.fill()});
    g.fillStyle='#44AA44';[[-4,-6],[2,-12],[5,-6]].forEach(([lx,ly])=>{g.beginPath();g.arc(px2+lx,py+ly,4,0,Math.PI*2);g.fill()});
  });
  // Floor-specific decorations
  drawFloorDecorations(g,floorIdx,w,h,fy,s);
  // Floor name label
  g.fillStyle='#00000040';g.fillRect(w-130,fy-22,124,18);
  g.fillStyle=fc.accent;g.font='bold 11px -apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans KR",sans-serif';g.textAlign='right';g.fillText(fl.nameKo,w-12,fy-8);
  // Desks
  const floorDesks=[];DESKS.forEach((d,di)=>{if(d.floor===floorIdx)floorDesks.push({d,di})});
  floorDesks.forEach(({d,di},idx)=>{
    const x=d.x*w, dy=fy+2, ds=s*.8, ac=C[AT[di]];
    g.fillStyle='#1A1A0A';g.fillRect(x-8*s-1,dy-1,16*s+2,2.5*ds+2);
    g.fillStyle='#A07848';g.fillRect(x-8*s,dy,16*s,2.5*ds);
    g.fillStyle='#8B683030';for(let i=0;i<3;i++)g.fillRect(x-7*s,dy+i*ds*.8+ds*.2,14*s,1);
    g.fillStyle='#B8884020';g.fillRect(x-8*s,dy,16*s,1);
    g.fillStyle='#8B6914';g.fillRect(x-7*s,dy+2.5*ds,1.2*s,6*s);g.fillRect(x+5.8*s,dy+2.5*ds,1.2*s,6*s);
    g.fillStyle='#1A1A0A';g.fillRect(x-4*s-1,dy-8*s-1,8*s+2,7.5*s+2);
    g.fillStyle='#333';g.fillRect(x-4*s,dy-8*s,8*s,7.5*s);
    g.fillStyle='#0A0A1A';g.fillRect(x-3.2*s,dy-7.5*s,6.4*s,5.8*s);
    g.fillStyle=ac.s;g.fillRect(x-4*s,dy-8*s,8*s,1.5);
    g.fillStyle='#555';g.fillRect(x-1*s,dy-.5*s,2*s,1*s);g.fillRect(x-2*s,dy+.3*s,4*s,.5*s);
    g.fillStyle='#444';g.fillRect(x-3*s,dy+1*s,6*s,1.8*s);g.fillStyle='#555';g.fillRect(x-2.8*s,dy+1.2*s,5.6*s,1.4*s);
    g.fillStyle='#666';for(let r=0;r<3;r++)for(let k=0;k<6;k++)g.fillRect(x-2.6*s+k*s*.9,dy+1.3*s+r*s*.45,s*.7,s*.35);
    g.fillStyle='#555';g.fillRect(x+3.5*s,dy+1.5*s,1.2*s,1.8*s);g.fillStyle='#666';g.fillRect(x+3.6*s,dy+1.6*s,1*s,.6*s);
    g.fillStyle='#444';g.fillRect(x-3*s,dy+4*s,6*s,1.2*s);g.fillStyle='#555';g.fillRect(x-2.8*s,dy+3.8*s,5.6*s,.4*s);
    g.fillStyle='#3A3A3A';g.fillRect(x-2.5*s,dy+1.5*s,.6*s,2.5*s);g.fillRect(x+1.9*s,dy+1.5*s,.6*s,2.5*s);
    g.fillStyle='#666';g.fillRect(x-.3*s,dy+5.2*s,.6*s,2.5*s);
    g.fillStyle='#333';g.beginPath();g.arc(x-2*s,dy+8*s,.8*s,0,Math.PI*2);g.fill();g.beginPath();g.arc(x+2*s,dy+8*s,.8*s,0,Math.PI*2);g.fill();g.beginPath();g.arc(x,dy+8*s,.8*s,0,Math.PI*2);g.fill();
    if(idx%3===0){g.fillStyle='#F5E6C8';g.fillRect(x+5*s,dy-s*.5,1.5*s,2*s);g.fillStyle='#8B6914';g.fillRect(x+5*s,dy-s*.5,1.5*s,.4*s);g.fillStyle='#6B3A1A';g.fillRect(x+5.2*s,dy-.1*s,1.1*s,1.2*s)}
    else if(idx%3===1){g.fillStyle='#FFF';g.fillRect(x+5*s,dy-s*.8,2*s,1.5*s);g.fillStyle='#EEE';g.fillRect(x+5.1*s,dy-s*.6,2*s,1.5*s);g.fillStyle='#DDD';g.fillRect(x+5.2*s,dy-s*.4,2*s,1.5*s)}
    else{g.fillStyle='#FFEE88';g.fillRect(x+5*s,dy-s*.5,1.8*s,1.8*s);g.fillStyle='#88BB44';g.fillRect(x+5.3*s,dy+.5*s,1.8*s,1.8*s)}
    const dl=d.label, dlw=dl.length*11+10;
    g.fillStyle='#1A1A0ADD';g.fillRect(x-dlw/2-1,dy+9.5*s-1,dlw+2,18);
    g.fillStyle=ac.p;g.fillRect(x-dlw/2,dy+9.5*s,dlw,16);g.fillStyle=ac.s;g.fillRect(x-dlw/2,dy+9.5*s,dlw,2);
    g.fillStyle='#FFF';g.font='bold 12px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';g.textAlign='center';g.fillText(dl,x,dy+9.5*s+13);
  });
  S.floorBgCache[floorIdx]=o;
}

function drawFloorDecorations(g,floorIdx,w,h,fy,s){
  switch(floorIdx){
    case 0: // 1F Coding Lab
      g.fillStyle='#2A2A3A';g.fillRect(w*.08,fy*.2,22,fy*.55);g.fillStyle='#3A3A4A';g.fillRect(w*.08+2,fy*.2+2,18,fy*.55-4);
      for(let i=0;i<5;i++){g.fillStyle=i%2?'#444':'#383838';g.fillRect(w*.08+3,fy*.22+i*fy*.1,16,fy*.08);g.fillStyle='#44DD66';g.fillRect(w*.08+5,fy*.24+i*fy*.1,2,2);g.fillStyle='#DDAA22';g.fillRect(w*.08+9,fy*.24+i*fy*.1,2,2)}
      g.fillStyle='#1A2A1A';g.fillRect(w*.75,12,50,35);g.fillStyle='#2A3A2A';g.fillRect(w*.75+2,14,46,31);
      g.fillStyle='#44DD66';g.font='bold 8px monospace';g.textAlign='center';g.fillText('> hello',w*.75+25,26);g.fillText('world!',w*.75+25,37);
      g.fillStyle='#44DD6608';g.fillRect(0,0,w,fy);
      break;
    case 1: // 2F Analysis Center
      g.fillStyle='#5A4030';g.fillRect(w*.06,fy*.15,28,fy*.6);
      for(let r=0;r<4;r++){g.fillStyle='#6B5040';g.fillRect(w*.06,fy*.15+r*fy*.15,28,2);for(let b=0;b<4;b++){g.fillStyle=['#CC4444','#4488CC','#44AA44','#DDAA22','#8866CC'][b%5];g.fillRect(w*.06+3+b*6,fy*.17+r*fy*.15,4,fy*.12)}}
      g.fillStyle='#8B6914';g.fillRect(w*.76-4,10,66,44);g.fillStyle='#F8F8F0';g.fillRect(w*.76,14,58,36);
      g.strokeStyle='#8866CC';g.lineWidth=1.5;g.beginPath();g.moveTo(w*.76+5,42);g.lineTo(w*.76+15,36);g.lineTo(w*.76+25,38);g.lineTo(w*.76+35,26);g.lineTo(w*.76+45,22);g.lineTo(w*.76+53,16);g.stroke();
      g.fillStyle='#8866CC08';g.fillRect(0,0,w,fy);
      break;
    case 2: // 3F Operations Hub
      g.fillStyle='#FFF';g.beginPath();g.arc(w*.12,28,14,0,Math.PI*2);g.fill();g.strokeStyle='#8B6914';g.lineWidth=3;g.stroke();
      g.fillStyle='#8B6914';g.font='bold 5px sans-serif';g.textAlign='center';
      ['12','3','6','9'].forEach((n,i)=>{const a=i*Math.PI/2-Math.PI/2;g.fillText(n,w*.12+Math.cos(a)*10,28+Math.sin(a)*10+2)});
      g.fillStyle='#4A3020';g.fillRect(w*.78-2,8,44,36);g.fillStyle='#FFE8C0';g.fillRect(w*.78,10,40,32);
      g.fillStyle='#CC3300';g.font='bold 9px sans-serif';g.textAlign='center';g.fillText('BEST',w*.78+20,24);g.fillText('AGENT',w*.78+20,35);
      g.fillStyle='#CC0000';g.beginPath();g.arc(w*.78+20,12,3,0,Math.PI*2);g.fill();
      g.fillStyle='#FF884408';g.fillRect(0,0,w,fy);
      break;
  }
}

// ══════════════════════════════════════════
// ── DESK ACTIVE SCREEN OVERLAY ──
// ══════════════════════════════════════════
function drawActiveScreen(x,fy,agentType){
  const s=P, cx=S.cx, fr=S.fr, dy=fy+2;
  const sx=x-3.2*s, sy=dy-7.5*s, sw=6.4*s, sh=5.8*s;
  const scroll=fr*.8;
  switch(agentType){
    case 'bash':cx.fillStyle='#0A1A0A';cx.fillRect(sx,sy,sw,sh);cx.fillStyle='#44DD66';['$ git status','M  src/app.ts','$ npm run build','✓ compiled OK','$ node server'].forEach((l,i)=>{const ly=((i*s*1.2+scroll)%(sh+s*1.2))-s*1.2;if(ly>0&&ly<sh){cx.font='6px monospace';cx.textAlign='left';cx.fillText(l,sx+2,sy+ly+6)}});if(fr%40<25)cx.fillRect(sx+sw-s*1.5,sy+sh-s*1.2,s*.6,s*.8);break;
    case 'reader':cx.fillStyle='#0A0A2A';cx.fillRect(sx,sy,sw,sh);cx.fillStyle='#6688CC';for(let i=0;i<6;i++){const lw=[4,5.5,3,5,4.5,2.5][i]*s;cx.fillRect(sx+s*.3,sy+s*.4+i*s*.9,Math.min(lw,sw-s),s*.4)}cx.fillStyle='#FFDD4430';cx.fillRect(sx,sy+s*.3+((fr>>4)%5)*s*.9,sw,s*.6);break;
    case 'writer':cx.fillStyle='#1E1E2E';cx.fillRect(sx,sy,sw,sh);const cLines=[[{c:'#C678DD',t:'const'},{c:'#ABB2BF',t:' x ='}],[{c:'#C678DD',t:'func'},{c:'#61AFEF',t:' run'}],[{c:'#98C379',t:'  "ok"'}],[{c:'#E06C75',t:'  if'},{c:'#ABB2BF',t:' err'}],[{c:'#56B6C2',t:'  ret'},{c:'#D19A66',t:' 42'}],[{c:'#C678DD',t:'}'}]];cx.font='6px monospace';cx.textAlign='left';cLines.forEach((parts,i)=>{let lx=sx+2;parts.forEach(p=>{cx.fillStyle=p.c;cx.fillText(p.t,lx,sy+7+i*s*1.1);lx+=p.t.length*3.5})});cx.fillStyle='#5C6370';for(let i=0;i<5;i++)cx.fillText(''+(i+1),sx-1,sy+7+i*s*1.1);break;
    case 'finder':cx.fillStyle='#1A1A2A';cx.fillRect(sx,sy,sw,sh);cx.fillStyle='#44AA88';cx.font='6px monospace';cx.textAlign='left';cx.fillText('? grep',sx+2,sy+7);cx.fillStyle='#888';['src/a.ts:12','lib/b.js:45','pkg/c.rs:89'].forEach((l,i)=>{cx.fillText(l,sx+2,sy+7+(i+1)*s*1.2)});cx.fillStyle='#FFDD4440';cx.fillRect(sx+s*2,sy+s*1.3+((fr>>4)%3)*s*1.2,s*2,s*.8);break;
    case 'mcp':cx.fillStyle='#0A1A1A';cx.fillRect(sx,sy,sw,sh);const nodes=[[.3,.3],[.7,.25],[.5,.6],[.2,.7],[.8,.7]];cx.fillStyle='#44DDAA';nodes.forEach(([nx,ny])=>cx.fillRect(sx+sw*nx-2,sy+sh*ny-2,4,4));cx.fillStyle='#44DDAA40';[[0,1],[0,2],[1,2],[2,3],[2,4]].forEach(([a,b])=>{const[ax,ay]=nodes[a],[bx,by]=nodes[b];const prog=((fr*.02+a*.3)%1);cx.fillRect(sx+sw*(ax+(bx-ax)*prog)-1,sy+sh*(ay+(by-ay)*prog)-1,3,3)});break;
    case 'agent':cx.fillStyle='#1A1020';cx.fillRect(sx,sy,sw,sh);cx.fillStyle='#AA88FF';cx.font='6px monospace';cx.textAlign='left';cx.fillText('TASKS',sx+2,sy+7);['#1 run','#2 build','#3 test'].forEach((l,i)=>{cx.fillStyle=i===((fr>>5)%3)?'#FFDD44':'#8866CC';cx.fillText(' '+l,sx+2,sy+14+i*s*1.1)});break;
    case 'web':cx.fillStyle='#FFF';cx.fillRect(sx,sy,sw,sh);cx.fillStyle='#E8E8E8';cx.fillRect(sx,sy,sw,s*1.2);cx.fillStyle='#888';cx.font='5px monospace';cx.textAlign='left';cx.fillText('https://',sx+2,sy+s*.9);cx.fillStyle='#EEEEFF';cx.fillRect(sx+s*.3,sy+s*1.8,sw-s*.6,s*1.5);cx.fillStyle='#DDDDEE';cx.fillRect(sx+s*.3,sy+s*3.6,sw*.5,s*1);cx.fillStyle='#CCDDFF';cx.fillRect(sx+s*.3+sw*.55,sy+s*3.6,sw*.35,s*1);break;
    case 'serena':cx.fillStyle='#1A1510';cx.fillRect(sx,sy,sw,sh);cx.fillStyle='#B8860B';cx.font='6px monospace';cx.textAlign='left';const syms=['class Foo','  fn bar','  fn baz','  val x','impl Tr'];syms.forEach((l,i)=>{cx.fillStyle=i===((fr>>4)%5)?'#FFD080':'#8B6914';cx.fillText(l,sx+2,sy+7+i*s*1)});break;
    default:cx.fillStyle='#114422';cx.fillRect(sx,sy,sw,sh);cx.fillStyle='#44DD66';cx.fillRect(sx+s*.4,sy+s*.5,3.5*s,s*.6);cx.fillRect(sx+s*.4,sy+s*1.8,5*s,s*.6);if(fr%60<35)cx.fillRect(sx+s*3,sy+sh-s*1.5,s*.7,s*.7);
  }
  cx.fillStyle='#00000012';for(let i=0;i<sh;i+=2)cx.fillRect(sx,sy+i,sw,1);
  cx.fillStyle=agentType==='web'?'#FFFFFF08':'#44FF6608';cx.fillRect(sx-1,sy-1,sw+2,sh+2);
}

// ══════════════════════════════════════════
// ── AGENT CLASS ──
// ══════════════════════════════════════════
export class Ag {
  constructor(t,i){
    this.t=t;this.i=i;this.floor=AGENT_FLOOR[t]||0;
    this.x=DESKS[i].x+(Math.random()-.5)*.02;this.y=.78;this.tx=this.x;this.ty=this.y;
    this.d=1;this.st='idle';this.wf=Math.random()*100;this.tk='';this.wt=0;this.di=-1;
    this.xp=0;this.lv=1;this.pw=100;this.tot=0;
    this.mood=0;this.moodTimer=60+Math.random()*120;this.compFx=0;
  }
  go(tk){
    this.di=this.i;const d=DESKS[this.i];
    this.tx=d.x+(Math.random()-.5)*.02;this.ty=.48;
    this.st='walk';this.tk=tk;this.wt=60+Math.random()*80;
    this.tot++;this.pw=Math.max(0,this.pw-5);this.mood=0;
    this.xp+=8+Math.floor(Math.random()*7);
    if(this.xp>=this.lv*80){this.xp-=this.lv*80;this.lv++;
      narr(C[this.t].l+' Lv.'+this.lv+' 레벨업!',this.t);
      spawnP(d.x*cW(),cH()*.55,8);
    }
    DESKS[this.i].act=true;S.floorActivity[this.floor]++;
  }
  up(){
    if(this.compFx>0)this.compFx--;
    if(this.st==='walk'){
      const dx=this.tx-this.x,dy=this.ty-this.y;
      const ai=getActivityIntensity(),opm=(S.serverMetrics&&S.serverMetrics.opsPerMin||0)/100;
      const spd=.06+Math.min(.08,Math.max(ai,opm)*.08);
      if(Math.hypot(dx,dy)>.004){this.x+=dx*spd;this.y+=dy*spd;this.d=dx>0?1:-1;this.wf++}
      else{this.st=this.di>=0?'work':'idle';this.d=1}
    }else if(this.st==='work'){
      this.wt--;
      if(this.wt<=0){
        DESKS[this.i].act=false;this.tk='';this.compFx=20;
        spawnP(DESKS[this.i].x*cW(),cH()*.55,5);
        this.tx=DESKS[this.i].x+(Math.random()-.5)*.03;this.ty=.78+Math.random()*.03;
        this.st='walk';this.di=-1;this.pw=Math.min(100,this.pw+3);
      }
    }else{
      this.pw=Math.min(100,this.pw+.02);
      this.moodTimer--;
      if(this.moodTimer<=0){this.mood=(this.mood+1)%5;this.moodTimer=80+Math.random()*160}
      if(Math.random()<.003){this.tx=DESKS[this.i].x+(Math.random()-.5)*.04;this.ty=Math.max(.73,Math.min(.84,this.y+(Math.random()-.5)*.03));this.st='walk'}
    }
  }
  draw(w,h){drawCh(this.x*w,this.y*h,this.t,this.wf,this.d,this.st==='work',this.st==='work'?this.tk:'',this)}
}

// ══════════════════════════════════════════
// ── WEATHER ──
// ══════════════════════════════════════════
function getWeather(){
  if(S.entries.length<5)return'sunny';
  const recent=S.entries.slice(-20);
  const errRate=recent.filter(e=>e.err||e.decision==='deny').length/recent.length;
  const intensity=getActivityIntensity();
  if(errRate>.3)return'rain';if(errRate>.15)return'cloudy';
  if(intensity>.6)return'active';return'sunny';
}
function getDayPhase(){
  const h=new Date().getHours();
  if(h>=6&&h<10)return'morning';if(h>=10&&h<17)return'day';
  if(h>=17&&h<20)return'evening';return'night';
}
function drawWeather(w,h){
  const cx=S.cx, weather=getWeather(), phase=getDayPhase();
  if(phase==='evening'){cx.fillStyle='#FF880008';cx.fillRect(0,0,w,h)}
  else if(phase==='night'){cx.fillStyle='#0000220A';cx.fillRect(0,0,w,h)}
  else if(phase==='morning'){cx.fillStyle='#FFE8B005';cx.fillRect(0,0,w,h)}
  if(weather==='rain'){
    for(let i=0;i<3;i++)S.weatherParticles.push({x:Math.random()*w,y:-5,vx:-.5,vy:4+Math.random()*3,l:h/4+Math.random()*20,type:'rain'});
    if(Math.random()<.008&&S.thunderFlash<=0){S.thunderFlash=6;triggerShake(2)}
  }else if(weather==='cloudy'){
    if(Math.random()<.005)S.weatherParticles.push({x:-40,y:10+Math.random()*h*.15,vx:.3+Math.random()*.2,vy:0,l:300,type:'cloud',sz:30+Math.random()*30});
  }else if(weather==='active'){
    if(Math.random()<.06)S.weatherParticles.push({x:Math.random()*w,y:Math.random()*h*.3,vx:0,vy:0,l:40+Math.random()*30,type:'sparkle',r:Math.random()*6.28});
    if(Math.random()<.02){const fd=DESKS.filter(d=>d.floor===S.currentFloor);const dx2=fd.length?fd[Math.floor(Math.random()*fd.length)].x*w:w/2;S.weatherParticles.push({x:dx2,y:h*.55,vx:0,vy:-1.5,l:30,type:'energy',sz:0})}
  }else if(weather==='sunny'&&Math.random()<.02){
    S.weatherParticles.push({x:Math.random()*w,y:Math.random()*h*.3,vx:0,vy:0,l:40+Math.random()*30,type:'sparkle',r:Math.random()*6.28});
  }
  if(S.thunderFlash>0){cx.fillStyle=`rgba(255,255,255,${S.thunderFlash/10})`;cx.fillRect(0,0,w,h);S.thunderFlash--}
  S.weatherParticles=S.weatherParticles.filter(p=>{
    p.x+=p.vx||0;p.y+=p.vy||0;p.l--;
    if(p.l<=0||p.y>h||p.x>w+60)return false;
    if(p.type==='rain'){cx.globalAlpha=.25;cx.fillStyle='#6688CC';cx.fillRect(p.x,p.y,1,6);cx.globalAlpha=1}
    else if(p.type==='sparkle'){p.r+=.05;cx.globalAlpha=Math.min(p.l/20,.4);cx.fillStyle='#FFE8B0';cx.fillRect(p.x+Math.cos(p.r)*2-1,p.y-1,2,2);cx.fillRect(p.x-1,p.y+Math.sin(p.r)*2-1,2,2);cx.globalAlpha=1}
    else if(p.type==='energy'){p.sz+=.8;cx.globalAlpha=Math.min(p.l/20,.2);cx.strokeStyle='#FFD08088';cx.lineWidth=1.5;cx.beginPath();cx.arc(p.x,p.y,p.sz,0,6.28);cx.stroke();cx.globalAlpha=1}
    else if(p.type==='cloud'){cx.globalAlpha=.12;cx.fillStyle='#8899AA';const sz=p.sz;cx.beginPath();cx.arc(p.x,p.y,sz*.4,0,6.28);cx.arc(p.x+sz*.3,p.y-sz*.15,sz*.35,0,6.28);cx.arc(p.x+sz*.6,p.y,sz*.3,0,6.28);cx.fill();cx.globalAlpha=1}
    return true;
  });
}

function drawPts(){
  const cx=S.cx;
  S.pts=S.pts.filter(p=>{
    p.x+=p.vx;p.y+=p.vy;p.vy+=.06;p.vx*=.985;p.l--;p.rot+=p.rv;
    if(p.l<=0)return false;
    cx.globalAlpha=Math.min(p.l/25,1);cx.fillStyle=p.c;
    if(p.shape==='star'){cx.save();cx.translate(p.x,p.y);cx.rotate(p.rot);cx.fillRect(-p.z/2,-p.z*.15,p.z,p.z*.3);cx.fillRect(-p.z*.15,-p.z/2,p.z*.3,p.z);cx.restore()}
    else if(p.shape==='circle'){cx.beginPath();cx.arc(p.x,p.y,p.z/2,0,6.28);cx.fill()}
    else{cx.fillRect(p.x,p.y,p.z,p.z)}
    cx.globalAlpha=1;return true;
  });
}

// ══════════════════════════════════════════
// ── FLOOR NAVIGATION ──
// ══════════════════════════════════════════
export function switchFloor(idx){
  if(idx===S.currentFloor&&S.viewMode==='floor')return;
  if(S.viewMode==='building')S.viewMode='floor';
  S.floorAnimFrom=S.currentFloor;
  S.floorAnimDir=idx>S.currentFloor?1:-1;
  S.floorAnim=1;
  S.currentFloor=idx;
  document.querySelectorAll('.floor-btn[data-f]').forEach(b=>{
    if(b.dataset.f==='b')b.classList.remove('active');
    else b.classList.toggle('active',b.dataset.f===String(idx));
  });
  const fn=document.getElementById('floorName');
  if(fn)fn.textContent=FLOORS[idx].nameKo;
  narr(FLOORS[idx].nameKo+' 진입','agent');
}

export function toggleBuildingView(){
  S.viewMode=S.viewMode==='building'?'floor':'building';
  document.querySelectorAll('.floor-btn').forEach(b=>{
    if(b.dataset.f==='b')b.classList.toggle('active',S.viewMode==='building');
    else b.classList.toggle('active',S.viewMode==='floor'&&b.dataset.f===String(S.currentFloor));
  });
  const fn=document.getElementById('floorName');
  if(fn)fn.textContent=S.viewMode==='building'?'건물 단면도':FLOORS[S.currentFloor].nameKo;
  narr(S.viewMode==='building'?'건물 전체 뷰':'층별 뷰','agent');
}

function updateFloorBadges(){
  for(let i=0;i<3;i++){
    const el=document.getElementById('fb'+i);if(!el)continue;
    const hasWork=S.agents.some(a=>a.floor===i&&a.st==='work');
    el.classList.toggle('show',hasWork&&i!==S.currentFloor);
  }
}

export function spawnElevatorPacket(fromFloor,toFloor,tool){
  if(fromFloor===toFloor)return;
  const colors=TOOL_COLORS[tool]||['#FFD080'];
  S.elevatorPackets.push({from:fromFloor,to:toFloor,progress:0,color:colors[0],speed:.03+Math.random()*.02});
}

// ══════════════════════════════════════════
// ── BUILDING CROSS-SECTION VIEW ──
// ══════════════════════════════════════════
function renderBuildingView(w,h){
  const cx=S.cx, fr=S.fr;
  const phase=getDayPhase();
  const isNight=phase==='night', isEvening=phase==='evening';

  // Layout
  const bldgL=w*.08, bldgR=w*.92, bldgW=bldgR-bldgL;
  const groundY=h*.88, roofY=h*.08;
  const totalBldgH=groundY-roofY;
  const floorH=totalBldgH/3.15, margin=2;
  const startY=groundY-floorH*3-margin*2;

  // ── SKY ──
  const skyG=cx.createLinearGradient(0,0,0,groundY);
  if(isNight){skyG.addColorStop(0,'#0A0A2A');skyG.addColorStop(.5,'#1A1A3A');skyG.addColorStop(1,'#2A2A4A')}
  else if(isEvening){skyG.addColorStop(0,'#2A1A4A');skyG.addColorStop(.3,'#CC6644');skyG.addColorStop(.6,'#FFAA66');skyG.addColorStop(1,'#FFD8A0')}
  else{skyG.addColorStop(0,'#4488CC');skyG.addColorStop(.5,'#66AADD');skyG.addColorStop(1,'#AACCEE')}
  cx.fillStyle=skyG;cx.fillRect(0,0,w,groundY);

  // Stars (night)
  if(isNight){
    cx.fillStyle='#FFFFFF';
    for(let i=0;i<20;i++){
      const sx2=((i*37+fr*.02)%1)*w, sy2=((i*53+i*17)%1)*groundY*.6;
      const twinkle=Math.sin(fr*.05+i*2)*.5+.5;
      cx.globalAlpha=twinkle*.7+.1;
      cx.fillRect(sx2,sy2,1.5,1.5);
    }
    cx.globalAlpha=1;
    // Moon
    cx.fillStyle='#FFE8AA';cx.beginPath();cx.arc(w*.82,h*.1,14,0,Math.PI*2);cx.fill();
    cx.fillStyle=isNight?'#0A0A2A':'#4488CC';cx.beginPath();cx.arc(w*.82+5,h*.1-3,12,0,Math.PI*2);cx.fill();
  }

  // Clouds
  if(!isNight){
    cx.fillStyle=isEvening?'#FFD8A060':'#FFFFFF50';
    const cOff=(fr*.15)%w;
    [[cOff,h*.06,30],[cOff+w*.4,h*.12,22],[cOff-w*.3,h*.09,26]].forEach(([cx2,cy2,r])=>{
      const x2=((cx2%w)+w)%w;
      cx.beginPath();cx.arc(x2,cy2,r,0,Math.PI*2);cx.arc(x2+r*.8,cy2-r*.2,r*.7,0,Math.PI*2);cx.arc(x2-r*.6,cy2+r*.1,r*.6,0,Math.PI*2);cx.fill();
    });
  }

  // ── GROUND ──
  cx.fillStyle='#8B9E6B';cx.fillRect(0,groundY,w,h-groundY);
  cx.fillStyle='#7A8E5A';cx.fillRect(0,groundY,w,3);
  // Pavement
  cx.fillStyle='#A0A0A0';cx.fillRect(0,groundY+3,w,h*.06);
  cx.fillStyle='#909090';cx.fillRect(0,groundY+3,w,2);
  // Road line
  for(let i=0;i<w;i+=20){cx.fillStyle='#CCCC88';cx.fillRect(i,groundY+3+h*.03,10,2)}
  // Grass tufts
  cx.fillStyle='#6A8E4A';
  for(let i=0;i<8;i++){const gx=i*w/8+10;cx.fillRect(gx,groundY-1,3,4);cx.fillRect(gx+5,groundY-2,2,5)}

  // ── TREES (left & right) ──
  [[bldgL-22,groundY],[bldgR+14,groundY],[bldgL-40,groundY],[bldgR+32,groundY]].forEach(([tx,ty],ti)=>{
    const sz=ti<2?.9:.6;
    cx.fillStyle='#5A3A1A';cx.fillRect(tx,ty-18*sz,4*sz,18*sz);
    cx.fillStyle='#3A8A3A';cx.beginPath();cx.arc(tx+2*sz,ty-22*sz,10*sz,0,Math.PI*2);cx.fill();
    cx.fillStyle='#2A7A2A';cx.beginPath();cx.arc(tx+5*sz,ty-25*sz,7*sz,0,Math.PI*2);cx.fill();
    cx.fillStyle='#4A9A4A';cx.beginPath();cx.arc(tx-2*sz,ty-20*sz,6*sz,0,Math.PI*2);cx.fill();
  });

  // ── BUILDING EXTERIOR (side walls for depth) ──
  // Left wall (dark side)
  cx.fillStyle='#8A7A6A';cx.fillRect(bldgL,startY,4,groundY-startY);
  // Right wall
  cx.fillStyle='#9A8A7A';cx.fillRect(bldgR-4,startY,4,groundY-startY);

  // ── ROOFTOP ──
  // Main roof slab
  cx.fillStyle='#7A6A5A';cx.fillRect(bldgL-4,startY-8,bldgW+8,10);
  cx.fillStyle='#6A5A4A';cx.fillRect(bldgL-2,startY-10,bldgW+4,4);
  // Railing
  for(let rx=bldgL;rx<bldgR;rx+=12){cx.fillStyle='#8A8A8A';cx.fillRect(rx,startY-18,2,10);cx.fillStyle='#9A9A9A';cx.fillRect(rx,startY-18,12,2)}

  // Water tank
  const wtX=bldgL+bldgW*.15;
  cx.fillStyle='#888';cx.fillRect(wtX,startY-36,16,18);
  cx.fillStyle='#999';cx.fillRect(wtX-1,startY-38,18,4);
  cx.fillStyle='#777';cx.fillRect(wtX+5,startY-32,2,8);

  // AC unit
  const acX=bldgL+bldgW*.7;
  cx.fillStyle='#AAA';cx.fillRect(acX,startY-24,20,14);
  cx.fillStyle='#999';cx.fillRect(acX+2,startY-22,7,4);cx.fillRect(acX+11,startY-22,7,4);
  // AC fan spin
  if(S.agents.some(a=>a.st==='work')){
    cx.fillStyle='#BBB';cx.save();cx.translate(acX+10,startY-15);cx.rotate(fr*.2);
    cx.fillRect(-4,-1,8,2);cx.fillRect(-1,-4,2,8);cx.restore();
  }

  // ── SIGN (neon-style) ──
  const signW=bldgW*.55, signH=22, signX=bldgL+(bldgW-signW)/2, signY2=startY-44;
  cx.fillStyle='#1A1A3A';cx.fillRect(signX,signY2,signW,signH);
  cx.strokeStyle='#8B6914';cx.lineWidth=2;cx.strokeRect(signX,signY2,signW,signH);
  // Neon glow
  const glowAlpha=(.7+Math.sin(fr*.08)*.3);
  cx.fillStyle=`rgba(255,208,128,${glowAlpha})`;cx.font='bold 13px -apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans KR",sans-serif';
  cx.textAlign='center';cx.fillText('에이전트 개발국',bldgL+bldgW/2,signY2+15);
  // Sign light bulbs
  for(let lb=0;lb<6;lb++){
    const lx=signX+8+lb*(signW-16)/5;
    cx.fillStyle=fr%20<10+lb?'#FFD080':'#FFD08040';
    cx.beginPath();cx.arc(lx,signY2-3,2,0,Math.PI*2);cx.fill();
  }

  // ── ANTENNA ──
  cx.fillStyle='#666';cx.fillRect(bldgL+bldgW*.5-1,startY-64,3,22);
  cx.fillStyle='#888';cx.fillRect(bldgL+bldgW*.5-6,startY-52,4,1);cx.fillRect(bldgL+bldgW*.5+3,startY-52,4,1);
  cx.fillStyle='#CC2200';cx.fillRect(bldgL+bldgW*.5-2,startY-67,5,4);
  // Blink
  if(fr%40<20){cx.fillStyle='#FF000060';cx.beginPath();cx.arc(bldgL+bldgW*.5+.5,startY-65,5+Math.sin(fr*.1)*2,0,Math.PI*2);cx.fill()}
  // Signal waves
  if(S.connected){
    cx.strokeStyle='#44DD6640';cx.lineWidth=1;
    for(let sw=0;sw<3;sw++){
      const sr=8+sw*6+(fr*.1%6);cx.globalAlpha=Math.max(0,1-sr/30);
      cx.beginPath();cx.arc(bldgL+bldgW*.5+.5,startY-65,sr,-.8,-2.3,true);cx.stroke();
    }
    cx.globalAlpha=1;
  }

  // ── ELEVATOR SHAFT ──
  const eX=bldgR-bldgW*.14, eW=bldgW*.1;
  const eTop=startY, eBot=groundY;
  cx.fillStyle='#2A2A3A';cx.fillRect(eX,eTop,eW,eBot-eTop);
  // Shaft rails
  cx.fillStyle='#4A4A5A';cx.fillRect(eX+1,eTop,2,eBot-eTop);cx.fillRect(eX+eW-3,eTop,2,eBot-eTop);
  // Cable
  cx.fillStyle='#555';cx.fillRect(eX+eW/2,eTop,1,eBot-eTop);
  // Elevator car
  const eCabY=eTop+(eBot-eTop)*.5+Math.sin(fr*.02)*(eBot-eTop)*.2;
  cx.fillStyle='#8888AA';cx.fillRect(eX+3,eCabY-8,eW-6,16);
  cx.fillStyle='#6666AA';cx.fillRect(eX+eW/2-3,eCabY-6,6,12);
  cx.fillStyle='#AAAACC';cx.fillRect(eX+eW/2-1,eCabY-7,2,1);
  // Shaft floor markers
  for(let fi=0;fi<3;fi++){
    const fy=startY+(2-fi)*(floorH+margin)+floorH/2;
    cx.fillStyle=fi===S.currentFloor?'#FFD080':'#555';
    cx.fillRect(eX-1,fy-1,2,2);
    cx.font='7px monospace';cx.textAlign='right';cx.fillText((fi+1)+'F',eX-3,fy+2);
  }

  // ── ENTRANCE (at ground level) ──
  const entX=bldgL+bldgW*.4, entW=bldgW*.2;
  // Awning
  cx.fillStyle='#CC6600';cx.fillRect(entX-6,groundY-16,entW+12,4);
  const awG=cx.createLinearGradient(0,groundY-12,0,groundY-4);
  awG.addColorStop(0,'#DD7720');awG.addColorStop(1,'#CC660080');
  cx.fillStyle=awG;cx.beginPath();cx.moveTo(entX-6,groundY-12);cx.lineTo(entX+entW+6,groundY-12);
  cx.lineTo(entX+entW+2,groundY-4);cx.lineTo(entX-2,groundY-4);cx.fill();
  // Door
  cx.fillStyle='#4A3A2A';cx.fillRect(entX,groundY-12,entW,12);
  cx.fillStyle='#3A2A1A';cx.fillRect(entX+entW/2-1,groundY-12,2,12);
  cx.fillStyle='#FFD080';cx.fillRect(entX+entW/2-6,groundY-7,4,2);cx.fillRect(entX+entW/2+2,groundY-7,4,2);
  // Steps
  cx.fillStyle='#B0A090';cx.fillRect(entX-2,groundY,entW+4,3);
  cx.fillStyle='#A09080';cx.fillRect(entX-4,groundY+3,entW+8,2);

  // ── STREET LAMP ──
  const lampX=bldgL-12;
  cx.fillStyle='#555';cx.fillRect(lampX,groundY-40,3,40);
  cx.fillStyle='#666';cx.fillRect(lampX-4,groundY-42,11,4);
  if(isNight||isEvening){
    cx.fillStyle='#FFDD6640';cx.beginPath();cx.arc(lampX+1.5,groundY-40,18,0,Math.PI*2);cx.fill();
    cx.fillStyle='#FFEE88';cx.beginPath();cx.arc(lampX+1.5,groundY-40,4,0,Math.PI*2);cx.fill();
  }else{
    cx.fillStyle='#DDD';cx.beginPath();cx.arc(lampX+1.5,groundY-40,3,0,Math.PI*2);cx.fill();
  }

  // ── FLOORS (bottom=1F, top=3F) ──
  for(let fi=2;fi>=0;fi--){
    const fl=FLOORS[fi], fc=fl.colors;
    const fy=startY+(2-fi)*(floorH+margin);
    const flL=bldgL+4, flR=eX-2, flW=flR-flL;

    // Wall gradient
    const wallG=cx.createLinearGradient(0,fy,0,fy+floorH);
    wallG.addColorStop(0,fc.wall[0]);wallG.addColorStop(.7,fc.wall[1]);wallG.addColorStop(1,fc.wall[2]||fc.wall[1]);
    cx.fillStyle=wallG;cx.fillRect(flL,fy,flW,floorH);

    // Floor tile
    const flrG=cx.createLinearGradient(0,fy+floorH*.78,0,fy+floorH);
    flrG.addColorStop(0,fc.floor[0]);flrG.addColorStop(1,fc.floor[1]);
    cx.fillStyle=flrG;cx.fillRect(flL,fy+floorH*.78,flW,floorH*.22);

    // Ceiling line
    cx.fillStyle='#00000015';cx.fillRect(flL,fy,flW,2);
    // Baseboard
    cx.fillStyle='#6B4E00';cx.fillRect(flL,fy+floorH-2,flW,3);

    // ── Windows (exterior visible in cross-section) ──
    const winCount=4, winW2=flW*.1, winH2=floorH*.3;
    for(let wi=0;wi<winCount;wi++){
      const wx=flL+flW*.08+wi*(flW*.22), wy=fy+floorH*.15;
      // Window frame
      cx.fillStyle='#5A4A3A';cx.fillRect(wx-2,wy-2,winW2+4,winH2+4);
      // Window pane (sky reflection or interior glow)
      if(isNight){
        const isLit=S.agents.some(a=>a.floor===fi&&a.st==='work')||Math.random()>.3;
        cx.fillStyle=isLit?'#FFE8A060':'#333850';
      }else{
        cx.fillStyle='#88BBEE50';
      }
      cx.fillRect(wx,wy,winW2,winH2);
      // Cross frame
      cx.fillStyle='#5A4A3A';cx.fillRect(wx+winW2/2-1,wy,2,winH2);cx.fillRect(wx,wy+winH2/2-1,winW2,2);
    }

    // ── Ceiling Light ──
    const lightX=flL+flW*.5;
    cx.fillStyle='#888';cx.fillRect(lightX-8,fy+2,16,3);
    cx.fillStyle=fc.accent;cx.fillRect(lightX-6,fy+5,12,2);
    if(S.agents.some(a=>a.floor===fi&&a.st==='work')){
      cx.fillStyle=fc.accent+'20';cx.fillRect(lightX-30,fy+5,60,floorH*.4);
    }

    // ── Floor-specific decorations ──
    if(fi===0){
      // 1F: Small server rack
      cx.fillStyle='#2A2A3A';cx.fillRect(flL+6,fy+floorH*.25,8,floorH*.5);
      cx.fillStyle='#0A0A1A';cx.fillRect(flL+7,fy+floorH*.28,6,floorH*.44);
      for(let li=0;li<4;li++){cx.fillStyle=fr%20<10+li*3?'#44DD66':'#226633';cx.fillRect(flL+8,fy+floorH*.3+li*5,2,2)}
      // Potted plant
      cx.fillStyle='#6A4A2A';cx.fillRect(flR-14,fy+floorH*.6,8,floorH*.18);
      cx.fillStyle='#3A8A3A';cx.beginPath();cx.arc(flR-10,fy+floorH*.55,6,0,Math.PI*2);cx.fill();
    }else if(fi===1){
      // 2F: Bookshelf
      cx.fillStyle='#5A3A1A';cx.fillRect(flL+4,fy+floorH*.2,12,floorH*.58);
      ['#CC4444','#4488CC','#44AA66','#DDAA22','#8866CC'].forEach((bc,bi)=>{
        cx.fillStyle=bc;cx.fillRect(flL+5+bi*2,fy+floorH*.22,2,floorH*.12);
        cx.fillRect(flL+5+bi*2,fy+floorH*.38,2,floorH*.12);
        cx.fillRect(flL+6+bi*2,fy+floorH*.54,2,floorH*.12);
      });
      // Whiteboard
      cx.fillStyle='#DDD';cx.fillRect(flR-20,fy+floorH*.2,14,10);
      cx.fillStyle='#AAA';cx.fillRect(flR-19,fy+floorH*.2+1,12,8);
      cx.fillStyle='#44AA66';cx.fillRect(flR-18,fy+floorH*.2+7,3,1);cx.fillRect(flR-14,fy+floorH*.2+6,2,2);cx.fillRect(flR-11,fy+floorH*.2+4,3,4);
    }else{
      // 3F: World map poster
      cx.fillStyle='#E8D8C0';cx.fillRect(flL+4,fy+floorH*.2,16,10);
      cx.fillStyle='#6A9A6A';cx.fillRect(flL+6,fy+floorH*.22,4,3);cx.fillRect(flL+12,fy+floorH*.24,3,4);cx.fillRect(flL+8,fy+floorH*.25,2,2);
      // Clock
      const clkX=flR-12, clkY=fy+floorH*.25;
      cx.fillStyle='#FFF';cx.beginPath();cx.arc(clkX,clkY,5,0,Math.PI*2);cx.fill();
      cx.fillStyle='#333';cx.beginPath();cx.arc(clkX,clkY,5.5,0,Math.PI*2);cx.stroke();
      const h2=new Date().getHours()%12, m2=new Date().getMinutes();
      cx.strokeStyle='#333';cx.lineWidth=1;
      cx.beginPath();cx.moveTo(clkX,clkY);cx.lineTo(clkX+Math.sin(h2/12*Math.PI*2)*3,clkY-Math.cos(h2/12*Math.PI*2)*3);cx.stroke();
      cx.beginPath();cx.moveTo(clkX,clkY);cx.lineTo(clkX+Math.sin(m2/60*Math.PI*2)*4,clkY-Math.cos(m2/60*Math.PI*2)*4);cx.stroke();
    }

    // Current floor highlight
    if(fi===S.currentFloor){
      cx.strokeStyle='#FFD080';cx.lineWidth=2;cx.strokeRect(flL-1,fy-1,flW+2,floorH+2);
      // Arrow indicator
      cx.fillStyle='#FFD080';cx.beginPath();cx.moveTo(flL-8,fy+floorH/2);cx.lineTo(flL-2,fy+floorH/2-5);cx.lineTo(flL-2,fy+floorH/2+5);cx.fill();
    }

    // Floor label badge
    cx.fillStyle='#00000070';
    const lblW=82, lblH=14;
    cx.fillRect(flL+4,fy+3,lblW,lblH);
    cx.fillStyle=fc.accent;cx.font='bold 9px -apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans KR",sans-serif';cx.textAlign='left';
    cx.fillText(fl.nameKo,flL+7,fy+13);

    // Working glow pulse
    const workCount=S.agents.filter(a=>a.floor===fi&&a.st==='work').length;
    if(workCount>0){
      const pulse=Math.sin(fr*.08)*.08+.12;
      cx.fillStyle=fc.accent+Math.floor(pulse*255).toString(16).padStart(2,'0');
      cx.fillRect(flL,fy,flW,floorH);
    }

    // ── Mini Desks ──
    const floorDesks2=[];DESKS.forEach((d,di)=>{if(d.floor===fi)floorDesks2.push({d,di})});
    floorDesks2.forEach(({d,di})=>{
      const dx2=flL+d.x*flW, dy2=fy+floorH*.6;
      // Desk body
      cx.fillStyle='#B08858';cx.fillRect(dx2-10,dy2,20,5);
      cx.fillStyle='#9A7848';cx.fillRect(dx2-9,dy2+5,3,4);cx.fillRect(dx2+6,dy2+5,3,4);
      // Monitor
      cx.fillStyle='#333';cx.fillRect(dx2-5,dy2-10,10,9);
      cx.fillStyle='#0A0A2A';cx.fillRect(dx2-4,dy2-9,8,7);
      // Monitor content
      if(d.act){
        cx.fillStyle=C[AT[di]].s+'90';cx.fillRect(dx2-4,dy2-9,8,7);
        // Screen glow
        cx.fillStyle=C[AT[di]].s+'15';cx.fillRect(dx2-8,dy2-14,16,18);
      }else{
        // Idle screen lines
        cx.fillStyle='#1A2A4A';cx.fillRect(dx2-3,dy2-8,6,1);cx.fillRect(dx2-3,dy2-6,4,1);cx.fillRect(dx2-3,dy2-4,5,1);
      }
      // Monitor stand
      cx.fillStyle='#555';cx.fillRect(dx2-1,dy2-1,2,2);
      // Desk label
      cx.fillStyle='#8B7860';cx.font='7px -apple-system,sans-serif';cx.textAlign='center';cx.fillText(d.label,dx2,dy2+14);
    });

    // ── Mini Agents (chibi) ──
    S.agents.filter(a=>a.floor===fi).forEach(a=>{
      const ax2=flL+a.x*flW, ay2=fy+a.y*floorH*.6+floorH*.2;
      const cc=C[a.t], ms=2;
      const bob=a.st==='work'?Math.sin(fr*.12+a.i)*.8:0;

      // Shadow
      cx.fillStyle='#00000018';cx.beginPath();cx.ellipse(ax2,ay2+5*ms,3.5*ms,1.2*ms,0,0,Math.PI*2);cx.fill();

      // Body
      cx.fillStyle=cc.s;
      cx.fillRect(ax2-2.5*ms,ay2+bob,5*ms,4*ms);
      // Arms
      if(a.st==='work'){
        const tL=Math.sin(fr*.4+a.i)*1, tR=Math.sin(fr*.4+a.i+3.14)*1;
        cx.fillRect(ax2-3.5*ms,ay2+1*ms+tL+bob,1.5*ms,2.5*ms);
        cx.fillRect(ax2+2*ms,ay2+1*ms+tR+bob,1.5*ms,2.5*ms);
      }
      // Head
      cx.fillStyle='#FFD8B0';cx.fillRect(ax2-3*ms,ay2-3.5*ms+bob,6*ms,4*ms);
      // Hair
      cx.fillStyle=cc.h;cx.fillRect(ax2-3.2*ms,ay2-4*ms+bob,6.4*ms,2*ms);
      cx.fillRect(ax2-3.2*ms,ay2-2.5*ms+bob,1.5*ms,1.5*ms);cx.fillRect(ax2+1.7*ms,ay2-2.5*ms+bob,1.5*ms,1.5*ms);
      // Eyes
      const blink=fr%100<3;
      if(!blink){
        cx.fillStyle='#222';cx.fillRect(ax2-1.5*ms,ay2-2*ms+bob,ms*.9,ms*.9);cx.fillRect(ax2+.6*ms,ay2-2*ms+bob,ms*.9,ms*.9);
        cx.fillStyle='#FFF';cx.fillRect(ax2-1.3*ms,ay2-2*ms+bob,ms*.3,ms*.3);cx.fillRect(ax2+.8*ms,ay2-2*ms+bob,ms*.3,ms*.3);
      }else{
        cx.fillStyle='#222';cx.fillRect(ax2-1.5*ms,ay2-1.5*ms+bob,ms*.9,ms*.3);cx.fillRect(ax2+.6*ms,ay2-1.5*ms+bob,ms*.9,ms*.3);
      }
      // Legs
      cx.fillStyle=cc.p;cx.fillRect(ax2-2*ms,ay2+4*ms+bob,2*ms,1.5*ms);cx.fillRect(ax2,ay2+4*ms+bob,2*ms,1.5*ms);

      // Work effect
      if(a.st==='work'){
        // Speech bubble with tool icon
        cx.fillStyle='#FFF';cx.beginPath();
        cx.moveTo(ax2+3*ms,ay2-4.5*ms+bob);cx.lineTo(ax2+3*ms,ay2-8*ms+bob);cx.lineTo(ax2+9*ms,ay2-8*ms+bob);
        cx.lineTo(ax2+9*ms,ay2-4.5*ms+bob);cx.lineTo(ax2+5*ms,ay2-4.5*ms+bob);cx.lineTo(ax2+4*ms,ay2-3.5*ms+bob);cx.lineTo(ax2+3.5*ms,ay2-4.5*ms+bob);cx.fill();
        cx.fillStyle=cc.s;cx.font='bold 6px monospace';cx.textAlign='center';cx.fillText(cc.e,ax2+6*ms,ay2-5.5*ms+bob);
        // Activity sparkle
        if(fr%8<4){cx.fillStyle=cc.s;cx.fillRect(ax2+3*ms,ay2-6*ms+bob,1.5,1.5)}
      }
    });
  }

  // ── ELEVATOR PACKETS ──
  S.elevatorPackets.forEach(ep=>{
    const fromY=startY+(2-ep.from)*(floorH+margin)+floorH/2;
    const toY=startY+(2-ep.to)*(floorH+margin)+floorH/2;
    const y=fromY+(toY-fromY)*ep.progress;
    const alpha=1-ep.progress*.4;
    // Packet glow
    cx.fillStyle=ep.color+'40';cx.globalAlpha=alpha;cx.beginPath();cx.arc(eX+eW/2,y,8,0,Math.PI*2);cx.fill();
    // Packet core
    cx.fillStyle=ep.color;cx.fillRect(eX+eW/2-4,y-4,8,8);
    cx.fillStyle='#FFF';cx.fillRect(eX+eW/2-2,y-2,4,4);
    // Trail
    const trailDir=ep.to>ep.from?-1:1;
    for(let ti=1;ti<=3;ti++){
      cx.globalAlpha=alpha*(1-ti*.25);cx.fillStyle=ep.color;cx.fillRect(eX+eW/2-2,y+trailDir*ti*5-1,4,3);
    }
    cx.globalAlpha=1;
  });

  // ── BIRDS/BUTTERFLIES (ambient) ──
  if(!isNight){
    for(let bi=0;bi<2;bi++){
      const bx=((fr*.3+bi*150)%w), by=h*.05+bi*h*.06+Math.sin(fr*.03+bi*3)*10;
      cx.fillStyle='#33333360';
      cx.beginPath();cx.moveTo(bx,by);cx.lineTo(bx-4-Math.sin(fr*.15+bi)*3,by-2);cx.lineTo(bx,by+1);cx.fill();
      cx.beginPath();cx.moveTo(bx,by);cx.lineTo(bx+4+Math.sin(fr*.15+bi)*3,by-2);cx.lineTo(bx,by+1);cx.fill();
    }
  }
}

// ══════════════════════════════════════════
// ── MAIN RENDER LOOP ──
// ══════════════════════════════════════════
export function render(ts){
  requestAnimationFrame(render);
  if(ts-S.lastRender<33)return;
  S.lastRender=ts;
  const w=cW(),h=cH(),cx=S.cx;
  if(w<10||h<10)return;
  for(let i=0;i<3;i++){if(!S.floorBgCache[i])buildFloorBg(i,w,h)}
  let sx=0,sy=0;
  if(S.shakeFrames>0){sx=(Math.random()-.5)*S.shakeIntensity;sy=(Math.random()-.5)*S.shakeIntensity;S.shakeFrames--}
  cx.save();cx.translate(sx,sy);
  S.agents.forEach(a=>a.up());

  if(S.viewMode==='building'){
    renderBuildingView(w,h);
  }else{
    if(S.floorAnim>0){
      S.floorAnim-=.06;if(S.floorAnim<0)S.floorAnim=0;
      const t=1-S.floorAnim, ease=t*t*(3-2*t);
      const prevBg=S.floorBgCache[S.floorAnimFrom], curBg=S.floorBgCache[S.currentFloor];
      if(prevBg){cx.save();cx.translate(0,-S.floorAnimDir*h*ease);cx.drawImage(prevBg,0,0,prevBg.width,prevBg.height,0,0,w,h);cx.restore()}
      if(curBg){cx.save();cx.translate(0,S.floorAnimDir*h*(1-ease));cx.drawImage(curBg,0,0,curBg.width,curBg.height,0,0,w,h);cx.restore()}
    }else{
      const fbg=S.floorBgCache[S.currentFloor];
      if(fbg)cx.drawImage(fbg,0,0,fbg.width,fbg.height,0,0,w,h);
      drawWeather(w,h);
      const fy=h*.55;
      DESKS.forEach((d,i)=>{if(d.act&&d.floor===S.currentFloor)drawActiveScreen(d.x*w,fy,AT[i])});
      const fa=S.agents.filter(a=>a.floor===S.currentFloor);
      fa.sort((a,b)=>a.y-b.y);fa.forEach(a=>a.draw(w,h));
      drawPts();
    }
  }

  // ── HUD ──
  let ac=0;S.agents.forEach(a=>{if(a.st==='work')ac++});
  if(ac!==S.hudPrev){S.hudWait=0;S.hudPrev=ac}else if(S.hudWait<31)S.hudWait++;
  if(S.hudWait>=30)S.hudShow=S.hudPrev;
  const hudW=S.serverMetrics&&S.serverMetrics.opsPerMin?210:130;
  const hudH=S.orchRun&&S.orchRun.state&&S.orchRun.state!=='done'&&S.orchRun.state!=='failed'?62:56;
  cx.fillStyle='#000000AA';cx.fillRect(4,4,hudW,hudH);cx.fillStyle='#1A1A3A';cx.fillRect(5,5,hudW-2,hudH-2);
  cx.fillStyle='#8B6914';cx.fillRect(5,5,hudW-2,2);cx.fillRect(5,3+hudH,hudW-2,2);
  cx.font='bold 14px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';cx.textAlign='left';
  if(S.hudShow>0){cx.fillStyle='#FF6644';cx.fillRect(10,11,14,14);cx.fillStyle='#FFD080';cx.fillText(S.hudShow+'명 개발 중',28,23)}
  else{cx.fillStyle='#88AACC';cx.fillText('대기 중',10,23)}
  if(S.serverMetrics&&S.serverMetrics.opsPerMin){cx.fillStyle='#6688AA';cx.fillRect(134,10,1,16);cx.fillStyle='#88BBDD';cx.font='bold 12px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';cx.fillText(S.serverMetrics.opsPerMin+' ops/m',140,23)}
  cx.fillStyle=S.agentOnline?'#44CC44':'#CC0000';cx.fillRect(w-24,8,6,6);cx.fillStyle='#FFF';cx.font='8px monospace';cx.textAlign='right';cx.fillText(S.agentOnline?'ON':'OFF',w-8,14);
  // Combo
  if(S.combo>=2){
    const cs=S.combo>=10?20:S.combo>=5?18:16;
    cx.font=`bold ${cs}px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif`;cx.textAlign='center';
    const cy=38+Math.sin(S.fr*.15)*3, cc=S.combo>=10?'#FF4444':S.combo>=5?'#FFAA22':'#FFD080';
    cx.fillStyle='#00000080';cx.fillText(S.combo+'COMBO!',w/2+1,cy+1);cx.fillStyle=cc;cx.fillText(S.combo+'COMBO!',w/2,cy);
    if(S.combo>=10&&S.fr%3===0)spawnP(w/2+(Math.random()-.5)*60,cy,1,'success');
  }
  // XP bar
  const lvl=Math.floor(S.totalXP/500)+1, xpInLvl=S.totalXP%500;
  const xpW=70,xpH=5,xpX=5,xpY=31;
  cx.fillStyle='#222';cx.fillRect(xpX,xpY,xpW,xpH);
  const xpPct=Math.min(xpInLvl/500,1);
  const xpG=cx.createLinearGradient(xpX,0,xpX+xpW*xpPct,0);xpG.addColorStop(0,'#4466CC');xpG.addColorStop(1,'#88AAFF');
  cx.fillStyle=xpG;cx.fillRect(xpX,xpY,xpW*xpPct,xpH);
  cx.fillStyle='#FFFFFF40';cx.fillRect(xpX,xpY,xpW*xpPct,1);
  cx.fillStyle='#CCC';cx.font='bold 8px -apple-system,sans-serif';cx.textAlign='left';cx.fillText('Lv.'+lvl,xpX+xpW+4,xpY+5);
  cx.fillStyle='#888';cx.font='7px monospace';cx.fillText(xpInLvl+'/500',xpX+xpW+28,xpY+5);
  // Activity meter
  const intensity=getActivityIntensity(), aiY=xpY+9, aiW=xpW, aiH=3;
  cx.fillStyle='#222';cx.fillRect(xpX,aiY,aiW,aiH);
  const aiG=cx.createLinearGradient(xpX,0,xpX+aiW*intensity,0);
  if(intensity>.7){aiG.addColorStop(0,'#FF4444');aiG.addColorStop(1,'#FF8844')}
  else if(intensity>.3){aiG.addColorStop(0,'#FFAA22');aiG.addColorStop(1,'#FFDD44')}
  else{aiG.addColorStop(0,'#44AA44');aiG.addColorStop(1,'#66CC66')}
  cx.fillStyle=aiG;cx.fillRect(xpX,aiY,aiW*intensity,aiH);
  cx.fillStyle='#888';cx.font='7px monospace';cx.fillText(S.activityHistory.length+'ops',xpX+aiW+4,aiY+3);
  // Mini sparkline
  const slY=aiY+6, slH=12, slW=aiW;
  cx.fillStyle='#1A1A2A88';cx.fillRect(xpX,slY,slW,slH);
  const now=Date.now(), bins=15, binW2=slW/bins;
  const binCounts=new Array(bins).fill(0);
  for(const t of S.activityHistory){const ago=(now-t)/1000;if(ago<30){const bi=Math.min(Math.floor(ago/2),bins-1);binCounts[bins-1-bi]++}}
  const maxBin=Math.max(...binCounts,1);
  for(let i=0;i<bins;i++){const bh=(binCounts[i]/maxBin)*slH;cx.fillStyle=binCounts[i]>3?'#FF884488':binCounts[i]>1?'#44AA4488':'#FFFFFF22';cx.fillRect(xpX+i*binW2,slY+slH-bh,binW2-1,bh)}
  // Orchestration HUD
  if(S.orchRun&&S.orchRun.state&&S.orchRun.state!=='done'&&S.orchRun.state!=='failed'){
    const oY=slY+slH+3, oTotal=S.orchRun.total||1, oDone=S.orchRun.done||0, oW2=xpW, oH2=4;
    cx.fillStyle='#222';cx.fillRect(xpX,oY,oW2,oH2);
    const oPct=Math.min(oDone/oTotal,1);
    const oG=cx.createLinearGradient(xpX,0,xpX+oW2*oPct,0);oG.addColorStop(0,'#CC6600');oG.addColorStop(1,'#FFAA44');
    cx.fillStyle=oG;cx.fillRect(xpX,oY,oW2*oPct,oH2);
    cx.fillStyle='#FFD080';cx.font='bold 7px monospace';cx.fillText('DAG '+oDone+'/'+oTotal,xpX+oW2+4,oY+4);
  }
  // Elevator + badges
  S.elevatorPackets=S.elevatorPackets.filter(ep=>{ep.progress+=ep.speed;return ep.progress<1});
  updateFloorBadges();
  cx.restore();
  S.fr++;
  S.mainCx.drawImage(S.buf,0,0);
}

// ── Init ──
export function initGame(){
  S.agents = AT.map((t,i)=>new Ag(t,i));
}
