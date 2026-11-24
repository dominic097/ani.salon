/* GPU light study, progressively loaded. No image pixels leave the visitor's browser. */
export async function startLightRoomWebGL(stage, canvas) {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  if (reducedMotion.matches) return;
  // Prefer WebGL2: Three.js is imported only after hardware capability is confirmed.
  const context = canvas.getContext('webgl2', {
    alpha:true,antialias:false,premultipliedAlpha:false,powerPreference:'low-power'
  });
  if (!context) return;
  const THREE = await import('../vendor/three.module.js');
  const renderer = new THREE.WebGLRenderer({canvas,context,alpha:true,antialias:false,premultipliedAlpha:false});
  renderer.setClearColor(0x000000,0);
  const coarsePointer = matchMedia('(pointer:coarse)').matches;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1,coarsePointer ? 1.15 : 1.6));
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1,1,1,-1,.1,10);
  camera.position.z = 1;
  const uniforms = {
    uTime:{value:0},uAspect:{value:1},uFocus:{value:.73},uLook:{value:0}
  };
  const material = new THREE.ShaderMaterial({
    uniforms,transparent:true,depthWrite:false,depthTest:false,
    blending:THREE.NormalBlending,
    vertexShader:`
      varying vec2 vUv;
      void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}
    `,
    fragmentShader:`
      precision mediump float;
      varying vec2 vUv;
      uniform float uTime,uAspect,uFocus,uLook;
      float gaussian(float v,float width){return exp(-v*v/(width*width));}
      void main(){
        vec2 p=vUv;
        float t=uTime;
        float reveal=smoothstep(.15,5.8,t);
        float firstLight=smoothstep(0.,.85,t);
        float drift=sin(t*.35)*.008;
        float slope=mix(.40,.13,reveal);
        float center=uFocus+(p.y-.61)*slope+mix(-.11,.013,reveal)+drift;
        float width=mix(.038,.185,reveal);
        float distanceFromBeam=(p.x-center)*uAspect;
        float shaft=gaussian(distanceFromBeam,width);
        float falloff=smoothstep(-.12,.86,p.y);
        float sun=shaft*falloff*firstLight*mix(.24,.14,reveal);
        float halo=gaussian((p.x-uFocus)*uAspect,.34)*gaussian(p.y-.62,.35)*reveal*.12;
        // Sparse moving points of light suggest reflections on gold and silk.
        float x1=mix(.68,.78,step(.5,uLook));
        float y1=mix(.44,.34,step(.5,uLook));
        float sparkle=gaussian((p.x-x1)*uAspect,.009)*gaussian(p.y-y1,.013);
        float sparkle2=gaussian((p.x-(x1-.07))*uAspect,.009)*gaussian(p.y-(y1-.09),.011);
        float twinkle=pow(max(0.,sin(t*1.65)),5.0)*(.28+.72*step(1.5,uLook));
        float glow=sun+halo+(sparkle*.13+sparkle2*.08)*twinkle*reveal;
        vec3 gold=mix(vec3(1.0,.94,.79),vec3(1.0,.82,.61),reveal);
        gl_FragColor=vec4(gold,clamp(glow,0.,.28));
      }
    `
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2,2),material);
  quad.frustumCulled=false;
  scene.add(quad);

  let raf=0,inView=false,lastFrame=coarsePointer ? null : 0;
  let revealStarted=0;
  const frameDelay=coarsePointer ? 1000/30 : 1000/45;
  // Allow for rounding between two mobile rAF timestamps.
  const frameTolerance=coarsePointer ? 1 : 0;
  function setLook(){
    const name=stage.dataset.lightLook || 'heirloom';
    uniforms.uLook.value=name==='detail'?2:name==='unbound'?1:0;
    const focus=parseFloat(getComputedStyle(stage).getPropertyValue('--sun-focus-x'));
    uniforms.uFocus.value=Number.isFinite(focus)?focus/100:.73;
  }
  function syncReveal(){
    revealStarted=Number(stage.dataset.lightRevealStarted) || 0;
  }
  setLook();
  syncReveal();
  function resize(){
    const box=stage.getBoundingClientRect();
    if(box.width<1||box.height<1)return;
    uniforms.uAspect.value=box.width/box.height;
    renderer.setSize(Math.round(box.width),Math.round(box.height),false);
  }
  resize();
  function stop(){
    if(raf){cancelAnimationFrame(raf);raf=0;}
    if(coarsePointer)lastFrame=null;
  }
  function draw(now){
    raf=0;
    if(!inView||document.hidden||reducedMotion.matches)return;
    const elapsed=lastFrame===null ? frameDelay : now-lastFrame;
    if(elapsed+frameTolerance>=frameDelay){
      if(coarsePointer&&lastFrame!==null){
        // Keep the frame schedule and advance past missed intervals with one draw.
        lastFrame+=Math.floor((elapsed+frameTolerance)/frameDelay)*frameDelay;
      }else{
        lastFrame=now;
      }
      uniforms.uTime.value=revealStarted ? Math.max(0,(now-revealStarted)/1000) : 0;
      renderer.render(scene,camera);
      if(!stage.classList.contains('webgl-ready'))stage.classList.add('webgl-ready');
    }
    raf=requestAnimationFrame(draw);
  }
  function startRendering(){
    if(!raf&&inView&&!document.hidden&&!reducedMotion.matches)raf=requestAnimationFrame(draw);
  }
  const visibility=new IntersectionObserver(entries=>{
    inView=entries[0].isIntersecting;
    if(inView){resize();startRendering()}else stop();
  },{threshold:.04});
  visibility.observe(stage);
  const sizeObserver='ResizeObserver' in window?new ResizeObserver(resize):null;
  sizeObserver?.observe(stage);
  window.addEventListener('resize',resize,{passive:true});
  document.addEventListener('visibilitychange',()=>document.hidden?stop():startRendering());
  reducedMotion.addEventListener('change',()=>reducedMotion.matches?stop():startRendering());
  new MutationObserver(records=>{
    for(const record of records){
      if(record.attributeName==='data-light-look')setLook();
      else syncReveal();
    }
  }).observe(stage,{attributes:true,attributeFilter:['data-light-look','data-light-reveal-started']});
  canvas.addEventListener('webglcontextlost',event=>{
    event.preventDefault();stop();inView=false;stage.classList.remove('webgl-ready');
  });
}
