/**
 * Node 环境便利方法：从目录加载配置表。
 *
 * 仅 Node 可用（依赖 node:fs）。放在 tests/ 下，不被 tsc 编译进 dist，
 * 保持引擎 dist 平台无关。小程序/Web 环境请用 createClientData。
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createClientData, type ClientDataStore, type ClientDataParts } from '../../src/data/index.js';
import type {
  RawShipTable,
  RawSystemEffectTable,
  RawSystemEnhanceTable,
  RawEffectDefTable,
} from '../../src/data/rawTypes.js';

function read<T>(dir: string, file: string): T {
  try {
    return JSON.parse(readFileSync(join(dir, file), 'utf-8')) as T;
  } catch (e) {
    throw new Error(`加载配置表失败 ${file}: ${(e as Error).message}`);
  }
}

/** 从目录加载全部配置表（Node 便利方法） */
export function loadClientDataFromDir(dir: string): ClientDataStore {
  const parts: ClientDataParts = {
    ship: read<RawShipTable>(dir, 'cfg_ship.json'),
    systemEffect: read<RawSystemEffectTable>(dir, 'cfg_system_effect.json'),
    systemEnhance: read<RawSystemEnhanceTable>(dir, 'cfg_system_enhance.json'),
    effectDef: read<RawEffectDefTable>(dir, 'cfg_effect_def.json'),
    weapon: read(dir, 'cfg_weapon.json'),
    shipSlot: read(dir, 'cfg_ship_slot.json'),
    shipSystem: read(dir, 'cfg_ship_system.json'),
  };
  return createClientData(parts);
}
