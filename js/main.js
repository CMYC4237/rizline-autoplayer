// main.js — 启动 + 渲染循环
async function boot(){
  UI.init();
  const cv=document.getElementById('cv');const ctx=cv.getContext('2d');

  // 预加载固定资源（失败不阻塞）
  ST.assets.short=await ST.loadImg('resources/HoldLineShort512px.png');
  ST.assets.long=await ST.loadImg('resources/HoldLineLong512px.png');
  const fxp=[];for(let i=0;i<=40;i++)fxp.push(ST.loadImg(`resources/hit_fx/HitFX_${String(i).padStart(5,'0')}.png`));
  ST.assets.fx=await Promise.all(fxp);

  // 音频上下文
  try{ST.audioCtx=new(window.AudioContext||window.webkitAudioContext)()}catch(e){}
  AudioMgr.sfxInit().catch(()=>{});

  let lastInfo=0;
  const pCv=document.getElementById('perf'),pCtx=pCv.getContext('2d');
  const pW=pCv.width,pH=pCv.height,pHist=[],pMax=200;
  let pPrev=0,pMaxMs=16;
  function loop(ms){
    UI.tick(ms);
    Render.frame(ctx, ST.tick);
    // 帧耗时记录
    if(pPrev){const dt=ms-pPrev;pHist.push(dt);if(pHist.length>pMax)pHist.shift()}
    pPrev=ms;
    // 绘制折线图
    if(pHist.length>1){
      const max=Math.max(17,...pHist),px=pW/pHist.length;
      pMaxMs=pMaxMs*0.95+max*0.05; // 平滑上限
      pCtx.clearRect(0,0,pW,pH);
      pCtx.strokeStyle='#6366f1';pCtx.lineWidth=1;pCtx.beginPath();
      for(let i=0;i<pHist.length;i++){
        const h=pH-(pHist[i]/pMaxMs)*pH;
        i===0?pCtx.moveTo(0,h):pCtx.lineTo(i*px,h);
      }
      pCtx.stroke();
      // 16.67ms 参考线
      const r16=pH-(16.67/pMaxMs)*pH;
      pCtx.strokeStyle='rgba(239,68,68,.35)';pCtx.setLineDash([3,4]);
      pCtx.beginPath();pCtx.moveTo(0,r16);pCtx.lineTo(pW,r16);pCtx.stroke();pCtx.setLineDash([]);
      // 标签
      pCtx.fillStyle='#94a3b8';pCtx.font='10px sans-serif';
      pCtx.fillText(pMaxMs.toFixed(0)+'ms',2,10);
      const loCount=pHist.filter(t=>t>20).length;
      pCtx.fillText((loCount/pHist.length*100).toFixed(0)+'% low',pW-42,10);
    }
    if(ms-lastInfo>200 && ST.chart){const s=U.tickToSec(ST.tick);document.getElementById('info').textContent=`t ${ST.tick.toFixed(1)} | ${U.fmtSec(s)}s | judged ${ST.judged.size}`;lastInfo=ms}
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}
boot();
