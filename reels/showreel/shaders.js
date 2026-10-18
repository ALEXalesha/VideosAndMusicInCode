// Шейдеры шоурила 2:00: сцены лучевым маршем (SDF, фрактал, рельеф, город, стекло), частицы, свечение, сборка.
window.SH = {};
SH.vsQuad = `#version 300 es
void main(){ vec2 p = vec2((gl_VertexID<<1)&2, gl_VertexID&2); gl_Position = vec4(p*2.0-1.0, 0.0, 1.0); }`;

SH.fsScene = `#version 300 es
precision highp float;
uniform vec2 uRes; uniform float uT, uL, uK, uA, uB, uC, uLen; uniform int uS;
uniform vec3 uCamPos, uCamTgt, uP; uniform float uFov, uRoll;
uniform sampler2D uBack;
out vec4 o;
#define PI 3.14159265
mat2 rot(float a){ float c=cos(a), s=sin(a); return mat2(c,-s,s,c); }
float hash(vec3 p){ p=fract(p*0.3183099+.1); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float hash2(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float noise(vec3 x){ vec3 i=floor(x), f=fract(x); f=f*f*(3.-2.*f);
  return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z); }
float smin(float a,float b,float k){ float h=clamp(.5+.5*(b-a)/k,0.,1.); return mix(b,a,h)-k*h*(1.-h); }
float sdBox(vec3 p,vec3 b){ vec3 q=abs(p)-b; return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.); }
float sdTorus(vec3 p,vec2 t){ vec2 q=vec2(length(p.xz)-t.x,p.y); return length(q)-t.y; }
float sdOct(vec3 p,float s){ p=abs(p); return (p.x+p.y+p.z-s)*0.57735027; }
const vec3 CORAL=vec3(1.0,0.38,0.22), CYAN=vec3(0.24,0.85,1.0), VIOLET=vec3(0.55,0.38,1.0);

// студийное окружение для отражений: софтбоксы и полоса света
vec3 env(vec3 d){
  d.xz *= rot(uT*0.25);
  float y = d.y;
  vec3 c = mix(vec3(0.004,0.004,0.008), vec3(0.03,0.028,0.05), smoothstep(-0.3,0.9,y));
  c += vec3(1.0,0.46,0.30)*5.0*smoothstep(0.93,0.985, dot(d, normalize(vec3(-0.7,0.45,0.5))));
  c += vec3(0.25,0.75,1.0)*4.0*smoothstep(0.955,0.99, dot(d, normalize(vec3(0.8,0.25,-0.4))));
  c += vec3(0.62,0.45,1.0)*2.5*smoothstep(0.96,0.995, dot(d, normalize(vec3(0.1,-0.2,-1.0))));
  c += vec3(1.0)*3.0*smoothstep(0.035,0.0,abs(y-0.42))*smoothstep(-0.2,0.6,d.z);
  c += vec3(1.0)*1.2*smoothstep(0.02,0.0,abs(d.x-0.3))*smoothstep(0.0,0.5,y);
  return c;
}

vec2 hero(vec3 p){
  vec3 q=p; q.xz*=rot(uT*0.8); q.yz*=rot(uT*0.5);
  float m=uA;
  float s=length(q)-1.05;
  float b=sdBox(q,vec3(0.76))-0.13;
  float to=sdTorus(q.xzy,vec2(0.92,0.34));
  float oc=sdOct(q,1.38)-0.05;
  float d=mix(s,b,clamp(m,0.,1.));
  d=mix(d,to,clamp(m-1.,0.,1.));
  d=mix(d,oc,clamp(m-2.,0.,1.));
  d+=(0.03+0.07*uK)*sin(q.x*5.+uT*4.)*sin(q.y*5.3+uT*3.)*sin(q.z*4.7+uT*2.);
  for(int i=0;i<4;i++){ float fi=float(i); float a=uT*(1.1+0.25*fi)+fi*1.571;
    vec3 c=vec3(cos(a)*(1.75+0.2*sin(uT+fi)), sin(a*1.3+fi)*0.75, sin(a)*(1.75+0.2*cos(uT*1.3+fi)));
    d=smin(d, length(p-c)-(0.13+0.04*fi), 0.45); }
  return vec2(d*0.75,1.);
}
vec2 blobs(vec3 p){
  float d=1e5;
  for(int i=0;i<7;i++){ float fi=float(i);
    vec3 c=vec3(sin(uT*0.55+fi*1.7)*3.4, sin(uT*0.7+fi*2.3)*1.6, cos(uT*0.5+fi*1.1)*1.8-5.5);
    d=smin(d, length(p-c)-(0.7+0.25*sin(fi*3.)), 1.1); }
  return vec2(d,2.);
}
vec2 gyro(vec3 p){
  vec3 q=p-vec3(0.,0.55,0.); float th=uA, w=uB;
  vec3 a=q; a.xy*=rot(th+w); a.yz*=rot(th*0.5-w*0.6);
  vec3 b=q; b.yz*=rot(-th+w*0.8); b.xz*=rot(th*0.5+w*0.4);
  vec3 c=q; c.xz*=rot(th*2.-w); c.xy*=rot(-th*0.5+w*0.5);
  float r1=sdTorus(a.xzy, vec2(1.55,0.075));
  float r2=sdTorus(b.xzy, vec2(1.2,0.07));
  float r3=sdTorus(c.xzy, vec2(0.86,0.065));
  float core=length(q)-0.34-0.05*uK;
  float d=min(min(r1,r2),r3);
  return d<core ? vec2(d,3.) : vec2(core,4.);
}
// жидкий металл: капли вырастают из зеркальной лужи и сливаются
vec2 liquid(vec3 p){
  float d=p.y+1.2+0.035*sin(p.x*2.6+uT*2.)*sin(p.z*2.3-uT*1.7);
  for(int i=0;i<9;i++){ float fi=float(i);
    float lift=0.5+0.5*sin(uT*0.9+fi*1.9);
    vec3 c=vec3(sin(uT*0.45+fi*2.4)*1.9, -1.1+lift*1.9, cos(uT*0.38+fi*1.3)*1.4);
    float r=0.34+0.16*sin(fi*1.7+uT*0.8)+0.1*uK;
    d=smin(d, length(p-c)-r, 0.55); }
  return vec2(d*0.8,1.);
}
// стеклянный кристалл: октаэдр, срезанный кубом
float gem(vec3 p){ vec3 q=p-vec3(0.,0.1,0.); q.xz*=rot(uA); q.xy*=rot(0.35+0.25*sin(uA*0.7)); q.yz*=rot(0.2*cos(uA*0.5));
  return max(sdOct(q,1.28), sdBox(q,vec3(0.8)))-0.012; }
// интро: та же фигура, что у героя, «печатается» слоями снизу вверх (uB 0..1 печать, 1..2 застывает в хром)
vec2 printed(vec3 p){ vec3 q=p-uP; vec2 h=hero(q); float cut=mix(-1.6,1.6,clamp(uB,0.,1.)); return vec2(max(h.x, q.y-cut), 6.); }
vec2 mapObj(vec3 p){
  if(uS==0) return printed(p);
  if(uS==1) return hero(p);
  // uS==4 (частицы): пузырей нет - звёзды рисуются поверх без глубины, пузыри путали порядок
  if(uS==5) return gyro(p);
  if(uS==7) return liquid(p);
  if(uS==10) return vec2(gem(p),5.);
  return vec2(1e5,0.);
}
vec3 calcN(vec3 p){ vec2 e=vec2(0.0015,0.);
  return normalize(vec3(mapObj(p+e.xyy).x-mapObj(p-e.xyy).x, mapObj(p+e.yxy).x-mapObj(p-e.yxy).x, mapObj(p+e.yyx).x-mapObj(p-e.yyx).x)); }
vec2 march(vec3 ro, vec3 rd, float tmax){
  float t=0.; for(int i=0;i<150;i++){ vec2 h=mapObj(ro+rd*t); if(h.x<0.0008*t+0.0004) return vec2(t,h.y); t+=h.x; if(t>tmax) break; }
  return vec2(-1.,0.);
}
vec3 glassShade(vec3 p, vec3 rd, vec3 n){
  float fr=0.04+0.96*pow(1.-max(dot(n,-rd),0.),5.);
  vec3 col=env(reflect(rd,n))*fr;
  vec3 iors=vec3(1.36,1.5,1.68);
  for(int c=0;c<3;c++){ float ior=iors[c];
    vec3 r1=refract(rd,n,1./ior); vec3 q=p-n*0.004; float t=0.;
    for(int i=0;i<56;i++){ float d=-gem(q+r1*t); if(d<0.0008) break; t+=max(d,0.003); }
    vec3 pe=q+r1*t; vec3 ne=-calcN(pe);
    vec3 r2=refract(r1,ne,ior); if(dot(r2,r2)<1e-4) r2=reflect(r1,ne);
    vec3 e=env(r2)*1.6;
    col[c]+=e[c]*(1.-fr)*exp(-t*0.15);
  }
  return col;
}
vec3 chrome(vec3 p, vec3 rd, vec3 n){ // переливающийся хром
    vec3 r=reflect(rd,n); float fr=pow(1.-max(dot(n,-rd),0.),3.);
    vec3 irid=0.5+0.5*cos(6.2831*(vec3(0.,0.33,0.67)+fr*1.3+dot(n,vec3(0.3,0.5,0.2))*0.8+uT*0.15));
    vec3 base=mix(vec3(0.95),irid,0.6);
    vec3 c=env(r)*base*(0.25+0.75*fr+0.25);
    c+=base*max(dot(n,normalize(vec3(-0.5,0.8,0.4))),0.)*0.06;
    c+=vec3(1.0,0.45,0.3)*pow(fr,2.)*0.6*(1.+uK*2.)*(uS==7?0.2:1.);
    if(uS==7) c*=0.55;
    return c;
}
vec3 shadeObj(vec3 p, vec3 rd, vec3 n, float id){
  vec3 r=reflect(rd,n);
  float fr=pow(1.-max(dot(n,-rd),0.),3.);
  if(id<1.5) return chrome(p,rd,n);
  if(id>5.5){ // печать слоями: контуры слоёв, светящаяся «головка» на срезе, потом хром
    vec3 q=p-uP; float cut=mix(-1.6,1.6,clamp(uB,0.,1.));
    float layer=smoothstep(0.36,0.48,abs(fract(q.y*14.)-0.5));
    float head=exp(-max(cut-q.y,0.)*28.);
    vec3 wire=vec3(0.008,0.01,0.02)+CYAN*layer*0.9*(0.4+0.6*fr)+CYAN*fr*0.25+CORAL*head*4.;
    return mix(wire, chrome(p,rd,n), clamp(uB-1.,0.,1.));
  }
  if(id<2.5){ // тёмный хром капель
    vec3 c=env(r)*vec3(0.55,0.5,0.85)*(0.15+0.85*fr)*0.6;
    c+=vec3(0.3,0.8,1.0)*pow(fr,3.)*0.8;
    return c*(0.6+0.8*uB);
  }
  if(id<3.5){ // полированные кольца
    vec3 c=env(r)*vec3(1.0,0.86,0.72)*(0.35+0.65*fr);
    c+=vec3(1.0,0.45,0.3)*pow(fr,2.)*0.5;
    return c;
  }
  if(id<4.5) return vec3(1.0,0.38,0.22)*(4.0+6.0*uK) + vec3(1.)*pow(max(dot(n,-rd),0.),6.)*3.; // светящееся ядро
  return glassShade(p,rd,n);
}
vec3 camRay(vec2 frag, out vec3 ro){
  vec2 uv=(2.*frag-uRes)/uRes.y;
  ro=uCamPos; vec3 f=normalize(uCamTgt-ro); vec3 up=vec3(sin(uRoll),cos(uRoll),0.);
  vec3 r=normalize(cross(f,up)); vec3 u=cross(r,f);
  return normalize(f/tan(radians(uFov)*0.5) + uv.x*r + uv.y*u);
}
vec3 backTex(vec2 frag){ vec3 c=texture(uBack, frag/uRes).rgb; return pow(c, vec3(2.2)); }

// ---------- фрактал Мандельбульб
float gTrap;
float bulb(vec3 p){
  p.xz*=rot(uT*0.1); p.xy*=rot(0.3);
  vec3 z=p; float dr=1., r=0., pw=uA; gTrap=1e9;
  for(int i=0;i<7;i++){ r=length(z); if(r>2.) break;
    float th=acos(clamp(z.y/r,-1.,1.))*pw, ph=atan(z.z,z.x)*pw;
    dr=pow(r,pw-1.)*pw*dr+1.;
    z=pow(r,pw)*vec3(sin(th)*cos(ph),cos(th),sin(th)*sin(ph))+p;
    gTrap=min(gTrap,dot(z,z)); }
  return 0.5*log(r)*r/dr;
}
vec3 fractalScene(vec3 ro, vec3 rd, vec2 uv){
  vec3 bg=vec3(0.006,0.004,0.014)+VIOLET*0.05*exp(-length(uv-0.5)*2.5);
  float b=dot(ro,rd), c=dot(ro,ro)-1.5; float disc=b*b-c;
  if(disc<0.) return bg;
  float t=max(0.,-b-sqrt(disc)); float tEnd=-b+sqrt(disc);
  float glow=0., steps=0.; bool hit=false; float trap=0.;
  for(int i=0;i<200;i++){ vec3 p=ro+rd*t; float d=bulb(p);
    glow+=exp(-d*40.)*0.01;
    if(d<0.00035*t){ hit=true; trap=gTrap; break; }
    t+=d*0.85; steps=float(i); if(t>tEnd) break; }
  vec3 col=bg;
  if(hit){ vec3 p=ro+rd*t; vec2 e=vec2(0.0004*t+0.0002,0.);
    vec3 n=normalize(vec3(bulb(p+e.xyy)-bulb(p-e.xyy), bulb(p+e.yxy)-bulb(p-e.yxy), bulb(p+e.yyx)-bulb(p-e.yyx)));
    float ao=pow(clamp(1.-steps/90.,0.,1.),1.6);
    float tr=clamp(sqrt(trap),0.,1.);
    vec3 alb=mix(mix(CORAL*1.2,VIOLET,smoothstep(0.25,0.6,tr)), vec3(0.95,0.9,0.85), smoothstep(0.7,0.95,tr));
    vec3 L=normalize(vec3(0.6,0.8,0.3)); float dif=max(dot(n,L),0.);
    float rim=pow(1.-max(dot(n,-rd),0.),3.);
    alb*=alb;
    col=alb*(0.015+dif*0.85)*ao + CYAN*rim*0.35*ao*ao;
    col+=vec3(1.,0.8,0.7)*pow(max(dot(reflect(rd,n),L),0.),30.)*0.8*ao;
  }
  col+=VIOLET*glow*0.35*(0.6+uK*1.2);
  return col;
}

// ---------- синтвейв-рельеф с солнцем
float terrH(vec2 p){ float v=smoothstep(1.3,6.5,abs(p.x)); float n=0., a=0.5; vec2 q=p*0.16;
  for(int i=0;i<5;i++){ n+=a*noise(vec3(q,1.7)); q=q*2.07+vec2(1.3,-0.7); a*=0.5; }
  return -1.0 + v*(n*7.5-1.0); }
vec3 terrainScene(vec3 ro, vec3 rd){
  vec3 sd=normalize(vec3(0.,0.13,-1.));
  float y=rd.y;
  vec3 sky=mix(vec3(0.9,0.22,0.42)*0.55, vec3(0.012,0.004,0.035), smoothstep(0.0,0.45,y));
  float sa=acos(clamp(dot(rd,sd),-1.,1.));
  float sun=smoothstep(0.205,0.2,sa);
  float band=(sd.y-y)*34.; float cut=step(fract(band),clamp((sd.y-y)*6.,0.,0.9)) * step(y,sd.y);
  vec3 sunc=mix(vec3(1.0,0.2,0.55), vec3(1.0,0.85,0.3), smoothstep(-0.1,0.2,(y-sd.y)/0.2+0.5));
  sky+=sunc*sun*(1.-cut)*2.2 + vec3(1.,0.3,0.5)*exp(-sa*5.)*0.35;
  vec3 sp=floor(rd*420.); sky+=vec3(1.)*step(0.9975,hash(sp))*smoothstep(0.05,0.3,y)*0.8;
  float t=0.05; bool hit=false;
  for(int i=0;i<240;i++){ vec3 p=ro+rd*t; float h=terrH(p.xz); float dy=p.y-h;
    if(dy<0.002*t){ hit=true; break; } t+=max(dy*0.42,0.008*t); if(t>110.) break; }
  if(!hit) return sky;
  vec3 p=ro+rd*t;
  vec2 g=abs(fract(p.xz)-0.5); vec2 fw=fwidth(p.xz);
  float line=max(smoothstep(0.47-fw.x,0.47,g.x), smoothstep(0.47-fw.y,0.47,g.y))*(1.-smoothstep(0.08,0.4,max(fw.x,fw.y)));
  float hh=clamp((p.y+1.)/3.,0.,1.);
  vec3 lc=mix(vec3(1.,0.2,0.7), CYAN, hh);
  vec3 col=vec3(0.02,0.006,0.045)+lc*line*(1.4+uK*1.6);
  col+=CORAL*exp(-abs(p.x)*14.)*(0.9+uK)*step(p.y,-0.95);
  float fog=1.-exp(-t*0.03);
  return mix(col, vec3(0.9,0.22,0.42)*0.5, fog);
}

// ---------- город из повторённых коробок
float bH(vec2 c){ float h=hash(vec3(c,3.1)); float d=length(c-vec2(2.,-4.));
  float wave=max(0.,sin(d*0.42-uL*3.2)); wave=pow(wave,10.);
  return 0.3+3.2*h*h*h+wave*1.1+uK*0.3*h; }
float gWave; float gBox;
float cityMap(vec3 p, out float border){
  vec2 c=floor(p.xz/1.25); vec2 lp=(fract(p.xz/1.25)-0.5)*1.25;
  float h=bH(c); gWave=pow(max(0.,sin(length(c-vec2(2.,-4.))*0.42-uL*3.2)),10.);
  float box=sdBox(vec3(lp.x,p.y-(h-1.)*0.5,lp.y), vec3(0.45,(h+1.)*0.5,0.45))-0.02;
  border=min(0.625-abs(lp.x),0.625-abs(lp.y));
  gBox=box;
  return min(box, p.y+1.);
}
vec3 cityScene(vec3 ro, vec3 rd){
  vec3 sky=mix(vec3(0.05,0.03,0.09), vec3(0.004,0.004,0.012), smoothstep(-0.05,0.5,rd.y));
  sky+=vec3(1.,0.55,0.4)*exp(-acos(clamp(dot(rd,normalize(vec3(0.5,0.25,-1.))),-1.,1.))*9.)*0.6;
  float t=0.; bool hit=false; float bd;
  for(int i=0;i<200;i++){ vec3 p=ro+rd*t; float d=cityMap(p,bd);
    if(d<0.001*t+0.0005){ hit=true; break; }
    t+=min(d, max(bd,0.)+0.03); if(t>70.) break; }
  if(!hit) return sky;
  vec3 p=ro+rd*t; float tmp;
  vec2 e=vec2(0.002,0.);
  vec3 n=normalize(vec3(cityMap(p+e.xyy,tmp)-cityMap(p-e.xyy,tmp), cityMap(p+e.yxy,tmp)-cityMap(p-e.yxy,tmp), cityMap(p+e.yyx,tmp)-cityMap(p-e.yyx,tmp)));
  cityMap(p,tmp); float wave=gWave; bool isBox=gBox<p.y+1.+0.001;
  vec2 c=floor(p.xz/1.25); vec2 lp=(fract(p.xz/1.25)-0.5)*1.25;
  float fr=pow(1.-max(dot(n,-rd),0.),4.);
  vec3 col;
  if(isBox){
    col=vec3(0.01,0.011,0.02)+env(reflect(rd,n))*(0.04+0.4*fr);
    if(abs(n.y)<0.5){ vec2 uv=abs(n.x)>0.5 ? p.zy : p.xy;
      vec2 wc=floor(uv*vec2(7.,9.)); vec2 wf=abs(fract(uv*vec2(7.,9.))-0.5);
      float on=step(0.62,hash(vec3(wc,c.x*7.+c.y*13.)));
      float m=step(wf.x,0.3)*step(wf.y,0.28);
      vec3 wcol=mix(vec3(1.,0.62,0.36), CYAN, step(0.7,hash(vec3(wc.yx,c.y))));
      col+=wcol*on*m*(0.55+wave*2.5);
    } else {
      float edge=smoothstep(0.38,0.44,max(abs(lp.x),abs(lp.y)));
      col+=mix(CORAL,CYAN,hash(vec3(c,9.)))*edge*(0.6+wave*5.+uK*0.8);
      col+=CORAL*wave*0.6;
    }
  } else {
    vec2 g=abs(fract(p.xz/1.25)-0.5); vec2 fw=fwidth(p.xz/1.25);
    float line=max(smoothstep(0.47-fw.x,0.47,g.x), smoothstep(0.47-fw.y,0.47,g.y))*(1.-smoothstep(0.1,0.4,max(fw.x,fw.y)));
    col=vec3(0.006,0.006,0.012)+CYAN*line*0.25+env(reflect(rd,n))*fr*0.2;
  }
  float fog=1.-exp(-t*0.045);
  return mix(col, vec3(0.05,0.03,0.09), fog);
}

// ---------- чёрная дыра: луч гнётся по геодезической Шварцшильда (rs = 1), диск с доплеровским усилением
vec3 starBg(vec3 d){
  vec3 c=vec3(0.002,0.002,0.006);
  float n=noise(d*2.6)*0.55+noise(d*6.3+7.)*0.3+noise(d*14.+3.)*0.15;
  c+=mix(vec3(0.32,0.1,0.5),vec3(0.05,0.22,0.45),noise(d*1.7+11.))*pow(n,3.2)*0.32;
  vec3 q=d*700.; vec3 id=floor(q); float h=hash(id);
  if(h>0.993){ vec3 f=fract(q)-0.5; float s=exp(-dot(f,f)*28.);
    c+=mix(vec3(1.,0.78,0.6),vec3(0.65,0.8,1.),hash(id+3.))*s*(h-0.993)*420.; }
  return c;
}
vec3 holeScene(vec3 ro, vec3 rd){
  vec3 p=ro, v=rd; vec3 col=vec3(0.); float al=0.; bool cap=false;
  vec3 hc=cross(p,v); float h2=dot(hc,hc);
  for(int i=0;i<320;i++){
    float r=length(p);
    if(r<1.0){ cap=true; break; }
    float dt=clamp(0.06*r,0.015,1.0);
    vec3 pn=p+v*dt; v+=-1.5*h2*p/pow(r,5.)*dt;
    if(p.y*pn.y<0.){ vec3 c=mix(p,pn,p.y/(p.y-pn.y)); float rc=length(c);
      if(rc>2.4 && rc<13.){
        float om=1.6/pow(rc,1.5); vec2 cr=rot(uT*om)*c.xz;
        float tx=noise(vec3(cr*1.3,rc*0.6))*0.55+noise(vec3(cr*3.1,rc*1.7+5.))*0.3+noise(vec3(cr*7.,rc*3.))*0.15;
        float rings=0.6+0.4*sin(rc*9.+tx*6.);
        float T=pow(3.0/rc,0.9);
        vec3 tc=mix(vec3(1.0,0.28,0.06), vec3(1.0,0.8,0.55), clamp(T,0.,1.)); tc=mix(tc, vec3(0.75,0.85,1.0), clamp(T-1.,0.,1.));
        vec3 tg=normalize(vec3(-c.z,0.,c.x)); float beta=sqrt(0.5/rc);
        float D=1./(inversesqrt(1.-beta*beta)*(1.-beta*dot(tg,-normalize(v))));
        float g=sqrt(max(1.-1./rc,0.));
        float dens=smoothstep(2.4,3.2,rc)*smoothstep(13.,6.,rc)*(0.3+0.7*tx)*rings;
        float a=clamp(dens*0.85,0.,1.);
        col+=(1.-al)*tc*T*T*pow(D,3.)*g*a*3.2*(1.+uK*0.4);
        al+=(1.-al)*a; } }
    p=pn;
    if(al>0.985) break;
    if(r>45. && dot(p,v)>0.) break;
  }
  vec3 bg=cap ? vec3(0.) : starBg(normalize(v));
  return col+(1.-al)*bg;
}

void main(){
  vec2 frag=gl_FragCoord.xy; vec3 ro; vec3 rd=camRay(frag, ro);
  vec2 uv=frag/uRes; vec3 col=vec3(0.);
  if(uS==0){ // интро: неоновая сетка пола уходит в даль
    float fy=-1.0; vec3 bg=vec3(0.0);
    if(rd.y<-0.001){ float t=(fy-ro.y)/rd.y; vec3 p=ro+rd*t; p.z+=uT*2.2;
      vec2 g=abs(fract(p.xz)-0.5); vec2 fw=fwidth(p.xz)*1.2;
      float line=max(smoothstep(0.488-fw.x,0.488,g.x), smoothstep(0.488-fw.y,0.488,g.y));
      float fade=exp(-t*0.3)*uC*(1.-smoothstep(0.04,0.25,max(fw.x,fw.y)));
      bg+=vec3(0.2,0.75,1.0)*line*fade*0.9;
      bg+=vec3(1.0,0.4,0.25)*exp(-abs(p.x)*3.)*fade*0.08; }
    bg+=vec3(1.0,0.42,0.28)*exp(-abs(rd.y+0.02)*160.)*0.3*uC;
    col=bg;
    if(uB>0.){ vec2 h=march(ro,rd,20.); if(h.x>0.){ vec3 p=ro+rd*h.x; col=shadeObj(p,rd,calcN(p),6.); } }
  } else if(uS==2){ // фон типографики
    float b=sin((uv.x*1.2+uv.y*0.6)*10.-uT*3.)*0.5+0.5;
    col=vec3(0.015,0.015,0.03)+vec3(0.35,0.2,0.8)*pow(b,8.)*0.15;
  } else if(uS==3){ // неоновый туннель
    float t=0.05; vec3 glow=vec3(0.); vec3 hitc=vec3(0.);
    for(int i=0;i<110;i++){ vec3 p=ro+rd*t; vec3 q=p; q.xy*=rot(q.z*0.09+uT*0.7);
      float r=length(q.xy); float zc=floor(q.z/1.6); float zz=q.z-zc*1.6-0.8;
      float ang=atan(q.y,q.x);
      float wall=2.5-r;
      float ring=length(vec2(r-2.32, zz))-0.03;
      float seg=abs(fract(ang*6./PI)-0.5);
      float rib=length(vec2(seg*r*0.52, r-2.42))-0.02;
      float d=min(min(wall,ring),rib);
      vec3 rc= mod(zc,3.)<1. ? vec3(1.,0.38,0.24) : (mod(zc,3.)<2. ? vec3(0.25,0.85,1.) : vec3(0.6,0.4,1.));
      glow+=rc*exp(-ring*60.)*0.018*(0.4+uB) + vec3(0.3,0.5,1.)*exp(-rib*80.)*0.0015;
      if(d<0.002){ float lines=smoothstep(-0.03,0.0,abs(zz)-0.77)+smoothstep(0.47,0.49,seg);
        hitc=vec3(0.006,0.007,0.016)+vec3(0.2,0.5,1.)*lines*0.08; break; }
      t+=max(d*0.7,0.01); if(t>40.) break; }
    float fog=exp(-t*0.06);
    col=hitc*fog+glow*fog;
    vec3 fwd=normalize(uCamTgt-uCamPos);
    col+=vec3(1.,0.85,0.75)*pow(max(dot(rd,fwd),0.),300.)*(1.+uB*12.);
    col+=vec3(1.,0.5,0.35)*pow(max(dot(rd,fwd),0.),20.)*uB*0.08;
  } else if(uS==11){ col=holeScene(ro,rd);
  } else if(uS==6){ col=fractalScene(ro,rd,uv);
  } else if(uS==8){ col=terrainScene(ro,rd);
  } else if(uS==9){ col=cityScene(ro,rd);
  } else { // сцены с объектами: 1 герой, 4 капли, 5 гироскоп, 7 жидкий металл, 10 стекло
    float floorY = uS==5 ? -1.15 : (uS==10 ? -1.25 : -100.);
    vec2 h=march(ro,rd,40.);
    float tFloor = rd.y<0. ? (floorY-ro.y)/rd.y : 1e9;
    vec3 bg;
    if(uS==1 || uS==7){ bg=backTex(frag)*1.7 + vec3(0.012,0.01,0.02)*(1.-length(uv-0.5)); }
    else if(uS==4){ bg=vec3(0.005,0.004,0.012)+vec3(0.25,0.15,0.6)*pow(noise(vec3(rd.xy*3.,uT*0.2)),3.)*0.12;
      // ядро галактики: тёплое свечение и фиолетовый ореол, растут вместе со сборкой галактики (uB)
      vec3 w=vec3(3.4,0.,0.)-ro; float tp=max(dot(w,rd),0.); float dd=length(w-rd*tp);
      bg+=(vec3(1.0,0.78,0.55)*exp(-dd*2.6)*0.9+vec3(0.55,0.38,1.0)*exp(-dd*0.6)*0.12)*uB; }
    else if(uS==10){ bg=vec3(0.005,0.005,0.01)+env(rd)*0.05+VIOLET*0.04*exp(-length(uv-vec2(0.5,0.6))*3.); }
    else bg=vec3(0.006,0.005,0.01)+vec3(1.0,0.4,0.25)*0.05*exp(-length(uv-vec2(0.5,0.62))*3.);
    if(h.x>0. && h.x<tFloor){ vec3 p=ro+rd*h.x; vec3 n=calcN(p); col=shadeObj(p,rd,n,h.y);
      if(uS==7){ vec3 r=reflect(rd,n); vec2 h2=march(p+n*0.02,r,14.);
        if(h2.x>0.){ vec3 q=p+r*h2.x; vec3 c2=shadeObj(q,r,calcN(q),1.); col=mix(col,c2,0.55); } }
      col=mix(bg,col,exp(-h.x*(uS==7?0.045:0.02))); }
    else if(tFloor<1e8){ // глянцевый пол с отражением
      vec3 p=ro+rd*tFloor; vec3 rr=reflect(rd,vec3(0,1,0));
      float fr=0.04+0.5*pow(1.-max(-rd.y,0.),4.);
      vec2 hr=march(p+rr*0.01,rr,20.); vec3 refl=env(rr)*0.15;
      if(hr.x>0.){ vec3 q=p+rr*hr.x; refl=shadeObj(q,rr,calcN(q),hr.y); }
      float dd=mapObj(p).x; float occ=0.35+0.65*smoothstep(0.,1.6,dd);
      vec2 g=abs(fract(p.xz*0.5)-0.5); vec2 fw=fwidth(p.xz*0.5)*1.5;
      float line=max(smoothstep(0.49-fw.x,0.49,g.x),smoothstep(0.49-fw.y,0.49,g.y));
      vec3 fc=vec3(0.006)+vec3(0.2,0.6,1.)*line*0.05;
      col=(fc+refl*fr)*occ;
      if(uS==5) col+=vec3(1.0,0.38,0.22)*0.35*exp(-length(p.xz)*1.2)*(1.+uK);
      if(uS==10){ // радужные каустики под кристаллом
        float a=atan(p.z,p.x)+uA*0.6; float rr2=length(p.xz);
        vec3 rainbow=0.5+0.5*cos(6.2831*(vec3(0.,0.33,0.67)+rr2*0.7+a*0.3));
        col+=rainbow*0.18*exp(-rr2*1.1)*(0.6+0.4*sin(a*7.+uT));
      }
      col=mix(bg,col,exp(-tFloor*0.06));
    } else col=bg;
  }
  o=vec4(col,1.);
}`;

SH.vsPart = `#version 300 es
precision highp float;
layout(location=0) in vec4 aT; layout(location=1) in vec4 aR;
uniform mat4 uVP; uniform vec3 uCam; uniform float uL, uK, uPx, uFocus, uGal, uPk;
out vec3 vCol; out float vA;
mat2 rot(float a){ float c=cos(a), s=sin(a); return mat2(c,-s,s,c); }
float eo(float t){ t=clamp(t,0.,1.); return t>=1.?1.:1.-pow(2.,-10.*t); }
float eio(float t){ t=clamp(t,0.,1.); return t<.5?4.*t*t*t:1.-pow(-2.*t+2.,3.)/2.; }
void main(){
  float l=uL; vec3 pos; vec3 col; float inten;
  vec3 coral=vec3(1.0,0.42,0.28), violet=vec3(0.55,0.36,1.0), cyan=vec3(0.24,0.9,1.0);
  if(aT.w<0.5){
    vec3 tp=aT.xyz + 0.025*vec3(sin(l*3.+aR.x*40.), cos(l*2.7+aR.y*40.), sin(l*2.+aR.z*40.));
    tp.z += uK*0.12*(aR.w-0.5);
    float rs=4.5+aR.x*5.; float a0=aR.y*6.2832; float ys=(aR.z-0.5)*7.;
    vec3 st=vec3(rs*cos(a0+l*1.8), ys, rs*sin(a0+l*1.8));
    float p=eo((l-fract(aR.w*7.31)*0.28)/0.62);
    vec3 sw=st; sw.xz*=rot((1.-p)*2.6);
    pos=mix(sw,tp,p);
    float xx=clamp(aT.x/7.+0.5,0.,1.);
    col= xx<0.5 ? mix(coral,violet,xx*2.) : mix(violet,cyan,xx*2.-1.);
    inten=0.75+0.5*fract(aR.x*13.7);
    float e=l-uGal;
    if(e>0.){
      float r=1.0+pow(aR.y,0.8)*5.2; float arm=floor(aR.z*3.)*2.0944;
      float th=arm + r*0.55 + (aR.x-0.5)*0.9 - e*(1.4/sqrt(r));
      vec3 gal=vec3(r*cos(th), (aR.w-0.5)*0.35/(1.+r*0.4), r*sin(th)) + vec3(3.4,0.,0.);
      float pe=eio(e/1.0);
      vec3 dir=normalize(tp-vec3(0.,0.,-1.5)+0.3*(aR.xyz-0.5));
      vec3 burst=dir*sin(min(e/1.0,1.)*3.14159265)*2.4;
      pos=mix(tp,gal,pe)+burst;
      vec3 gc=mix(vec3(1.0,0.85,0.7), mix(violet,cyan,clamp((r-2.)/4.,0.,1.)), clamp(r/3.,0.,1.));
      col=mix(col,gc,pe); inten*=1.+exp(-e*5.)*2.;
    }
  } else { // пыль вокруг
    pos=aT.xyz + vec3(sin(l*0.4+aR.x*6.)*0.6, cos(l*0.3+aR.y*6.)*0.4, sin(l*0.35+aR.z*6.)*0.6);
    col=mix(violet,cyan,aR.x); inten=0.18;
  }
  vec4 cp=uVP*vec4(pos,1.); gl_Position=cp;
  float dist=length(pos-uCam);
  float coc=abs(dist-uFocus)*0.55;
  float sz=(0.035+coc*0.06)*uPx/max(cp.w,0.1);
  gl_PointSize=clamp(sz,1.5*uPk,90.*uPk);
  vCol=col; vA=inten/(1.+coc*coc*6.);
}`;

SH.fsPart = `#version 300 es
precision highp float; in vec3 vCol; in float vA; out vec4 o;
void main(){ vec2 c=gl_PointCoord*2.-1.; float d=dot(c,c); if(d>1.) discard; float a=exp(-d*3.5)*vA; o=vec4(vCol*a*1.6, a); }`;

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
  col=aces(col*uExpo);
  col=pow(col,vec3(1./2.2));
  col*=1.-r2*0.6;
  vec4 f=texture(uFront,uv);
  col=col*(1.-f.a)+f.rgb;
  col=mix(col,vec3(1.),clamp(uFlash,0.,1.));
  float g=fract(sin(dot(gl_FragCoord.xy+fract(uTime*7.13)*917.,vec2(12.9898,78.233)))*43758.5453);
  col+=(g-0.5)*0.03;
  col*=(1.-uBlack)*(1.-uFade);
  o=vec4(clamp(col,0.,1.),1.);
}`;
