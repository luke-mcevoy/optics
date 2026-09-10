import{r as v,j as f}from"./react-DD18Zboh.js";import{w as S}from"./Steps-MMvd-Itz.js";import{O as F,I as T,u as y,d as M,A as w,D as C,c as E,i as A,b,V as j}from"./three-CqC5A2j7.js";const O=`
  uniform float uW0;
  uniform float uZR;
  uniform vec3 uFocus;      // world xz of the spotlighted site (y ignored)
  uniform float uFocusR;    // radius inside which beams keep full brightness
  uniform float uFocusDim;  // 1 = no spotlight; <1 dims everything outside the radius
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    vec3 p = position;
    #ifdef USE_INSTANCING_COLOR
      vColor = instanceColor;
    #else
      vColor = vec3(1.0);
    #endif
    #ifdef USE_INSTANCING
      vec4 world = instanceMatrix * vec4(p, 1.0);
      vec3 site = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
    #else
      vec4 world = vec4(p, 1.0);
      vec3 site = vec3(0.0);
    #endif
    float d = length(site.xz - uFocus.xz);
    float spot = mix(uFocusDim, 1.0, 1.0 - smoothstep(uFocusR, uFocusR * 1.6, d));
    float w = uW0 * sqrt(1.0 + (p.y * p.y) / (uZR * uZR));
    vec4 mv = modelViewMatrix * world;
    // instances are pure translations, so the model normal matrix applies unchanged
    vec3 n = normalize(normalMatrix * normal);
    vec3 v = normalize(-mv.xyz);
    float rim = 1.0 - abs(dot(n, v));
    // intensity ∝ (w0/w)²; the envelope is emphasised at grazing incidence so the
    // hourglass reads as a surface rather than fog
    vAlpha = spot * pow(uW0 / w, 1.4) * (0.2 + 0.8 * pow(rim, 1.6));
    gl_Position = projectionMatrix * mv;
  }
`,_=`
  uniform float uOpacity;
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    gl_FragColor = vec4(vColor, uOpacity * vAlpha);
  }
`;function I({positions:u,colors:l,count:d,w0:n,zR:c,yMin:r,yMax:s,opacity:o=.18,focusRef:e}){const m=v.useRef(null),p=v.useMemo(()=>new F,[]),x=v.useMemo(()=>{const t=[];for(let a=0;a<=20;a+=1){const g=r+(s-r)*a/20;t.push(new j(S(g,n,c),g))}return new A(t,12)},[n,c,r,s]),h=v.useMemo(()=>new M({vertexShader:O,fragmentShader:_,uniforms:{uW0:{value:n},uZR:{value:c},uOpacity:{value:o},uFocus:{value:new b},uFocusR:{value:1},uFocusDim:{value:1}},transparent:!0,depthWrite:!1,side:C,blending:w}),[n,c,o]);return v.useEffect(()=>{const t=m.current;if(t===null)return;const i=new T(l,3);t.instanceColor=i},[l]),y(()=>{const t=m.current;if(t===null)return;for(let a=0;a<d;a+=1)p.position.set(u[a*3]??0,u[a*3+1]??0,u[a*3+2]??0),p.updateMatrix(),t.setMatrixAt(a,p.matrix);t.instanceMatrix.needsUpdate=!0;const i=e==null?void 0:e.current;i!==void 0&&(h.uniforms.uFocus.value.set(i.x,0,i.z),h.uniforms.uFocusR.value=i.r,h.uniforms.uFocusDim.value=i.dim)}),f.jsx("instancedMesh",{ref:m,args:[x,h,d],frustumCulled:!1})}function z({positions:u,colors:l,scales:d,count:n,radius:c}){const r=v.useRef(null),s=v.useMemo(()=>new F,[]);return v.useEffect(()=>{const o=r.current;o!==null&&(o.instanceColor=new T(l,3))},[l]),y(()=>{const o=r.current;if(o!==null){for(let e=0;e<n;e+=1){const m=d[e]??1;s.position.set(u[e*3]??0,u[e*3+1]??0,u[e*3+2]??0),s.scale.setScalar(m),s.updateMatrix(),o.setMatrixAt(e,s.matrix)}o.instanceMatrix.needsUpdate=!0,o.instanceColor!==null&&(o.instanceColor.needsUpdate=!0)}}),f.jsxs("instancedMesh",{ref:r,args:[void 0,void 0,n],frustumCulled:!1,children:[f.jsx("sphereGeometry",{args:[c,14,14]}),f.jsx("meshBasicMaterial",{toneMapped:!1})]})}const L=`
  varying vec2 vUv;
  varying vec3 vLocal;
  void main() {
    vUv = uv;
    vLocal = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`,R=`
  uniform vec3 uColor;
  uniform float uTime;
  uniform float uPulse;
  uniform float uK;
  uniform float uSpeed;
  uniform float uOpacity;
  varying vec2 vUv;
  varying vec3 vLocal;
  void main() {
    // plane geometry lies in x (beam axis) and y (top-hat extent) before rotation
    float edge = 1.0 - smoothstep(0.82, 1.0, abs(vUv.y * 2.0 - 1.0));
    float fronts = 0.5 + 0.5 * sin(uK * vLocal.x - uSpeed * uTime);
    float a = uOpacity * uPulse * edge * (0.35 + 0.65 * fronts);
    gl_FragColor = vec4(uColor, a);
  }
`;function B({position:u,width:l,depth:d,color:n,pulseRef:c,k:r=6,speed:s=14,opacity:o=.55}){const e=v.useMemo(()=>new M({vertexShader:L,fragmentShader:R,uniforms:{uColor:{value:new E(n)},uTime:{value:0},uPulse:{value:0},uK:{value:r},uSpeed:{value:s},uOpacity:{value:o}},transparent:!0,depthWrite:!1,side:C,blending:w}),[n,r,s,o]);return y(m=>{e.uniforms.uTime.value=m.clock.elapsedTime,e.uniforms.uPulse.value=c.current}),f.jsx("mesh",{position:[...u],rotation:[-Math.PI/2,0,0],material:e,children:f.jsx("planeGeometry",{args:[l,d,1,1]})})}const U=`
  varying vec3 vLocal;
  void main() {
    vLocal = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`,G=`
  uniform vec3 uColor;
  uniform float uTime;
  uniform float uOpacity;
  uniform float uK;
  uniform float uSpeed;
  uniform int uMode; // 0 plain, 1 travelling fronts, 2 standing wave
  uniform float uHalfLen;
  varying vec3 vLocal;
  void main() {
    float x = vLocal.y; // cylinder axis is local y; we rotate the mesh so it lies along world x
    float fronts = 1.0;
    if (uMode == 1) fronts = 0.55 + 0.45 * sin(uK * x - uSpeed * uTime);
    if (uMode == 2) fronts = 0.35 + 0.65 * pow(cos(uK * x), 2.0);
    float endFade = 1.0 - smoothstep(0.9, 1.0, abs(x) / uHalfLen);
    gl_FragColor = vec4(uColor, uOpacity * fronts * endFade);
  }
`;function D({center:u,length:l,wy:d,wz:n,color:c,mode:r=0,k:s=8,speed:o=10,opacity:e=.12,gainRef:m}){const p=[1,.6666666666666666,.3333333333333333],x=v.useMemo(()=>p.map(t=>new M({vertexShader:U,fragmentShader:G,uniforms:{uColor:{value:new E(c)},uTime:{value:0},uOpacity:{value:e*Math.exp(-2*t*t)*2.2},uK:{value:s},uSpeed:{value:o},uMode:{value:r},uHalfLen:{value:l/2}},transparent:!0,depthWrite:!1,side:C,blending:w})),[c,e,s,o,r,l]),h=v.useMemo(()=>p.map(t=>e*Math.exp(-2*t*t)*2.2),[e]);return y(t=>{const i=(m==null?void 0:m.current)??1;x.forEach((a,g)=>{a.uniforms.uTime.value=t.clock.elapsedTime,a.uniforms.uOpacity.value=(h[g]??0)*i})}),f.jsx("group",{position:[...u],rotation:[0,0,Math.PI/2],children:x.map((t,i)=>{const a=p[i]??1;return f.jsx("mesh",{material:t,scale:[d*a,1,n*a],children:f.jsx("cylinderGeometry",{args:[1,1,l,40,1,!0]})},a)})})}export{z as A,B,D as G,I as T};
