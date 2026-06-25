// utils.js — 通用数学/颜色工具
const U = {
  lerp(a,b,t){return a+(b-a)*t},
  clamp(v,a,b){return Math.max(a,Math.min(b,v))},
  lerpC(c1,c2,t){return{r:U.lerp(c1.r,c2.r,t),g:U.lerp(c1.g,c2.g,t),b:U.lerp(c1.b,c2.b,t),a:U.lerp(c1.a,c2.a,t)}},
  rgba(r,g,b,a){return`rgba(${r|0},${g|0},${b|0},${(a/255).toFixed(3)})`},
  rgbCss(r,g,b){return`rgb(${r|0},${g|0},${b|0})`},
  xPosToPx(xp){return(xp+0.5)*540},
  fmtSec(s){return s.toFixed(1)},
  tickToSec(t){return t*60/ST.chart.bPM},
  S(v){return v*ST.sScale},
};
