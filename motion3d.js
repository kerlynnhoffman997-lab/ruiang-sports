/* Local articulated models. All positions use metres, with +Z facing forward. */
(() => {
  'use strict';
  const { THREE, GLTFExporter, GLTFLoader } = window.Ruiang3DEngine;
  const TAU = Math.PI * 2;
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
    const torso = group('Torso');
    const pelvis = group('Pelvis');
    const head = group('Head');
    const shirt = mascot && level >= 8 && level < 12 ? colors.red : female ? colors.red : colors.white;
    oval(torso,[0,0,0],mascot ? [.225,.23,.15] : [.225,.30,.135],shirt);
    oval(pelvis,[0,0,0],mascot ? [.205,.12,.14] : [.19,.14,.13],mascot ? shirt : colors.red);
    for (const side of [-1,1]) {
      oval(torso,[side*.20,-.03,.01],[.018,mascot ? .17 : .25,.115],level >= 16 && mascot ? colors.gold : colors.red);
    }
    if (mascot) {
      oval(torso,[0,.035,.145],[.19,.013,.009],level >= 16 ? colors.gold : colors.red);
      oval(torso,[0,.005,.15],[.19,.006,.009],level >= 16 ? colors.gold : colors.red);
      if (level >= 8) for (const y of [-.1,0,.1]) {
        oval(torso,[0,y,.16],[.018,.018,.01],colors.gold,.6);
        oval(torso,[.025,y,.16],[.04,.008,.007],colors.gold,.6);
      }
    } else {
      oval(head,[0,-.19,-.005],[.063,.08,.06],colors.skin);
      oval(torso,[0,.08,.133],[.06,.016,.008],female ? colors.white : colors.red);
      oval(torso,[0,-.20,.01],[.22,.05,.137],shirt);
    }

    if (mascot) {
      oval(head,[0,.04,-.02],[.53,.46,.40],colors.white);
      oval(head,[0,-.015,.22],[.405,.355,.205],colors.skin);
      oval(head,[0,.22,.30],[.345,.115,.06],colors.ink);
      for (let i=0;i<7;i++) {
        oval(head,[(i-3)*.075,.22-Math.abs(i-3)*.012,.34],[.055,.06,.025],colors.ink);
      }
      for (const side of [-1,1]) {
        oval(head,[side*.16,.015,.40],[.09,.104,.037],colors.ink);
        oval(head,[side*.16-.022,.052,.436],[.027,.033,.012],0xffffff);
        oval(head,[side*.285,-.10,.363],[.068,.043,.014],0xf0a393);
        oval(head,[side*.165,.15,.389],[.083,.021,.015],colors.ink);
      }
      oval(head,[0,-.16,.408],[.10,.065,.018],0x8e302c);
      oval(head,[0,-.185,.424],[.057,.025,.008],0xef887e);
      const hat = level >= 16 ? 0xf4d789 : colors.white;
      oval(head,[0,.51,-.005],[.55,.31,.39],hat);
      for (const side of [-1,1]) {
        oval(head,[side*.435,.76,-.02],[.205,.215,.15],colors.red);
        oval(head,[side*.435,.77,.115],[.13,.135,.055],hat);
        oval(head,[side*.26,.54,.31],[.205,.195,.09],colors.green);
        oval(head,[side*.26,.54,.36],[.169,.16,.075],0xfff6dc);
        oval(head,[side*.26,.54,.404],[.133,.13,.06],0xd77a35);
        oval(head,[side*.26,.54,.454],[.103,.103,.034],colors.ink);
        oval(head,[side*.28,.585,.48],[.035,.042,.013],0xffffff);
        for (let i=0;i<7;i++) {
          const angle = i/6*Math.PI;
          oval(head,[side*.26+Math.cos(angle)*.18,.58+Math.sin(angle)*.16,.395],[.045,.05,.045],hat);
        }
        ring(head,[side*.48,.26,.15],.065,.016,colors.gold,[0,side*.6,0]);
        oval(head,[side*.49,.25,.19],[.028,.028,.018],colors.gold,.65);
        oval(head,[side*.14,.425,.46],[.082,.077,.065],0xeb7437);
      }
      oval(head,[0,.48,.435],[.11,.095,.09],colors.green);
      ring(head,[0,.69,.371],.115,.023,colors.gold);
      oval(head,[0,.69,.382],[.086,.086,.034],level >= 16 ? 0xffd965 : colors.green,.4);
      for (let i=0;i<17;i++) {
        const x = (i-8)*.059;
        oval(head,[x,.295+Math.sin(i/16*Math.PI)*.045,.337+Math.sin(i/16*Math.PI)*.06],[.06,.055,.055],hat);
      }
      const crown = new THREE.Mesh(new THREE.ConeGeometry(.115,.25,20),material(colors.red));
      crown.position.set(0,.895,0);
      head.add(crown);
      ring(head,[0,.80,0],.14,.022,colors.gold,[Math.PI/2,0,0]);
      ring(head,[0,.89,0],.08,.018,colors.white,[Math.PI/2,0,0]);
      oval(head,[0,1.03,0],[.049,.042,.049],colors.gold,.55);
      if (level >= 5) {
        oval(head,[.36,-.22,.11],[.055,.06,.055],colors.gold,.7);
        ring(head,[.36,-.18,.11],.032,.012,colors.gold,[Math.PI/2,0,0]);
      }
      if (level >= 12) {
        const cape = new THREE.Mesh(new THREE.ConeGeometry(.40,.68,28,1,true,Math.PI*.20,Math.PI*1.6),material(colors.red));
        cape.position.set(0,-.08,-.06);
        cape.rotation.z = Math.PI;
        torso.add(cape);
        for (const side of [-1,1]) oval(torso,[side*.16,.13,.13],[.046,.046,.018],colors.gold,.6);
      }
    } else {
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
    const bottom = toy ? .36 : .45;
    const rear = v(0,radius,-span);
    const front = v(0,radius,span);
    const crank = v(0,bottom,0);
    const seat = v(0,toy ? .71 : 1.16,-.25);
    const stem = v(0,toy ? .81 : 1.07,span-.08);
    const connect = (a,b,width,color) => {
      const tube = oval(frame,[0,0,0],[1,1,1],color);
      align(tube,a,b,width);
    };
    for (const [a,b] of [[rear,seat],[seat,crank],[rear,crank],[seat,stem],[crank,stem],[stem,front]]) connect(a,b,.026,colors.red);
    const wheels = [];
    for (const point of [rear,front]) {
      const wheel = group(wheels.length ? 'FrontWheel' : 'RearWheel',frame);
      wheel.position.copy(point);
      ring(wheel,[0,0,0],radius,.028,colors.ink,[0,Math.PI/2,0]);
      ring(wheel,[0,0,0],radius-.035,.009,0xc5c5bd,[0,Math.PI/2,0]);
      for(let i=0;i<12;i++) {
        const angle = i/12*TAU;
        const spoke = oval(wheel,[0,0,0],[1,1,1],0xb8b7b0);
        align(spoke,v(0,0,0),v(0,Math.cos(angle)*(radius-.04),Math.sin(angle)*(radius-.04)),.004);
      }
      wheels.push(wheel);
    }
    oval(frame,[0,seat.y+.015,seat.z],[.14,.035,.12],colors.ink);
    connect(stem,v(0,toy ? .90 : 1.24,span-.02),.022,0x4a514e);
    connect(v(-.23,toy ? .90 : 1.24,span-.02),v(.23,toy ? .90 : 1.24,span-.02),.022,0x4a514e);
    const pedal = group('Crank',frame);
    pedal.position.copy(crank);
    for(const side of [-1,1]) {
      const beam = oval(pedal,[0,0,0],[1,1,1],0x8f9390);
      align(beam,v(side*.13,0,0),v(side*.13,side*.16,0),.015);
      oval(pedal,[side*.16,side*.16,0],[.06,.015,.035],colors.ink);
    }
    return {frame,wheels,pedal,radius,span,bottom};
  }

  function pose(rig,move,time) {
    const {mascot,head,torso,pelvis,limbs,ball,bicycle} = rig;
    const cycle = move === 'cycle';
    const phase = time*TAU*(cycle ? 1.3 : .42);
    const depth = (1-Math.cos(phase))*.5;
    const hip = v(0,mascot ? .55 : .98,0);
    const shoulder = v(0,mascot ? .94 : 1.47,0);
    let lean = 0;
    if (move === 'squat') {
      hip.y -= depth*(mascot ? .15 : .35);
      hip.z -= depth*.14;
      shoulder.y -= depth*(mascot ? .15 : .38);
      shoulder.z += depth*.18;
      lean = depth*.26;
    }
    if (cycle) {
      hip.set(0,mascot ? .71 : 1.16,-.25);
      shoulder.set(0,mascot ? 1.00 : 1.52,mascot ? .20 : .30);
      lean = mascot ? .42 : .55;
    }
    if (move === 'pushup') {
      hip.set(0,.48-depth*.20,-.10);
      shoulder.set(0,.54-depth*.21,.68);
      lean = 1.48;
    }
    if (move === 'dog') {
      hip.set(0,.90+depth*.26,-.2);
      shoulder.set(0,.71-depth*.07,.44);
      lean = 1.8+depth*.4;
    }
    torso.position.copy(shoulder).add(hip).multiplyScalar(.5);
    torso.rotation.set(lean,0,0);
    pelvis.position.copy(hip);
    const headOffset = move === 'dog' ? v(0,-.1,.20) : move === 'pushup' ? v(0,.05,.26) : v(0,mascot ? .35 : .27,cycle ? .13 : .015);
    head.position.copy(shoulder).add(headOffset);
    head.rotation.set(move === 'dog' ? .65 : move === 'pushup' ? .65 : cycle ? -.12 : 0,0,move === 'neck' ? Math.sin(phase*.5)*.25 : 0);
    bicycle.frame.visible = cycle;
    bicycle.frame.scale.setScalar(cycle ? 1 : .0001);
    rig.helmet.visible = cycle && !mascot;
    rig.helmet.scale.setScalar(cycle ? 1 : .0001);
    ball.visible = move === 'shot';
    ball.scale.setScalar(move === 'shot' ? .14 : .0001);
    bicycle.pedal.rotation.x = phase;
    bicycle.wheels.forEach(wheel => { wheel.rotation.x = phase*1.7; });

    for(const side of [-1,1]) {
      const limb = limbs[side];
      const offset = side < 0 ? 0 : Math.PI;
      const step = Math.sin(phase+offset);
      const start = hip.clone().add(v(side*(mascot ? .105 : .135),0,0));
      const ankle = v(side*(mascot ? .12 : .18),.075,.015);
      if (move === 'march') {
        ankle.y += Math.max(0,step)*(mascot ? .17 : .35);
        ankle.z += Math.max(0,step)*(mascot ? .15 : .28);
      }
      if (move === 'pushup' || move === 'dog') ankle.z = move === 'pushup' ? -.96 : -.85;
      if (cycle) {
        ankle.set(side*.16,bicycle.bottom+Math.cos(phase+offset)*.16,Math.sin(phase+offset)*.16);
      }
      const knee = bend(start,ankle,mascot ? .265 : .46,mascot ? .265 : .46,v(0,0,1));
      align(limb.thigh,start,knee,mascot ? .085 : .09);
      align(limb.shin,knee,ankle,mascot ? .069 : .056);
      limb.kneeJoint.position.copy(knee);
      limb.foot.position.copy(ankle);
      limb.foot.rotation.x = cycle ? .10*Math.sin(phase+offset) : move === 'pushup' ? -.9 : 0;
      const armRoot = shoulder.clone().add(v(side*(mascot ? .20 : .205),-.015,0));
      const hand = shoulder.clone().add(v(side*(mascot ? .27 : .27),mascot ? -.32 : -.50,.04));
      let elbowPole = v(side,0,-.2);
      if (move === 'march') {
        hand.y += .10;
        hand.z = step*(mascot ? .15 : .28);
      }
      if (move === 'squat') hand.set(side*.07,shoulder.y-.13,shoulder.z+(mascot ? .30 : .45));
      if (cycle) {
        hand.set(side*.23,mascot ? .90 : 1.24,bicycle.span-.02);
        elbowPole = v(0,-1,-.4);
      }
      if (move === 'pushup' || move === 'dog') {
        hand.set(side*.27,.075,move === 'pushup' ? .88 : .97);
        elbowPole = v(side,0,-1);
      }
      if (move === 'shoulder') hand.set(side*-.03,shoulder.y-.08,.44+depth*.12);
      if (move === 'shot') {
        hand.set(side*.085,shoulder.y+.1+depth*.28,.35-depth*.13);
        ball.position.copy(hand).add(v(-side*.085,.14,.025));
      }
      if (move === 'wave' && side === -1) hand.set(-.39+Math.sin(phase*2)*.075,shoulder.y+.36,.10);
      if (move === 'cheer' || move === 'jump') hand.set(side*.32,shoulder.y+.27,.02);
      const elbow = bend(armRoot,hand,mascot ? .22 : .30,mascot ? .22 : .28,elbowPole);
      align(limb.upperArm,armRoot,elbow,mascot ? .060 : .059);
      align(limb.forearm,elbow,hand,mascot ? .048 : .043);
      limb.elbowJoint.position.copy(elbow);
    }
    rig.root.position.y = move === 'jump' ? Math.abs(Math.sin(phase))*.16 : move === 'idle' ? Math.sin(phase*.5)*.007 : 0;
    rig.root.rotation.z = move === 'cheer' ? Math.sin(phase)*.045 : 0;
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
      this.time = saved?.time || 0;
      this.yaw = saved?.yaw ?? (host.dataset.move === 'cycle' ? 1.03 : .24);
      this.drag = null;
      this.rig = makeRig(host.dataset.model,Number(host.dataset.level) || 5);
      this.scene = new THREE.Scene();
      this.renderer = new THREE.WebGLRenderer({canvas:host.querySelector('canvas'),alpha:true,antialias:true,preserveDrawingBuffer:true});
      this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.65));
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.35;
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.camera = new THREE.PerspectiveCamera(33,1,.1,25);
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
      const floor = new THREE.Mesh(new THREE.CircleGeometry(2.4,48),new THREE.ShadowMaterial({opacity:.12}));
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
        if (control.playing) this.time += elapsed*control.speed;
        if (Number.isFinite(control.frame)) this.time = control.frame;
        this.move = control.move || this.host.dataset.move || 'idle';
        this.angle = control.angle;
        this.draw();
      });
      host.classList.add('model-ready');
      host.dataset.ready = 'true';
      instances.add(this);
      if (location.protocol !== 'file:') void this.loadModel();
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
        this.scene.add(this.model);
        this.mixer = new THREE.AnimationMixer(this.model);
        this.clips = loaded.animations;
        this.host.dataset.asset = filename+'.glb';
      } catch {
        // The equivalent local rig keeps the scene usable during a failed media request.
      }
    }
    draw() {
      const move = this.move || this.host.dataset.move || 'idle';
      if (this.mixer) {
        const clip = this.clips.find(clip => clip.name === move);
        if (clip && this.clip !== clip) {
          this.mixer.stopAllAction();
          this.mixer.clipAction(clip).play();
          this.clip = clip;
        }
        this.mixer.setTime(this.time);
      } else {
        pose(this.rig,move,this.time);
      }
      const ground = ['pushup','dog'].includes(this.move);
      const target = ground ? .65 : this.rig.mascot ? 1.23 : 1.0;
      const radius = this.rig.mascot ? 4.8 : 4.5;
      const angle = this.angle === 'side' ? 1.38 : this.yaw;
      this.camera.position.set(Math.sin(angle)*radius,target+.40,Math.cos(angle)*radius);
      this.camera.lookAt(0,target,0);
      this.renderer.render(this.scene,this.camera);
    }
    destroy() {
      savedPositions.set(this.key,{time:this.time,yaw:this.yaw});
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
    const rig = makeRig(kind,level);
    const motions = kind === 'mascot' ? ['idle','wave','jump','cheer','cycle'] : kind === 'bike' ? ['cycle'] : ['march','squat','pushup','dog','neck','shoulder','shot','cycle'];
    const clips = motions.map(move => {
      const times = [];
      const tracks = new Map(rig.joints.map(node => [node,{position:[],quaternion:[],scale:[]} ]));
      const duration = move === 'cycle' ? 1/1.3 : ['neck','idle'].includes(move) ? 2/.42 : ['wave','jump'].includes(move) ? 1/(.42*2) : 1/.42;
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
    mount(container,playback) {
      for (const instance of [...instances]) if (!instance.host.isConnected) instance.destroy();
      for(const host of container.querySelectorAll('[data-model]')) {
        if (host.dataset.ready) continue;
        try { new Stage(host,playback); }
        catch(error) { host.classList.add('model-failed'); host.dataset.ready = 'failed'; console.warn('3D 场景暂时无法加载',error.message); }
      }
    },
    clear() { for(const instance of [...instances]) instance.destroy(); },
    release(container) { for(const instance of [...instances]) if (container.contains(instance.host)) instance.destroy(); },
    exportGLB,
    setFrame(time) { for(const instance of instances) { instance.time = time; instance.draw(); } },
    get stages() { return [...instances]; },
  };
})();
