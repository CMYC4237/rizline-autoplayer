// ui.js — DOM 引用 + 事件绑定
const UI = {
  init(){
    this._=s=>document.getElementById(s);

    // 导入谱面
    this._('b_import').onclick=()=>this._('f_json').click();
    this._('f_json').onchange=e=>{const f=e.target.files[0];if(f)this._importChart(f)};
    // 导入音乐(BGM)
    this._('b_audio').onclick=()=>this._('f_audio').click();
    this._('f_audio').onchange=e=>{const f=e.target.files[0];if(f)this._importBGM(f)};
    // 回到开始
    this._('b_begin').onclick=()=>this._reset();
    // 播放
    this._('b_play').onclick=()=>{
      if(!ST.ready)return;
      ST.playing=true;ST.lastMs=performance.now();
      AudioMgr.bgmPlay();
      if(ST.audioCtx&&ST.audioCtx.state==='suspended')ST.audioCtx.resume();
    };
    // 暂停
    this._('b_pause').onclick=()=>{ST.playing=false;AudioMgr.bgmPause()};
    // 进度条
    this._('seek').oninput=e=>{
      if(!ST.ready)return;
      ST.tick=parseFloat(e.target.value)/1000*ST.maxTick;ST._seek=true;ST.judged.clear();ST.particles=[];ST.holdStates={};
      AudioMgr.bgmSeek(U.tickToSec(ST.tick));
    };
    // 参数
    this._('rate').oninput=()=>{ST.rate=parseFloat(this._('rate').value);this._('ratev').textContent=ST.rate.toFixed(1);AudioMgr.bgmRate(ST.rate)};
    this._('flow').oninput=()=>{ST.flowSpeed=parseFloat(this._('flow').value);this._('flowv').textContent=ST.flowSpeed.toFixed(1)};
    this._('sfxvol').oninput=()=>{ST.sfxVol=parseFloat(this._('sfxvol').value);this._('sfxvolv').textContent=ST.sfxVol.toFixed(2)};
    this._('bgmvol').oninput=()=>{ST.bgmVol=parseFloat(this._('bgmvol').value);this._('bgmvolv').textContent=ST.bgmVol.toFixed(2);AudioMgr.bgmVolume(ST.bgmVol)};
    this._('linew').oninput=()=>{ST.lineW=parseFloat(this._('linew').value);this._('linewv').textContent=ST.lineW.toFixed(1)};
    this._('joff').oninput=()=>{ST.judgeOff=parseFloat(this._('joff').value);this._('joffv').textContent=ST.judgeOff};
    this._('sscale').oninput=()=>{ST.sScale=parseFloat(this._('sscale').value);this._('sscalev').textContent=ST.sScale.toFixed(3)};
    this._('mask').onchange=e=>ST.mask=e.target.checked;
    this._('wstep').oninput=()=>{ST.wheelStep=parseFloat(this._('wstep').value);this._('wstepv').textContent=ST.wheelStep.toFixed(2)};
    // 键盘
    document.addEventListener('keydown',e=>{
      if(e.target.tagName==='INPUT'&&e.target.type!=='checkbox')return;
      if(e.code==='Space'){e.preventDefault();if(!ST.ready)return;
        ST.playing=!ST.playing;if(ST.playing){ST.lastMs=performance.now();AudioMgr.bgmPlay();if(ST.audioCtx&&ST.audioCtx.state==='suspended')ST.audioCtx.resume()}else{AudioMgr.bgmPause()}
      }
      if(e.code==='ArrowLeft'&&ST.ready){ST.tick=Math.max(0,ST.tick-5);ST._seek=true;ST.judged.clear();ST.particles=[];ST.holdStates={};AudioMgr.bgmSeek(U.tickToSec(ST.tick))}
      if(e.code==='ArrowRight'&&ST.ready){ST.tick+=5;ST._seek=true;ST.judged.clear();ST.particles=[];ST.holdStates={};AudioMgr.bgmSeek(U.tickToSec(ST.tick))}
    });
    // 响应式缩放
    this._resize();window.addEventListener('resize',()=>this._resize());
    // 滚轮：canvas 上=微调进度，步长由 ST.wheelStep 控制
    this._('cv').addEventListener('wheel',e=>{
      if(!ST.ready)return;e.preventDefault();
      ST.tick=U.clamp(ST.tick+(e.deltaY>0?1:-1)*ST.wheelStep,0,ST.maxTick);ST._seek=true;
      ST.judged.clear();ST.particles=[];ST.holdStates={};AudioMgr.bgmSeek(U.tickToSec(ST.tick));
    });
  },

  _reset(){
    ST.tick=0;ST.playing=false;ST.judged.clear();ST.particles=[];ST.holdStates={};
    AudioMgr.bgmPause();AudioMgr.bgmSeek(0);
  },

  _importChart(file){
    this._ov('加载中：'+file.name);
    const rd=new FileReader();
    rd.onload=()=>{
      try{
        Chart.loadJSON(JSON.parse(rd.result));
        this._enable();
        this._('seek').value=0; // 重置进度条
        this._ov(null);
      }catch(e){this._ov('JSON 解析失败：'+e.message,true)}
    };
    rd.onerror=()=>this._ov('读取文件失败',true);
    rd.readAsText(file);
  },

  _importBGM(file){
    AudioMgr.bgmLoad(file);
    this._ov('已加载 BGM：'+file.name);setTimeout(()=>this._ov(null),600);
  },

  _enable(){
    ['b_play','b_pause','b_begin','seek'].forEach(id=>this._(id).disabled=false);
    this._('status').textContent=(ST.chart.songsName||'已加载')+' ('+ST.chart.lines.length+'线)';
  },
  _ov(msg,err){
    this._('ovmsg').textContent=msg||'';
    this._('overlay').classList.toggle('hidden',!msg);
    if(msg)this._('ovmsg').className='msg'+(err?' err':'');
  },

  _resize(){
    const cv=this._('cv');
    const h=window.innerHeight-76; // 留出控件高度
    const w=h*540/960; // 保持 9:16
    if(w>window.innerWidth-330){ // 右侧面板宽度
      const w2=window.innerWidth-330;
      cv.style.width=w2+'px';
      cv.style.height=(w2*960/540)+'px';
    }else{
      cv.style.width=w+'px';
      cv.style.height=h+'px';
    }
  },

  tick(now){
    if(ST.playing&&ST.ready){
      const dt=(now-ST.lastMs)/1000*ST.rate;
      ST.tick+=dt*ST.chart.bPM*U.bpmMult(ST.tick)/60;
      if(ST.tick>=ST.maxTick)this._reset();
    }
    ST.lastMs=now;
    if(ST.ready){const s=U.tickToSec(ST.tick),m=U.tickToSec(ST.maxTick);this._('time').textContent=U.fmtSec(s)+' / '+U.fmtSec(m)+'s';this._('seek').value=ST.tick/ST.maxTick*1000;}
  },
};
