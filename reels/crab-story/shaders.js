// Шейдеры ролика про крабика: крабик из 9 коробок (SDF), воксельный мир (обход сетки DDA), пол из строк кода,
// ракета, Луна, пламя и дым объёмом, звёзды и планета. Каждая сцена собирается отдельно с нужными #define.
window.SH = {};
SH.vsQuad = `#version 300 es
void main(){ vec2 p = vec2((gl_VertexID<<1)&2, gl_VertexID&2); gl_Position = vec4(p*2.0-1.0, 0.0, 1.0); }`;

SH.fsScene = `#version 300 es
precision highp float;
//__DEFS__
uniform vec2 uRes; uniform float uT, uL, uK, uBeat;
uniform vec3 uCamPos, uCamTgt; uniform float uFov, uRoll;
uniform float uCrab; uniform vec4 uCB; uniform vec3 uPC[9]; uniform vec3 uPH[9]; uniform mat3 uPR[9];
uniform vec4 uFly[16]; uniform vec3 uFlyC[16]; uniform vec4 uFB;
uniform vec4 uW;   // x мост: блоков, y рост города 0..1, z радиус проявления кода, w яркость кода
uniform vec4 uW2;  // x диско, y узор пола, z свет из пропасти, w звёзды
uniform vec3 uRP; uniform mat3 uRR; uniform float uRB, uFlame, uSmoke; uniform vec3 uSmokeC;
uniform vec3 uSun; uniform vec3 uSpotPos; uniform float uSpot; uniform vec4 uCabin; uniform vec3 uCrabXZ;
uniform vec4 uHead;   // xyz кончик сопла, w видна ли головка принтера
uniform vec4 uHead2;  // x высота рельсов, y нагрев 0..1, z доля текущего слоя 0..1, w режим печати головкой
out vec4 o;
#define PI 3.14159265
const float VS=0.2;
const int GX0C=2, GX1C=12; const float GX0=0.4, GX1=2.4;
const vec3 CRAB=vec3(0.74,0.17,0.075), CORAL=vec3(1.0,0.36,0.2), CYAN=vec3(0.24,0.85,1.0), VIOLET=vec3(0.55,0.38,1.0), PINK=vec3(1.0,0.24,0.6), PAPER=vec3(0.86,0.83,0.78);
mat2 rot(float a){ float c=cos(a), s=sin(a); return mat2(c,-s,s,c); }
float hash(vec3 p){ p=fract(p*0.3183099+.1); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float hashi(ivec3 c){ return hash(vec3(c)*0.7071+vec3(0.13,0.71,0.37)); }
float noise(vec3 x){ vec3 i=floor(x), f=fract(x); f=f*f*(3.-2.*f);
  return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z); }
float fbm(vec3 p){ float a=0.5, s=0.; for(int i=0;i<4;i++){ s+=a*noise(p); p=p*2.03+vec3(1.7,-0.4,2.3); a*=0.5; } return s; }
float sdBox(vec3 p,vec3 b){ vec3 q=abs(p)-b; return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.); }

// ---------- крабик и летящие блоки
float gPart;
float crabD(vec3 p){
  float bd=length(p-uCB.xyz)-uCB.w; if(bd>0.25) return bd;
  float d=1e5;
  for(int i=0;i<9;i++){ vec3 q=uPR[i]*(p-uPC[i]); float r=(i==0)?0.035:0.014; float di=sdBox(q,max(uPH[i]-r,vec3(0.001)))-r; if(di<d){ d=di; gPart=float(i); } }
  return d;
}
int gFly;
float flyD(vec3 p){
  if(uFB.w<=0.) return 1e5; float bd=length(p-uFB.xyz)-uFB.w; if(bd>0.25) return bd;
  float d=1e5;
  for(int i=0;i<16;i++){ vec4 f=uFly[i]; if(f.w<=0.) continue; vec3 q=p-f.xyz; float a=uT*5.+float(i)*1.7; q.xz*=rot(a); q.xy*=rot(a*0.63);
    float di=sdBox(q,vec3(f.w*0.88))-f.w*0.12; if(di<d){ d=di; gFly=i; } }
  return d;
}
// головка принтера на рельсах: сопло, нагревательный блок, кожух, штанга, каретка, поперечина, две направляющие
int gPP;
const vec2 PADC=vec2(6.2,-0.2);
float printD(vec3 p){
  if(uHead.w<=0.) return 1e5;
  vec3 N=uHead.xyz; float gy=uHead2.x;
  float drop=uHead.w-1., FT=6.4; // рама: стойки от drop до drop+FT, верхний прямоугольник; рама неподвижна, едет перекладина
  float bd=length(p-vec3(PADC.x,drop+FT*0.5,PADC.y))-4.6; if(bd>0.3 && length(p-N)>1.0) return bd;
  float d=1e5, e;
  vec3 q=p-(N+vec3(0.,0.05,0.)); float r=mix(0.012,0.034,clamp(q.y/0.1+0.5,0.,1.));
  e=max(length(q.xz)-r, abs(q.y)-0.05); if(e<d){ d=e; gPP=0; }
  e=sdBox(p-(N+vec3(0.,0.15,0.)),vec3(0.085,0.05,0.085))-0.01; if(e<d){ d=e; gPP=1; }
  e=sdBox(p-(N+vec3(0.,0.33,0.)),vec3(0.13,0.12,0.11))-0.025; if(e<d){ d=e; gPP=2; }
  float h=max((gy-N.y-0.45)*0.5,0.001);
  e=sdBox(p-vec3(N.x,N.y+0.45+h,N.z),vec3(0.03,h,0.03)); if(e<d){ d=e; gPP=3; }
  e=sdBox(p-vec3(N.x,gy,N.z),vec3(0.17,0.09,0.15))-0.015; if(e<d){ d=e; gPP=4; }
  e=sdBox(p-vec3(PADC.x,gy+0.02,N.z),vec3(1.95,0.035,0.05)); if(e<d){ d=e; gPP=5; }
  e=min(sdBox(p-vec3(PADC.x-1.95,gy,PADC.y),vec3(0.06,0.06,2.0)), sdBox(p-vec3(PADC.x+1.95,gy,PADC.y),vec3(0.06,0.06,2.0))); if(e<d){ d=e; gPP=6; }
  vec2 cq=abs(p.xz-PADC)-vec2(1.95,2.0); // четыре неподвижные стойки рамы и верхний прямоугольник
  e=sdBox(vec3(cq.x,p.y-drop-FT*0.5,cq.y),vec3(0.07,FT*0.5,0.07)); if(e<d){ d=e; gPP=7; }
  e=min(sdBox(vec3(cq.x,p.y-drop-FT,p.z-PADC.y),vec3(0.07,0.07,2.07)), sdBox(vec3(p.x-PADC.x,p.y-drop-FT,cq.y),vec3(2.02,0.07,0.07))); if(e<d){ d=e; gPP=7; }
  return d;
}
float objD(vec3 p){ float d=1e5; if(uCrab>0.5) d=crabD(p); return min(min(d, flyD(p)), printD(p)); }
float marchObj(vec3 ro, vec3 rd, float tmax){
  if(uCrab<0.5 && uFB.w<=0. && uHead.w<=0.) return -1.;
  float t=0.; for(int i=0;i<110;i++){ float d=objD(ro+rd*t); if(d<0.0004+0.0006*t) return t; t+=d; if(t>tmax) break; }
  return -1.;
}
vec3 objN(vec3 p){ vec2 e=vec2(0.0008,0.);
  return normalize(vec3(objD(p+e.xyy)-objD(p-e.xyy), objD(p+e.yxy)-objD(p-e.yxy), objD(p+e.yyx)-objD(p-e.yyx))); }

// ---------- воксели: 0 пусто; 1 камень Луны, 2 плитка танцпола, 3-5 блоки моста, 6 дом, 7 окно, 8 белый, 9 коралл, 10 тёмный
int worldVox(ivec3 c){
#ifdef MOON
  vec3 p=(vec3(c)+0.5)*VS; if(p.y>0.) return 0; vec3 q=p-vec3(0.,-2.4,0.);
  float d=length(q)-3.5+0.45*(noise(p*1.4+3.)-0.5)+0.25*(noise(p*3.1)-0.5)*step(p.y,-0.5);
  if(d<0.){ if(c.y==-1 && length(p.xz)<2.3) return 2; return 1; } return 0;
#else
#ifdef BRIDGE
  if(c.y==-1 && c.x>=GX0C && c.x<GX1C && c.z>=-3 && c.z<=2){ float idx=float((c.x-GX0C)*6+(c.z+3)); if(idx<uW.x) return 3+((c.x*7+(c.z+3)*5)%3); }
#endif
#ifdef CITY
  if(c.y>=0 && c.z<=-9 && c.z>=-44 && c.x>=-60 && c.x<90 && (c.x<GX0C-1 || c.x>GX1C)){
    ivec2 b=ivec2(floor(vec2(c.xz)/6.)); ivec2 lc=c.xz-b*6; if(lc.x>=5||lc.y>=5) return 0;
    vec2 fb=vec2(b); float hb=hash(vec3(fb,5.3)); float dz=float(-b.y);
    float H=2.+floor(hb*hb*(10.+dz*3.5)); float dl=hash(vec3(fb,9.1))*0.75;
    float g=clamp((uW.y-dl)/0.25,0.,1.); g=1.-pow(1.-g,3.);
    if(float(c.y)>=floor(H*g+0.5)) return 0;
    bool face=lc.x==0||lc.x==4||lc.y==0||lc.y==4;
    if(face && c.y%2==1 && hashi(c)>0.55) return 7; return 6; }
#endif
  return 0;
#endif
}
int rocketVox(ivec3 c){
  vec3 p=(vec3(c)+0.5)*VS; float r=length(p.xz), y=p.y;
  if(y>uRB){ // печать головкой: текущий слой растёт по кругу вслед за соплом
    if(uHead2.w<0.5 || y>uRB+0.2) return 0;
    if(fract(atan(p.z,p.x)/(2.*PI)+1.)>uHead2.z) return 0; }
  if(y<0.4) return r<0.62 ? 10 : 0;
  if(y<3.6){
    if(y>1.6 && y<1.8 && r<0.85) return 10;
    if(r<1.04 && r>0.78){ if(y>2.0 && y<2.8 && p.z>0.3 && abs(p.x)<0.5) return 0;
      if((y>1.2&&y<1.4)||(y>3.2&&y<3.4)) return 9; if(y>1.8&&y<3.0&&p.z>0.2&&abs(p.x)<0.72) return 9; return 8; }
    if(y<1.6){ float f=min(abs(p.x-p.z),abs(p.x+p.z))*0.7071; float ext=1.05+(1.6-y)*0.6; if(f<0.13 && r<ext && r>0.9) return 9; }
    return 0; }
  float rr=1.04*(1.-(y-3.6)/1.5); if(r<rr && r>rr-0.34) return y>4.5 ? 8 : 9; return 0;
}
int vox(ivec3 c, int obj){ return obj==0 ? worldVox(c) : rocketVox(c); }
float dda(vec3 ro, vec3 rd, vec3 lo, vec3 hi, int obj, int maxS, out ivec3 cell, out vec3 nrm, out int mat){
  vec3 inv=1./(abs(rd)+1e-6)*sign(rd+1e-9); vec3 t0=(lo-ro)*inv, t1=(hi-ro)*inv; vec3 tmn=min(t0,t1), tmx=max(t0,t1);
  float tn=max(max(tmn.x,tmn.y),tmn.z), tf=min(min(tmx.x,tmx.y),tmx.z);
  if(tf<max(tn,0.)) return -1.;
  float t=max(tn,0.)+1e-4; vec3 p=ro+rd*t; ivec3 c=ivec3(floor(p/VS)); vec3 st=sign(rd); ivec3 is=ivec3(st);
  vec3 tD=abs(VS*inv); vec3 nx=(vec3(c)+max(st,0.))*VS; vec3 tM=t+(nx-p)*inv;
  vec3 n = tn<=0. ? -st*vec3(1,0,0) : (tn==tmn.x ? vec3(-st.x,0,0) : tn==tmn.y ? vec3(0,-st.y,0) : vec3(0,0,-st.z));
  for(int i=0;i<maxS;i++){
    int m=vox(c,obj); if(m>0){ cell=c; nrm=n; mat=m; return t; }
    if(tM.x<tM.y && tM.x<tM.z){ t=tM.x; tM.x+=tD.x; c.x+=is.x; n=vec3(-st.x,0,0); }
    else if(tM.y<tM.z){ t=tM.y; tM.y+=tD.y; c.y+=is.y; n=vec3(0,-st.y,0); }
    else { t=tM.z; tM.z+=tD.z; c.z+=is.z; n=vec3(0,0,-st.z); }
    if(t>tf) break; }
  return -1.;
}
#ifdef MOON
const vec3 WLO=vec3(-4.2,-6.,-4.2), WHI=vec3(4.2,0.001,4.2);
#else
const vec3 WLO=vec3(-12.,-0.21,-8.9), WHI=vec3(18.,5.6,0.61);
#endif
const vec3 RLO=vec3(-1.9,-0.01,-1.9), RHI=vec3(1.9,5.2,1.9);
#if defined(BRIDGE) || defined(CITY) || defined(MOON)
#define WORLD
#endif

// ---------- пол из строк кода: верх y=0, пропасть x в [GX0, GX1]
vec3 codeAt(vec2 q, float fw){
  float lh=0.3; float j=floor(q.y/lh); float fy=(q.y-j*lh)/lh;
  float band=smoothstep(0.30,0.33,fy)*(1.-smoothstep(0.64,0.67,fy));
  float cw=0.075; float ci=floor(q.x/cw); float pg=floor(ci/72.); float lc=ci-pg*72.;
  float ind=floor(hash(vec3(j,pg,2.))*4.)*4.; float len=6.+floor(hash(vec3(j,pg,7.))*hash(vec3(j,pg,3.))*58.);
  if(hash(vec3(j,pg,11.))<0.16) len=0.;
  float on=step(ind,lc)*step(lc,ind+len);
  float wi=floor((lc+floor(hash(vec3(j,pg,5.))*3.))/5.); float sp=step(0.8,fract((lc+floor(hash(vec3(j,pg,5.))*3.))/5.));
  on*=1.-sp;
  vec2 gp=vec2(fract(q.x/cw)*3., fy*5.); float pix=step(0.38,hash(vec3(floor(gp),ci+j*91.)));
  float glyph=mix(pix, 0.5, smoothstep(0.004,0.02,fw));
  float h=hash(vec3(wi,j,pg+1.)); vec3 col= h<0.18?CYAN : h<0.3?CORAL : h<0.38?VIOLET : PAPER*0.75;
  return col*on*band*glyph;
}
float floorHit(vec3 ro, vec3 rd, out vec3 n, out int part){
  float best=-1.; part=-1;
  if(rd.y<0. && ro.y>0.){ float t=-ro.y/rd.y; vec3 p=ro+rd*t; if(p.x<GX0||p.x>GX1){ best=t; n=vec3(0,1,0); part=0; } }
  for(int k=0;k<2;k++){ float wx= k==0?GX0:GX1; bool ok = k==0 ? rd.x<0. : rd.x>0.; if(!ok) continue;
    float t=(wx-ro.x)/rd.x; if(t>0. && (best<0.||t<best)){ vec3 p=ro+rd*t; if(p.y<0. && p.y>-4.){ best=t; n=vec3(k==0?1.:-1.,0,0); part=1; } } }
  return best;
}

// ---------- небо
vec3 stars(vec3 d, float amt){
  vec3 c=vec3(0.);
  for(int k=0;k<2;k++){ float sc=k==0?260.:560.; vec3 q=d*sc; vec3 id=floor(q); float h=hash(id+float(k)*7.);
    if(h>0.985){ vec3 f=fract(q)-0.5; float s=exp(-dot(f,f)*30.); float tw=0.75+0.25*sin(uT*3.+h*80.);
      c+=mix(vec3(1.,0.8,0.65),vec3(0.65,0.8,1.),hash(id+3.))*s*(h-0.985)*(k==0?160.:90.)*tw; } }
  return c*amt;
}
const vec3 EC=vec3(-46.,9.,-100.); const float ER=26.;
vec3 planet(vec3 ro, vec3 rd, out float hit){
  hit=0.; vec3 oc=ro-EC; float b=dot(oc,rd), c=dot(oc,oc)-ER*ER*1.06; float h=b*b-c; vec3 col=vec3(0.);
  vec3 sd=normalize(vec3(0.9,0.35,0.4));
  // ореол атмосферы
  float dmin=length(oc-rd*b); float rim=exp(-max(dmin-ER,0.)*0.35)*step(b,0.);
  col+=vec3(0.25,0.55,1.)*rim*0.35*max(dot(normalize(oc-rd*b),sd)+0.3,0.);
  float c2=dot(oc,oc)-ER*ER; float h2=b*b-c2; if(h2<0.) return col;
  float t=-b-sqrt(h2); vec3 p=oc+rd*t; vec3 n=normalize(p); hit=1.;
  vec3 q=n; q.xz*=rot(uT*0.02);
  float land=smoothstep(0.5,0.56,fbm(q*2.2+1.3)); float cl=smoothstep(0.55,0.75,fbm(q*3.5+vec3(uT*0.01,0.,0.)));
  vec3 alb=mix(vec3(0.02,0.08,0.25), mix(vec3(0.1,0.32,0.08),vec3(0.42,0.34,0.18),smoothstep(0.6,0.75,fbm(q*5.))), land);
  alb=mix(alb, vec3(0.9), cl*0.85);
  float dif=max(dot(n,sd),0.); float fr=pow(1.-max(dot(n,-rd),0.),3.);
  col=alb*dif*1.4 + vec3(0.25,0.5,1.)*fr*0.6*max(dif+0.2,0.);
  float night=smoothstep(0.1,-0.15,dot(n,sd)); col+=vec3(1.,0.7,0.35)*step(0.8,noise(q*60.))*land*night*0.5*(1.-cl);
  return col;
}
vec3 sky(vec3 rd, vec3 ro){
#ifdef SPACE
  vec3 c=vec3(0.002,0.002,0.006);
  float n=fbm(rd*2.2+4.); c+=mix(vec3(0.3,0.08,0.45),vec3(0.05,0.2,0.45),noise(rd*1.6+9.))*pow(n,3.)*0.35;
  c+=stars(rd, uW2.w);
  vec3 sd=normalize(vec3(0.9,0.35,0.4)); float sa=max(dot(rd,sd),0.); c+=vec3(1.,0.85,0.7)*(pow(sa,900.)*40.+pow(sa,40.)*0.12);
  float ph; vec3 pc=planet(ro,rd,ph); c=mix(c,pc,ph)+pc*(1.-ph);
  return c;
#else
  vec3 c=mix(vec3(0.014,0.009,0.024), vec3(0.002,0.002,0.006), smoothstep(-0.05,0.45,rd.y));
  c+=vec3(1.,0.36,0.26)*exp(-abs(rd.y-0.01)*28.)*0.045+VIOLET*exp(-abs(rd.y)*6.)*0.012;
  c+=stars(rd, uW2.w)*smoothstep(0.02,0.25,rd.y);
  return c;
#endif
}

// ---------- сцена: ближайшее попадание
struct Hit { float t; vec3 n; int kind; int mat; ivec3 cell; vec3 lp; };
// kind: 0 нет, 1 крабик/блок, 2 воксель мира, 3 воксель ракеты, 4 пол, 5 стена пропасти
Hit trace(vec3 ro, vec3 rd, float tmax, int steps){
  Hit h; h.t=tmax; h.kind=0; h.mat=0; h.n=vec3(0,1,0); h.cell=ivec3(0); h.lp=vec3(0);
  float to=marchObj(ro,rd,tmax); if(to>0.){ h.t=to; h.kind=1; }
#ifdef WORLD
  { ivec3 c; vec3 n; int m; float t=dda(ro,rd,WLO,WHI,0,steps,c,n,m); if(t>0. && t<h.t){ h.t=t; h.kind=2; h.n=n; h.mat=m; h.cell=c; h.lp=ro+rd*t; } }
#endif
#ifdef ROCKET
  { vec3 lo=uRR*(ro-uRP), ld=uRR*rd; ivec3 c; vec3 n; int m; float t=dda(lo,ld,RLO,RHI,1,steps/2+20,c,n,m);
    if(t>0. && t<h.t){ h.t=t; h.kind=3; h.n=transpose(uRR)*n; h.mat=m; h.cell=c; h.lp=lo+ld*t; } }
#endif
#ifdef FLOOR
  { vec3 n; int part; float t=floorHit(ro,rd,n,part); if(t>0. && t<h.t){ h.t=t; h.kind=part==0?4:5; h.n=n; } }
#endif
  return h;
}
float shadowAt(vec3 p, vec3 L, float maxd){
  float s=1.;
  if(uCrab>0.5){ float t=0.03; for(int i=0;i<36;i++){ float d=crabD(p+L*t); s=min(s, 9.*d/t); if(s<0.02) break; t+=clamp(d,0.015,0.35); if(t>maxd) break; } }
  ivec3 c; vec3 n; int m;
#ifdef WORLD
  if(s>0.02 && dda(p+L*0.003,L,WLO,WHI,0,90,c,n,m)>0.) s=0.;
#endif
#ifdef ROCKET
  if(s>0.02 && dda(uRR*(p+L*0.003-uRP),uRR*L,RLO,RHI,1,60,c,n,m)>0.) s=0.;
#endif
  return clamp(s,0.,1.);
}
// окклюзия вокселя по соседям грани
float voxAO(ivec3 c, vec3 n, vec3 lp, int obj){
  ivec3 ni=ivec3(n); vec3 an=abs(n); ivec3 u=an.x>0.5?ivec3(0,1,0):ivec3(1,0,0); ivec3 v=an.z>0.5?ivec3(0,1,0):(an.x>0.5?ivec3(0,0,1):ivec3(0,0,1));
  vec3 f=fract(lp/VS); vec2 uv = an.x>0.5 ? f.yz : (an.y>0.5 ? f.xz : f.xy);
  ivec3 b=c+ni;
  float s1=float(vox(b+u,obj)>0), s2=float(vox(b-u,obj)>0), s3=float(vox(b+v,obj)>0), s4=float(vox(b-v,obj)>0);
  float c1=float(vox(b+u+v,obj)>0), c2=float(vox(b-u+v,obj)>0), c3=float(vox(b+u-v,obj)>0), c4=float(vox(b-u-v,obj)>0);
  float a00=s2+s4+c4, a10=s1+s4+c3, a01=s2+s3+c2, a11=s1+s3+c1;
  float a=mix(mix(a00,a10,uv.x),mix(a01,a11,uv.x),uv.y);
  return 1.-a*0.16;
}
float edgeK(vec3 lp, vec3 n){ vec3 f=fract(lp/VS); vec3 an=abs(n); vec2 uv = an.x>0.5 ? f.yz : (an.y>0.5 ? f.xz : f.xy);
  vec2 e=min(uv,1.-uv); return smoothstep(0.0,0.07,min(e.x,e.y)); }

vec3 tileCol(ivec3 c){ // танцпол: узор по долям
  vec2 q=vec2(c.xz)+0.5; float b=uBeat; float bi=floor(b); float bf=b-bi;
  int mode=int(mod(floor(b/8.),4.));
  float v=0.; vec3 col;
  float r=length(q*VS-uCrabXZ.xz);
  if(mode==0){ v=float(((c.x+c.z+int(bi))&1)==0); col=mix(CORAL,CYAN,float(int(bi)%2)); v*=exp(-bf*2.5); }
  else if(mode==1){ v=exp(-abs(r-bf*2.6)*5.); col=mix(VIOLET,PINK,fract(bi*0.5)*2.); }
  else if(mode==2){ float w=sin(q.x*0.6+q.y*0.4-b*PI); v=smoothstep(0.6,0.95,w); col=mix(CYAN,VIOLET,0.5+0.5*sin(q.y*0.3)); }
  else { v=step(0.72,hash(vec3(vec2(c.xz),bi)))*exp(-bf*3.); col=mix(CORAL,mix(CYAN,PINK,hash(vec3(vec2(c.xz),bi+5.))),hash(vec3(vec2(c.zx),bi))); }
  return col*v*(0.6+uK*0.8)*uW2.x;
}

vec3 lightAt(vec3 p, out vec3 L, out float atten){
  if(uSpot>0.){ vec3 d=uSpotPos-p; float dl=length(d); L=d/dl; float cone=smoothstep(0.86,0.97,dot(-L,vec3(0,-1,0)));
    atten=uSpot*cone*8./(1.+dl*dl*0.25); return vec3(1.0,0.93,0.85); }
  L=normalize(uSun); atten=1.;
#ifdef SPACE
  return vec3(1.,0.95,0.9)*2.2;
#else
  return vec3(0.75,0.82,1.0)*1.1;
#endif
}
vec3 extraLights(vec3 p, vec3 n){ // каюта ракеты и пламя - без тени
  vec3 c=vec3(0.);
  if(uHead2.y>0.){ vec3 d=uHead.xyz-p; float dl=length(d); c+=vec3(1.,0.5,0.18)*uHead2.y*1.6*max(dot(n,d/dl)*0.7+0.3,0.)/(1.+dl*dl*30.); }
  if(uCabin.w>0.){ vec3 d=uCabin.xyz-p; float dl=length(d); c+=vec3(1.,0.72,0.45)*uCabin.w*max(dot(n,d/dl)*0.7+0.3,0.)/(1.+dl*dl*6.); }
#ifdef ROCKET
  if(uFlame>0.){ vec3 fp=uRP+transpose(uRR)*vec3(0.,-0.6,0.); vec3 d=fp-p; float dl=length(d); c+=vec3(1.,0.45,0.15)*uFlame*6.*max(dot(n,d/dl)*0.8+0.2,0.)/(1.+dl*dl*0.35); }
#endif
  return c;
}

vec3 shadeHit(Hit h, vec3 ro, vec3 rd, bool primary){
  vec3 p=ro+rd*h.t; vec3 n=h.n; vec3 alb=vec3(0.5); vec3 emi=vec3(0.); float spec=0.2, gloss=40., ao=1.;
  if(h.kind==1){ n=objN(p); float dc= uCrab>0.5 ? crabD(p) : 1e5; float df=flyD(p); float dp=printD(p);
    if(dp<dc && dp<df){ int k=gPP;
      if(k==0){ alb=vec3(0.78,0.56,0.22); spec=1.1; gloss=90.; emi=vec3(1.,0.42,0.1)*uHead2.y*smoothstep(0.08,-0.04,p.y-uHead.y)*2.5; }
      else if(k==1){ alb=vec3(0.62,0.62,0.66); spec=0.7; gloss=60.; emi=vec3(1.,0.3,0.06)*uHead2.y*0.55; }
      else if(k==2){ alb=CRAB; spec=0.3; gloss=30.; float g=abs(fract((p.y-uHead.y)*18.)-0.5); alb*=0.8+0.2*step(0.18,g); }
      else if(k==3){ alb=vec3(0.7,0.72,0.76); spec=1.2; gloss=120.; }
      else if(k==4){ alb=vec3(0.035,0.035,0.045); spec=0.5; gloss=50.; emi=CYAN*0.6*step(0.075,abs(p.y-uHead2.x))*step(abs(p.y-uHead2.x),0.09); }
      else { alb=vec3(0.2,0.21,0.24); spec=0.9; gloss=70.; emi=CYAN*0.35*smoothstep(0.012,0.,abs(p.y-uHead2.x-0.03)); }
    } else if(dc<=df){ int i=int(gPart+0.5);
      if(i==1||i==2){ alb=vec3(0.006,0.005,0.008); spec=1.4; gloss=120.; }
      else { alb=CRAB; spec=0.18; gloss=24.;
        vec3 q=uPR[i]*(p-uPC[i]); vec3 u=q+uPH[i]; vec3 f=abs(fract(u/0.1+0.5)-0.5)*0.1; vec3 qn=abs(uPR[i]*n);
        if(qn.x>0.7) f.x=1.; else if(qn.y>0.7) f.y=1.; else f.z=1.;
        float g=min(f.x,min(f.y,f.z)); alb*=0.84+0.16*smoothstep(0.0015,0.006,g); }
      float occ=1.; for(int k=1;k<5;k++){ float hh=0.03*float(k); occ-= (hh-crabD(p+n*hh))*0.9/float(k); } ao=clamp(occ,0.25,1.);
    } else { alb=uFlyC[gFly]; emi=uFlyC[gFly]*0.6; spec=0.3; }
  } else if(h.kind==2 || h.kind==3){ int obj=h.kind==2?0:1; int m=h.mat; vec3 ln=h.kind==2 ? n : uRR*n; ao=voxAO(h.cell,ln,h.lp,obj);
    float ed=edgeK(h.lp, ln); float hv=hashi(h.cell);
    if(m==1){ alb=vec3(0.32,0.31,0.34)*(0.75+0.35*hv); spec=0.05; }
    else if(m==2){ alb=vec3(0.06,0.06,0.08); emi=tileCol(h.cell); spec=0.8; gloss=80.; }
    else if(m>=3 && m<=5){ alb= m==3?CRAB : m==4?PAPER*0.8 : vec3(0.12,0.5,0.62); alb*=0.85+0.25*hv;
      float idx=float((h.cell.x-GX0C)*6+(h.cell.z+3)); emi=alb*exp(-max(uW.x-idx,0.)*0.35)*2.5; spec=0.3; }
    else if(m==6){ alb=vec3(0.035,0.038,0.055)*(0.8+0.4*hv); spec=0.25; }
    else if(m==7){ alb=vec3(0.05); emi=mix(vec3(1.,0.62,0.36),CYAN,step(0.72,hash(vec3(h.cell.yzx))))*(0.9+0.5*hv)*(0.8+uK*0.5); }
    else if(m==8){ alb=PAPER*(0.92+0.1*hv); spec=0.35; gloss=50.; }
    else if(m==9){ alb=CRAB*1.05; spec=0.3; }
    else { alb=vec3(0.03,0.03,0.035); spec=0.4; }
    if(h.kind==3 && h.lp.y>uRB-0.21 && uRB<5.1 && uHead2.w<0.5){ emi+=CORAL*3.5; }
    if(h.kind==3 && uHead2.w>0.5){ vec3 nl=uHead.xyz-uRP; float dn=length(h.lp-nl); // свежий пластик у сопла светится и остывает
      emi+=vec3(1.,0.45,0.12)*uHead2.y*(2.6*exp(-dn*5.)+0.9*smoothstep(0.25,0.,uRB+0.2-h.lp.y)*step(uRB,h.lp.y)); }
    alb*=0.75+0.25*ed; emi*=0.7+0.3*ed;
  } else if(h.kind==4){ float fw=length(fwidth(p.xz));
    vec3 cg=codeAt(p.xz,fw); float dcr=length(p.xz-uCrabXZ.xz);
    float rev=1.-smoothstep(uW.z-0.6,uW.z,dcr);
    emi=cg*uW.w*(0.25+1.6*exp(-dcr*0.75))*rev; alb=vec3(0.012,0.012,0.016); spec=0.6; gloss=90.;
  } else if(h.kind==5){ alb=vec3(0.02,0.02,0.028); float s=abs(fract(p.y*5.)-0.5); emi=CYAN*0.08*smoothstep(0.42,0.5,s)*exp(p.y*0.7); }
  vec3 L; float at; vec3 lc=lightAt(p,L,at);
  float dif=max(dot(n,L),0.); float sh= (primary && dif*at>0.001) ? shadowAt(p+n*0.002,L,8.) : 1.;
  vec3 hv2=normalize(L-rd); float sp=pow(max(dot(n,hv2),0.),gloss)*spec;
  vec3 amb;
#ifdef SPACE
  amb=vec3(0.035,0.04,0.07)*(0.6+0.4*n.y)+vec3(0.06,0.09,0.18)*max(dot(n,normalize(EC-p)),0.)*0.5;
#else
  amb=vec3(0.02,0.018,0.03)*(0.5+0.5*n.y)+vec3(0.06,0.03,0.02)*max(-n.y,0.);
  if(h.kind!=4){ float dcr=length(p.xz-uCrabXZ.xz); amb+=vec3(0.04,0.05,0.07)*uW.w*max(-n.y*0.4+0.2,0.)*exp(-dcr*0.8)*step(p.y,1.6); }
#endif
  vec3 fill=vec3(0.1,0.1,0.13)*(0.35+0.65*max(dot(n,-rd),0.));
  vec3 col=alb*(lc*dif*sh*at*1.0+amb+fill)*ao + lc*sp*sh*at + emi + alb*extraLights(p,n)*ao;
  // контровой свет
  float rim=pow(1.-max(dot(n,-rd),0.),4.);
  col+=rim*(h.kind==1?vec3(0.4,0.55,1.)*0.25:vec3(0.08,0.1,0.18))*ao;
  return col;
}

// ---------- объём: пламя и дым
vec4 flameVol(vec3 ro, vec3 rd, float tmax){
#ifdef ROCKET
  if(uFlame<=0.001) return vec4(0.);
  vec3 lo=uRR*(ro-uRP), ld=uRR*rd; float Lf=0.8+4.2*uFlame; vec3 cc=vec3(0.,-Lf*0.5,0.); float R=Lf*0.5+0.9;
  vec3 oc=lo-cc; float b=dot(oc,ld), c=dot(oc,oc)-R*R, h=b*b-c; if(h<0.) return vec4(0.);
  float t0=max(-b-sqrt(h),0.), t1=min(-b+sqrt(h),tmax); if(t1<=t0) return vec4(0.);
  vec3 acc=vec3(0.); float tr=1.; float dt=(t1-t0)/28.;
  for(int i=0;i<28;i++){ float t=t0+dt*(float(i)+0.5); vec3 p=lo+ld*t; float y=-p.y; if(y<0.||y>Lf) continue;
    float rr=length(p.xz); float rad=0.36+0.2*y; float core=1.-smoothstep(0.,rad,rr);
    float tb=noise(vec3(p.xz*5.,p.y*3.+uT*28.))*0.6+noise(vec3(p.xz*11.,p.y*7.+uT*45.))*0.4;
    float dens=core*(0.55+0.9*tb)*smoothstep(Lf,Lf*0.25,y)*uFlame;
    float T=core*smoothstep(Lf*0.9,0.,y);
    vec3 ec=mix(vec3(1.,0.22,0.05),vec3(1.,0.75,0.35),T); ec=mix(ec,vec3(1.,0.97,0.9),pow(T,4.));
    acc+=tr*ec*dens*dt*14.; tr*=exp(-dens*dt*1.5); }
  return vec4(acc,1.-tr);
#else
  return vec4(0.);
#endif
}
vec4 smokeVol(vec3 ro, vec3 rd, float tmax){
  if(uSmoke<=0.001) return vec4(0.);
  float R=0.6+uSmoke*4.2; vec3 oc=ro-uSmokeC; float b=dot(oc,rd), c=dot(oc,oc)-R*R, h=b*b-c; if(h<0.) return vec4(0.);
  float t0=max(-b-sqrt(h),0.), t1=min(-b+sqrt(h),tmax); if(t1<=t0) return vec4(0.);
  vec3 acc=vec3(0.); float tr=1.; float dt=(t1-t0)/26.;
  vec3 L=normalize(uSun);
  for(int i=0;i<26;i++){ float t=t0+dt*(float(i)+hash(vec3(gl_FragCoord.xy,float(i)))); vec3 p=ro+rd*t; vec3 q=p-uSmokeC;
    if(p.y<-0.05) continue;
    float sh=length(q*vec3(1.,1.6,1.))/R; float n=fbm(p*1.1+vec3(0.,-uT*0.5,uT*0.2));
    float dens=clamp((n*1.25-sh*0.9-0.15)*3.,0.,1.)*1.6;
    if(dens<0.002) continue;
    vec3 lit=vec3(0.07,0.075,0.095)+vec3(0.5,0.52,0.6)*0.3*clamp(0.6+q.y*0.3,0.,1.)+vec3(0.35,0.18,0.1)*0.12*exp(-p.y*0.8);
#ifdef ROCKET
    vec3 fp=uRP+transpose(uRR)*vec3(0.,-0.6,0.); float df=length(p-fp); lit+=vec3(1.,0.45,0.15)*uFlame*6./(1.+df*df*0.5);
#endif
    acc+=tr*lit*dens*dt*2.2; tr*=exp(-dens*dt*2.2); if(tr<0.02) break; }
  return vec4(acc,1.-tr);
}
// лучи диско-прожекторов: свет вокруг трёх наклонных осей
vec3 discoBeams(vec3 ro, vec3 rd, float tmax){
  vec3 c=vec3(0.); if(uW2.x<=0.01) return c;
  for(int i=0;i<3;i++){ float fi=float(i); float a=uT*0.9+fi*2.094; vec3 src=vec3(cos(fi*2.094)*3.,4.5,sin(fi*2.094)*3.-1.);
    vec3 dir=normalize(vec3(sin(a)*0.5-src.x*0.18,-1.,cos(a*1.3)*0.5-src.z*0.18));
    vec3 w=ro-src; vec3 cr=cross(dir,rd); float cl=length(cr); if(cl<1e-4) continue;
    float d=abs(dot(w,cr))/cl;
    // параметр вдоль луча камеры для ближайшей точки
    vec3 n2=cross(dir,cr); float tc=dot(src-ro,n2)/dot(rd,n2); if(tc<0.||tc>tmax) continue;
    vec3 pp=ro+rd*tc; float along=dot(pp-src,dir); if(along<0.) continue;
    float wdt=0.05+along*0.09; vec3 bc= i==0?CORAL : i==1?CYAN : VIOLET;
    c+=bc*exp(-d*d/(wdt*wdt))*0.12*uW2.x*(0.6+uK*0.8)*smoothstep(6.,1.,along)/(1.+along*0.3); }
  return c;
}

vec3 camRay(vec2 frag, out vec3 ro){
  vec2 uv=(2.*frag-uRes)/uRes.y; ro=uCamPos; vec3 f=normalize(uCamTgt-ro); vec3 up=vec3(sin(uRoll),cos(uRoll),0.);
  vec3 r=normalize(cross(f,up)); vec3 u=cross(r,f); return normalize(f/tan(radians(uFov)*0.5) + uv.x*r + uv.y*u);
}
void main(){
  vec2 frag=gl_FragCoord.xy; vec3 ro; vec3 rd=camRay(frag, ro);
  Hit h=trace(ro,rd,80.,230);
  vec3 col;
  if(h.kind==0){
    col=sky(rd,ro);
#ifdef FLOOR
    // пропасть: свет из глубины
    if(rd.y<0.){ float t=(-3.9-ro.y)/rd.y; vec3 p=ro+rd*t; if(p.x>GX0&&p.x<GX1) col=vec3(0.002,0.004,0.01)+CYAN*uW2.z*0.05*exp(-abs(p.x-1.4)*1.5); }
#endif
  } else {
    col=shadeHit(h,ro,rd,true);
    if(h.kind==4){ // глянцевый пол: отражение
      vec3 p=ro+rd*h.t; vec3 rr=reflect(rd,vec3(0,1,0)); Hit h2=trace(p+rr*0.003,rr,30.,120);
      float fr=0.03+0.45*pow(1.-max(-rd.y,0.),5.);
      vec3 rc = h2.kind==0 ? sky(rr,p)*0.6 : (h2.kind==4||h2.kind==5 ? vec3(0.) : shadeHit(h2,p,rr,false));
      col+=rc*fr*0.8; }
    float fog=1.-exp(-h.t*0.018);
#ifdef SPACE
    fog=0.;
#endif
    col=mix(col, sky(rd,ro)*0.6, fog);
  }
  vec4 sm=smokeVol(ro,rd,h.t); col=col*(1.-sm.a)+sm.rgb;
  vec4 fl=flameVol(ro,rd,h.t); col=col*(1.-fl.a*0.5)+fl.rgb;
  col+=discoBeams(ro,rd,h.t);
  o=vec4(col,1.);
}`;

SH.fsCopy = `#version 300 es
precision highp float; uniform sampler2D uTex; uniform vec2 uRes; uniform float uGain; out vec4 o;
void main(){ vec2 uv=gl_FragCoord.xy/uRes; o=texture(uTex,uv)*uGain; }`;
SH.fsPrefilter = `#version 300 es
precision highp float; uniform sampler2D uTex, uFront; uniform vec2 uRes; uniform float uFrontGlow; out vec4 o;
void main(){ vec2 uv=gl_FragCoord.xy/uRes; vec2 px=1./uRes*0.5;
  vec3 c=(texture(uTex,uv+px*vec2(-1,-1)).rgb+texture(uTex,uv+px*vec2(1,-1)).rgb+texture(uTex,uv+px*vec2(-1,1)).rgb+texture(uTex,uv+px*vec2(1,1)).rgb)*0.25;
  vec4 f=texture(uFront,uv); c+=pow(f.rgb,vec3(2.2))*uFrontGlow;
  float br=max(c.r,max(c.g,c.b)); float k=0.6; float soft=clamp(br-0.75+k,0.,2.*k); soft=soft*soft/(4.*k+1e-4);
  float w=max(soft,br-0.75)/max(br,1e-4); o=vec4(c*w,1.); }`;
SH.fsDown = `#version 300 es
precision highp float; uniform sampler2D uTex; uniform vec2 uRes; out vec4 o;
void main(){ vec2 uv=gl_FragCoord.xy/uRes; vec2 px=1./uRes;
  vec3 c=texture(uTex,uv).rgb*0.5;
  c+=(texture(uTex,uv+px*vec2(-1,-1)).rgb+texture(uTex,uv+px*vec2(1,-1)).rgb+texture(uTex,uv+px*vec2(-1,1)).rgb+texture(uTex,uv+px*vec2(1,1)).rgb)*0.125;
  o=vec4(c,1.); }`;
SH.fsUp = `#version 300 es
precision highp float; uniform sampler2D uTex; uniform vec2 uRes; uniform vec2 uSrc; out vec4 o;
void main(){ vec2 uv=gl_FragCoord.xy/uRes; vec2 px=1./uSrc;
  vec3 c=texture(uTex,uv).rgb*4.;
  c+=(texture(uTex,uv+vec2(px.x,0)).rgb+texture(uTex,uv-vec2(px.x,0)).rgb+texture(uTex,uv+vec2(0,px.y)).rgb+texture(uTex,uv-vec2(0,px.y)).rgb)*2.;
  c+=texture(uTex,uv+px).rgb+texture(uTex,uv-px).rgb+texture(uTex,uv+vec2(px.x,-px.y)).rgb+texture(uTex,uv+vec2(-px.x,px.y)).rgb;
  o=vec4(c/16.,1.); }`;
SH.fsFinal = `#version 300 es
precision highp float;
uniform sampler2D uScene, uBloom, uFront; uniform vec2 uRes;
uniform float uFlash, uCA, uBlack, uFade, uTime, uBloomK, uExpo;
out vec4 o;
vec3 aces(vec3 x){ const float a=2.51,b=0.03,c=2.43,d=0.59,e=0.14; return clamp((x*(a*x+b))/(x*(c*x+d)+e),0.,1.); }
void main(){
  vec2 uv=gl_FragCoord.xy/uRes; vec2 dir=uv-0.5; float r2=dot(dir,dir);
  vec2 off=dir*uCA*0.006*(0.4+r2*2.5);
  vec3 col=vec3(texture(uScene,uv+off).r, texture(uScene,uv).g, texture(uScene,uv-off).b);
  col+=texture(uBloom,uv).rgb*uBloomK;
  col=aces(col*uExpo); col=pow(col,vec3(1./2.2)); col*=1.-r2*0.55;
  vec4 f=texture(uFront,uv); col=col*(1.-f.a)+f.rgb;
  col=mix(col,vec3(1.),clamp(uFlash,0.,1.));
  float g=fract(sin(dot(gl_FragCoord.xy+fract(uTime*7.13)*917.,vec2(12.9898,78.233)))*43758.5453); col+=(g-0.5)*0.03;
  col*=(1.-uBlack)*(1.-uFade);
  o=vec4(clamp(col,0.,1.),1.);
}`;
