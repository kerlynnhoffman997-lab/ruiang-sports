/* Ruiang's model surface is projected from the supplied front, side and back artwork. */
(() => {
  'use strict';
  const { THREE } = window.Ruiang3DEngine;
  const width = 300;
  const height = 552;
  const metresPerPixel = 2.30/height;
  const sources = {};
  const surfaces = new Map();

  function canvas() {
    const result = document.createElement('canvas');
    result.width = width;
    result.height = height;
    return result;
  }

  const ready = Promise.all(Object.entries(window.RuiangReferences).map(([key,url]) => new Promise((resolve,reject) => {
    const image = new Image();
    image.onload = () => { sources[key] = image; resolve(); };
    image.onerror = () => reject(new Error('瑞昂原始参考图无法载入'));
    image.src = url;
  })));

  function stageFront(level) {
    const result = canvas();
    const context = result.getContext('2d',{willReadFrequently:true});
    if (level === 5) {
      context.drawImage(sources.front,0,0,width,height);
      return result;
    }
    const index = [1,5,8,12,16].indexOf(level);
    const cell = sources.stages.width/5;
    const crop = document.createElement('canvas');
    crop.width = cell;
    crop.height = sources.stages.height;
    const drawing = crop.getContext('2d',{willReadFrequently:true});
    drawing.drawImage(sources.stages,index*cell,0,cell,crop.height,0,0,cell,crop.height);
    const image = drawing.getImageData(0,0,crop.width,crop.height);
    let left = crop.width;
    let right = 0;
    let top = crop.height;
    let bottom = 0;
    for(let y=0;y<crop.height;y++) {
      for(let x=0;x<crop.width;x++) {
        const offset = (y*crop.width+x)*4;
        const channels = [image.data[offset],image.data[offset+1],image.data[offset+2]];
        const strongest = Math.max(...channels);
        const weakest = Math.min(...channels);
        if (strongest-weakest>45 || strongest<215) {
          left=Math.min(left,x); right=Math.max(right,x);
          top=Math.min(top,y); bottom=Math.max(bottom,y);
        }
      }
    }
    left=Math.max(0,left-5); right=Math.min(crop.width,right+5);
    top=Math.max(0,top-4); bottom=Math.min(crop.height,bottom+4);
    context.drawImage(crop,left,top,right-left,bottom-top,0,0,width,height);
    return result;
  }

  function surface(level) {
    if (surfaces.has(level)) return surfaces.get(level);
    const front = stageFront(level);
    const views = {front};
    for (const name of ['side','back']) {
      const image = sources[name];
      const target = canvas();
      const context = target.getContext('2d',{willReadFrequently:true});
      const scaledWidth = height*image.width/image.height;
      context.drawImage(image,(width-scaledWidth)/2,0,scaledWidth,height);
      if (level === 8 || level === 16) {
        context.globalCompositeOperation = 'source-atop';
        context.fillStyle = level === 8 ? '#bb3b28' : '#e4c585';
        context.globalAlpha = .77;
        context.fillRect(0,height*.52,width,height*.48);
      }
      views[name] = target;
    }
    const images = Object.fromEntries(Object.entries(views).map(([key,image]) => [key,image.getContext('2d',{willReadFrequently:true}).getImageData(0,0,width,height).data]));
    const silhouette = canvas();
    silhouette.getContext('2d').drawImage(sources.front,0,0,width,height);
    const pixels = silhouette.getContext('2d',{willReadFrequently:true}).getImageData(0,0,width,height).data;
    const value = {images,pixels,parts:new Map()};
    surfaces.set(level,value);
    return value;
  }

  function part(rect,pivot,paint,{depth = .75,rows = 24,highDetail = false,referenceDepth = false} = {}) {
    const key = [rect.join(','),pivot.join(','),depth,rows,highDetail,referenceDepth].join(':');
    if (paint.parts.has(key)) {
      const cached = paint.parts.get(key);
      const mesh = new THREE.Mesh(cached.geometry,cached.material);
      mesh.castShadow = true;
      mesh.userData.originalReference = true;
      return mesh;
    }
    const [left,top,right,bottom] = rect;
    const profile = [];
    for(let row=0;row<=rows;row++) {
      const y = top+(bottom-top)*row/rows;
      let low = right;
      let high = left;
      const sampleY = Math.min(height-1,Math.max(0,Math.round(y)));
      for(let x=left;x<right;x++) {
        if (paint.pixels[(sampleY*width+x)*4+3] > 40) {
          low = Math.min(low,x);
          high = Math.max(high,x);
        }
      }
      if (high<=low) { low = (left+right)/2-.5; high = low+1; }
      let front = Math.max(.5,(high-low)/2)*depth;
      let back = -front;
      if (referenceDepth) {
        const side = paint.images.side;
        let first = width;
        let last = 0;
        for(let x=0;x<width;x++) if (side[(sampleY*width+x)*4+3]>40) { first=Math.min(first,x); last=Math.max(last,x); }
        if (last>first) { front=width/2-first; back=width/2-last; }
      }
      profile.push({y,centre:(low+high)/2,radius:Math.max(.5,(high-low)/2),depthCentre:(front+back)/2,depthRadius:Math.max(.5,(front-back)/2)});
    }
    const textureCanvas = document.createElement('canvas');
    textureCanvas.width = highDetail ? 1024 : right-left < 85 ? 256 : 512;
    textureCanvas.height = highDetail ? 640 : 256;
    const drawing = textureCanvas.getContext('2d');
    const baked = drawing.createImageData(textureCanvas.width,textureCanvas.height);
    function sample(pixels,x,y) {
      const column = Math.min(width-1,Math.max(0,Math.round(x)));
      const row = Math.min(height-1,Math.max(0,Math.round(y)));
      let offset = (row*width+column)*4;
      if (pixels[offset+3]>20) return [pixels[offset],pixels[offset+1],pixels[offset+2]];
      for(let step=1;step<32;step++) {
        for(const direction of [-1,1]) {
          const next = column+step*direction;
          if(next<0 || next>=width) continue;
          offset = (row*width+next)*4;
          if(pixels[offset+3]>20) return [pixels[offset],pixels[offset+1],pixels[offset+2]];
        }
      }
      return [246,241,232];
    }
    for(let y=0;y<textureCanvas.height;y++) {
      const row = y/(textureCanvas.height-1)*rows;
      const lower = Math.floor(row);
      const upper = Math.min(rows,lower+1);
      const blend = row-lower;
      const p = {};
      for(const name of ['y','centre','radius','depthCentre','depthRadius']) p[name]=THREE.MathUtils.lerp(profile[lower][name],profile[upper][name],blend);
      for(let x=0;x<textureCanvas.width;x++) {
        const angle = x/(textureCanvas.width-1)*Math.PI*2;
        const cosine = Math.cos(angle);
        const sine = Math.sin(angle);
        const worldX = p.centre+sine*p.radius;
        const worldZ = p.depthCentre+cosine*p.depthRadius;
        const sideDetail = highDetail || right-left < 110;
        const exponent = highDetail ? 16 : 8;
        const weights = [Math.max(0,cosine)**exponent*(highDetail ? 2 : 1),sideDetail ? Math.abs(sine)**exponent : 0,Math.max(0,-cosine)**exponent];
        const total = weights[0]+weights[1]+weights[2];
        const samples = [sample(paint.images.front,worldX,p.y),sample(paint.images.side,width/2-worldZ,p.y),sample(paint.images.back,width-worldX,p.y)];
        const offset = (y*textureCanvas.width+x)*4;
        for(let channel=0;channel<3;channel++) baked.data[offset+channel]=(samples[0][channel]*weights[0]+samples[1][channel]*weights[1]+samples[2][channel]*weights[2])/total;
        baked.data[offset+3] = 255;
      }
    }
    drawing.putImageData(baked,0,0);
    const texture = new THREE.CanvasTexture(textureCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    const material = new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide,toneMapped:false});
    const positions = [];
    const normals = [];
    const uvs = [];
    const indices = [];
    const segments = 48;
    function vertex(row,angle) {
      const p = profile[row];
      const x = p.centre+Math.sin(angle)*p.radius;
      const z = p.depthCentre+Math.cos(angle)*p.depthRadius;
      positions.push(
        (x-pivot[0])*metresPerPixel,
        (pivot[1]-p.y)*metresPerPixel,
        z*metresPerPixel,
      );
      normals.push(Math.sin(angle),0,Math.cos(angle));
      uvs.push(angle/(Math.PI*2),1-row/rows);
    }
    for(let row=0;row<=rows;row++) {
      for(let segment=0;segment<=segments;segment++) vertex(row,segment/segments*Math.PI*2);
    }
    for(let row=0;row<rows;row++) {
      for(let segment=0;segment<segments;segment++) {
        const a = row*(segments+1)+segment;
        const b = a+segments+1;
        indices.push(a,b,a+1,a+1,b,b+1);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
    geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
    geometry.setIndex(indices);
    paint.parts.set(key,{geometry,material});
    const mesh = new THREE.Mesh(geometry,material);
    mesh.castShadow = true;
    mesh.userData.originalReference = true;
    return mesh;
  }

  function build({root,joints,group,material,makeBicycle,kind,level}) {
    const paint = surface(level);
    root.userData.referenceSource = 'original-ruiang-three-views';
    root.userData.characterHeight = 2.30;
    const torso = group('Torso');
    const pelvis = group('Pelvis');
    const head = group('Head');
    head.add(part([3,90,297,284],[150,284],paint,{depth:.76,rows:42,highDetail:true,referenceDepth:true}));
    for(const rect of [[14,16,112,125],[188,16,286,125]]) {
      const ear = part(rect,[150,284],paint,{depth:.90,rows:22});
      ear.position.z = -.04;
      head.add(ear);
    }
    const crest = part([103,0,197,128],[150,284],paint,{depth:.72,rows:26});
    crest.position.z = .12;
    head.add(crest);
    torso.add(part([68,280,232,414],[150,347],paint,{depth:.59,rows:28}));
    pelvis.add(part([78,402,222,456],[150,430],paint,{depth:.70,rows:18}));
    if (level >= 12 && level < 16) {
      const capeGeometry = new THREE.SphereGeometry(1,22,14,0,Math.PI*2,0,Math.PI*.6);
      const cape = new THREE.Mesh(capeGeometry,material(0xc83e2b));
      cape.scale.set(.40,.48,.21);
      cape.position.set(0,-.1,-.12);
      cape.rotation.x = Math.PI;
      torso.add(cape);
    }
    const limbs = {};
    const skins = {};
    function skinnedLimb(rect,pivot,name,start,first,second) {
      const original = part(rect,pivot,paint,{depth:.88,rows:34});
      const geometry = original.geometry.clone();
      const total = first+second;
      const scaleY = total/((rect[3]-rect[1])*metresPerPixel);
      const positions = geometry.attributes.position;
      const indices = [];
      const weights = [];
      for(let i=0;i<positions.count;i++) {
        const distance = Math.max(0,-positions.getY(i)*scaleY);
        const weight = THREE.MathUtils.smoothstep(distance,first-.065,first+.065);
        positions.setY(i,-distance);
        positions.setXYZ(i,positions.getX(i)+start.x,positions.getY(i)+start.y,positions.getZ(i)+start.z);
        indices.push(0,1,0,0);
        weights.push(1-weight,weight,0,0);
      }
      geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(indices,4));
      geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));
      const bones = ['Root','Bend','Tip'].map(suffix => {
        const bone = new THREE.Bone();
        bone.name = name+suffix;
        joints.push(bone);
        return bone;
      });
      bones[0].position.copy(start);
      bones[1].position.y = -first;
      bones[2].position.y = -second;
      bones[0].add(bones[1]);
      bones[1].add(bones[2]);
      root.add(bones[0]);
      const mesh = new THREE.SkinnedMesh(geometry,original.material);
      mesh.name = name+'Surface';
      mesh.castShadow = true;
      mesh.frustumCulled = false;
      root.add(mesh);
      root.updateMatrixWorld(true);
      mesh.bind(new THREE.Skeleton(bones));
      const down = new THREE.Vector3(0,-1,0);
      return {update(a,b,c) {
        const upper = new THREE.Quaternion().setFromUnitVectors(down,b.clone().sub(a).normalize());
        const lower = new THREE.Quaternion().setFromUnitVectors(down,c.clone().sub(b).normalize());
        bones[0].position.copy(a);
        bones[0].quaternion.copy(upper);
        bones[1].position.y = -a.distanceTo(b);
        bones[1].quaternion.copy(upper).invert().multiply(lower);
        bones[2].position.y = -b.distanceTo(c);
      }};
    }
    for(const side of [-1,1]) {
      const prefix = side < 0 ? 'Left' : 'Right';
      const upperArm = group(prefix+'UpperArm');
      const forearm = group(prefix+'Forearm');
      const thigh = group(prefix+'Thigh');
      const shin = group(prefix+'Shin');
      const foot = group(prefix+'Foot');
      const elbowJoint = group(prefix+'Elbow');
      const kneeJoint = group(prefix+'Knee');
      const armX = side < 0 ? [41,84] : [216,259];
      const legX = side < 0 ? [78,149] : [151,222];
      const shoeX = side < 0 ? [77,150] : [150,224];
      const armCentre = (armX[0]+armX[1])/2;
      const legCentre = (legX[0]+legX[1])/2;
      skins[side] = {
        arm:skinnedLimb([armX[0],314,armX[1],441],[armCentre,314],prefix+'Arm',new THREE.Vector3(side*.29,1.015,0),.24,.31),
        leg:skinnedLimb([legX[0],425,legX[1],525],[legCentre,425],prefix+'Leg',new THREE.Vector3(side*.15,.55,0),.24,.23),
      };
      foot.add(part([shoeX[0],514,shoeX[1],552],[(shoeX[0]+shoeX[1])/2,535],paint,{depth:1.2,rows:12}));
      limbs[side] = {upperArm,forearm,thigh,shin,foot,elbowJoint,kneeJoint};
    }
    const ball = group('Basketball');
    const helmet = group('Helmet',head);
    const bicycle = makeBicycle();
    return {root,head,torso,pelvis,limbs,skins,ball,helmet,bicycle,joints,mascot:true,sourceBased:true,kind,level};
  }

  window.RuiangCharacter = {ready,build};
})();
