/**
 * 战报数据解析器
 *
 * 从战报原始数据（team_battle_data / enemy_battle_data 解码后的明文）
 * 提取数据层所需的输入：科技串、模块装配清单、ship_id 等。
 *
 * 战报三块结构（docs/06）：
 *   块0：舰队配置 [userid, ship_id, ..., tech_str[8], ..., enabled_slots[12]]
 *   块1：HP曲线（逐5秒采样）
 *   块2：攻击事件
 *
 * team 和 enemy 格式略有差异：
 *   team = [[[block0], [block1], [block2]]]
 *   enemy = { team_id: [block0, block1, block2] }
 */

/** 从战报块0记录提取的单船配置 */
export interface ParsedShipConfig {
  /** 舰船 ID（5位） */
  shipId: string;
  /** 科技串（块0[8]） */
  techString: string;
  /** 启用的模块清单（块0[12]，超主力舰装配用） */
  enabledSlots: string;
  /** 蓝图系统方案 ID（块0[11]） */
  schemeId: string;
  /** 蓝图系统方案名引用（块0[10]） */
  schemeRef: string;
  /** 模块清单（块0[7]） */
  moduleList: string;
}

/** HP 曲线采样点 */
export interface HpSample {
  /** 采样类型：5=常规, 97=击毁, 99=结束 */
  type: number;
  /** 时间（秒） */
  time: number;
  /** 结构值 */
  struct: number;
  /** 护盾值 */
  shield: number;
}

/**
 * 从战报块0记录数组提取单船配置。
 *
 * @param block0Record 块0的一条记录（数组）
 * @returns 解析出的舰船配置
 */
export function parseBlock0(block0Record: unknown[]): ParsedShipConfig {
  return {
    shipId: String(block0Record[1] ?? ''),
    techString: String(block0Record[8] ?? ''),
    enabledSlots: String(block0Record[12] ?? ''),
    schemeId: String(block0Record[11] ?? ''),
    schemeRef: String(block0Record[10] ?? ''),
    moduleList: String(block0Record[7] ?? ''),
  };
}

/**
 * 解析 HP 曲线字符串（块1）为采样点列表。
 *
 * 格式："type,time,struct,shield#type,time,struct,shield#..."
 * type=5 常规采样, type=97 击毁事件(struct=ship_uid), type=99 战斗结束
 */
export function parseHpCurve(hpCurveStr: string): HpSample[] {
  return hpCurveStr
    .split('#')
    .filter((s) => s.trim().length > 0)
    .map((segment) => {
      const [type, time, struct, shield] = segment.split(',').map(Number);
      return { type: type ?? 0, time: time ?? 0, struct: struct ?? 0, shield: shield ?? 0 };
    });
}

/**
 * 从 team 战报数据提取所有舰船配置。
 * team 格式：[[[block0_record1, ...], [block1], [block2]]]
 *
 * @param teamData team 战报解码后的数组
 * @returns 每艘船的配置
 */
export function parseTeamBattleData(teamData: unknown[][][]): ParsedShipConfig[] {
  const block0List = teamData[0];
  if (!Array.isArray(block0List)) return [];
  return block0List.map((record) => parseBlock0(record as unknown[]));
}

/**
 * 从 enemy 战报数据提取所有舰船配置。
 * enemy 格式：{ team_id: [block0, block1, block2] }
 *
 * @param enemyData enemy 战报解码后的对象
 * @returns 每艘船的配置
 */
export function parseEnemyBattleData(enemyData: Record<string, unknown[]>): ParsedShipConfig[] {
  const teamId = Object.keys(enemyData)[0];
  if (!teamId) return [];
  const blocks = enemyData[teamId];
  const block0List = blocks[0];
  if (!Array.isArray(block0List)) return [];
  return block0List.map((record) => parseBlock0(record as unknown[]));
}
