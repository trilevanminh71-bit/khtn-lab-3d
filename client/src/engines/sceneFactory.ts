/**
 * engines/sceneFactory.ts — Chọn bộ dựng cảnh theo `sceneTemplate` của plugin và áp tài nguyên tùy biến
 * (ảnh tiêu bản / mô hình .glb) mà giáo viên đã tải lên IndexedDB.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { LabPluginDef } from '../types/lab';
import type { SceneHandle } from './sceneKit';
import { buildCircuitScene, buildTrackScene } from './physics/physicsSceneBuilder';
import { buildBeakerScene, buildTitrationScene } from './chemistry/chemistrySceneBuilder';
import { buildMicroscopeScene } from './biology/biologySceneBuilder';
import { getAsset } from '../offline/db';

export function buildSceneForPlugin(plugin: LabPluginDef): SceneHandle {
  switch (plugin.sceneTemplate) {
    case 'track':
      return buildTrackScene(plugin.sceneOptions);
    case 'circuit':
      return buildCircuitScene(plugin.sceneOptions);
    case 'beaker':
      return buildBeakerScene(plugin.sceneOptions);
    case 'titration':
      return buildTitrationScene(plugin.sceneOptions);
    case 'microscope':
      return buildMicroscopeScene(plugin.sceneOptions);
  }
}

/** Khóa lưu tài nguyên trong IndexedDB */
export const assetKey = (pluginId: string, kind: 'image' | 'glb'): string => `${pluginId}:${kind}`;

/**
 * Áp tài nguyên tùy biến: ảnh → kết cấu thị trường kính hiển vi; .glb → thêm mô hình trang trí lên bàn.
 * Trả về hàm dọn dẹp. Lỗi file hỏng → bỏ qua, giữ mô hình mặc định.
 */
export async function applyAssetOverrides(handle: SceneHandle, plugin: LabPluginDef): Promise<() => void> {
  const cleanups: Array<() => void> = [];
  try {
    const img = await getAsset(assetKey(plugin.id, 'image'));
    if (img && handle.setCustomTexture) {
      const url = URL.createObjectURL(img.blob);
      const tex = await new THREE.TextureLoader().loadAsync(url);
      tex.colorSpace = THREE.SRGBColorSpace;
      handle.setCustomTexture(tex);
      cleanups.push(() => {
        handle.setCustomTexture?.(null);
        tex.dispose();
        URL.revokeObjectURL(url);
      });
    }
    const glb = await getAsset(assetKey(plugin.id, 'glb'));
    if (glb) {
      const buf = await glb.blob.arrayBuffer();
      const gltf = await new GLTFLoader().parseAsync(buf, '');
      const model = gltf.scene;
      // Chuẩn hóa kích thước mô hình về khoảng 0,8 đơn vị và đặt trên bàn
      const bbox = new THREE.Box3().setFromObject(model);
      const size = bbox.getSize(new THREE.Vector3());
      const s = 0.8 / Math.max(size.x, size.y, size.z, 0.001);
      model.scale.setScalar(s);
      model.position.set(1.4, -bbox.min.y * s, -0.6);
      model.userData.customModel = true;
      handle.root.add(model);
      cleanups.push(() => {
        handle.root.remove(model);
        model.traverse((o) => {
          const m = o as THREE.Mesh;
          m.geometry?.dispose();
          const mm = m.material as THREE.Material | THREE.Material[] | undefined;
          (Array.isArray(mm) ? mm : mm ? [mm] : []).forEach((x) => x.dispose());
        });
      });
    }
  } catch {
    /* tài nguyên lỗi → dùng mặc định */
  }
  return () => cleanups.forEach((c) => c());
}
