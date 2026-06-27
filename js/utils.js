// utils.js — 通用数学/颜色工具
const U = {
  lerp(a,b,t){return a+(b-a)*t},
  clamp(v,a,b){return Math.max(a,Math.min(b,v))},
  lerpC(c1,c2,t){return{r:U.lerp(c1.r,c2.r,t),g:U.lerp(c1.g,c2.g,t),b:U.lerp(c1.b,c2.b,t),a:U.lerp(c1.a,c2.a,t)}},
  rgba(r,g,b,a){return`rgba(${r|0},${g|0},${b|0},${(a/255).toFixed(3)})`},
  rgbCss(r,g,b){return`rgb(${r|0},${g|0},${b|0})`},
  xPosToPx(xp){return(xp+0.5)*540},
  fmtSec(s){return s.toFixed(1)},
  // tick → 秒（支持 BPM 变速）
  tickToSec(tick){
    const shifts=ST.chart.bpmShifts,bpm=ST.chart.bPM;
    if(!shifts||shifts.length<2)return tick*60/bpm;
    let sec=0;
    for(let i=0;i<shifts.length-1;i++){
      const st=shifts[i].time,et=shifts[i+1].time,mult=shifts[i].value;
      if(tick>=et){sec+=(et-st)/(bpm*mult)*60;continue}
      return sec+(tick-st)/(bpm*mult)*60;
    }
    const last=shifts[shifts.length-1];
    return sec+(tick-last.time)/(bpm*last.value)*60;
  },
  // 秒 → tick（支持 BPM 变速）
  secToTick(sec){
    const shifts=ST.chart.bpmShifts,bpm=ST.chart.bPM;
    if(!shifts||shifts.length<2)return sec*bpm/60;
    let tick=0;
    for(let i=0;i<shifts.length-1;i++){
      const st=shifts[i].time,et=shifts[i+1].time,mult=shifts[i].value;
      const segSec=(et-st)/(bpm*mult)*60;
      if(sec>=segSec){sec-=segSec;tick=et;continue}
      return tick+sec*bpm*mult/60;
    }
    const last=shifts[shifts.length-1];
    return tick+sec*bpm*last.value/60;
  },
  S(v){return v*ST.sScale},
  // 当前 tick 的 BPM 倍率（用于帧推进）
  bpmMult(tick){
    const shifts=ST.chart.bpmShifts;
    if(!shifts||shifts.length<2)return 1;
    let m=shifts[0].value;
    for(let i=1;i<shifts.length&&tick>=shifts[i].time;i++)m=shifts[i].value;
    return m;
  },
};
