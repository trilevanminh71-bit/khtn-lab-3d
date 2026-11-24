/**
 * engines/biology/biologySceneBuilder.ts — Dựng cảnh kính hiển vi quang học 3D + màn hình thị trường (shader).
 * Dụng cụ có thẻ tương tác: tiêu bản (kéo vào "stage-slot"), đèn ("light"), mâm vật kính ("objective-turret"),
 * ốc sơ cấp ("coarse-knob"), ốc vi cấp ("fine-knob"), ống nhỏ giọt ("dropper").
 * Trạng thái đọc từ solver: specimen, magnification, blur, protoplast, stain, mitoticIndex, fieldSeed, readout, animMs.
 */
import * as THREE from 'three';
import type { SceneOptions, SceneVisualState } from '../../types/lab';
import {
  Anim,
  box,
  cyl,
  disposeObject,
  lerp,
  makeBench,
  makeLabel,
  makeSnapMarker,
  mat,
  setLabelText,
  tagObject,
  vis,
  type SceneHandle,
  type SnapPoint
} from '../sceneKit';
import { createMicroscopeMaterial, fieldOfViewUm, specimenCode } from './microscopeShader';

export function buildMicroscopeScene(options: SceneOptions): SceneHandle {
  const root = new THREE.Group();
  root.add(makeBench(3.6, 2));
  const interactive: THREE.Object3D[] = [];
  const snapPoints: SnapPoint[] = [];
  const body = mat('#f1f5f9', { roughness: 0.4 });
  const dark = mat('#1f2937', { roughness: 0.5 });
  const scope = new THREE.Group();

  const foot = box(0.5, 0.06, 0.6, body);
  foot.position.set(0, 0.03, 0);
  const arm = box(0.1, 0.8, 0.12, body);
  arm.position.set(0, 0.45, -0.22);
  arm.rotation.x = 0.08;
  const stage = box(0.42, 0.03, 0.36, dark);
  stage.position.set(0, 0.42, 0.02);
  const tubeHead = cyl(0.05, 0.05, 0.36, body, 16);
  tubeHead.position.set(0, 0.88, -0.03);
  tubeHead.rotation.x = -0.45;
  const eyepiece = cyl(0.035, 0.035, 0.12, dark, 12);
  eyepiece.position.set(0, 1.06, 0.06);
  eyepiece.rotation.x = -0.45;
  scope.add(foot, arm, stage, tubeHead, eyepiece);

  // Mâm vật kính xoay
  const turret = new THREE.Group();
  const disc = cyl(0.09, 0.09, 0.03, body, 20);
  turret.add(disc);
  const objColors = ['#ef4444', '#eab308', '#3b82f6', '#f8fafc'];
  objColors.forEach((c, i) => {
    const a = (i / 4) * Math.PI * 2;
    const o = cyl(0.018, 0.022, 0.1 + i * 0.015, mat(c, { metalness: 0.6 }), 10);
    o.position.set(Math.cos(a) * 0.06, -0.06, Math.sin(a) * 0.06);
    turret.add(o);
  });
  turret.position.set(0, 0.62, 0.02);
  tagObject(turret, 'objective-turret', 'Mâm vật kính');
  scope.add(turret);
  interactive.push(turret);

  const coarse = cyl(0.07, 0.07, 0.04, dark, 18);
  coarse.rotation.z = Math.PI / 2;
  coarse.position.set(0.1, 0.35, -0.2);
  tagObject(coarse, 'coarse-knob', 'Ốc sơ cấp (chỉnh thô)');
  const fine = cyl(0.045, 0.045, 0.04, mat('#475569'), 16);
  fine.rotation.z = Math.PI / 2;
  fine.position.set(0.14, 0.35, -0.2);
  tagObject(fine, 'fine-knob', 'Ốc vi cấp (chỉnh tinh)');
  scope.add(coarse, fine);
  interactive.push(coarse, fine);

  const lampMat = mat('#fef9c3', { emissive: '#000000' });
  const lamp = cyl(0.06, 0.06, 0.04, lampMat, 16);
  lamp.position.set(0, 0.09, 0.02);
  tagObject(lamp, 'light', 'Đèn chiếu sáng');
  scope.add(lamp);
  interactive.push(lamp);
  const lampLight = new THREE.PointLight('#fef3c7', 0, 1.2);
  lampLight.position.set(0, 0.25, 0.05);
  scope.add(lampLight);
  scope.position.set(-0.55, 0, 0);
  root.add(scope);

  // Tiêu bản (lam kính) kéo thả
  const slide = new THREE.Group();
  const glass = box(0.28, 0.008, 0.1, mat('#e0f2fe', { transparent: true, opacity: 0.6 }));
  const sample = box(0.07, 0.009, 0.07, mat('#c084fc', { transparent: true, opacity: 0.8 }));
  slide.add(glass, sample);
  slide.position.set(0.35, 0.01, 0.7);
  tagObject(slide, 'slide', String(options.slideLabel ?? 'Tiêu bản'), true);
  root.add(slide);
  interactive.push(slide);
  const target = new THREE.Vector3(-0.55, 0.44, 0.02);
  const marker = makeSnapMarker();
  marker.position.copy(target).setY(0.45);
  root.add(marker);
  const snap: SnapPoint = { id: 'stage-slot', position: target.clone(), accepts: 'slide', marker, filled: false };
  snapPoints.push(snap);

  // Ống nhỏ giọt
  const dropper = new THREE.Group();
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), mat('#dc2626'));
  bulb.position.y = 0.2;
  const pipe = cyl(0.01, 0.006, 0.2, mat('#e0f2fe', { transparent: true, opacity: 0.6 }), 8);
  pipe.position.y = 0.1;
  dropper.add(bulb, pipe);
  dropper.position.set(0.7, 0.01, 0.3);
  dropper.rotation.z = 0.4;
  tagObject(dropper, 'dropper', 'Ống nhỏ giọt dung dịch');
  root.add(dropper);
  interactive.push(dropper);

  // Màn hình thị trường (những gì mắt nhìn qua thị kính)
  const viewMat = createMicroscopeMaterial();
  const view = new THREE.Mesh(new THREE.CircleGeometry(0.55, 64), viewMat);
  view.position.set(0.75, 0.95, -0.3);
  view.rotation.y = -0.35;
  const frame = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.6, 64), dark);
  frame.position.copy(view.position);
  frame.rotation.copy(view.rotation);
  root.add(view, frame);
  const viewLabel = makeLabel('Thị trường kính hiển vi');
  viewLabel.position.set(0.75, 1.65, -0.3);
  root.add(viewLabel);
  const readout = makeLabel('K = 40×', { size: 34 });
  readout.position.set(0.75, 0.3, -0.25);
  root.add(readout);

  let lightOn = false;
  const anim = new Anim();
  let lastNonce = -1;
  let protoFrom = 0;
  let protoTo = 0;
  let targetRot = 0;

  return {
    root,
    interactive,
    snapPoints,
    cameraPosition: new THREE.Vector3(0.6, 1.4, 2.3),
    cameraTarget: new THREE.Vector3(0.1, 0.7, 0),
    react(tag: string) {
      if (tag === 'light') lightOn = true;
      if (tag === 'objective-turret') targetRot += Math.PI / 2;
    },
    update(v: SceneVisualState, nonce: number) {
      const u = viewMat.uniforms;
      u.uSpec.value = specimenCode(vis.str(v, 'specimen', 'onion'));
      u.uFov.value = fieldOfViewUm(vis.num(v, 'magnification', 100));
      u.uBlur.value = vis.num(v, 'blur');
      u.uStain.value = vis.num(v, 'stain', 0.7);
      u.uMI.value = vis.num(v, 'mitoticIndex', 0.12);
      u.uSeed.value = vis.num(v, 'fieldSeed', 1);
      u.uLight.value = snap.filled && lightOn ? 1 : snap.filled ? 0.35 : 0.08;
      setLabelText(readout, vis.str(v, 'readout', ''));
      const proto = vis.num(v, 'protoplast');
      if (nonce !== lastNonce) {
        lastNonce = nonce;
        protoFrom = Number(u.uProto.value);
        protoTo = proto;
        anim.start(vis.num(v, 'animMs'));
      } else if (!anim.active) {
        u.uProto.value = proto;
      }
    },
    tick(dt: number) {
      if (anim.active) viewMat.uniforms.uProto.value = lerp(protoFrom, protoTo, anim.tick(dt));
      turret.rotation.y += (targetRot - turret.rotation.y) * Math.min(1, dt * 6);
      lampMat.emissive.set(lightOn ? '#fde047' : '#000000');
      lampLight.intensity = lightOn ? 1.5 : 0;
      viewMat.uniforms.uLight.value = snap.filled && lightOn ? 1 : snap.filled ? 0.35 : 0.08;
      marker.visible = !snap.filled;
    },
    setCustomTexture(tex: THREE.Texture | null) {
      viewMat.uniforms.uTex.value = tex;
      viewMat.uniforms.uUseTex.value = tex ? 1 : 0;
    },
    dispose() {
      disposeObject(root);
    }
  };
}
