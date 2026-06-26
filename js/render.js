// render.js — 所有 Canvas 2D 绘制：引导线、音符、判定环、遮罩、粒子
const Render = {
  _offs: {}, // 离屏 canvas 缓存
  _getOff(w,h){const k=Math.ceil(w)+'x'+Math.ceil(h);let c=this._offs[k];if(!c){c=document.createElement('canvas');c.width=Math.max(1,Math.ceil(w));c.height=Math.max(1,Math.ceil(h));this._offs[k]=c}return c},

  frame(ctx,tick){
    if(!ST.chart||!ST.ready){ctx.fillStyle='#f0f2f5';ctx.fillRect(0,0,540,960);return}
    const theme=Chart.currentTheme(tick);
    const bg=theme[0], nc=theme[1], uc=theme[2];

    // ① 背景
    ctx.fillStyle=U.rgbCss(bg.r,bg.g,bg.b);ctx.fillRect(0,0,540,960);

    // ② 相机变换
    const camScale=Chart.interpKP(ST.chart.cameraMove.scaleKeyPoints,tick);
    const camX=Chart.interpKP(ST.chart.cameraMove.xPositionKeyPoints,tick);
    ctx.save();
    ctx.translate(270, 720+ST.judgeOff);ctx.scale(camScale,camScale);ctx.translate(-270,-(720+ST.judgeOff));
    ctx.translate(-camX*540,0);

    // ③ 引导线（按 canvas Z 序）→ Hold → Tap/Drag → Ring → 粒子
    const jy = 720+ST.judgeOff;
    const lines=ST.chart._linesByCanvas||ST.chart.lines;
    for(const ln of lines) this._line(ctx,ln,tick);
    for(const ln of ST.chart.lines) this._notesHolds(ctx,ln,tick,nc,uc);
    for(const ln of ST.chart.lines) this._notesTaps(ctx,ln,tick,nc,uc);
    for(const ln of ST.chart.lines) this._ring(ctx,ln,tick,jy);
    this._particles(ctx,uc);
    ctx.restore();

    // ④ 遮罩
    if(ST.mask) this._mask(ctx,bg);
  },

  // 单线点：画一个小圆（谱师常用作灰尘/装饰）
  _dot(ctx,x,y,line,p,tick){
    const lc=line.lineColor,lcA=lc&&lc.length>0, col=Chart.pointColor(p,lc,lcA,tick);
    ctx.fillStyle=U.rgba(col.r,col.g,col.b,col.a);ctx.beginPath();ctx.arc(x,y,ST.lineW*1.5,0,Math.PI*2);ctx.fill();
  },

  _line(ctx,line,tick){
    const pts=line.linePoints;if(!pts.length)return;
    // Y 范围裁剪：首尾线点均离屏太远则跳过（兼容负流速回拉、单线点的情况）
    const y0=Chart.elemY(pts[0].floorPosition,pts[0].canvasIndex,tick);
    const yN=Chart.elemY(pts[pts.length-1].floorPosition,pts[pts.length-1].canvasIndex,tick);
    if(Math.max(y0,yN)<-300||Math.min(y0,yN)>1260)return;
    if(pts.length<2){const p=Chart.pointScreen(pts[0],tick);this._dot(ctx,p.x,p.y,line,pts[0],tick);return}
    const lc=line.lineColor, lcA=lc&&lc.length>0;
    const sp=pts.map(p=>Chart.pointScreen(p,tick));
    // 所有线点趋于同一点（零长线→谱师用作「灰尘」装饰）→ 画点而非勾线
    const sx=sp[0].x,sy=sp[0].y;let allSame=true;
    for(let i=1;i<sp.length;i++)if(Math.abs(sp[i].x-sx)>3||Math.abs(sp[i].y-sy)>3){allSame=false;break}
    if(allSame){this._dot(ctx,sx,sy,line,pts[0],tick);return}
    const gr=ctx.createLinearGradient(sp[0].x,sp[0].y,sp[sp.length-1].x,sp[sp.length-1].y);
    // 所有线点作为色标，按 floorPosition 比例分布（处理首尾透明但中间有色的线）
    const minFp=pts[0].floorPosition, maxFp=pts[pts.length-1].floorPosition, fpRange=Math.abs(maxFp-minFp);
    for(let i=0;i<sp.length;i++){
      const col=Chart.pointColor(sp[i].p,lc,lcA,tick);
      // 水平线（所有 FP 相同）→ 按索引均匀分布色标；否则按 FP 比例
      const pos=fpRange<1e-6 ? i/Math.max(1,sp.length-1) : (pts[i].floorPosition-minFp)/fpRange;
      gr.addColorStop(Math.min(1,Math.max(0,pos)),U.rgba(col.r,col.g,col.b,col.a));
    }
    ctx.strokeStyle=gr;ctx.lineWidth=ST.lineW;ctx.lineCap='round';ctx.lineJoin='round';
    ctx.beginPath();ctx.moveTo(sp[0].x,sp[0].y);
    for(let i=0;i<sp.length-1;i++){
      const a=sp[i],b=sp[i+1],e=E[a.p.easeType]||E[0];
      if(a.p.easeType===13){ctx.lineTo(a.x,b.y);ctx.lineTo(b.x,b.y)}
      else if(a.p.easeType===14){ctx.lineTo(b.x,a.y);ctx.lineTo(b.x,b.y)}
      else{const s=16;for(let j=1;j<=s;j++){const t=j/s;ctx.lineTo(U.lerp(a.x,b.x,e(t)),U.lerp(a.y,b.y,t))}}
    }
    ctx.stroke();
  },

  _notesHolds(ctx,line,tick,nc,uc){
    for(const n of line.notes){
      if(n.type!==2)continue;
      if(ST.judged.has(n._gi))continue;
      const tailTick=n.otherInformations[0];
      if(tick>=tailTick){
        const hs=ST.holdStates[n._gi]||{};
        if(!hs.tailHit){this._trigger(ctx,n,line,tick,uc,'',tailTick);hs.tailHit=true;ST.holdStates[n._gi]=hs}
        ST.judged.add(n._gi);continue;
      }
      if(tick>=n.time){
        const hs=ST.holdStates[n._gi]||{};
        if(!hs.headHit){this._trigger(ctx,n,line,tick,uc,'hit',n.time);hs.headHit=true;ST.holdStates[n._gi]=hs}
        this._holdLocked(ctx,n,line,tick,nc);continue;
      }
      const x=Chart.lineX(line,n.floorPosition,tick,n.time),y=Chart.lineY(line,n.floorPosition,tick,n.time);
      if(y>-200&&y<1160)this._hold(ctx,x,y,n,line,tick,nc);
    }
  },
  _notesTaps(ctx,line,tick,nc,uc){
    for(const n of line.notes){
      if(n.type===2)continue;
      if(ST.judged.has(n._gi))continue;
      if(tick>=n.time){this._trigger(ctx,n,line,tick,uc,n.type===0?'hit':'drag',n.time);ST.judged.add(n._gi);continue}
      const x=Chart.lineX(line,n.floorPosition,tick,n.time),y=Chart.lineY(line,n.floorPosition,tick,n.time);
      if(y<-200||y>1160)continue;
      n.type===0?this._tap(ctx,x,y,nc):this._drag(ctx,x,y);
    }
  },

  _tap(ctx,x,y,nc){
    ctx.fillStyle='rgba(0,0,0,0.4)';ctx.beginPath();ctx.arc(x,y,U.S(990)/2,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#000';ctx.beginPath();ctx.arc(x,y,U.S(900)/2,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=U.rgba(nc.r,nc.g,nc.b,255);ctx.beginPath();ctx.arc(x,y,U.S(540)/2,0,Math.PI*2);ctx.fill();
  },
  _drag(ctx,x,y){
    ctx.fillStyle='#000';ctx.beginPath();ctx.arc(x,y,U.S(700)/2,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(x,y,U.S(500)/2,0,Math.PI*2);ctx.fill();
  },
  _hold(ctx,x,y,n,line,tick,nc){
    // 未到达判定线的 Hold，正常飞行
    ctx.fillStyle='rgba(0,0,0,0.4)';ctx.beginPath();ctx.arc(x,y,U.S(990)/2,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#000';ctx.beginPath();ctx.arc(x,y,U.S(900)/2,0,Math.PI*2);ctx.fill();
    const tf=n.otherInformations[2],tc=n.otherInformations[1];
    const ty=Chart.elemY(tf,tc,tick),hh=y-ty;
    const o=U.S(600),i=U.S(400),bw=(o-i)/2;
    this._strip(ctx,x-i/2-bw/2,y,bw,hh,'#000',ST.assets.short);
    this._strip(ctx,x+i/2+bw/2,y,bw,hh,'#000',ST.assets.short);
    this._strip(ctx,x,y,i,hh,U.rgba(nc.r,nc.g,nc.b,255),ST.assets.long);
    ctx.fillStyle='#000';ctx.beginPath();ctx.arc(x,y,U.S(700)/2,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(x,y,U.S(500)/2,0,Math.PI*2);ctx.fill();
  },
  _holdLocked(ctx,n,line,tick,nc){
    // 头部已锁定在环处，body 延伸到尾部（尾部随 canvas 下落）
    const jy=720+ST.judgeOff;
    const headX=this._ringX(line,tick,jy);
    if(isNaN(headX))return;
    const headY=jy;
    const tailFp=n.otherInformations[2],tailC=n.otherInformations[1];
    const tailY=Chart.elemY(tailFp,tailC,tick);
    const hh=headY-tailY;
    // Z3/Z0 画在头部
    ctx.fillStyle='rgba(0,0,0,0.4)';ctx.beginPath();ctx.arc(headX,headY,U.S(990)/2,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#000';ctx.beginPath();ctx.arc(headX,headY,U.S(900)/2,0,Math.PI*2);ctx.fill();
    // 条：body 随头 X
    const o=U.S(600),i=U.S(400),bw=(o-i)/2;
    this._strip(ctx,headX-i/2-bw/2,headY,bw,hh,'#000',ST.assets.short);
    this._strip(ctx,headX+i/2+bw/2,headY,bw,hh,'#000',ST.assets.short);
    this._strip(ctx,headX,headY,i,hh,U.rgba(nc.r,nc.g,nc.b,255),ST.assets.long);
    ctx.fillStyle='#000';ctx.beginPath();ctx.arc(headX,headY,U.S(700)/2,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(headX,headY,U.S(500)/2,0,Math.PI*2);ctx.fill();
  },
  _strip(ctx,cx,by,w,h,tint,img){
    if(w<=0||!h||!img)return;
    // 裁剪可见范围，避免超长/负长度 hold 的离屏 canvas 溢出
    const y1=by,y2=by-h,top=Math.min(y1,y2),bot=Math.max(y1,y2);
    const vTop=Math.max(-2048,top),vBot=Math.min(3008,bot);if(vTop>=vBot)return;
    const vH=Math.min(Math.ceil(vBot-vTop),4096),iw=Math.max(1,Math.ceil(w));
    const o=this._getOff(iw,vH),ox=o.getContext('2d');
    ox.clearRect(0,0,iw,vH);ox.fillStyle=tint;ox.fillRect(0,0,iw,vH);
    ox.globalCompositeOperation='destination-in';
    ox.drawImage(img,0,0,img.width,img.height,0,0,iw,vH);
    ox.globalCompositeOperation='source-over';
    ctx.drawImage(o,cx-w/2,vTop);
  },

  _ring(ctx,line,tick,jy){
    const pts=line.linePoints;if(!pts.length)return;
    const y0=Chart.elemY(pts[0].floorPosition,pts[0].canvasIndex,tick);
    const yN=Chart.elemY(pts[pts.length-1].floorPosition,pts[pts.length-1].canvasIndex,tick);
    if(Math.max(y0,yN)<-300||Math.min(y0,yN)>1260)return;
    const jrc=line.judgeRingColor;if(!jrc||!jrc.length)return;
    const col=Chart.interpRing(jrc,tick);
    if(!col||(col.r===0&&col.g===0&&col.b===0&&col.a===0))return;
    const x=this._ringX(line,tick,jy);
    if(isNaN(x))return; // 线不经过判定高度
    const oR=U.S(1260)/2,iR=U.S(1071)/2,mR=(oR+iR)/2;
    ctx.strokeStyle=U.rgba(col.r,col.g,col.b,col.a);
    ctx.lineWidth=Math.max(.5,oR-iR);
    ctx.beginPath();ctx.arc(x,jy,mR,0,Math.PI*2);ctx.stroke();
  },
  _ringX(line,tick,jy){
    const pts=line.linePoints;if(pts.length<2)return NaN;
    // 找判定线 Y 落在哪两个相邻线点屏幕 Y 之间
    for(let i=0;i<pts.length-1;i++){
      const a=Chart.pointScreen(pts[i],tick), b=Chart.pointScreen(pts[i+1],tick);
      const lo=Math.min(a.y,b.y), hi=Math.max(a.y,b.y);
      if(jy>=lo&&jy<=hi){
        const t=(jy-a.y)/(b.y-a.y||1);
        const e=(E[pts[i].easeType]||E[0])(t);
        return U.lerp(a.x,b.x,e);
      }
    }
    // 线不经过判定高度
    return NaN;
  },

  _mask(ctx,bg){
    const r=bg.r,g=bg.g,b=bg.b,s=U.rgbCss(r,g,b),jy=720+ST.judgeOff,TO=96;
    ctx.fillStyle=s;ctx.fillRect(0,0,540,TO);
    let gr=ctx.createLinearGradient(0,TO,0,TO+60);
    for(let i=0;i<=24;i++){const t=i/24,e=t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;gr.addColorStop(t,U.rgba(r,g,b,255*(1-e)))}
    ctx.fillStyle=gr;ctx.fillRect(0,TO,540,60);
    gr=ctx.createLinearGradient(0,jy,0,jy+50);
    for(let i=0;i<=24;i++){const t=i/24,e=t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;gr.addColorStop(t,U.rgba(r,g,b,255*e))}
    ctx.fillStyle=gr;ctx.fillRect(0,jy,540,50);
    ctx.fillStyle=s;ctx.fillRect(0,jy+50,540,960-(jy+50));
    ctx.fillStyle=s;ctx.fillRect(0,0,5,960);
    gr=ctx.createLinearGradient(5,0,35,0);
    for(let i=0;i<=16;i++){const t=i/16,e=t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;gr.addColorStop(t,U.rgba(r,g,b,255*(1-e)))}
    ctx.fillStyle=gr;ctx.fillRect(5,0,30,960);
    gr=ctx.createLinearGradient(505,0,535,0);
    for(let i=0;i<=16;i++){const t=i/16,e=t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;gr.addColorStop(t,U.rgba(r,g,b,255*e))}
    ctx.fillStyle=gr;ctx.fillRect(505,0,30,960);
    ctx.fillStyle=s;ctx.fillRect(535,0,5,960);
  },

  _trigger(ctx,n,line,tick,uc,noteType,judgeTime){
    const x=Chart.lineX(line,n.floorPosition,tick,judgeTime),y=720+ST.judgeOff;
    const s=[];
    for(let i=0;i<4;i++){const a=Math.random()*Math.PI*2;s.push({x,y,vx:Math.cos(a)*650*(.8+Math.random()*.4),vy:Math.sin(a)*650*(.8+Math.random()*.4),r:16*(.85+Math.random()*.3)})}
    // Riztime 上升粒子：3~4 个，半径≈飞溅一半，缓出上升 + 缓入缩隐
    const rise=[];
    if(Chart.isRiztime(tick)){
      const n=3+Math.floor(Math.random()*2),xOff=U.S(990)/2;
      for(let i=0;i<n;i++)rise.push({x:x+(Math.random()-.5)*xOff,y,targetY:Math.random()*480,r:5.3*(.85+Math.random()*.3)});
    }
    ST.particles.push({st:performance.now(),x,y,s,rise:rise.length?rise:null,t:uc});
    if(noteType)AudioMgr.sfxPlay(noteType);
  },
  _particles(ctx,uc){
    const now=performance.now();
    ST.particles=ST.particles.filter(p=>{
      const e=(now-p.st)/1000;if(e>.5)return false;
      const t=e/.5,fi=Math.min(40,Math.floor(e/.5*41)),img=ST.assets.fx[fi];
      if(img){
        const fw=Math.max(1,Math.ceil(img.width*.25)),fh=Math.max(1,Math.ceil(img.height*.25)),o=this._getOff(fw,fh),ox=o.getContext('2d');
        ox.clearRect(0,0,fw,fh);ox.fillStyle=U.rgba(p.t.r,p.t.g,p.t.b,255);ox.fillRect(0,0,fw,fh);
        ox.globalCompositeOperation='destination-in';ox.drawImage(img,0,0,img.width,img.height,0,0,fw,fh);ox.globalCompositeOperation='source-over';
        ctx.drawImage(o,p.x-fw/2,p.y-fh/2);
      }
      const dc=Math.exp(-5*t),sf=1-t*t;
      ctx.globalAlpha=Math.max(0,1-t);ctx.fillStyle=U.rgba(p.t.r,p.t.g,p.t.b,255);
      for(const q of p.s){const d=(1-dc)/5,r=q.r*sf;if(r>.5){ctx.beginPath();ctx.arc(q.x+q.vx*d,q.y+q.vy*d,r,0,Math.PI*2);ctx.fill()}}
      ctx.globalAlpha=1;
      // Riztime 上升粒子：ExpoOut 位移上升 + ExpoIn 缩隐
      if(p.rise){
        const ed=1-Math.pow(2,-10*t); // ExpoOut 位移比例
        const es=1-Math.pow(2,10*(t-1)); // ExpoIn 大小/透明度
        ctx.fillStyle=U.rgba(p.t.r,p.t.g,p.t.b,255);
        for(const q of p.rise){
          const ny=q.y-(q.y-q.targetY)*ed,r=q.r*es;
          if(r>.5){ctx.globalAlpha=Math.max(0,es);ctx.beginPath();ctx.arc(q.x,ny,r,0,Math.PI*2);ctx.fill()}
        }
        ctx.globalAlpha=1;
      }
      return true;
    });
  },
};
