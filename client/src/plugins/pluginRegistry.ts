/**
 * plugins/pluginRegistry.ts — Nạp động danh mục bài thí nghiệm.
 *  - 23 bài mặc định (Vật lí, Hóa học, Sinh học 10) đóng gói sẵn → luôn chạy offline.
 *  - Bài tùy biến từ IndexedDB (CMS sửa đề, No-Code Wizard, gói Remote JSON) → ghi đè bài mặc định cùng id.
 *  - 5 template khởi tạo cho No-Code Wizard.
 * Thứ tự BUILTIN_PLUGINS KHÔNG ĐƯỢC ĐỔI vì chỉ số được mã hóa trong mã QR nộp bài.
 */
import type { LabPluginDef, SceneTemplateId, SubjectId } from '../types/lab';
import { SOLVER_IDS } from '../engines/solverRegistry';
import { validatePluginDef } from './pluginValidator';
import { photogateSpeedPlugin } from './physics/photogateSpeed';
import { freeFallPlugin } from './physics/freeFall';
import { newtonSecondLawPlugin } from './physics/newtonSecondLaw';
import { batteryEmfPlugin } from './physics/batteryEmf';
import { thiosulfateRatePlugin } from './chemistry/thiosulfateRate';
import { h2o2CatalystPlugin } from './chemistry/h2o2Catalyst';
import { kmno4TitrationPlugin } from './chemistry/kmno4Titration';
import { enthalpyZnCuSO4Plugin } from './chemistry/enthalpyZnCuSO4';
import { cellObservationPlugin } from './biology/cellObservation';
import { plasmolysisPlugin } from './biology/plasmolysis';
import { enzymeAmylasePlugin } from './biology/enzymeAmylase';
import { mitosisIndexPlugin } from './biology/mitosisIndex';
import { forceCompositionPlugin } from './physics/forceComposition';
import { momentumCollisionPlugin } from './physics/momentumCollision';
import { covalentBondPlugin, halogenPlugin, rateFactorsPlugin, redoxBalancePlugin } from './chemistry/conceptPlugins';
import { cellSignalPlugin, enzymeConditionsPlugin, membraneTransportPlugin, microbeGrowthPlugin, prokaryotePlugin } from './biology/conceptPlugins';

export const BUILTIN_PLUGINS: LabPluginDef[] = [
  photogateSpeedPlugin,
  freeFallPlugin,
  newtonSecondLawPlugin,
  batteryEmfPlugin,
  thiosulfateRatePlugin,
  h2o2CatalystPlugin,
  kmno4TitrationPlugin,
  enthalpyZnCuSO4Plugin,
  cellObservationPlugin,
  plasmolysisPlugin,
  enzymeAmylasePlugin,
  mitosisIndexPlugin,
  // Bài mở rộng: CHỈ thêm vào cuối danh sách
  forceCompositionPlugin,
  momentumCollisionPlugin,
  covalentBondPlugin,
  redoxBalancePlugin,
  rateFactorsPlugin,
  halogenPlugin,
  prokaryotePlugin,
  membraneTransportPlugin,
  cellSignalPlugin,
  enzymeConditionsPlugin,
  microbeGrowthPlugin
];

/** Chỉ số QR bắt đầu của bài tự tạo — tách hẳn khỏi bài mặc định để thêm bài mới không làm lệch mã */
export const CUSTOM_INDEX_BASE = 500;

/** Gộp bài mặc định với bài tùy biến (bài tùy biến hợp lệ ghi đè theo id) */
export function mergePlugins(custom: LabPluginDef[]): LabPluginDef[] {
  const map = new Map<string, LabPluginDef>(BUILTIN_PLUGINS.map((p) => [p.id, p]));
  for (const c of custom) {
    const v = validatePluginDef(c, SOLVER_IDS);
    if (v.ok) map.set(v.plugin.id, v.plugin);
  }
  return [...map.values()];
}

/** Chỉ số bài để mã hóa vào QR: bài mặc định theo thứ tự danh sách, bài tự tạo từ CUSTOM_INDEX_BASE theo thứ tự id */
export function pluginIndexOf(id: string, all: LabPluginDef[]): number {
  const b = BUILTIN_PLUGINS.findIndex((p) => p.id === id);
  if (b >= 0) return b;
  const customIds = all
    .filter((p) => !BUILTIN_PLUGINS.some((x) => x.id === p.id))
    .map((p) => p.id)
    .sort();
  const c = customIds.indexOf(id);
  return c >= 0 ? CUSTOM_INDEX_BASE + c : 99;
}

export function pluginByIndex(index: number, all: LabPluginDef[]): LabPluginDef | undefined {
  if (index < BUILTIN_PLUGINS.length) return all.find((p) => p.id === BUILTIN_PLUGINS[index].id);
  const customIds = all
    .filter((p) => !BUILTIN_PLUGINS.some((x) => x.id === p.id))
    .map((p) => p.id)
    .sort();
  const id = customIds[index - CUSTOM_INDEX_BASE];
  return all.find((p) => p.id === id);
}

/** Mô tả 5 template 3D dùng cho No-Code Wizard */
export type WizardSceneId = Extract<SceneTemplateId, 'track' | 'circuit' | 'beaker' | 'titration' | 'microscope'>;

export interface WizardTemplate {
  id: WizardSceneId;
  name: string;
  description: string;
  subject: SubjectId;
  example: { paramKey: string; paramLabel: string; paramUnit: string; hiddenKey: string; hiddenLabel: string; measureExpr: string; measureLabel: string; measureUnit: string; resultExpr: string; estimateExpr: string; resultLabel: string; resultUnit: string; visualExpr: string };
  sceneOptions: LabPluginDef['sceneOptions'];
}

export const WIZARD_TEMPLATES: WizardTemplate[] = [
  {
    id: 'track',
    name: 'Máng trượt & cổng quang điện',
    description: 'Chuyển động thẳng, rơi tự do, đo thời gian bằng cổng quang điện.',
    subject: 'physics',
    example: { paramKey: 'd', paramLabel: 'Quãng đường', paramUnit: 'm', hiddenKey: 'v', hiddenLabel: 'Tốc độ xe', measureExpr: 'd / v', measureLabel: 'Thời gian', measureUnit: 's', resultExpr: 'v', estimateExpr: 'd / m', resultLabel: 'Tốc độ', resultUnit: 'm/s', visualExpr: 'v / 2' },
    sceneOptions: { orientation: 'horizontal', objectLabel: 'Xe', gateLabel: 'Cổng quang điện', timerMode: 'A' }
  },
  {
    id: 'circuit',
    name: 'Mạch điện một chiều',
    description: 'Pin, biến trở, ampe kế, vôn kế — định luật Ohm.',
    subject: 'physics',
    example: { paramKey: 'U', paramLabel: 'Hiệu điện thế', paramUnit: 'V', hiddenKey: 'R', hiddenLabel: 'Điện trở', measureExpr: 'U / R', measureLabel: 'Cường độ dòng điện', measureUnit: 'A', resultExpr: 'R', estimateExpr: 'U / m', resultLabel: 'Điện trở', resultUnit: 'Ω', visualExpr: 'U / 12' },
    sceneOptions: { batteryLabel: 'Nguồn', showR0: false }
  },
  {
    id: 'beaker',
    name: 'Cốc thí nghiệm hóa học',
    description: 'Phản ứng trong cốc: màu, kết tủa, sủi bọt khí, nhiệt độ.',
    subject: 'chemistry',
    example: { paramKey: 'V', paramLabel: 'Thể tích dung dịch', paramUnit: 'mL', hiddenKey: 'C', hiddenLabel: 'Nồng độ', measureExpr: 'C * V / 1000', measureLabel: 'Số mol', measureUnit: 'mol', resultExpr: 'C', estimateExpr: 'm * 1000 / V', resultLabel: 'Nồng độ', resultUnit: 'mol/L', visualExpr: 'C' },
    sceneOptions: { variant: 'beaker', reagentA: 'Dung dịch A', reagentB: 'Dung dịch B', showThermometer: true }
  },
  {
    id: 'titration',
    name: 'Chuẩn độ (burette)',
    description: 'Chuẩn độ acid – base hoặc oxi hóa – khử.',
    subject: 'chemistry',
    example: { paramKey: 'Va', paramLabel: 'Thể tích mẫu', paramUnit: 'mL', hiddenKey: 'Ca', hiddenLabel: 'Nồng độ mẫu', measureExpr: 'Ca * Va / 0.1', measureLabel: 'Thể tích NaOH 0,1 M', measureUnit: 'mL', resultExpr: 'Ca', estimateExpr: '0.1 * m / Va', resultLabel: 'Nồng độ mẫu', resultUnit: 'mol/L', visualExpr: 'Ca * 5' },
    sceneOptions: { cKMnO4: 0.1, vFe: 10, titrant: 'NaOH 0,1 M', analyte: 'HCl' }
  },
  {
    id: 'microscope',
    name: 'Kính hiển vi',
    description: 'Quan sát tế bào, đo kích thước, đếm tế bào.',
    subject: 'biology',
    example: { paramKey: 'K', paramLabel: 'Độ phóng đại', paramUnit: '×', hiddenKey: 'L', hiddenLabel: 'Kích thước tế bào', measureExpr: 'L * K / 1000', measureLabel: 'Kích thước ảnh', measureUnit: 'mm', resultExpr: 'L', estimateExpr: 'm * 1000 / K', resultLabel: 'Kích thước thật', resultUnit: 'µm', visualExpr: 'K / 1000' },
    sceneOptions: { slideLabel: 'Tiêu bản', allowSpecimenSwitch: false }
  }
];
