/* Local articulated models. All positions use metres, with +Z facing forward. */
(() => {
  'use strict';
  const { THREE, GLTFExporter, GLTFLoader } = window.Ruiang3DEngine;
  const TAU = Math.PI * 2;
  const MOTION_SECONDS = {idle:4.8,wave:3.2,jump:2.8,cheer:3.6,march:2.4,squat:4.8,pushup:4.8,dog:6.4,neck:8,shoulder:6,shot:3.6,cycle:60/78};

  function ease(value) {
    const x = THREE.MathUtils.clamp(value,0,1);
    return x*x*x*(x*(x*6-15)+10);
  }

  function pulseWindow(value,start,end) {
    if (value<=start || value>=end) return 0;
    return Math.sin((value-start)/(end-start)*Math.PI)**2;
  }

  const instances = new Set();
  const savedPositions = new Map();
  const colors = { white:0xfff9ee, red:0xe64536, gold:0xe0ac48, green:0x218e7e, skin:0xf0bf9e, ink:0x29201d };
  const v = (x,y,z) => new THREE.Vector3(x,y,z);
  const unitY = v(0,1,0);

  function makeRig(kind, level = 5) {
    const mascot = kind === 'mascot' || kind === 'bike';
    const female = kind === 'female';
    const root = new THREE.Group();
    root.name = 'Ruiang';
    const joints = [root];
    const materials = new Map();
    const sphere = new THREE.SphereGeometry(1,20,14);
    const group = (name,parent = root) => {
      const node = new THREE.Group();
      node.name = name;
      parent.add(node);
      joints.push(node);
      return node;
    };
    const material = (color,metalness = 0) => {
      const key = color+':'+metalness;
      if (!materials.has(key)) materials.set(key,new THREE.MeshStandardMaterial({color,metalness,roughness:metalness ? .29 : .62}));
      return materials.get(key);
    };
    function oval(parent, position, scale, color, metalness = 0) {
      const mesh = new THREE.Mesh(sphere,material(color,metalness));
      mesh.position.set(...position);
      mesh.scale.set(...scale);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    }
    function ring(parent,position,radius,tube,color,rotation = [0,0,0]) {
      const mesh = new THREE.Mesh(new THREE.TorusGeometry(radius,tube,7,30),material(color,.55));
      mesh.position.set(...position);
      mesh.rotation.set(...rotation);
      parent.add(mesh);
      return mesh;
    }
    if (mascot) {
      const rig = window.RuiangCharacter.build({root,joints,group,oval,material,kind,level,
        makeBicycle:() => makeBicycle(group,oval,ring,material,true),
      });
      pose(rig,'idle',0);
      return rig;
    }
    const torso = group('Torso');
    const pelvis = group('Pelvis');
    const head = group('Head');
    const shirt = female ? colors.red : colors.white;
    oval(torso,[0,0,0],[.225,.30,.135],shirt);
    oval(pelvis,[0,0,0],[.19,.14,.13],colors.red);
    for (const side of [-1,1]) oval(torso,[side*.20,-.03,.01],[.018,.25,.115],colors.red);
    oval(torso,[0,.08,.133],[.06,.016,.008],female ? colors.white : colors.red);
    oval(torso,[0,-.20,.01],[.22,.05,.137],shirt);
    oval(head,[0,-.19,-.005],[.063,.08,.06],colors.skin);
    oval(head,[0,0,0],[.128,.175,.125],colors.skin);
    oval(head,[0,-.085,.026],[.105,.095,.09],colors.skin);
    oval(head,[0,.115,-.02],[.133,.075,.123],colors.ink);
    oval(head,[0,.065,-.085],[.125,.09,.055],colors.ink);
    oval(head,[0,-.005,.13],[.024,.04,.035],colors.skin);
    for (const side of [-1,1]) {
      oval(head,[side*.135,-.005,0],[.024,.045,.02],colors.skin);
      oval(head,[side*.049,.035,.115],[.025,.010,.008],colors.ink);
      oval(head,[side*.05,.065,.112],[.030,.007,.008],colors.ink);
    }
    oval(head,[0,-.074,.112],[.035,.006,.006],0x9d6660);
    if (female) {
      oval(head,[0,.08,-.15],[.075,.12,.07],colors.ink);
      oval(head,[0,-.045,-.20],[.05,.17,.05],colors.ink);
    }
    const limbs = {};
    for (const side of [-1,1]) {
      const prefix = side < 0 ? 'Left' : 'Right';
      const upperArm = group(prefix+'UpperArm');
      const forearm = group(prefix+'Forearm');
      const thigh = group(prefix+'Thigh');
      const shin = group(prefix+'Shin');
      const foot = group(prefix+'Foot');
      const elbowJoint = group(prefix+'Elbow');
      const kneeJoint = group(prefix+'Knee');
      oval(elbowJoint,[0,0,0],mascot ? [.05,.05,.05] : [.044,.044,.044],colors.skin);
      oval(kneeJoint,[0,0,0],mascot ? [.075,.075,.075] : [.066,.066,.066],mascot ? shirt : colors.skin);
      oval(upperArm,[0,.34,0],[1,.66,1],shirt);
      oval(upperArm,[0,-.42,0],[.83,.58,.83],colors.skin);
      oval(forearm,[0,0,0],[1,1,1],colors.skin);
      oval(forearm,[0,-.68,0],[1.02,.18,1.02],colors.white);
      oval(forearm,[0,-1.10,.02],[.95,.31,.65],colors.skin);
      oval(thigh,[0,mascot ? 0 : .35,0],[1,mascot ? 1 : .65,1],mascot ? shirt : colors.red);
      if (!mascot) oval(thigh,[0,-.45,0],[.91,.60,.91],colors.skin);
      oval(shin,[0,0,0],[1,1,1],mascot ? shirt : colors.skin);
      if (!mascot) oval(shin,[0,-.75,0],[1.04,.25,1.04],colors.white);
      oval(foot,[0,0,.055],mascot ? [.105,.065,.155] : [.075,.05,.145],mascot ? colors.ink : colors.white);
      oval(foot,[0,-.037,.06],mascot ? [.108,.022,.16] : [.078,.017,.15],colors.white);
      limbs[side] = {upperArm,forearm,thigh,shin,foot,elbowJoint,kneeJoint};
    }
    const ball = new THREE.Mesh(sphere,material(0xd77a3e));
    ball.scale.setScalar(.14);
    ball.name = 'Basketball';
    root.add(ball);
    joints.push(ball);
    const bicycle = makeBicycle(group,oval,ring,material,mascot);
    const helmet = group('Helmet',head);
    if (!mascot) {
      oval(helmet,[0,.15,-.01],[.151,.09,.153],colors.red);
      for(const x of [-.08,0,.08]) oval(helmet,[x,.20,-.005],[.018,.038,.128],colors.white);
    }
    const rig = {root,head,torso,pelvis,limbs,ball,bicycle,helmet,joints,mascot,kind,level};
    pose(rig,'idle',0);
    return rig;
  }

  function align(node,start,end,radius) {
    const direction = end.clone().sub(start);
    node.position.copy(start).add(end).multiplyScalar(.5);
    node.quaternion.setFromUnitVectors(unitY,direction.clone().normalize());
    node.scale.set(radius,direction.length()/2,radius);
  }

  function bend(start,end,first,second,pole) {
    const axis = end.clone().sub(start);
    const distance = Math.max(.0001,axis.length());
    axis.normalize();
    const reach = Math.min(distance,first+second-.001);
    const along = (first*first-second*second+reach*reach)/(2*reach);
    const height = Math.sqrt(Math.max(.0001,first*first-along*along));
    const perpendicular = pole.clone().addScaledVector(axis,-pole.dot(axis)).normalize();
    return start.clone().addScaledVector(axis,along).addScaledVector(perpendicular,height);
  }

  function makeBicycle(group,oval,ring,material,toy) {
    const frame = group('Bicycle');
    const radius = toy ? .28 : .36;
    const span = toy ? .57 : .74;
    const bottom = toy ? .35 : .45;
    const crankRadius = toy ? .13 : .17;
    const rear = v(0,radius,-span);
    const front = v(0,radius,span);
    const crank = v(0,bottom,0);
    const seat = v(0,toy ? .54 : 1.07,toy ? -.12 : -.25);
    const stem = v(0,toy ? .81 : 1.07,span-.08);
    const frameColor = toy ? 0xe77a30 : colors.red;
    const connect = (a,b,width,color) => {
      const tube = oval(frame,[0,0,0],[1,1,1],color);
      align(tube,a,b,width);
    };
    for (const [a,b] of [[rear,seat],[seat,crank],[rear,crank],[seat,stem],[crank,stem],[stem,front]]) connect(a,b,.023,frameColor);
    const wheels = [];
    for (const point of [rear,front]) {
      const wheel = group(wheels.length ? 'FrontWheel' : 'RearWheel',frame);
      wheel.position.copy(point);
      ring(wheel,[0,0,0],radius,.027,colors.ink,[0,Math.PI/2,0]);
      ring(wheel,[0,0,0],radius-.035,.009,0xc5c5bd,[0,Math.PI/2,0]);
      for(let i=0;i<16;i++) {
        const angle = i/16*TAU;
        const spoke = oval(wheel,[0,0,0],[1,1,1],0xb8b7b0);
        align(spoke,v(0,0,0),v(0,Math.cos(angle)*(radius-.04),Math.sin(angle)*(radius-.04)),.0035);
      }
      wheels.push(wheel);
    }
    oval(frame,[0,seat.y+.015,seat.z],[.14,.035,.12],colors.ink);
    connect(stem,v(0,toy ? .92 : 1.24,span-.02),.022,0x4a514e);
    connect(v(-.23,toy ? .92 : 1.24,span-.02),v(.23,toy ? .92 : 1.24,span-.02),.022,0x4a514e);
    const pedal = group('Crank',frame);
    pedal.position.copy(crank);
    const pads = {};
    for(const side of [-1,1]) {
      const beam = oval(pedal,[0,0,0],[1,1,1],0x8f9390);
      const direction = side < 0 ? 1 : -1;
      align(beam,v(side*.15,0,0),v(side*.15,direction*crankRadius,0),.014);
      const pad = group(side < 0 ? 'LeftPedal' : 'RightPedal',frame);
      oval(pad,[0,0,0],[.07,.014,.05],colors.ink);
      pads[side] = pad;
    }
    ring(frame,[.05,bottom,0],crankRadius*.60,.009,0x797e78,[0,Math.PI/2,0]);
    connect(v(.05,bottom+crankRadius*.55,0),v(.05,radius+.045,-span),.006,0x6e746e);
    connect(v(.05,bottom-crankRadius*.55,0),v(.05,radius-.045,-span),.006,0x6e746e);
    return {frame,wheels,pedal,pads,radius,span,bottom,crankRadius};
  }

  function pose(rig,move,time) {
    const {mascot,head,torso,pelvis,limbs,ball,bicycle} = rig;
    const cycle = move === 'cycle';
    const duration = MOTION_SECONDS[move] || 4.8;
    const unit = ((time%duration)+duration)%duration/duration;
    const phase = unit*TAU;
    const depth = Math.min(ease(unit/.42),1-ease((unit-.55)/.38));
    const breath = Math.sin(phase)*.003;
    const hip = v(0,mascot ? .55 : .98,0);
    const shoulder = v(0,mascot ? 1.03 : 1.47,0);
    let lean = 0;
    const crouch = move === 'jump' ? Math.max(pulseWindow(unit,0,.22),pulseWindow(unit,.72,.96)) : 0;
    if (move === 'squat' || crouch) {
      const bendAmount = move === 'squat' ? depth : crouch*.45;
      hip.y -= bendAmount*(mascot ? .13 : .33);
      hip.z -= bendAmount*.14;
      shoulder.y -= bendAmount*(mascot ? .14 : .36);
      shoulder.z += bendAmount*.16;
      lean = bendAmount*.28;
    }
    if (move === 'march') {
      hip.x = Math.sin(phase)*.007;
      shoulder.x = -Math.sin(phase)*.004;
    }
    if (cycle) {
      hip.set(0,mascot ? .63 : 1.19,mascot ? -.12 : -.25);
      shoulder.set(0,mascot ? 1.07 : 1.53,mascot ? .18 : .30);
      lean = Math.atan2(shoulder.z-hip.z,shoulder.y-hip.y);
    }
    if (move === 'pushup') {
      shoulder.set(0,.56-depth*.22,.65);
      hip.lerpVectors(v(0,.085,-.94),shoulder,.52);
      lean = Math.atan2(shoulder.z-hip.z,shoulder.y-hip.y);
    }
    if (move === 'dog') {
      hip.set(0,.835+breath,-.16);
      shoulder.set(0,.49+breath*.5,.38);
      lean = Math.atan2(shoulder.z-hip.z,shoulder.y-hip.y);
    }
    if (move === 'idle' || move === 'neck' || move === 'shoulder') shoulder.y += breath;
    torso.position.copy(shoulder).add(hip).multiplyScalar(.5);
    if (mascot) torso.position.y += .075;
    torso.rotation.set(lean,0,0);
    torso.scale.y = move === 'idle' ? 1+Math.sin(phase)*.003 : 1;
    pelvis.position.copy(hip);
    const headOffset = move === 'dog' ? v(0,-.07,.15) : move === 'pushup' ? v(0,.05,.23) : v(0,mascot ? .10 : .27,cycle ? .10 : .015);
    head.position.copy(shoulder).add(headOffset);
    head.rotation.set(move === 'dog' ? .55 : move === 'pushup' ? .60 : cycle ? -.12 : move === 'wave' ? -.025*Math.sin(phase)**2 : 0,0,move === 'neck' ? Math.sin(phase)*.20 : 0);
    bicycle.frame.visible = cycle;
    bicycle.frame.scale.setScalar(cycle ? 1 : .0001);
    rig.helmet.visible = cycle && !mascot;
    rig.helmet.scale.setScalar(cycle ? 1 : .0001);
    ball.visible = move === 'shot';
    ball.scale.setScalar(move === 'shot' ? .14 : .0001);
    bicycle.pedal.rotation.x = phase;
    bicycle.wheels.forEach(wheel => { wheel.rotation.x = phase*1.8; });

    const greeting = ease(unit/.22)*(1-ease((unit-.75)/.25));
    for(const side of [-1,1]) {
      const limb = limbs[side];
      const legPhase = phase+(side < 0 ? 0 : Math.PI);
      const step = Math.sin(legPhase);
      const lift = Math.max(0,step)**2;
      const start = hip.clone().add(v(side*(mascot ? .15 : .135),0,0));
      const ankle = v(side*(mascot ? .15 : .18),mascot ? .08 : .075,.015);
      let anklePitch = 0;
      if (move === 'march') {
        ankle.y += lift*(mascot ? .11 : .25);
        ankle.z += lift*(mascot ? .09 : .18);
        anklePitch = -.07*lift;
      }
      if (move === 'pushup' || move === 'dog') ankle.z = move === 'pushup' ? -.94 : -.66;
      if (cycle) {
        const pad = bicycle.pads[side];
        anklePitch = .08*Math.sin(legPhase+.35);
        pad.position.set(side*.20,bicycle.bottom+Math.cos(legPhase)*bicycle.crankRadius,Math.sin(legPhase)*bicycle.crankRadius);
        pad.rotation.x = anklePitch;
        const sole = mascot ? .070 : .054;
        const ballOfFoot = mascot ? .055 : .105;
        const contactOffset = v(0,-sole,ballOfFoot).applyAxisAngle(v(1,0,0),anklePitch);
        ankle.copy(pad.position).add(v(0,.014,0)).sub(contactOffset);
      }
      const knee = bend(start,ankle,mascot ? .24 : .46,mascot ? .23 : .46,v(0,0,1));
      align(limb.thigh,start,knee,mascot ? .145 : .09);
      align(limb.shin,knee,ankle,mascot ? .135 : .056);
      limb.kneeJoint.position.copy(knee);
      limb.foot.position.copy(ankle);
      limb.foot.rotation.x = cycle || move === 'march' ? anklePitch : move === 'pushup' ? -.9 : 0;
      const armRoot = shoulder.clone().add(v(side*(mascot ? .29 : .205),-.015,0));
      const hand = shoulder.clone().add(v(side*(mascot ? .35 : .27),mascot ? -.53 : -.50,.04));
      let elbowPole = v(side,0,-.2);
      if (move === 'march') {
        hand.y += .08;
        hand.z = -step*(mascot ? .12 : .22);
      }
      if (move === 'squat') hand.set(side*.08,shoulder.y-.14,shoulder.z+(mascot ? .34 : .44));
      if (cycle) {
        hand.set(side*.23,mascot ? .92 : 1.24,bicycle.span-.02);
        elbowPole = v(0,-1,-.4);
      }
      if (move === 'pushup' || move === 'dog') {
        hand.set(side*.27,.075,move === 'pushup' ? .87 : .78);
        elbowPole = v(side,0,-.5);
      }
      if (move === 'shoulder') hand.set(side*-.03,shoulder.y-.08,.43+.08*(1-Math.cos(phase))*.5);
      if (move === 'shot') {
        hand.set(side*.085,shoulder.y+.08+depth*.25,.34-depth*.12);
        ball.position.copy(hand).add(v(-side*.085,.14,.025));
      }
      if (move === 'wave' && side === -1) hand.lerp(v(-.44+Math.sin(phase*3)*.045,shoulder.y+.30,.09),greeting);
      if (move === 'cheer' || move === 'jump') {
        const raised = move === 'cheer' ? greeting : ease(unit/.25)*(1-ease((unit-.7)/.3));
        hand.lerp(v(side*.40,shoulder.y+.30,.05),raised);
      }
      const elbow = bend(armRoot,hand,mascot ? .24 : .30,mascot ? .31 : .28,elbowPole);
      align(limb.upperArm,armRoot,elbow,mascot ? .085 : .059);
      align(limb.forearm,elbow,hand,mascot ? .085 : .043);
      limb.elbowJoint.position.copy(elbow);
      rig.skins?.[side].arm.update(armRoot,elbow,hand);
      rig.skins?.[side].leg.update(start,knee,ankle);
    }
    rig.root.position.y = move === 'jump' ? pulseWindow(unit,.22,.72)*.16 : 0;
    rig.root.rotation.z = move === 'cheer' ? Math.sin(phase)*greeting*.025 : 0;
  }

  function disposeObject(object) {
    const geometries = new Set();
    const materials = new Set();
    object.traverse(node => {
      if (node.geometry) geometries.add(node.geometry);
      for (const material of (Array.isArray(node.material) ? node.material : [node.material])) if (material) materials.add(material);
    });
    geometries.forEach(geometry => geometry.dispose());
    materials.forEach(material => material.dispose());
  }

  class Stage {
    constructor(host,playback) {
      this.host = host;
      this.playback = playback;
      this.key = host.dataset.modelKey || [host.dataset.model,host.dataset.level,host.dataset.move,host.className].join(':');
      const saved = savedPositions.get(this.key);
      const sameMotion = saved?.move === host.dataset.move;
      this.time = sameMotion ? saved.time : 0;
      this.resumeTime = sameMotion ? saved.localTime : undefined;
      if (host.dataset.startTime) {
        this.time = Number(host.dataset.startTime);
        this.resumeTime = this.time;
      }
      this.renderedTime = this.time;
      this.speed = 1;
      this.yaw = saved?.yaw ?? (host.dataset.move === 'cycle' ? 1.03 : ['mascot','bike'].includes(host.dataset.model) ? .08 : .24);
      this.drag = null;
      this.cameraAngle = saved?.cameraAngle ?? this.yaw;
      this.cameraMark = performance.now();
      const kind = host.dataset.model;
      const level = Number(host.dataset.level) || 5;
      const loadCharacter = ['mascot','bike'].includes(kind) && location.protocol !== 'file:' && !host.dataset.procedural;
      this.rig = loadCharacter ? {root:new THREE.Group(),kind,level,mascot:true,pending:true} : makeRig(kind,level);
      this.scene = new THREE.Scene();
      this.renderer = new THREE.WebGLRenderer({canvas:host.querySelector('canvas'),alpha:true,antialias:true,preserveDrawingBuffer:true});
      this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.65));
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.35;
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.camera = this.rig.mascot ? new THREE.OrthographicCamera(-1.32,1.32,1.32,-1.32,.1,25) : new THREE.PerspectiveCamera(33,1,.1,25);
      this.scene.add(new THREE.HemisphereLight(0xfffaf1,0x9d9a8d,2.6));
      const key = new THREE.DirectionalLight(0xfff5df,3.4);
      key.position.set(-3,5,4);
      key.castShadow = true;
      key.shadow.mapSize.set(512,512);
      key.shadow.camera.left = -2;
      key.shadow.camera.right = 2;
      key.shadow.camera.top = 3;
      key.shadow.camera.bottom = -1;
      this.scene.add(key);
      const rim = new THREE.DirectionalLight(0xffffff,2);
      rim.position.set(3,3,-3);
      this.scene.add(rim,this.rig.root);
      const floor = new THREE.Mesh(new THREE.CircleGeometry(2.4,48),new THREE.ShadowMaterial({opacity:.07}));
      floor.rotation.x = -Math.PI/2;
      floor.position.y = .008;
      floor.receiveShadow = true;
      this.scene.add(floor);
      this.controller = new AbortController();
      const options = {signal:this.controller.signal};
      host.addEventListener('pointerdown',event => {
        if (event.button !== 0) return;
        this.drag = {x:event.clientX,yaw:this.yaw};
        host.setPointerCapture(event.pointerId);
      },options);
      host.addEventListener('pointermove',event => {
        if (this.drag) this.yaw = this.drag.yaw+(event.clientX-this.drag.x)*.012;
      },options);
      host.addEventListener('pointerup',() => { this.drag = null; },options);
      host.addEventListener('pointercancel',() => { this.drag = null; },options);
      host.addEventListener('lostpointercapture',() => { this.drag = null; },options);
      host.addEventListener('keydown',event => {
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          event.preventDefault();
          this.yaw += event.key === 'ArrowLeft' ? -.3 : .3;
        }
      },options);
      this.visible = true;
      this.observer = new IntersectionObserver(entries => { this.visible = entries[0].isIntersecting; });
      this.observer.observe(host);
      this.resize = new ResizeObserver(() => {
        const {width,height} = host.getBoundingClientRect();
        if (!width || !height) return;
        this.renderer.setSize(width,height,false);
        this.camera.aspect = width/height;
        if (this.camera.isOrthographicCamera) {
          this.camera.left = -1.32*width/height;
          this.camera.right = 1.32*width/height;
        }
        this.camera.updateProjectionMatrix();
        this.draw();
      });
      this.resize.observe(host);
      this.previous = performance.now();
      this.renderer.setAnimationLoop(now => {
        const elapsed = Math.min((now-this.previous)/1000,.1);
        this.previous = now;
        if (!this.visible || document.hidden) return;
        const control = this.playback(this.host);
        this.speed = THREE.MathUtils.lerp(this.speed,control.speed,1-Math.exp(-elapsed/.18));
        if (control.playing) this.time += elapsed*this.speed;
        this.move = control.move || this.host.dataset.move || 'idle';
        this.angle = control.angle;
        this.draw(control.frame);
      });
      if (!this.rig.pending) host.classList.add('model-ready');
      host.dataset.ready = 'true';
      instances.add(this);
      if (location.protocol !== 'file:' && !host.dataset.procedural) void this.loadModel();
    }
    async loadModel() {
      const kind = this.rig.kind;
      const filename = kind === 'mascot' ? 'ruiang-stage-'+this.rig.level : kind === 'bike' ? 'ruiang-bike' : 'coach-'+kind;
      try {
        const loaded = await new GLTFLoader().loadAsync('assets/models/'+filename+'.glb');
        if (this.destroyed) {
          disposeObject(loaded.scene);
          return;
        }
        this.scene.remove(this.rig.root);
        disposeObject(this.rig.root);
        this.model = loaded.scene;
        if (this.rig.mascot) {
          this.model.traverse(node => {
            const materials = Array.isArray(node.material) ? node.material : [node.material];
            for(const material of materials) if (material?.isMeshBasicMaterial) material.toneMapped = false;
          });
        }
        this.scene.add(this.model);
        this.mixer = new THREE.AnimationMixer(this.model);
        this.clips = loaded.animations;
        this.rig.pending = false;
        this.host.classList.add('model-ready');
        this.host.dataset.asset = filename+'.glb';
      } catch {
        if (this.destroyed) return;
        if (this.rig.pending) {
          this.scene.remove(this.rig.root);
          this.rig = makeRig(kind,Number(this.host.dataset.level) || 5);
          this.scene.add(this.rig.root);
          this.host.classList.add('model-ready');
        }
      }
    }
    draw(seek) {
      const move = this.move || this.host.dataset.move || 'idle';
      if (this.mixer) {
        const clip = this.clips.find(clip => clip.name === move);
        if (clip && this.clip !== clip) {
          const next = this.mixer.clipAction(clip).reset().setEffectiveWeight(1).play();
          if (this.action) this.action.crossFadeTo(next,.42,false);
          else next.time = (this.resumeTime ?? this.time)%clip.duration;
          this.action = next;
          this.clip = clip;
        }
        if (Number.isFinite(seek)) {
          if (seek !== this.lastSeek) {
            this.mixer.stopAllAction();
            this.action.reset().setEffectiveWeight(1).play();
            this.action.time = Math.min(seek,this.clip.duration-.0001);
          }
          this.mixer.update(0);
        } else {
          this.mixer.update(Math.max(0,this.time-this.renderedTime));
        }
      } else if (!this.rig.pending) {
        pose(this.rig,move,Number.isFinite(seek) ? seek : this.time);
      }
      this.lastSeek = seek;
      this.renderedTime = this.time;
      const ground = ['pushup','dog'].includes(this.move);
      const target = ground ? .65 : this.rig.mascot ? 1.23 : 1.0;
      const radius = this.rig.mascot ? 4.8 : 4.5;
      const now = performance.now();
      const elapsed = Math.min((now-this.cameraMark)/1000,.1);
      this.cameraMark = now;
      const targetAngle = this.angle === 'side' ? 1.38 : this.yaw;
      const rotation = Math.atan2(Math.sin(targetAngle-this.cameraAngle),Math.cos(targetAngle-this.cameraAngle));
      this.cameraAngle += rotation*(1-Math.exp(-elapsed/.14));
      const angle = this.cameraAngle;
      this.camera.position.set(Math.sin(angle)*radius,target+(this.rig.mascot ? .02 : .40),Math.cos(angle)*radius);
      this.camera.lookAt(0,target,0);
      this.renderer.render(this.scene,this.camera);
    }
    destroy() {
      savedPositions.set(this.key,{time:this.time,yaw:this.yaw,cameraAngle:this.cameraAngle,localTime:this.action?.time,move:this.move || this.host.dataset.move});
      this.destroyed = true;
      this.renderer.setAnimationLoop(null);
      this.controller.abort();
      this.resize.disconnect();
      this.observer.disconnect();
      disposeObject(this.scene);
      this.mixer?.stopAllAction();
      this.renderer.dispose();
      this.renderer.forceContextLoss();
      instances.delete(this);
    }
  }

  async function exportGLB(kind,level = 5) {
    if (kind === 'mascot' || kind === 'bike') await window.RuiangCharacter.ready;
    const rig = makeRig(kind,level);
    const motions = kind === 'mascot' ? ['idle','wave','jump','cheer','cycle'] : kind === 'bike' ? ['cycle'] : ['march','squat','pushup','dog','neck','shoulder','shot','cycle'];
    const clips = motions.map(move => {
      const times = [];
      const tracks = new Map(rig.joints.map(node => [node,{position:[],quaternion:[],scale:[]} ]));
      const duration = MOTION_SECONDS[move] || 4.8;
      for(let i=0;i<=96;i++) {
        const time = i/96*duration;
        times.push(time);
        pose(rig,move,time);
        for(const [node,values] of tracks) {
          values.position.push(...node.position.toArray());
          values.quaternion.push(...node.quaternion.toArray());
          values.scale.push(...node.scale.toArray());
        }
      }
      const keyframes = [];
      for(const [node,values] of tracks) {
        keyframes.push(new THREE.VectorKeyframeTrack(node.name+'.position',times,values.position));
        keyframes.push(new THREE.QuaternionKeyframeTrack(node.name+'.quaternion',times,values.quaternion));
        keyframes.push(new THREE.VectorKeyframeTrack(node.name+'.scale',times,values.scale));
      }
      return new THREE.AnimationClip(move,duration,keyframes);
    });
    pose(rig,motions[0],0);
    const result = await new GLTFExporter().parseAsync(rig.root,{binary:true,animations:clips,onlyVisible:false});
    disposeObject(rig.root);
    return result;
  }

  window.RuiangMotion = {
    detach(container) {
      const retained = [...instances].filter(instance => container.contains(instance.host));
      for(const instance of retained) instance.host.remove();
      return retained;
    },
    mount(container,playback,retained = []) {
      for (const instance of [...instances]) if (!instance.host.isConnected && !retained.includes(instance)) instance.destroy();
      for(const host of container.querySelectorAll('[data-model]')) {
        const previous = retained.find(instance => !instance.destroyed && instance.key === host.dataset.modelKey);
        if (previous) {
          previous.host.dataset.move = host.dataset.move;
          previous.host.className = host.className+(previous.rig.pending ? '' : ' model-ready');
          previous.playback = playback;
          host.replaceWith(previous.host);
          retained = retained.filter(instance => instance !== previous);
          continue;
        }
        if (host.dataset.ready) continue;
        host.dataset.ready = 'loading';
        const ready = ['mascot','bike'].includes(host.dataset.model) ? window.RuiangCharacter.ready : Promise.resolve();
        void ready.then(() => {
          if (host.isConnected) new Stage(host,playback);
        }).catch(error => {
          host.classList.add('model-failed');
          host.dataset.ready = 'failed';
          console.warn('3D 场景暂时无法加载',error.message);
        });
      }
      for(const instance of retained) instance.destroy();
    },
    clear() { for(const instance of [...instances]) instance.destroy(); },
    release(container) { for(const instance of [...instances]) if (container.contains(instance.host)) instance.destroy(); },
    exportGLB,
    durations:MOTION_SECONDS,
    setFrame(time) { for(const instance of instances) { instance.time = time; instance.draw(time); } },
    get stages() { return [...instances]; },
  };
})();
