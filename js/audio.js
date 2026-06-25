// audio.js — SFX（判定音效）+ BGM（背景音乐）
// 注意：不能命名为 Audio，会 shadow 浏览器内置 Audio 构造器
const AudioMgr = {
  _sfxSources: [], _sfxBufHit: null, _sfxBufDrag: null, _maxSfx: 8, _sfxInitDone: false,

  async sfxInit(){
    if(!ST.audioCtx){console.warn('SFX: audioCtx is null');return}
    if(this._sfxInitDone)return;
    try{
      if(ST.audioCtx.state==='suspended')await ST.audioCtx.resume();
      const [rh, rd]=await Promise.all([
        fetch('resources/audio/hit.wav'),
        fetch('resources/audio/drag.wav')
      ]);
      if(!rh.ok)throw new Error('hit HTTP '+rh.status);
      if(!rd.ok)throw new Error('drag HTTP '+rd.status);
      const [bh, bd]=await Promise.all([rh.arrayBuffer(), rd.arrayBuffer()]);
      const [dh, dd]=await Promise.all([
        ST.audioCtx.decodeAudioData(bh),
        ST.audioCtx.decodeAudioData(bd)
      ]);
      this._sfxBufHit=dh; this._sfxBufDrag=dd; this._sfxInitDone=true;
      console.log('SFX: hit+ drag decoded OK');
    }catch(e){console.warn('SFX init failed:',e)}
  },

  sfxPlay(type){
    const buf = type==='drag' ? this._sfxBufDrag : this._sfxBufHit;
    if(!ST.audioCtx||!buf){
      if(!this._sfxInitDone)this.sfxInit();
      return;
    }
    if(ST.audioCtx.state==='suspended')ST.audioCtx.resume();
    while(this._sfxSources.length>=this._maxSfx){try{this._sfxSources.shift().stop()}catch(e){}}
    const s=ST.audioCtx.createBufferSource();s.buffer=buf;
    const g=ST.audioCtx.createGain();g.gain.value=ST.sfxVol*0.4;
    s.connect(g);g.connect(ST.audioCtx.destination);
    s.onended=()=>{const i=this._sfxSources.indexOf(s);if(i>=0)this._sfxSources.splice(i,1)};
    this._sfxSources.push(s);s.start();
  },

  // ==== BGM ====
  _bgmEl: null,

  bgmLoad(file){
    if(this._bgmEl){this._bgmEl.pause();URL.revokeObjectURL(this._bgmEl.src);this._bgmEl.remove()}
    const url=URL.createObjectURL(file);
    this._bgmEl=document.createElement('audio');
    this._bgmEl.src=url;
    this._bgmEl.volume=ST.bgmVol;
    this._bgmEl.loop=false;
    this._bgmEl.preload='auto';
    this._bgmEl.playbackRate=ST.rate;
    this._bgmEl.onerror=()=>console.warn('BGM: element error');
    this._bgmEl.oncanplaythrough=()=>console.log('BGM: canplaythrough');
    document.body.appendChild(this._bgmEl);
    console.log('BGM loaded:',file.name,'size:',file.size);
  },

  bgmPlay(){
    if(!this._bgmEl){console.warn('BGM: no element');return}
    this._bgmEl.playbackRate=ST.rate;
    const p=this._bgmEl.play();
    if(p&&p.then)p.then(()=>console.log('BGM: playing')).catch(e=>console.warn('BGM: play() rejected:',e.message));
  },
  bgmPause(){ if(this._bgmEl)this._bgmEl.pause(); },
  bgmSeek(sec){ if(this._bgmEl&&isFinite(sec))try{this._bgmEl.currentTime=sec}catch(e){} },
  bgmVolume(v){ if(this._bgmEl)this._bgmEl.volume=v; },
  bgmRate(v){ if(this._bgmEl)try{this._bgmEl.playbackRate=v}catch(e){} },
};
