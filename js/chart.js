// chart.js — 谱面加载、预处理、插值引擎
const Chart = {
  loadJSON(data){
    ST.chart = data;
    this._preprocess();
    ST.maxTick = this._computeMaxTick();
    ST.ready = true;
  },
  _preprocess(){
    let gi=0;
    for(const ln of ST.chart.lines){
      for(const n of ln.notes)n._gi=gi++;
    }
    // 为所有关键帧数组附加游标 _i，避免每帧 O(n) 线性搜索
    for(const cm of ST.chart.canvasMoves||[]){
      if(cm.speedKeyPoints)cm.speedKeyPoints._i=0;
      if(cm.xPositionKeyPoints)cm.xPositionKeyPoints._i=0;
    }
    if(ST.chart.cameraMove){
      const cm=ST.chart.cameraMove;
      if(cm.scaleKeyPoints)cm.scaleKeyPoints._i=0;
      if(cm.xPositionKeyPoints)cm.xPositionKeyPoints._i=0;
    }
    for(const ln of ST.chart.lines){
      if(ln.linePoints)ln.linePoints._ri=0;
      if(ln.lineColor)ln.lineColor._i=0;
      if(ln.judgeRingColor)ln.judgeRingColor._i=0;
    }
    // 按首线点 time 升序排列：早出现的线先渲染（底层），晚出现的后渲染（上层）
    ST.chart._linesByCanvas=[...ST.chart.lines].sort((a,b)=>{
      const ta=a.linePoints[0].time,tb=b.linePoints[0].time;
      return ta-tb;
    });
  },
  _computeMaxTick(){
    let m=0;
    for(const ln of ST.chart.lines){
      for(const p of ln.linePoints)m=Math.max(m,p.time);
      for(const n of ln.notes)m=Math.max(m,n.type===2&&n.otherInformations[0]?n.otherInformations[0]:n.time);
    }
    return m+2;
  },
  // ---- 关键帧插值（游标推进，每帧 O(1) 摊销）----
  interpKP(kps,tick){
    if(!kps||!kps.length)return 0;
    if(tick<=kps[0].time){kps._i=0;return kps[0].value}
    const n=kps.length;if(tick>=kps[n-1].time){kps._i=n-2;return kps[n-1].value}
    while(kps._i>0&&tick<kps[kps._i].time)kps._i--;
    while(kps._i<n-2&&tick>=kps[kps._i+1].time)kps._i++;
    const a=kps[kps._i],b=kps[kps._i+1],t=(tick-a.time)/(b.time-a.time);
    return U.lerp(a.value,b.value,(E[a.easeType]||E[0])(t));
  },
  // 画布累计 floorPosition（不含流速缩放）
  canvasFloorPos(cm,tick){
    if(!cm)return U.tickToSec(tick);
    const sp=cm.speedKeyPoints;if(!sp||!sp.length)return U.tickToSec(tick);
    const sec=U.tickToSec(tick),n=sp.length;
    if(n===1)return sp[0].value*sec;
    if(sec<=U.tickToSec(sp[0].time)){sp._i=0;return sp[0].floorPosition+sp[0].value*(sec-U.tickToSec(sp[0].time))}
    // 游标：前进/后退到正确的段
    while(sp._i>0&&sec<U.tickToSec(sp[sp._i].time))sp._i--;
    while(sp._i<n-2&&sec>U.tickToSec(sp[sp._i+1].time))sp._i++;
    const i=(sec<=U.tickToSec(sp[n-1].time))?sp._i:n-1;
    if(i<n-1){const t0=U.tickToSec(sp[i].time);return sp[i].floorPosition+sp[i].value*(sec-t0)}
    const last=sp[n-1];return last.floorPosition+last.value*(sec-U.tickToSec(last.time));
  },
  // 流速缩放系数（文档公式：(215/32 + speed) / (215/32 + 1)）
  _flowRatio(){return (215/32+ST.flowSpeed)/(215/32+1)},
  // 元素屏幕 Y（应用流速缩放）
  elemY(fp,canvasIdx,tick){
    const cm=ST.chart.canvasMoves[canvasIdx];
    return 720 + ST.judgeOff - this._flowRatio() * (fp - this.canvasFloorPos(cm,tick)) * 960;
  },
  // note 不隶属 canvas，只跟线点走。位置=两个相邻线点按时间进度插值
  _lineXY(line,fp,tick,noteTime){
    const pts=line.linePoints;if(!pts.length)return null;
    let k=-1;
    if(noteTime!=null)for(let i=pts.length-2;i>=0;i--)if(noteTime>=pts[i].time&&noteTime<=pts[i+1].time){k=i;break}
    if(k<0)for(let i=0;i<pts.length;i++)if(Math.abs(pts[i].floorPosition-fp)<1e-6){k=i<pts.length-1?i:i-1;break}
    if(k<0)for(let i=0;i<pts.length-1;i++){const lo=Math.min(pts[i].floorPosition,pts[i+1].floorPosition),hi=Math.max(pts[i].floorPosition,pts[i+1].floorPosition);if(fp>=lo&&fp<=hi){k=i;break}}
    if(k<0){k=fp<=pts[0].floorPosition?0:pts.length-2;if(k<0)k=0}
    const p0=pts[k],p1=pts[Math.min(k+1,pts.length-1)];
    const s0=this.pointScreen(p0,tick),s1=this.pointScreen(p1,tick);
    const ny=this.elemY(fp,p0.canvasIndex,tick);
    const dy=s1.y-s0.y;
    const t=Math.abs(dy)<1e-6?0:U.clamp((ny-s0.y)/dy,0,1);
    const eT=(E[p0.easeType]||E[0])(t);
    return {x:U.lerp(s0.x,s1.x,eT), y:ny};
  },
  lineX(line,fp,tick,noteTime){const s=this._lineXY(line,fp,tick,noteTime);return s?s.x:270},
  lineY(line,fp,tick,noteTime){const s=this._lineXY(line,fp,tick,noteTime);return s?s.y:720+ST.judgeOff},
  pointScreen(p,tick){
    const cm=ST.chart.canvasMoves[p.canvasIndex];
    const xOff = cm?this.interpKP(cm.xPositionKeyPoints,tick):0;
    return { x:(p.xPosition+xOff+0.5)*540, y:this.elemY(p.floorPosition,p.canvasIndex,tick), p };
  },
  currentTheme(tick){
    const ct=ST.chart.challengeTimes||[];let tIdx=0,blend=0;
    for(let i=0;i<ct.length;i++){const s=ct[i].start,e=ct[i].end,tr=ct[i].transTime;
      if(tick<s-tr/2)break;else if(tick<s+tr/2){tIdx=i;blend=(tick-(s-tr/2))/tr;break}
      else if(tick<e-tr/2){tIdx=i+1;blend=1}else if(tick<e+tr/2){tIdx=i+1;blend=1-(tick-(e-tr/2))/tr}else{tIdx=0;blend=0}}
    const t0=ST.chart.themes[Math.min(tIdx,ST.chart.themes.length-1)],t1=ST.chart.themes[Math.min(tIdx+(blend>0&&blend<1?1:0),ST.chart.themes.length-1)];
    if(blend<=0||blend>=1)return t0.colorsList;
    return t0.colorsList.map((c,i)=>U.lerpC(c,t1.colorsList[i],blend));
  },
  // 判定是否处于 Riztime 区间（用于打击粒子增强）
  isRiztime(tick){
    const ct=ST.chart.challengeTimes||[];
    for(let i=0;i<ct.length;i++)if(tick>=ct[i].start&&tick<=ct[i].end)return true;
    return false;
  },
  // lineColor 插值（游标推进）
  interpLC(lc,tick){
    if(!lc||!lc.length)return null;
    if(tick<=lc[0].time){lc._i=0;return lc[0].startColor}
    const n=lc.length;
    if(n===1||tick>=lc[n-1].time){lc._i=n-1;return lc[n-1].startColor}
    while(lc._i>0&&tick<lc[lc._i].time)lc._i--;
    while(lc._i<n-2&&tick>=lc[lc._i+1].time)lc._i++;
    const a=lc[lc._i],b=lc[lc._i+1],t=(tick-a.time)/(b.time-a.time);
    return U.lerpC(a.startColor,a.endColor,t);
  },
  pointColor(p,lc,lcActive,tick){
    let c={r:p.color.r,g:p.color.g,b:p.color.b,a:p.color.a};
    if(!lcActive)return c;
    const o=this.interpLC(lc,tick);if(!o)return c;
    const k=o.a/255;return{r:U.lerp(c.r,o.r,k),g:U.lerp(c.g,o.g,k),b:U.lerp(c.b,o.b,k),a:c.a};
  },
  // 判定环色（游标推进）
  interpRing(jrc,tick){
    if(tick<jrc[0].time){jrc._i=0;return {r:0,g:0,b:0,a:0}}
    if(tick<=jrc[0].time){jrc._i=0;return jrc[0].startColor}
    const n=jrc.length;
    if(n===1||tick>=jrc[n-1].time){jrc._i=n-1;return jrc[n-1].startColor}
    while(jrc._i>0&&tick<jrc[jrc._i].time)jrc._i--;
    while(jrc._i<n-2&&tick>=jrc[jrc._i+1].time)jrc._i++;
    const a=jrc[jrc._i],b=jrc[jrc._i+1],t=(tick-a.time)/(b.time-a.time);
    return U.lerpC(a.startColor,a.endColor,t);
  },
};
