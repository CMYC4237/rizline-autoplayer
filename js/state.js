// state.js — 全局状态
const ST = {
  chart: null,
  assets: {short:null,long:null,fx:[]},
  audioCtx: null,
  audioBufs: {},
  ready: false,
  playing: false,
  tick: 0, lastMs: 0, rate: 1,
  judgeOff: 0, sScale: 0.04, flowSpeed: 1,
  sfxVol: 0.6, bgmVol: 0.6, lineW: 4, wheelStep: 0.25,
  mask: true,
  maxTick: 1,
  particles: [],
  judged: new Set(),
  holdStates: {}, // n._gi → {headHit, tailHit}
  // 加载时用，避免每帧重建
  loadImg(src){return new Promise(r=>{const i=new Image();i.onload=()=>r(i);i.onerror=()=>{console.warn('miss:'+src);r(null)};i.src=src})},
};
