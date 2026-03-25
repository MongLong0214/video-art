precision highp float;

uniform float uTime;
uniform vec2 uResolution;
varying vec2 vUv;

#define PI  3.14159265359
#define TAU 6.28318530718
#define DUR 8.0

// ─── Utility ────────────────────────────────────────────

mat2 rot(float a){float s=sin(a),c=cos(a);return mat2(c,-s,s,c);}

float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}

// HSV → RGB
vec3 hsv(float h,float s,float v){
  vec3 c=clamp(abs(mod(h*6.0+vec3(0,4,2),6.0)-3.0)-1.0,0.0,1.0);
  return v*mix(vec3(1),c,s);
}

float sdEllipse(vec2 p,vec2 ab){
  p=abs(p);if(p.x>p.y){p=p.yx;ab=ab.yx;}
  float l=ab.y*ab.y-ab.x*ab.x;
  float m=ab.x*p.x/l,n=ab.y*p.y/l;
  float c=(m*m+n*n-1.0)/3.0,c3=c*c*c;
  float q=c3+m*m*n*n*2.0,d=c3+m*m*n*n;
  float g=m+m*n*n;float co;
  if(d<0.0){float h=acos(q/c3)/3.0;float s=cos(h),t=sin(h)*sqrt(3.0);
    float rx=sqrt(-c*(s+t+2.0)+m*m),ry=sqrt(-c*(s-t+2.0)+m*m);
    co=(ry+sign(l)*rx+abs(g)/(rx*ry)-m)/2.0;
  }else{float h=2.0*m*n*sqrt(d);
    float s=sign(q+h)*pow(abs(q+h),1.0/3.0),u=sign(q-h)*pow(abs(q-h),1.0/3.0);
    float rx=-s-u-c*4.0+2.0*m*m,ry=(s-u)*sqrt(3.0);float rm=sqrt(rx*rx+ry*ry);
    co=(ry/sqrt(rm-rx)+2.0*g/rm-m)/2.0;}
  vec2 r=ab*vec2(co,sqrt(1.0-co*co));
  return length(r-p)*sign(p.y-r.y);
}

float sdHeart(vec2 p){
  p.x=abs(p.x);
  if(p.y+p.x>1.0)return sqrt(dot(p-vec2(0.25,0.75),p-vec2(0.25,0.75)))-sqrt(2.0)/4.0;
  return sqrt(min(dot(p-vec2(0,1),p-vec2(0,1)),
    dot(p-0.5*max(p.x+p.y,0.0),p-0.5*max(p.x+p.y,0.0))))*sign(p.x-p.y);
}

// ─── Main ───────────────────────────────────────────────

void main(){
  vec2 uv=(gl_FragCoord.xy-0.5*uResolution)/min(uResolution.x,uResolution.y);
  float lt=mod(uTime,DUR);
  // t ∈ [0,1), all cycles must be integer multiples of TAU*t for seamless loop
  float t=lt/DUR;

  // ── Psychedelic distortion field ──────────────────────
  // Warping UV for organic feel (2 full cycles per loop → seamless)
  vec2 warp=uv;
  warp+=0.015*vec2(sin(uv.y*12.0+t*TAU*2.0),cos(uv.x*10.0+t*TAU*2.0));

  // ── Background: cycling color field ───────────────────
  // Full spectrum rotation (3 cycles/loop for intensity)
  float bgHue=t*3.0+length(warp)*0.4+atan(warp.y,warp.x)/TAU;
  vec3 col=hsv(bgHue,0.85,0.7-length(warp)*0.5);

  // Pulsing radial bands (4 cycles/loop)
  float pulse=sin(length(warp)*25.0-t*TAU*4.0)*0.15;
  col+=pulse*hsv(bgHue+0.3,1.0,1.0);

  // ── Eye opening mask ──────────────────────────────────
  float upperLid=sdEllipse(warp-vec2(0,0.10),vec2(0.40,0.26));
  float lowerLid=sdEllipse(warp-vec2(0,-0.06),vec2(0.40,0.28));
  float eyeOpen=max(upperLid,lowerLid);
  float eyeMask=smoothstep(0.005,-0.005,eyeOpen);

  // ── Eyelid surfaces (cycling pink/magenta/purple) ─────
  float lidHue=t*2.0+0.9; // start pink, cycle 2x
  vec3 upperCol=hsv(lidHue,0.9,0.85+0.1*sin(t*TAU*3.0));
  vec3 lowerCol=hsv(lidHue+0.08,0.85,0.6+0.15*sin(t*TAU*3.0+PI));
  float upperMask=smoothstep(0.0,-0.05,upperLid)*step(-0.01,warp.y);
  float lowerMask=smoothstep(0.0,-0.04,lowerLid)*step(warp.y,0.06);
  col=mix(col,upperCol,upperMask);
  col=mix(col,lowerCol,lowerMask);

  // ── Bold lid outline ──────────────────────────────────
  float lidLine=smoothstep(0.008,0.0,abs(eyeOpen));
  vec3 lidLineCol=hsv(t*4.0,1.0,0.15);
  col=mix(col,lidLineCol,lidLine*0.9);

  // ── Sclera (eye white) — color cycling ────────────────
  float scleraHue=t*3.0+0.55;
  vec3 scleraCol=hsv(scleraHue,0.35,0.85+0.1*sin(t*TAU*2.0));
  col=mix(col,scleraCol,eyeMask);

  // ── Iris ──────────────────────────────────────────────
  vec2 ic=vec2(0.0,0.02); // iris center
  float iR=0.17+0.01*sin(t*TAU*2.0); // pulsing radius (2 cycles)
  vec2 iv=warp-ic;
  float iDist=length(iv);
  float iMask=smoothstep(iR+0.003,iR-0.003,iDist);

  // Iris fill: spinning color wheel
  float iAngle=atan(iv.y,iv.x);
  float irisHue=t*5.0+iAngle/TAU+iDist*3.0;
  vec3 irisFill=hsv(irisHue,0.9,0.55+0.2*sin(t*TAU*3.0));
  col=mix(col,irisFill,iMask*eyeMask);

  // Concentric iris rings — 8 rings, per-instance rotation, color cycling
  for(int i=0;i<8;i++){
    float fi=float(i);
    float ringR=iR*(1.0-fi*0.11);
    if(ringR<0.01)continue;

    // Per-instance rotation (integer half-turns for loop)
    float halfTurns=fi*2.0+2.0;
    vec2 rP=rot(t*PI*halfTurns)*iv;
    float ring=length(rP)-ringR;
    float ringLine=smoothstep(0.004,0.0,abs(ring));

    // Each ring cycles through spectrum at different offset
    float rHue=t*4.0+fi*0.15;
    vec3 rCol=hsv(rHue,1.0,0.9);
    col=mix(col,rCol,ringLine*0.95*iMask*eyeMask);
  }

  // Bold iris edge
  float iEdge=smoothstep(0.007,0.0,abs(iDist-iR));
  col=mix(col,hsv(t*6.0,1.0,0.3),iEdge*eyeMask);

  // ── Pupil (heart) ─────────────────────────────────────
  float pScale=0.05+0.008*sin(t*TAU*2.0); // breathing (2 cycles)
  vec2 pUv=iv/pScale;
  pUv.y=-pUv.y+0.4;
  float pDist=sdHeart(pUv);
  float pMask=smoothstep(0.05,-0.1,pDist);
  col=mix(col,vec3(0.02,0.0,0.06),pMask*iMask*eyeMask);

  // Specular highlight on iris
  float spec=smoothstep(0.04,0.0,length(iv-vec2(-0.04,0.05)));
  col+=vec3(0.4)*spec*iMask*eyeMask;

  // ── Eyelashes ─────────────────────────────────────────
  for(int i=0;i<11;i++){
    float fi=float(i);
    float la=0.1+fi/10.0*2.4; // angle spread
    vec2 dir=vec2(cos(la),sin(la));
    vec2 origin=vec2(dir.x*0.36,0.10+dir.y*0.20);
    // Lashes sway (1 cycle per loop)
    float sway=0.04*sin(t*TAU+fi*0.7);
    vec2 tip=origin+dir*mix(0.07,0.15,sin(fi*1.3))+vec2(sway,0.0);

    vec2 pa=warp-origin,ba=tip-origin;
    float h=clamp(dot(pa,ba)/dot(ba,ba),0.0,1.0);
    float ld=length(pa-ba*h);
    float lash=smoothstep(mix(0.005,0.001,h),0.0,ld);
    col=mix(col,hsv(t*3.0+fi*0.1,0.8,0.08),lash*0.9);
  }

  // ── Chromatic aberration (2 cycles) ───────────────────
  float ca=0.008*sin(t*TAU*2.0);
  col.r*=1.0+length(uv)*ca*8.0;
  col.b*=1.0-length(uv)*ca*8.0;

  // ── Glitch scanlines (4 cycles) ───────────────────────
  float scan=sin(gl_FragCoord.y*1.5+t*TAU*4.0)*0.04;
  col+=scan*hsv(t*6.0+gl_FragCoord.y*0.002,0.5,1.0);

  // ── Color inversion flash (brief, 2 pulses per loop) ──
  float flash=pow(max(sin(t*TAU*2.0),0.0),16.0)*0.3;
  col=mix(col,1.0-col,flash);

  // ── Saturation boost ──────────────────────────────────
  float gray=dot(col,vec3(0.299,0.587,0.114));
  col=mix(vec3(gray),col,1.5); // oversaturate

  // ── Vignette ──────────────────────────────────────────
  col*=1.0-smoothstep(0.6,1.3,length(uv*1.8))*0.5;

  gl_FragColor=vec4(clamp(col,0.0,1.0),1.0);
}
